# Backend Integration Report: Telegram-Compatible LLM Chat System

## Executive Summary

This report provides comprehensive integration specifications for connecting a Telegram-compatible LLM backend client to the Daredevil Sports Betting Platform's AI Chat Assistant. The frontend has been redesigned as a lean message relay system that sends user messages (text and voice) to your backend and displays responses.

## Frontend Implementation Status

### ✅ Completed Features

1. **Lean Message Relay Architecture**
   - Frontend acts purely as a message relay
   - No TTS/STT processing on frontend
   - All AI processing handled by backend

2. **Dual Input Support**
   - Text input via textarea
   - Voice input via WebRTC MediaRecorder
   - Toggle between input types

3. **Real-time Chat Interface**
   - Message history display
   - Loading states
   - Error handling
   - Responsive design

4. **Session Management**
   - Unique session IDs per chat instance
   - User authentication via blockchain service
   - Persistent chat history

## Backend Integration Requirements

### API Endpoint Specification

**Endpoint:** `POST /chat`

**Request Format:**
```typescript
// FormData payload
{
  message: string,           // User's message content
  type: 'text' | 'voice',   // Message type
  sessionId: string,        // Unique session identifier
  userId: string,           // User's wallet address
  username: string,         // User's generated username
  audio?: Blob             // Audio file (for voice messages)
}
```

**Response Format:**
```typescript
{
  message: string,          // AI response text
  type: 'text' | 'voice',  // Response type
  audioUrl?: string        // URL to audio file (for voice responses)
}
```

### Environment Configuration

Add to your `.env` file:
```bash
REACT_APP_CHAT_API_URL=http://localhost:8000  # Your backend URL
```

### Message Flow Examples

#### Text Message Flow
```typescript
// Frontend sends:
FormData {
  message: "What are today's F1 predictions?",
  type: "text",
  sessionId: "session_1703123456789_0.123456789",
  userId: "0x1234...",
  username: "CryptoRacer123"
}

// Backend responds:
{
  message: "Based on current data, I predict Verstappen will win today's race with a 65% probability...",
  type: "text"
}
```

#### Voice Message Flow
```typescript
// Frontend sends:
FormData {
  message: "[Voice Message]",
  type: "voice",
  sessionId: "session_1703123456789_0.123456789",
  userId: "0x1234...",
  username: "CryptoRacer123",
  audio: Blob // WebM audio file
}

// Backend responds:
{
  message: "I heard your voice message about betting strategies. Here's my analysis...",
  type: "voice",
  audioUrl: "https://your-backend.com/audio/response_12345.mp3"
}
```

## Backend Implementation Guide

### 1. Session Management

**Requirements:**
- Maintain conversation context per sessionId
- Store user preferences and history
- Implement session timeout (recommended: 30 minutes)

**Implementation:**
```python
import redis
import json
from datetime import datetime, timedelta

class SessionManager:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self.session_timeout = 1800  # 30 minutes
    
    def get_session_context(self, session_id: str) -> dict:
        """Retrieve session context from Redis"""
        context_data = self.redis_client.get(f"session:{session_id}")
        if context_data:
            return json.loads(context_data)
        return {"messages": [], "user_preferences": {}}
    
    def save_session_context(self, session_id: str, context: dict):
        """Save session context to Redis"""
        self.redis_client.setex(
            f"session:{session_id}", 
            self.session_timeout, 
            json.dumps(context)
        )
    
    def add_message_to_context(self, session_id: str, message: dict):
        """Add message to session context"""
        context = self.get_session_context(session_id)
        context["messages"].append({
            "content": message["content"],
            "type": message["type"],
            "timestamp": datetime.now().isoformat(),
            "is_user": True
        })
        # Keep only last 10 messages for context
        context["messages"] = context["messages"][-10:]
        self.save_session_context(session_id, context)
```

### 2. Message Processing

**Text Message Processing:**
```python
async def process_text_message(message_data: dict) -> dict:
    """Process text message and generate response"""
    session_id = message_data["sessionId"]
    user_message = message_data["message"]
    
    # Get session context
    session_manager = SessionManager()
    context = session_manager.get_session_context(session_id)
    
    # Add user message to context
    session_manager.add_message_to_context(session_id, {
        "content": user_message,
        "type": "text"
    })
    
    # Generate AI response using your LLM
    ai_response = await your_llm_client.generate_response(
        message=user_message,
        context=context,
        user_id=message_data["userId"]
    )
    
    # Add AI response to context
    session_manager.add_message_to_context(session_id, {
        "content": ai_response,
        "type": "text",
        "is_user": False
    })
    
    return {
        "message": ai_response,
        "type": "text"
    }
```

**Voice Message Processing:**
```python
import speech_recognition as sr
import pyttsx3
import tempfile
import os

async def process_voice_message(message_data: dict, audio_file) -> dict:
    """Process voice message and generate response"""
    session_id = message_data["sessionId"]
    
    # Convert speech to text
    transcribed_text = await transcribe_audio(audio_file)
    
    # Process as text message
    text_response = await process_text_message({
        **message_data,
        "message": transcribed_text
    })
    
    # Convert response to speech
    audio_url = await text_to_speech(text_response["message"])
    
    return {
        "message": text_response["message"],
        "type": "voice",
        "audioUrl": audio_url
    }

async def transcribe_audio(audio_file) -> str:
    """Transcribe audio file to text"""
    # Save audio file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
        tmp_file.write(audio_file.read())
        tmp_file_path = tmp_file.name
    
    try:
        # Use speech recognition library
        r = sr.Recognizer()
        with sr.AudioFile(tmp_file_path) as source:
            audio = r.record(source)
            text = r.recognize_google(audio)
        return text
    finally:
        os.unlink(tmp_file_path)

async def text_to_speech(text: str) -> str:
    """Convert text to speech and return audio URL"""
    # Generate unique filename
    audio_filename = f"response_{int(time.time())}.mp3"
    audio_path = f"static/audio/{audio_filename}"
    
    # Create audio file
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
    engine.setProperty('volume', 0.9)
    engine.save_to_file(text, audio_path)
    engine.runAndWait()
    
    # Return public URL
    return f"https://your-backend.com/{audio_path}"
```

### 3. FastAPI Implementation

```python
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Daredevil Chat API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat_endpoint(
    message: str = Form(...),
    type: str = Form(...),
    sessionId: str = Form(...),
    userId: str = Form(...),
    username: str = Form(...),
    audio: UploadFile = File(None)
):
    """Main chat endpoint"""
    try:
        message_data = {
            "message": message,
            "type": type,
            "sessionId": sessionId,
            "userId": userId,
            "username": username
        }
        
        if type == "voice" and audio:
            # Process voice message
            response = await process_voice_message(message_data, audio)
        else:
            # Process text message
            response = await process_text_message(message_data)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "chat-api"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Security Considerations

### 1. Authentication
- Validate user authentication via blockchain service
- Implement rate limiting per user/session
- Sanitize all user inputs

### 2. File Handling
- Validate audio file types and sizes
- Implement virus scanning for uploaded files
- Use secure file storage

### 3. Session Security
- Use secure session IDs
- Implement session expiration
- Encrypt sensitive session data

## Performance Optimization

### 1. Caching
- Cache frequently asked questions
- Implement response caching for similar queries
- Use Redis for session storage

### 2. Audio Processing
- Compress audio files before storage
- Implement audio file cleanup
- Use CDN for audio file delivery

### 3. Database Optimization
- Index session IDs and user IDs
- Implement connection pooling
- Use async database operations

## Testing Strategy

### 1. Unit Tests
```python
import pytest
from your_chat_service import process_text_message, process_voice_message

@pytest.mark.asyncio
async def test_text_message_processing():
    message_data = {
        "message": "Hello, AI!",
        "type": "text",
        "sessionId": "test_session",
        "userId": "test_user",
        "username": "test_user"
    }
    
    response = await process_text_message(message_data)
    assert response["type"] == "text"
    assert len(response["message"]) > 0

@pytest.mark.asyncio
async def test_voice_message_processing():
    # Test with sample audio file
    with open("test_audio.webm", "rb") as audio_file:
        message_data = {
            "message": "[Voice Message]",
            "type": "voice",
            "sessionId": "test_session",
            "userId": "test_user",
            "username": "test_user"
        }
        
        response = await process_voice_message(message_data, audio_file)
        assert response["type"] == "voice"
        assert "audioUrl" in response
```

### 2. Integration Tests
- Test full message flow from frontend to backend
- Test session persistence
- Test error handling scenarios

## Deployment Checklist

### 1. Environment Setup
- [ ] Redis server running
- [ ] Audio storage directory created
- [ ] Environment variables configured
- [ ] SSL certificates installed

### 2. Dependencies
```bash
pip install fastapi uvicorn redis speechrecognition pyttsx3 python-multipart
```

### 3. File Structure
```
your-backend/
├── main.py
├── requirements.txt
├── static/
│   └── audio/
├── tests/
└── config/
    └── settings.py
```

## Monitoring and Logging

### 1. Logging Configuration
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('chat_api.log'),
        logging.StreamHandler()
    ]
)
```

### 2. Metrics to Track
- Message processing time
- Session duration
- Error rates
- Audio processing success rate
- User engagement metrics

## Troubleshooting Guide

### Common Issues

1. **CORS Errors**
   - Ensure CORS middleware is properly configured
   - Check allowed origins in frontend URL

2. **Audio Processing Failures**
   - Verify audio file format support
   - Check file size limits
   - Ensure audio processing dependencies are installed

3. **Session Timeout Issues**
   - Adjust Redis session timeout
   - Implement session refresh mechanism

4. **Memory Issues**
   - Implement audio file cleanup
   - Monitor Redis memory usage
   - Use connection pooling

## Next Steps

1. **Immediate Actions**
   - Set up Redis server
   - Install required dependencies
   - Configure environment variables
   - Test basic text message flow

2. **Phase 2 Development**
   - Implement voice message processing
   - Add session management
   - Implement error handling
   - Add logging and monitoring

3. **Phase 3 Optimization**
   - Performance tuning
   - Security hardening
   - Load testing
   - Production deployment

## Support and Maintenance

### Contact Information
- Frontend Developer: [Your Contact]
- Backend Developer: [Your Contact]
- System Administrator: [Your Contact]

### Documentation Updates
This document should be updated as the system evolves. Key areas for updates:
- API endpoint changes
- New feature additions
- Security updates
- Performance improvements

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** January 2025
