# Claude Code Observability Stack

OpenTelemetry-based observability for Claude Code development sessions. Collects traces, metrics, and logs and visualizes them in Grafana.

## Architecture

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │                        YOUR  MACHINE                                │
 │                                                                     │
 │  ┌─────────────────┐                                                │
 │  │  Claude Code     │  OTLP/gRPC                                    │
 │  │  (any worktree)  │─────────────┐                                 │
 │  └─────────────────┘              │                                 │
 │                                   ▼                                 │
 │          ┌─────────────────────────────────────────────┐            │
 │          │         OpenTelemetry  Collector             │            │
 │          │         :4317 gRPC  ·  :4318 HTTP           │            │
 │          │         :13133 health                       │            │
 │          └────┬──────────────┬──────────────┬──────────┘            │
 │               │              │              │                       │
 │           metrics          logs          traces                     │
 │               │              │              │                       │
 │               ▼              ▼              ▼                       │
 │       ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
 │       │ Prometheus │ │    Loki    │ │   Tempo    │                  │
 │       │   :9090    │ │   :3100   │ │   :3200    │                  │
 │       └─────┬──────┘ └─────┬──────┘ └─────┬──────┘                 │
 │             │              │              │                         │
 │             └──────────────┼──────────────┘                         │
 │                            │  datasource                            │
 │                            ▼  queries                               │
 │                    ┌──────────────┐                                  │
 │                    │   Grafana    │                                  │
 │                    │    :3000     │◄──── YOU  (browser)              │
 │                    └──────────────┘                                  │
 └──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
Claude Code  ──OTLP──►  Collector  ──►  Prometheus  (metrics)
                                    ──►  Loki        (logs)
                                    ──►  Tempo       (traces)
                         Grafana   ◄──  queries all three backends
```

### Usage Flow

```
  ① Start the stack          ./dev/observability/run.sh
  ② Open Grafana             http://localhost:3000  (admin / admin)
  ③ Use Claude Code          telemetry flows automatically
  ④ (optional) Tag branch    export OTEL_RESOURCE_ATTRIBUTES="git.branch=$(git branch --show-current)"
  ⑤ Explore in Grafana       filter by service, branch, trace ID, etc.
```

## Quick Start

```bash
# Start the stack
./dev/observability/run.sh

# Or via deno task
deno task observability

# Or directly with docker compose
docker compose -f dev/observability/docker-compose.yml up -d
```

Open [Grafana](http://localhost:3000) (credentials: `admin`/`admin`). Datasources and the **Claude Code dashboard** are auto-provisioned — no manual import needed.

## Dashboard

The **Claude** dashboard (`claude-dashboard.json`) is auto-provisioned into Grafana on startup. It includes:

| Panel                  | Metric                                          |
| ---------------------- | ----------------------------------------------- |
| Edit Tool Decision     | `claude_code_code_edit_tool_decision_total`      |
| Total Session Count    | `claude_code_session_count_total`                |
| USD Cost Usage         | `claude_code_cost_usage_USD_total`               |
| Token Usage            | `claude_code_token_usage_tokens_total`           |
| Active Total Seconds   | `claude_code_active_time_seconds_total`          |
| Lines of Code          | `claude_code_lines_of_code_count_total`          |

To update the dashboard: edit `claude-dashboard.json` and restart Grafana (or wait ~30s for auto-reload).

## Port Reference

| Service          | Port  | Purpose                    |
| ---------------- | ----- | -------------------------- |
| OTEL Collector   | 4317  | OTLP gRPC receiver         |
| OTEL Collector   | 4318  | OTLP HTTP receiver         |
| OTEL Collector   | 8889  | Prometheus metrics export   |
| OTEL Collector   | 13133 | Health check               |
| Prometheus       | 9090  | Prometheus UI & API        |
| Loki             | 3100  | Loki API                   |
| Tempo            | 3200  | Tempo HTTP API             |
| Grafana          | 3000  | Grafana UI                 |

## OTEL Environment Variables

The `.claude/settings.json` file configures Claude Code to send telemetry to the local stack automatically:

```
OTEL_EXPORTER_OTLP_ENDPOINT = http://localhost:4317
OTEL_SERVICE_NAME = claude-code
OTEL_RESOURCE_ATTRIBUTES = service.name=claude-code,repo=ts-utils
```

## Git Worktree Support

This stack is designed for git worktree workflows. Run the stack once, and all worktrees send telemetry to the same `localhost:4317` endpoint.

### Differentiating Worktree Telemetry

To tag telemetry with your current branch, set this in each terminal session:

```bash
export OTEL_RESOURCE_ATTRIBUTES="git.branch=$(git branch --show-current)"
```

Then filter in Grafana using the `git_branch` label to isolate telemetry from a specific worktree.

### How It Works

- `.claude/settings.json` provides static tags: `service.name=claude-code,repo=ts-utils`
- The `OTEL_RESOURCE_ATTRIBUTES` env var adds dynamic tags (like `git.branch`)
- The OTEL Collector adds `deployment.environment=development` to all telemetry
- Grafana queries can filter by any combination of these labels

## Common Commands

```bash
# Start
./dev/observability/run.sh up

# Stop (preserves data)
./dev/observability/run.sh down

# Restart
./dev/observability/run.sh restart

# View service status
./dev/observability/run.sh status

# Follow logs
./dev/observability/run.sh logs

# Follow logs for a specific service
./dev/observability/run.sh logs otel-collector

# Stop and delete all data
./dev/observability/run.sh reset
```

## Troubleshooting

### Port conflicts

If a port is already in use, check what's running:

```bash
# Linux/macOS
lsof -i :4317
# Windows
netstat -ano | findstr :4317
```

### Services not starting

Check the logs for the failing service:

```bash
docker compose -f dev/observability/docker-compose.yml logs <service-name>
```

### No data in Grafana

1. Verify the OTEL Collector is healthy: `curl http://localhost:13133/`
2. Check that Claude Code has the OTEL env vars set (they should be in `.claude/settings.json`)
3. Check collector logs for received telemetry: `./dev/observability/run.sh logs otel-collector`

### Reset everything

To start fresh with no data:

```bash
./dev/observability/run.sh reset
```

This removes all Docker volumes (metrics history, logs, Grafana dashboards/settings).
