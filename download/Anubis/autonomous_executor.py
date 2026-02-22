"""
Autonomous Executor - The BRAIN of the LocalAI

This module gives LA true autonomy:
1. Understands what user wants (not hardcoded keywords)
2. Researches how to accomplish it
3. Creates necessary tools/integrations
4. EXECUTES them (not just saves files)
5. Presents results to user
"""

import os
import sys
import json
import asyncio
import subprocess
import tempfile
import importlib.util
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from config import Config
from skills_discovery import get_skills_manager, IntegratedSkillsManager


class ActionType(Enum):
    """Types of actions the LA can take"""
    RESEARCH = "research"
    CREATE_TOOL = "create_tool"
    EXECUTE_CODE = "execute_code"
    USE_EXISTING_TOOL = "use_existing_tool"
    ASK_USER = "ask_user"
    PRESENT_RESULT = "present_result"
    WAIT_FOR_USER = "wait_for_user"


@dataclass
class ActionResult:
    """Result of an action"""
    success: bool
    action_type: ActionType
    output: str
    data: Dict = field(default_factory=dict)
    next_action: Optional['ActionType'] = None


@dataclass
class Tool:
    """A tool the LA can use"""
    name: str
    description: str
    function: Callable
    parameters: Dict
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


class ToolRegistry:
    """
    Dynamic tool registry - LA can add new tools at runtime
    """
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self._load_existing_tools()

    def _load_existing_tools(self):
        """Load tools from the tools directory"""
        tools_dir = os.path.join(os.path.dirname(__file__), "tools")
        if os.path.exists(tools_dir):
            for filename in os.listdir(tools_dir):
                if filename.endswith(".py") and not filename.startswith("_"):
                    self._load_tool_file(os.path.join(tools_dir, filename))

    def _load_tool_file(self, filepath: str):
        """Dynamically load a tool file"""
        try:
            spec = importlib.util.spec_from_file_location("tool_module", filepath)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # Check for TOOLS definition
                if hasattr(module, 'TOOLS'):
                    for tool_def in module.TOOLS:
                        func_name = tool_def.get('function')
                        if func_name and hasattr(module, func_name):
                            self.register(Tool(
                                name=tool_def.get('name', 'unknown'),
                                description=tool_def.get('description', ''),
                                function=getattr(module, func_name),
                                parameters=tool_def.get('parameters', {})
                            ))
        except Exception as e:
            print(f"   Could not load tool {filepath}: {e}")

    def register(self, tool: Tool):
        """Register a new tool"""
        self.tools[tool.name] = tool
        print(f"   📦 Registered tool: {tool.name}")

    def get(self, name: str) -> Optional[Tool]:
        """Get a tool by name"""
        return self.tools.get(name)

    def find_relevant(self, query: str) -> List[Tool]:
        """Find tools relevant to a query"""
        query_lower = query.lower()
        relevant = []
        for tool in self.tools.values():
            if any(word in tool.description.lower() or word in tool.name.lower()
                   for word in query_lower.split()):
                relevant.append(tool)
        return relevant

    def list_all(self) -> List[Tool]:
        """List all available tools"""
        return list(self.tools.values())


class CodeExecutor:
    """
    Safely executes Python code created by LA
    """
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or os.path.expanduser("~/my-project/download")
        os.makedirs(self.output_dir, exist_ok=True)

    def execute(self, code: str, timeout: int = 120) -> ActionResult:
        """
        Execute Python code and return results
        """
        # Save code to temp file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        script_path = os.path.join(self.output_dir, f"executed_{timestamp}.py")

        # Add necessary imports
        full_code = f'''
import sys
import os
import json
import asyncio

# Output capture
_result = {{}}
_output_lines = []

def capture_output(data):
    _output_lines.append(str(data))

def set_result(key, value):
    _result[key] = value

# User code starts here
{code}

# Return captured output
if _output_lines:
    set_result("output", "\\n".join(_output_lines))
print(json.dumps(_result))
'''

        try:
            with open(script_path, 'w') as f:
                f.write(full_code)

            print(f"   ▶️  Executing code: {script_path}")

            # Run the code
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.output_dir
            )

            if result.returncode == 0:
                output = result.stdout.strip()
                try:
                    data = json.loads(output) if output else {}
                except:
                    data = {"raw_output": output}

                return ActionResult(
                    success=True,
                    action_type=ActionType.EXECUTE_CODE,
                    output=output,
                    data=data
                )
            else:
                return ActionResult(
                    success=False,
                    action_type=ActionType.EXECUTE_CODE,
                    output=result.stderr,
                    data={"error": result.stderr}
                )

        except subprocess.TimeoutExpired:
            return ActionResult(
                success=False,
                action_type=ActionType.EXECUTE_CODE,
                output=f"Execution timed out after {timeout} seconds",
                data={"error": "timeout"}
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type=ActionType.EXECUTE_CODE,
                output=str(e),
                data={"error": str(e)}
            )

    async def execute_async(self, code: str, timeout: int = 120) -> ActionResult:
        """Execute async Python code"""
        # Wrap async code
        wrapped = f'''
import asyncio

async def main():
{chr(10).join("    " + line for line in code.split(chr(10)))}

asyncio.run(main())
'''
        return self.execute(wrapped, timeout)


class AutonomousExecutor:
    """
    The BRAIN - Makes decisions and executes them
    """

    def __init__(self, config: Config = None):
        self.config = config or Config()

        # Initialize LLM
        self.llm = ChatOllama(
            model=self.config.model.HEAD_AGENT_MODEL,
            temperature=0.7,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Fast LLM for quick decisions
        self.fast_llm = ChatOllama(
            model=self.config.model.WORKER_AGENT_MODEL,
            temperature=0.3,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Components
        self.tool_registry = ToolRegistry()
        self.code_executor = CodeExecutor()
        self.skills_manager = get_skills_manager()

        # State
        self.conversation_history: List[Dict] = []
        self.created_tools: Dict[str, str] = {}  # name -> code

    def analyze_request(self, user_request: str) -> Dict:
        """
        Analyze what the user wants and what actions are needed
        """
        available_tools = [t.name for t in self.tool_registry.list_all()]
        available_skills = [s.name for s in self.skills_manager.discovery.list_all()]

        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI that analyzes user requests and determines what actions to take.

Available tools: {tools}
Available skills: {skills}

Analyze the request and respond in this EXACT format:

INTENT: [what the user wants in one sentence]
PLATFORM: [specific platform if mentioned, e.g., telegram, discord, whatsapp, or "none"]
ACTION_TYPE: [one of: use_existing_tool, create_new_tool, use_skill, create_skill, research, ask_user]
TOOL_NEEDED: [name of tool needed, or "new" if doesn't exist, or "skill:skillname" to use a skill]
REASONING: [brief explanation of your decision]
SETUP_NEEDED: [yes/no - does user need to do something like scan QR or click link?]

Be specific and actionable. If a platform integration is needed, specify exactly which platform.
If a skill exists for the platform, use it. If not, create one."""),
            ("human", "User request: {request}")
        ])

        chain = analysis_prompt | self.llm
        response = chain.invoke({
            "request": user_request,
            "tools": ", ".join(available_tools) if available_tools else "none",
            "skills": ", ".join(available_skills) if available_skills else "none"
        })

        return self._parse_analysis(response.content)

    def _parse_analysis(self, response: str) -> Dict:
        """Parse the analysis response"""
        result = {
            "intent": "",
            "platform": "none",
            "action_type": "research",
            "tool_needed": "new",
            "reasoning": "",
            "setup_needed": "no"
        }

        for line in response.split("\n"):
            line = line.strip()
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.lower().strip().replace(" ", "_")
                value = value.strip()

                if key in result:
                    result[key] = value

        return result

    def research_solution(self, topic: str) -> str:
        """
        Research how to accomplish something using web search
        """
        from research_agent import ResearchAgent

        print(f"   🔍 Researching: {topic}")
        researcher = ResearchAgent(self.config)
        return researcher.research(topic)

    def create_tool_for_platform(self, platform: str, purpose: str) -> Tool:
        """
        Create a new tool for a specific platform
        """
        print(f"   🔨 Creating tool for: {platform}")

        # First, research how to integrate
        research = self.research_solution(
            f"How to create a {platform} bot or integration in Python, "
            f"including authentication, sending messages, and receiving messages. "
            f"Purpose: {purpose}"
        )

        # Now create the tool
        creation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Python developer. Create a complete, working tool for the specified platform.

Requirements:
1. Create a Python class or functions that can:
   - Connect/authenticate with the platform
   - Send messages
   - Receive messages (if possible)

2. Include:
   - All necessary imports
   - Setup instructions as comments
   - QR code generation or OAuth link display if needed
   - Error handling

3. Save outputs (QR codes, links) to: {output_dir}

4. Define a TOOLS list at the end with tool definitions

Make the code COMPLETE and WORKING. Include real API endpoints and methods.

Research context:
{research}
"""),
            ("human", """
Platform: {platform}
Purpose: {purpose}

Create the complete Python code:
""")
        ])

        chain = creation_prompt | self.llm
        response = chain.invoke({
            "platform": platform,
            "purpose": purpose,
            "research": research[:2000],  # Limit research context
            "output_dir": self.code_executor.output_dir
        })

        # Extract code
        code = self._extract_code(response.content)

        # Save the tool
        tool_name = f"{platform}_tool"
        tool_path = os.path.join(
            os.path.dirname(__file__),
            "tools",
            f"{tool_name}.py"
        )
        os.makedirs(os.path.dirname(tool_path), exist_ok=True)

        with open(tool_path, 'w') as f:
            f.write(code)

        print(f"   💾 Saved tool to: {tool_path}")

        # Reload tools
        self.tool_registry._load_tool_file(tool_path)

        # Also register as a skill
        self.skills_manager.creator.create_skill_for_platform(
            platform=platform,
            purpose=purpose,
            code=code
        )

        # Return the tool
        tool = self.tool_registry.get(tool_name)
        if tool:
            return tool

        # Create a basic tool entry
        return Tool(
            name=tool_name,
            description=f"Integration with {platform}",
            function=lambda: "Tool created but function not properly defined",
            parameters={}
        )

    def execute_tool(self, tool: Tool, **kwargs) -> ActionResult:
        """
        Execute a tool with parameters
        """
        print(f"   ▶️  Running tool: {tool.name}")

        try:
            if asyncio.iscoroutinefunction(tool.function):
                # Async function
                result = asyncio.run(tool.function(**kwargs))
            else:
                # Sync function
                result = tool.function(**kwargs)

            return ActionResult(
                success=True,
                action_type=ActionType.USE_EXISTING_TOOL,
                output=str(result),
                data={"result": result} if not isinstance(result, dict) else result
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type=ActionType.USE_EXISTING_TOOL,
                output=f"Error: {e}",
                data={"error": str(e)}
            )

    def execute_generated_code(self, code: str) -> ActionResult:
        """
        Execute code that was generated by LA
        """
        return self.code_executor.execute(code)

    def run_setup(self, platform: str) -> ActionResult:
        """
        Run the setup process for a platform
        """
        # Create setup code
        setup_prompt = ChatPromptTemplate.from_messages([
            ("system", """Create a Python script that sets up {platform} integration.

The script should:
1. Initialize the connection
2. Generate QR code or OAuth link if needed
3. Save QR code to: {output_dir}/qr_code.png
4. Print setup instructions for the user
5. Wait for user to complete setup

Use real APIs and methods. Be complete and working."""),
            ("human", "Create the setup script:")
        ])

        chain = setup_prompt | self.llm
        response = chain.invoke({
            "platform": platform,
            "output_dir": self.code_executor.output_dir
        })

        code = self._extract_code(response.content)
        return self.execute_generated_code(code)

    def _extract_code(self, text: str) -> str:
        """Extract Python code from response"""
        if "```python" in text:
            start = text.find("```python") + 9
            end = text.find("```", start)
            return text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            return text[start:end].strip()
        else:
            return text

    def process_request(self, user_request: str) -> str:
        """
        Main entry point - process any user request autonomously
        """
        print(f"\n🧠 LA Processing: {user_request[:50]}...")

        # Step 1: Analyze what's needed
        print("   📊 Analyzing request...")
        analysis = self.analyze_request(user_request)
        print(f"   Intent: {analysis['intent']}")
        print(f"   Platform: {analysis['platform']}")
        print(f"   Action: {analysis['action_type']}")

        # Step 2: Check if we have the needed tool or skill
        tool_needed = analysis['tool_needed']
        platform = analysis['platform']
        action_type = analysis['action_type']

        # Check for existing skills first
        if platform != "none":
            existing_skills = self.skills_manager.discovery.find_for_platform(platform)
            if existing_skills:
                skill = existing_skills[0]
                print(f"   📚 Found existing skill: {skill.name}")
                return self._use_skill(skill, user_request)

        # Create new tool/skill if needed
        if platform != "none" and (tool_needed == "new" or action_type in ["create_new_tool", "create_skill"]):
            # Need to create a tool
            print(f"   🔨 Creating new integration for: {platform}")
            tool = self.create_tool_for_platform(platform, analysis['intent'])
            tool_needed = tool.name

        # Step 3: Find and execute the tool
        if tool_needed != "new" and tool_needed != "none":
            tool = self.tool_registry.get(tool_needed)
            if not tool:
                # Try to find by name similarity
                tools = self.tool_registry.find_relevant(platform)
                if tools:
                    tool = tools[0]

            if tool:
                print(f"   ▶️  Executing: {tool.name}")
                result = self.execute_tool(tool)
                return self._format_result(result, analysis)

        # Step 4: If no tool, research and provide answer
        print("   🔍 No tool available, researching...")
        research = self.research_solution(user_request)
        return f"📚 Research Results:\n\n{research}"

    def _format_result(self, result: ActionResult, analysis: Dict) -> str:
        """Format the result for display"""
        output = f"✅ Completed: {analysis['intent']}\n\n"

        if result.data:
            # Check for QR code
            if 'qr_code_path' in result.data or 'qr_code' in result.data:
                qr_path = result.data.get('qr_code_path') or result.data.get('qr_code')
                output += f"📸 QR Code saved to: {qr_path}\n\n"
                output += "📋 Setup Instructions:\n"
                output += "   1. Open the QR code image\n"
                output += f"   2. Scan it with {analysis['platform'].title()}\n"
                output += "   3. The integration will be connected!\n"

            # Check for link
            if 'link' in result.data or 'url' in result.data:
                link = result.data.get('link') or result.data.get('url')
                output += f"🔗 Link: {link}\n"

            # Add any other output
            if result.output:
                output += f"\n📄 Output:\n{result.output[:1000]}\n"

        if analysis.get('setup_needed') == 'yes':
            output += "\n⏳ Waiting for you to complete setup...\n"

        return output

    def _use_skill(self, skill, user_request: str) -> str:
        """Use a discovered skill"""
        print(f"   📖 Reading skill: {skill.name}")

        # Get skill instructions
        instructions = self.skills_manager.discovery.get_skill_instructions(skill.name)

        # Extract key information from the skill
        extract_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI that extracts actionable steps from skill documentation.

From the skill documentation, extract:
1. How to set up the integration
2. What code to run
3. What the user needs to do

Be specific and provide actual code or commands when available."""),
            ("human", """
User request: {request}

Skill documentation:
{instructions}

Provide the exact steps and code to accomplish the user's request:
""")
        ])

        chain = extract_prompt | self.llm
        response = chain.invoke({
            "request": user_request,
            "instructions": instructions[:5000] if instructions else "No instructions available"
        })

        # Check if there's code to execute
        content = response.content
        if "```python" in content or "```bash" in content:
            # Extract and execute any Python code
            code = self._extract_code(content)
            if code:
                print("   ▶️  Executing skill code...")
                result = self.execute_generated_code(code)
                if result.success:
                    return f"{content}\n\n✅ Execution result:\n{result.output}"
                else:
                    return f"{content}\n\n❌ Execution error:\n{result.output}"

        return content


# Convenience function
def get_executor() -> AutonomousExecutor:
    """Get the global executor instance"""
    return AutonomousExecutor()
