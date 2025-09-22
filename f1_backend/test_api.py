#!/usr/bin/env python3
"""
Test script for the F1 Qualifying Results API
Run this to test the API endpoints before integrating with React
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Make sure the server is running.")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    return True

def test_root():
    """Test the root endpoint"""
    print("\n🏠 Testing root endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            print("✅ Root endpoint passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")

def test_available_years():
    """Test the available years endpoint"""
    print("\n📅 Testing available years endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/f1/available-years")
        if response.status_code == 200:
            print("✅ Available years endpoint passed")
            data = response.json()
            print(f"   Available years: {data['availableYears']}")
        else:
            print(f"❌ Available years endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Available years endpoint error: {e}")

def test_cache_info():
    """Test the cache info endpoint"""
    print("\n💾 Testing cache info endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/f1/cache/info")
        if response.status_code == 200:
            print("✅ Cache info endpoint passed")
            data = response.json()
            print(f"   Cache path: {data['cachePath']}")
            print(f"   Cache size: {data['cacheSizeMB']} MB")
        else:
            print(f"❌ Cache info endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Cache info endpoint error: {e}")

def test_qualifying_results():
    """Test the qualifying results endpoint"""
    print("\n🏎️ Testing qualifying results endpoint...")
    print("   This may take a while on first run (downloading data)...")
    
    try:
        # Test with 2024 Las Vegas (most recent data)
        response = requests.get(f"{API_BASE_URL}/api/f1/qualifying?year=2024&event=Las Vegas")
        
        if response.status_code == 200:
            print("✅ Qualifying results endpoint passed")
            data = response.json()
            print(f"   Event: {data['event']}")
            print(f"   Total drivers: {data['totalDrivers']}")
            print(f"   Pole position: {data['polePosition']['driver']} ({data['polePosition']['time']})")
            
            # Show top 5 results
            print("   Top 5 results:")
            for i, result in enumerate(data['results'][:5]):
                print(f"     P{result['position']}: {result['driver']} ({result['team']}) - {result['lapTime']} {result['timeDelta']}")
                
        elif response.status_code == 404:
            print("⚠️  No qualifying data found (this is normal for some events)")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Qualifying results endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Qualifying results endpoint error: {e}")

def test_events():
    """Test the events endpoint"""
    print("\n📋 Testing events endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/f1/events/2024")
        if response.status_code == 200:
            print("✅ Events endpoint passed")
            data = response.json()
            print(f"   Found {len(data['events'])} events for 2024")
            print("   First 5 events:")
            for event in data['events'][:5]:
                print(f"     Round {event['round']}: {event['name']} ({event['location']})")
        else:
            print(f"❌ Events endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Events endpoint error: {e}")

def main():
    """Run all tests"""
    print("🧪 F1 Qualifying Results API Test Suite")
    print("=" * 50)
    
    # Test basic connectivity first
    if not test_health():
        print("\n❌ Cannot connect to API. Please start the server first:")
        print("   cd f1_backend && python start.py")
        return
    
    # Run all tests
    test_root()
    test_available_years()
    test_cache_info()
    test_events()
    test_qualifying_results()
    
    print("\n" + "=" * 50)
    print("🎉 Test suite completed!")
    print("\n📚 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")

if __name__ == "__main__":
    main()
