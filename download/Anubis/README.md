# 🧠 Autonomous Hierarchical Agent System

## A Self-Managing AI Agent with Deep Reasoning, Research, Planning & Agent Spawning

This system creates a **Head Agent** that manages everything autonomously. It can:
- 🎯 Understand your goals through deep reasoning
- 🔍 Conduct deep research to find solutions
- 📋 Plan multi-step approaches
- 🤖 Spawn sub-agents for specific tasks
- 🔄 Loop back and self-improve until the goal is achieved
- 🛠️ Create tools and setups automatically
- 💬 Require minimal human interaction

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INPUT                                  │
│                    "Setup WhatsApp chat with AI"                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        HEAD AGENT (SUPERVISOR)                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Receives user request                                     │    │
│  │  • Analyzes what needs to be done                            │    │
│  │  • Creates execution plan                                    │    │
│  │  • Delegates to specialized sub-agents                       │    │
│  │  • Monitors progress and loops back if needed                │    │
│  │  • Decides when task is complete                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  RESEARCH AGENT   │   │   PLANNING AGENT  │   │    SPAWNER AGENT  │
│                   │   │                   │   │                   │
│ • Web search      │   │ • Create plans    │   │ • Create new      │
│ • Deep analysis   │   │ • Break down      │   │   agents          │
│ • Documentation   │   │   tasks           │   │ • Create tools    │
│ • Find solutions  │   │ • Prioritize      │   │ • Setup systems   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FEEDBACK & IMPROVEMENT LOOP                      │
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│   │ Evaluate │ -> │ Reflect  │ -> │ Improve  │ -> │ Retry    │      │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
│   Loop continues until Head Agent determines task is complete        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FINAL OUTPUT                                 │
│                  "Here's your WhatsApp AI setup..."                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Hardware
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 20GB free space
- **GPU**: Optional (NVIDIA with 8GB+ VRAM for faster inference)

### Software
- Python 3.10+
- Ollama
- Docker (optional, for some integrations)

---

## Quick Start

### 1. Install Ollama
```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Then pull the reasoning model
ollama pull deepseek-r1:14b      # Best for reasoning
ollama pull qwen2.5:14b          # General purpose
ollama pull llama3.2             # Fast and capable
```

### 2. Install Python Dependencies
```bash
pip install langgraph langchain-ollama langchain-community
pip install langgraph-supervisor gpt-researcher
pip install duckduckgo-search requests beautifulsoup4
pip install pydantic rich
```

### 3. Run the System
```bash
python main.py
```

---

## Project Structure

```
autonomous-agent-system/
├── main.py                 # Entry point
├── config.py               # Configuration
├── head_agent.py           # Supervisor/Head Agent
├── research_agent.py       # Deep Research Agent
├── planning_agent.py       # Planning Agent
├── spawner_agent.py        # Agent & Tool Creator
├── worker_agents.py        # Specialized workers
├── tools/
│   ├── web_tools.py        # Web browsing tools
│   ├── code_tools.py       # Code generation tools
│   ├── system_tools.py     # System setup tools
│   └── communication.py    # Communication tools
├── memory/
│   ├── conversation.py     # Conversation memory
│   └── knowledge.py        # Knowledge storage
├── utils/
│   ├── reflection.py       # Self-reflection utilities
│   └── evaluation.py       # Output evaluation
└── requirements.txt
```

---

## Configuration

Edit `config.py` to customize:

```python
# Model settings
HEAD_AGENT_MODEL = "deepseek-r1:14b"    # Main reasoning model
WORKER_AGENT_MODEL = "qwen2.5:14b"      # Worker model
FAST_MODEL = "llama3.2"                  # Quick tasks

# Behavior settings
MAX_ITERATIONS = 10          # Max improvement loops
REFLECTION_ENABLED = True    # Self-reflection
AUTO_SPAWN_AGENTS = True     # Create new agents

# Research settings
MAX_SEARCH_RESULTS = 10
DEEP_RESEARCH_ITERATIONS = 3
```

---

## Usage Examples

### Example 1: Setup WhatsApp AI Chat
```
You: I want to chat with you on WhatsApp. Set it up for me.

Head Agent: I'll research the best way to do this, plan the setup,
and create the integration for you.

[Researching WhatsApp API options...]
[Planning the setup...]
[Creating WhatsApp webhook...]
[Generating QR code for login...]

✅ Done! Scan this QR code with your WhatsApp:
[QR CODE]

Your AI assistant is now available on WhatsApp at +1-XXX-XXX-XXXX
```

### Example 2: Create a Custom Tool
```
You: Create a tool that monitors a website for changes and notifies me.

Head Agent: I'll create a website monitoring tool with notifications.

[Researching best approaches...]
[Creating monitoring agent...]
[Setting up notification system...]

✅ Done! Your website monitor is ready.
- Add websites: python monitor.py add <url>
- Start monitoring: python monitor.py start
- You'll receive notifications on Telegram
```

### Example 3: Build an n8n-like Workflow
```
You: Create an automation that saves email attachments to Google Drive.

Head Agent: I'll research the APIs, plan the workflow, and set it up.

[Creating workflow automation...]
[Setting up email monitoring...]
[Connecting to Google Drive...]

✅ Done! Your automation is running.
- Emails with attachments are automatically saved
- Check the dashboard at http://localhost:8080
```

---

## Key Features

### 🧠 Deep Reasoning
- Uses chain-of-thought prompting
- Multi-step problem decomposition
- Self-correction and refinement

### 🔍 Deep Research
- Multi-source web searching
- Documentation analysis
- Solution synthesis

### 📋 Intelligent Planning
- Task breakdown
- Dependency resolution
- Priority management

### 🤖 Dynamic Agent Spawning
- Create specialized agents on demand
- Agent-to-agent communication
- Automatic resource management

### 🔄 Self-Improvement Loop
- Output evaluation
- Reflection and learning
- Iterative refinement

---

## Troubleshooting

### Model too slow?
Use a smaller model:
```bash
ollama pull llama3.2
# Update config.py: HEAD_AGENT_MODEL = "llama3.2"
```

### Out of memory?
Reduce context size or use quantized models:
```bash
ollama pull qwen2.5:7b
```

### Web search not working?
Install additional dependencies:
```bash
pip install playwright
playwright install
```

---

## License

MIT License - Free to use and modify.
