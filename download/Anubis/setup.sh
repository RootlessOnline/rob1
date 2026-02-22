#!/bin/bash

# Autonomous Hierarchical Agent System - Setup Script (macOS/Linux)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧠 AUTONOMOUS AGENT SYSTEM - SETUP 🧠                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Python version
echo "[1/7] Checking Python version..."
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | awk '{print $2}')
    major=$(echo $python_version | cut -d. -f1)
    minor=$(echo $python_version | cut -d. -f2)

    if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 10 ]); then
        echo "❌ Python 3.10+ is required. Found: $python_version"
        echo "   Install from: https://www.python.org/downloads/"
        exit 1
    fi
    echo "✅ Python $python_version"
else
    echo "❌ Python not found. Install from: https://www.python.org/downloads/"
    exit 1
fi

# Check if Ollama is installed
echo ""
echo "[2/7] Checking Ollama..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is installed"
else
    echo "❌ Ollama is not installed"
    echo ""
    echo "Install Ollama:"
    echo "  curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    echo "Then run this setup script again."
    exit 1
fi

# Check if Ollama is running
echo ""
echo "[3/7] Checking Ollama server..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama is not running. Starting it..."
    ollama serve &
    sleep 5
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama started"
    else
        echo "❌ Failed to start Ollama. Run manually: ollama serve"
        exit 1
    fi
fi

# Check for models
echo ""
echo "[4/7] Checking AI models..."
models=$(ollama list 2>/dev/null | grep -c "qwen\|deepseek\|llama" || true)
if [ "$models" -lt 1 ]; then
    echo "⚠️  No models found. Pulling recommended models..."
    echo "   This may take 10-30 minutes depending on your internet..."

    echo "   [1/2] Pulling qwen2.5:14b (main model ~9GB)..."
    ollama pull qwen2.5:14b

    echo "   [2/2] Pulling llama3.2 (fast model ~2GB)..."
    ollama pull llama3.2

    echo "✅ Models downloaded"
else
    echo "✅ Found $models model(s)"
fi

# Create virtual environment
echo ""
echo "[5/7] Creating virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment exists"
fi

# Activate and install dependencies
echo ""
echo "[6/7] Installing dependencies..."
source .venv/bin/activate
pip install --upgrade pip -q
pip install langchain langchain-ollama langchain-community duckduckgo-search requests beautifulsoup4 rich pydantic python-dotenv -q
echo "✅ Dependencies installed"

# Create directories
echo ""
echo "[7/7] Creating directories..."
mkdir -p spawned logs data
echo "✅ Directories created"

# Done
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SETUP COMPLETE ✅                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "TO START THE SYSTEM:"
echo ""
echo "  source .venv/bin/activate"
echo "  python main.py"
echo ""
echo "QUICK START (one command):"
echo ""
echo "  source .venv/bin/activate && python main.py"
echo ""
