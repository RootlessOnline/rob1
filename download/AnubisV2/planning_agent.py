"""
Planning Agent - Creates detailed execution plans

This agent:
- Breaks down complex tasks
- Identifies dependencies
- Prioritizes tasks
- Creates executable plans
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from config import Config, SYSTEM_PROMPTS


class Priority(Enum):
    """Task priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class PlanStep:
    """A single step in the plan"""
    id: int
    description: str
    agent_type: str  # research, planning, spawner, worker
    priority: Priority
    dependencies: List[int]  # IDs of steps that must complete first
    estimated_time: str
    success_criteria: str
    parallel: bool = False  # Can this run in parallel?


@dataclass
class ExecutionPlan:
    """A complete execution plan"""
    goal: str
    steps: List[PlanStep]
    total_estimated_time: str
    risks: List[str]
    contingencies: List[str]
    parallel_groups: List[List[int]]  # Groups of steps that can run in parallel


class PlanningAgent:
    """
    Planning Agent - Creates detailed execution plans

    Capabilities:
    - Task decomposition
    - Dependency analysis
    - Priority assignment
    - Parallel execution planning
    - Risk assessment
    """

    def __init__(self, config: Config = None):
        self.config = config or Config()

        # Initialize LLM
        self.llm = ChatOllama(
            model=self.config.model.HEAD_AGENT_MODEL,
            temperature=self.config.model.REASONING_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

    def analyze_goal(self, goal: str) -> Dict:
        """
        Analyze a goal to understand its complexity and requirements
        """
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a goal analyst. Analyze the goal deeply.

Provide:
COMPLEXITY: [simple/moderate/complex/very_complex]
DOMAINS: [areas of knowledge needed]
SKILLS: [specific skills required]
TOOLS: [tools/technologies needed]
STAKEHOLDERS: [who/what is involved]
CONSTRAINTS: [limitations to consider]
RISKS: [potential problems]
SUCCESS_METRICS: [how to measure success]

Be thorough. Consider all angles."""),
            ("human", "Goal: {goal}")
        ])

        chain = analysis_prompt | self.llm
        response = chain.invoke({"goal": goal})

        return self._parse_analysis(response.content)

    def _parse_analysis(self, response: str) -> Dict:
        """Parse analysis response"""
        analysis = {
            "complexity": "moderate",
            "domains": [],
            "skills": [],
            "tools": [],
            "stakeholders": [],
            "constraints": [],
            "risks": [],
            "success_metrics": []
        }

        lines = response.split("\n")
        current_field = None

        for line in lines:
            line = line.strip()
            if "COMPLEXITY:" in line:
                analysis["complexity"] = line.split(":", 1)[1].strip().lower()
            elif "DOMAINS:" in line:
                current_field = "domains"
            elif "SKILLS:" in line:
                current_field = "skills"
            elif "TOOLS:" in line:
                current_field = "tools"
            elif "STAKEHOLDERS:" in line:
                current_field = "stakeholders"
            elif "CONSTRAINTS:" in line:
                current_field = "constraints"
            elif "RISKS:" in line:
                current_field = "risks"
            elif "SUCCESS_METRICS:" in line:
                current_field = "success_metrics"
            elif current_field and line.startswith(("-", "*")):
                item = line.lstrip("-* ").strip()
                if item and current_field in analysis:
                    analysis[current_field].append(item)

        return analysis

    def create_plan(self, goal: str, analysis: Dict = None) -> ExecutionPlan:
        """
        Create a detailed execution plan
        """
        if not analysis:
            analysis = self.analyze_goal(goal)

        planning_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert project planner. Create a detailed, step-by-step plan.

Format each step as:
STEP [number]:
  Description: [what to do]
  Agent: [research/planning/spawner/worker]
  Priority: [critical/high/medium/low]
  Depends on: [step numbers, or "none"]
  Time: [estimated time]
  Success: [how to know it's done]
  Parallel: [yes/no - can run alongside others?]

After steps, provide:
TOTAL_TIME: [estimated total time]
RISKS: [potential problems]
CONTINGENCIES: [backup plans]
PARALLEL_GROUPS: [steps that can run together]

Make plans that:
- Minimize human interaction
- Handle failures gracefully
- Can be executed autonomously
- Have clear success criteria"""),
            ("human", """
Goal: {goal}

Analysis:
- Complexity: {complexity}
- Skills needed: {skills}
- Tools needed: {tools}
- Constraints: {constraints}

Create the plan:
""")
        ])

        chain = planning_prompt | self.llm
        response = chain.invoke({
            "goal": goal,
            "complexity": analysis.get("complexity", "moderate"),
            "skills": ", ".join(analysis.get("skills", [])),
            "tools": ", ".join(analysis.get("tools", [])),
            "constraints": ", ".join(analysis.get("constraints", []))
        })

        return self._parse_plan(goal, response.content)

    def _parse_plan(self, goal: str, response: str) -> ExecutionPlan:
        """Parse plan from response"""
        steps = []
        risks = []
        contingencies = []
        parallel_groups = []

        lines = response.split("\n")
        current_step = None
        current_section = None

        for line in lines:
            line = line.strip()

            # Start new step
            if line.startswith("STEP") and ":" in line:
                if current_step:
                    steps.append(current_step)

                step_id = len(steps) + 1
                current_step = PlanStep(
                    id=step_id,
                    description="",
                    agent_type="worker",
                    priority=Priority.MEDIUM,
                    dependencies=[],
                    estimated_time="5 minutes",
                    success_criteria="Task completed",
                    parallel=False
                )

            # Parse step details
            elif current_step:
                if "Description:" in line:
                    current_step.description = line.split(":", 1)[1].strip()
                elif "Agent:" in line:
                    agent = line.split(":", 1)[1].strip().lower()
                    if agent in ["research", "planning", "spawner", "worker"]:
                        current_step.agent_type = agent
                elif "Priority:" in line:
                    priority = line.split(":", 1)[1].strip().lower()
                    if priority in ["critical", "high", "medium", "low"]:
                        current_step.priority = Priority(priority)
                elif "Depends on:" in line:
                    deps = line.split(":", 1)[1].strip()
                    if deps.lower() != "none":
                        try:
                            current_step.dependencies = [
                                int(d.strip())
                                        for d in deps.split(",")
                                        if d.strip().isdigit()
                            ]
                        except:
                            pass
                elif "Time:" in line:
                    current_step.estimated_time = line.split(":", 1)[1].strip()
                elif "Success:" in line:
                    current_step.success_criteria = line.split(":", 1)[1].strip()
                elif "Parallel:" in line:
                    current_step.parallel = "yes" in line.lower()

            # Parse post-step sections
            if "RISKS:" in line:
                current_section = "risks"
            elif "CONTINGENCIES:" in line:
                current_section = "contingencies"
            elif "PARALLEL_GROUPS:" in line:
                current_section = "parallel"
            elif current_section == "risks" and line.startswith(("-", "*")):
                risks.append(line.lstrip("-* ").strip())
            elif current_section == "contingencies" and line.startswith(("-", "*")):
                contingencies.append(line.lstrip("-* ").strip())
            elif current_section == "parallel" and line.startswith(("-", "*")):
                try:
                    group = [
                        int(s.strip())
                        for s in line.lstrip("-* ").split(",")
                        if s.strip().isdigit()
                    ]
                    if group:
                        parallel_groups.append(group)
                except:
                    pass

        # Add last step
        if current_step:
            steps.append(current_step)

        # Create plan
        plan = ExecutionPlan(
            goal=goal,
            steps=steps,
            total_estimated_time=self._estimate_total_time(steps),
            risks=risks,
            contingencies=contingencies,
            parallel_groups=parallel_groups
        )

        return plan

    def _estimate_total_time(self, steps: List[PlanStep]) -> str:
        """Estimate total time for all steps"""
        # Simple estimation - in practice would be smarter
        total_minutes = len(steps) * 5  # Assume 5 min average per step

        if total_minutes < 60:
            return f"{total_minutes} minutes"
        else:
            hours = total_minutes // 60
            mins = total_minutes % 60
            return f"{hours} hour{'s' if hours > 1 else ''} {mins} minutes"

    def optimize_plan(self, plan: ExecutionPlan) -> ExecutionPlan:
        """
        Optimize the plan for parallel execution
        """
        # Build dependency graph
        completed = set()
        remaining = set(s.id for s in plan.steps)
        parallel_groups = []

        while remaining:
            # Find steps with no unmet dependencies
            ready = []
            for step in plan.steps:
                if step.id in remaining:
                    deps_met = all(d in completed for d in step.dependencies)
                    if deps_met:
                        ready.append(step.id)

            if not ready:
                # Circular dependency or error
                break

            parallel_groups.append(ready)

            for step_id in ready:
                completed.add(step_id)
                remaining.remove(step_id)

        plan.parallel_groups = parallel_groups
        return plan

    def create_detailed_plan(self, task: str) -> str:
        """
        Main method - creates and returns a formatted plan
        """
        print(f"📋 Creating plan for: {task[:50]}...")

        analysis = self.analyze_goal(task)
        plan = self.create_plan(task, analysis)
        plan = self.optimize_plan(plan)

        # Format output
        output = f"\n{'='*60}\n"
        output += f"EXECUTION PLAN: {plan.goal}\n"
        output += f"{'='*60}\n\n"

        output += f"Total Steps: {len(plan.steps)}\n"
        output += f"Estimated Time: {plan.total_estimated_time}\n"
        output += f"Parallel Groups: {len(plan.parallel_groups)}\n\n"

        output += "STEPS:\n"
        output += "-" * 40 + "\n"

        for step in plan.steps:
            output += f"\nStep {step.id}: {step.description}\n"
            output += f"  Agent: {step.agent_type}\n"
            output += f"  Priority: {step.priority.value}\n"
            if step.dependencies:
                output += f"  Depends on: {step.dependencies}\n"
            output += f"  Success: {step.success_criteria}\n"

        if plan.risks:
            output += "\nRISKS:\n"
            for risk in plan.risks:
                output += f"  ⚠️ {risk}\n"

        if plan.contingencies:
            output += "\nCONTINGENCIES:\n"
            for cont in plan.contingencies:
                output += f"  🔄 {cont}\n"

        output += "\n" + "=" * 60 + "\n"

        return output

    def adapt_plan(self, plan: ExecutionPlan, feedback: str) -> ExecutionPlan:
        """
        Adapt the plan based on feedback/changes
        """
        adapt_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are adapting an existing plan based on feedback.

Original Plan:
{original_plan}

Feedback: {feedback}

Determine what changes are needed:
1. ADD: New steps to add
2. MODIFY: Steps to change
3. REMOVE: Steps to remove
4. REORDER: Steps to reorder

Output the adapted plan in the same format."""),
            ("human", "Adapt the plan.")
        ])

        chain = adapt_prompt | self.llm

        original_plan_str = "\n".join([
            f"Step {s.id}: {s.description}"
            for s in plan.steps
        ])

        response = chain.invoke({
            "original_plan": original_plan_str,
            "feedback": feedback
        })

        return self._parse_plan(plan.goal, response.content)


def main():
    """Test the planning agent"""
    planner = PlanningAgent()

    print("📋 Planning Agent")
    print("=" * 50)

    while True:
        task = input("\nEnter goal (or 'quit'): ").strip()

        if task.lower() in ['quit', 'exit']:
            break

        if not task:
            continue

        plan = planner.create_detailed_plan(task)
        print(plan)


if __name__ == "__main__":
    main()
