#!/usr/bin/env python3
"""
Autonomous Hierarchical Agent System - MAIN ENTRY POINT
Complete version with:
- Multiple free API providers (auto-switching)
- Dynamic tool system
- WhatsApp integration
- Self-improvement capabilities
"""

import sys
import os
import asyncio

# Ensure modules can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from typing import List, Optional, Dict
from dataclasses import dataclass, field
from enum import Enum
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.prompt import Prompt

from config import Config
from api_manager import get_api_manager
from unified_llm import UnifiedLLM
from tools.tool_manager import get_tool_manager


console = Console()


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    id: str
    description: str
    assigned_agent: str
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[str] = None


class AutonomousAgent:
    """
    Complete Autonomous Agent with all features
    """

    def __init__(self):
        self.config = Config()

        # Initialize components
        print("🔧 Initializing systems...")

        # API Manager (handles multiple free APIs)
        self.api_manager = get_api_manager()
        print("   ✓ API Manager loaded")

        # Unified LLM (auto-switches between providers)
        self.llm = UnifiedLLM()
        print("   ✓ Unified LLM ready")

        # Tool Manager
        self.tool_manager = get_tool_manager()
        print(f"   ✓ {len(self.tool_manager.list_tools())} tools loaded")

        # Sub-agents (lazy loaded)
        self.research_agent = None
        self.planning_agent = None
        self.spawner_agent = None

        print("   ✓ System ready!\n")

    def create_plan(self, request: str) -> List[Task]:
        """Create execution plan based on request type"""
        req = request.lower()
        tasks = []
        tid = 1

        # Check for WhatsApp setup request - this is handled separately!
        if "whatsapp" in req and any(w in req for w in ["setup", "connect", "chat", "link", "use"]):
            # Don't create normal tasks - we'll handle this specially
            return []

        # Research tasks
        if any(w in req for w in ["research", "find", "search", "what", "latest", "news",
                                   "how", "why", "discover", "tell", "explain", "learn"]):
            tasks.append(Task(f"task_{tid}", f"Research: {request}", "research"))
            tid += 1

        # Build/create tasks
        if any(w in req for w in ["create", "build", "make", "setup", "install",
                                   "develop", "implement", "design", "write code"]):
            tasks.append(Task(f"task_{tid}", f"Plan: {request}", "planning"))
            tid += 1
            tasks.append(Task(f"task_{tid}", f"Build: {request}", "spawner"))
            tid += 1

        # Default to research
        if not tasks:
            tasks.append(Task(f"task_{tid}", f"Research and answer: {request}", "research"))

        return tasks

    def delegate_task(self, task: Task) -> str:
        """Delegate task to appropriate handler"""
        desc = task.description.lower()

        # Check if any tool matches
        for tool in self.tool_manager.list_tools():
            if tool.name in desc:
                return self.tool_manager.use(tool.name, query=task.description)

        # Delegate to specialized agents
        if task.assigned_agent == "research":
            return self._do_research(task.description)
        elif task.assigned_agent == "planning":
            return self._do_planning(task.description)
        elif task.assigned_agent == "spawner":
            return self._do_spawn(task.description)
        else:
            return self._do_direct(task.description)

    def _do_research(self, query: str) -> str:
        """Perform research"""
        if not self.research_agent:
            from research_agent import ResearchAgent
            self.research_agent = ResearchAgent(self.config)
        return self.research_agent.research(query)

    def _do_planning(self, task: str) -> str:
        """Create a plan"""
        if not self.planning_agent:
            from planning_agent import PlanningAgent
            self.planning_agent = PlanningAgent(self.config)
        return self.planning_agent.create_detailed_plan(task)

    def _do_spawn(self, task: str) -> str:
        """Spawn new agents/tools"""
        if not self.spawner_agent:
            from spawner_agent import SpawnerAgent
            self.spawner_agent = SpawnerAgent(self.config)
        return self.spawner_agent.spawn(task)

    def _do_direct(self, task: str) -> str:
        """Execute directly"""
        response = self.llm.generate(task)
        return response.content

    def _do_whatsapp_setup(self) -> str:
        """Actually run WhatsApp setup with QR code"""
        console.print("\n📱 Starting WhatsApp Setup...", style="yellow bold")

        try:
            from tools.whatsapp_tool import WhatsAppTool
        except ImportError:
            return "❌ WhatsApp tool not found. Make sure tools/whatsapp_tool.py exists."

        async def run_setup():
            wa = WhatsAppTool(headless=True)

            console.print("Opening WhatsApp Web...", style="dim")
            result = await wa.connect()

            if result.get("status") == "qr_code_ready":
                qr_path = result.get("qr_code_path", "whatsapp_qr.png")
                console.print(f"\n{'='*60}", style="green")
                console.print("📸 QR CODE CAPTURED!", style="bold green")
                console.print(f"{'='*60}", style="green")
                console.print(f"\n📷 QR Code saved to: {qr_path}", style="cyan")
                console.print("\n📋 TO CONNECT:", style="yellow")
                console.print("   1. Open WhatsApp on your phone", style="white")
                console.print("   2. Go to Settings > Linked Devices", style="white")
                console.print("   3. Tap 'Link a Device'", style="white")
                console.print(f"   4. Scan the QR code at: {qr_path}", style="white")
                console.print("\n⏳ Waiting for you to scan (2 minutes)...", style="yellow")

                connected = await wa.wait_for_connection(timeout=120)

                if connected:
                    console.print("\n✅ WHATSAPP CONNECTED!", style="bold green")
                    console.print("You can now chat with me on WhatsApp!", style="cyan")
                    await wa.disconnect()
                    return "SUCCESS: WhatsApp is connected and ready to use!"
                else:
                    await wa.disconnect()
                    return "⏰ Timeout - QR code expired. Run again to get a new code."

            elif result.get("status") == "already_logged_in":
                console.print("\n✅ Already connected to WhatsApp!", style="bold green")
                return "WhatsApp is already connected and ready!"

            else:
                error = result.get("error", "Unknown error")
                console.print(f"\n❌ Error: {error}", style="red")
                return f"Error setting up WhatsApp: {error}"

        # Run the async setup
        return asyncio.run(run_setup())

    def run(self, request: str) -> str:
        """Main execution loop"""
        console.print(f"\n{'='*60}", style="cyan")
        console.print("🧠 AUTONOMOUS AGENT ACTIVATED", style="bold cyan")
        console.print(f"📋 Request: {request}", style="white")
        console.print(f"{'='*60}\n", style="cyan")

        # Check for WhatsApp setup request FIRST
        req_lower = request.lower()
        if "whatsapp" in req_lower and any(w in req_lower for w in ["setup", "connect", "chat", "link", "use", "want"]):
            console.print("📱 Detected WhatsApp setup request!", style="yellow")
            console.print("Launching WhatsApp integration...\n", style="dim")
            result = self._do_whatsapp_setup()

            console.print(f"\n{'='*60}", style="cyan")
            console.print("🎯 RESULT", style="bold cyan")
            console.print(f"{'='*60}", style="cyan")
            console.print(f"\n{result}", style="white")
            console.print(f"\n{'='*60}", style="cyan")
            console.print("✅ COMPLETE", style="bold green")
            console.print(f"{'='*60}\n", style="cyan")
            return result

        # Normal task planning
        console.print("📋 Creating execution plan...", style="yellow")
        tasks = self.create_plan(request)
        console.print(f"   Created {len(tasks)} tasks:", style="green")
        for t in tasks:
            console.print(f"   - [{t.assigned_agent}] {t.description[:50]}...", style="dim")

        # Execute tasks
        results = []
        for task in tasks:
            console.print(f"\n▶️  Executing: {task.description[:60]}...", style="yellow")
            task.status = TaskStatus.IN_PROGRESS

            try:
                result = self.delegate_task(task)
                task.result = result
                task.status = TaskStatus.COMPLETED
                results.append(result)
                console.print("   ✅ Completed", style="green")
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.result = str(e)
                console.print(f"   ❌ Error: {e}", style="red")

        # Generate output
        console.print(f"\n{'='*60}", style="cyan")
        console.print("🎯 FINAL OUTPUT", style="bold cyan")
        console.print(f"{'='*60}", style="cyan")

        output = "\n\n".join(results) if results else "No results collected."
        console.print(f"\n{output[:3000]}", style="white")

        console.print(f"\n{'='*60}", style="cyan")
        console.print("✅ COMPLETE", style="bold green")
        console.print(f"{'='*60}\n", style="cyan")

        return output

    def show_status(self):
        """Show system status"""
        console.print("\n📊 System Status", style="bold cyan")
        console.print("="*50)

        # API Status
        status = self.api_manager.get_status()
        console.print("\n🔑 API Providers:", style="yellow")
        for name, info in status.items():
            if name != 'ollama':
                remaining = info['remaining']
                console.print(f"   {name}: {remaining:,} tokens remaining", style="green" if remaining > 100000 else "red")

        # Tools
        tools = self.tool_manager.list_tools()
        console.print(f"\n🔧 Tools: {len(tools)} available", style="yellow")


def main():
    """Main entry point"""
    # Show banner
    console.print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║     🧠 AUTONOMOUS HIERARCHICAL AGENT SYSTEM 🧠                       ║
║                                                                       ║
║     A self-managing AI that can:                                     ║
║     • Research any topic with real web search                        ║
║     • Plan and execute complex tasks                                 ║
║     • Create new agents and tools dynamically                        ║
║     • Connect to WhatsApp for remote access                          ║
║     • Auto-switch between free API providers                         ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
""", style="cyan")

    # Check for setup mode
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()

        if arg == "setup":
            # Setup API keys
            get_api_manager().setup_interactive()
            return

        elif arg == "whatsapp":
            # Setup WhatsApp directly from command line
            agent = AutonomousAgent()
            agent._do_whatsapp_setup()
            return

        elif arg == "status":
            # Show status
            agent = AutonomousAgent()
            agent.show_status()
            return

    # Normal interactive mode
    agent = AutonomousAgent()

    console.print("\n💬 Chat with your AI agent. Commands:", style="green")
    console.print("   /status  - Show system status", style="dim")
    console.print("   /tools   - List available tools", style="dim")
    console.print("   /setup   - Setup API keys", style="dim")
    console.print("   /whatsapp - Setup WhatsApp", style="dim")
    console.print("   /quit    - Exit", style="dim")
    console.print("")

    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()

            if not user_input:
                continue

            if user_input.startswith("/"):
                cmd = user_input.lower()

                if cmd in ["/quit", "/exit", "/q"]:
                    console.print("\n👋 Goodbye!\n", style="cyan")
                    break
                elif cmd == "/status":
                    agent.show_status()
                elif cmd == "/tools":
                    tools = agent.tool_manager.list_tools()
                    console.print(f"\n🔧 Available Tools ({len(tools)}):", style="yellow")
                    for t in tools:
                        console.print(f"   • {t.name}: {t.description}", style="dim")
                elif cmd == "/setup":
                    get_api_manager().setup_interactive()
                elif cmd == "/whatsapp":
                    agent._do_whatsapp_setup()
                else:
                    console.print(f"Unknown command: {cmd}", style="red")
                continue

            # Run the agent
            agent.run(user_input)

        except KeyboardInterrupt:
            console.print("\n\n👋 Goodbye!\n", style="cyan")
            break
        except Exception as e:
            console.print(f"\n❌ Error: {e}", style="red")


if __name__ == "__main__":
    main()
