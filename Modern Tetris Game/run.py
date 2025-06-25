#!/usr/bin/env python3
"""
Python Tetris - Startup Script
A simple script to run the Tetris game with proper setup and error handling.
"""

import sys
import os
import subprocess
import webbrowser
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 7):
        print("❌ Error: Python 3.7 or higher is required!")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def install_requirements():
    """Install required packages if not already installed."""
    try:
        import flask
        print("✅ Flask is already installed")
    except ImportError:
        print("📦 Installing Flask and dependencies...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✅ Dependencies installed successfully!")
        except subprocess.CalledProcessError:
            print("❌ Error installing dependencies!")
            sys.exit(1)

def check_files():
    """Check if all required files exist."""
    required_files = [
        "app.py",
        "templates/index.html",
        "static/css/style.css",
        "static/js/tetris.js",
        "static/js/game.js"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing required files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        sys.exit(1)
    
    print("✅ All required files found!")

def start_server():
    """Start the Flask development server."""
    print("\n🚀 Starting Python Tetris server...")
    print("📍 Server will be available at: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop the server")
    print("\n" + "="*50)
    
    try:
        # Import and run the Flask app
        from app import app
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n\n👋 Thanks for playing Python Tetris!")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main function to run the Tetris game."""
    print("🐍 Python Tetris - Vibrant Colors 🎮")
    print("="*40)
    
    # Check Python version
    check_python_version()
    
    # Check required files
    check_files()
    
    # Install requirements
    install_requirements()
    
    # Ask user if they want to open browser automatically
    try:
        response = input("\n🌐 Open browser automatically? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            def open_browser():
                time.sleep(2)  # Wait for server to start
                webbrowser.open('http://localhost:5000')
            
            import threading
            browser_thread = threading.Thread(target=open_browser)
            browser_thread.daemon = True
            browser_thread.start()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main() 