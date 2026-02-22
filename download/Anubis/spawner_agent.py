"""
Spawner Agent - Creates new agents, tools, and integrations dynamically

This agent:
- Creates specialized sub-agents on demand
- Builds custom tools
- Sets up systems and workflows
- Generates working code
"""

import os
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from config import Config, SYSTEM_PROMPTS


@dataclass
class SpawnedAgent:
    """A dynamically created agent"""
    name: str
    role: str
    code: str
    created_at: str
    tools: List[str]


@dataclass
class SpawnedTool:
    """A dynamically created tool"""
    name: str
    description: str
    code: str
    created_at: str
    dependencies: List[str]


class SpawnerAgent:
    """
    Spawner Agent - Creates new agents and tools

    Capabilities:
    - Create specialized agents for specific tasks
    - Build custom tools and integrations
    - Generate working code
    - Set up workflows and systems
    """

    def __init__(self, config: Config = None):
        self.config = config or Config()

        # Initialize LLM for code generation
        self.llm = ChatOllama(
            model=self.config.model.WORKER_AGENT_MODEL,
            temperature=self.config.model.DEFAULT_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Reasoning LLM for design
        self.reasoning_llm = ChatOllama(
            model=self.config.model.HEAD_AGENT_MODEL,
            temperature=self.config.model.REASONING_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Track spawned agents and tools
        self.spawned_agents: Dict[str, SpawnedAgent] = {}
        self.spawned_tools: Dict[str, SpawnedTool] = {}

        # Output directory for generated code
        self.output_dir = "./spawned"
        os.makedirs(self.output_dir, exist_ok=True)

    def design_agent(self, task_description: str) -> Dict:
        """
        Design a new agent based on task requirements

        Returns a design specification for the agent
        """
        design_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI architect. Design a specialized agent for the given task.

Provide a design in this format:

AGENT_NAME: [descriptive name]
ROLE: [what this agent does]
CAPABILITIES: [list of capabilities needed]
TOOLS_NEEDED: [tools this agent needs]
PROMPT_TEMPLATE: [system prompt for the agent]
IMPLEMENTATION_NOTES: [key implementation details]

Design for simplicity and effectiveness. Minimize complexity."""),
            ("human", """
Task: {task}

Design an agent to handle this:
""")
        ])

        chain = design_prompt | self.reasoning_llm
        response = chain.invoke({"task": task_description})

        # Parse the design
        design = self._parse_design(response.content)
        return design

    def _parse_design(self, response: str) -> Dict:
        """Parse agent design from response"""
        design = {
            "name": "custom_agent",
            "role": "",
            "capabilities": [],
            "tools_needed": [],
            "prompt_template": "",
            "implementation_notes": ""
        }

        lines = response.split("\n")
        current_field = None

        for line in lines:
            line = line.strip()
            if "AGENT_NAME:" in line:
                design["name"] = line.split(":", 1)[1].strip().lower().replace(" ", "_")
            elif "ROLE:" in line:
                design["role"] = line.split(":", 1)[1].strip()
            elif "CAPABILITIES:" in line:
                current_field = "capabilities"
                caps = line.split(":", 1)[1].strip() if ":" in line else ""
                if caps:
                    design["capabilities"].append(caps)
            elif "TOOLS_NEEDED:" in line:
                current_field = "tools"
            elif "PROMPT_TEMPLATE:" in line:
                design["prompt_template"] = line.split(":", 1)[1].strip()
            elif "IMPLEMENTATION_NOTES:" in line:
                design["implementation_notes"] = line.split(":", 1)[1].strip()
            elif current_field == "capabilities" and line.startswith(("-", "*")):
                design["capabilities"].append(line.lstrip("-* ").strip())
            elif current_field == "tools" and line.startswith(("-", "*")):
                design["tools_needed"].append(line.lstrip("-* ").strip())

        return design

    def generate_agent_code(self, design: Dict) -> str:
        """
        Generate executable Python code for an agent
        """
        code_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Python programmer. Generate clean, working code.

Create a complete Python class for the agent following this template:

```python
class {agent_name}Agent:
    \"\"\"
    {role}
    \"\"\"

    def __init__(self, config=None):
        from langchain_ollama import ChatOllama
        self.llm = ChatOllama(model="qwen2.5:14b")

    def run(self, task: str) -> str:
        \"\"\"Execute the agent's main function\"\"\"
        # Implementation here
        pass
```

Make the code complete and functional. Include error handling."""),
            ("human", """
Agent Design:
Name: {name}
Role: {role}
Capabilities: {capabilities}
Tools Needed: {tools}
Prompt: {prompt}

Generate complete Python code:
""")
        ])

        chain = code_prompt | self.llm
        response = chain.invoke({
            "name": design.get("name", "custom"),
            "role": design.get("role", ""),
            "capabilities": ", ".join(design.get("capabilities", [])),
            "tools": ", ".join(design.get("tools_needed", [])),
            "prompt": design.get("prompt_template", "")
        })

        # Extract code from response
        code = self._extract_code(response.content)
        return code

    def design_tool(self, tool_description: str) -> Dict:
        """
        Design a new tool based on requirements
        """
        design_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a tool designer. Design a Python tool for the given requirement.

Provide:
TOOL_NAME: [function name, snake_case]
DESCRIPTION: [what it does]
PARAMETERS: [list of parameters with types]
RETURNS: [return type and description]
DEPENDENCIES: [required packages]
LOGIC: [brief description of implementation]"""),
            ("human", """
Requirement: {requirement}

Design the tool:
""")
        ])

        chain = design_prompt | self.reasoning_llm
        response = chain.invoke({"requirement": tool_description})

        return self._parse_tool_design(response.content)

    def _parse_tool_design(self, response: str) -> Dict:
        """Parse tool design from response"""
        design = {
            "name": "custom_tool",
            "description": "",
            "parameters": [],
            "returns": "",
            "dependencies": [],
            "logic": ""
        }

        lines = response.split("\n")
        for line in lines:
            line = line.strip()
            if "TOOL_NAME:" in line:
                design["name"] = line.split(":", 1)[1].strip()
            elif "DESCRIPTION:" in line:
                design["description"] = line.split(":", 1)[1].strip()
            elif "PARAMETERS:" in line:
                params = line.split(":", 1)[1].strip()
                if params:
                    design["parameters"].append(params)
            elif "RETURNS:" in line:
                design["returns"] = line.split(":", 1)[1].strip()
            elif "DEPENDENCIES:" in line:
                deps = line.split(":", 1)[1].strip()
                if deps:
                    design["dependencies"] = [d.strip() for d in deps.split(",")]
            elif "LOGIC:" in line:
                design["logic"] = line.split(":", 1)[1].strip()

        return design

    def generate_tool_code(self, design: Dict) -> str:
        """
        Generate executable Python code for a tool
        """
        code_prompt = ChatPromptTemplate.from_messages([
            ("system", """Generate a complete, working Python function for the tool.

Use this template:
```python
def {tool_name}({parameters}) -> {return_type}:
    \"\"\"
    {description}
    \"\"\"
    # Implementation
    pass
```

Include:
- Proper error handling
- Type hints
- Docstrings
- Working implementation"""),
            ("human", """
Tool Design:
Name: {name}
Description: {description}
Parameters: {parameters}
Returns: {returns}
Logic: {logic}

Generate code:
""")
        ])

        chain = code_prompt | self.llm
        response = chain.invoke({
            "name": design.get("name", "tool"),
            "description": design.get("description", ""),
            "parameters": ", ".join(design.get("parameters", [])),
            "returns": design.get("returns", "str"),
            "logic": design.get("logic", "")
        })

        return self._extract_code(response.content)

    def _extract_code(self, text: str) -> str:
        """Extract code from markdown code blocks"""
        # Try to extract from code blocks
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

    def spawn_agent(self, task_description: str) -> SpawnedAgent:
        """
        Create and register a new agent
        """
        print(f"🤖 Spawning agent for: {task_description[:50]}...")

        # Design the agent
        design = self.design_agent(task_description)

        # Generate code
        code = self.generate_agent_code(design)

        # Create the agent record
        agent = SpawnedAgent(
            name=design["name"],
            role=design["role"],
            code=code,
            created_at=datetime.now().isoformat(),
            tools=design["tools_needed"]
        )

        # Register it
        self.spawned_agents[agent.name] = agent

        # Save to file
        self._save_agent(agent)

        print(f"   ✅ Spawned: {agent.name}")
        return agent

    def spawn_tool(self, tool_description: str) -> SpawnedTool:
        """
        Create and register a new tool
        """
        print(f"🔧 Creating tool: {tool_description[:50]}...")

        # Design the tool
        design = self.design_tool(tool_description)

        # Generate code
        code = self.generate_tool_code(design)

        # Create the tool record
        tool = SpawnedTool(
            name=design["name"],
            description=design["description"],
            code=code,
            created_at=datetime.now().isoformat(),
            dependencies=design["dependencies"]
        )

        # Register it
        self.spawned_tools[tool.name] = tool

        # Save to file
        self._save_tool(tool)

        print(f"   ✅ Created: {tool.name}")
        return tool

    def _save_agent(self, agent: SpawnedAgent):
        """Save agent code to file"""
        filepath = os.path.join(self.output_dir, f"agent_{agent.name}.py")

        content = f'''"""
Auto-generated Agent: {agent.name}
Role: {agent.role}
Created: {agent.created_at}
"""

{agent.code}


# Usage example
if __name__ == "__main__":
    agent = {agent.name.capitalize()}Agent()
    result = agent.run("test task")
    print(result)
'''
        with open(filepath, 'w') as f:
            f.write(content)

    def _save_tool(self, tool: SpawnedTool):
        """Save tool code to file"""
        filepath = os.path.join(self.output_dir, f"tool_{tool.name}.py")

        content = f'''"""
Auto-generated Tool: {tool.name}
Description: {tool.description}
Created: {tool.created_at}
Dependencies: {tool.dependencies}
"""

{tool.code}
'''
        with open(filepath, 'w') as f:
            f.write(content)

    def create_workflow(self, workflow_description: str) -> str:
        """
        Create an n8n-like workflow or automation
        """
        print(f"⚡ Creating workflow: {workflow_description[:50]}...")

        workflow_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a workflow automation expert. Create a complete Python workflow script.

The script should:
1. Define clear steps
2. Handle errors gracefully
3. Log progress
4. Be runnable standalone
5. Require minimal setup

Generate complete, working code that can be executed immediately."""),
            ("human", """
Create a workflow for: {description}

Generate the complete Python script:
""")
        ])

        chain = workflow_prompt | self.llm
        response = chain.invoke({"description": workflow_description})

        code = self._extract_code(response.content)

        # Save workflow
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(self.output_dir, f"workflow_{timestamp}.py")

        with open(filepath, 'w') as f:
            f.write(f'"""\nWorkflow: {workflow_description}\nCreated: {datetime.now().isoformat()}\n"""\n\n{code}')

        print(f"   ✅ Saved to: {filepath}")
        return filepath

    def create_integration(self, integration_description: str) -> Dict:
        """
        Create an integration setup (API connections, webhooks, etc.)
        """
        print(f"🔗 Creating integration: {integration_description[:50]}...")

        integration_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an integration specialist. Create a complete integration setup.

Provide:
1. SETUP_STEPS: Step-by-step setup instructions
2. CODE: Working Python code for the integration
3. CONFIG_NEEDED: Configuration values needed from user
4. MINIMAL_HUMAN_STEPS: What the user must do (keep minimal)

Focus on the easiest path. Use OAuth, webhooks, or API keys as appropriate."""),
            ("human", """
Integration needed: {description}

Create the integration:
""")
        ])

        chain = integration_prompt | self.reasoning_llm
        response = chain.invoke({"description": integration_description})

        # Parse and save
        code = self._extract_code(response.content)

        integration = {
            "description": integration_description,
            "setup": response.content,
            "code": code,
            "created_at": datetime.now().isoformat()
        }

        # Save integration code
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(self.output_dir, f"integration_{timestamp}.py")

        with open(filepath, 'w') as f:
            f.write(f'"""\nIntegration: {integration_description}\nCreated: {integration["created_at"]}\n"""\n\n{code}')

        print(f"   ✅ Integration saved to: {filepath}")
        return integration

    def spawn(self, task_description: str) -> str:
        """
        Main spawn method - figures out what to create and creates it
        """
        # Analyze what's needed
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """Analyze this task and determine what needs to be created:

- AGENT: If a new specialized agent is needed
- TOOL: If a new tool/function is needed
- WORKFLOW: If an automation/workflow is needed
- INTEGRATION: If an API/service connection is needed

Output format:
TYPE: [agent/tool/workflow/integration]
REASON: [why this type]
DESCRIPTION: [specific what to create]"""),
            ("human", "Task: {task}")
        ])

        chain = analysis_prompt | self.reasoning_llm
        response = chain.invoke({"task": task_description})

        # Determine type
        content = response.content.lower()

        if "agent" in content and "type:" in content:
            agent = self.spawn_agent(task_description)
            return f"Created agent: {agent.name}\n\nCode saved to: {self.output_dir}/agent_{agent.name}.py"

        elif "tool" in content and "type:" in content:
            tool = self.spawn_tool(task_description)
            return f"Created tool: {tool.name}\n\nCode saved to: {self.output_dir}/tool_{tool.name}.py"

        elif "workflow" in content and "type:" in content:
            filepath = self.create_workflow(task_description)
            return f"Created workflow: {filepath}"

        else:
            # Default to integration
            integration = self.create_integration(task_description)
            return f"Created integration:\n\n{integration['setup']}"


def main():
    """Test the spawner agent"""
    spawner = SpawnerAgent()

    print("🛠️ Spawner Agent")
    print("=" * 50)

    while True:
        task = input("\nWhat do you want to create? (or 'quit'): ").strip()

        if task.lower() in ['quit', 'exit']:
            break

        if not task:
            continue

        result = spawner.spawn(task)
        print(f"\n{result}")


if __name__ == "__main__":
    main()
