"""
API Manager - Manages multiple free AI API providers
Automatically switches between providers when limits are reached
"""

import os
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class ProviderType(Enum):
    LOCAL_OLLAMA = "local_ollama"
    GROQ = "groq"
    DEEPSEEK = "deepseek"
    TOGETHER = "together"
    OPENROUTER = "openrouter"
    GEMINI = "gemini"


@dataclass
class ProviderConfig:
    """Configuration for an AI provider"""
    name: str
    provider_type: ProviderType
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    models: List[str] = field(default_factory=list)
    requests_per_minute: int = 60
    tokens_per_day: int = 1000000
    current_tokens_used: int = 0
    current_requests: int = 0
    last_reset: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    priority: int = 1  # Lower = higher priority


class APIKeyManager:
    """
    Manages multiple free AI API providers
    Automatically rotates and switches based on limits
    """

    # Free API limits (approximate)
    FREE_LIMITS = {
        ProviderType.GROQ: {
            "requests_per_day": 14400,  # ~10 per minute
            "tokens_per_day": 500000,
            "models": ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
        },
        ProviderType.DEEPSEEK: {
            "requests_per_day": 1000,
            "tokens_per_day": 1000000,
            "models": ["deepseek-chat", "deepseek-coder"]
        },
        ProviderType.TOGETHER: {
            "requests_per_day": 1000,
            "tokens_per_day": 500000,
            "models": ["meta-llama/Llama-3-70b-chat-hf", "mistralai/Mixtral-8x7B-Instruct-v0.1"]
        },
        ProviderType.OPENROUTER: {
            "requests_per_day": 200,
            "tokens_per_day": 200000,
            "models": ["meta-llama/llama-3-8b-instruct:free", "google/gemma-7b-it:free"]
        },
        ProviderType.GEMINI: {
            "requests_per_day": 1500,
            "tokens_per_day": 1000000,
            "models": ["gemini-pro", "gemini-1.5-flash"]
        }
    }

    def __init__(self, config_file: str = "api_keys.json"):
        self.config_file = config_file
        self.providers: Dict[str, ProviderConfig] = {}
        self.request_history: List[Dict] = []
        self._load_config()
        self._setup_defaults()

    def _load_config(self):
        """Load API keys from config file or environment"""
        # Try to load from file
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    data = json.load(f)
                    for name, cfg in data.get('providers', {}).items():
                        if cfg.get('api_key'):
                            self.add_provider(
                                name=name,
                                provider_type=ProviderType(cfg.get('type', 'groq')),
                                api_key=cfg.get('api_key'),
                                priority=cfg.get('priority', 1)
                            )
            except Exception as e:
                print(f"Warning: Could not load API config: {e}")

        # Load from environment variables
        env_keys = {
            'groq': os.environ.get('GROQ_API_KEY'),
            'deepseek': os.environ.get('DEEPSEEK_API_KEY'),
            'together': os.environ.get('TOGETHER_API_KEY'),
            'openrouter': os.environ.get('OPENROUTER_API_KEY'),
            'gemini': os.environ.get('GEMINI_API_KEY'),
        }

        for name, key in env_keys.items():
            if key and name not in self.providers:
                provider_type = ProviderType[name.upper()]
                self.add_provider(name, provider_type, key)

    def _setup_defaults(self):
        """Setup local Ollama as default"""
        if 'ollama' not in self.providers:
            self.providers['ollama'] = ProviderConfig(
                name='ollama',
                provider_type=ProviderType.LOCAL_OLLAMA,
                base_url='http://localhost:11434',
                models=['llama3.2', 'qwen2.5:7b', 'deepseek-r1:7b'],
                requests_per_minute=1000,
                tokens_per_day=999999999,  # Unlimited
                priority=99  # Lowest priority (used as fallback)
            )

    def add_provider(self, name: str, provider_type: ProviderType, 
                     api_key: str, priority: int = 1) -> bool:
        """Add a new API provider"""
        limits = self.FREE_LIMITS.get(provider_type, {})

        self.providers[name] = ProviderConfig(
            name=name,
            provider_type=provider_type,
            api_key=api_key,
            models=limits.get('models', []),
            tokens_per_day=limits.get('tokens_per_day', 1000000),
            priority=priority
        )

        self._save_config()
        return True

    def _save_config(self):
        """Save current config to file"""
        try:
            data = {
                'providers': {
                    name: {
                        'type': p.provider_type.value,
                        'api_key': p.api_key,
                        'priority': p.priority
                    }
                    for name, p in self.providers.items()
                    if p.api_key  # Only save providers with keys
                }
            }
            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save API config: {e}")

    def get_best_provider(self, task_type: str = "general") -> Optional[ProviderConfig]:
        """
        Get the best available provider based on:
        - Current limits
        - Priority
        - Task type
        """
        available = []

        for provider in self.providers.values():
            if not provider.is_active:
                continue

            # Check if we've exceeded limits
            if provider.current_tokens_used >= provider.tokens_per_day:
                # Reset if day has passed
                if datetime.now() - provider.last_reset > timedelta(days=1):
                    provider.current_tokens_used = 0
                    provider.current_requests = 0
                    provider.last_reset = datetime.now()
                else:
                    continue

            available.append(provider)

        if not available:
            # Fallback to Ollama (local, unlimited)
            return self.providers.get('ollama')

        # Sort by priority (lower = better)
        available.sort(key=lambda p: p.priority)
        return available[0]

    def record_usage(self, provider_name: str, tokens: int):
        """Record token usage for a provider"""
        if provider_name in self.providers:
            self.providers[provider_name].current_tokens_used += tokens
            self.providers[provider_name].current_requests += 1

            self.request_history.append({
                'provider': provider_name,
                'tokens': tokens,
                'timestamp': datetime.now().isoformat()
            })

    def get_status(self) -> Dict:
        """Get status of all providers"""
        status = {}
        for name, provider in self.providers.items():
            status[name] = {
                'type': provider.provider_type.value,
                'active': provider.is_active,
                'tokens_used': provider.current_tokens_used,
                'tokens_limit': provider.tokens_per_day,
                'remaining': provider.tokens_per_day - provider.current_tokens_used,
                'models': provider.models,
                'priority': provider.priority
            }
        return status

    def search_for_free_apis(self) -> List[Dict]:
        """
        Search the internet for free AI API keys
        Returns list of potential sources
        """
        # This would be implemented to actually search
        # For now, return known free sources
        return [
            {
                'name': 'Groq',
                'url': 'https://console.groq.com',
                'limit': '14,400 requests/day',
                'models': ['llama-3.1-70b', 'mixtral-8x7b'],
                'cost': 'FREE'
            },
            {
                'name': 'DeepSeek',
                'url': 'https://platform.deepseek.com',
                'limit': '1M tokens/month',
                'models': ['deepseek-chat', 'deepseek-coder'],
                'cost': 'FREE tier available'
            },
            {
                'name': 'Together AI',
                'url': 'https://api.together.xyz',
                'limit': '$1 free credit',
                'models': ['Llama-3-70b', 'Mixtral-8x7B'],
                'cost': 'FREE tier available'
            },
            {
                'name': 'Google Gemini',
                'url': 'https://makersuite.google.com',
                'limit': '60 requests/min',
                'models': ['gemini-pro', 'gemini-1.5-flash'],
                'cost': 'FREE'
            },
            {
                'name': 'OpenRouter',
                'url': 'https://openrouter.ai',
                'limit': 'Free models available',
                'models': ['llama-3-8b-free', 'gemma-7b-free'],
                'cost': 'FREE models'
            }
        ]

    def setup_interactive(self):
        """
        Interactive setup to add API keys
        """
        print("\n" + "="*60)
        print("🔑 API KEY SETUP")
        print("="*60)
        print("\nAdd free API keys for faster responses:")
        print("(Press Enter to skip any provider)\n")

        providers_info = [
            ('groq', 'Groq (FASTEST - Recommended)', 'https://console.groq.com'),
            ('deepseek', 'DeepSeek', 'https://platform.deepseek.com'),
            ('together', 'Together AI', 'https://api.together.xyz'),
            ('gemini', 'Google Gemini', 'https://makersuite.google.com'),
            ('openrouter', 'OpenRouter', 'https://openrouter.ai'),
        ]

        for key_name, display_name, url in providers_info:
            print(f"\n{display_name}")
            print(f"  Get free key: {url}")
            api_key = input(f"  Enter API key (or press Enter to skip): ").strip()

            if api_key:
                provider_type = ProviderType[key_name.upper()]
                priority = 1 if key_name == 'groq' else 2 + providers_info.index((key_name, display_name, url))
                self.add_provider(key_name, provider_type, api_key, priority)
                print(f"  ✅ Added {display_name}!")

        print("\n" + "="*60)
        print("✅ Setup complete!")
        print("="*60)

        # Show status
        status = self.get_status()
        print("\nActive providers:")
        for name, info in status.items():
            if info['active'] and name != 'ollama':
                print(f"  - {name}: {info['remaining']} tokens remaining")


# Singleton instance
_api_manager = None

def get_api_manager() -> APIKeyManager:
    """Get the global API manager instance"""
    global _api_manager
    if _api_manager is None:
        _api_manager = APIKeyManager()
    return _api_manager


if __name__ == "__main__":
    # Run interactive setup
    manager = get_api_manager()
    manager.setup_interactive()

    # Show status
    print("\nCurrent provider status:")
    status = manager.get_status()
    for name, info in status.items():
        print(f"\n{name}:")
        print(f"  Active: {info['active']}")
        print(f"  Tokens: {info['tokens_used']}/{info['tokens_limit']}")
        print(f"  Models: {info['models']}")
