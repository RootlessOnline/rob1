#!/usr/bin/env python3
"""
ANUBIS V2 - Autonomous AI with Soul + Real Bot Integration

Version 2 Improvements:
- Bash Tool: Run terminal commands directly
- Proper Telegram Setup: Give token once, bot runs forever
- Service Manager: Bots run in background 24/7
- Auto-dependency installation
- Fixed tool execution

Just talk to Anubis naturally!
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.markdown import Markdown

# Import soul system
from soul import get_soul, AnubisSoul

# Import tools
from tools.bash_tool import get_bash_tool, TOOLS as BASH_TOOLS
from tools.telegram_tool import get_telegram_setup, TOOLS as TELEGRAM_TOOLS

# Import service manager
from service_manager import get_service_manager

# Import other components
try:
    from autonomous_executor import get_executor
    from api_manager import get_api_manager
except:
    pass

console = Console()


def show_banner():
    console.print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                  🐺 ANUBIS V2 - Your AI Companion 🐺                  ║
║                                                                       ║
║     Version 2 Improvements:                                          ║
║     • Bash Tool - Run terminal commands directly                     ║
║     • Telegram Bot - Give token once, runs forever                   ║
║     • Service Manager - Bots run 24/7 in background                  ║
║     • Soul System - Memory, Personality, Emotions                    ║
║     • Auto-dependency installation                                   ║
║                                                                       ║
║     Just talk to Anubis naturally!                                   ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
""", style="cyan")


def show_commands():
    console.print("\n💬 Talk to Anubis naturally. Examples:", style="green")
    console.print("   'Set up telegram with token 123:ABC...'", style="dim")
    console.print("   'Run ls -la in my projects folder'", style="dim")
    console.print("   'Install numpy and pandas'", style="dim")
    console.print("   'What do you remember about me?'", style="dim")
    console.print("")
    console.print("Commands:", style="green")
    console.print("   /status     - Full status report", style="dim")
    console.print("   /telegram   - Telegram bot management", style="dim")
    console.print("   /services   - Background services", style="dim")
    console.print("   /bash       - Run terminal command", style="dim")
    console.print("   /remember   - What Anubis remembers", style="dim")
    console.print("   /quit       - Exit", style="dim")
    console.print("")


def main():
    show_banner()

    # Check for command line args
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()

        if arg == "setup":
            try:
                get_api_manager().setup_interactive()
            except:
                pass
            return

        elif arg == "telegram":
            handle_telegram_cli(sys.argv[2:] if len(sys.argv) > 2 else [])
            return

        elif arg == "status":
            soul = get_soul()
            print(soul.get_status_report())
            return

    # Initialize Anubis
    console.print("🔧 Awakening Anubis V2...", style="yellow")

    # Initialize soul
    soul = get_soul()

    # Initialize bash tool
    bash = get_bash_tool()
    console.print("   🖥️  Bash Tool ready", style="dim")

    # Initialize service manager
    services = get_service_manager()
    console.print("   ⚙️  Service Manager ready", style="dim")

    # Check Telegram status
    telegram = get_telegram_setup()
    if telegram.is_setup():
        status = telegram.get_status()
        if status.get("status") == "running":
            console.print("   📱 Telegram bot: Running", style="green")
        else:
            console.print("   📱 Telegram bot: Configured (stopped)", style="yellow")
    else:
        console.print("   📱 Telegram bot: Not set up", style="dim")

    console.print("   ✅ Anubis V2 is ready!\n", style="green")

    # Show personalized greeting
    greeting = soul.get_startup_greeting()
    console.print(f"🐺 {greeting}\n", style="cyan")

    # Show quick start
    if not telegram.is_setup():
        console.print("💡 Quick Start: Say 'set up telegram with token YOUR_TOKEN'", style="yellow")

    show_commands()

    # Main loop
    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()

            if not user_input:
                continue

            # Handle commands
            if user_input.startswith("/"):
                handle_command(user_input, soul, bash, services, telegram)
                continue

            # Process with appropriate handler
            console.print("\n" + "─"*60, style="dim")

            # Check for special intents
            lower_input = user_input.lower()

            # Telegram setup intent
            if "telegram" in lower_input and ("token" in lower_input or ":" in user_input):
                result = handle_telegram_setup(user_input, telegram)
                console.print(f"\n{result}", style="white")
                console.print("\n" + "─"*60, style="dim")
                continue

            # Bash command intent
            if any(kw in lower_input for kw in ["run ", "execute ", "terminal", "bash"]):
                # Extract command
                cmd = extract_command(user_input)
                if cmd:
                    result = bash.run_command(cmd)
                    console.print(f"\n{result}", style="white")
                    console.print("\n" + "─"*60, style="dim")
                    continue

            # Otherwise use autonomous executor
            try:
                executor = get_executor()
                result = executor.process_request(user_input)
                console.print(f"\n🐺 Anubis: {result[:2000]}", style="white")
            except:
                # Fallback to simple response
                result = f"I understand you want: {user_input[:100]}. Let me help with that."
                console.print(f"\n🐺 Anubis: {result}", style="white")

            # Process through soul for memory
            soul.process_message(user_input, result)

            console.print("\n" + "─"*60, style="dim")

        except KeyboardInterrupt:
            console.print("\n\n👋 Goodbye! Your bots keep running in background.", style="cyan")
            break
        except Exception as e:
            console.print(f"\n❌ Error: {e}", style="red")
            import traceback
            traceback.print_exc()


def handle_command(cmd: str, soul, bash, services, telegram):
    """Handle slash commands"""
    cmd_lower = cmd.lower()
    parts = cmd_lower.split()

    if cmd_lower in ["/quit", "/exit", "/q"]:
        console.print("\n👋 Goodbye! Bots keep running in background.", style="cyan")
        sys.exit(0)

    elif cmd_lower == "/status":
        print(soul.get_status_report())

    elif cmd_lower == "/remember":
        profile = soul.user_profile.profile
        console.print("\n🧠 What Anubis Remembers:", style="cyan")
        console.print(f"   Name: {profile.get('preferred_name') or profile.get('name', 'Friend')}")
        console.print(f"   Conversations: {profile.get('total_conversations', 0)}")
        if profile.get("interests"):
            console.print(f"   Interests: {', '.join(profile['interests'][:5])}")

    elif cmd_lower == "/telegram":
        status = telegram.get_status()
        console.print("\n📱 Telegram Bot Status:", style="cyan")
        if status.get("has_token"):
            console.print(f"   Token: Saved ✅")
            console.print(f"   Status: {status.get('status')}")
            console.print(f"   PID: {status.get('pid', 'N/A')}")
        else:
            console.print("   ❌ Not set up. Say: 'set up telegram with token YOUR_TOKEN'")

    elif cmd_lower.startswith("/telegram start"):
        result = telegram.start_bot()
        if result.get("success"):
            console.print(f"\n✅ Telegram bot started (PID: {result.get('pid')})", style="green")
        else:
            console.print(f"\n❌ {result.get('error')}", style="red")

    elif cmd_lower.startswith("/telegram stop"):
        result = telegram.stop_bot()
        console.print(f"\n✅ Telegram bot stopped", style="green")

    elif cmd_lower == "/services":
        svcs = services.list_services()
        console.print("\n⚙️ Background Services:", style="cyan")
        if svcs:
            for s in svcs:
                status_icon = "🟢" if s["status"] == "running" else "⚪"
                console.print(f"   {status_icon} {s['name']}: {s['status']} (PID: {s.get('pid', 'N/A')})")
        else:
            console.print("   No services configured", style="dim")

    elif cmd_lower.startswith("/bash"):
        if len(parts) < 2:
            console.print("\nUsage: /bash <command>", style="yellow")
            console.print("Example: /bash ls -la", style="dim")
        else:
            command = " ".join(parts[1:])
            result = bash.run_command(command)
            console.print(f"\n{result}", style="white")

    elif cmd_lower == "/help":
        console.print("\n📖 Commands:", style="cyan")
        console.print("   /status     - Full status")
        console.print("   /telegram   - Telegram bot status")
        console.print("   /services   - Background services")
        console.print("   /bash CMD   - Run terminal command")
        console.print("   /remember   - What Anubis knows")
        console.print("   /quit       - Exit")

    else:
        console.print(f"Unknown command: {cmd}", style="red")


def handle_telegram_cli(args):
    """Handle telegram CLI commands"""
    telegram = get_telegram_setup()

    if not args or args[0] == "status":
        status = telegram.get_status()
        print(f"\n📱 Telegram Bot Status:")
        print(f"   Token saved: {'✅' if status.get('has_token') else '❌'}")
        print(f"   Status: {status.get('status')}")
        if status.get('pid'):
            print(f"   PID: {status['pid']}")

    elif args[0] == "start":
        result = telegram.start_bot()
        if result.get("success"):
            print(f"✅ Bot started (PID: {result['pid']})")
        else:
            print(f"❌ {result.get('error')}")

    elif args[0] == "stop":
        result = telegram.stop_bot()
        print(f"✅ Bot stopped")

    elif args[0] == "setup" and len(args) > 1:
        token = args[1]
        result = telegram.setup(token)
        print("\n".join(result.get("steps", [])))
        print(result.get("instructions", ""))


def handle_telegram_setup(user_input: str, telegram) -> str:
    """Handle Telegram setup from natural language"""
    import re

    # Extract token from input
    # Format: numbers:alphanumeric
    token_match = re.search(r'(\d+:[A-Za-z0-9_-]+)', user_input)

    if token_match:
        token = token_match.group(1)
        result = telegram.setup(token)
        
        output = []
        output.append("🐺 Setting up Telegram bot...\n")
        output.extend(result.get("steps", []))
        if result.get("errors"):
            output.append("\nNotes:")
            output.extend(result.get("errors", []))
        output.append(result.get("instructions", ""))
        
        return "\n".join(output)
    else:
        return "I couldn't find a valid Telegram token in your message. Tokens look like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"


def extract_command(user_input: str) -> str:
    """Extract bash command from natural language"""
    lower = user_input.lower()

    # Remove common prefixes
    prefixes = ["run ", "execute ", "bash ", "terminal ", "command ", "can you "]
    for prefix in prefixes:
        if lower.startswith(prefix):
            return user_input[len(prefix):]

    # Check for specific patterns
    if lower.startswith("list"):
        return "ls -la " + user_input[4:].strip()
    elif lower.startswith("show me"):
        return user_input[7:].strip()
    elif "install" in lower:
        # Extract package name
        import re
        match = re.search(r'install\s+(\S+)', lower)
        if match:
            return f"pip install {match.group(1)}"

    return ""


if __name__ == "__main__":
    main()
