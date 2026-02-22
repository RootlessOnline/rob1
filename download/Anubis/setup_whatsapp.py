#!/usr/bin/env python3
"""
WhatsApp Setup Script
Opens WhatsApp Web and captures QR code for scanning
"""

import asyncio
import os
import sys

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("❌ Playwright not installed. Run:")
    print("   pip install playwright && playwright install chromium")
    sys.exit(1)


async def setup_whatsapp():
    """Setup WhatsApp Web and capture QR code"""
    
    print("\n" + "="*60)
    print("📱 WHATSAPP WEB SETUP")
    print("="*60)
    print("\nOpening WhatsApp Web...")
    
    output_dir = "/home/z/my-project/download"
    qr_path = os.path.join(output_dir, "whatsapp_qr.png")
    screenshot_path = os.path.join(output_dir, "whatsapp_screen.png")
    
    async with async_playwright() as p:
        # Launch browser (headless for server environment)
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = await browser.new_context(
            viewport={'width': 1200, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = await context.new_page()
        
        # Go to WhatsApp Web
        print("Loading WhatsApp Web...")
        await page.goto('https://web.whatsapp.com', wait_until='networkidle')
        await asyncio.sleep(5)
        
        # Take screenshot
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"\n📸 Screenshot saved to: {screenshot_path}")
        
        # Check if already logged in
        try:
            chat_list = await page.query_selector('[data-testid="chat-list"]')
            if chat_list:
                print("\n✅ Already logged in to WhatsApp!")
                print("You can use the agent to send messages.")
                await browser.close()
                return True
        except:
            pass
        
        # Look for QR code canvas
        print("\nLooking for QR code...")
        
        # Wait for QR code to appear
        await asyncio.sleep(3)
        
        # Try to find and capture the QR code area
        qr_selectors = [
            'canvas',
            '[data-testid="qr-code"]',
            'div[role="img"]',
            '._1jpHk',
            'canvas[aria-label="Scan this QR code"]'
        ]
        
        qr_found = False
        for selector in qr_selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    # Take screenshot of the element
                    await element.screenshot(path=qr_path)
                    qr_found = True
                    print(f"\n✅ QR Code found and saved to: {qr_path}")
                    break
            except Exception as e:
                continue
        
        if not qr_found:
            # Just save the whole screen
            await page.screenshot(path=qr_path)
            print(f"\n📸 Full screen saved to: {qr_path}")
        
        print("\n" + "="*60)
        print("📋 INSTRUCTIONS")
        print("="*60)
        print("""
1. Open the QR code image:
   - It's saved at: /home/z/my-project/download/whatsapp_qr.png
   - Download it or view it on your computer

2. On your phone:
   - Open WhatsApp
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the QR code in the image

3. After scanning:
   - The browser will connect to your WhatsApp
   - You can then use the AI agent to send/receive messages

The QR code is valid for about 20 seconds.
If it expires, run this script again.
""")
        
        # Keep the browser open for a while to allow scanning
        print("\n⏳ Waiting for QR scan (2 minutes)...")
        print("   Scan the QR code with your phone now!")
        
        # Check for login periodically
        for i in range(24):  # 2 minutes (24 * 5 seconds)
            await asyncio.sleep(5)
            try:
                # Check if logged in
                chat_list = await page.query_selector('[data-testid="chat-list"]')
                if chat_list:
                    print("\n\n✅ SUCCESS! WhatsApp Connected!")
                    print("Your AI agent can now send and receive messages.")
                    
                    # Save session state
                    await context.storage_state(path=os.path.join(output_dir, "whatsapp_session.json"))
                    print(f"Session saved to: {output_dir}/whatsapp_session.json")
                    
                    await browser.close()
                    return True
            except:
                pass
            
            remaining = 120 - (i * 5)
            if remaining > 0 and i % 6 == 0:  # Print every 30 seconds
                print(f"   Still waiting... ({remaining} seconds remaining)")
        
        print("\n⏰ Timeout - QR code may have expired")
        print("Run the script again to get a new QR code.")
        
        await browser.close()
        return False


if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════════════════════╗
║              📱 WHATSAPP SETUP FOR AI AGENT               ║
╚═══════════════════════════════════════════════════════════╝
""")
    
    asyncio.run(setup_whatsapp())
