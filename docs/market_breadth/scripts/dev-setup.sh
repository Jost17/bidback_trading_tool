#!/bin/bash
# Development Setup Script for Trading Tool
# This script sets up the complete development environment

set -e

echo "🚀 Trading Tool Development Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    print_status "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi

    print_status "Docker Compose is available"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi

    print_status "Node.js $(node --version) is installed"
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        print_warning "No .env file found. Copying from .env.example"
        cp .env.example .env
        print_status "Created .env file from template"
        
        # Generate a random session secret
        if command -v openssl &> /dev/null; then
            SESSION_SECRET=$(openssl rand -hex 32)
            sed -i.bak "s/your-secret-key-change-in-production/$SESSION_SECRET/g" .env && rm .env.bak
            print_status "Generated random session secret"
        else
            print_warning "OpenSSL not found. Please manually update SESSION_SECRET in .env"
        fi
    else
        print_status ".env file already exists"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_status "Node.js dependencies installed"
}

# Start Docker services
start_docker_services() {
    print_status "Starting Docker services..."
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi

    # Start core services (PostgreSQL and Redis)
    $COMPOSE_CMD up -d postgres redis
    
    print_status "Core services (PostgreSQL, Redis) started"
    
    # Wait for services to be healthy
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check PostgreSQL health
    if $COMPOSE_CMD ps postgres | grep -q "healthy"; then
        print_status "PostgreSQL is healthy"
    else
        print_warning "PostgreSQL may still be starting up"
    fi
    
    # Check Redis health
    if $COMPOSE_CMD ps redis | grep -q "healthy"; then
        print_status "Redis is healthy"
    else
        print_warning "Redis may still be starting up"
    fi
}

# Run database migrations
setup_database() {
    print_status "Setting up database..."
    
    # Wait a bit more for PostgreSQL to be fully ready
    sleep 5
    
    # Run migrations and seeds
    npm run db:setup
    
    print_status "Database setup completed"
}

# Start development tools (optional)
start_dev_tools() {
    read -p "Do you want to start development tools (PgAdmin, Redis Commander)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose --profile dev-tools up -d
        else
            docker compose --profile dev-tools up -d
        fi
        
        print_status "Development tools started:"
        echo "  - PgAdmin: http://localhost:8080 (admin@trading-tool.local / admin123)"
        echo "  - Redis Commander: http://localhost:8081 (admin / admin123)"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs uploads data/csv database/backups
    print_status "Directories created"
}

# Main setup function
main() {
    echo "Checking prerequisites..."
    check_docker
    check_docker_compose
    check_nodejs
    
    echo
    echo "Setting up environment..."
    setup_env
    create_directories
    install_dependencies
    
    echo
    echo "Starting services..."
    start_docker_services
    setup_database
    
    echo
    start_dev_tools
    
    echo
    echo "🎉 Development environment setup complete!"
    echo
    echo "Next steps:"
    echo "  1. Start the Next.js development server: npm run dev"
    echo "  2. Open http://localhost:3000 in your browser"
    echo "  3. Check service status: docker-compose ps"
    echo
    echo "Useful commands:"
    echo "  - Stop services: docker-compose down"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Database status: npm run db:status"
    echo
}

# Run main function
main "$@"