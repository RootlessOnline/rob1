"""
Unified LLM Interface - Works with multiple providers
Automatically switches between local and cloud APIs
"""

import os
import json
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from api_manager import get_api_manager, ProviderType


@dataclass
class LLMResponse:
    """Unified response from any LLM"""
    content: str
    provider: str
    model: str
    tokens_used: int
    latency_ms: float


class UnifiedLLM:
    """
    Unified interface for all LLM providers
    Automatically uses the best available option
    """

    def __init__(self, prefer_speed: bool = True, prefer_local: bool = False):
        self.api_manager = get_api_manager()
        self.prefer_speed = prefer_speed
        self.prefer_local = prefer_local
        self._clients = {}

    def _get_groq_client(self, api_key: str):
        """Get or create Groq client"""
        if 'groq' not in self._clients:
            try:
                from groq import Groq
                self._clients['groq'] = Groq(api_key=api_key)
            except ImportError:
                print("Warning: groq package not installed. Run: pip install groq")
                return None
        return self._clients['groq']

    def _get_openai_client(self, api_key: str, base_url: str = None):
        """Get or create OpenAI-compatible client"""
        key = f"openai_{base_url or 'default'}"
        if key not in self._clients:
            try:
                from openai import OpenAI
                self._clients[key] = OpenAI(
                    api_key=api_key,
                    base_url=base_url
                )
            except ImportError:
                print("Warning: openai package not installed. Run: pip install openai")
                return None
        return self._clients[key]

    def _call_ollama(self, prompt: str, model: str = None) -> LLMResponse:
        """Call local Ollama"""
        from langchain_ollama import ChatOllama

        start_time = time.time()
        model = model or "qwen2.5:7b"

        llm = ChatOllama(
            model=model,
            base_url="http://localhost:11434"
        )

        response = llm.invoke(prompt)
        latency = (time.time() - start_time) * 1000

        return LLMResponse(
            content=response.content if hasattr(response, 'content') else str(response),
            provider="ollama",
            model=model,
            tokens_used=len(prompt.split()) + len(str(response).split()),
            latency_ms=latency
        )

    def _call_groq(self, prompt: str, model: str, api_key: str) -> LLMResponse:
        """Call Groq API (FASTEST)"""
        client = self._get_groq_client(api_key)
        if not client:
            raise Exception("Groq client not available")

        start_time = time.time()

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096
        )

        latency = (time.time() - start_time) * 1000
        content = response.choices[0].message.content
        tokens = response.usage.total_tokens if hasattr(response, 'usage') else 0

        return LLMResponse(
            content=content,
            provider="groq",
            model=model,
            tokens_used=tokens,
            latency_ms=latency
        )

    def _call_deepseek(self, prompt: str, model: str, api_key: str) -> LLMResponse:
        """Call DeepSeek API"""
        client = self._get_openai_client(
            api_key,
            base_url="https://api.deepseek.com/v1"
        )
        if not client:
            raise Exception("DeepSeek client not available")

        start_time = time.time()

        response = client.chat.completions.create(
            model=model or "deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096
        )

        latency = (time.time() - start_time) * 1000

        return LLMResponse(
            content=response.choices[0].message.content,
            provider="deepseek",
            model=model or "deepseek-chat",
            tokens_used=response.usage.total_tokens,
            latency_ms=latency
        )

    def _call_together(self, prompt: str, model: str, api_key: str) -> LLMResponse:
        """Call Together AI API"""
        client = self._get_openai_client(
            api_key,
            base_url="https://api.together.xyz/v1"
        )
        if not client:
            raise Exception("Together client not available")

        start_time = time.time()

        response = client.chat.completions.create(
            model=model or "meta-llama/Llama-3-8b-chat-hf",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096
        )

        latency = (time.time() - start_time) * 1000

        return LLMResponse(
            content=response.choices[0].message.content,
            provider="together",
            model=model or "meta-llama/Llama-3-8b-chat-hf",
            tokens_used=response.usage.total_tokens,
            latency_ms=latency
        )

    def _call_openrouter(self, prompt: str, model: str, api_key: str) -> LLMResponse:
        """Call OpenRouter API"""
        client = self._get_openai_client(
            api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        if not client:
            raise Exception("OpenRouter client not available")

        start_time = time.time()

        response = client.chat.completions.create(
            model=model or "meta-llama/llama-3-8b-instruct:free",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096
        )

        latency = (time.time() - start_time) * 1000

        return LLMResponse(
            content=response.choices[0].message.content,
            provider="openrouter",
            model=model or "meta-llama/llama-3-8b-instruct:free",
            tokens_used=response.usage.total_tokens,
            latency_ms=latency
        )

    def generate(self, prompt: str, model: str = None, 
                 system_prompt: str = None) -> LLMResponse:
        """
        Generate response using the best available provider
        Automatically falls back if one fails
        """
        # Prepare full prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"

        # Get best provider
        provider = self.api_manager.get_best_provider()

        if not provider:
            # Ultimate fallback to Ollama
            return self._call_ollama(full_prompt, model)

        # Try providers in order of priority
        errors = []

        # Sort providers by priority
        sorted_providers = sorted(
            self.api_manager.providers.values(),
            key=lambda p: p.priority
        )

        for prov in sorted_providers:
            if not prov.is_active:
                continue

            try:
                if prov.provider_type == ProviderType.LOCAL_OLLAMA:
                    return self._call_ollama(full_prompt, model or prov.models[0])

                elif prov.provider_type == ProviderType.GROQ:
                    return self._call_groq(
                        full_prompt,
                        model or prov.models[0],
                        prov.api_key
                    )

                elif prov.provider_type == ProviderType.DEEPSEEK:
                    return self._call_deepseek(
                        full_prompt,
                        model or prov.models[0],
                        prov.api_key
                    )

                elif prov.provider_type == ProviderType.TOGETHER:
                    return self._call_together(
                        full_prompt,
                        model or prov.models[0],
                        prov.api_key
                    )

                elif prov.provider_type == ProviderType.OPENROUTER:
                    return self._call_openrouter(
                        full_prompt,
                        model or prov.models[0],
                        prov.api_key
                    )

            except Exception as e:
                errors.append(f"{prov.name}: {str(e)}")
                # Mark provider as temporarily inactive
                prov.is_active = False
                continue

        # If all else fails, use Ollama
        return self._call_ollama(full_prompt, model)

    def chat(self, messages: List[Dict], model: str = None) -> LLMResponse:
        """
        Chat-style interaction with message history
        """
        # Convert messages to prompt
        prompt_parts = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            prompt_parts.append(f"{role.capitalize()}: {content}")

        prompt = "\n\n".join(prompt_parts)
        return self.generate(prompt, model)


# Convenience function
def ask(prompt: str, model: str = None) -> str:
    """Quick one-shot prompt"""
    llm = UnifiedLLM()
    response = llm.generate(prompt, model)
    return response.content


if __name__ == "__main__":
    print("Testing Unified LLM...")

    llm = UnifiedLLM()

    # Test with a simple prompt
    response = llm.generate("What is 2+2? Answer briefly.")
    print(f"\nResponse: {response.content}")
    print(f"Provider: {response.provider}")
    print(f"Model: {response.model}")
    print(f"Tokens: {response.tokens_used}")
    print(f"Latency: {response.latency_ms:.0f}ms")
