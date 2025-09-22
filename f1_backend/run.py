#!/usr/bin/env python3
"""
Simple script to run the F1 Qualifying Results API
This script handles the setup and starts the server
"""

import os
import sys
import subprocess
import time

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def create_cache_directory():
    """Create cache directory if it doesn't exist"""
    cache_dir = os.path.join(os.getcwd(), "cache")
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
        print(f"✅ Created cache directory: {cache_dir}")
    else:
        print(f"✅ Cache directory exists: {cache_dir}")
    return True

def main():
    """Main function to run the API"""
    print("🏎️ F1 Qualifying Results API Startup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return 1
    
    # Create cache directory
    create_cache_directory()
    
    # Install dependencies
    if not install_dependencies():
        return 1
    
    print("\n🚀 Starting F1 Qualifying Results API...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    print("=" * 50)
    
    try:
        # Start the server
        subprocess.run([sys.executable, "start.py"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
