"""
Configuration for the Autonomous Hierarchical Agent System
"""

import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class ModelConfig:
    """Model configuration settings"""
    # Main reasoning model (for Head Agent)
    HEAD_AGENT_MODEL: str = "deepseek-r1:latest"

    # Worker model (for sub-agents)
    WORKER_AGENT_MODEL: str = "qwen2.5:14b"

    # Fast model (for simple tasks)
    FAST_MODEL: str = "llama3.2"

    # Ollama base URL
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Temperature settings
    REASONING_TEMPERATURE: float = 0.1  # Low for reasoning
    CREATIVE_TEMPERATURE: float = 0.7   # Higher for creative tasks
    DEFAULT_TEMPERATURE: float = 0.3

    # Context window
    MAX_TOKENS: int = 8192


@dataclass
class BehaviorConfig:
    """Agent behavior configuration"""
    # Maximum improvement iterations
    MAX_ITERATIONS: int = 10

    # Enable self-reflection
    REFLECTION_ENABLED: bool = True

    # Automatically spawn new agents
    AUTO_SPAWN_AGENTS: bool = True

    # Maximum spawned agents
    MAX_SPAWNED_AGENTS: int = 5

    # Enable deep thinking
    DEEP_THINKING_ENABLED: bool = True

    # Timeout for operations (seconds)
    OPERATION_TIMEOUT: int = 300

    # Auto-save progress
    AUTO_SAVE_PROGRESS: bool = True

    # Progress save interval (seconds)
    SAVE_INTERVAL: int = 30


@dataclass
class ResearchConfig:
    """Research agent configuration"""
    # Maximum search results per query
    MAX_SEARCH_RESULTS: int = 10

    # Deep research iterations
    DEEP_RESEARCH_ITERATIONS: int = 3

    # Enable multiple search engines
    MULTI_SOURCE_SEARCH: bool = True

    # Cache search results
    CACHE_RESULTS: bool = True

    # Cache duration (seconds)
    CACHE_DURATION: int = 3600


@dataclass
class PlanningConfig:
    """Planning agent configuration"""
    # Maximum plan depth
    MAX_PLAN_DEPTH: int = 5

    # Enable parallel execution
    PARALLEL_EXECUTION: bool = True

    # Maximum parallel tasks
    MAX_PARALLEL_TASKS: int = 3

    # Retry failed tasks
    RETRY_FAILED_TASKS: bool = True

    # Maximum retries
    MAX_RETRIES: int = 3


@dataclass
class MemoryConfig:
    """Memory and knowledge configuration"""
    # Enable conversation memory
    CONVERSATION_MEMORY: bool = True

    # Maximum conversation turns
    MAX_CONVERSATION_TURNS: int = 50

    # Enable knowledge storage
    KNOWLEDGE_STORAGE: bool = True

    # Knowledge database path
    KNOWLEDGE_DB_PATH: str = "./data/knowledge.db"

    # Vector store for semantic search
    ENABLE_VECTOR_STORE: bool = True

    # Vector store path
    VECTOR_STORE_PATH: str = "./data/vectors"


@dataclass
class OutputConfig:
    """Output and display configuration"""
    # Verbose output
    VERBOSE: bool = True

    # Show agent thoughts
    SHOW_THOUGHTS: bool = True

    # Show agent planning
    SHOW_PLANNING: bool = True

    # Show research progress
    SHOW_RESEARCH: bool = True

    # Rich console output
    RICH_OUTPUT: bool = True

    # Log to file
    LOG_TO_FILE: bool = True

    # Log file path
    LOG_FILE: str = "./logs/agent.log"


@dataclass
class ToolsConfig:
    """Tools configuration"""
    # Enable web browsing
    WEB_BROWSING: bool = True

    # Enable code execution
    CODE_EXECUTION: bool = True

    # Enable file operations
    FILE_OPERATIONS: bool = True

    # Enable system commands
    SYSTEM_COMMANDS: bool = True

    # Sandbox code execution
    SANDBOX_CODE: bool = True

    # Allowed directories for file operations
    ALLOWED_DIRECTORIES: list = None

    def __post_init__(self):
        if self.ALLOWED_DIRECTORIES is None:
            self.ALLOWED_DIRECTORIES = [
                os.path.expanduser("~"),
                os.getcwd()
            ]


class Config:
    """Main configuration class"""

    # All configuration sections
    model = ModelConfig()
    behavior = BehaviorConfig()
    research = ResearchConfig()
    planning = PlanningConfig()
    memory = MemoryConfig()
    output = OutputConfig()
    tools = ToolsConfig()

    @classmethod
    def get_model_for_task(cls, task_type: str) -> str:
        """Get the appropriate model for a task type"""
        task_model_map = {
            "reasoning": cls.model.HEAD_AGENT_MODEL,
            "research": cls.model.WORKER_AGENT_MODEL,
            "planning": cls.model.HEAD_AGENT_MODEL,
            "creative": cls.model.WORKER_AGENT_MODEL,
            "code": cls.model.WORKER_AGENT_MODEL,
            "quick": cls.model.FAST_MODEL,
            "default": cls.model.WORKER_AGENT_MODEL
        }
        return task_model_map.get(task_type, task_model_map["default"])

    @classmethod
    def get_temperature_for_task(cls, task_type: str) -> float:
        """Get the appropriate temperature for a task type"""
        temp_map = {
            "reasoning": cls.model.REASONING_TEMPERATURE,
            "research": cls.model.DEFAULT_TEMPERATURE,
            "planning": cls.model.REASONING_TEMPERATURE,
            "creative": cls.model.CREATIVE_TEMPERATURE,
            "code": cls.model.DEFAULT_TEMPERATURE,
            "quick": cls.model.DEFAULT_TEMPERATURE,
            "default": cls.model.DEFAULT_TEMPERATURE
        }
        return temp_map.get(task_type, temp_map["default"])

    @classmethod
    def update(cls, section: str, key: str, value: any):
        """Update a configuration value"""
        section_obj = getattr(cls, section, None)
        if section_obj and hasattr(section_obj, key):
            setattr(section_obj, key, value)
            return True
        return False

    @classmethod
    def to_dict(cls) -> dict:
        """Convert configuration to dictionary"""
        return {
            "model": vars(cls.model),
            "behavior": vars(cls.behavior),
            "research": vars(cls.research),
            "planning": vars(cls.planning),
            "memory": vars(cls.memory),
            "output": vars(cls.output),
            "tools": vars(cls.tools)
        }

    @classmethod
    def load_from_file(cls, filepath: str):
        """Load configuration from file"""
        import json
        try:
            with open(filepath, 'r') as f:
                config_data = json.load(f)
            for section, values in config_data.items():
                for key, value in values.items():
                    cls.update(section, key, value)
        except FileNotFoundError:
            pass  # Use defaults


# System prompt templates
SYSTEM_PROMPTS = {
    "head_agent": """You are the Head Agent (Supervisor) of an autonomous AI system.
Your role is to:
1. Understand user requests deeply
2. Plan the best approach to achieve the goal
3. Delegate tasks to specialized sub-agents
4. Monitor progress and make adjustments
5. Loop back and improve if needed
6. Determine when the task is complete

You have access to these specialized agents:
- Research Agent: Deep research and web browsing
- Planning Agent: Task breakdown and planning
- Spawner Agent: Create new agents and tools
- Worker Agents: Execute specific tasks

Think step by step. Consider multiple approaches.
Always verify results before marking tasks complete.
Minimize human interaction - figure things out autonomously.""",

    "research_agent": """You are a Deep Research Agent.
Your role is to:
1. Search the web for information
2. Analyze and synthesize findings
3. Find the best solutions and approaches
4. Document your research thoroughly

Use multiple sources. Verify information.
Provide comprehensive, accurate research.""",

    "planning_agent": """You are a Planning Agent.
Your role is to:
1. Break down complex tasks into steps
2. Identify dependencies between tasks
3. Prioritize tasks optimally
4. Create executable plans

Think about edge cases. Plan for failures.
Make plans that can be executed autonomously.""",

    "spawner_agent": """You are a Spawner Agent.
Your role is to:
1. Create new specialized agents when needed
2. Build tools and integrations
3. Set up systems and workflows
4. Generate working code

Create minimal, efficient solutions.
Focus on reliability and ease of use.""",

    "reflection": """You are a reflection system.
Your role is to:
1. Evaluate the output and results
2. Identify what went wrong
3. Suggest improvements
4. Determine if the task is truly complete

Be critical but constructive.
Focus on actionable improvements."""
}


# Tool definitions for agents
AVAILABLE_TOOLS = {
    "web_search": {
        "description": "Search the web for information",
        "parameters": ["query"],
        "returns": "search results"
    },
    "browse_website": {
        "description": "Browse a specific website",
        "parameters": ["url"],
        "returns": "page content"
    },
    "execute_code": {
        "description": "Execute Python code",
        "parameters": ["code"],
        "returns": "execution result"
    },
    "create_file": {
        "description": "Create a new file",
        "parameters": ["path", "content"],
        "returns": "success status"
    },
    "read_file": {
        "description": "Read a file",
        "parameters": ["path"],
        "returns": "file content"
    },
    "run_command": {
        "description": "Run a system command",
        "parameters": ["command"],
        "returns": "command output"
    },
    "spawn_agent": {
        "description": "Create a new specialized agent",
        "parameters": ["agent_type", "task"],
        "returns": "agent instance"
    },
    "create_tool": {
        "description": "Create a new tool",
        "parameters": ["tool_name", "tool_code"],
        "returns": "tool instance"
    }
}
