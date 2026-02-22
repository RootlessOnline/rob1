#!/usr/bin/env python3
"""Debug test to see what's happening in the agent system"""

from head_agent import HeadAgent, AgentState, AgentStateData, Task, TaskStatus

def main():
    agent = HeadAgent()

    print("=" * 60)
    print("TEST 1: Analyze Request")
    print("=" * 60)
    analysis = agent.analyze_request("What are the latest AI news today? Search the web.")
    print(f"Core Goal: {analysis.get('core_goal')}")
    print(f"Skills needed: {analysis.get('required_skills')}")

    print("\n" + "=" * 60)
    print("TEST 2: Create Plan")
    print("=" * 60)
    tasks = agent.create_plan(analysis, "What are the latest AI news today? Search the web.")
    print(f"Created {len(tasks)} tasks:")
    for t in tasks:
        print(f"\n  Task {t.id}:")
        print(f"    Description: {t.description[:80]}...")
        print(f"    Agent: {t.assigned_agent}")
        print(f"    Status: {t.status}")

    print("\n" + "=" * 60)
    print("TEST 3: Execute First Research Task")
    print("=" * 60)

    # Find a research task
    research_tasks = [t for t in tasks if t.assigned_agent == "research"]
    if research_tasks:
        task = research_tasks[0]
        print(f"Executing: {task.description}")
        result = agent.delegate_task(task)
        print(f"\nResult preview (first 500 chars):\n{result[:500]}...")
    else:
        print("No research tasks found!")
        print("Tasks by agent type:")
        for t in tasks:
            print(f"  - {t.assigned_agent}: {t.description[:50]}")

if __name__ == "__main__":
    main()
