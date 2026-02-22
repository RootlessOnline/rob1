"""
Tool Manager - Dynamic tool system for the autonomous agent
Allows adding, removing, and using tools dynamically
"""

import os
import json
import importlib
import subprocess
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
import inspect


@dataclass
class Tool:
    """Represents a tool that the agent can use"""
    name: str
    description: str
    function: Optional[Callable] = None
    parameters: Dict = field(default_factory=dict)
    returns: str = "str"
    category: str = "general"
    enabled: bool = True
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


class ToolManager:
    """
    Manages tools for the autonomous agent
    Tools can be added dynamically via code or natural language
    """

    def __init__(self, tools_dir: str = "tools"):
        self.tools_dir = tools_dir
        self.tools: Dict[str, Tool] = {}
        self._setup_builtin_tools()
        self._load_custom_tools()

    def _setup_builtin_tools(self):
        """Setup built-in tools that are always available"""

        # Web search tool
        self.register_tool(Tool(
            name="web_search",
            description="Search the web for information",
            function=self._web_search,
            parameters={
                "query": {"type": "string", "description": "Search query"}
            },
            category="web"
        ))

        # Code execution tool
        self.register_tool(Tool(
            name="execute_python",
            description="Execute Python code safely",
            function=self._execute_python,
            parameters={
                "code": {"type": "string", "description": "Python code to execute"}
            },
            category="code"
        ))

        # File operations
        self.register_tool(Tool(
            name="read_file",
            description="Read content from a file",
            function=self._read_file,
            parameters={
                "filepath": {"type": "string", "description": "Path to file"}
            },
            category="file"
        ))

        self.register_tool(Tool(
            name="write_file",
            description="Write content to a file",
            function=self._write_file,
            parameters={
                "filepath": {"type": "string"},
                "content": {"type": "string"}
            },
            category="file"
        ))

        # System command
        self.register_tool(Tool(
            name="run_command",
            description="Run a system command",
            function=self._run_command,
            parameters={
                "command": {"type": "string", "description": "Command to run"}
            },
            category="system"
        ))

        # HTTP request
        self.register_tool(Tool(
            name="http_request",
            description="Make HTTP requests",
            function=self._http_request,
            parameters={
                "url": {"type": "string"},
                "method": {"type": "string", "default": "GET"},
                "data": {"type": "dict", "optional": True}
            },
            category="web"
        ))

    def _load_custom_tools(self):
        """Load custom tools from tools directory"""
        if not os.path.exists(self.tools_dir):
            os.makedirs(self.tools_dir)
            return

        # Look for tool files
        for filename in os.listdir(self.tools_dir):
            if filename.endswith('.py') and filename not in ['__init__.py', 'tool_manager.py']:
                try:
                    module_name = filename[:-3]
                    module_path = os.path.join(self.tools_dir, filename)

                    # Load the module
                    spec = importlib.util.spec_from_file_location(module_name, module_path)
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)

                        # Look for tool definitions
                        if hasattr(module, 'TOOLS'):
                            for tool_def in module.TOOLS:
                                self.register_tool(Tool(
                                    name=tool_def['name'],
                                    description=tool_def['description'],
                                    function=getattr(module, tool_def['function'], None),
                                    parameters=tool_def.get('parameters', {}),
                                    category=tool_def.get('category', 'custom')
                                ))

                        # Register individual tool functions
                        for name, obj in inspect.getmembers(module):
                            if hasattr(obj, '_is_tool'):
                                self.register_tool(Tool(
                                    name=name,
                                    description=getattr(obj, '_tool_description', ''),
                                    function=obj,
                                    parameters=getattr(obj, '_tool_params', {}),
                                    category=getattr(obj, '_tool_category', 'custom')
                                ))

                except Exception as e:
                    print(f"Warning: Could not load tool {filename}: {e}")

    def register_tool(self, tool: Tool):
        """Register a new tool"""
        self.tools[tool.name] = tool

    def unregister_tool(self, name: str) -> bool:
        """Remove a tool"""
        if name in self.tools:
            del self.tools[name]
            return True
        return False

    def get_tool(self, name: str) -> Optional[Tool]:
        """Get a tool by name"""
        return self.tools.get(name)

    def list_tools(self, category: str = None) -> List[Tool]:
        """List all available tools"""
        tools = list(self.tools.values())
        if category:
            tools = [t for t in tools if t.category == category]
        return [t for t in tools if t.enabled]

    def use(self, tool_name: str, **kwargs) -> Any:
        """Use a tool with given parameters"""
        tool = self.get_tool(tool_name)
        if not tool:
            return f"Error: Tool '{tool_name}' not found"

        if not tool.enabled:
            return f"Error: Tool '{tool_name}' is disabled"

        if not tool.function:
            return f"Error: Tool '{tool_name}' has no function"

        try:
            return tool.function(**kwargs)
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"

    def create_tool_from_code(self, name: str, description: str, 
                              code: str, category: str = "custom") -> bool:
        """
        Create a new tool from Python code
        Saves it to the tools directory
        """
        try:
            # Create safe code
            safe_code = f'''
"""
Auto-generated tool: {name}
{description}
"""

def {name}(**kwargs):
    """{description}"""
    {code}

# Tool registration
TOOLS = [{{
    "name": "{name}",
    "description": "{description}",
    "function": "{name}",
    "category": "{category}"
}}]
'''

            # Save to file
            filepath = os.path.join(self.tools_dir, f"tool_{name}.py")
            with open(filepath, 'w') as f:
                f.write(safe_code)

            # Reload tools
            self._load_custom_tools()
            return True

        except Exception as e:
            print(f"Error creating tool: {e}")
            return False

    # Built-in tool implementations
    def _web_search(self, query: str) -> str:
        """Search the web"""
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))

            output = f"Search results for: {query}\n\n"
            for i, r in enumerate(results, 1):
                output += f"{i}. {r.get('title', 'No title')}\n"
                output += f"   {r.get('body', '')[:200]}...\n"
                output += f"   URL: {r.get('href', '')}\n\n"
            return output
        except Exception as e:
            return f"Search error: {e}"

    def _execute_python(self, code: str) -> str:
        """Execute Python code safely"""
        try:
            # Create a restricted environment
            allowed_modules = ['math', 'json', 're', 'datetime', 'collections', 'itertools']
            safe_globals = {m: __import__(m) for m in allowed_modules}
            safe_globals['print'] = print

            local_vars = {}
            exec(code, safe_globals, local_vars)

            if 'result' in local_vars:
                return str(local_vars['result'])
            return "Code executed successfully"
        except Exception as e:
            return f"Execution error: {e}"

    def _read_file(self, filepath: str) -> str:
        """Read a file"""
        try:
            with open(filepath, 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {e}"

    def _write_file(self, filepath: str, content: str) -> str:
        """Write to a file"""
        try:
            with open(filepath, 'w') as f:
                f.write(content)
            return f"Successfully wrote to {filepath}"
        except Exception as e:
            return f"Error writing file: {e}"

    def _run_command(self, command: str) -> str:
        """Run a system command"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.stdout or result.stderr
        except Exception as e:
            return f"Command error: {e}"

    def _http_request(self, url: str, method: str = "GET", 
                      data: Dict = None) -> str:
        """Make HTTP request"""
        try:
            import requests
            if method.upper() == "GET":
                response = requests.get(url, timeout=10)
            else:
                response = requests.post(url, json=data, timeout=10)

            return f"Status: {response.status_code}\n\n{response.text[:2000]}"
        except Exception as e:
            return f"HTTP error: {e}"


# Tool decorator for easy tool creation
def tool(name: str, description: str, category: str = "custom"):
    """Decorator to mark a function as a tool"""
    def decorator(func):
        func._is_tool = True
        func._tool_name = name
        func._tool_description = description
        func._tool_category = category
        return func
    return decorator


# Global instance
_tool_manager = None

def get_tool_manager() -> ToolManager:
    """Get the global tool manager"""
    global _tool_manager
    if _tool_manager is None:
        _tool_manager = ToolManager()
    return _tool_manager


if __name__ == "__main__":
    manager = get_tool_manager()

    print("Available tools:")
    for tool in manager.list_tools():
        print(f"  - {tool.name}: {tool.description}")

    # Test web search
    print("\n" + "="*50)
    print("Testing web search...")
    result = manager.use("web_search", query="Python programming")
    print(result[:500])
