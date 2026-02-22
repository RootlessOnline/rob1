@echo off
REM Autonomous Hierarchical Agent System - Windows Setup Script

echo ===============================================================
echo      AUTONOMOUS AGENT SYSTEM - WINDOWS SETUP
echo ===============================================================
echo.

REM Check Python
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo       Python found!

REM Check Ollama
echo.
echo [2/6] Checking Ollama...
ollama --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama not found!
    echo.
    echo Please install Ollama from: https://ollama.com/download
    echo After installation, run: ollama pull qwen2.5:14b
    echo.
    pause
) else (
    echo       Ollama found!
)

REM Check if Ollama is running
echo.
echo [3/6] Checking if Ollama is running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama is not running!
    echo Starting Ollama...
    start "" ollama serve
    timeout /t 5 /nobreak >nul
)

REM Create virtual environment
echo.
echo [4/6] Creating virtual environment...
if not exist ".venv" (
    python -m venv .venv
    echo       Virtual environment created!
) else (
    echo       Virtual environment already exists!
)

REM Activate and install dependencies
echo.
echo [5/6] Installing dependencies...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install langchain langchain-ollama langchain-community duckduckgo-search requests beautifulsoup4 rich pydantic python-dotenv >nul 2>&1
echo       Dependencies installed!

REM Create directories
echo.
echo [6/6] Creating directories...
if not exist "spawned" mkdir spawned
if not exist "logs" mkdir logs
if not exist "data" mkdir data
echo       Directories created!

echo.
echo ===============================================================
echo                   SETUP COMPLETE!
echo ===============================================================
echo.
echo To run the system:
echo.
echo   1. Activate:   .venv\Scripts\activate
echo   2. Run:        python main.py
echo.
echo Or run this single command:
echo.
echo   .venv\Scripts\activate ^&^& python main.py
echo.
echo ===============================================================
pause
