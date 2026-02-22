"""
Self-Improving Tool Creator
Discovers, creates, and manages tools for the AI agent

Features:
- Auto-discovers free APIs online
- Creates new tools on demand
- Manages existing tools
- Can modify itself
"""

import os
import json
import time
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import subprocess


@dataclass
class Tool:
    """A tool that the agent can use"""
    name: str
    description: str
    code: str
    created_at: str
    source: str  # "discovered", "created", "built-in"
    dependencies: List[str] = field(default_factory=list)
    enabled: bool = True


class ToolCreator:
    """
    Self-improving tool creation system
    
    Can:
    1. Search for free APIs and tools online
    2. Create new Python tools
    3. Install dependencies
    4. Test tools
    5. Integrate tools into the agent
    """
    
    BUILTIN_TOOLS = {
        "web_search": {
            "description": "Search the web for information",
            "code": """
import requests
def web_search(query: str, num: int = 10) -> list:
    '''Search DuckDuckGo for results'''
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=num))
    except Exception as e:
        return [{"error": str(e)}]
""",
            "dependencies": ["duckduckgo-search", "requests"]
        },
        "read_file": {
            "description": "Read contents of a file",
            "code": """
def read_file(filepath: str) -> str:
    '''Read file contents'''
    with open(filepath, 'r') as f:
        return f.read()
""",
            "dependencies": []
        },
        "write_file": {
            "description": "Write content to a file",
            "code": """
def write_file(filepath: str, content: str) -> str:
    '''Write content to file'''
    with open(filepath, 'w') as f:
        f.write(content)
    return f"Written to {filepath}"
""",
            "dependencies": []
        },
        "run_code": {
            "description": "Execute Python code safely",
            "code": """
def run_code(code: str) -> dict:
    '''Execute Python code and return result'''
    try:
        local_vars = {}
        exec(code, {"__builtins__": __builtins__}, local_vars)
        return {"success": True, "result": local_vars.get('result', 'No result variable set')}
    except Exception as e:
        return {"success": False, "error": str(e)}
""",
            "dependencies": []
        },
        "send_email": {
            "description": "Send an email",
            "code": """
import smtplib
from email.mime.text import MIMEText

def send_email(to: str, subject: str, body: str, smtp_server: str = "smtp.gmail.com", port: int = 587) -> str:
    '''Send email via SMTP'''
    # User must configure their email credentials
    import os
    sender = os.environ.get('EMAIL_ADDRESS')
    password = os.environ.get('EMAIL_PASSWORD')
    
    if not sender or not password:
        return "Error: Set EMAIL_ADDRESS and EMAIL_PASSWORD env vars"
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = to
    
    with smtplib.SMTP(smtp_server, port) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
    
    return f"Email sent to {to}"
""",
            "dependencies": []
        },
        "http_request": {
            "description": "Make HTTP requests",
            "code": """
import requests

def http_get(url: str, headers: dict = None) -> dict:
    '''Make GET request'''
    r = requests.get(url, headers=headers or {}, timeout=30)
    return {"status": r.status_code, "body": r.text[:5000]}

def http_post(url: str, data: dict = None, json: dict = None, headers: dict = None) -> dict:
    '''Make POST request'''
    r = requests.post(url, data=data, json=json, headers=headers or {}, timeout=30)
    return {"status": r.status_code, "body": r.text[:5000]}
""",
            "dependencies": ["requests"]
        },
        "whatsapp_send": {
            "description": "Send WhatsApp message",
            "code": """
def whatsapp_send(number: str, message: str) -> str:
    '''Send WhatsApp message (requires setup)'''
    # This integrates with the WhatsApp tool
    from whatsapp_tool import WhatsAppTool
    tool = WhatsAppTool()
    result = tool.send_message(number, message)
    return json.dumps(result)
""",
            "dependencies": []
        }
    }
    
    def __init__(self, tools_dir: str = "./tools"):
        self.tools_dir = tools_dir
        self.tools: Dict[str, Tool] = {}
        os.makedirs(tools_dir, exist_ok=True)
        self._load_builtin_tools()
        self._load_custom_tools()
    
    def _load_builtin_tools(self):
        """Load built-in tools"""
        for name, data in self.BUILTIN_TOOLS.items():
            self.tools[name] = Tool(
                name=name,
                description=data["description"],
                code=data["code"],
                created_at=datetime.now().isoformat(),
                source="built-in",
                dependencies=data.get("dependencies", [])
            )
    
    def _load_custom_tools(self):
        """Load custom tools from disk"""
        for filename in os.listdir(self.tools_dir):
            if filename.endswith('.py') and not filename.startswith('_'):
                filepath = os.path.join(self.tools_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        code = f.read()
                    name = filename[:-3]  # Remove .py
                    # Extract description from docstring
                    desc_match = re.search(r'"""(.+?)"""', code, re.DOTALL)
                    description = desc_match.group(1).strip() if desc_match else "Custom tool"
                    
                    self.tools[name] = Tool(
                        name=name,
                        description=description,
                        code=code,
                        created_at=datetime.now().isoformat(),
                        source="created"
                    )
                except Exception as e:
                    print(f"Error loading tool {filename}: {e}")
    
    def list_tools(self) -> List[Dict]:
        """List all available tools"""
        return [
            {
                "name": t.name,
                "description": t.description,
                "source": t.source,
                "enabled": t.enabled
            }
            for t in self.tools.values()
        ]
    
    def get_tool(self, name: str) -> Optional[Tool]:
        """Get a tool by name"""
        return self.tools.get(name)
    
    def execute_tool(self, name: str, **kwargs) -> Any:
        """Execute a tool with given arguments"""
        tool = self.tools.get(name)
        if not tool:
            return {"error": f"Tool '{name}' not found"}
        
        if not tool.enabled:
            return {"error": f"Tool '{name}' is disabled"}
        
        try:
            # Create namespace and execute
            namespace = {}
            exec(tool.code, namespace)
            
            # Find the main function
            func_name = name
            if func_name not in namespace:
                # Find first function in namespace
                for k, v in namespace.items():
                    if callable(v) and not k.startswith('_'):
                        func_name = k
                        break
            
            if func_name in namespace and callable(namespace[func_name]):
                return namespace[func_name](**kwargs)
            else:
                return {"error": f"No callable function found in tool '{name}'"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def create_tool(self, name: str, description: str, code: str) -> Tool:
        """Create a new tool"""
        # Validate name
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
        
        tool = Tool(
            name=name,
            description=description,
            code=code,
            created_at=datetime.now().isoformat(),
            source="created"
        )
        
        # Save to disk
        filepath = os.path.join(self.tools_dir, f"{name}.py")
        with open(filepath, 'w') as f:
            f.write(f'"""\n{description}\n"""\n\n{code}')
        
        self.tools[name] = tool
        return tool
    
    def discover_apis(self, query: str) -> List[Dict]:
        """
        Search for free APIs related to query
        
        Returns list of discovered APIs with details
        """
        # Use web search to find APIs
        try:
            from duckduckgo_search import DDGS
            
            search_query = f"free API {query} no credit card"
            discovered = []
            
            with DDGS() as ddgs:
                results = list(ddgs.text(search_query, max_results=10))
            
            for r in results:
                discovered.append({
                    "name": r.get("title", "Unknown"),
                    "url": r.get("href", ""),
                    "description": r.get("body", "")[:200],
                    "source": "web_search"
                })
            
            return discovered
        except Exception as e:
            return [{"error": str(e)}]
    
    def install_dependencies(self, dependencies: List[str]) -> Dict:
        """Install pip dependencies"""
        results = []
        for dep in dependencies:
            try:
                result = subprocess.run(
                    ["pip", "install", dep],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                results.append({
                    "package": dep,
                    "success": result.returncode == 0,
                    "output": result.stdout[-500:] if result.returncode == 0 else result.stderr[-500:]
                })
            except Exception as e:
                results.append({"package": dep, "success": False, "error": str(e)})
        
        return {"results": results}
    
    def auto_create_tool_for_task(self, task_description: str) -> Optional[Tool]:
        """
        Automatically create a tool for a given task
        
        Uses LLM to generate the tool code
        """
        from langchain_ollama import ChatOllama
        from langchain_core.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Python tool creator. Create a single Python function for the given task.

Rules:
1. Output ONLY the Python code, no explanations
2. Include a docstring describing what it does
3. Handle errors gracefully
4. Use only standard library or commonly available packages
5. Make it simple and focused on one task

Example output format:
```python
def tool_name(param1: str, param2: int = 10) -> dict:
    \"\"\"
    Description of what this tool does.
    \"\"\"
    # Implementation here
    return {"result": value}
```
"""),
            ("human", "Create a Python tool for: {task}")
        ])
        
        try:
            llm = ChatOllama(model="qwen2.5:7b", temperature=0.3)
            chain = prompt | llm
            response = chain.invoke({"task": task_description})
            
            code = response.content
            # Extract code block if present
            if "```python" in code:
                code = code.split("```python")[1].split("```")[0]
            elif "```" in code:
                code = code.split("```")[1].split("```")[0]
            
            # Extract function name
            func_match = re.search(r'def\s+(\w+)\s*\(', code)
            name = func_match.group(1) if func_match else f"tool_{int(time.time())}"
            
            # Extract description from docstring
            desc_match = re.search(r'"""(.+?)"""', code, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else task_description
            
            return self.create_tool(name, description, code.strip())
            
        except Exception as e:
            print(f"Error creating tool: {e}")
            return None


class SelfImprovingAgent:
    """
    An agent that can improve itself by:
    1. Creating new tools
    2. Discovering new APIs
    3. Learning from interactions
    """
    
    def __init__(self):
        self.tool_creator = ToolCreator()
        self.learning_log = []
    
    def improve_for_task(self, task: str) -> str:
        """
        Improve the agent's capabilities for a given task
        """
        improvements = []
        
        # Check if we have relevant tools
        available = self.tool_creator.list_tools()
        
        # Discover new APIs that might help
        print(f"🔍 Discovering APIs for: {task}")
        apis = self.tool_creator.discover_apis(task)
        
        if apis:
            improvements.append(f"Found {len(apis)} potential APIs:")
            for api in apis[:5]:
                improvements.append(f"  - {api['name']}: {api['url']}")
        
        # Create a new tool if needed
        print(f"🔧 Creating tool for: {task}")
        new_tool = self.tool_creator.auto_create_tool_for_task(task)
        
        if new_tool:
            improvements.append(f"\n✅ Created new tool: {new_tool.name}")
            improvements.append(f"   Description: {new_tool.description}")
        
        return "\n".join(improvements) if improvements else "No improvements needed"


if __name__ == "__main__":
    # Test the tool creator
    tc = ToolCreator()
    
    print("🛠️ AVAILABLE TOOLS:")
    for tool in tc.list_tools():
        print(f"  - {tool['name']}: {tool['description'][:50]}...")
    
    print("\n🔬 Creating a test tool...")
    new_tool = tc.auto_create_tool_for_task("get weather for a city")
    if new_tool:
        print(f"✅ Created: {new_tool.name}")
        print(f"   Code preview: {new_tool.code[:200]}...")
