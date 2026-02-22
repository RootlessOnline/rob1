#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 ROB + JARVIS FULL INSTALLER
# Complete setup: Web UI + AI Brain + Voice + WhatsApp
# For: AMD Ryzen 7 5800X | RTX 3060 12GB | 32GB RAM | Linux Mint 22.3
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🤖 ROB + JARVIS FULL INSTALLER                                  ║${NC}"
echo -e "${CYAN}║  Complete Local AI Assistant with Web UI                         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect system
detect_system() {
    echo -e "${CYAN}🔍 Detecting system...${NC}"
    CPU=$(lscpu | grep "Model name" | head -1 | cut -d: -f2 | xargs)
    RAM=$(free -h | grep Mem | awk '{print $2}')
    
    if command -v nvidia-smi &> /dev/null; then
        GPU=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "NVIDIA GPU")
        echo -e "${GREEN}  ✅ GPU: $GPU${NC}"
    else
        echo -e "${YELLOW}  ⚠️ No NVIDIA GPU detected (CPU mode will be used)${NC}"
    fi
    
    echo -e "${GREEN}  ✅ CPU: $CPU${NC}"
    echo -e "${GREEN}  ✅ RAM: $RAM${NC}"
    echo ""
}

# Install system dependencies
install_system_deps() {
    echo -e "${CYAN}📦 Checking system dependencies...${NC}"
    
    # Most packages are likely already installed, install missing ones individually
    local packages="build-essential git curl wget python3 python3-pip ffmpeg espeak libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libcups2t64 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0t64 libnspr4 libnss3 libxcomposite1 libxdamage1 libxrandr2 xdg-utils fonts-liberation"
    
    for pkg in $packages; do
        if ! dpkg -l | grep -q "^ii  $pkg"; then
            echo "  Installing $pkg..."
            sudo apt install -y $pkg 2>/dev/null || true
        fi
    done
    
    # Install Bun (faster than npm)
    if ! command -v bun &> /dev/null; then
        echo -e "${CYAN}  Installing Bun...${NC}"
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
    fi
    
    echo -e "${GREEN}✅ System dependencies ready${NC}"
    echo ""
}

# Install Ollama
install_ollama() {
    echo -e "${CYAN}🧠 Setting up Ollama (AI Brain)...${NC}"
    
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}  ✅ Ollama already installed${NC}"
    else
        curl -fsSL https://ollama.com/install.sh | sh
        echo -e "${GREEN}  ✅ Ollama installed${NC}"
    fi
    
    # Start Ollama in background
    echo -e "${CYAN}  Starting Ollama service...${NC}"
    ollama serve &
    sleep 5
    
    # Pull models
    echo -e "${CYAN}  📥 Pulling AI models...${NC}"
    echo -e "${YELLOW}    - llama3.2 (fast chat, ~2GB)${NC}"
    ollama pull llama3.2 || echo "Model may already exist"
    
    echo ""
    read -p "Install deepseek-r1:14b for deep reasoning? (~9GB) [y/N]: " deep
    if [[ "$deep" == "y" || "$deep" == "Y" ]]; then
        ollama pull deepseek-r1:14b
    fi
    
    echo -e "${GREEN}✅ Ollama ready!${NC}"
    echo ""
}

# Install whisper.cpp for voice
install_whisper() {
    echo -e "${CYAN}🎤 Setting up whisper.cpp (Voice Input)...${NC}"
    
    WHISPER_DIR="$HOME/whisper.cpp"
    
    if [ -d "$WHISPER_DIR" ]; then
        echo -e "${GREEN}  ✅ whisper.cpp already installed${NC}"
    else
        cd "$HOME"
        git clone https://github.com/ggerganov/whisper.cpp.git
        cd whisper.cpp
        
        # Build with CUDA if available
        if command -v nvidia-smi &> /dev/null; then
            echo -e "${CYAN}  Building with CUDA support...${NC}"
            WHISPER_CUDA=1 make -j$(nproc)
        else
            echo -e "${CYAN}  Building (CPU mode)...${NC}"
            make -j$(nproc)
        fi
        
        # Download model
        bash ./models/download-ggml-model.sh base.en
        
        echo -e "${GREEN}✅ whisper.cpp installed${NC}"
    fi
    
    cd "$HOME"
    echo ""
}

# Install Piper TTS
install_piper() {
    echo -e "${CYAN}🔊 Setting up Piper TTS (Voice Output)...${NC}"
    
    PIPER_DIR="$HOME/piper"
    
    if [ -d "$PIPER_DIR" ]; then
        echo -e "${GREEN}  ✅ Piper already installed${NC}"
    else
        mkdir -p "$PIPER_DIR"
        cd "$PIPER_DIR"
        
        # Download Piper
        wget -q "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_linux_x86_64.tar.gz"
        tar -xzf piper_linux_x86_64.tar.gz
        rm piper_linux_x86_64.tar.gz
        
        # Download voice
        mkdir -p voices
        cd voices
        wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
        wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
        
        echo -e "${GREEN}✅ Piper TTS installed${NC}"
    fi
    
    cd "$HOME"
    echo ""
}

# Setup ROB web application
setup_rob_web() {
    echo -e "${CYAN}🌐 Setting up ROB Web Application...${NC}"
    
    ROB_DIR="$HOME/rob1"
    
    if [ -d "$ROB_DIR" ]; then
        echo -e "${GREEN}  ✅ ROB already cloned at $ROB_DIR${NC}"
    else
        cd "$HOME"
        git clone https://github.com/RootlessOnline/rob1.git
    fi
    
    cd "$ROB_DIR"
    
    # Install dependencies
    echo -e "${CYAN}  Installing dependencies...${NC}"
    if command -v bun &> /dev/null; then
        bun install
    else
        npm install
    fi
    
    echo -e "${GREEN}✅ ROB Web ready!${NC}"
    echo ""
}

# Setup WhatsApp bridge
setup_whatsapp() {
    echo -e "${CYAN}📱 Setting up WhatsApp Bridge...${NC}"
    
    WA_DIR="$HOME/jarvis-whatsapp"
    
    if [ -d "$WA_DIR" ]; then
        echo -e "${GREEN}  ✅ WhatsApp bridge exists${NC}"
    else
        mkdir -p "$WA_DIR"
        cd "$WA_DIR"
        npm init -y
        npm install whatsapp-web.js qrcode-terminal
    fi
    
    # Copy the bridge script
    if [ -f "$HOME/rob1/download/jarvis-local/whatsapp-bridge.js" ]; then
        cp "$HOME/rob1/download/jarvis-local/whatsapp-bridge.js" "$WA_DIR/index.js"
    fi
    
    echo -e "${GREEN}✅ WhatsApp bridge ready!${NC}"
    echo ""
}

# Create JARVIS CLI
create_cli() {
    echo -e "${CYAN}🤖 Creating JARVIS CLI...${NC}"
    
    mkdir -p "$HOME/.local/bin"
    
    cat > "$HOME/.local/bin/jarvis" << 'JARVIS_CLI'
#!/bin/bash

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

speak() {
    local text="$1"
    if [ -f "$HOME/piper/piper/piper" ]; then
        echo "$text" | "$HOME/piper/piper/piper" --model "$HOME/piper/voices/en_US-lessac-medium.onnx" --output_file /tmp/jarvis_say.wav 2>/dev/null
        aplay /tmp/jarvis_say.wav 2>/dev/null || paplay /tmp/jarvis_say.wav 2>/dev/null
    else
        espeak "$text" 2>/dev/null
    fi
}

chat() {
    local msg="$1"
    curl -s http://localhost:11434/api/chat -d "{
        \"model\": \"llama3.2\",
        \"messages\": [
            {\"role\": \"system\", \"content\": \"You are JARVIS. Be concise and helpful.\"},
            {\"role\": \"user\", \"content\": \"$msg\"}
        ],
        \"stream\": false
    }" | jq -r '.message.content'
}

case "$1" in
    start)
        echo -e "${CYAN}🤖 Starting JARVIS...${NC}"
        ollama serve &
        sleep 2
        echo -e "${GREEN}✅ JARVIS online!${NC}"
        ;;
    stop)
        pkill -f "ollama serve"
        echo -e "${GREEN}✅ JARVIS stopped${NC}"
        ;;
    chat)
        shift
        response=$(chat "$*")
        echo -e "${CYAN}JARVIS: ${NC}$response"
        ;;
    say)
        shift
        speak "$*"
        ;;
    ask)
        shift
        response=$(chat "$*")
        echo -e "${CYAN}JARVIS: ${NC}$response"
        speak "$response"
        ;;
    web)
        cd ~/rob1
        if command -v bun &> /dev/null; then
            bun run dev
        else
            npm run dev
        fi
        ;;
    whatsapp)
        cd ~/jarvis-whatsapp && node index.js
        ;;
    status)
        echo -e "${CYAN}🤖 JARVIS Status:${NC}"
        pgrep -x ollama > /dev/null && echo "  ✅ Ollama: Running" || echo "  ❌ Ollama: Stopped"
        echo "  📦 Models: $(ollama list 2>/dev/null | tail -n +2 | wc -l)"
        ;;
    *)
        echo "🤖 JARVIS CLI Commands:"
        echo "  jarvis start      - Start JARVIS services"
        echo "  jarvis stop       - Stop JARVIS"
        echo "  jarvis status     - Check status"
        echo "  jarvis chat <msg> - Chat with JARVIS"
        echo "  jarvis ask <msg>  - Voice chat"
        echo "  jarvis say <text> - Speak text"
        echo "  jarvis web        - Start web UI"
        echo "  jarvis whatsapp   - Start WhatsApp bridge"
        ;;
esac
JARVIS_CLI

    chmod +x "$HOME/.local/bin/jarvis"
    
    # Add to PATH
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    
    echo -e "${GREEN}✅ JARVIS CLI installed${NC}"
    echo ""
}

# Create startup script
create_startup() {
    echo -e "${CYAN}📝 Creating startup scripts...${NC}"
    
    # All-in-one start script
    cat > "$HOME/start-rob.sh" << 'START_SCRIPT'
#!/bin/bash
echo "🤖 Starting ROB + JARVIS..."

# Start Ollama
pgrep -x ollama > /dev/null || ollama serve &
sleep 2

# Start Web UI
cd ~/rob1
gnome-terminal --title="ROB Web" -- bash -c "bun run dev; exec bash" 2>/dev/null || \
xterm -T "ROB Web" -e "bun run dev; bash" 2>/dev/null || \
konsole -e "bun run dev; bash" 2>/dev/null || \
bun run dev &

sleep 3
echo ""
echo "✅ ROB is running!"
echo ""
echo "🌐 Web UI:    http://localhost:3000"
echo "🤖 JARVIS:    http://localhost:3000/jarvis"
echo "🧠 Ollama:    http://localhost:11434"
echo ""
echo "WhatsApp: jarvis whatsapp"
echo "Chat:     jarvis chat 'hello'"
START_SCRIPT

    chmod +x "$HOME/start-rob.sh"
    
    echo -e "${GREEN}✅ Startup scripts created${NC}"
    echo ""
}

# Main
main() {
    echo "This will install:"
    echo "  🧠 Ollama (AI Brain) + llama3.2 model"
    echo "  🎤 whisper.cpp (Voice Input)"
    echo "  🔊 Piper TTS (Voice Output)"
    echo "  🌐 ROB Web Application (Next.js)"
    echo "  📱 WhatsApp Bridge"
    echo "  🤖 JARVIS CLI"
    echo ""
    read -p "Continue with full installation? [y/N]: " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    detect_system
    install_system_deps
    install_ollama
    install_whisper
    install_piper
    setup_rob_web
    setup_whatsapp
    create_cli
    create_startup
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ROB + JARVIS INSTALLATION COMPLETE!                          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🚀 Quick Start:${NC}"
    echo "   ~/start-rob.sh              - Start everything"
    echo ""
    echo -e "${CYAN}🤖 JARVIS CLI:${NC}"
    echo "   jarvis start                - Start services"
    echo "   jarvis chat 'hello'         - Chat with JARVIS"
    echo "   jarvis web                  - Start web UI"
    echo "   jarvis whatsapp             - Start WhatsApp bridge"
    echo ""
    echo -e "${CYAN}🌐 Web URLs:${NC}"
    echo "   http://localhost:3000       - ROB (Anubis/Sefirot)"
    echo "   http://localhost:3000/jarvis - JARVIS Dashboard"
    echo ""
    echo -e "${YELLOW}⚠️  Restart your terminal first: source ~/.bashrc${NC}"
    echo ""
}

main
