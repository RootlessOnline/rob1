"""
Anubis Session Manager - Platform Persistence

This system allows Anubis to remember:
- Telegram bot tokens and configurations
- WhatsApp session data
- Discord bot credentials
- Any other platform integrations
- API keys and settings

Everything persists across restarts - set up once, always remember!
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field, asdict
from pathlib import Path
import asyncio


@dataclass
class PlatformSession:
    """A session for a specific platform"""
    platform: str
    credentials: Dict[str, Any]
    created_at: str
    last_used: str
    is_active: bool = False
    settings: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "platform": self.platform,
            "credentials": self.credentials,
            "created_at": self.created_at,
            "last_used": self.last_used,
            "is_active": self.is_active,
            "settings": self.settings,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'PlatformSession':
        return cls(
            platform=data.get("platform", "unknown"),
            credentials=data.get("credentials", {}),
            created_at=data.get("created_at", ""),
            last_used=data.get("last_used", ""),
            is_active=data.get("is_active", False),
            settings=data.get("settings", {}),
            metadata=data.get("metadata", {})
        )


@dataclass
class APIKey:
    """An API key for a provider"""
    provider: str
    key: str
    added_at: str
    tokens_used: int = 0
    tokens_remaining: int = -1  # -1 means unknown/unlimited
    is_active: bool = True
    last_used: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'APIKey':
        return cls(**data)


class SessionManager:
    """
    Manages all persistent sessions for Anubis
    """

    def __init__(self, sessions_path: str = None):
        self.sessions_path = sessions_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "sessions"
        )
        os.makedirs(self.sessions_path, exist_ok=True)

        self.sessions_file = os.path.join(self.sessions_path, "platforms.json")
        self.api_keys_file = os.path.join(self.sessions_path, "api_keys.json")
        self.settings_file = os.path.join(self.sessions_path, "settings.json")

        self.platforms: Dict[str, PlatformSession] = {}
        self.api_keys: Dict[str, APIKey] = {}
        self.settings: Dict[str, Any] = {}

        self._load_all()

    def _load_all(self):
        """Load all session data"""
        # Load platforms
        if os.path.exists(self.sessions_file):
            try:
                with open(self.sessions_file, 'r') as f:
                    data = json.load(f)
                    for platform, session_data in data.get("platforms", {}).items():
                        self.platforms[platform] = PlatformSession.from_dict(session_data)
                print(f"   📱 Loaded {len(self.platforms)} platform sessions")
            except Exception as e:
                print(f"   Error loading sessions: {e}")

        # Load API keys
        if os.path.exists(self.api_keys_file):
            try:
                with open(self.api_keys_file, 'r') as f:
                    data = json.load(f)
                    for provider, key_data in data.get("keys", {}).items():
                        self.api_keys[provider] = APIKey.from_dict(key_data)
                print(f"   🔑 Loaded {len(self.api_keys)} API keys")
            except Exception as e:
                print(f"   Error loading API keys: {e}")

        # Load settings
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, 'r') as f:
                    self.settings = json.load(f)
            except:
                pass

    def _save_platforms(self):
        """Save platform sessions"""
        data = {
            "platforms": {
                platform: session.to_dict()
                for platform, session in self.platforms.items()
            },
            "last_saved": datetime.now().isoformat()
        }
        with open(self.sessions_file, 'w') as f:
            json.dump(data, f, indent=2)

    def _save_api_keys(self):
        """Save API keys"""
        data = {
            "keys": {
                provider: key.to_dict()
                for provider, key in self.api_keys.items()
            },
            "last_saved": datetime.now().isoformat()
        }
        with open(self.api_keys_file, 'w') as f:
            json.dump(data, f, indent=2)

    def _save_settings(self):
        """Save settings"""
        with open(self.settings_file, 'w') as f:
            json.dump(self.settings, f, indent=2)

    # Platform Session Methods

    def save_platform(self, platform: str, credentials: Dict[str, Any],
                      settings: Dict[str, Any] = None, metadata: Dict[str, Any] = None) -> PlatformSession:
        """
        Save a platform session

        Args:
            platform: Platform name (e.g., "telegram", "whatsapp", "discord")
            credentials: Platform credentials (tokens, keys, etc.)
            settings: Platform-specific settings
            metadata: Additional metadata
        """
        now = datetime.now().isoformat()

        # Check if updating existing session
        if platform in self.platforms:
            session = self.platforms[platform]
            session.credentials = credentials
            session.last_used = now
            session.is_active = True
            if settings:
                session.settings.update(settings)
            if metadata:
                session.metadata.update(metadata)
        else:
            # Create new session
            session = PlatformSession(
                platform=platform,
                credentials=credentials,
                created_at=now,
                last_used=now,
                is_active=True,
                settings=settings or {},
                metadata=metadata or {}
            )

        self.platforms[platform] = session
        self._save_platforms()

        print(f"   ✅ Saved session for {platform}")
        return session

    def get_platform(self, platform: str) -> Optional[PlatformSession]:
        """Get a platform session"""
        return self.platforms.get(platform)

    def has_platform(self, platform: str) -> bool:
        """Check if a platform session exists"""
        return platform in self.platforms and self.platforms[platform].is_active

    def list_platforms(self) -> List[str]:
        """List all connected platforms"""
        return [p for p, s in self.platforms.items() if s.is_active]

    def deactivate_platform(self, platform: str):
        """Deactivate a platform (keep data but mark inactive)"""
        if platform in self.platforms:
            self.platforms[platform].is_active = False
            self._save_platforms()

    def delete_platform(self, platform: str):
        """Delete a platform session entirely"""
        if platform in self.platforms:
            del self.platforms[platform]
            self._save_platforms()

    def get_all_credentials(self) -> Dict[str, Dict]:
        """Get credentials for all active platforms"""
        return {
            platform: session.credentials
            for platform, session in self.platforms.items()
            if session.is_active
        }

    # API Key Methods

    def save_api_key(self, provider: str, key: str) -> APIKey:
        """Save an API key for a provider"""
        now = datetime.now().isoformat()

        api_key = APIKey(
            provider=provider,
            key=key,
            added_at=now,
            last_used=now
        )

        self.api_keys[provider] = api_key
        self._save_api_keys()

        print(f"   ✅ Saved API key for {provider}")
        return api_key

    def get_api_key(self, provider: str) -> Optional[str]:
        """Get an API key for a provider"""
        if provider in self.api_keys:
            key = self.api_keys[provider]
            if key.is_active:
                key.last_used = datetime.now().isoformat()
                self._save_api_keys()
                return key.key
        return None

    def has_api_key(self, provider: str) -> bool:
        """Check if an API key exists"""
        return provider in self.api_keys and self.api_keys[provider].is_active

    def update_token_usage(self, provider: str, tokens_used: int, remaining: int = -1):
        """Update token usage for an API key"""
        if provider in self.api_keys:
            key = self.api_keys[provider]
            key.tokens_used += tokens_used
            key.tokens_remaining = remaining
            self._save_api_keys()

    def list_api_keys(self) -> List[Dict]:
        """List all API keys (without revealing the actual keys)"""
        return [
            {
                "provider": provider,
                "added_at": key.added_at,
                "tokens_used": key.tokens_used,
                "tokens_remaining": key.tokens_remaining,
                "is_active": key.is_active
            }
            for provider, key in self.api_keys.items()
        ]

    # Settings Methods

    def save_setting(self, key: str, value: Any):
        """Save a setting"""
        self.settings[key] = value
        self._save_settings()

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting"""
        return self.settings.get(key, default)

    # Auto-connection Methods

    def get_auto_connect_context(self) -> str:
        """Get context about saved platforms for the LLM"""
        platforms = self.list_platforms()
        if not platforms:
            return "No platforms are currently set up."

        lines = ["Connected platforms:"]
        for platform in platforms:
            session = self.platforms[platform]
            lines.append(f"  - {platform}: {'Active' if session.is_active else 'Inactive'}")
            if session.metadata:
                if "bot_name" in session.metadata:
                    lines.append(f"    Bot: @{session.metadata['bot_name']}")
                if "chat_id" in session.metadata:
                    lines.append(f"    Chat: {session.metadata['chat_id']}")

        return "\n".join(lines)

    def create_connection_prompt(self) -> str:
        """Create a prompt section for auto-connecting platforms"""
        platforms = self.list_platforms()
        if not platforms:
            return ""

        return f"""
Available Platform Connections:
{self.get_auto_connect_context()}

When the user wants to use a platform, check if it's already connected.
If connected, use the existing credentials from session storage.
If not connected, help set it up and save the credentials.
"""


class AutoConnector:
    """
    Handles automatic connection to saved platforms on startup
    """

    def __init__(self, session_manager: SessionManager):
        self.session_manager = session_manager
        self.connection_handlers: Dict[str, Callable] = {}

    def register_handler(self, platform: str, handler: Callable):
        """Register a connection handler for a platform"""
        self.connection_handlers[platform] = handler

    async def auto_connect_all(self) -> Dict[str, bool]:
        """Attempt to connect to all saved platforms"""
        results = {}
        platforms = self.session_manager.list_platforms()

        print(f"\n🔌 Auto-connecting to {len(platforms)} platforms...")

        for platform in platforms:
            session = self.session_manager.get_platform(platform)
            if session and session.is_active:
                handler = self.connection_handlers.get(platform)
                if handler:
                    try:
                        if asyncio.iscoroutinefunction(handler):
                            success = await handler(session.credentials)
                        else:
                            success = handler(session.credentials)

                        results[platform] = success
                        if success:
                            print(f"   ✅ {platform}: Connected")
                        else:
                            print(f"   ⚠️ {platform}: Connection failed")
                    except Exception as e:
                        results[platform] = False
                        print(f"   ❌ {platform}: {e}")
                else:
                    print(f"   ⏭️ {platform}: No handler registered")
                    results[platform] = None

        return results

    def get_connection_status(self) -> str:
        """Get status of all platform connections"""
        platforms = self.session_manager.list_platforms()
        if not platforms:
            return "No platforms configured. Say 'set up telegram' or 'connect whatsapp' to get started."

        lines = ["📊 Platform Connection Status:"]
        for platform in platforms:
            session = self.session_manager.get_platform(platform)
            status = "🟢 Active" if session.is_active else "🔴 Inactive"
            lines.append(f"  {status} - {platform}")

        return "\n".join(lines)


# Singleton
_session_manager = None
_auto_connector = None


def get_session_manager() -> SessionManager:
    """Get the global session manager"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager


def get_auto_connector() -> AutoConnector:
    """Get the global auto-connector"""
    global _auto_connector
    if _auto_connector is None:
        _auto_connector = AutoConnector(get_session_manager())
    return _auto_connector
