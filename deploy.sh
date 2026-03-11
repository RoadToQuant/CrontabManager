#!/bin/bash

# Crontab Manager - Ubuntu 22.04 Deploy Script
# Usage: ./deploy.sh [options] [project_path]
# Options:
#   --fresh    Force create new virtual environment
#   --conda    Use conda environment (must be configured in .env)
#   --venv     Use venv (default)
#   -h, --help Show help
# Default path: /opt/script-monitor

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
FRESH_INSTALL=false
USE_CONDA=false
USE_VENV=true
PROJECT_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        --conda)
            USE_CONDA=true
            USE_VENV=false
            shift
            ;;
        --venv)
            USE_CONDA=false
            USE_VENV=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./deploy.sh [options] [project_path]"
            echo ""
            echo "Options:"
            echo "  --fresh     Force create new virtual environment"
            echo "  --conda     Use conda environment (configure .env first)"
            echo "  --venv      Use venv (default)"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./deploy.sh                           # Auto-detect environment"
            echo "  ./deploy.sh --fresh                   # Create fresh venv"
            echo "  ./deploy.sh --conda                   # Use conda environment"
            echo "  ./deploy.sh /opt/crontab-manager      # Deploy to custom path"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
        *)
            PROJECT_PATH="$1"
            shift
            ;;
    esac
done

# Set default project path
PROJECT_PATH="${PROJECT_PATH:-/opt/script-monitor}"
BACKEND_DIR="$PROJECT_PATH/backend"
FRONTEND_DIR="$PROJECT_PATH/frontend"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Crontab Manager Deploy Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Project Path: $PROJECT_PATH"

# Load existing .env if present
if [ -f "$PROJECT_PATH/.env" ]; then
    set -a
    source "$PROJECT_PATH/.env"
    set +a
    echo "Loaded existing .env configuration"
fi

# Determine Python environment type
if [ "$USE_CONDA" = true ]; then
    PYTHON_ENV_TYPE="conda"
elif [ "$USE_VENV" = true ] && [ -z "$PYTHON_ENV_TYPE" ]; then
    PYTHON_ENV_TYPE="venv"
fi

echo "Python Environment: $PYTHON_ENV_TYPE"
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

echo -e "${YELLOW}[4/6] Setting up Python environment...${NC}"

cd "$BACKEND_DIR"

if [ "$PYTHON_ENV_TYPE" == "conda" ]; then
    # Conda environment setup
    CONDA_ACTIVATE="${CONDA_ACTIVATE:-/home/ubuntu/miniconda3/bin/activate}"
    CONDA_ENV="${CONDA_ENV:-py39-sm}"
    
    if [ -f "$CONDA_ACTIVATE" ]; then
        source "$CONDA_ACTIVATE"
        
        # Check if environment exists
        if conda env list | grep -q "$CONDA_ENV"; then
            echo -e "${GREEN}  Found conda environment: $CONDA_ENV${NC}"
            conda activate "$CONDA_ENV"
            
            # Install/update dependencies
            pip install --upgrade pip -q
            pip install -r requirements.txt -q
            
            echo -e "${GREEN}  Dependencies installed in conda environment${NC}"
        else
            echo -e "${RED}Error: Conda environment '$CONDA_ENV' not found${NC}"
            echo "Please create it first: conda create -n $CONDA_ENV python=3.9"
            exit 1
        fi
    else
        echo -e "${RED}Error: Conda not found at $CONDA_ACTIVATE${NC}"
        echo "Please install Miniconda or configure CONDA_ACTIVATE in .env"
        exit 1
    fi
else
    # Virtual environment setup
    if [ "$FRESH_INSTALL" = true ] && [ -d "venv" ]; then
        echo "  Removing old venv..."
        rm -rf venv
    fi
    
    if [ -d "venv" ]; then
        echo -e "${GREEN}  Found existing venv${NC}"
    else
        echo "  Creating new Python virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Configure pip to use Alibaba mirror
    mkdir -p ~/.pip
    cat > ~/.pip/pip.conf << 'EOF'
[global]
index-url = https://mirrors.aliyun.com/pypi/simple/
trusted-host = mirrors.aliyun.com
EOF
    
    pip install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/ -q
    pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ -q
    
    echo -e "${GREEN}  Dependencies installed in venv${NC}"
fi

echo -e "${YELLOW}[5/6] Installing frontend dependencies...${NC}"

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ] || [ "$FRESH_INSTALL" = true ]; then
    if [ "$FRESH_INSTALL" = true ] && [ -d "node_modules" ]; then
        echo "  Removing old node_modules..."
        rm -rf node_modules
    fi
    npm install
else
    echo -e "${GREEN}  Found existing node_modules${NC}"
fi

echo -e "${GREEN}  Frontend dependencies ready${NC}"

echo -e "${YELLOW}[6/6] Creating startup scripts...${NC}"

# Helper function to create scripts
create_start_script() {
    local script_name="$1"
    local script_mode="$2"  # dev, prod, or simple
    
    cat > "$PROJECT_PATH/$script_name" << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
PROJECT_PATH="$(pwd)"

# Load environment variables
if [ -f "$PROJECT_PATH/.env" ]; then
    set -a
    source "$PROJECT_PATH/.env"
    set +a
fi

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PYTHON_ENV_TYPE="${PYTHON_ENV_TYPE:-venv}"

echo "================================"
echo "  Crontab Manager"
echo "================================"
echo ""
echo "Backend: $BACKEND_HOST:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Python Env: $PYTHON_ENV_TYPE"
echo ""

activate_python_env() {
    if [ "$PYTHON_ENV_TYPE" == "conda" ]; then
        if [ -f "$CONDA_ACTIVATE" ]; then
            source "$CONDA_ACTIVATE"
            conda activate "$CONDA_ENV"
            echo "  Activated conda: $CONDA_ENV"
        else
            echo "Error: Conda not found at $CONDA_ACTIVATE"
            exit 1
        fi
    else
        if [ -f "venv/bin/activate" ]; then
            source venv/bin/activate
            echo "  Activated venv"
        else
            echo "Error: venv not found. Run ./deploy.sh first."
            exit 1
        fi
    fi
}

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

echo "[1/2] Starting backend..."
cd "$PROJECT_PATH/backend"
activate_python_env

if check_port "$BACKEND_PORT"; then
    nohup python main.py > ../logs/backend.log 2>&1 &
    echo "  Backend started, PID: $!"
else
    echo "  Warning: Port $BACKEND_PORT is already in use"
fi

echo "[2/2] Starting frontend..."
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

    chmod +x "$PROJECT_PATH/$script_name"
}

# Create basic start.sh
create_start_script "start.sh" "simple"

# Copy dev and prod scripts if exist
for script in start_dev.sh start_prod.sh stop.sh status.sh; do
    if [ -f "$PROJECT_PATH/$script" ]; then
        chmod +x "$PROJECT_PATH/$script"
    fi
done

# Create .env from example if not exists
if [ ! -f "$PROJECT_PATH/.env" ]; then
    if [ -f "$PROJECT_PATH/.env.example" ]; then
        cp "$PROJECT_PATH/.env.example" "$PROJECT_PATH/.env"
        echo "  Created .env (please review and customize)"
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
echo "Python Environment: $PYTHON_ENV_TYPE"
echo ""
echo "Configuration:"
echo "  - Review $PROJECT_PATH/.env for your settings"
echo ""
echo "Start services:"
echo "  Development:  ./start_dev.sh   (hot reload)"
echo "  Production:   ./start_prod.sh  (optimized)"
echo "  Simple:       ./start.sh       (basic)"
echo ""
echo "Other commands:"
echo "  Stop:    ./stop.sh"
echo "  Status:  ./status.sh"
echo ""
echo "Access:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo ""
