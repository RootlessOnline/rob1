#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 JARVIS QUICK START
# ═══════════════════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🤖 JARVIS - LOCAL AI ASSISTANT${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Starting Ollama...${NC}"
    ollama serve &
    sleep 3
fi

# Check available models
echo -e "${CYAN}📦 Available models:${NC}"
ollama list

echo ""
echo -e "${GREEN}JARVIS is ready!${NC}"
echo ""
echo "Quick commands:"
echo "  jarvis chat 'Hello'     - Chat with JARVIS"
echo "  jarvis ask 'What time?' - Voice interaction"
echo "  jarvis status           - Check status"
echo ""
echo "WhatsApp Bridge:"
echo "  cd ~/jarvis-whatsapp && node index.js"
echo ""

# Interactive chat mode
if [ "$1" == "chat" ]; then
    shift
    if [ -z "$1" ]; then
        echo -e "${CYAN}Entering chat mode (type 'exit' to quit)${NC}"
        while true; do
            echo -n -e "${GREEN}You: ${NC}"
            read -r message
            if [ "$message" == "exit" ]; then break; fi
            
            response=$(curl -s http://localhost:11434/api/chat -d "{
                \"model\": \"llama3.2\",
                \"messages\": [
                    {\"role\": \"system\", \"content\": \"You are JARVIS. Be concise and helpful.\"},
                    {\"role\": \"user\", \"content\": \"$message\"}
                ],
                \"stream\": false
            }" | jq -r '.message.content')
            
            echo -e "${CYAN}JARVIS: ${NC}$response"
        done
    else
        response=$(curl -s http://localhost:11434/api/chat -d "{
            \"model\": \"llama3.2\",
            \"messages\": [
                {\"role\": \"system\", \"content\": \"You are JARVIS. Be concise and helpful.\"},
                {\"role\": \"user\", \"content\": \"$*\"}
            ],
            \"stream\": false
        }" | jq -r '.message.content')
        echo -e "${CYAN}JARVIS: ${NC}$response"
    fi
fi
