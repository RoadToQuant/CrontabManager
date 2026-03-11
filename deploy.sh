#!/bin/bash

# Crontab Manager - Ubuntu 22.04 Deploy Script
# Usage: ./deploy.sh [project_path]
# Default path: /opt/script-monitor

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_PATH="${1:-/opt/script-monitor}"
BACKEND_DIR="$PROJECT_PATH/backend"
FRONTEND_DIR="$PROJECT_PATH/frontend"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Crontab Manager Deploy Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Project Path: $PROJECT_PATH"
echo ""

if [ "$EUID" -eq 0 ]; then
   echo -e "${YELLOW}Warning: Running as root user${NC}"
fi

echo -e "${YELLOW}[1/6] Checking system dependencies...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node not found${NC}"
    exit 1
fi

if ! command -v crontab &> /dev/null; then
    echo -e "${RED}Error: crontab not found. Install cron package.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version too old (requires 18+)${NC}"
    exit 1
fi

echo -e "${GREEN}  Python3: $(python3 --version)${NC}"
echo -e "${GREEN}  Node.js: $(node --version)${NC}"
echo -e "${GREEN}  Cron: $(crontab -V 2>/dev/null || echo 'installed')${NC}"

echo -e "${YELLOW}[2/6] Checking project structure...${NC}"

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project directory does not exist: $PROJECT_PATH${NC}"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Incomplete project structure${NC}"
    exit 1
fi

echo -e "${GREEN}  Project structure check passed${NC}"

echo -e "${YELLOW}[3/6] Creating data directories...${NC}"

mkdir -p "$BACKEND_DIR/data/scripts"
mkdir -p "$BACKEND_DIR/data/logs"
mkdir -p "$PROJECT_PATH/logs"
chmod -R 755 "$BACKEND_DIR/data"

echo -e "${GREEN}  Data directories created${NC}"

echo -e "${YELLOW}[4/6] Installing backend dependencies...${NC}"

mkdir -p ~/.pip
cat > ~/.pip/pip.conf << 'EOF'
[global]
index-url = https://mirrors.aliyun.com/pypi/simple/
trusted-host = mirrors.aliyun.com
EOF

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/ -q
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ -q

echo -e "${GREEN}  Backend dependencies installed${NC}"

echo -e "${YELLOW}[5/6] Installing frontend dependencies...${NC}"

cd "$FRONTEND_DIR"
npm install

echo -e "${GREEN}  Frontend dependencies installed${NC}"

echo -e "${YELLOW}[6/6] Creating startup scripts...${NC}"

# Create start.sh
cat > "$PROJECT_PATH/start.sh" << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
PROJECT_PATH="$(pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_PATH/.env" ]; then
    export $(grep -v '^#' "$PROJECT_PATH/.env" | xargs)
fi

# Default values
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "================================"
echo "  Crontab Manager Startup Script"
echo "================================"
echo ""
echo "Backend: $BACKEND_HOST:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo ""

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

echo "[1/2] Starting backend service..."
cd "$PROJECT_PATH/backend"
source venv/bin/activate

if check_port "$BACKEND_PORT"; then
    nohup python main.py > ../logs/backend.log 2>&1 &
    echo "  Backend started, PID: $!"
else
    echo "  Warning: Port $BACKEND_PORT is already in use"
fi

echo "[2/2] Starting frontend service..."
cd "$PROJECT_PATH/frontend"

if check_port "$FRONTEND_PORT"; then
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    echo "  Frontend started, PID: $!"
else
    echo "  Warning: Port $FRONTEND_PORT is already in use"
fi

echo ""
echo "================================"
echo "Services started"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend: http://$BACKEND_HOST:$BACKEND_PORT"
echo "================================"
SCRIPT

chmod +x "$PROJECT_PATH/start.sh"

# Create stop.sh
cat > "$PROJECT_PATH/stop.sh" << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")" 2>/dev/null || cd "$(dirname "$BASH_SOURCE")"
PROJECT_PATH="$(pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_PATH/.env" ]; then
    export $(grep -v '^#' "$PROJECT_PATH/.env" | xargs)
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "================================"
echo "  Stopping Crontab Manager"
echo "================================"
echo ""

# Stop backend
echo "[1/2] Stopping backend service..."
BACKEND_PID=$(lsof -Pi :"$BACKEND_PORT" -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || kill -9 "$BACKEND_PID" 2>/dev/null
    echo "  Backend stopped (PID: $BACKEND_PID)"
else
    # Fallback to process name
    pkill -f "python main.py" 2>/dev/null || true
    echo "  Backend process stopped"
fi

# Stop frontend
echo "[2/2] Stopping frontend service..."
FRONTEND_PID=$(lsof -Pi :"$FRONTEND_PORT" -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || kill -9 "$FRONTEND_PID" 2>/dev/null
    echo "  Frontend stopped (PID: $FRONTEND_PID)"
else
    # Fallback to process name
    pkill -f "npm run dev" 2>/dev/null || true
    echo "  Frontend process stopped"
fi

echo ""
echo "================================"
echo "  All services stopped"
echo "================================"
SCRIPT

chmod +x "$PROJECT_PATH/stop.sh"

# Create status.sh
cat > "$PROJECT_PATH/status.sh" << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")" 2>/dev/null || cd "$(dirname "$BASH_SOURCE")"
PROJECT_PATH="$(pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_PATH/.env" ]; then
    export $(grep -v '^#' "$PROJECT_PATH/.env" | xargs)
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "================================"
echo "  Crontab Manager Status"
echo "================================"
echo ""

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

if check_port "$BACKEND_PORT"; then
    BACKEND_PID=$(lsof -Pi :"$BACKEND_PORT" -sTCP:LISTEN -t 2>/dev/null)
    echo "Backend:  Running (PID: $BACKEND_PID, Port: $BACKEND_PORT)"
else
    echo "Backend:  Stopped (Port: $BACKEND_PORT)"
fi

if check_port "$FRONTEND_PORT"; then
    FRONTEND_PID=$(lsof -Pi :"$FRONTEND_PORT" -sTCP:LISTEN -t 2>/dev/null)
    echo "Frontend: Running (PID: $FRONTEND_PID, Port: $FRONTEND_PORT)"
else
    echo "Frontend: Stopped (Port: $FRONTEND_PORT)"
fi

echo ""
echo "================================"
SCRIPT

chmod +x "$PROJECT_PATH/status.sh"

# Copy development and production scripts if they exist
if [ -f "$PROJECT_PATH/start_dev.sh" ]; then
    chmod +x "$PROJECT_PATH/start_dev.sh"
fi

if [ -f "$PROJECT_PATH/start_prod.sh" ]; then
    chmod +x "$PROJECT_PATH/start_prod.sh"
fi

# Create .env from example if not exists
if [ ! -f "$PROJECT_PATH/.env" ]; then
    if [ -f "$PROJECT_PATH/.env.example" ]; then
        cp "$PROJECT_PATH/.env.example" "$PROJECT_PATH/.env"
        echo "  Created .env from .env.example"
    fi
fi

# Create frontend .env.local if not exists
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    if [ -f "$FRONTEND_DIR/.env.example" ]; then
        cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"
        echo "  Created frontend .env.local"
    fi
fi

echo -e "${GREEN}  Startup scripts created${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Deploy Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Project Path: $PROJECT_PATH"
echo ""
echo "Configuration:"
echo "  1. Edit $PROJECT_PATH/.env for backend settings"
echo "  2. Edit $FRONTEND_DIR/.env.local for frontend settings"
echo ""
echo "Start services:"
echo "  Development:  ./start_dev.sh   (with hot reload)"
echo "  Production:   ./start_prod.sh  (optimized, background)"
echo "  Simple:       ./start.sh       (basic foreground mode)"
echo ""
echo "Stop services:"
echo "  ./stop.sh"
echo ""
echo "Check status:"
echo "  ./status.sh"
echo ""
echo "Access:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo ""
