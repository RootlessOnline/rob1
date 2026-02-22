# 🤖 JARVIS - LOCAL AI ASSISTANT

Your personal, 100% local AI assistant inspired by Iron Man's JARVIS.
**Free. Private. Powerful.**

---

## 📋 SYSTEM REQUIREMENTS

- **OS:** Linux Mint 22.3 (or any Debian/Ubuntu-based distro)
- **CPU:** Multi-core processor (8+ cores recommended)
- **RAM:** 16GB minimum, 32GB recommended
- **GPU:** NVIDIA GPU with 8GB+ VRAM (for CUDA acceleration)
- **Storage:** 20GB+ free space

---

## 🚀 QUICK INSTALL

```bash
# 1. Download and run the installer
chmod +x install.sh
./install.sh

# 2. Restart your terminal
source ~/.bashrc

# 3. Start JARVIS
jarvis start
```

---

## 📱 WHATSAPP BRIDGE

Control JARVIS from your phone via WhatsApp:

```bash
# 1. Copy the WhatsApp bridge to your home directory
cp whatsapp-bridge.js ~/jarvis-whatsapp/index.js

# 2. Start the bridge
cd ~/jarvis-whatsapp
node index.js

# 3. Scan the QR code with WhatsApp (Settings > Linked Devices)
```

### WhatsApp Commands

| Command | Description |
|---------|-------------|
| `!help` | Show available commands |
| `!status` | Check JARVIS status |
| `!business <idea>` | Generate a business plan |
| `!research <topic>` | Deep research with reasoning |
| _Any message_ | Chat with JARVIS |

---

## 🎤 VOICE COMMANDS

```bash
# Voice input → Voice output
jarvis ask "What's the weather like?"

# Text chat
jarvis chat "Tell me a joke"

# Just speak text
jarvis say "Hello, Sir"

# Listen to microphone
jarvis listen
```

---

## 🧠 AI MODELS

| Model | Use Case | Size | Speed |
|-------|----------|------|-------|
| `llama3.2` | Fast chat, quick tasks | ~2GB | ⚡⚡⚡ |
| `deepseek-r1:14b` | Deep reasoning, research | ~9GB | ⚡ |

### Adding More Models

```bash
# List models
ollama list

# Pull new models
ollama pull mistral
ollama pull codellama
ollama pull llama3.1:70b  # Needs more RAM
```

---

## 🔧 CONFIGURATION

### Change Default Model

Edit `~/.local/bin/jarvis` and modify:

```bash
FAST_MODEL="llama3.2"
DEEP_MODEL="deepseek-r1:14b"
```

### Add Custom System Prompts

```bash
jarvis chat --system "You are a coding expert" "Help me with Python"
```

---

## 📁 FILE STRUCTURE

```
~/
├── .local/bin/jarvis        # JARVIS CLI
├── jarvis-whatsapp/         # WhatsApp bridge
│   ├── index.js
│   ├── session/            # WhatsApp auth
│   └── node_modules/
├── whisper.cpp/            # Speech-to-text
│   ├── main
│   └── models/
├── piper/                  # Text-to-speech
│   ├── piper
│   └── voices/
└── ollama models           # AI models
```

---

## 🐛 TROUBLESHOOTING

### Ollama not responding
```bash
# Check if running
pgrep ollama

# Start manually
ollama serve
```

### GPU not detected
```bash
# Check NVIDIA drivers
nvidia-smi

# Install drivers if needed
sudo apt install nvidia-driver-535
```

### whisper.cpp no sound
```bash
# Check audio devices
arecord -l

# Test recording
arecord -d 3 test.wav && aplay test.wav
```

### WhatsApp QR not scanning
```bash
# Clear session and try again
rm -rf ~/jarvis-whatsapp/session/*
cd ~/jarvis-whatsapp && node index.js
```

---

## 🔒 PRIVACY

JARVIS runs **100% locally** on your machine:
- ✅ No internet required (after initial setup)
- ✅ No data sent to external servers
- ✅ No accounts needed
- ✅ Complete privacy

---

## 📜 LICENSE

MIT License - Use freely, modify as needed.

---

## 🙏 CREDITS

- [Ollama](https://ollama.com/) - Local LLM runtime
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Speech-to-text
- [Piper](https://github.com/rhasspy/piper) - Text-to-speech
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp bridge
- [Meta Llama](https://llama.meta.com/) - AI models
