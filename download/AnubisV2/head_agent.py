"""
Head Agent (Supervisor) - The Brain of the Autonomous System
FIXED VERSION - Works better with smaller models
"""

from typing import TypedDict, List, Optional, Any, Dict, Annotated
from dataclasses import dataclass, field
import operator
import json
from enum import Enum

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import Config, SYSTEM_PROMPTS


class AgentState(Enum):
    """States the Head Agent can be in"""
    IDLE = "idle"
    ANALYZING = "analyzing"
    PLANNING = "planning"
    DELEGATING = "delegating"
    EXECUTING = "executing"
    EVALUATING = "evaluating"
    IMPROVING = "improving"
    COMPLETED = "completed"


class TaskStatus(Enum):
    """Status of a task"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_IMPROVEMENT = "needs_improvement"


@dataclass
class Task:
    """Represents a task to be executed"""
    id: str
    description: str
    assigned_agent: str
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[str] = None
    iterations: int = 0
    max_iterations: int = 3


@dataclass
class AgentStateData:
    """State data for the agent system"""
    user_request: str
    current_state: AgentState = AgentState.IDLE
    tasks: List[Task] = field(default_factory=list)
    completed_tasks: List[Task] = field(default_factory=list)
    current_task: Optional[Task] = None
    iterations: int = 0
    max_iterations: int = 10
    research_findings: List[str] = field(default_factory=list)
    plan: Optional[str] = None
    final_output: Optional[str] = None
    needs_improvement: bool = False
    improvement_suggestions: List[str] = field(default_factory=list)
    spawned_agents: List[str] = field(default_factory=list)
    conversation_history: List[Dict] = field(default_factory=list)


class HeadAgent:
    """
    The Head Agent - Supervisor of the entire system
    """

    def __init__(self, config: Config = None):
        self.config = config or Config()

        # Initialize the main LLM
        self.llm = ChatOllama(
            model=self.config.model.HEAD_AGENT_MODEL,
            temperature=self.config.model.REASONING_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL,
            num_ctx=self.config.model.MAX_TOKENS
        )

        # Worker LLM for faster tasks
        self.worker_llm = ChatOllama(
            model=self.config.model.WORKER_AGENT_MODEL,
            temperature=self.config.model.DEFAULT_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Sub-agents (will be initialized)
        self.research_agent = None
        self.planning_agent = None
        self.spawner_agent = None

        # State
        self.state = AgentState.IDLE
        self.current_task = None

    def create_simple_plan(self, user_request: str) -> List[Task]:
        """
        Create a simple, reliable plan that works with smaller models
        """
        # Detect what kind of task this is
        request_lower = user_request.lower()
        
        tasks = []
        task_id = 1
        
        # Always start with research if it involves information gathering
        if any(word in request_lower for word in ['research', 'find', 'search', 'what', 'latest', 'news', 'how', 'why', 'where', 'when', 'who', 'discover']):
            tasks.append(Task(
                id=f"task_{task_id}",
                description=f"Research: {user_request}",
                assigned_agent="research",
                status=TaskStatus.PENDING
            ))
            task_id += 1
        
        # Add planning for complex tasks
        if any(word in request_lower for word in ['create', 'build', 'make', 'setup', 'install', 'develop', 'implement']):
            tasks.append(Task(
                id=f"task_{task_id}",
                description=f"Plan the approach for: {user_request}",
                assigned_agent="planning",
                status=TaskStatus.PENDING
            ))
            task_id += 1
            
            tasks.append(Task(
                id=f"task_{task_id}",
                description=f"Execute the plan and create the solution",
                assigned_agent="spawner",
                status=TaskStatus.PENDING
            ))
            task_id += 1
        
        # If no specific tasks detected, default to research
        if not tasks:
            tasks.append(Task(
                id=f"task_{task_id}",
                description=f"Research and answer: {user_request}",
                assigned_agent="research",
                status=TaskStatus.PENDING
            ))
        
        return tasks

    def delegate_task(self, task: Task) -> str:
        """
        Delegate a task to the appropriate agent
        """
        if task.assigned_agent == "research":
            return self._delegate_to_research(task)
        elif task.assigned_agent == "planning":
            return self._delegate_to_planning(task)
        elif task.assigned_agent == "spawner":
            return self._delegate_to_spawner(task)
        else:
            return self._execute_directly(task)

    def _delegate_to_research(self, task: Task) -> str:
        """Delegate to research agent"""
        if not self.research_agent:
            from research_agent import ResearchAgent
            self.research_agent = ResearchAgent(self.config)

        return self.research_agent.research(task.description)

    def _delegate_to_planning(self, task: Task) -> str:
        """Delegate to planning agent"""
        if not self.planning_agent:
            from planning_agent import PlanningAgent
            self.planning_agent = PlanningAgent(self.config)

        return self.planning_agent.create_detailed_plan(task.description)

    def _delegate_to_spawner(self, task: Task) -> str:
        """Delegate to spawner agent"""
        if not self.spawner_agent:
            from spawner_agent import SpawnerAgent
            self.spawner_agent = SpawnerAgent(self.config)

        return self.spawner_agent.spawn(task.description)

    def _execute_directly(self, task: Task) -> str:
        """Execute a task directly"""
        execution_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a task executor. Complete the given task and provide a detailed result."),
            ("human", "Task: {task}")
        ])

        chain = execution_prompt | self.worker_llm
        response = chain.invoke({"task": task.description})
        return response.content

    def determine_completion(self, state: AgentStateData) -> bool:
        """
        Determine if the overall goal is achieved
        """
        # Check iteration limit first
        if state.iterations >= state.max_iterations:
            return True

        # If no tasks created yet, we're not done
        if not state.tasks and state.iterations == 0:
            return False

        # If tasks exist, check if all are completed or failed
        if state.tasks:
            pending_tasks = [t for t in state.tasks if t.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED]]
            if not pending_tasks:
                return True

        return False

    def generate_final_output(self, state: AgentStateData) -> str:
        """
        Generate the final output for the user
        """
        # If we have research findings, use them
        if state.research_findings:
            output = "📊 **Research Results:**\n\n"
            for i, finding in enumerate(state.research_findings, 1):
                output += f"{finding}\n\n"
            return output
        
        # If we have completed tasks, summarize them
        if state.completed_tasks:
            output = "✅ **Completed Tasks:**\n\n"
            for task in state.completed_tasks:
                output += f"**{task.description[:60]}...**\n"
                if task.result:
                    output += f"{task.result[:500]}...\n\n"
            return output
        
        return "Task completed, but no results were collected."

    def run(self, user_request: str) -> str:
        """
        Main execution loop - SIMPLIFIED for reliability
        """
        print(f"\n{'='*60}")
        print(f"🧠 HEAD AGENT ACTIVATED")
        print(f"{'='*60}")
        print(f"📋 Request: {user_request}")
        print(f"{'='*60}\n")

        # Initialize state
        state = AgentStateData(user_request=user_request)
        state.max_iterations = self.config.behavior.MAX_ITERATIONS

        # Create simple plan (works reliably with all model sizes)
        print("📋 Creating execution plan...")
        state.tasks = self.create_simple_plan(user_request)
        print(f"   Created {len(state.tasks)} tasks")
        
        for task in state.tasks:
            print(f"   - {task.assigned_agent}: {task.description[:50]}...")

        # Execute tasks
        for task in state.tasks:
            if task.status == TaskStatus.PENDING:
                print(f"\n▶️  Executing: {task.description[:60]}...")
                task.status = TaskStatus.IN_PROGRESS
                state.current_task = task

                try:
                    result = self.delegate_task(task)
                    task.result = result
                    task.status = TaskStatus.COMPLETED
                    state.completed_tasks.append(task)
                    print(f"   ✅ Completed")

                    # Collect research findings
                    if task.assigned_agent == "research":
                        state.research_findings.append(result)

                except Exception as e:
                    task.status = TaskStatus.FAILED
                    task.result = str(e)
                    print(f"   ❌ Error: {e}")

        # Generate final output
        print("\n" + "="*60)
        print("🎯 GENERATING FINAL OUTPUT")
        print("="*60)

        final_output = self.generate_final_output(state)

        print(f"\n{final_output}")
        print("\n" + "="*60)
        print("✅ TASK COMPLETE")
        print("="*60)

        return final_output


def main():
    """Main entry point for the Head Agent"""
    agent = HeadAgent()

    print("""
╔══════════════════════════════════════════════════════════════╗
║         🧠 AUTONOMOUS HIERARCHICAL AGENT SYSTEM 🧠           ║
║                                                              ║
║  I am your Head Agent. Tell me what you want to achieve,    ║
║  and I will figure out how to make it happen.               ║
║                                                              ║
║  Type 'quit' to exit.                                        ║
╚══════════════════════════════════════════════════════════════╝
""")

    while True:
        user_input = input("\n👤 You: ").strip()

        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("\n🧠 Head Agent: Goodbye!")
            break

        if not user_input:
            continue

        result = agent.run(user_input)


if __name__ == "__main__":
    main()
