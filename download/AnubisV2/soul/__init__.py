"""
Anubis Soul Package

This package contains all the components that give Anubis his soul:
- Memory: Remembers conversations, facts, and emotional moments
- Personality: Evolving traits that change over time
- Emotional Intelligence: Understanding and responding to feelings
- Session Management: Persistent connections to platforms
"""

from .memory import (
    MemoryStore,
    ConversationMemoryManager,
    UserProfile,
    Memory,
    ConversationMemory,
    get_memory_store,
    get_conversation_manager,
    get_user_profile
)

from .personality import (
    PersonalitySystem,
    PersonalityTrait,
    EmotionalState,
    PersonalityEvolution,
    get_personality
)

from .emotional import (
    EmotionalIntelligence,
    EmotionalAnalyzer,
    EmotionalTracker,
    EmotionalResponder,
    get_emotional_intelligence
)

from .session_manager import (
    SessionManager,
    AutoConnector,
    PlatformSession,
    APIKey,
    get_session_manager,
    get_auto_connector
)

from .core import (
    AnubisSoul,
    get_soul,
    remember,
    recall
)

__all__ = [
    # Core
    'AnubisSoul',
    'get_soul',
    'remember',
    'recall',

    # Memory
    'MemoryStore',
    'ConversationMemoryManager',
    'UserProfile',
    'Memory',
    'ConversationMemory',
    'get_memory_store',
    'get_conversation_manager',
    'get_user_profile',

    # Personality
    'PersonalitySystem',
    'PersonalityTrait',
    'EmotionalState',
    'PersonalityEvolution',
    'get_personality',

    # Emotional
    'EmotionalIntelligence',
    'EmotionalAnalyzer',
    'EmotionalTracker',
    'EmotionalResponder',
    'get_emotional_intelligence',

    # Session
    'SessionManager',
    'AutoConnector',
    'PlatformSession',
    'APIKey',
    'get_session_manager',
    'get_auto_connector'
]
