"""
Skills Discovery Module

Allows LA to discover and use existing skills from the skills directory.
LA can also create new skills on the fly for unknown platforms.
"""

import os
import json
import re
import importlib.util
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class Skill:
    """A skill that LA can use"""
    name: str
    description: str
    skill_path: str
    skill_type: str  # 'existing', 'created', 'learned'
    capabilities: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "skill_path": self.skill_path,
            "skill_type": self.skill_type,
            "capabilities": self.capabilities,
            "created_at": self.created_at
        }


class SkillsDiscovery:
    """
    Discovers and manages skills for LA
    """

    def __init__(self, skills_dir: str = None):
        self.skills_dir = skills_dir or os.path.expanduser("~/my-project/skills")
        self.discovered_skills: Dict[str, Skill] = {}
        self._discover_all()

    def _discover_all(self):
        """Discover all available skills"""
        if not os.path.exists(self.skills_dir):
            print(f"   Skills directory not found: {self.skills_dir}")
            return

        for item in os.listdir(self.skills_dir):
            skill_path = os.path.join(self.skills_dir, item)
            if os.path.isdir(skill_path):
                self._discover_skill(skill_path)

    def _discover_skill(self, skill_path: str):
        """Discover a single skill from its directory"""
        skill_name = os.path.basename(skill_path)
        skill_md = os.path.join(skill_path, "SKILL.md")

        if not os.path.exists(skill_md):
            return

        try:
            with open(skill_md, 'r') as f:
                content = f.read()

            # Parse frontmatter
            description = ""
            capabilities = []

            # Extract description from frontmatter
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    for line in frontmatter.split("\n"):
                        if line.startswith("description:"):
                            description = line.split(":", 1)[1].strip()
                        if line.startswith("name:"):
                            skill_name = line.split(":", 1)[1].strip()

            # Extract capabilities from content
            capability_keywords = [
                "telegram", "discord", "whatsapp", "slack", "messenger",
                "chat", "message", "send", "receive", "bot",
                "api", "integration", "webhook", "oauth",
                "search", "research", "analyze", "create", "generate",
                "image", "video", "audio", "text", "document",
                "pdf", "docx", "xlsx", "pptx"
            ]

            content_lower = content.lower()
            for keyword in capability_keywords:
                if keyword in content_lower:
                    capabilities.append(keyword)

            skill = Skill(
                name=skill_name,
                description=description,
                skill_path=skill_path,
                skill_type="existing",
                capabilities=list(set(capabilities))
            )

            self.discovered_skills[skill_name] = skill
            print(f"   📚 Discovered skill: {skill_name}")

        except Exception as e:
            print(f"   Error discovering skill {skill_name}: {e}")

    def find_for_platform(self, platform: str) -> List[Skill]:
        """Find skills relevant to a specific platform"""
        platform_lower = platform.lower()
        relevant = []

        for skill in self.discovered_skills.values():
            # Check name
            if platform_lower in skill.name.lower():
                relevant.append(skill)
                continue

            # Check description
            if platform_lower in skill.description.lower():
                relevant.append(skill)
                continue

            # Check capabilities
            if platform_lower in skill.capabilities:
                relevant.append(skill)
                continue

        return relevant

    def find_for_task(self, task: str) -> List[Skill]:
        """Find skills relevant to a task description"""
        task_lower = task.lower()
        task_words = set(task_lower.split())
        relevant = []

        for skill in self.discovered_skills.values():
            score = 0

            # Check name match
            skill_words = set(skill.name.lower().replace("-", " ").split())
            common = task_words & skill_words
            score += len(common) * 3

            # Check capabilities match
            for cap in skill.capabilities:
                if cap in task_lower:
                    score += 2

            # Check description
            desc_words = set(skill.description.lower().split())
            common = task_words & desc_words
            score += len(common)

            if score > 0:
                relevant.append((skill, score))

        # Sort by score
        relevant.sort(key=lambda x: x[1], reverse=True)
        return [s[0] for s in relevant]

    def get_skill_instructions(self, skill_name: str) -> Optional[str]:
        """Get the instructions for a skill"""
        skill = self.discovered_skills.get(skill_name)
        if not skill:
            return None

        skill_md = os.path.join(skill.skill_path, "SKILL.md")
        if os.path.exists(skill_md):
            with open(skill_md, 'r') as f:
                return f.read()

        return None

    def list_all(self) -> List[Skill]:
        """List all discovered skills"""
        return list(self.discovered_skills.values())

    def has_skill_for(self, platform: str) -> bool:
        """Check if a skill exists for a platform"""
        return len(self.find_for_platform(platform)) > 0


class SkillCreator:
    """
    Creates new skills for LA when needed
    """

    def __init__(self, skills_dir: str = None):
        self.skills_dir = skills_dir or os.path.expanduser("~/my-project/skills")
        os.makedirs(self.skills_dir, exist_ok=True)

    def create_skill_for_platform(self, platform: str, purpose: str,
                                    research: str = None,
                                    code: str = None) -> Skill:
        """Create a new skill for a platform"""
        skill_name = f"{platform.lower().replace(' ', '-')}-integration"
        skill_path = os.path.join(self.skills_dir, skill_name)
        os.makedirs(skill_path, exist_ok=True)

        # Create SKILL.md
        skill_content = f"""---
name: {skill_name}
description: Integration with {platform} for {purpose}. This skill enables LA to connect to {platform}, send and receive messages, and interact with users.
license: MIT
---

# {platform.title()} Integration Skill

This skill provides integration with {platform} for the Local AI (LA).

## Overview

{purpose}

## Setup Instructions

1. **Authentication**: Follow the platform-specific authentication process
2. **Configuration**: Set up required API keys or tokens
3. **Usage**: Use the provided functions to interact with {platform}

## Available Functions

### Send Message
```python
def send_message(recipient: str, message: str) -> dict:
    \"\"\"Send a message to a recipient on {platform}\"\"\"
    pass
```

### Receive Messages
```python
def get_messages() -> list:
    \"\"\"Get incoming messages from {platform}\"\"\"
    pass
```

## Generated Code

```python
{code or '# Implementation code goes here'}
```

## Research Context

{research or 'No research context available'}

## Created

{datetime.now().isoformat()}
"""

        skill_md_path = os.path.join(skill_path, "SKILL.md")
        with open(skill_md_path, 'w') as f:
            f.write(skill_content)

        # Create implementation file if code provided
        if code:
            impl_path = os.path.join(skill_path, f"{skill_name}.py")
            with open(impl_path, 'w') as f:
                f.write(code)

        skill = Skill(
            name=skill_name,
            description=f"Integration with {platform} for {purpose}",
            skill_path=skill_path,
            skill_type="created",
            capabilities=[platform.lower(), "integration", "messaging"]
        )

        print(f"   ✨ Created new skill: {skill_name}")
        return skill


# Integration with the main LA system
class IntegratedSkillsManager:
    """
    Main skills manager that integrates discovery and creation
    """

    def __init__(self, skills_dir: str = None):
        self.discovery = SkillsDiscovery(skills_dir)
        self.creator = SkillCreator(skills_dir)

    def get_or_create_for_platform(self, platform: str, purpose: str,
                                     research_func=None) -> tuple:
        """
        Get existing skill or create new one for a platform.
        Returns (skill, is_new, instructions)
        """
        # Check for existing skill
        existing = self.discovery.find_for_platform(platform)

        if existing:
            skill = existing[0]
            instructions = self.discovery.get_skill_instructions(skill.name)
            return skill, False, instructions

        # Need to create new skill
        research = None
        if research_func:
            print(f"   🔍 Researching {platform} integration...")
            research = research_func(f"How to integrate with {platform} API in Python, "
                                     f"including authentication, sending messages, receiving messages")

        # Create the skill
        skill = self.creator.create_skill_for_platform(
            platform=platform,
            purpose=purpose,
            research=research
        )

        # Refresh discovery
        self.discovery._discover_skill(skill.skill_path)

        return skill, True, None

    def list_available_skills(self) -> List[Dict]:
        """List all available skills as dictionaries"""
        return [s.to_dict() for s in self.discovery.list_all()]


def get_skills_manager() -> IntegratedSkillsManager:
    """Get the global skills manager"""
    return IntegratedSkillsManager()
