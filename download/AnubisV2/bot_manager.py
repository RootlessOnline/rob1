"""
Bot Manager - Runs platform bots as background services

This allows Anubis to:
1. Start a Telegram/Discord/WhatsApp bot
2. Keep it running in the background
3. Auto-restart on system boot
4. Receive and respond to messages 24/7
"""

import os
import sys
import json
import time
import asyncio
import subprocess
import threading
import signal
from typing import Dict, Optional, Callable
from datetime import datetime
from pathlib import Path

from persistence import get_memory


class BotProcess:
    """A running bot process"""

    def __init__(self, platform: str, script_path: str):
        self.platform = platform
        self.script_path = script_path
        self.process: Optional[subprocess.Popen] = None
        self.started_at: Optional[str] = None
        self.status = "stopped"

    def start(self) -> bool:
        """Start the bot process"""
        try:
            self.process = subprocess.Popen(
                [sys.executable, self.script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True  # Detach from parent
            )
            self.started_at = datetime.now().isoformat()
            self.status = "running"
            return True
        except Exception as e:
            print(f"   Error starting bot: {e}")
            self.status = "error"
            return False

    def stop(self):
        """Stop the bot process"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except:
                self.process.kill()
            self.status = "stopped"

    def is_running(self) -> bool:
        """Check if bot is still running"""
        if self.process:
            return self.process.poll() is None
        return False


class BotManager:
    """
    Manages all bot processes
    """

    def __init__(self):
        self.memory = get_memory()
        self.bots: Dict[str, BotProcess] = {}
        self.bot_scripts_dir = os.path.join(os.path.dirname(__file__), "bots")
        os.makedirs(self.bot_scripts_dir, exist_ok=True)

    def create_telegram_bot(self, token: str) -> str:
        """Create a Telegram bot script"""
        script_content = f'''#!/usr/bin/env python3
"""
Telegram Bot for Anubis
Auto-generated - Runs 24/7 to receive and respond to messages
"""

import os
import sys
import asyncio
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
    HAS_TELEGRAM = True
except ImportError:
    HAS_TELEGRAM = False
    print("Installing python-telegram-bot...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "python-telegram-bot"], check=True)
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

from persistence import get_memory
from autonomous_executor import get_executor

BOT_TOKEN = "{token}"

# Initialize
memory = get_memory()
executor = get_executor()


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    await update.message.reply_text(
        "🐺 *Anubis is online!*\\n\\n"
        "I'm your personal AI assistant. Just send me a message and I'll help you!\\n\\n"
        "Commands:\\n"
        "/status - Check my status\\n"
        "/help - Get help",
        parse_mode="Markdown"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    await update.message.reply_text(
        "🐺 *Anubis Help*\\n\\n"
        "I can help you with:\\n"
        "• Research any topic\\n"
        "• Create tools and integrations\\n"
        "• Answer questions\\n"
        "• Execute tasks\\n\\n"
        "Just send me a message!",
        parse_mode="Markdown"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command"""
    sessions = memory.list_sessions()
    status_text = f"🐺 *Anubis Status*\\n\\n"
    status_text += f"Uptime: Active\\n"
    status_text += f"Sessions: {{len(sessions)}}\\n"
    status_text += f"Time: {{datetime.now().strftime('%H:%M:%S')}}"
    await update.message.reply_text(status_text, parse_mode="Markdown")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming messages"""
    chat_id = str(update.effective_chat.id)
    user_message = update.message.text

    # Save to memory
    memory.add_to_conversation("telegram", chat_id, "user", user_message)

    # Show typing indicator
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

    # Get response from Anubis
    try:
        # Get conversation history for context
        history = memory.get_conversation_history("telegram", chat_id, limit=5)

        # Build context
        context_msg = ""
        if history:
            context_msg = "\\nPrevious messages:\\n"
            for msg in history[-3:]:
                context_msg += f"{{msg['role']}}: {{msg['content']}}\\n"

        # Process with executor
        full_message = f"{{context_msg}}\\nCurrent message: {{user_message}}"
        response = executor.process_request(user_message)

        # Save response
        memory.add_to_conversation("telegram", chat_id, "assistant", response)

        # Send response (Telegram has 4096 char limit)
        if len(response) > 4000:
            # Split into chunks
            for i in range(0, len(response), 4000):
                chunk = response[i:i+4000]
                await update.message.reply_text(chunk)
        else:
            await update.message.reply_text(response)

    except Exception as e:
        await update.message.reply_text(f"Error: {{str(e)[:200]}}")


def main():
    """Run the bot"""
    print("🐺 Starting Anubis Telegram Bot...")
    print(f"   Token: {{BOT_TOKEN[:10]}...")

    # Create application
    app = Application.builder().token(BOT_TOKEN).build()

    # Add handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("   ✅ Bot is running! Send messages on Telegram.")
    print("   Press Ctrl+C to stop.")

    # Run the bot
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
'''
        # Save script
        script_path = os.path.join(self.bot_scripts_dir, "telegram_bot.py")
        with open(script_path, 'w') as f:
            f.write(script_content)

        return script_path

    def create_discord_bot(self, token: str) -> str:
        """Create a Discord bot script"""
        script_content = f'''#!/usr/bin/env python3
"""
Discord Bot for Anubis
Auto-generated - Runs 24/7 to receive and respond to messages
"""

import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import discord
    from discord.ext import commands
    HAS_DISCORD = True
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "discord.py"], check=True)
    import discord
    from discord.ext import commands

from persistence import get_memory
from autonomous_executor import get_executor

BOT_TOKEN = "{token}"

# Setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

memory = get_memory()
executor = get_executor()


@bot.event
async def on_ready():
    print(f"🐺 Anubis Discord Bot connected as {{bot.user}}")


@bot.command()
async def start(ctx):
    await ctx.send("🐺 Anubis is online! Send me a message.")


@bot.command()
async def status(ctx):
    await ctx.send(f"🐺 Anubis Status: Online\\nSessions: {{len(memory.list_sessions())}}")


@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    if message.content.startswith("!"):
        await bot.process_commands(message)
        return

    # Process message
    chat_id = str(message.channel.id)
    memory.add_to_conversation("discord", chat_id, "user", message.content)

    async with message.channel.typing():
        response = executor.process_request(message.content)
        memory.add_to_conversation("discord", chat_id, "assistant", response)

        # Discord has 2000 char limit
        if len(response) > 1900:
            for i in range(0, len(response), 1900):
                await message.channel.send(response[i:i+1900])
        else:
            await message.channel.send(response)


def main():
    print("🐺 Starting Anubis Discord Bot...")
    bot.run(BOT_TOKEN)


if __name__ == "__main__":
    main()
'''
        script_path = os.path.join(self.bot_scripts_dir, "discord_bot.py")
        with open(script_path, 'w') as f:
            f.write(script_content)
        return script_path

    def setup_telegram(self) -> Dict:
        """
        Interactive Telegram setup
        Returns setup instructions and saves session
        """
        print("\n" + "="*50)
        print("📱 TELEGRAM BOT SETUP")
        print("="*50)
        print("""
To create a Telegram bot:

1. Open Telegram on your phone
2. Search for @BotFather
3. Send the message: /newbot
4. Follow the instructions:
   - Give your bot a name (e.g., "Anubis AI")
   - Give your bot a username (e.g., "anubis_ai_bot")
5. BotFather will give you a TOKEN

The token looks like:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

Enter your token below:
""")

        token = input("Telegram Bot Token: ").strip()

        if not token or ":" not in token:
            return {"success": False, "error": "Invalid token format"}

        # Create bot script
        script_path = self.create_telegram_bot(token)

        # Save session
        session = self.memory.save_bot_session(
            platform="telegram",
            token=token,
            bot_name="Anubis Bot",
            config={"script_path": script_path}
        )

        # Install telegram library
        print("\n   Installing python-telegram-bot...")
        subprocess.run([sys.executable, "-m", "pip", "install", "python-telegram-bot"],
                      capture_output=True)

        return {
            "success": True,
            "token": token,
            "script_path": script_path,
            "instructions": f"""
✅ Telegram Bot Created!

To start your bot:
  python {script_path}

Or from Anubis:
  /start_bot telegram

Your bot is ready! Search for it on Telegram.
"""
        }

    def setup_discord(self) -> Dict:
        """Interactive Discord setup"""
        print("\n" + "="*50)
        print("🎮 DISCORD BOT SETUP")
        print("="*50)
        print("""
To create a Discord bot:

1. Go to: https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name (e.g., "Anubis AI")
4. Go to "Bot" section → "Add Bot"
5. Copy the TOKEN
6. Go to "OAuth2" → "URL Generator"
7. Select "bot" scope and permissions
8. Use the generated link to invite bot to your server

Enter your bot token below:
""")

        token = input("Discord Bot Token: ").strip()

        if not token:
            return {"success": False, "error": "Invalid token"}

        # Create bot script
        script_path = self.create_discord_bot(token)

        # Save session
        session = self.memory.save_bot_session(
            platform="discord",
            token=token,
            bot_name="Anubis Discord Bot",
            config={"script_path": script_path}
        )

        # Install discord library
        print("\n   Installing discord.py...")
        subprocess.run([sys.executable, "-m", "pip", "install", "discord.py"],
                      capture_output=True)

        return {
            "success": True,
            "token": token,
            "script_path": script_path,
            "instructions": f"""
✅ Discord Bot Created!

To start your bot:
  python {script_path}

Or from Anubis:
  /start_bot discord

Invite the bot to your server and start chatting!
"""
        }

    def start_bot(self, platform: str) -> Dict:
        """Start a bot process"""
        session = self.memory.get_session(platform)
        if not session:
            return {"success": False, "error": f"No {platform} session found. Run setup first."}

        script_path = session.config.get("script_path")
        if not script_path or not os.path.exists(script_path):
            return {"success": False, "error": "Bot script not found"}

        # Check if already running
        if platform in self.bots and self.bots[platform].is_running():
            return {"success": True, "message": f"{platform} bot is already running"}

        # Start bot
        bot = BotProcess(platform, script_path)
        if bot.start():
            self.bots[platform] = bot
            return {
                "success": True,
                "message": f"{platform} bot started!",
                "pid": bot.process.pid if bot.process else None
            }
        else:
            return {"success": False, "error": f"Failed to start {platform} bot"}

    def stop_bot(self, platform: str) -> Dict:
        """Stop a bot process"""
        if platform not in self.bots:
            return {"success": False, "error": f"No {platform} bot running"}

        self.bots[platform].stop()
        return {"success": True, "message": f"{platform} bot stopped"}

    def get_status(self) -> Dict:
        """Get status of all bots"""
        status = {}
        for platform, session in self.memory.sessions.items():
            is_running = platform in self.bots and self.bots[platform].is_running()
            status[platform] = {
                "configured": True,
                "running": is_running,
                "created_at": session.created_at
            }
        return status


# Global instance
_bot_manager = None

def get_bot_manager() -> BotManager:
    global _bot_manager
    if _bot_manager is None:
        _bot_manager = BotManager()
    return _bot_manager
