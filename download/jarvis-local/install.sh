#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 JARVIS LOCAL INSTALLER
# For: AMD Ryzen 7 5800X | RTX 3060 12GB | 32GB RAM | Linux Mint 22.3
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🤖 JARVIS LOCAL INSTALLER"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check for NVIDIA GPU
check_gpu() {
    echo -e "${CYAN}📡 Checking GPU...${NC}"
    if command -v nvidia-smi &> /dev/null; then
        GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader)
        echo -e "${GREEN}✅ GPU Found: $GPU_INFO${NC}"
    else
        echo -e "${YELLOW}⚠️ nvidia-smi not found. Make sure NVIDIA drivers are installed.${NC}"
    fi
}

# Install Ollama
install_ollama() {
    echo ""
    echo -e "${CYAN}🧠 Installing Ollama...${NC}"
    
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}✅ Ollama already installed${NC}"
    else
        curl -fsSL https://ollama.com/install.sh | sh
        echo -e "${GREEN}✅ Ollama installed${NC}"
    fi
    
    # Start Ollama service
    echo -e "${CYAN}Starting Ollama service...${NC}"
    ollama serve &
    sleep 3
    
    # Pull models
    echo -e "${CYAN}📥 Pulling AI models (this may take a while)...${NC}"
    echo -e "${YELLOW}  - llama3.2 (fast, ~2GB)${NC}"
    ollama pull llama3.2
    
    echo -e "${YELLOW}  - deepseek-r1:14b (reasoning, ~9GB)${NC}"
    read -p "Install deepseek-r1:14b for deep reasoning? (y/n): " install_deep
    if [[ $install_deep == "y" || $install_deep == "Y" ]]; then
        ollama pull deepseek-r1:14b
    fi
    
    echo -e "${GREEN}✅ Ollama ready!${NC}"
}

# Install whisper.cpp (GPU accelerated)
install_whisper() {
    echo ""
    echo -e "${CYAN}🎤 Installing whisper.cpp (GPU accelerated)...${NC}"
    
    WHISPER_DIR="$HOME/whisper.cpp"
    
    if [ -d "$WHISPER_DIR" ]; then
        echo -e "${GREEN}✅ whisper.cpp already installed at $WHISPER_DIR${NC}"
    else
        cd "$HOME"
        git clone https://github.com/ggerganov/whisper.cpp.git
        cd whisper.cpp
        
        # Build with CUDA support for RTX 3060
        echo -e "${CYAN}Building with CUDA support for RTX 3060...${NC}"
        make clean
        WHISPER_CUDA=1 make -j$(nproc)
        
        # Download base model (good balance of speed/accuracy)
        echo -e "${CYAN}📥 Downloading whisper model...${NC}"
        bash ./models/download-ggml-model.sh base.en
        
        echo -e "${GREEN}✅ whisper.cpp installed with CUDA support${NC}"
    fi
    
    cd "$HOME"
}

# Install Piper TTS
install_piper() {
    echo ""
    echo -e "${CYAN}🔊 Installing Piper TTS...${NC}"
    
    PIPER_DIR="$HOME/piper"
    
    if [ -d "$PIPER_DIR" ]; then
        echo -e "${GREEN}✅ Piper already installed at $PIPER_DIR${NC}"
    else
        mkdir -p "$PIPER_DIR"
        cd "$PIPER_DIR"
        
        # Download Piper for Linux x64
        ARCHIVE="piper_linux_x86_64.tar.gz"
        wget -q "https://github.com/rhasspy/piper/releases/download/v1.2.0/$ARCHIVE"
        tar -xzf "$ARCHIVE"
        rm "$ARCHIVE"
        
        # Download a good English voice
        echo -e "${CYAN}📥 Downloading voice model...${NC}"
        mkdir -p voices
        cd voices
        wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
        wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
        
        echo -e "${GREEN}✅ Piper TTS installed${NC}"
    fi
    
    cd "$HOME"
}

# Setup WhatsApp Bridge
setup_whatsapp() {
    echo ""
    echo -e "${CYAN}📱 Setting up WhatsApp Bridge...${NC}"
    
    JARVIS_WA="$HOME/jarvis-whatsapp"
    
    if [ -d "$JARVIS_WA" ]; then
        echo -e "${GREEN}✅ WhatsApp bridge already exists at $JARVIS_WA${NC}"
    else
        mkdir -p "$JARVIS_WA"
        cd "$JARVIS_WA"
        
        # Initialize npm project
        npm init -y
        
        # Install dependencies
        npm install whatsapp-web.js qrcode-terminal
        
        echo -e "${GREEN}✅ WhatsApp bridge created${NC}"
    fi
    
    cd "$HOME"
}

# Install system dependencies
install_deps() {
    echo ""
    echo -e "${CYAN}📦 Installing system dependencies...${NC}"
    
    sudo apt update
    sudo apt install -y \
        build-essential \
        git \
        curl \
        wget \
        nodejs \
        npm \
        python3 \
        python3-pip \
        ffmpeg \
        espeak \
        libespeak1 \
        portaudio19-dev \
        libsndfile1 \
        chromium-browser \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        xdg-utils
        
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Create JARVIS CLI
create_jarvis_cli() {
    echo ""
    echo -e "${CYAN}🤖 Creating JARVIS CLI...${NC}"
    
    JARVIS_BIN="$HOME/.local/bin"
    mkdir -p "$JARVIS_BIN"
    
    cat > "$JARVIS_BIN/jarvis" << 'JARVIS_SCRIPT'
#!/bin/bash
# JARVIS CLI - Your Local AI Assistant

JARVIS_DIR="$HOME/jarvis-local"
WHISPER_DIR="$HOME/whisper.cpp"
PIPER_DIR="$HOME/piper"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Speak function
speak() {
    local text="$1"
    if [ -d "$PIPER_DIR" ]; then
        echo "$text" | "$PIPER_DIR/piper/piper" --model "$PIPER_DIR/voices/en_US-lessac-medium.onnx" --output_file /tmp/jarvis_say.wav
        aplay /tmp/jarvis_say.wav 2>/dev/null || paplay /tmp/jarvis_say.wav 2>/dev/null
    else
        espeak "$text" 2>/dev/null
    fi
}

# Listen function
listen() {
    if [ -d "$WHISPER_DIR" ]; then
        echo -e "${CYAN}🎤 Listening... (press Ctrl+C to stop)${NC}"
        arecord -f cd -t wav -r 16000 -c 1 /tmp/jarvis_input.wav -d 5 2>/dev/null
        "$WHISPER_DIR/main" -m "$WHISPER_DIR/models/ggml-base.en.bin" -f /tmp/jarvis_input.wav -ot 2>/dev/null | tail -1
    else
        echo "whisper.cpp not installed"
    fi
}

# Chat function
chat() {
    local message="$1"
    curl -s http://localhost:11434/api/chat -d '{
        "model": "llama3.2",
        "messages": [
            {"role": "system", "content": "You are JARVIS, the AI assistant from Iron Man. Be concise, helpful, slightly witty. Address the user as Sir."},
            {"role": "user", "content": "'"$message"'"}
        ],
        "stream": false
    }' | jq -r '.message.content'
}

case "$1" in
    "say")
        speak "$2"
        ;;
    "listen")
        listen
        ;;
    "ask")
        response=$(chat "$2")
        echo -e "${GREEN}🤖 JARVIS: $response${NC}"
        speak "$response"
        ;;
    "chat")
        shift
        response=$(chat "$*")
        echo -e "${GREEN}🤖 JARVIS: $response${NC}"
        ;;
    "status")
        echo -e "${CYAN}🤖 JARVIS Status:${NC}"
        echo "  Ollama: $(pgrep -x ollama > /dev/null && echo '✅ Running' || echo '❌ Not running')"
        echo "  GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'Not detected')"
        ;;
    "start")
        echo -e "${CYAN}🤖 Starting JARVIS services...${NC}"
        ollama serve &
        echo -e "${GREEN}✅ JARVIS started!${NC}"
        ;;
    *)
        echo "Usage: jarvis {start|status|say|listen|ask|chat}"
        echo ""
        echo "Commands:"
        echo "  start   - Start JARVIS services"
        echo "  status  - Check JARVIS status"
        echo "  say     - Speak text aloud"
        echo "  listen  - Listen to voice input"
        echo "  ask     - Voice question -> voice answer"
        echo "  chat    - Text chat with JARVIS"
        ;;
esac
JARVIS_SCRIPT

    chmod +x "$JARVIS_BIN/jarvis"
    
    # Add to PATH if not already
    if [[ ":$PATH:" != *":$JARVIS_BIN:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    
    echo -e "${GREEN}✅ JARVIS CLI created at $JARVIS_BIN/jarvis${NC}"
}

# Main installation
main() {
    echo ""
    echo "This will install:"
    echo "  • System dependencies"
    echo "  • Ollama (AI brain) with llama3.2"
    echo "  • whisper.cpp (speech-to-text, GPU accelerated)"
    echo "  • Piper TTS (text-to-speech)"
    echo "  • WhatsApp bridge"
    echo "  • JARVIS CLI"
    echo ""
    read -p "Continue? (y/n): " confirm
    
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    check_gpu
    install_deps
    install_ollama
    install_whisper
    install_piper
    setup_whatsapp
    create_jarvis_cli
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ JARVIS INSTALLATION COMPLETE!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Quick Start:"
    echo "  jarvis start          # Start JARVIS services"
    echo "  jarvis chat hello     # Chat with JARVIS"
    echo "  jarvis ask 'What time is it?'  # Voice interaction"
    echo ""
    echo "For WhatsApp bridge, run:"
    echo "  cd ~/jarvis-whatsapp && node index.js"
    echo ""
    echo "Restart your terminal to use the 'jarvis' command."
}

main
