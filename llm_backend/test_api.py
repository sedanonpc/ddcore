import requests
import json

def test_chat_api():
    """Test the chat API endpoint"""
    url = "http://127.0.0.1:8001/chat"
    
    # Test data
    data = {
        'message': 'Hello AI, can you help me with F1 predictions?',
        'type': 'text',
        'sessionId': 'test_session_123',
        'userId': 'user_456',
        'username': 'testuser'
    }
    
    try:
        print("🧪 Testing LLM Chat API...")
        print(f"📡 Sending request to: {url}")
        print(f"📝 Data: {data}")
        
        response = requests.post(url, data=data)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"🤖 AI Response: {result}")
        else:
            print("❌ Error!")
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {e}")

def test_health():
    """Test the health endpoint"""
    url = "http://127.0.0.1:8001/health"
    
    try:
        print("🏥 Testing Health Endpoint...")
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Health Check Passed!")
            print(f"📊 Status: {result}")
        else:
            print("❌ Health Check Failed!")
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {e}")

if __name__ == "__main__":
    test_health()
    print("\n" + "="*50 + "\n")
    test_chat_api()
