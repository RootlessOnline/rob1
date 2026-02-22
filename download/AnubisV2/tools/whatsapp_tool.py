"""
WhatsApp Integration Tool
Allows the AI agent to communicate via WhatsApp

This uses Playwright to automate WhatsApp Web
"""

import os
import json
import time
import asyncio
from typing import Optional, Dict, List, Callable
from dataclasses import dataclass
from datetime import datetime

# Try imports
try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


@dataclass
class WhatsAppMessage:
    """Represents a WhatsApp message"""
    sender: str
    content: str
    timestamp: str
    chat_id: str
    is_from_me: bool = False


class WhatsAppTool:
    """
    WhatsApp integration for AI agent using Playwright
    """

    def __init__(self, headless: bool = True, output_dir: str = None):
        self.headless = headless
        self.browser = None
        self.page = None
        self.playwright = None
        self.is_connected = False
        self.message_callback = None

        # Set output directory
        if output_dir:
            self.output_dir = output_dir
        else:
            self.output_dir = os.path.expanduser("~/my-project/download")

        os.makedirs(self.output_dir, exist_ok=True)
        self.qr_code_path = os.path.join(self.output_dir, "whatsapp_qr.png")
        self.screenshot_path = os.path.join(self.output_dir, "whatsapp_screen.png")

    async def connect(self) -> Dict:
        """
        Connect to WhatsApp Web
        Returns QR code for scanning or connection status
        """
        if not HAS_PLAYWRIGHT:
            return {
                "success": False,
                "error": "Playwright not installed. Run: pip install playwright && playwright install chromium"
            }

        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            context = await self.browser.new_context(
                viewport={'width': 1200, 'height': 800},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.page = await context.new_page()

            # Go to WhatsApp Web
            print("   Navigating to WhatsApp Web...")
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle', timeout=60000)
            await asyncio.sleep(5)

            # Take a screenshot first
            await self.page.screenshot(path=self.screenshot_path)
            print(f"   Screenshot saved to: {self.screenshot_path}")

            # Check if already logged in
            try:
                # Look for chat list or search box (indicates logged in)
                chat_list = await self.page.query_selector('[data-testid="chat-list"]')
                search_box = await self.page.query_selector('[data-testid="search-input"]')

                if chat_list or search_box:
                    self.is_connected = True
                    return {
                        "success": True,
                        "status": "already_logged_in",
                        "message": "WhatsApp is connected! You can now send and receive messages."
                    }
            except Exception as e:
                print(f"   Login check: {e}")

            # Look for QR code
            print("   Looking for QR code...")

            # Wait a bit for QR code to load
            await asyncio.sleep(3)

            # Try to find QR code canvas
            qr_selectors = [
                'canvas[aria-label*="QR"]',
                'canvas',
                'div[data-testid="qr-code"]',
                'div[role="img"]',
                '._1jpHk canvas',
            ]

            qr_found = False
            for selector in qr_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        # Try to take screenshot of just the QR area
                        try:
                            await element.screenshot(path=self.qr_code_path)
                            qr_found = True
                            print(f"   QR code captured with selector: {selector}")
                            break
                        except:
                            continue
                except:
                    continue

            if not qr_found:
                # Just use the full screenshot
                import shutil
                shutil.copy(self.screenshot_path, self.qr_code_path)
                print("   Using full screenshot as QR code")

            self.is_connected = False
            return {
                "success": True,
                "status": "qr_code_ready",
                "message": "Scan the QR code with your WhatsApp mobile app",
                "qr_code_path": self.qr_code_path,
                "screenshot_path": self.screenshot_path,
                "instructions": [
                    "1. Open WhatsApp on your phone",
                    "2. Go to Settings > Linked Devices",
                    "3. Tap 'Link a Device'",
                    f"4. Scan the QR code at: {self.qr_code_path}"
                ]
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def wait_for_connection(self, timeout: int = 120) -> bool:
        """Wait for user to scan QR code and connect"""
        start = time.time()
        print(f"   Waiting for QR scan (timeout: {timeout}s)...")

        while time.time() - start < timeout:
            try:
                # Check for elements that appear when logged in
                chat_list = await self.page.query_selector('[data-testid="chat-list"]')
                search_box = await self.page.query_selector('[data-testid="search-input"]')

                if chat_list or search_box:
                    self.is_connected = True
                    print("   ✅ Connection detected!")
                    return True
            except:
                pass

            # Print progress every 15 seconds
            elapsed = int(time.time() - start)
            if elapsed > 0 and elapsed % 15 == 0:
                remaining = timeout - elapsed
                print(f"   Still waiting... {remaining}s remaining")

            await asyncio.sleep(2)

        print("   ⏰ Connection timeout")
        return False

    async def send_message(self, contact: str, message: str) -> Dict:
        """
        Send a message to a contact

        Args:
            contact: Phone number with country code (e.g., "+1234567890") or contact name
            message: Message to send
        """
        if not self.is_connected:
            return {
                "success": False,
                "error": "Not connected to WhatsApp. Call connect() first."
            }

        try:
            # Search for contact
            search_box = await self.page.query_selector('[data-testid="search-input"]')
            if search_box:
                await search_box.fill(contact)
                await asyncio.sleep(2)

                # Click on the contact
                contact_element = await self.page.query_selector('[data-testid="cell-frame-container"]')
                if contact_element:
                    await contact_element.click()
                    await asyncio.sleep(1)

                    # Type message
                    message_box = await self.page.query_selector('[data-testid="conversation-compose-box-input"]')
                    if message_box:
                        await message_box.fill(message)
                        await asyncio.sleep(0.5)

                        # Send
                        send_button = await self.page.query_selector('[data-testid="send-message-btn"]')
                        if send_button:
                            await send_button.click()
                            return {
                                "success": True,
                                "message": f"Message sent to {contact}",
                                "content": message
                            }

            return {
                "success": False,
                "error": f"Could not find contact: {contact}"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_unread_messages(self) -> List[WhatsAppMessage]:
        """Get all unread messages"""
        if not self.is_connected:
            return []

        messages = []
        try:
            # Find unread chats
            unread_indicators = await self.page.query_selector_all('[data-testid="unread-count"]')

            for indicator in unread_indicators:
                # Click to open chat
                await indicator.click()
                await asyncio.sleep(1)

                # Get messages
                msg_elements = await self.page.query_selector_all('[data-testid="msg-container"]')
                for msg in msg_elements[-10:]:  # Last 10 messages
                    text = await msg.inner_text()
                    messages.append(WhatsAppMessage(
                        sender="unknown",
                        content=text,
                        timestamp=datetime.now().isoformat(),
                        chat_id="current"
                    ))

        except Exception as e:
            print(f"Error getting messages: {e}")

        return messages

    async def disconnect(self):
        """Disconnect from WhatsApp"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.is_connected = False


# Tool definition for tool manager
TOOLS = [
    {
        "name": "whatsapp_send",
        "description": "Send a message via WhatsApp",
        "function": "send_whatsapp_message",
        "parameters": {
            "contact": {"type": "string", "description": "Phone number or contact name"},
            "message": {"type": "string", "description": "Message to send"}
        },
        "category": "communication"
    }
]


def send_whatsapp_message(contact: str, message: str) -> str:
    """Send WhatsApp message (synchronous wrapper)"""
    async def _send():
        tool = WhatsAppTool()
        await tool.connect()
        if tool.is_connected:
            result = await tool.send_message(contact, message)
            await tool.disconnect()
            return json.dumps(result)
        else:
            await tool.disconnect()
            return json.dumps({"error": "Not connected to WhatsApp"})

    return asyncio.run(_send())


if __name__ == "__main__":
    print("WhatsApp Tool Test")
    print("=" * 50)
    print("\nTo use WhatsApp integration:")
    print("1. Install playwright: pip install playwright && playwright install chromium")
    print("2. Run this script")
    print("3. Scan the QR code with your phone")
    print("\nStarting connection...")

    async def test():
        tool = WhatsAppTool(headless=True)
        result = await tool.connect()
        print(json.dumps(result, indent=2))

        if result.get("status") == "qr_code_ready":
            print(f"\n📸 QR Code saved to: {result.get('qr_code_path')}")
            print("\nWaiting for you to scan the QR code...")
            connected = await tool.wait_for_connection()
            if connected:
                print("✅ Connected! You can now send messages.")
            else:
                print("❌ Connection timed out")

    asyncio.run(test())
