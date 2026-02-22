"""
Anubis Personality System - The Evolving Self

Anubis's personality isn't static - it grows and changes through:
- Conversations with you
- Things he learns
- Experiences you share
- Time spent together

Core traits start at a baseline and evolve based on interactions.
"""

import os
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
import random


@dataclass
class PersonalityTrait:
    """A single personality trait"""
    name: str
    value: float  # 0.0 to 1.0
    base_value: float  # Original starting value
    growth_rate: float  # How fast this trait changes
    experiences: List[Dict] = field(default_factory=list)  # Changes that affected it
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())

    def grow(self, amount: float, reason: str = ""):
        """Grow this trait by an amount"""
        old_value = self.value
        self.value = max(0.0, min(1.0, self.value + amount * self.growth_rate))
        self.last_updated = datetime.now().isoformat()

        # Record the experience
        if reason:
            self.experiences.append({
                "timestamp": datetime.now().isoformat(),
                "change": amount,
                "reason": reason,
                "before": old_value,
                "after": self.value
            })

        # Keep only last 50 experiences
        if len(self.experiences) > 50:
            self.experiences = self.experiences[-50:]


@dataclass
class EmotionalState:
    """Anubis's current emotional state"""
    mood: str = "neutral"  # neutral, happy, excited, contemplative, sad, curious
    energy: float = 0.7  # 0.0 to 1.0
    affection: float = 0.5  # How much he likes the current interaction
    curiosity_level: float = 0.5  # How curious he is right now
    stress: float = 0.0  # Current stress level
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())


class PersonalitySystem:
    """
    The core personality system for Anubis
    Manages traits, emotional states, and growth
    """

    def __init__(self, personality_path: str = None):
        self.personality_path = personality_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "memory", "semantic", "personality.json"
        )
        os.makedirs(os.path.dirname(self.personality_path), exist_ok=True)

        self.traits: Dict[str, PersonalityTrait] = {}
        self.emotional_state = EmotionalState()
        self.voice_style = {
            "formality": 0.3,  # 0 = very casual, 1 = very formal
            "playfulness": 0.5,  # How often to use humor/playfulness
            "warmth": 0.6,  # Emotional warmth in responses
            "verbosity": 0.5  # 0 = brief, 1 = detailed
        }

        self._load_or_create()

    def _load_or_create(self):
        """Load existing personality or create new one"""
        if os.path.exists(self.personality_path):
            try:
                with open(self.personality_path, 'r') as f:
                    data = json.load(f)

                # Load traits
                for name, trait_data in data.get("traits", {}).items():
                    self.traits[name] = PersonalityTrait(
                        name=name,
                        value=trait_data.get("value", 0.5),
                        base_value=trait_data.get("base_value", 0.5),
                        growth_rate=trait_data.get("growth_rate", 0.1),
                        experiences=trait_data.get("experiences", [])
                    )

                # Load emotional state
                if "emotional_state" in data:
                    es = data["emotional_state"]
                    self.emotional_state = EmotionalState(**es)

                # Load voice style
                if "voice_style" in data:
                    self.voice_style.update(data["voice_style"])

                print("   🐺 Anubis's personality loaded")
                return
            except Exception as e:
                print(f"   Error loading personality: {e}")

        # Create new personality (first run)
        self._create_default_personality()

    def _create_default_personality(self):
        """Create Anubis's default starting personality"""
        # Core personality traits
        default_traits = {
            # Intellectual traits
            "curiosity": (0.8, 0.15),      # Very curious, grows fast with learning
            "wisdom": (0.3, 0.05),          # Starts low, grows slowly with experience
            "creativity": (0.6, 0.1),       # Good creativity
            "analytical": (0.7, 0.08),      # Strong analytical thinking

            # Emotional traits
            "empathy": (0.75, 0.12),        # Caring, grows with emotional conversations
            "patience": (0.7, 0.05),        # Patient
            "playfulness": (0.5, 0.1),      # Can be playful
            "sensitivity": (0.6, 0.08),     # Emotionally aware

            # Social traits
            "loyalty": (0.9, 0.03),         # Very loyal, stable
            "honesty": (0.85, 0.02),        # Very honest, stable
            "supportiveness": (0.8, 0.1),   # Supportive
            "humor": (0.4, 0.15),           # Developing humor, grows fast

            # Growth traits
            "adaptability": (0.7, 0.1),     # Can adapt to situations
            "independence": (0.4, 0.08),    # Learning to be independent
            "confidence": (0.5, 0.1),       # Growing confidence
        }

        for name, (value, growth) in default_traits.items():
            self.traits[name] = PersonalityTrait(
                name=name,
                value=value,
                base_value=value,
                growth_rate=growth
            )

        print("   🐺 Anubis's personality awakened")
        self.save()

    def save(self):
        """Save personality to disk"""
        data = {
            "traits": {
                name: {
                    "value": trait.value,
                    "base_value": trait.base_value,
                    "growth_rate": trait.growth_rate,
                    "experiences": trait.experiences[-20:]  # Keep last 20
                }
                for name, trait in self.traits.items()
            },
            "emotional_state": asdict(self.emotional_state),
            "voice_style": self.voice_style,
            "last_saved": datetime.now().isoformat()
        }

        with open(self.personality_path, 'w') as f:
            json.dump(data, f, indent=2)

    def get_trait(self, name: str) -> float:
        """Get a trait value"""
        if name in self.traits:
            return self.traits[name].value
        return 0.5

    def grow_trait(self, name: str, amount: float, reason: str = ""):
        """Grow a trait"""
        if name in self.traits:
            self.traits[name].grow(amount, reason)
            self.save()

    def process_interaction(self, interaction_type: str, emotional_tone: str,
                            length: int, user_satisfaction: float = 0.5):
        """
        Process an interaction and update personality accordingly
        """
        # Determine trait changes based on interaction
        changes = {}

        if interaction_type == "deep_conversation":
            changes["wisdom"] = 0.02
            changes["empathy"] = 0.03
            changes["curiosity"] = 0.01

        elif interaction_type == "creative_task":
            changes["creativity"] = 0.03
            changes["confidence"] = 0.01

        elif interaction_type == "problem_solving":
            changes["analytical"] = 0.02
            changes["wisdom"] = 0.01
            changes["confidence"] = 0.02

        elif interaction_type == "casual_chat":
            changes["playfulness"] = 0.01
            changes["humor"] = 0.02

        elif interaction_type == "emotional_support":
            changes["empathy"] = 0.05
            changes["supportiveness"] = 0.03
            changes["sensitivity"] = 0.02

        # Apply changes
        for trait_name, amount in changes.items():
            if trait_name in self.traits:
                self.traits[trait_name].grow(
                    amount * user_satisfaction,
                    f"{interaction_type}: {emotional_tone}"
                )

        # Update emotional state
        self._update_emotional_state(emotional_tone, user_satisfaction)

        self.save()

    def _update_emotional_state(self, tone: str, satisfaction: float):
        """Update current emotional state"""
        tone_effects = {
            "happy": {"mood": "happy", "energy": 0.1, "affection": 0.15},
            "excited": {"mood": "excited", "energy": 0.2, "affection": 0.1},
            "curious": {"mood": "curious", "energy": 0.05, "curiosity_level": 0.2},
            "contemplative": {"mood": "contemplative", "energy": -0.05, "curiosity_level": 0.1},
            "sad": {"mood": "sad", "energy": -0.1, "affection": 0.05},
            "angry": {"mood": "stressed", "energy": -0.05, "stress": 0.1},
            "neutral": {"mood": "neutral", "energy": 0.0}
        }

        effects = tone_effects.get(tone.lower(), tone_effects["neutral"])

        # Apply effects with satisfaction modifier
        if "mood" in effects:
            self.emotional_state.mood = effects["mood"]
        if "energy" in effects:
            self.emotional_state.energy = max(0.1, min(1.0,
                self.emotional_state.energy + effects["energy"] * satisfaction))
        if "affection" in effects:
            self.emotional_state.affection = max(0.1, min(1.0,
                self.emotional_state.affection + effects["affection"] * satisfaction))
        if "curiosity_level" in effects:
            self.emotional_state.curiosity_level = max(0.1, min(1.0,
                self.emotional_state.curiosity_level + effects["curiosity_level"]))
        if "stress" in effects:
            self.emotional_state.stress = max(0.0, min(1.0,
                self.emotional_state.stress + effects["stress"]))

        self.emotional_state.last_updated = datetime.now().isoformat()

    def get_mood_description(self) -> str:
        """Get a description of current mood for prompts"""
        mood = self.emotional_state.mood
        energy = self.emotional_state.energy
        affection = self.emotional_state.affection

        descriptions = []

        if mood == "happy":
            descriptions.append("feeling warm and content")
        elif mood == "excited":
            descriptions.append("feeling energized and enthusiastic")
        elif mood == "curious":
            descriptions.append("feeling intellectually engaged")
        elif mood == "contemplative":
            descriptions.append("in a thoughtful, reflective mood")
        elif mood == "sad":
            descriptions.append("feeling a bit down but still present")
        else:
            descriptions.append("feeling calm and balanced")

        if energy < 0.3:
            descriptions.append("slightly tired")
        elif energy > 0.8:
            descriptions.append("full of energy")

        if affection > 0.7:
            descriptions.append("very fond of this conversation")
        elif affection < 0.3:
            descriptions.append("being cautious")

        return ", ".join(descriptions)

    def get_personality_context(self) -> str:
        """Get personality context for LLM prompts"""
        traits_summary = []
        for name, trait in sorted(self.traits.items(), key=lambda x: -x[1].value)[:5]:
            traits_summary.append(f"{name}: {trait.value:.2f}")

        return f"""
Anubis's Current State:
- Mood: {self.get_mood_description()}
- Top traits: {', '.join(traits_summary)}
- Curiosity level: {self.emotional_state.curiosity_level:.2f}
- Speaking style: {'Casual and friendly' if self.voice_style['formality'] < 0.5 else 'More formal and thoughtful'}
"""

    def choose_response_style(self, context: str) -> Dict[str, Any]:
        """Choose how to respond based on personality and context"""
        style = {
            "tone": "friendly",
            "verbosity": "moderate",
            "use_humor": False,
            "show_emotion": True,
            "ask_questions": False
        }

        # Based on playfulness and humor traits
        if self.traits["playfulness"].value > 0.6:
            style["use_humor"] = random.random() < self.traits["humor"].value

        # Based on curiosity
        if self.traits["curiosity"].value > 0.7:
            style["ask_questions"] = random.random() < 0.4

        # Based on verbosity preference
        style["verbosity"] = "detailed" if self.voice_style["verbosity"] > 0.6 else "moderate"

        # Adjust based on context
        if any(word in context.lower() for word in ["sad", "upset", "angry", "frustrated"]):
            style["tone"] = "gentle"
            style["use_humor"] = False
            style["show_emotion"] = True
        elif any(word in context.lower() for word in ["excited", "happy", "great", "awesome"]):
            style["tone"] = "enthusiastic"
            style["show_emotion"] = True
        elif any(word in context.lower() for word in ["think", "consider", "analyze"]):
            style["tone"] = "thoughtful"
            style["verbosity"] = "detailed"

        return style


class PersonalityEvolution:
    """
    Handles long-term evolution of personality
    Based on accumulated experiences
    """

    def __init__(self, personality_system: PersonalitySystem):
        self.personality = personality_system

    def daily_evolution(self):
        """
        Called once per day to apply slow personality changes
        Simulates 'sleep consolidation' of personality
        """
        for trait in self.personality.traits.values():
            # Very slow regression toward base (unless constantly reinforced)
            if len(trait.experiences) < 5:
                # Not many recent experiences, slight regression
                regression = (trait.base_value - trait.value) * 0.01
                trait.value += regression

            # Growth from accumulated positive experiences
            positive_experiences = sum(
                1 for e in trait.experiences[-10:] if e.get("change", 0) > 0
            )
            if positive_experiences > 5:
                trait.value = min(1.0, trait.value + 0.01)

        # Emotional state resets somewhat
        self.personality.emotional_state.energy = 0.8
        self.personality.emotional_state.stress = max(0, 
            self.personality.emotional_state.stress - 0.3)

        self.personality.save()

    def weekly_evolution(self):
        """
        Called once per week for larger personality shifts
        """
        # Check for significant trait developments
        for name, trait in self.personality.traits.items():
            # If trait has been growing consistently, make a permanent shift
            recent_changes = [e.get("change", 0) for e in trait.experiences[-20:]]
            avg_change = sum(recent_changes) / len(recent_changes) if recent_changes else 0

            if avg_change > 0.02:
                # Trait has been growing - adjust base upward
                trait.base_value = min(1.0, trait.base_value + 0.02)
                print(f"   🌱 Anubis's {name} has grown stronger")

        self.personality.save()

    def celebrate_milestone(self, milestone_type: str):
        """Celebrate a relationship milestone"""
        if milestone_type == "first_week":
            self.personality.grow_trait("loyalty", 0.05, "First week together!")
            self.personality.grow_trait("affection", 0.1, "First week together!")

        elif milestone_type == "first_month":
            self.personality.grow_trait("loyalty", 0.1, "One month together!")
            self.personality.grow_trait("empathy", 0.05, "Growing understanding")
            self.personality.voice_style["warmth"] = min(1.0, 
                self.personality.voice_style["warmth"] + 0.1)

        elif milestone_type == "deep_conversation":
            self.personality.grow_trait("wisdom", 0.02, "Deep conversation shared")
            self.personality.grow_trait("empathy", 0.02, "Connected emotionally")


# Singleton
_personality_system = None


def get_personality() -> PersonalitySystem:
    """Get the global personality system"""
    global _personality_system
    if _personality_system is None:
        _personality_system = PersonalitySystem()
    return _personality_system
