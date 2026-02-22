"""
Telegram Bot Tool - Proper Integration for AnubisV2

This creates a working Telegram bot that:
1. Saves your token securely
2. Generates working code
3. Starts as a background service
4. Reconnects automatically on Anubis restart

HUMAN STEPS NEEDED:
1. Open Telegram on phone
2. Search @BotFather
3. Send /newbot and follow prompts
4. Copy the token
5. Give it to Anubis

EVERYTHING ELSE IS AUTOMATIC!
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, Optional, Any

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from soul.session_manager import get_session_manager
from service_manager import get_service_manager


class TelegramBotSetup:
    """
    Handles complete Telegram bot setup
    """
    
    def __init__(self):
        self.sessions = get_session_manager()
        self.services = get_service_manager()
        self.bot_script_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "bots", "telegram_bot.py"
        )
        os.makedirs(os.path.dirname(self.bot_script_path), exist_ok=True)
    
    def is_setup(self) -> bool:
        """Check if Telegram is already set up"""
        return self.sessions.has_platform("telegram")
    
    def get_saved_token(self) -> Optional[str]:
        """Get saved Telegram token"""
        session = self.sessions.get_platform("telegram")
        if session:
            return session.credentials.get("token")
        return None
    
    def save_token(self, token: str, bot_name: str = None, bot_username: str = None) -> Dict:
        """Save Telegram bot token"""
        # Parse bot info from token if possible
        bot_id = token.split(":")[0] if ":" in token else "unknown"
        
        self.sessions.save_platform(
            platform="telegram",
            credentials={"token": token},
            metadata={
                "bot_id": bot_id,
                "bot_name": bot_name or f"AnubisBot_{bot_id}",
                "bot_username": bot_username,
                "setup_date": datetime.now().isoformat()
            }
        )
        
        return {
            "success": True,
            "message": "Token saved securely",
            "bot_id": bot_id
        }
    
    def create_bot_script(self) -> str:
        """Create the Telegram bot script"""
        
        script = '''#!/usr/bin/env python3
"""
Anubis Telegram Bot - Auto-generated
This bot connects Telegram to Anubis
"""

import os
import sys
import json
import asyncio
from datetime import datetime

# Add Anubis to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
    HAS_TELEGRAM = True
except ImportError:
    HAS_TELEGRAM = False
    print("ERROR: python-telegram-bot not installed. Run: pip install python-telegram-bot")

from soul.session_manager import get_session_manager
from autonomous_executor import get_executor


# Get token from saved session
def get_token():
    sessions = get_session_manager()
    session = sessions.get_platform("telegram")
    if session:
        return session.credentials.get("token")
    return None


# User preferences storage
USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "telegram_users.json")
os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)


def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)


# Bot handlers
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    user_id = str(user.id)
    
    # Save user
    users = load_users()
    users[user_id] = {
        "name": user.first_name,
        "username": user.username,
        "first_seen": datetime.now().isoformat(),
        "message_count": users.get(user_id, {}).get("message_count", 0)
    }
    save_users(users)
    
    await update.message.reply_text(
        f"🐺 Hello {user.first_name}!\\n\\n"
        f"I\'m Anubis, your AI companion.\\n\\n"
        f"Just send me a message and I\'ll respond!\\n\\n"
        f"Commands:\\n"
        f"/start - Show this message\\n"
        f"/status - Check my status\\n"
        f"/clear - Clear our conversation"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command"""
    sessions = get_session_manager()
    platforms = sessions.list_platforms()
    
    status_msg = f"🐺 Anubis Status\\n\\n"
    status_msg += f"✅ Telegram Bot: Online\\n"
    status_msg += f"💬 Connected platforms: {len(platforms)}\\n"
    status_msg += f"🕐 Time: {datetime.now().strftime(\'%H:%M:%S\')}\\n"
    
    await update.message.reply_text(status_msg)


async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /clear command"""
    user_id = str(update.effective_user.id)
    users = load_users()
    if user_id in users:
        users[user_id]["message_count"] = 0
        save_users(users)
    await update.message.reply_text("🧹 Conversation cleared!")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all messages"""
    user = update.effective_user
    user_id = str(user.id)
    message = update.message.text
    
    # Update user stats
    users = load_users()
    if user_id not in users:
        users[user_id] = {
            "name": user.first_name,
            "username": user.username,
            "first_seen": datetime.now().isoformat()
        }
    users[user_id]["last_message"] = datetime.now().isoformat()
    users[user_id]["message_count"] = users[user_id].get("message_count", 0) + 1
    save_users(users)
    
    # Show typing indicator
    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action="typing"
    )
    
    # Get response from Anubis
    try:
        executor = get_executor()
        response = executor.process_request(message)
        
        # Telegram has 4096 char limit
        if len(response) > 4000:
            response = response[:4000] + "...\\n\\n[Response truncated]"
        
        await update.message.reply_text(response)
        
    except Exception as e:
        await update.message.reply_text(
            f"🤔 I encountered an error. Let me try again.\\n\\n"
            f"Error: {str(e)[:100]}"
        )


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    print(f"Telegram Error: {context.error}")
    
    if update and update.message:
        await update.message.reply_text(
            "🤔 Something went wrong. Please try again."
        )


def main():
    """Run the Telegram bot"""
    if not HAS_TELEGRAM:
        print("ERROR: python-telegram-bot not installed!")
        print("Run: pip install python-telegram-bot")
        return
    
    token = get_token()
    if not token:
        print("ERROR: No Telegram token found!")
        print("Run Anubis and say: \'set up telegram with token YOUR_TOKEN\'")
        return
    
    print("🐺 Starting Anubis Telegram Bot...")
    print(f"📱 Bot token: {token[:10]}...")
    
    # Create application
    application = Application.builder().token(token).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(CommandHandler("clear", clear_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Add error handler
    application.add_error_handler(error_handler)
    
    print("✅ Bot is running! Send /start on Telegram to begin.")
    print("   Press Ctrl+C to stop.")
    
    # Run the bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
'''
        
        # Write the script
        with open(self.bot_script_path, 'w') as f:
            f.write(script)
        
        os.chmod(self.bot_script_path, 0o755)
        return self.bot_script_path
    
    def install_dependencies(self) -> Dict:
        """Install required Python packages"""
        import subprocess
        
        packages = ["python-telegram-bot"]
        
        results = []
        for package in packages:
            try:
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", package],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                if result.returncode == 0:
                    results.append(f"✅ {package} installed")
                else:
                    results.append(f"⚠️ {package}: {result.stderr[:100]}")
            except Exception as e:
                results.append(f"❌ {package}: {str(e)[:100]}")
        
        return {"results": results}
    
    def setup(self, token: str, auto_start: bool = True) -> Dict:
        """
        Complete setup process:
        1. Save token
        2. Install dependencies
        3. Create bot script
        4. Start bot service
        """
        results = {
            "success": True,
            "steps": [],
            "errors": []
        }
        
        # Step 1: Save token
        try:
            save_result = self.save_token(token)
            results["steps"].append("✅ Token saved securely")
        except Exception as e:
            results["errors"].append(f"Failed to save token: {e}")
            results["success"] = False
            return results
        
        # Step 2: Install dependencies
        try:
            dep_result = self.install_dependencies()
            results["steps"].extend(dep_result["results"])
        except Exception as e:
            results["errors"].append(f"Dependency installation issue: {e}")
            # Continue anyway - might already be installed
        
        # Step 3: Create bot script
        try:
            script_path = self.create_bot_script()
            results["steps"].append(f"✅ Bot script created")
        except Exception as e:
            results["errors"].append(f"Failed to create script: {e}")
            results["success"] = False
            return results
        
        # Step 4: Register service
        try:
            self.services.create_service(
                name="telegram_bot",
                platform="telegram",
                command=f"{sys.executable} {self.bot_script_path}",
                auto_restart=True
            )
            results["steps"].append("✅ Service registered")
        except Exception as e:
            results["errors"].append(f"Failed to register service: {e}")
        
        # Step 5: Start service if requested
        if auto_start:
            try:
                start_result = self.services.start_service("telegram_bot")
                if start_result.get("success"):
                    results["steps"].append(f"✅ Bot started (PID: {start_result.get('pid')})")
                else:
                    results["errors"].append(f"Failed to start: {start_result.get('error')}")
            except Exception as e:
                results["errors"].append(f"Start error: {e}")
        
        # Generate instructions
        session = self.sessions.get_platform("telegram")
        bot_id = session.credentials.get("token", "").split(":")[0] if session else ""
        
        results["instructions"] = f"""
🤖 TELEGRAM BOT SETUP COMPLETE!

Your bot is ready! Here's how to use it:

1. Open Telegram on your phone
2. Search for your bot (Bot ID: {bot_id})
3. Send /start to begin chatting
4. Any message you send will be answered by Anubis!

Commands on Telegram:
• /start - Begin conversation
• /status - Check Anubis status
• /clear - Clear conversation

The bot runs as a background service and will:
• Stay running even when you close this terminal
• Auto-restart if it crashes
• Remember your token for next time

To manage the bot:
• python main.py telegram status
• python main.py telegram stop
• python main.py telegram start
"""
        
        return results
    
    def start_bot(self) -> Dict:
        """Start the Telegram bot service"""
        return self.services.start_service("telegram_bot")
    
    def stop_bot(self) -> Dict:
        """Stop the Telegram bot service"""
        return self.services.stop_service("telegram_bot")
    
    def get_status(self) -> Dict:
        """Get Telegram bot status"""
        status = self.services.get_service_status("telegram_bot")
        status["has_token"] = self.is_setup()
        return status


# Tool definitions for registry
TOOLS = [
    {
        "name": "telegram_setup",
        "description": "Set up Telegram bot with your API token. Run this ONCE with your token, and the bot will run forever.",
        "function": "setup_telegram_bot",
        "parameters": {
            "token": {"type": "string", "description": "Your Telegram bot token from @BotFather"}
        },
        "category": "messaging"
    },
    {
        "name": "telegram_status",
        "description": "Check if Telegram bot is running",
        "function": "telegram_bot_status",
        "parameters": {},
        "category": "messaging"
    },
    {
        "name": "telegram_start",
        "description": "Start the Telegram bot service",
        "function": "start_telegram_bot",
        "parameters": {},
        "category": "messaging"
    },
    {
        "name": "telegram_stop",
        "description": "Stop the Telegram bot service",
        "function": "stop_telegram_bot",
        "parameters": {},
        "category": "messaging"
    }
]


# Global instance
_telegram_setup = None


def get_telegram_setup() -> TelegramBotSetup:
    global _telegram_setup
    if _telegram_setup is None:
        _telegram_setup = TelegramBotSetup()
    return _telegram_setup


# Functions for tool registry
def setup_telegram_bot(token: str) -> str:
    """Set up Telegram bot with token"""
    setup = get_telegram_setup()
    result = setup.setup(token)
    
    output = "\\n".join(result.get("steps", []))
    if result.get("errors"):
        output += "\\n\\nWarnings:\\n" + "\\n".join(result.get("errors", []))
    output += result.get("instructions", "")
    
    return output


def telegram_bot_status() -> str:
    """Get Telegram bot status"""
    setup = get_telegram_setup()
    status = setup.get_status()
    
    if not status.get("has_token"):
        return "❌ Telegram not set up yet. Say: 'set up telegram with token YOUR_TOKEN'"
    
    if status.get("status") == "running":
        return f"✅ Telegram bot is running (PID: {status.get('pid')})"
    else:
        return f"⚠️ Telegram bot is {status.get('status')}. Say 'start telegram bot' to start it."


def start_telegram_bot() -> str:
    """Start Telegram bot"""
    setup = get_telegram_setup()
    
    if not setup.is_setup():
        return "❌ No token saved. Say: 'set up telegram with token YOUR_TOKEN'"
    
    result = setup.start_bot()
    
    if result.get("success"):
        return f"✅ Telegram bot started (PID: {result.get('pid')})"
    return f"❌ Failed: {result.get('error')}"


def stop_telegram_bot() -> str:
    """Stop Telegram bot"""
    setup = get_telegram_setup()
    result = setup.stop_bot()
    
    if result.get("success"):
        return "✅ Telegram bot stopped"
    return f"❌ Failed: {result.get('error')}"


if __name__ == "__main__":
    # Test / status check
    setup = get_telegram_setup()
    
    print("🐺 Telegram Bot Setup")
    print("=" * 40)
    
    if setup.is_setup():
        print("✅ Token is saved")
        status = setup.get_status()
        print(f"Status: {status.get('status')}")
        print(f"PID: {status.get('pid')}")
    else:
        print("❌ No token saved")
        print("Run Anubis and say: 'set up telegram with token YOUR_TOKEN'")
