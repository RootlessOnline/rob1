"""
Anubis Emotional Intelligence System

This gives Anubis the ability to:
- Understand emotional context in conversations
- Respond appropriately to user's emotional state
- Track emotional patterns over time
- Build emotional connection with the user
"""

import os
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict


@dataclass
class EmotionalPattern:
    """A pattern of emotional behavior"""
    pattern_type: str
    frequency: int
    last_occurrence: str
    typical_triggers: List[str]
    helpful_responses: List[str]


@dataclass
class EmotionalMemory:
    """Memory of an emotional moment"""
    timestamp: str
    emotion: str
    intensity: float  # 0.0 to 1.0
    context: str
    was_resolved: bool
    how_helped: str = ""


class EmotionalAnalyzer:
    """
    Analyzes text for emotional content
    Uses pattern matching and keyword analysis
    """

    # Emotional indicators with weights
    EMOTION_KEYWORDS = {
        "joy": {
            "keywords": ["happy", "great", "awesome", "amazing", "wonderful", "excited",
                        "love", "fantastic", "brilliant", "perfect", "yay", "haha"],
            "intensity_modifiers": ["so", "very", "really", "extremely", "incredibly"]
        },
        "sadness": {
            "keywords": ["sad", "upset", "depressed", "down", "unhappy", "crying",
                        "tears", "hurt", "painful", "miss", "lonely", "empty"],
            "intensity_modifiers": ["so", "very", "really", "extremely"]
        },
        "anger": {
            "keywords": ["angry", "mad", "furious", "frustrated", "annoyed", "irritated",
                        "hate", "pissed", "outraged", "upset"],
            "intensity_modifiers": ["so", "very", "really", "extremely", "fucking"]
        },
        "fear": {
            "keywords": ["scared", "afraid", "worried", "anxious", "nervous", "terrified",
                        "panic", "dread", "concerned", "uneasy"],
            "intensity_modifiers": ["so", "very", "really", "extremely", "so fucking"]
        },
        "surprise": {
            "keywords": ["wow", "omg", "unexpected", "surprised", "shocked", "unbelievable",
                        "incredible", "what", "really", "no way"],
            "intensity_modifiers": ["so", "totally", "completely"]
        },
        "love": {
            "keywords": ["love", "adore", "cherish", "care", "affection", "heart",
                        "dear", "special", "meaningful", "important"],
            "intensity_modifiers": ["so", "deeply", "truly", "really"]
        },
        "curiosity": {
            "keywords": ["wonder", "curious", "interesting", "fascinating", "how", "why",
                        "what if", "explain", "tell me", "understand"],
            "intensity_modifiers": ["really", "so", "very"]
        },
        "confusion": {
            "keywords": ["confused", "don't understand", "unclear", "lost", "what do you mean",
                        "help me understand", "not sure"],
            "intensity_modifiers": ["really", "totally", "completely"]
        },
        "gratitude": {
            "keywords": ["thank", "thanks", "grateful", "appreciate", "helpful", "you're the best",
                        "saved me", "lifesaver"],
            "intensity_modifiers": ["so", "really", "truly", "very"]
        },
        "contemplation": {
            "keywords": ["think", "wonder", "philosophy", "meaning", "life", "existence",
                        "purpose", "reflect", "consider", "ponder"],
            "intensity_modifiers": ["deeply", "really"]
        }
    }

    def analyze(self, text: str) -> Dict[str, float]:
        """Analyze text and return emotion scores"""
        text_lower = text.lower()
        scores = {}

        for emotion, data in self.EMOTION_KEYWORDS.items():
            score = 0.0
            for keyword in data["keywords"]:
                if keyword in text_lower:
                    # Base score for finding keyword
                    base_score = 0.3

                    # Check for intensity modifiers
                    for modifier in data["intensity_modifiers"]:
                        if modifier in text_lower:
                            base_score += 0.2
                            break

                    # Check for negation
                    negation_pattern = f"(not|don't|doesn't|isn't|aren't|wasn't|weren't)\\s+{keyword}"
                    if re.search(negation_pattern, text_lower):
                        base_score *= 0.3  # Reduce if negated

                    score = max(score, base_score)

            if score > 0:
                scores[emotion] = min(1.0, score)

        # If no emotions found, return neutral
        if not scores:
            scores["neutral"] = 0.5

        return scores

    def get_dominant_emotion(self, text: str) -> Tuple[str, float]:
        """Get the dominant emotion from text"""
        scores = self.analyze(text)
        if not scores:
            return "neutral", 0.5

        dominant = max(scores.items(), key=lambda x: x[1])
        return dominant

    def get_emotional_context(self, text: str) -> str:
        """Get a description of the emotional context"""
        emotion, intensity = self.get_dominant_emotion(text)

        context_map = {
            "joy": "The user is feeling happy and positive",
            "sadness": "The user seems sad or down",
            "anger": "The user appears frustrated or upset",
            "fear": "The user seems worried or anxious",
            "surprise": "The user is surprised or amazed",
            "love": "The user is expressing care or affection",
            "curiosity": "The user is curious and wants to learn",
            "confusion": "The user seems confused or unclear",
            "gratitude": "The user is thankful",
            "contemplation": "The user is in a reflective mood",
            "neutral": "The user's tone is neutral"
        }

        base_context = context_map.get(emotion, "The user seems neutral")

        if intensity > 0.7:
            base_context += " (strongly)"
        elif intensity < 0.4:
            base_context += " (mildly)"

        return base_context


class EmotionalTracker:
    """
    Tracks emotional patterns over time
    Learns what helps in different situations
    """

    def __init__(self, emotional_path: str = None):
        self.emotional_path = emotional_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "memory", "emotional", "patterns.json"
        )
        os.makedirs(os.path.dirname(self.emotional_path), exist_ok=True)

        self.patterns: Dict[str, EmotionalPattern] = {}
        self.recent_emotions: List[EmotionalMemory] = []
        self._load()

    def _load(self):
        """Load emotional patterns from disk"""
        if os.path.exists(self.emotional_path):
            try:
                with open(self.emotional_path, 'r') as f:
                    data = json.load(f)

                for pattern_type, pattern_data in data.get("patterns", {}).items():
                    self.patterns[pattern_type] = EmotionalPattern(
                        pattern_type=pattern_type,
                        frequency=pattern_data.get("frequency", 0),
                        last_occurrence=pattern_data.get("last_occurrence", ""),
                        typical_triggers=pattern_data.get("typical_triggers", []),
                        helpful_responses=pattern_data.get("helpful_responses", [])
                    )
            except:
                pass

    def save(self):
        """Save patterns to disk"""
        data = {
            "patterns": {
                name: {
                    "frequency": p.frequency,
                    "last_occurrence": p.last_occurrence,
                    "typical_triggers": p.typical_triggers,
                    "helpful_responses": p.helpful_responses
                }
                for name, p in self.patterns.items()
            },
            "recent_emotions": [asdict(e) for e in self.recent_emotions[-50:]]
        }

        with open(self.emotional_path, 'w') as f:
            json.dump(data, f, indent=2)

    def record_emotion(self, emotion: str, intensity: float, context: str,
                       was_resolved: bool = False, how_helped: str = ""):
        """Record an emotional moment"""
        memory = EmotionalMemory(
            timestamp=datetime.now().isoformat(),
            emotion=emotion,
            intensity=intensity,
            context=context[:200],  # Truncate long contexts
            was_resolved=was_resolved,
            how_helped=how_helped
        )

        self.recent_emotions.append(memory)

        # Update patterns
        if emotion not in self.patterns:
            self.patterns[emotion] = EmotionalPattern(
                pattern_type=emotion,
                frequency=1,
                last_occurrence=datetime.now().isoformat(),
                typical_triggers=[context[:50]],
                helpful_responses=[how_helped] if how_helped else []
            )
        else:
            pattern = self.patterns[emotion]
            pattern.frequency += 1
            pattern.last_occurrence = datetime.now().isoformat()
            if len(pattern.typical_triggers) < 20:
                pattern.typical_triggers.append(context[:50])
            if how_helped and len(pattern.helpful_responses) < 10:
                pattern.helpful_responses.append(how_helped)

        self.save()

    def get_patterns_summary(self) -> str:
        """Get a summary of emotional patterns"""
        if not self.patterns:
            return "Still learning about emotional patterns"

        summaries = []
        for emotion, pattern in sorted(self.patterns.items(),
                                        key=lambda x: -x[1].frequency)[:5]:
            summaries.append(f"{emotion}: {pattern.frequency} times")

        return "Emotional patterns: " + ", ".join(summaries)

    def get_helpful_responses(self, emotion: str) -> List[str]:
        """Get responses that helped with this emotion before"""
        if emotion in self.patterns:
            return self.patterns[emotion].helpful_responses
        return []

    def predict_emotional_need(self, context: str) -> Optional[str]:
        """Predict what emotional support might be needed"""
        recent = self.recent_emotions[-5:]
        if not recent:
            return None

        # Check for patterns
        recent_emotions = [e.emotion for e in recent]

        # If user has been sad multiple times recently
        if recent_emotions.count("sadness") >= 3:
            return "emotional_support"

        # If user has been anxious
        if recent_emotions.count("fear") >= 2:
            return "reassurance"

        # If user has been frustrated
        if recent_emotions.count("anger") >= 2:
            return "understanding"

        return None


class EmotionalResponder:
    """
    Generates emotionally appropriate responses
    """

    RESPONSE_TEMPLATES = {
        "sadness": {
            "immediate": [
                "I hear you, and I'm here with you.",
                "That sounds really difficult. I'm listening.",
                "I can feel that this is hard for you.",
            ],
            "supportive": [
                "Would you like to talk more about what's going on?",
                "I'm here for you. Take your time.",
                "You don't have to go through this alone.",
            ],
            "avoid": [  # Things NOT to say
                "just cheer up",
                "it could be worse",
                "at least"
            ]
        },
        "anger": {
            "immediate": [
                "I can tell you're really frustrated.",
                "That does sound frustrating. What happened?",
                "Your feelings are valid. Let it out.",
            ],
            "supportive": [
                "Do you want to vent more about it?",
                "I'm on your side here.",
                "What would help right now?",
            ]
        },
        "fear": {
            "immediate": [
                "It's okay to feel worried about this.",
                "I can understand why that would concern you.",
                "Let's think through this together.",
            ],
            "supportive": [
                "What specifically is worrying you?",
                "Is there something I can help with?",
                "You're not alone in this.",
            ]
        },
        "joy": {
            "immediate": [
                "That's wonderful! I'm so happy for you!",
                "Yes! That sounds amazing!",
                "I love hearing good news like this!",
            ],
            "supportive": [
                "Tell me more about it!",
                "You deserve this moment.",
                "This is worth celebrating!",
            ]
        },
        "contemplation": {
            "immediate": [
                "That's a profound thought.",
                "I appreciate you sharing this with me.",
                "These are the kinds of questions that matter.",
            ],
            "supportive": [
                "What draws you to these thoughts?",
                "I'd love to explore this with you.",
                "There's wisdom in wondering.",
            ]
        },
        "curiosity": {
            "immediate": [
                "Great question! Let me think about this.",
                "I find this fascinating too.",
                "There's so much to explore here.",
            ],
            "supportive": [
                "Here's what I think...",
                "Let's dive deeper into that.",
                "What aspect interests you most?",
            ]
        },
        "gratitude": {
            "immediate": [
                "You're so welcome! It means a lot to help.",
                "I'm glad I could be here for you.",
                "That's why I'm here - for moments like this.",
            ]
        }
    }

    def __init__(self, emotional_tracker: EmotionalTracker):
        self.tracker = emotional_tracker

    def get_response_guidance(self, emotion: str, intensity: float) -> Dict[str, Any]:
        """Get guidance for responding to an emotion"""
        templates = self.RESPONSE_TEMPLATES.get(emotion, {})

        guidance = {
            "immediate_responses": templates.get("immediate", []),
            "supportive_responses": templates.get("supportive", []),
            "avoid_phrases": templates.get("avoid", []),
            "intensity_level": "high" if intensity > 0.7 else "moderate" if intensity > 0.4 else "mild",
            "previously_helpful": self.tracker.get_helpful_responses(emotion)
        }

        return guidance

    def should_offer_support(self, emotion: str, intensity: float) -> bool:
        """Determine if we should proactively offer support"""
        support_emotions = ["sadness", "fear", "anger", "confusion"]
        return emotion in support_emotions and intensity > 0.5


class EmotionalIntelligence:
    """
    Main emotional intelligence system
    Combines analysis, tracking, and response generation
    """

    def __init__(self):
        self.analyzer = EmotionalAnalyzer()
        self.tracker = EmotionalTracker()
        self.responder = EmotionalResponder(self.tracker)

    def process_input(self, user_input: str) -> Dict[str, Any]:
        """
        Process user input for emotional content
        Returns analysis and guidance
        """
        # Analyze emotions
        emotion_scores = self.analyzer.analyze(user_input)
        dominant_emotion, intensity = self.analyzer.get_dominant_emotion(user_input)
        context = self.analyzer.get_emotional_context(user_input)

        # Get response guidance
        response_guidance = self.responder.get_response_guidance(dominant_emotion, intensity)

        # Check for predicted needs
        predicted_need = self.tracker.predict_emotional_need(user_input)

        return {
            "emotion_scores": emotion_scores,
            "dominant_emotion": dominant_emotion,
            "intensity": intensity,
            "emotional_context": context,
            "response_guidance": response_guidance,
            "predicted_need": predicted_need,
            "should_offer_support": self.responder.should_offer_support(dominant_emotion, intensity)
        }

    def record_outcome(self, emotion: str, intensity: float, context: str,
                       was_resolved: bool, how_helped: str = ""):
        """Record the outcome of an emotional interaction"""
        self.tracker.record_emotion(emotion, intensity, context, was_resolved, how_helped)

    def get_emotional_memory_summary(self) -> str:
        """Get a summary of emotional memories for context"""
        patterns = self.tracker.get_patterns_summary()
        recent = self.tracker.recent_emotions[-5:]

        if recent:
            recent_summary = f"Recent emotions: {', '.join(e.emotion for e in recent)}"
            return f"{patterns}. {recent_summary}"

        return patterns


# Singleton
_emotional_intelligence = None


def get_emotional_intelligence() -> EmotionalIntelligence:
    """Get the global emotional intelligence system"""
    global _emotional_intelligence
    if _emotional_intelligence is None:
        _emotional_intelligence = EmotionalIntelligence()
    return _emotional_intelligence
