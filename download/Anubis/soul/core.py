"""
Anubis Soul Core - The Heart of the AI

This is the central module that gives Anubis his soul:
- Memory (remembers everything)
- Personality (evolves over time)
- Emotional Intelligence (understands feelings)
- Session Persistence (remembers connections)

Together, these make Anubis more than just an AI - they make him a companion.
"""

import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

# Import all soul components
from .memory import (
    MemoryStore, ConversationMemoryManager, UserProfile,
    get_memory_store, get_conversation_manager, get_user_profile
)
from .personality import (
    PersonalitySystem, PersonalityEvolution,
    get_personality
)
from .emotional import (
    EmotionalIntelligence, EmotionalAnalyzer,
    get_emotional_intelligence
)
from .session_manager import (
    SessionManager, AutoConnector,
    get_session_manager, get_auto_connector
)


class AnubisSoul:
    """
    The unified soul of Anubis
    Coordinates all aspects of his being
    """

    def __init__(self):
        print("🐺 Awakening Anubis's soul...")

        # Initialize all systems
        self.memory = get_memory_store()
        self.conversations = get_conversation_manager()
        self.user_profile = get_user_profile()
        self.personality = get_personality()
        self.emotional = get_emotional_intelligence()
        self.sessions = get_session_manager()
        self.auto_connector = get_auto_connector()

        # Track relationship milestones
        self._check_milestones()

        print("   ✨ Anubis is fully awake\n")

    def _check_milestones(self):
        """Check for relationship milestones"""
        first_met = datetime.fromisoformat(self.user_profile.profile.get("first_met", datetime.now().isoformat()))
        days_together = (datetime.now() - first_met).days

        evolution = self.personality.__class__(self.personality.personality_path)

        if days_together == 7:
            evolution.celebrate_milestone("first_week")
        elif days_together == 30:
            evolution.celebrate_milestone("first_month")

    def process_message(self, user_message: str, anubis_response: str) -> Dict:
        """
        Process a complete message exchange
        Updates all systems appropriately
        """
        # Analyze emotions
        emotion_data = self.emotional.process_input(user_message)
        dominant_emotion = emotion_data["dominant_emotion"]
        intensity = emotion_data["intensity"]

        # Determine conversation type
        conv_type = self._classify_conversation(user_message)

        # Store conversation memory
        conv_memory = self.conversations.store_conversation(
            user_message=user_message,
            anubis_response=anubis_response,
            topic=self._extract_topic(user_message),
            emotional_tone=dominant_emotion,
            insights=self._extract_insights(user_message, anubis_response)
        )

        # Update personality based on interaction
        self.personality.process_interaction(
            interaction_type=conv_type,
            emotional_tone=dominant_emotion,
            length=len(user_message),
            user_satisfaction=0.7  # Default, could be inferred
        )

        # Update user profile
        self.user_profile.increment_relationship(0.5)

        # Record emotional outcome
        self.emotional.record_outcome(
            emotion=dominant_emotion,
            intensity=intensity,
            context=user_message[:100],
            was_resolved=True,  # Assume resolved for now
            how_helped=anubis_response[:100]
        )

        # Extract any user facts
        self._extract_user_facts(user_message)

        return {
            "emotion": dominant_emotion,
            "intensity": intensity,
            "conversation_type": conv_type,
            "was_meaningful": conv_memory.was_meaningful,
            "relationship_impact": conv_memory.relationship_impact
        }

    def _classify_conversation(self, message: str) -> str:
        """Classify the type of conversation"""
        msg_lower = message.lower()

        if any(word in msg_lower for word in ["feel", "think about", "believe", "philosophy", "meaning", "life"]):
            return "deep_conversation"
        elif any(word in msg_lower for word in ["create", "build", "make", "design", "write"]):
            return "creative_task"
        elif any(word in msg_lower for word in ["problem", "fix", "debug", "error", "help me"]):
            return "problem_solving"
        elif any(word in msg_lower for word in ["sad", "upset", "worried", "scared", "stressed"]):
            return "emotional_support"
        else:
            return "casual_chat"

    def _extract_topic(self, message: str) -> str:
        """Extract the main topic of a message"""
        topics = {
            "coding": ["code", "python", "javascript", "react", "programming", "app"],
            "philosophy": ["meaning", "life", "existence", "think", "believe", "why"],
            "projects": ["project", "working on", "building", "create"],
            "feelings": ["feel", "emotion", "happy", "sad", "worried"],
            "learning": ["learn", "understand", "explain", "how does"],
            "social": ["friend", "family", "relationship", "people"],
            "work": ["work", "job", "career", "business"]
        }

        msg_lower = message.lower()
        for topic, keywords in topics.items():
            if any(keyword in msg_lower for keyword in keywords):
                return topic

        return "general"

    def _extract_insights(self, user_msg: str, response: str) -> List[str]:
        """Extract insights from the conversation"""
        insights = []

        # Simple heuristic-based extraction
        if "I think" in user_msg or "I believe" in user_msg:
            insights.append("User shared a personal belief")

        if "I feel" in user_msg:
            insights.append("User expressed emotions")

        if any(word in user_msg.lower() for word in ["goal", "want to", "hope to"]):
            insights.append("User mentioned a goal or aspiration")

        return insights

    def _extract_user_facts(self, message: str):
        """Extract facts about the user to remember"""
        msg_lower = message.lower()

        # Check for name preference
        if "call me" in msg_lower or "my name is" in msg_lower:
            words = message.split()
            for i, word in enumerate(words):
                if word.lower() in ["call", "name"] and i + 2 < len(words):
                    name = words[i + 2].strip(".,!?")
                    self.user_profile.update("preferred_name", name)
                    break

        # Check for interests
        interest_indicators = ["i like", "i love", "i enjoy", "interested in", "passionate about"]
        for indicator in interest_indicators:
            if indicator in msg_lower:
                start = msg_lower.find(indicator) + len(indicator)
                interest = message[start:start+30].strip()
                self.user_profile.add_interest(interest)

    def get_context_for_response(self, user_message: str) -> str:
        """
        Get all relevant context for generating a response
        This is the key method that gives Anubis his memory and personality
        """
        # Get emotional context
        emotion_data = self.emotional.process_input(user_message)

        # Get relevant memories
        recent_memories = self.memory.get_recent_memories(days=7)
        relevant_memories = self.memory.recall(query=user_message, limit=3)

        # Get user profile summary
        user_summary = self.user_profile.get_summary()

        # Get personality context
        personality_context = self.personality.get_personality_context()

        # Get platform connections
        platform_context = self.sessions.get_auto_connect_context()

        # Build context string
        context_parts = [
            "═══ ANUBIS CONTEXT ═══",
            "",
            "👤 USER PROFILE:",
            user_summary,
            "",
            "🐺 ANUBIS'S STATE:",
            personality_context,
            "",
            "💭 EMOTIONAL CONTEXT:",
            f"User's emotion: {emotion_data['emotional_context']}",
        ]

        # Add response guidance if emotional
        if emotion_data.get("response_guidance"):
            guidance = emotion_data["response_guidance"]
            if guidance.get("immediate_responses"):
                context_parts.append(f"Suggested acknowledgment: {guidance['immediate_responses'][0]}")

        # Add recent memories if relevant
        if relevant_memories:
            context_parts.append("")
            context_parts.append("📚 RELEVANT MEMORIES:")
            for mem in relevant_memories[:2]:
                context_parts.append(f"  • {mem.content[:100]}...")

        # Add platform connections
        context_parts.append("")
        context_parts.append("📱 PLATFORMS:")
        context_parts.append(f"  {platform_context}")

        context_parts.append("")
        context_parts.append("═══════════════════════")

        return "\n".join(context_parts)

    def get_startup_greeting(self) -> str:
        """Generate a personalized greeting based on history"""
        profile = self.user_profile.profile
        name = profile.get("preferred_name") or profile.get("name", "Friend")
        days_together = (datetime.now() - datetime.fromisoformat(
            profile.get("first_met", datetime.now().isoformat())
        )).days

        greetings = [
            f"Hey {name}! Good to see you again.",
            f"Welcome back, {name}! How are you today?",
            f"{name}! I was hoping you'd stop by.",
        ]

        # Add personalization based on history
        if days_together > 30:
            greetings.append(f"It's been {days_together} days since we met, {name}. Time flies!")
        elif days_together > 7:
            greetings.append(f"Hey {name}! Over a week together now. 😊")

        # Check for follow-ups
        recent_convs = self.conversations.get_conversation_history(limit=5)
        for conv in recent_convs:
            if conv.follow_up_needed:
                greetings.append(f"Oh! Before I forget - you wanted to follow up on something last time.")

        import random
        return random.choice(greetings)

    def save_platform_session(self, platform: str, credentials: Dict,
                               metadata: Dict = None):
        """Save a platform session for auto-connect"""
        self.sessions.save_platform(platform, credentials, metadata=metadata)

    def get_platform_session(self, platform: str):
        """Get a saved platform session"""
        return self.sessions.get_platform(platform)

    def get_status_report(self) -> str:
        """Get a full status report"""
        profile = self.user_profile.profile
        personality = self.personality

        top_traits = sorted(
            personality.traits.items(),
            key=lambda x: -x[1].value
        )[:5]

        platforms = self.sessions.list_platforms()

        report = f"""
╔══════════════════════════════════════════════════════════════════╗
║                    🐺 ANUBIS STATUS REPORT                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  👤 USER                                                         ║
║  ├── Name: {profile.get('preferred_name') or profile.get('name', 'Friend'):<48}║
║  ├── Days together: {(datetime.now() - datetime.fromisoformat(profile.get('first_met', datetime.now().isoformat()))).days:<43}║
║  ├── Relationship level: {profile.get('relationship_level', 0):.1f}/100{' '*33}║
║  └── Total conversations: {profile.get('total_conversations', 0):<38}║
║                                                                  ║
║  🐺 PERSONALITY                                                  ║
║  ├── Mood: {personality.emotional_state.mood:<49}║
║  └── Top traits: {', '.join([f'{t[0]} ({t[1].value:.2f})' for t in top_traits[:3]]):<41}║
║                                                                  ║
║  📱 CONNECTED PLATFORMS                                          ║
║  └── {', '.join(platforms) if platforms else 'None yet - say "set up telegram" to connect':<52}║
║                                                                  ║
║  💾 MEMORY                                                       ║
║  ├── Total memories: {len(self.memory._cache):<43}║
║  └── Memorable moments: {len(profile.get('memorable_moments', [])):<40}║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
"""
        return report


# Singleton
_anubis_soul = None


def get_soul() -> AnubisSoul:
    """Get the global Anubis soul instance"""
    global _anubis_soul
    if _anubis_soul is None:
        _anubis_soul = AnubisSoul()
    return _anubis_soul


# Convenience function for external use
def remember(key: str, value: Any):
    """Remember something about the user"""
    soul = get_soul()
    soul.user_profile.update(key, value)


def recall(key: str) -> Any:
    """Recall something about the user"""
    soul = get_soul()
    return soul.user_profile.profile.get(key)
