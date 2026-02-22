#!/usr/bin/env python3
"""Quick test for web search"""

print("Testing web search...")

# Test 1: Check if duckduckgo-search is installed
try:
    from duckduckgo_search import DDGS
    print("✅ duckduckgo-search is installed")
    HAS_DDGS = True
except ImportError as e:
    print(f"❌ duckduckgo-search NOT installed: {e}")
    HAS_DDGS = False

# Test 2: Try actual search
if HAS_DDGS:
    print("\nTesting actual search...")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text("latest AI news", max_results=3))
            print(f"✅ Search returned {len(results)} results")
            for i, r in enumerate(results[:3], 1):
                print(f"\n   Result {i}:")
                print(f"   Title: {r.get('title', 'N/A')}")
                print(f"   URL: {r.get('href', 'N/A')}")
                print(f"   Snippet: {r.get('body', 'N/A')[:100]}...")
    except Exception as e:
        print(f"❌ Search failed: {e}")
else:
    print("\n⚠️  Install duckduckgo-search to enable web search:")
    print("   pip install duckduckgo-search")
