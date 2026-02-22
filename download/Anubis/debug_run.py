#!/usr/bin/env python3
"""Debug the main run loop"""

from head_agent import HeadAgent, AgentState, AgentStateData, Task, TaskStatus

def debug_run():
    agent = HeadAgent()
    user_request = "What are the latest AI news today?"

    # Initialize state
    state = AgentStateData(user_request=user_request)
    state.max_iterations = 10

    print("=" * 60)
    print("DEBUG: Starting main loop")
    print("=" * 60)

    # Check initial state
    print(f"\nInitial state:")
    print(f"  iterations: {state.iterations}")
    print(f"  tasks: {len(state.tasks)}")
    print(f"  max_iterations: {state.max_iterations}")

    # Check determine_completion BEFORE loop
    print(f"\nCalling determine_completion...")
    result = agent.determine_completion(state)
    print(f"  Result: {result}")
    print(f"  Should continue: {not result}")

    if result:
        print("\n❌ BUG FOUND: determine_completion returns True on first call!")
        print("   This means the loop never starts!")
        return

    # Now let's trace one iteration
    print("\n" + "=" * 60)
    print("Starting first iteration...")
    print("=" * 60)

    state.iterations += 1
    print(f"Iteration {state.iterations}")

    # Analyze
    print("\n1. Analyzing request...")
    analysis = agent.analyze_request(user_request)
    print(f"   Core goal: {analysis.get('core_goal', 'N/A')[:50]}...")

    # Plan
    print("\n2. Creating plan...")
    state.tasks = agent.create_plan(analysis, user_request)
    print(f"   Created {len(state.tasks)} tasks")

    # Check state after planning
    print(f"\nState after planning:")
    print(f"  iterations: {state.iterations}")
    print(f"  tasks: {len(state.tasks)}")
    for t in state.tasks:
        print(f"    - {t.id}: {t.status}")

    # Check determine_completion AFTER planning
    print(f"\nCalling determine_completion after planning...")
    result = agent.determine_completion(state)
    print(f"  Result: {result}")
    print(f"  Should continue: {not result}")

    if result:
        print("\n❌ BUG: Loop would exit here!")
    else:
        print("\n✅ Loop should continue to execute tasks")

if __name__ == "__main__":
    debug_run()
