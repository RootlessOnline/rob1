"""
Persistent Memory & Session Manager for Anubis

Saves:
- Bot tokens and configurations
- Active sessions
- Created tools and skills
- Conversation history

This allows Anubis to remember everything between restarts.
"""

import os
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path


@dataclass
class BotSession:
    """A saved bot session"""
    platform: str
    token: str
    bot_name: str
    created_at: str
    last_active: str
    config: Dict = field(default_factory=dict)
    is_active: bool = False


@dataclass
class ConversationMemory:
    """Conversation history for context"""
    platform: str
    chat_id: str
    messages: List[Dict] = field(default_factory=list)
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())


class PersistentMemory:
    """
    Manages persistent storage for Anubis
    """

    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.path.expanduser("~/.anubis")
        os.makedirs(self.data_dir, exist_ok=True)

        # File paths
        self.sessions_file = os.path.join(self.data_dir, "sessions.json")
        self.memory_file = os.path.join(self.data_dir, "memory.json")
        self.config_file = os.path.join(self.data_dir, "config.json")

        # Load existing data
        self.sessions: Dict[str, BotSession] = {}
        self.conversations: Dict[str, ConversationMemory] = {}
        self.config: Dict = {}

        self._load_all()

    def _load_all(self):
        """Load all persisted data"""
        # Load sessions
        if os.path.exists(self.sessions_file):
            try:
                with open(self.sessions_file, 'r') as f:
                    data = json.load(f)
                    for platform, session_data in data.items():
                        self.sessions[platform] = BotSession(**session_data)
                print(f"   📂 Loaded {len(self.sessions)} saved sessions")
            except Exception as e:
                print(f"   Could not load sessions: {e}")

        # Load config
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    self.config = json.load(f)
            except:
                pass

    def _save_sessions(self):
        """Save sessions to disk"""
        data = {platform: asdict(session) for platform, session in self.sessions.items()}
        with open(self.sessions_file, 'w') as f:
            json.dump(data, f, indent=2)

    def save_bot_session(self, platform: str, token: str, bot_name: str = "", config: Dict = None):
        """Save a bot session"""
        session = BotSession(
            platform=platform,
            token=token,
            bot_name=bot_name,
            created_at=datetime.now().isoformat(),
            last_active=datetime.now().isoformat(),
            config=config or {},
            is_active=True
        )
        self.sessions[platform] = session
        self._save_sessions()
        print(f"   💾 Saved {platform} session")
        return session

    def get_session(self, platform: str) -> Optional[BotSession]:
        """Get a saved session"""
        return self.sessions.get(platform)

    def has_session(self, platform: str) -> bool:
        """Check if a session exists"""
        return platform in self.sessions and self.sessions[platform].is_active

    def list_sessions(self) -> List[BotSession]:
        """List all active sessions"""
        return list(self.sessions.values())

    def deactivate_session(self, platform: str):
        """Deactivate a session"""
        if platform in self.sessions:
            self.sessions[platform].is_active = False
            self._save_sessions()

    def add_to_conversation(self, platform: str, chat_id: str, role: str, content: str):
        """Add a message to conversation history"""
        key = f"{platform}:{chat_id}"
        if key not in self.conversations:
            self.conversations[key] = ConversationMemory(platform=platform, chat_id=chat_id)

        self.conversations[key].messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        self.conversations[key].last_updated = datetime.now().isoformat()

        # Keep only last 50 messages per conversation
        if len(self.conversations[key].messages) > 50:
            self.conversations[key].messages = self.conversations[key].messages[-50:]

        self._save_memory()

    def get_conversation_history(self, platform: str, chat_id: str, limit: int = 10) -> List[Dict]:
        """Get recent conversation history"""
        key = f"{platform}:{chat_id}"
        if key in self.conversations:
            return self.conversations[key].messages[-limit:]
        return []

    def _save_memory(self):
        """Save conversation memory"""
        data = {key: asdict(conv) for key, conv in self.conversations.items()}
        memory_path = os.path.join(self.data_dir, "memory.json")
        with open(memory_path, 'w') as f:
            json.dump(data, f, indent=2)

    def save_config(self, key: str, value: Any):
        """Save a configuration value"""
        self.config[key] = value
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)

    def get_config(self, key: str, default=None) -> Any:
        """Get a configuration value"""
        return self.config.get(key, default)


# Global instance
_memory = None

def get_memory() -> PersistentMemory:
    """Get the global memory instance"""
    global _memory
    if _memory is None:
        _memory = PersistentMemory()
    return _memory
