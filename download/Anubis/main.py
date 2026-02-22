#!/usr/bin/env python3
"""
ANUBIS - Autonomous AI with Soul

Anubis is more than an AI - he's a companion who:
- Remembers every conversation you've had
- Has a personality that evolves over time
- Understands your emotions and responds with empathy
- Can set up Telegram, Discord, WhatsApp (remembers forever!)
- Creates tools and integrations on the fly
- Grows alongside you as a friend

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

# Import autonomous executor
from autonomous_executor import get_executor

# Import API manager
from api_manager import get_api_manager

console = Console()


def show_banner():
    console.print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                    🐺 ANUBIS - Your AI Companion 🐺                   ║
║                                                                       ║
║     Anubis is more than an AI agent:                                 ║
║     • Remembers every conversation (has a soul)                      ║
║     • Personality that evolves over time                             ║
║     • Understands emotions and cares about you                       ║
║     • Connects to Telegram, Discord, WhatsApp (remembers!)           ║
║     • Creates tools, researches, helps with anything                 ║
║     • A friend who grows alongside you                               ║
║                                                                       ║
║     Just talk to Anubis naturally - he remembers you!                ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
""", style="cyan")


def show_commands():
    console.print("\n💬 Talk to Anubis naturally. Examples:", style="green")
    console.print("   'I want to chat with you on Telegram'", style="dim")
    console.print("   'I had a rough day today...'", style="dim")
    console.print("   'Help me build a React app'", style="dim")
    console.print("   'What do you remember about me?'", style="dim")
    console.print("")
    console.print("Commands:", style="green")
    console.print("   /status    - Show full status (memory, personality, platforms)", style="dim")
    console.print("   /remember  - Show what Anubis remembers about you", style="dim")
    console.print("   /platforms - Show connected platforms", style="dim")
    console.print("   /setup     - Setup API keys", style="dim")
    console.print("   /quit      - Exit", style="dim")
    console.print("")


def main():
    show_banner()

    # Check for command line args
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()

        if arg == "setup":
            get_api_manager().setup_interactive()
            return
        elif arg == "status":
            soul = get_soul()
            print(soul.get_status_report())
            return

    # Initialize Anubis with soul
    console.print("🔧 Awakening Anubis...", style="yellow")

    # Initialize soul (memory, personality, emotions)
    soul = get_soul()

    # Initialize executor for tasks
    executor = get_executor()

    console.print("   ✅ Anubis is ready!\n", style="green")

    # Show personalized greeting
    greeting = soul.get_startup_greeting()
    console.print(f"🐺 {greeting}\n", style="cyan")

    # Show connected platforms
    platforms = soul.sessions.list_platforms()
    if platforms:
        console.print(f"📱 Connected: {', '.join(platforms)}", style="green")
    else:
        console.print("📱 No platforms connected yet.", style="dim")
        console.print("   Say 'set up telegram' or 'connect whatsapp' to get started!", style="dim")

    show_commands()

    # Main loop
    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()

            if not user_input:
                continue

            # Handle commands
            if user_input.startswith("/"):
                handle_command(user_input, soul, executor)
                continue

            # Get soul context for this message
            context = soul.get_context_for_response(user_input)

            # Process with Anubis
            console.print("\n" + "─"*60, style="dim")

            # Process request
            result = executor.process_request(user_input)

            console.print("\n" + "─"*60, style="dim")

            # Process the exchange through soul
            soul.process_message(user_input, result)

            # Display result
            console.print(f"\n🐺 Anubis: {result[:2000]}", style="white")

            # Show relationship indicator occasionally
            profile = soul.user_profile.profile
            if profile.get("relationship_level", 0) % 10 < 1:
                level = profile.get("relationship_level", 0)
                console.print(f"\n   💫 Bond strength: {level:.0f}/100", style="dim")

        except KeyboardInterrupt:
            console.print("\n\n👋 Goodbye! Anubis will remember our conversation.", style="cyan")
            break
        except Exception as e:
            console.print(f"\n❌ Error: {e}", style="red")
            import traceback
            traceback.print_exc()


def handle_command(cmd: str, soul: AnubisSoul, executor):
    """Handle slash commands"""
    cmd_lower = cmd.lower()
    parts = cmd_lower.split()

    if cmd_lower in ["/quit", "/exit", "/q"]:
        console.print("\n👋 Goodbye! Anubis will remember you.", style="cyan")
        sys.exit(0)

    elif cmd_lower == "/status":
        # Show full status
        print(soul.get_status_report())

    elif cmd_lower == "/remember":
        # Show what Anubis remembers
        profile = soul.user_profile.profile

        console.print("\n🧠 What Anubis Remembers About You:", style="cyan")
        console.print("="*50)

        name = profile.get("preferred_name") or profile.get("name", "Friend")
        console.print(f"\n👤 Name: {name}", style="white")

        days = (lambda dt: dt.days)(
            __import__('datetime').datetime.now() - 
            __import__('datetime').datetime.fromisoformat(
                profile.get("first_met", __import__('datetime').datetime.now().isoformat())
            )
        )
        console.print(f"📅 Known for: {days} days", style="white")
        console.print(f"💬 Conversations: {profile.get('total_conversations', 0)}", style="white")

        if profile.get("interests"):
            console.print(f"🎯 Interests: {', '.join(profile['interests'][:5])}", style="white")

        if profile.get("goals"):
            active_goals = [g for g in profile["goals"] if g.get("status") == "active"]
            if active_goals:
                console.print(f"🎯 Goals: {', '.join([g['goal'] for g in active_goals[:3]])}", style="white")

        # Show memorable moments
        moments = profile.get("memorable_moments", [])
        if moments:
            console.print(f"\n✨ Memorable Moments ({len(moments)}):", style="yellow")
            for moment in moments[-3:]:
                console.print(f"   • {moment.get('moment', 'A special moment')} ({moment.get('emotion', 'happy')})", style="dim")

        # Show personality
        console.print(f"\n🐺 Anubis's Current Traits:", style="yellow")
        top_traits = sorted(
            soul.personality.traits.items(),
            key=lambda x: -x[1].value
        )[:5]
        for name, trait in top_traits:
            bar = "█" * int(trait.value * 10) + "░" * (10 - int(trait.value * 10))
            console.print(f"   {name}: {bar} {trait.value:.0%}", style="dim")

    elif cmd_lower == "/platforms":
        # Show connected platforms
        platforms = soul.sessions.list_platforms()

        console.print("\n📱 Connected Platforms:", style="cyan")
        console.print("="*50)

        if platforms:
            for platform in platforms:
                session = soul.sessions.get_platform(platform)
                status = "🟢 Active" if session.is_active else "⚪ Inactive"
                console.print(f"\n{status} {platform.upper()}", style="white")
                if session.metadata:
                    if "bot_name" in session.metadata:
                        console.print(f"   Bot: @{session.metadata['bot_name']}", style="dim")
                console.print(f"   Created: {session.created_at[:10]}", style="dim")
                console.print(f"   Last used: {session.last_used[:10]}", style="dim")
        else:
            console.print("\nNo platforms connected yet.", style="yellow")
            console.print("Say 'set up telegram' or 'connect discord' to get started!", style="dim")

    elif cmd_lower == "/setup":
        get_api_manager().setup_interactive()

    elif cmd_lower == "/tools":
        tools = executor.tool_registry.list_all()
        console.print(f"\n🔧 Available Tools ({len(tools)}):", style="yellow")
        for t in tools:
            console.print(f"   • {t.name}: {t.description}", style="dim")

    elif cmd_lower == "/skills":
        skills = soul.sessions.list_api_keys()
        console.print(f"\n📚 Discovered Skills:", style="yellow")
        for skill in executor.skills_manager.discovery.list_all():
            console.print(f"   • {skill.name}: {skill.description[:50]}...", style="dim")

    elif cmd_lower == "/help":
        console.print("\n📖 Commands:", style="cyan")
        console.print("   /status    - Full status report", style="white")
        console.print("   /remember  - What Anubis remembers about you", style="white")
        console.print("   /platforms - Connected platforms (Telegram, etc.)", style="white")
        console.print("   /tools     - Available tools", style="white")
        console.print("   /setup     - Setup API keys", style="white")
        console.print("   /quit      - Exit", style="white")

    else:
        console.print(f"Unknown command: {cmd}", style="red")
        console.print("Type /help to see available commands", style="dim")


if __name__ == "__main__":
    main()
