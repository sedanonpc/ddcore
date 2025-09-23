#!/usr/bin/env python3
"""
Test script to verify backend client integration
This script simulates your backend client to test the proxy functionality
"""

import asyncio
import json
import tempfile
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simulate your backend client
mock_backend = FastAPI(title="Mock Backend Client", version="1.0.0")

# CORS configuration
mock_backend.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@mock_backend.get("/health")
async def health():
    return {"status": "healthy", "service": "mock-backend-client"}

@mock_backend.post("/chat")
async def chat(
    message: str = Form(...),
    type: str = Form(...),
    sessionId: str = Form(...),
    userId: str = Form(...),
    username: str = Form(...),
    audio: UploadFile = File(None)
):
    """Simulate your backend client's chat endpoint"""
    logger.info(f"Mock backend received: {message} (type: {type}, user: {username})")
    
    # Simulate different responses based on message content
    if "f1" in message.lower():
        response_text = "🏎️ F1 Analysis: Based on current data, I predict Verstappen will dominate this season. The Red Bull car shows exceptional performance in qualifying sessions."
    elif "bet" in message.lower():
        response_text = "🎯 Betting Analysis: I recommend checking the latest odds and team statistics. The current form suggests some interesting opportunities."
    elif "voice" in message.lower() or type == "voice":
        response_text = "🎤 Voice message received! I can process both text and voice inputs. This is a simulated voice response."
        return {
            "message": response_text,
            "type": "voice",
            "audioUrl": "/api/voice/mock_response.mp3"
        }
    else:
        response_text = f"🤖 Mock Backend Response: I received your message '{message}' and processed it successfully. This is a simulated response from your actual backend client."
    
    return {
        "message": response_text,
        "type": "text",
        "audioUrl": None
    }

async def start_mock_backend():
    """Start the mock backend server"""
    config = uvicorn.Config(
        mock_backend,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

async def test_integration():
    """Test the integration between our LLM backend and the mock backend client"""
    print("🧪 Testing Backend Integration...")
    print("=" * 50)
    
    # Test 1: Check if our LLM backend can detect the mock backend
    print("1️⃣ Testing backend detection...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://127.0.0.1:8001/health")
            health_data = response.json()
            backend_available = health_data.get("backend_client", {}).get("available", False)
            print(f"   Backend available: {backend_available}")
            if backend_available:
                print("   ✅ Backend client detected!")
            else:
                print("   ❌ Backend client not detected")
        except Exception as e:
            print(f"   ❌ Error checking health: {e}")
    
    # Test 2: Send a text message through our LLM backend
    print("\n2️⃣ Testing text message proxy...")
    async with httpx.AsyncClient() as client:
        try:
            form_data = {
                "message": "Hello, can you help me with F1 predictions?",
                "type": "text",
                "sessionId": "integration_test_123",
                "userId": "12345",
                "username": "testuser"
            }
            
            response = await client.post("http://127.0.0.1:8001/chat", data=form_data)
            result = response.json()
            
            print(f"   Status: {response.status_code}")
            print(f"   Response: {result.get('message', 'No message')}")
            
            if "Mock Backend Response" in result.get('message', ''):
                print("   ✅ Successfully proxied to mock backend!")
            else:
                print("   ❌ Did not proxy to backend (using placeholder)")
                
        except Exception as e:
            print(f"   ❌ Error testing text proxy: {e}")
    
    # Test 3: Send a voice message through our LLM backend
    print("\n3️⃣ Testing voice message proxy...")
    async with httpx.AsyncClient() as client:
        try:
            # Create a dummy audio file
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
                temp_file.write(b"dummy audio content")
                temp_file_path = temp_file.name
            
            with open(temp_file_path, "rb") as audio_file:
                files = {"audio": ("test.webm", audio_file, "audio/webm")}
                form_data = {
                    "message": "This is a voice test message",
                    "type": "voice",
                    "sessionId": "integration_test_456",
                    "userId": "67890",
                    "username": "voiceuser"
                }
                
                response = await client.post("http://127.0.0.1:8001/chat", data=form_data, files=files)
                result = response.json()
                
                print(f"   Status: {response.status_code}")
                print(f"   Response: {result.get('message', 'No message')}")
                print(f"   Audio URL: {result.get('audioUrl', 'None')}")
                
                if "voice message received" in result.get('message', '').lower():
                    print("   ✅ Successfully proxied voice message to mock backend!")
                else:
                    print("   ❌ Did not proxy voice message to backend")
                    
        except Exception as e:
            print(f"   ❌ Error testing voice proxy: {e}")
        finally:
            # Clean up temp file
            import os
            try:
                os.unlink(temp_file_path)
            except:
                pass

async def main():
    """Main function to run the integration test"""
    print("🚀 Starting Backend Integration Test")
    print("This will test if our LLM backend can properly proxy to your backend client")
    print("=" * 60)
    
    # Start mock backend in background
    print("📡 Starting mock backend client on port 8000...")
    backend_task = asyncio.create_task(start_mock_backend())
    
    # Wait a moment for the backend to start
    await asyncio.sleep(2)
    
    try:
        # Run integration tests
        await test_integration()
        
        print("\n" + "=" * 60)
        print("🎯 Integration Test Complete!")
        print("\nNext steps:")
        print("1. Start your actual backend client on port 8000")
        print("2. Test with real messages")
        print("3. Verify voice processing works")
        
    finally:
        # Stop the mock backend
        backend_task.cancel()
        try:
            await backend_task
        except asyncio.CancelledError:
            pass

if __name__ == "__main__":
    asyncio.run(main())
