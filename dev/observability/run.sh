#!/usr/bin/env bash
# =============================================================================
# Claude Code Observability Stack Launcher
# Worktree-aware: run once from any worktree, all worktrees share the stack.
# =============================================================================

set -euo pipefail

# Resolve the directory where this script lives (works from any worktree)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Claude Code Observability Stack                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo

# Check Docker availability
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed or not in PATH.${NC}"
  echo "Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  echo -e "${RED}Error: Docker daemon is not running.${NC}"
  echo "Start Docker Desktop or the Docker daemon and try again."
  exit 1
fi

# Check docker compose availability
if ! docker compose version &> /dev/null 2>&1; then
  echo -e "${RED}Error: 'docker compose' is not available.${NC}"
  echo "Upgrade to Docker Compose V2: https://docs.docker.com/compose/install/"
  exit 1
fi

# Handle arguments
ACTION="${1:-up}"

case "$ACTION" in
  up|start)
    echo -e "${GREEN}Starting observability stack...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d

    echo
    echo -e "${GREEN}Stack is starting up. Waiting for health checks...${NC}"
    sleep 5

    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Access URLs:${NC}"
    echo -e "  Grafana:       ${YELLOW}http://localhost:3000${NC}  (admin/admin)"
    echo -e "  Dashboard:     ${YELLOW}http://localhost:3000/d/ffdy8lcozpywwf/claude${NC}  (auto-provisioned)"
    echo -e "  Prometheus:    ${YELLOW}http://localhost:9090${NC}"
    echo -e "  Loki:          ${YELLOW}http://localhost:3100${NC}"
    echo -e "  Tempo:         ${YELLOW}http://localhost:3200${NC}"
    echo -e "  OTEL gRPC:     ${YELLOW}localhost:4317${NC}"
    echo -e "  OTEL HTTP:     ${YELLOW}localhost:4318${NC}"
    echo -e "  OTEL Health:   ${YELLOW}http://localhost:13133${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

    echo
    echo -e "${GREEN}  Git Worktree Tagging:${NC}"
    echo -e "  To tag telemetry with your current branch, run in each terminal:"
    echo
    echo -e "    ${YELLOW}export OTEL_RESOURCE_ATTRIBUTES=\"git.branch=\$(git branch --show-current)\"${NC}"
    echo
    echo -e "  Then filter in Grafana by ${CYAN}git_branch${NC} label."

    echo
    echo -e "${GREEN}  Useful Commands:${NC}"
    echo -e "  Status:   ${YELLOW}docker compose -f $COMPOSE_FILE ps${NC}"
    echo -e "  Logs:     ${YELLOW}docker compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "  Stop:     ${YELLOW}docker compose -f $COMPOSE_FILE down${NC}"
    echo -e "  Reset:    ${YELLOW}docker compose -f $COMPOSE_FILE down -v${NC}  (deletes data)"
    echo
    ;;

  down|stop)
    echo -e "${YELLOW}Stopping observability stack...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}Stack stopped.${NC}"
    ;;

  restart)
    echo -e "${YELLOW}Restarting observability stack...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up -d
    echo -e "${GREEN}Stack restarted.${NC}"
    ;;

  status|ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;

  logs)
    docker compose -f "$COMPOSE_FILE" logs -f "${@:2}"
    ;;

  reset)
    echo -e "${RED}This will delete all observability data (metrics, logs, traces, dashboards).${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker compose -f "$COMPOSE_FILE" down -v
      echo -e "${GREEN}Stack stopped and data deleted.${NC}"
    else
      echo "Cancelled."
    fi
    ;;

  *)
    echo "Usage: $0 {up|down|restart|status|logs|reset}"
    echo
    echo "  up/start   - Start the observability stack"
    echo "  down/stop  - Stop the stack (preserves data)"
    echo "  restart    - Restart the stack"
    echo "  status/ps  - Show service status"
    echo "  logs       - Follow service logs"
    echo "  reset      - Stop and delete all data"
    exit 1
    ;;
esac
