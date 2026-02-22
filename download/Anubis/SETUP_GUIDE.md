# 🧠 AUTONOMOUS AI AGENT SYSTEM - COMPLETE SETUP GUIDE

## Overview

This guide will take you from zero to a fully working autonomous AI agent system on your PC.

**What you'll have at the end:**
- A Head Agent that manages everything
- Deep research capabilities (web search & browsing)
- Smart planning and task breakdown
- Ability to create new agents and tools automatically
- Self-improving loops until task completion

---

## 📋 PREREQUISITES CHECK

Before starting, ensure you have:

| Requirement | Check Command | Minimum |
|-------------|---------------|---------|
| RAM | - | 16 GB (32 GB recommended) |
| Storage | - | 20 GB free |
| Python 3.10+ | `python3 --version` | 3.10 |
| Git | `git --version` | Any version |

---

## STEP 1: DOWNLOAD THE FILES

### Option A: Download ZIP (Recommended)

1. Download `autonomous-agent-system.zip` from:
   ```
   /home/z/my-project/download/autonomous-agent-system.zip
   ```

2. Save it to a folder like `C:\AI\` (Windows) or `~/ai/` (Mac/Linux)

3. Extract the ZIP file

### Option B: Create Files Manually

Create a folder called `autonomous-agent-system` and copy each file from:
```
/home/z/my-project/download/autonomous-agent-system/
```

---

## STEP 2: INSTALL OLLAMA

Ollama runs the AI models locally on your computer.

### Windows

1. Go to: https://ollama.com/download
2. Download the Windows installer
3. Run the installer
4. Open PowerShell and verify:
   ```powershell
   ollama --version
   ```

### macOS

1. Open Terminal
2. Run:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   Or download from: https://ollama.com/download

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## STEP 3: DOWNLOAD AI MODELS

Open your terminal/command prompt and run:

```bash
# Main reasoning model (best for planning) - ~9 GB
ollama pull qwen2.5:14b

# Deep reasoning model - ~5 GB
ollama pull deepseek-r1

# Fast model for simple tasks - ~2 GB
ollama pull llama3.2
```

**Note:** This will take time (10-30 minutes depending on internet speed)

Verify models are installed:
```bash
ollama list
```

You should see something like:
```
qwen2.5:14b     latest    9 GB
deepseek-r1     latest    5 GB
llama3.2        latest    2 GB
```

---

## STEP 4: VERIFY OLLAMA IS RUNNING

```bash
# Check if Ollama is responding
ollama run qwen2.5:14b
```

Type a test message like "Hello" and you should get a response.

Press `Ctrl+D` or type `/bye` to exit.

---

## STEP 5: SETUP PYTHON ENVIRONMENT

### Windows (PowerShell)

```powershell
# Navigate to the folder
cd C:\path\to\autonomous-agent-system

# Create virtual environment
python -m venv .venv

# Activate it
.\.venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### macOS/Linux

```bash
# Navigate to the folder
cd ~/path/to/autonomous-agent-system

# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

---

## STEP 6: INSTALL ADDITIONAL WEB TOOLS (Optional but Recommended)

For web browsing capabilities:

```bash
# Install DuckDuckGo search
pip install duckduckgo-search

# Install web scraping tools
pip install requests beautifulsoup4

# Install Playwright for browser automation (optional)
pip install playwright
playwright install chromium
```

---

## STEP 7: TEST THE SYSTEM

```bash
# Make sure virtual environment is activated
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

# Run the system
python main.py
```

You should see:
```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║     🧠 AUTONOMOUS HIERARCHICAL AGENT SYSTEM 🧠                       ║
║                                                                       ║
║     Just tell me what you want to achieve, and I'll figure it out.   ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

Initializing Head Agent...
✓ Head Agent initialized

Ready! Tell me what you want to achieve.

You:
```

---

## STEP 8: TEST WITH A SIMPLE REQUEST

Try this:

```
You: What is the capital of France? Search the web for the answer.
```

The agent should:
1. Analyze your request
2. Search the web
3. Return the answer

---

## TROUBLESHOOTING

### Problem: "ollama: command not found"

**Solution:**
- Make sure Ollama is installed
- Restart your terminal
- On Windows, make sure it's in your PATH

### Problem: "Connection refused" or "Ollama not running"

**Solution:**
```bash
# Start Ollama server
ollama serve
```

In a new terminal window, try again.

### Problem: "Model not found"

**Solution:**
```bash
# Pull the model
ollama pull qwen2.5:14b
```

### Problem: "Out of memory"

**Solution:**
- Use smaller models: `ollama pull llama3.2`
- Edit `config.py`:
  ```python
  HEAD_AGENT_MODEL = "llama3.2"
  WORKER_AGENT_MODEL = "llama3.2"
  ```

### Problem: "pip install fails"

**Solution:**
```bash
# Try with specific versions
pip install langchain==0.3.0 langchain-ollama==0.2.0 langchain-community==0.3.0
```

### Problem: Python version too old

**Solution:**
- Install Python 3.10+ from https://www.python.org/downloads/
- Use `python3` instead of `python` on Mac/Linux

---

## QUICK START COMMANDS (Copy-Paste)

### Windows (run in PowerShell as Administrator):
```powershell
# One-liner setup (run after downloading and extracting)
cd autonomous-agent-system; python -m venv .venv; .\.venv\Scripts\activate; pip install --upgrade pip; pip install langchain langchain-ollama langchain-community duckduckgo-search requests beautifulsoup4 rich; python main.py
```

### macOS/Linux:
```bash
# One-liner setup (run after downloading and extracting)
cd autonomous-agent-system && python3 -m venv .venv && source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && python main.py
```

---

## NEXT STEPS

Once you have the system running:

1. ✅ Test with simple questions
2. ⬜ Test research capabilities
3. ⬜ Test planning capabilities
4. ⬜ Test WhatsApp integration (next guide)
5. ⬜ Customize for your needs

---

## FILE STRUCTURE REFERENCE

```
autonomous-agent-system/
│
├── main.py              # Run this to start
├── config.py            # Edit to customize
├── head_agent.py        # The boss agent
├── research_agent.py    # Research capabilities
├── planning_agent.py    # Task planning
├── spawner_agent.py     # Creates agents/tools
├── requirements.txt     # Dependencies list
├── setup.sh             # Auto-setup (Mac/Linux)
├── README.md            # Documentation
│
└── tools/
    └── web_tools.py     # Web browsing tools
```

---

## SYSTEM REQUIREMENTS SUMMARY

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 20 GB | 50 GB |
| **GPU** | None | NVIDIA 8GB+ VRAM |
| **Python** | 3.10 | 3.11+ |
| **Internet** | Required for model download | - |

---

## NEED HELP?

If you run into any errors:

1. **Copy the full error message**
2. **Tell me what step you're on**
3. **Include your system info:**
   - Windows/Mac/Linux?
   - Python version (`python --version`)
   - RAM available

I'll help you fix it step by step!

---

*Last updated: 2025*
