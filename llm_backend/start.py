import uvicorn
import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🤖 Starting Daredevil LLM Chat API...")
    print("📍 Server will be available at: http://127.0.0.1:8001")
    print("📚 API Documentation: http://127.0.0.1:8001/docs")
    print("🔍 Health Check: http://127.0.0.1:8001/health")
    print("💬 Chat Endpoint: http://127.0.0.1:8001/chat")
    print("🔊 Voice Files: http://127.0.0.1:8001/api/voice/")
    print("=" * 50)
    
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8001, 
        reload=True,
        log_level="info"
    )
