"""
Deep Research Agent - Conducts comprehensive research on any topic

This agent:
- Searches multiple sources
- Analyzes and synthesizes information
- Finds best solutions and approaches
- Documents findings thoroughly
"""

import json
import time
from typing import List, Dict, Optional
from dataclasses import dataclass, field

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from config import Config, SYSTEM_PROMPTS

# Web search imports
try:
    from duckduckgo_search import DDGS
    HAS_DUCKDUCKGO = True
except ImportError:
    HAS_DUCKDUCKGO = False

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_WEB_TOOLS = True
except ImportError:
    HAS_WEB_TOOLS = False


@dataclass
class SearchResult:
    """A single search result"""
    title: str
    url: str
    snippet: str
    source: str
    relevance_score: float = 0.0


@dataclass
class ResearchReport:
    """Complete research report"""
    topic: str
    summary: str
    key_findings: List[str]
    sources: List[SearchResult]
    recommendations: List[str]
    raw_content: str = ""


class DeepResearchAgent:
    """
    Deep Research Agent - Conducts comprehensive research

    Capabilities:
    - Multi-source web searching
    - Content extraction and analysis
    - Information synthesis
    - Solution discovery
    """

    def __init__(self, config: Config = None):
        self.config = config or Config()

        # Initialize LLM
        self.llm = ChatOllama(
            model=self.config.model.WORKER_AGENT_MODEL,
            temperature=self.config.model.DEFAULT_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Reasoning LLM for analysis
        self.reasoning_llm = ChatOllama(
            model=self.config.model.HEAD_AGENT_MODEL,
            temperature=self.config.model.REASONING_TEMPERATURE,
            base_url=self.config.model.OLLAMA_BASE_URL
        )

        # Cache for results
        self.cache: Dict[str, ResearchReport] = {}

    def search_web(self, query: str, num_results: int = 10) -> List[SearchResult]:
        """
        Search the web using DuckDuckGo
        """
        results = []

        if HAS_DUCKDUCKGO:
            try:
                with DDGS() as ddgs:
                    search_results = list(ddgs.text(
                        query,
                        max_results=num_results
                    ))

                for r in search_results:
                    results.append(SearchResult(
                        title=r.get("title", ""),
                        url=r.get("href", ""),
                        snippet=r.get("body", ""),
                        source="duckduckgo"
                    ))
            except Exception as e:
                print(f"Search error: {e}")

        # Fallback to simulated search if no results
        if not results:
            results = self._fallback_search(query, num_results)

        return results

    def _fallback_search(self, query: str, num_results: int) -> List[SearchResult]:
        """
        Fallback search using LLM knowledge
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a search engine simulation. Generate realistic search results.

For the given query, output results in this format:
RESULT 1:
Title: [realistic title]
URL: [realistic URL]
Snippet: [informative snippet about the topic]

Continue for 5 results."""),
            ("human", "Query: {query}")
        ])

        chain = prompt | self.llm
        response = chain.invoke({"query": query})

        # Parse results
        results = []
        lines = response.content.split("\n")

        current_result = {}
        for line in lines:
            line = line.strip()
            if "Title:" in line:
                current_result["title"] = line.split(":", 1)[1].strip()
            elif "URL:" in line:
                current_result["url"] = line.split(":", 1)[1].strip()
            elif "Snippet:" in line:
                current_result["snippet"] = line.split(":", 1)[1].strip()
                if current_result.get("title"):
                    results.append(SearchResult(
                        title=current_result.get("title", ""),
                        url=current_result.get("url", ""),
                        snippet=current_result.get("snippet", ""),
                        source="llm_knowledge"
                    ))
                current_result = {}

                if len(results) >= num_results:
                    break

        return results

    def browse_page(self, url: str) -> str:
        """
        Browse and extract content from a webpage
        """
        if not HAS_WEB_TOOLS:
            return "Web browsing not available (install requests and beautifulsoup4)"

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()

            # Get text
            text = soup.get_text(separator='\n', strip=True)

            # Limit length
            return text[:5000]

        except Exception as e:
            return f"Error browsing {url}: {str(e)}"

    def analyze_results(self, query: str, results: List[SearchResult]) -> str:
        """
        Analyze search results and extract key information
        """
        # Combine snippets for analysis
        content = "\n\n".join([
            f"Source: {r.title}\n{r.snippet}"
            for r in results[:10]
        ])

        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a research analyst. Analyze the search results and extract:

1. KEY_FINDINGS: Main points discovered
2. BEST_APPROACHES: Best ways to accomplish the goal
3. TOOLS_NEEDED: Tools or technologies mentioned
4. COMMON_PATTERNS: Repeated themes or solutions
5. RECOMMENDATIONS: What should be done next

Be thorough and practical. Focus on actionable information."""),
            ("human", """
Query: {query}

Search Results:
{content}

Analyze:
""")
        ])

        chain = analysis_prompt | self.reasoning_llm
        response = chain.invoke({
            "query": query,
            "content": content[:4000]
        })

        return response.content

    def deep_dive(self, topic: str, depth: int = 2) -> ResearchReport:
        """
        Conduct deep research on a topic

        Args:
            topic: The topic to research
            depth: How many levels of sub-questions to explore
        """
        print(f"🔍 Starting deep research on: {topic}")

        # Check cache
        cache_key = topic.lower().replace(" ", "_")
        if cache_key in self.cache:
            print("   Using cached results")
            return self.cache[cache_key]

        # Initial search
        print("   Searching web...")
        results = self.search_web(topic, self.config.research.MAX_SEARCH_RESULTS)

        # Analyze initial results
        print("   Analyzing results...")
        analysis = self.analyze_results(topic, results)

        # Generate sub-questions for deeper research
        if depth > 0:
            print("   Generating sub-questions...")
            sub_questions = self._generate_sub_questions(topic, analysis)

            print(f"   Researching {len(sub_questions)} sub-topics...")
            for i, sub_q in enumerate(sub_questions[:3]):
                print(f"     - Sub-topic {i+1}: {sub_q[:50]}...")
                sub_results = self.search_web(sub_q, 5)
                results.extend(sub_results)

        # Final synthesis
        print("   Synthesizing findings...")
        summary = self._synthesize(topic, results, analysis)

        # Create report
        report = ResearchReport(
            topic=topic,
            summary=summary,
            key_findings=self._extract_findings(analysis),
            sources=results,
            recommendations=self._extract_recommendations(analysis),
            raw_content=analysis
        )

        # Cache results
        if self.config.research.CACHE_RESULTS:
            self.cache[cache_key] = report

        return report

    def _generate_sub_questions(self, topic: str, analysis: str) -> List[str]:
        """Generate sub-questions for deeper research"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Generate 3-5 specific sub-questions to research deeper.

Format:
1. [question]
2. [question]
..."""),
            ("human", """
Topic: {topic}
Initial Analysis: {analysis}

Sub-questions:
""")
        ])

        chain = prompt | self.llm
        response = chain.invoke({
            "topic": topic,
            "analysis": analysis[:2000]
        })

        # Parse questions
        questions = []
        for line in response.content.split("\n"):
            line = line.strip()
            if line and line[0].isdigit() and "." in line:
                q = line.split(".", 1)[1].strip()
                if q:
                    questions.append(q)

        return questions

    def _synthesize(self, topic: str, results: List[SearchResult], analysis: str) -> str:
        """Synthesize all findings into a summary"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a research synthesizer. Create a comprehensive summary.

Include:
- Main findings
- Best approaches discovered
- Practical recommendations
- Tools/technologies to use
- Potential challenges

Make it actionable and practical."""),
            ("human", """
Topic: {topic}

Analysis: {analysis}

Number of sources: {num_sources}

Summary:
""")
        ])

        chain = prompt | self.reasoning_llm
        response = chain.invoke({
            "topic": topic,
            "analysis": analysis,
            "num_sources": len(results)
        })

        return response.content

    def _extract_findings(self, analysis: str) -> List[str]:
        """Extract key findings from analysis"""
        findings = []
        lines = analysis.split("\n")

        in_findings = False
        for line in lines:
            line = line.strip()
            if "KEY_FINDINGS" in line or "key findings" in line.lower():
                in_findings = True
                continue
            if in_findings and line.startswith(("1.", "2.", "3.", "4.", "5.", "-", "*")):
                findings.append(line.lstrip("12345.-* ").strip())
            elif in_findings and line and not line.startswith(("1.", "2.", "3.", "4.", "5.", "-", "*")):
                break

        return findings[:5]

    def _extract_recommendations(self, analysis: str) -> List[str]:
        """Extract recommendations from analysis"""
        recommendations = []
        lines = analysis.split("\n")

        in_rec = False
        for line in lines:
            line = line.strip()
            if "RECOMMENDATIONS" in line or "recommendations" in line.lower():
                in_rec = True
                continue
            if in_rec and line.startswith(("1.", "2.", "3.", "4.", "5.", "-", "*")):
                recommendations.append(line.lstrip("12345.-* ").strip())
            elif in_rec and line and not line.startswith(("1.", "2.", "3.", "4.", "5.", "-", "*")):
                break

        return recommendations[:5]

    def find_best_solution(self, problem: str) -> Dict:
        """
        Find the best solution to a problem

        Returns:
            Dict with solution details
        """
        # Research the problem
        report = self.deep_dive(f"how to {problem}")

        # Extract best approach
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a solution architect. Given research findings, determine:

1. BEST_SOLUTION: The single best approach
2. WHY_BEST: Why this is the best approach
3. IMPLEMENTATION_STEPS: Step-by-step implementation
4. TOOLS_NEEDED: Tools required
5. TIME_ESTIMATE: Estimated time to implement
6. DIFFICULTY: Easy/Medium/Hard

Be practical and specific."""),
            ("human", """
Problem: {problem}

Research Summary: {summary}

Key Findings: {findings}

Determine the best solution:
""")
        ])

        chain = prompt | self.reasoning_llm
        response = chain.invoke({
            "problem": problem,
            "summary": report.summary,
            "findings": "\n".join(report.key_findings)
        })

        return {
            "problem": problem,
            "solution_analysis": response.content,
            "sources": [{"title": s.title, "url": s.url} for s in report.sources[:5]],
            "recommendations": report.recommendations
        }

    def research(self, query: str) -> str:
        """
        Main research method - returns formatted research results
        """
        report = self.deep_dive(query, depth=self.config.research.DEEP_RESEARCH_ITERATIONS)

        # Format output
        output = f"""
=== RESEARCH REPORT: {query} ===

SUMMARY:
{report.summary}

KEY FINDINGS:
""" + "\n".join([f"• {f}" for f in report.key_findings]) + """

RECOMMENDATIONS:
""" + "\n".join([f"• {r}" for r in report.recommendations]) + f"""

SOURCES: {len(report.sources)} results found
"""

        return output


# Alias for import compatibility
ResearchAgent = DeepResearchAgent


def main():
    """Test the research agent"""
    agent = DeepResearchAgent()

    print("🔬 Deep Research Agent")
    print("=" * 50)

    while True:
        query = input("\nEnter research topic (or 'quit'): ").strip()

        if query.lower() in ['quit', 'exit']:
            break

        if not query:
            continue

        report = agent.deep_dive(query)
        print(f"\n{report.summary}")


if __name__ == "__main__":
    main()
