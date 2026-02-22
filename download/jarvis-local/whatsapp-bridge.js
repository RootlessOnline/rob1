/**
 * 🤖 JARVIS WhatsApp Bridge
 * Control JARVIS from your phone via WhatsApp
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// JARVIS Configuration
const JARVIS_CONFIG = {
    ollamaUrl: 'http://localhost:11434',
    fastModel: 'llama3.2',      // Fast responses
    deepModel: 'deepseek-r1:14b', // Deep reasoning
    maxMessageLength: 4000,     // WhatsApp message limit
    prefix: '🤖 '              // JARVIS response prefix
};

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Split long messages into chunks
function chunkMessage(text, maxLength = 4000) {
    if (text.length <= maxLength) return [text];
    
    const chunks = [];
    const lines = text.split('\n');
    let current = '';
    
    for (const line of lines) {
        if ((current + '\n' + line).length > maxLength) {
            if (current) chunks.push(current);
            current = line;
        } else {
            current = current ? current + '\n' + line : line;
        }
    }
    if (current) chunks.push(current);
    
    return chunks.map((chunk, i, arr) => 
        arr.length > 1 ? `[${i + 1}/${arr.length}]\n${chunk}` : chunk
    );
}

// Chat with Ollama
async function chatWithOllama(message, model = JARVIS_CONFIG.fastModel, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    } else {
        messages.push({ 
            role: 'system', 
            content: 'You are JARVIS, the AI assistant from Iron Man. Be concise, helpful, and slightly witty. Address the user as "Sir" occasionally. Keep responses under 500 words unless asked for detailed explanations.'
        });
    }
    
    messages.push({ role: 'user', content: message });
    
    try {
        const response = await fetch(`${JARVIS_CONFIG.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false
            })
        });
        
        const data = await response.json();
        return data.message?.content || 'I apologize, Sir, but I could not process that request.';
    } catch (error) {
        return `Error: Could not connect to Ollama. Is it running? (${error.message})`;
    }
}

// Generate business plan
async function generateBusiness(idea) {
    const prompt = `Generate a complete business plan for: "${idea}"

Include:
1. **Business Name** (creative)
2. **Tagline** (catchy)
3. **Type** (service/product/SaaS/etc)
4. **Startup Cost** (realistic estimate)
5. **Revenue Model** (how it makes money)
6. **Target Market** (who are the customers)
7. **First Steps** (5 concrete actions)
8. **Tools Needed** (free/cheap tools to start)
9. **Time to Profit** (realistic estimate)
10. **Scale Potential** (growth opportunities)
11. **Risk Level** (low/medium/high)
12. **Estimated Monthly Revenue** (year 1 projection)

Keep it practical and actionable. Focus on low-cost, quick-start approaches.`;

    return await chatWithOllama(prompt, JARVIS_CONFIG.fastModel);
}

// Deep research with reasoning model
async function deepResearch(topic) {
    const prompt = `Conduct deep research and analysis on: "${topic}"

Provide:
1. **Overview** - What is this topic about?
2. **Key Insights** - Most important findings
3. **Opportunities** - Potential applications/benefits
4. **Challenges** - Obstacles and how to overcome them
5. **Action Plan** - Concrete next steps
6. **Resources** - Where to learn more

Think deeply and provide thorough analysis.`;

    return await chatWithOllama(prompt, JARVIS_CONFIG.deepModel, 
        'You are a brilliant researcher and analyst. Be thorough but practical. Think step by step.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

const commands = {
    '!status': async (msg) => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        return `🤖 *JARVIS STATUS*\n` +
               `━━━━━━━━━━━━━━━━\n` +
               `⏱️ Uptime: ${hours}h ${mins}m\n` +
               `🧠 Model: ${JARVIS_CONFIG.fastModel}\n` +
               `✅ All systems operational`;
    },
    
    '!help': async (msg) => {
        return `🤖 *JARVIS COMMANDS*\n` +
               `━━━━━━━━━━━━━━━━\n` +
               `💬 _Any message_ - Chat with JARVIS\n` +
               `📊 !business <idea> - Generate business plan\n` +
               `🔬 !research <topic> - Deep research\n` +
               `⚡ !status - Check status\n` +
               `❓ !help - Show this menu`;
    },
    
    '!business': async (msg, args) => {
        if (!args) return 'Please provide a business idea. Example: !business AI chatbot for restaurants';
        return await generateBusiness(args);
    },
    
    '!research': async (msg, args) => {
        if (!args) return 'Please provide a research topic. Example: !research cryptocurrency trends 2024';
        return '🔬 Conducting deep research... (this may take a moment)';
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
});

client.on('ready', () => {
    console.log('🤖 JARVIS WhatsApp Bridge is READY!');
    console.log('📱 Send messages to control JARVIS from your phone.\n');
    console.log('Commands: !help, !status, !business, !research');
    console.log('Or just chat normally!\n');
});

client.on('message', async (msg) => {
    // Ignore own messages (prevents loops)
    if (msg.fromMe) return;
    
    const text = msg.body.trim();
    const chat = await msg.getChat();
    
    // Log incoming message
    console.log(`📩 [${chat.name || msg.from}] ${text.substring(0, 50)}...`);
    
    // Check for JARVIS own messages (loop prevention)
    if (text.startsWith(JARVIS_CONFIG.prefix)) return;
    
    // Parse command
    const lowerText = text.toLowerCase();
    let response;
    
    try {
        // Command handling
        if (lowerText.startsWith('!status')) {
            response = await commands['!status'](msg);
        } 
        else if (lowerText.startsWith('!help')) {
            response = await commands['!help'](msg);
        }
        else if (lowerText.startsWith('!business ')) {
            const args = text.substring(10).trim();
            response = await commands['!business'](msg, args);
        }
        else if (lowerText.startsWith('!research ')) {
            const args = text.substring(10).trim();
            // Send immediate response
            await msg.reply(JARVIS_CONFIG.prefix + await commands['!research'](msg, args));
            // Then do research
            const result = await deepResearch(args);
            const chunks = chunkMessage(result);
            for (const chunk of chunks) {
                await msg.reply(JARVIS_CONFIG.prefix + chunk);
            }
            return;
        }
        else {
            // Regular chat
            response = await chatWithOllama(text);
        }
        
        // Send response(s)
        const chunks = chunkMessage(response);
        for (const chunk of chunks) {
            await msg.reply(JARVIS_CONFIG.prefix + chunk);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await msg.reply(JARVIS_CONFIG.prefix + 'I apologize, Sir, but an error occurred. Please try again.');
    }
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
});

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🤖 JARVIS WhatsApp Bridge Starting...\n');
client.initialize();
