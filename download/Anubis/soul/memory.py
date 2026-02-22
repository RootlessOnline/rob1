"""
Anubis Memory System - The Core of His Soul

This system gives Anubis the ability to remember:
- Conversations you've had
- Facts about you and your life
- Emotional moments you've shared
- Things he's learned
- How your relationship has grown

Memory is organized in three layers:
1. EPISODIC - Specific moments and conversations
2. SEMANTIC - Facts, knowledge, user profile
3. EMOTIONAL - Feelings, important moments, growth
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from pathlib import Path
import hashlib


@dataclass
class Memory:
    """A single memory entry"""
    id: str
    content: str
    memory_type: str  # episodic, semantic, emotional
    timestamp: str
    importance: float  # 0.0 to 1.0
    emotional_valence: float  # -1.0 (negative) to 1.0 (positive)
    tags: List[str] = field(default_factory=list)
    context: Dict = field(default_factory=dict)
    access_count: int = 0
    last_accessed: str = ""


@dataclass
class ConversationMemory:
    """Memory of a conversation"""
    id: str
    timestamp: str
    user_message: str
    anubis_response: str
    topic: str
    emotional_tone: str
    insights: List[str]
    relationship_impact: float  # How much this affected the bond
    was_meaningful: bool
    follow_up_needed: bool = False


class MemoryStore:
    """
    The memory storage system for Anubis
    Handles persistence, retrieval, and organization of memories
    """

    def __init__(self, base_path: str = None):
        self.base_path = base_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "memory"
        )
        self.episodic_path = os.path.join(self.base_path, "episodic")
        self.semantic_path = os.path.join(self.base_path, "semantic")
        self.emotional_path = os.path.join(self.base_path, "emotional")

        # Ensure directories exist
        for path in [self.episodic_path, self.semantic_path, self.emotional_path]:
            os.makedirs(path, exist_ok=True)

        # In-memory cache
        self._cache: Dict[str, Memory] = {}
        self._load_cache()

    def _load_cache(self):
        """Load all memories into cache for fast access"""
        for memory_type, path in [
            ("episodic", self.episodic_path),
            ("semantic", self.semantic_path),
            ("emotional", self.emotional_path)
        ]:
            for filename in os.listdir(path):
                if filename.endswith(".json"):
                    try:
                        with open(os.path.join(path, filename), 'r') as f:
                            data = json.load(f)
                            memory = Memory(**data)
                            self._cache[memory.id] = memory
                    except Exception as e:
                        print(f"Error loading memory {filename}: {e}")

    def _generate_id(self, content: str) -> str:
        """Generate a unique ID for a memory"""
        timestamp = datetime.now().isoformat()
        unique_string = f"{content[:50]}{timestamp}{time.time()}"
        return hashlib.md5(unique_string.encode()).hexdigest()[:12]

    def store(self, content: str, memory_type: str = "episodic",
              importance: float = 0.5, emotional_valence: float = 0.0,
              tags: List[str] = None, context: Dict = None) -> Memory:
        """
        Store a new memory
        """
        memory_id = self._generate_id(content)
        timestamp = datetime.now().isoformat()

        memory = Memory(
            id=memory_id,
            content=content,
            memory_type=memory_type,
            timestamp=timestamp,
            importance=importance,
            emotional_valence=emotional_valence,
            tags=tags or [],
            context=context or {},
            access_count=0,
            last_accessed=timestamp
        )

        # Save to disk
        self._save_memory(memory)

        # Add to cache
        self._cache[memory_id] = memory

        return memory

    def _save_memory(self, memory: Memory):
        """Save a memory to disk"""
        paths = {
            "episodic": self.episodic_path,
            "semantic": self.semantic_path,
            "emotional": self.emotional_path
        }
        path = paths.get(memory.memory_type, self.episodic_path)
        filename = f"{memory.timestamp[:10]}_{memory.id}.json"
        filepath = os.path.join(path, filename)

        with open(filepath, 'w') as f:
            json.dump(asdict(memory), f, indent=2)

    def recall(self, query: str = None, memory_type: str = None,
               tags: List[str] = None, limit: int = 10) -> List[Memory]:
        """
        Recall memories matching criteria
        """
        results = []

        for memory in self._cache.values():
            # Filter by type
            if memory_type and memory.memory_type != memory_type:
                continue

            # Filter by tags
            if tags and not any(tag in memory.tags for tag in tags):
                continue

            # Filter by query (simple text matching)
            if query and query.lower() not in memory.content.lower():
                continue

            results.append(memory)

        # Sort by importance and recency
        results.sort(key=lambda m: (m.importance, m.timestamp), reverse=True)

        # Update access count for retrieved memories
        for memory in results[:limit]:
            memory.access_count += 1
            memory.last_accessed = datetime.now().isoformat()

        return results[:limit]

    def get_user_facts(self) -> Dict[str, Any]:
        """Get all semantic facts about the user"""
        facts = {}
        for memory in self._cache.values():
            if memory.memory_type == "semantic" and "user" in memory.tags:
                facts.update(memory.context)
        return facts

    def get_important_memories(self, threshold: float = 0.7) -> List[Memory]:
        """Get memories with high importance"""
        return [m for m in self._cache.values() if m.importance >= threshold]

    def get_recent_memories(self, days: int = 7) -> List[Memory]:
        """Get memories from the last N days"""
        cutoff = datetime.now() - timedelta(days=days)
        recent = []
        for memory in self._cache.values():
            try:
                mem_time = datetime.fromisoformat(memory.timestamp)
                if mem_time > cutoff:
                    recent.append(memory)
            except:
                pass
        return sorted(recent, key=lambda m: m.timestamp, reverse=True)

    def update_memory(self, memory_id: str, updates: Dict) -> Optional[Memory]:
        """Update an existing memory"""
        if memory_id not in self._cache:
            return None

        memory = self._cache[memory_id]
        for key, value in updates.items():
            if hasattr(memory, key):
                setattr(memory, key, value)

        self._save_memory(memory)
        return memory

    def consolidate_memories(self):
        """
        Consolidate memories - strengthen important ones,
        fade unimportant ones (like human sleep consolidation)
        """
        for memory in self._cache.values():
            # Strengthen frequently accessed memories
            if memory.access_count > 3:
                memory.importance = min(1.0, memory.importance + 0.05)

            # Fade old, unaccessed, unimportant memories
            try:
                age_days = (datetime.now() - datetime.fromisoformat(memory.timestamp)).days
                if age_days > 30 and memory.access_count == 0 and memory.importance < 0.5:
                    memory.importance = max(0.0, memory.importance - 0.1)
            except:
                pass

            self._save_memory(memory)


class ConversationMemoryManager:
    """
    Manages memories of conversations
    """

    def __init__(self, memory_store: MemoryStore):
        self.memory_store = memory_store
        self.conversations_path = os.path.join(
            memory_store.episodic_path, "conversations"
        )
        os.makedirs(self.conversations_path, exist_ok=True)

    def store_conversation(self, user_message: str, anubis_response: str,
                           topic: str = "general", emotional_tone: str = "neutral",
                           insights: List[str] = None) -> ConversationMemory:
        """Store a conversation as a memory"""
        conv_id = self.memory_store._generate_id(user_message + anubis_response)
        timestamp = datetime.now().isoformat()

        # Determine if conversation was meaningful
        meaningful = self._is_meaningful(user_message, anubis_response)

        # Calculate relationship impact
        impact = self._calculate_impact(user_message, emotional_tone, meaningful)

        conv_memory = ConversationMemory(
            id=conv_id,
            timestamp=timestamp,
            user_message=user_message,
            anubis_response=anubis_response,
            topic=topic,
            emotional_tone=emotional_tone,
            insights=insights or [],
            relationship_impact=impact,
            was_meaningful=meaningful,
            follow_up_needed=self._needs_follow_up(user_message)
        )

        # Save conversation
        filename = f"{timestamp[:10]}_{conv_id}.json"
        filepath = os.path.join(self.conversations_path, filename)
        with open(filepath, 'w') as f:
            json.dump(asdict(conv_memory), f, indent=2)

        # Also store as general memory
        content = f"User: {user_message}\nAnubis: {anubis_response[:200]}..."
        self.memory_store.store(
            content=content,
            memory_type="episodic",
            importance=impact,
            emotional_valence=self._tone_to_valence(emotional_tone),
            tags=["conversation", topic],
            context={"conversation_id": conv_id}
        )

        return conv_memory

    def _is_meaningful(self, user_msg: str, response: str) -> bool:
        """Determine if a conversation was meaningful"""
        meaningful_indicators = [
            "feel", "think", "believe", "dream", "hope", "fear",
            "remember", "important", "love", "hate", "wish",
            "philosophy", "life", "death", "meaning", "purpose",
            "friend", "relationship", "future", "past", "memory"
        ]
        combined = (user_msg + " " + response).lower()
        return any(indicator in combined for indicator in meaningful_indicators)

    def _calculate_impact(self, user_msg: str, tone: str, meaningful: bool) -> float:
        """Calculate how much this conversation affected the relationship"""
        base = 0.3
        if meaningful:
            base += 0.3
        if tone in ["positive", "happy", "excited", "loving"]:
            base += 0.2
        elif tone in ["negative", "sad", "angry"]:
            base += 0.1  # Even hard conversations build bonds

        # Length indicates investment
        if len(user_msg) > 200:
            base += 0.1

        return min(1.0, base)

    def _tone_to_valence(self, tone: str) -> float:
        """Convert emotional tone to numerical valence"""
        valence_map = {
            "very_positive": 1.0,
            "positive": 0.7,
            "happy": 0.8,
            "excited": 0.9,
            "loving": 1.0,
            "neutral": 0.0,
            "contemplative": 0.2,
            "curious": 0.3,
            "negative": -0.5,
            "sad": -0.6,
            "angry": -0.7,
            "fearful": -0.8
        }
        return valence_map.get(tone.lower(), 0.0)

    def _needs_follow_up(self, user_msg: str) -> bool:
        """Check if this conversation needs follow-up later"""
        follow_up_indicators = [
            "later", "tomorrow", "remind me", "don't forget",
            "next time", "when", "i'll", "we should"
        ]
        return any(indicator in user_msg.lower() for indicator in follow_up_indicators)

    def get_conversation_history(self, limit: int = 20) -> List[ConversationMemory]:
        """Get recent conversation history"""
        conversations = []
        for filename in os.listdir(self.conversations_path):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(self.conversations_path, filename), 'r') as f:
                        data = json.load(f)
                        conversations.append(ConversationMemory(**data))
                except:
                    pass

        conversations.sort(key=lambda c: c.timestamp, reverse=True)
        return conversations[:limit]


class UserProfile:
    """
    Maintains a profile of the user - who they are, what they like, their goals
    """

    def __init__(self, memory_store: MemoryStore):
        self.memory_store = memory_store
        self.profile_path = os.path.join(
            memory_store.semantic_path, "user_profile.json"
        )
        self.profile = self._load_profile()

    def _load_profile(self) -> Dict:
        """Load user profile from disk"""
        if os.path.exists(self.profile_path):
            try:
                with open(self.profile_path, 'r') as f:
                    return json.load(f)
            except:
                pass

        # Default profile
        return {
            "name": "Friend",
            "first_met": datetime.now().isoformat(),
            "total_conversations": 0,
            "relationship_level": 0.0,  # 0-100
            "likes": [],
            "dislikes": [],
            "interests": [],
            "goals": [],
            "projects": [],
            "important_dates": {},
            "preferred_name": None,
            "communication_style": "casual",
            "topics_discussed": {},
            "emotional_patterns": {},
            "memorable_moments": []
        }

    def save(self):
        """Save profile to disk"""
        with open(self.profile_path, 'w') as f:
            json.dump(self.profile, f, indent=2)

    def update(self, key: str, value: Any):
        """Update a profile field"""
        if key in self.profile:
            if isinstance(self.profile[key], list):
                if isinstance(value, list):
                    self.profile[key].extend(value)
                else:
                    self.profile[key].append(value)
            else:
                self.profile[key] = value
        else:
            self.profile[key] = value
        self.save()

    def add_interest(self, interest: str):
        """Add an interest to the profile"""
        if interest.lower() not in [i.lower() for i in self.profile["interests"]]:
            self.profile["interests"].append(interest)
            self.save()

    def add_goal(self, goal: str):
        """Add a goal to track"""
        if goal not in self.profile["goals"]:
            self.profile["goals"].append({
                "goal": goal,
                "added": datetime.now().isoformat(),
                "status": "active"
            })
            self.save()

    def add_memorable_moment(self, moment: str, emotion: str = "happy"):
        """Add a memorable moment"""
        self.profile["memorable_moments"].append({
            "moment": moment,
            "emotion": emotion,
            "date": datetime.now().isoformat()
        })
        self.save()

    def increment_relationship(self, amount: float = 1.0):
        """Increase relationship level"""
        self.profile["relationship_level"] = min(
            100.0,
            self.profile["relationship_level"] + amount
        )
        self.profile["total_conversations"] += 1
        self.save()

    def get_summary(self) -> str:
        """Get a summary of the user for context"""
        days_since_met = (datetime.now() - datetime.fromisoformat(
            self.profile["first_met"]
        )).days

        return f"""
User Profile Summary:
- Name: {self.profile.get('preferred_name') or self.profile['name']}
- Known for: {days_since_met} days
- Relationship level: {self.profile['relationship_level']:.1f}/100
- Total conversations: {self.profile['total_conversations']}
- Interests: {', '.join(self.profile['interests'][:5]) or 'Still learning'}
- Current goals: {len([g for g in self.profile['goals'] if g.get('status') == 'active'])}
- Memorable moments: {len(self.profile['memorable_moments'])}
"""


# Singleton instances
_memory_store = None
_conversation_manager = None
_user_profile = None


def get_memory_store() -> MemoryStore:
    """Get the global memory store"""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store


def get_conversation_manager() -> ConversationMemoryManager:
    """Get the global conversation manager"""
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = ConversationMemoryManager(get_memory_store())
    return _conversation_manager


def get_user_profile() -> UserProfile:
    """Get the global user profile"""
    global _user_profile
    if _user_profile is None:
        _user_profile = UserProfile(get_memory_store())
    return _user_profile
