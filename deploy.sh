#!/bin/bash

# Script Monitor - Ubuntu 22.04 Deploy Script
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
echo -e "${GREEN}  Script Monitor Deploy Script${NC}"
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

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version too old (requires 18+)${NC}"
    exit 1
fi

echo -e "${GREEN}  Python3: $(python3 --version)${NC}"
echo -e "${GREEN}  Node.js: $(node --version)${NC}"

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

cat > "$PROJECT_PATH/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
PROJECT_PATH="$(pwd)"

echo "================================"
echo "  Script Monitor Startup Script"
echo "================================"
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

if check_port 8000; then
    nohup python main.py > ../logs/backend.log 2>&1 &
    echo "  Backend started, PID: $!"
else
    echo "  Warning: Port 8000 is already in use"
fi

echo "[2/2] Starting frontend service..."
cd "$PROJECT_PATH/frontend"

if check_port 3000; then
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    echo "  Frontend started, PID: $!"
else
    echo "  Warning: Port 3000 is already in use"
fi

echo ""
echo "================================"
echo "Services started"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:8000"
echo "================================"
EOF

chmod +x "$PROJECT_PATH/start.sh"

cat > "$PROJECT_PATH/stop.sh" << 'EOF'
#!/bin/bash
echo "Stopping Script Monitor services..."
pkill -f "python main.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
echo "Services stopped"
EOF

chmod +x "$PROJECT_PATH/stop.sh"

if [ ! -f "$PROJECT_PATH/.env" ]; then
    cp "$PROJECT_PATH/.env.example" "$PROJECT_PATH/.env"
    echo "  Created .env config file"
fi

echo -e "${GREEN}  Startup scripts created${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Deploy Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Project Path: $PROJECT_PATH"
echo ""
echo "Start services:"
echo "  cd $PROJECT_PATH"
echo "  ./start.sh"
echo ""
echo "Access:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:8000"
echo ""
