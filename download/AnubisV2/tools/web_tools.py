"""
Web Tools - Web browsing and search capabilities

These tools allow agents to:
- Search the web
- Browse websites
- Extract content
- Download files
"""

import json
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

# Try to import optional dependencies
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


def web_search(query: str, num_results: int = 10) -> List[Dict]:
    """
    Search the web using DuckDuckGo

    Args:
        query: Search query
        num_results: Maximum number of results

    Returns:
        List of search results with title, url, snippet
    """
    results = []

    if not HAS_DUCKDUCKGO:
        return [{"error": "duckduckgo-search not installed. Run: pip install duckduckgo-search"}]

    try:
        with DDGS() as ddgs:
            search_results = list(ddgs.text(
                query,
                max_results=num_results
            ))

        for r in search_results:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
                "source": "duckduckgo"
            })
    except Exception as e:
        results.append({"error": str(e)})

    return results


def browse_website(url: str, timeout: int = 30) -> Dict:
    """
    Browse a website and extract content

    Args:
        url: Website URL to browse
        timeout: Request timeout in seconds

    Returns:
        Dict with title, content, links
    """
    if not HAS_WEB_TOOLS:
        return {"error": "requests and beautifulsoup4 not installed"}

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }

        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove unwanted elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
            element.decompose()

        # Get title
        title = soup.title.string if soup.title else ""

        # Get main content
        # Try to find main content area
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content') or soup.body

        if main_content:
            # Get text content
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)

        # Clean up text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        content = '\n'.join(lines)

        # Get links
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('http'):
                links.append({
                    "url": href,
                    "text": link.get_text(strip=True)
                })
            elif href.startswith('/'):
                links.append({
                    "url": urljoin(url, href),
                    "text": link.get_text(strip=True)
                })

        return {
            "url": url,
            "title": title,
            "content": content[:10000],  # Limit content size
            "links": links[:50],
            "status": "success"
        }

    except requests.exceptions.Timeout:
        return {"error": f"Timeout after {timeout}s", "url": url}
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "url": url}
    except Exception as e:
        return {"error": str(e), "url": url}


def extract_text_from_url(url: str) -> str:
    """
    Extract plain text from a URL

    Args:
        url: URL to extract text from

    Returns:
        Plain text content
    """
    result = browse_website(url)
    if "error" in result:
        return f"Error: {result['error']}"
    return result.get("content", "")


def download_file(url: str, save_path: str = None) -> Dict:
    """
    Download a file from URL

    Args:
        url: File URL
        save_path: Local path to save (optional)

    Returns:
        Dict with status and path
    """
    if not HAS_WEB_TOOLS:
        return {"error": "requests not installed"}

    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        if not save_path:
            # Extract filename from URL
            parsed = urlparse(url)
            save_path = os.path.basename(parsed.path) or "downloaded_file"

        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        return {
            "status": "success",
            "path": save_path,
            "size": os.path.getsize(save_path)
        }

    except Exception as e:
        return {"error": str(e)}


def check_website_status(url: str) -> Dict:
    """
    Check if a website is online

    Args:
        url: URL to check

    Returns:
        Dict with status info
    """
    if not HAS_WEB_TOOLS:
        return {"error": "requests not installed"}

    try:
        start_time = time.time()
        response = requests.get(url, timeout=10)
        elapsed = time.time() - start_time

        return {
            "url": url,
            "status_code": response.status_code,
            "online": response.status_code < 400,
            "response_time": round(elapsed * 1000, 2),  # ms
            "content_type": response.headers.get('Content-Type', ''),
            "server": response.headers.get('Server', '')
        }

    except requests.exceptions.Timeout:
        return {"url": url, "online": False, "error": "Timeout"}
    except Exception as e:
        return {"url": url, "online": False, "error": str(e)}


def extract_links(url: str, same_domain_only: bool = True) -> List[str]:
    """
    Extract all links from a webpage

    Args:
        url: URL to scrape
        same_domain_only: Only return links from the same domain

    Returns:
        List of URLs
    """
    result = browse_website(url)

    if "error" in result:
        return []

    links = result.get("links", [])
    urls = [link["url"] for link in links if link.get("url")]

    if same_domain_only:
        base_domain = urlparse(url).netloc
        urls = [u for u in urls if urlparse(u).netloc == base_domain]

    return list(set(urls))  # Remove duplicates


def search_and_summarize(query: str, num_results: int = 5) -> str:
    """
    Search the web and summarize results

    Args:
        query: Search query
        num_results: Number of results to include

    Returns:
        Summarized search results
    """
    results = web_search(query, num_results)

    if not results:
        return "No results found"

    if "error" in results[0]:
        return results[0]["error"]

    summary = f"Search results for: {query}\n\n"

    for i, result in enumerate(results[:num_results], 1):
        summary += f"{i}. {result.get('title', 'No title')}\n"
        summary += f"   URL: {result.get('url', '')}\n"
        summary += f"   {result.get('snippet', '')}\n\n"

    return summary


# Tool registry for agents
AVAILABLE_WEB_TOOLS = {
    "web_search": {
        "function": web_search,
        "description": "Search the web for information",
        "parameters": ["query", "num_results (optional)"]
    },
    "browse_website": {
        "function": browse_website,
        "description": "Browse and extract content from a website",
        "parameters": ["url", "timeout (optional)"]
    },
    "extract_text_from_url": {
        "function": extract_text_from_url,
        "description": "Extract plain text from a URL",
        "parameters": ["url"]
    },
    "download_file": {
        "function": download_file,
        "description": "Download a file from URL",
        "parameters": ["url", "save_path (optional)"]
    },
    "check_website_status": {
        "function": check_website_status,
        "description": "Check if a website is online",
        "parameters": ["url"]
    },
    "extract_links": {
        "function": extract_links,
        "description": "Extract all links from a webpage",
        "parameters": ["url", "same_domain_only (optional)"]
    },
    "search_and_summarize": {
        "function": search_and_summarize,
        "description": "Search and get summarized results",
        "parameters": ["query", "num_results (optional)"]
    }
}


def get_tool(tool_name: str):
    """Get a tool by name"""
    return AVAILABLE_WEB_TOOLS.get(tool_name, {}).get("function")


def list_tools() -> List[str]:
    """List available web tools"""
    return list(AVAILABLE_WEB_TOOLS.keys())


if __name__ == "__main__":
    # Test the tools
    print("Testing web tools...")

    print("\n1. Testing web_search:")
    results = web_search("Python programming", 3)
    for r in results[:2]:
        print(f"  - {r.get('title', 'No title')}")

    print("\n2. Testing check_website_status:")
    status = check_website_status("https://www.python.org")
    print(f"  - Online: {status.get('online')}")
    print(f"  - Response time: {status.get('response_time')}ms")
