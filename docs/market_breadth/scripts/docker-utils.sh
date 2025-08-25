#!/bin/bash
# Docker Utilities for Trading Tool Development

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Determine compose command
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

COMPOSE_CMD=$(get_compose_cmd)

# Function to show help
show_help() {
    echo "Trading Tool Docker Utilities"
    echo "============================="
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  start           Start core services (PostgreSQL, Redis)"
    echo "  start-all       Start all services including dev tools"
    echo "  stop            Stop all services"
    echo "  restart         Restart core services"
    echo "  status          Show service status"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  clean           Remove containers and volumes"
    echo "  backup          Backup PostgreSQL database"
    echo "  restore <file>  Restore PostgreSQL database from backup"
    echo "  psql            Connect to PostgreSQL via psql"
    echo "  redis           Connect to Redis via redis-cli"
    echo "  reset           Reset entire environment (clean + start)"
    echo
    echo "Examples:"
    echo "  $0 start              # Start PostgreSQL and Redis"
    echo "  $0 logs postgres      # Show PostgreSQL logs"
    echo "  $0 backup             # Create database backup"
    echo "  $0 restore backup.sql # Restore from backup file"
}

# Start core services
start_services() {
    print_status "Starting core services (PostgreSQL, Redis)..."
    $COMPOSE_CMD up -d postgres redis
    print_status "Services started"
}

# Start all services including dev tools
start_all_services() {
    print_status "Starting all services..."
    $COMPOSE_CMD up -d
    $COMPOSE_CMD --profile dev-tools up -d
    print_status "All services started"
    echo
    echo "Available services:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379" 
    echo "  - PgAdmin: http://localhost:8080"
    echo "  - Redis Commander: http://localhost:8081"
}

# Stop all services
stop_services() {
    print_status "Stopping all services..."
    $COMPOSE_CMD down
    print_status "Services stopped"
}

# Restart core services
restart_services() {
    print_status "Restarting core services..."
    $COMPOSE_CMD restart postgres redis
    print_status "Services restarted"
}

# Show service status
show_status() {
    echo "Service Status:"
    echo "==============="
    $COMPOSE_CMD ps
    echo
    echo "Container Health:"
    echo "=================="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep trading_tool || echo "No trading tool containers running"
}

# Show logs
show_logs() {
    local service=$1
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        $COMPOSE_CMD logs -f "$service"
    else
        print_status "Showing logs for all services..."
        $COMPOSE_CMD logs -f
    fi
}

# Clean up containers and volumes
clean_environment() {
    print_warning "This will remove all containers and volumes. Are you sure? [y/N]"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping services..."
        $COMPOSE_CMD down -v --remove-orphans
        
        print_status "Removing volumes..."
        docker volume rm trading_tool_postgres_data trading_tool_redis_data trading_tool_pgadmin_data 2>/dev/null || true
        
        print_status "Environment cleaned"
    else
        print_status "Clean cancelled"
    fi
}

# Backup PostgreSQL database
backup_database() {
    local backup_file="database/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    print_status "Creating database backup..."
    mkdir -p database/backups
    
    docker exec trading_tool_postgres pg_dump -U trading_user -d trading_tool > "$backup_file"
    
    if [ $? -eq 0 ]; then
        print_status "Database backup created: $backup_file"
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Restore PostgreSQL database
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure? [y/N]"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restoring database from $backup_file..."
        
        # Drop and recreate database
        docker exec trading_tool_postgres psql -U trading_user -d postgres -c "DROP DATABASE IF EXISTS trading_tool;"
        docker exec trading_tool_postgres psql -U trading_user -d postgres -c "CREATE DATABASE trading_tool;"
        
        # Restore from backup
        docker exec -i trading_tool_postgres psql -U trading_user -d trading_tool < "$backup_file"
        
        if [ $? -eq 0 ]; then
            print_status "Database restored successfully"
        else
            print_error "Restore failed"
            exit 1
        fi
    else
        print_status "Restore cancelled"
    fi
}

# Connect to PostgreSQL
connect_psql() {
    print_status "Connecting to PostgreSQL..."
    docker exec -it trading_tool_postgres psql -U trading_user -d trading_tool
}

# Connect to Redis
connect_redis() {
    print_status "Connecting to Redis..."
    docker exec -it trading_tool_redis redis-cli
}

# Reset entire environment
reset_environment() {
    print_warning "This will reset the entire environment (clean + setup). Continue? [y/N]"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_environment
        start_services
        sleep 10
        
        # Run migrations if npm is available
        if command -v npm &> /dev/null; then
            print_status "Running database setup..."
            npm run db:setup
        else
            print_warning "npm not found. Please run 'npm run db:setup' manually"
        fi
        
        print_status "Environment reset complete"
    else
        print_status "Reset cancelled"
    fi
}

# Main command handler
case "${1:-}" in
    "start")
        start_services
        ;;
    "start-all")
        start_all_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "clean")
        clean_environment
        ;;
    "backup")
        backup_database
        ;;
    "restore")
        restore_database "$2"
        ;;
    "psql")
        connect_psql
        ;;
    "redis")
        connect_redis
        ;;
    "reset")
        reset_environment
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac