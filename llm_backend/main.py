from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
import json
import time
import asyncio
import tempfile
import logging
import httpx
from typing import Dict, Optional
from datetime import datetime
# import speech_recognition as sr  # Disabled for Python 3.13 compatibility
# import pyttsx3  # Disabled for Python 3.13 compatibility
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Daredevil LLM Chat API", version="1.0.0")

# CORS configuration - open for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for voice files
VOICE_DIR = Path("temp_voice_files")
VOICE_DIR.mkdir(exist_ok=True)

# Mount static files for voice serving
app.mount("/api/voice", StaticFiles(directory=str(VOICE_DIR)), name="voice")

# In-memory session storage (use Redis in production)
sessions: Dict[str, Dict] = {}

# Backend client configuration
BACKEND_CLIENT_URL = "https://mercy-tooth-jpg-attached.trycloudflare.com"
BACKEND_TIMEOUT = 30.0

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected for user: {user_id}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user: {user_id}")

    async def send_message(self, user_id: str, message: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

def get_session_context(session_id: str) -> Dict:
    """Get or create session context"""
    if session_id not in sessions:
        sessions[session_id] = {
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }
    return sessions[session_id]

def add_message_to_session(session_id: str, message: Dict):
    """Add message to session context"""
    context = get_session_context(session_id)
    context["messages"].append({
        "content": message["content"],
        "type": message["type"],
        "timestamp": datetime.now().isoformat(),
        "is_user": message.get("is_user", True)
    })
    # Keep only last 10 messages for context
    context["messages"] = context["messages"][-10:]
    context["last_activity"] = datetime.now().isoformat()

async def check_backend_availability() -> bool:
    """Check if the backend client is available"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BACKEND_CLIENT_URL}/health")
            return response.status_code == 200
    except Exception as e:
        logger.warning(f"Backend client not available: {e}")
        return False

async def proxy_to_backend_client(
    message: str,
    type: str,
    sessionId: str,
    userId: str,
    username: str,
    audio_file: Optional[UploadFile] = None
) -> Dict:
    """Proxy request to the actual backend client"""
    try:
        async with httpx.AsyncClient(timeout=BACKEND_TIMEOUT) as client:
            # Prepare form data
            form_data = {
                "message": message,
                "type": type,
                "sessionId": sessionId,
                "userId": userId,
                "username": username
            }
            
            files = {}
            if audio_file and type == "voice":
                # Read audio file content
                audio_content = await audio_file.read()
                files["audio"] = (audio_file.filename or "audio.webm", audio_content, audio_file.content_type)
            
            # Make request to backend client
            response = await client.post(
                f"{BACKEND_CLIENT_URL}/chat",
                data=form_data,
                files=files
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Backend client error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Backend error: {response.text}")
                
    except httpx.TimeoutException:
        logger.error("Backend client timeout")
        raise HTTPException(status_code=504, detail="Backend client timeout")
    except httpx.ConnectError:
        logger.error("Backend client connection failed")
        raise HTTPException(status_code=503, detail="Backend client unavailable")
    except Exception as e:
        logger.error(f"Error proxying to backend: {e}")
        raise HTTPException(status_code=500, detail=f"Backend proxy error: {str(e)}")

async def transcribe_audio(audio_file) -> str:
    """Transcribe audio file to text - placeholder implementation"""
    try:
        # Placeholder implementation - replace with actual STT service
        logger.info("Voice message received - STT not implemented yet")
        return "I received your voice message, but speech-to-text is not implemented yet. Please use text messages for now."
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        return "Sorry, I couldn't process the audio message."

async def text_to_speech(text: str) -> str:
    """Convert text to speech - placeholder implementation"""
    try:
        # Placeholder implementation - replace with actual TTS service
        logger.info(f"TTS requested for: {text[:50]}...")
        return None  # No audio file generated
    except Exception as e:
        logger.error(f"Error creating TTS: {e}")
        return None

async def generate_llm_response(message: str, session_context: Dict, user_id: str) -> str:
    """Generate LLM response - replace with your actual LLM integration"""
    # This is a placeholder - replace with your actual LLM client
    # For now, we'll create a simple response based on the message
    
    context_messages = session_context.get("messages", [])
    
    # Simple response logic (replace with your LLM)
    if "f1" in message.lower() or "formula" in message.lower():
        return "I can help you with F1 predictions and analysis! Based on current data, I'd recommend checking the latest qualifying results and driver performance metrics."
    elif "bet" in message.lower() or "betting" in message.lower():
        return "For sports betting insights, I can analyze match statistics, team performance, and historical data to help you make informed decisions."
    elif "hello" in message.lower() or "hi" in message.lower():
        return "Hello! I'm your AI assistant for sports betting and F1 analysis. How can I help you today?"
    else:
        return f"I understand you said: '{message}'. I'm here to help with sports betting analysis, F1 predictions, and match insights. What specific information are you looking for?"

@app.get("/health")
async def health_check():
    backend_status = await check_backend_availability()
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(), 
        "service": "llm-chat-api",
        "backend_client": {
            "url": BACKEND_CLIENT_URL,
            "available": backend_status
        }
    }

@app.post("/chat")
async def chat_endpoint(
    message: str = Form(...),
    type: str = Form(...),
    sessionId: str = Form(...),
    userId: str = Form(...),
    username: str = Form(...),
    audio: Optional[UploadFile] = File(None)
):
    """Main chat endpoint for text and voice messages"""
    try:
        logger.info(f"Chat request - Type: {type}, User: {username}, Session: {sessionId}")
        
        # Validate request
        if type not in ["text", "voice"]:
            raise HTTPException(status_code=400, detail="Type must be 'text' or 'voice'")
        
        if type == "voice" and not audio:
            raise HTTPException(status_code=400, detail="Audio file required for voice messages")
        
        if type == "voice" and audio.content_type and not audio.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Check if backend client is available
        backend_available = await check_backend_availability()
        
        if backend_available:
            logger.info("Backend client available - proxying request")
            try:
                # Proxy to backend client
                result = await proxy_to_backend_client(
                    message=message,
                    type=type,
                    sessionId=sessionId,
                    userId=userId,
                    username=username,
                    audio_file=audio
                )
                
                # Add messages to our session for tracking
                add_message_to_session(sessionId, {
                    "content": message,
                    "type": type,
                    "is_user": True
                })
                add_message_to_session(sessionId, {
                    "content": result.get("message", ""),
                    "type": result.get("type", "text"),
                    "is_user": False
                })
                
                return result
                
            except HTTPException as e:
                logger.error(f"Backend client error: {e.detail}")
                # Fall through to placeholder response
            except Exception as e:
                logger.error(f"Unexpected error with backend client: {e}")
                # Fall through to placeholder response
        
        # Fallback to placeholder implementation
        logger.info("Using placeholder implementation")
        session_context = get_session_context(sessionId)
        
        # Process the message
        if type == "voice":
            # Transcribe audio
            transcribed_text = await transcribe_audio(audio.file)
            logger.info(f"Transcribed: {transcribed_text}")
            
            # Add user message to session
            add_message_to_session(sessionId, {
                "content": transcribed_text,
                "type": "voice",
                "is_user": True
            })
            
            # Generate response
            response_text = await generate_llm_response(transcribed_text, session_context, userId)
            
            # Create TTS
            audio_url = await text_to_speech(response_text)
            
            # Add AI response to session
            add_message_to_session(sessionId, {
                "content": response_text,
                "type": "voice",
                "is_user": False
            })
            
            return {
                "message": response_text,
                "type": "voice",
                "audioUrl": audio_url
            }
        
        else:  # text message
            # Add user message to session
            add_message_to_session(sessionId, {
                "content": message,
                "type": "text",
                "is_user": True
            })
            
            # Generate response
            response_text = await generate_llm_response(message, session_context, userId)
            
            # Add AI response to session
            add_message_to_session(sessionId, {
                "content": response_text,
                "type": "text",
                "is_user": False
            })
            
            return {
                "message": response_text,
                "type": "text",
                "audioUrl": None
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time text communication"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            logger.info(f"WebSocket message from {user_id}: {data}")
            
            # Echo back for now (replace with your LLM processing)
            response = f"Echo: {data}"
            await manager.send_message(user_id, response)
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@app.get("/api/voice/{filename}")
async def serve_voice_file(filename: str):
    """Serve voice files with proper MIME type"""
    file_path = VOICE_DIR / filename
    
    # Security check - prevent path traversal
    if not file_path.exists() or not str(file_path.resolve()).startswith(str(VOICE_DIR.resolve())):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="audio/mpeg",
        filename=filename
    )

@app.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get session information (for debugging)"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return sessions[session_id]

if __name__ == "__main__":
    print("🤖 Starting Daredevil LLM Chat API...")
    print("📍 Server will be available at: http://127.0.0.1:8000")
    print("📚 API Documentation: http://127.0.0.1:8000/docs")
    print("🔍 Health Check: http://127.0.0.1:8000/health")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )
