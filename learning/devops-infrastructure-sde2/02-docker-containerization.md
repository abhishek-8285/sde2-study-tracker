# Docker Containerization Mastery

A comprehensive guide to Docker containerization covering fundamentals, advanced techniques, production best practices, and real-world scenarios for SDE2-level development.

## 📋 Table of Contents

1. [Docker Fundamentals](#docker-fundamentals)
2. [Dockerfile Best Practices](#dockerfile-best-practices)
3. [Multi-stage Builds](#multi-stage-builds)
4. [Container Orchestration](#container-orchestration)
5. [Security & Optimization](#security--optimization)
6. [Docker Compose](#docker-compose)
7. [Registry Management](#registry-management)
8. [Production Deployment](#production-deployment)
9. [Real-World Examples](#real-world-examples)

## Docker Fundamentals

### Docker Architecture Deep Dive

```bash
# Docker system information
docker system info
docker system df  # Disk usage
docker system events  # Real-time events

# Container lifecycle management
docker run -d --name web-app nginx:alpine
docker exec -it web-app /bin/sh
docker logs -f web-app
docker stop web-app
docker rm web-app

# Image management
docker images
docker history nginx:alpine
docker inspect nginx:alpine
docker rmi nginx:alpine
```

### Container Networking Fundamentals

```bash
# Create custom networks
docker network create --driver bridge app-network
docker network create --driver bridge db-network

# Connect containers to networks
docker run -d --name database --network db-network postgres:13
docker run -d --name api --network app-network --network db-network node:16-alpine
docker run -d --name frontend --network app-network nginx:alpine

# Network inspection
docker network ls
docker network inspect app-network
docker port api
```

### Volume Management and Data Persistence

```bash
# Named volumes
docker volume create app-data
docker volume create db-data

# Mount strategies
docker run -d \
  --name app \
  -v app-data:/app/data \
  -v $(pwd)/config:/app/config:ro \
  --mount type=tmpfs,destination=/tmp \
  myapp:latest

# Volume backup and restore
docker run --rm \
  -v app-data:/data \
  -v $(pwd):/backup \
  alpine:latest \
  tar czf /backup/backup.tar.gz -C /data .
```

## Dockerfile Best Practices

### Production-Ready Node.js Application

```dockerfile
# Multi-architecture build
FROM --platform=$BUILDPLATFORM node:18-alpine AS base

# Install system dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
FROM base AS deps
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build && \
    yarn install --frozen-lockfile --production=true && \
    yarn cache clean

# Production stage
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Security: Run as non-root user
USER nextjs

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
```

### Production-Ready Python/Django Application

```dockerfile
# Python base image with security updates
FROM python:3.11-slim AS base

# System dependencies and security
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    gcc \
    libc6-dev \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r django && useradd -r -g django django

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install Python dependencies
FROM base AS deps
COPY requirements.txt .
RUN pip install --user --no-warn-script-location -r requirements.txt

# Development stage
FROM base AS development
COPY --from=deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base AS production

# Copy dependencies and application
COPY --from=deps /root/.local /home/django/.local
COPY --chown=django:django . .

# Set PATH for django user
ENV PATH=/home/django/.local/bin:$PATH

# Collect static files
RUN python manage.py collectstatic --noinput

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run as non-root user
USER django

EXPOSE 8000

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "myproject.wsgi:application"]
```

### Java Spring Boot Application

```dockerfile
# OpenJDK with Alpine for smaller image
FROM openjdk:17-jdk-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache curl tini && \
    rm -rf /var/cache/apk/*

# Create application user
RUN addgroup -S spring && adduser -S spring -G spring

# Build stage
FROM maven:3.8.6-openjdk-17-slim AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Build application with tests
RUN mvn clean package -DskipTests=false

# Production stage
FROM base AS production

WORKDIR /app

# Copy JAR file
COPY --from=build /app/target/*.jar app.jar

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run as non-root user
USER spring:spring

EXPOSE 8080

# JVM optimizations for containers
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75"

# Use tini for signal handling
ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

## Multi-stage Builds

### Advanced Multi-stage Build Pattern

```dockerfile
# Global build arguments
ARG NODE_VERSION=18
ARG ALPINE_VERSION=3.18

# Base image with common dependencies
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
RUN apk add --no-cache dumb-init curl
WORKDIR /app
COPY package*.json ./

# Development dependencies
FROM base AS dev-deps
ENV NODE_ENV=development
RUN npm ci --include=dev

# Production dependencies
FROM base AS prod-deps
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

# Build stage
FROM dev-deps AS build
COPY . .
RUN npm run build && \
    npm run test:unit && \
    npm audit --audit-level=high

# Security scanning stage
FROM build AS security
RUN npm audit --audit-level=moderate && \
    npm run lint:security

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy production dependencies and built assets
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

USER nextjs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Conditional Build Stages

```dockerfile
# Conditional stages based on build arguments
ARG BUILD_TARGET=production
ARG ENABLE_TESTING=false

FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Test stage (conditional)
FROM base AS test
RUN npm ci
COPY . .
RUN if [ "$ENABLE_TESTING" = "true" ]; then \
        npm run test:coverage && \
        npm run test:e2e; \
    fi

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build
FROM base AS production-build
RUN npm ci --production=false
COPY . .
RUN npm run build

# Production runtime
FROM node:18-alpine AS production
WORKDIR /app
RUN npm ci --production=true
COPY --from=production-build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]

# Final stage selection
FROM ${BUILD_TARGET} AS final
```

## Container Orchestration

### Docker Swarm Configuration

```bash
# Initialize swarm
docker swarm init --advertise-addr $(hostname -i)

# Create overlay network
docker network create -d overlay --attachable app-network

# Deploy stack
docker stack deploy -c docker-compose.prod.yml myapp

# Service management
docker service ls
docker service ps myapp_web
docker service scale myapp_web=5
docker service update --image myapp:v2 myapp_web
```

### Docker Stack Configuration

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  web:
    image: myapp:${VERSION:-latest}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
          cpus: "0.25"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    secrets:
      - db_password
      - api_key

  nginx:
    image: nginx:alpine
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role == worker
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - app-network
    depends_on:
      - web

  db:
    image: postgres:13
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    networks:
      - app-network

networks:
  app-network:
    driver: overlay
    attachable: true

volumes:
  db_data:
    driver: local

secrets:
  db_password:
    external: true
  api_key:
    external: true
```

## Security & Optimization

### Security Best Practices

```dockerfile
# Security-hardened Dockerfile
FROM alpine:3.18 AS base

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user with specific UID/GID
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Set security labels
LABEL security.scan="enabled" \
      security.policy="restricted" \
      maintainer="security@company.com"

FROM node:18-alpine AS deps
WORKDIR /app

# Security: Copy only necessary files
COPY package*.json ./
RUN npm ci --only=production && \
    npm audit fix && \
    npm cache clean --force

FROM base AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache nodejs npm

# Copy application files with correct ownership
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Remove unnecessary files
RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm

# Security: Run as non-root
USER appuser

# Security: Drop capabilities and set read-only filesystem
# (These would be set at runtime with docker run flags)

# Expose only necessary port
EXPOSE 3000

# Health check with timeout
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### Image Optimization Techniques

```dockerfile
# Optimized multi-stage build
FROM node:18-alpine AS installer

# Use build cache mount for npm
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build && \
    npm prune --production

# Minimal runtime image
FROM gcr.io/distroless/nodejs18-debian11 AS runtime

WORKDIR /app

# Copy only necessary files
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000
USER 1001

CMD ["dist/server.js"]
```

### Container Resource Management

```bash
# Resource constraints
docker run -d \
  --name myapp \
  --memory=512m \
  --memory-swap=1g \
  --cpus="1.5" \
  --pids-limit=100 \
  --ulimit nofile=1024:2048 \
  --read-only \
  --tmpfs /tmp:noexec,nosuid,size=100m \
  myapp:latest

# Security options
docker run -d \
  --name secure-app \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --user 1001:1001 \
  myapp:latest
```

## Docker Compose

### Full-Stack Development Environment

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Frontend React application
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
      target: development
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - CHOKIDAR_USEPOLLING=true
    depends_on:
      - api
    networks:
      - app-network

  # Backend API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network
    command: npm run dev

  # Database
  db:
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/conf.d:/etc/nginx/conf.d
    depends_on:
      - frontend
      - api
    networks:
      - app-network

  # Message queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - app-network

  # Background workers
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - RABBITMQ_URL=amqp://admin:password@rabbitmq:5672
    depends_on:
      - db
      - rabbitmq
    networks:
      - app-network
    command: npm run worker

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  app:
    image: myapp:${VERSION}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    secrets:
      - database_password
      - jwt_secret
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - web_static:/var/www/static:ro
    depends_on:
      - app
    networks:
      - app-network

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD_FILE: /run/secrets/database_password
    volumes:
      - db_data:/var/lib/postgresql/data
    secrets:
      - database_password
    networks:
      - app-network

secrets:
  database_password:
    external: true
  jwt_secret:
    external: true

networks:
  app-network:
    external: true

volumes:
  db_data:
    external: true
  web_static:
    external: true
```

## Registry Management

### Docker Hub Automated Builds

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Image

on:
  push:
    branches: [main, develop]
    tags: ["v*"]
  pull_request:
    branches: [main]

env:
  REGISTRY: docker.io
  IMAGE_NAME: mycompany/myapp

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Docker Hub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ steps.meta.outputs.version }}
            BUILD_DATE=${{ steps.meta.outputs.date }}
            VCS_REF=${{ github.sha }}
```

### Private Registry Configuration

```bash
# AWS ECR setup
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Build and tag
docker build -t myapp .
docker tag myapp:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/myapp:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/myapp:latest

# Harbor registry with custom certificate
docker login harbor.company.com --username admin

# Azure Container Registry
az acr login --name myregistry
docker tag myapp:latest myregistry.azurecr.io/myapp:latest
docker push myregistry.azurecr.io/myapp:latest
```

### Registry Security and Scanning

```yaml
# .github/workflows/security-scan.yml
name: Container Security Scan

on:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

      - name: Run Snyk container scan
        uses: snyk/actions/docker@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          image: myapp:${{ github.sha }}
          args: --severity-threshold=high
```

## Production Deployment

### Blue-Green Deployment Strategy

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

REGISTRY="myregistry.com"
IMAGE_NAME="myapp"
VERSION="${1:-latest}"
CURRENT_ENV="${2:-blue}"

# Determine target environment
if [ "$CURRENT_ENV" = "blue" ]; then
    TARGET_ENV="green"
else
    TARGET_ENV="blue"
fi

echo "Deploying version $VERSION to $TARGET_ENV environment..."

# Deploy to target environment
docker service update \
    --image $REGISTRY/$IMAGE_NAME:$VERSION \
    --update-parallelism 1 \
    --update-delay 30s \
    myapp_$TARGET_ENV

# Wait for deployment to complete
echo "Waiting for deployment to complete..."
sleep 60

# Health check
HEALTH_CHECK_URL="http://myapp-$TARGET_ENV.internal/health"
for i in {1..10}; do
    if curl -f $HEALTH_CHECK_URL; then
        echo "Health check passed for $TARGET_ENV"
        break
    fi
    echo "Health check attempt $i failed, retrying..."
    sleep 10
done

# Switch traffic to new environment
echo "Switching traffic to $TARGET_ENV..."
docker service update \
    --label-add "traefik.enable=true" \
    --label-add "traefik.http.routers.myapp.rule=Host(\`myapp.example.com\`)" \
    myapp_$TARGET_ENV

docker service update \
    --label-rm "traefik.enable" \
    myapp_$CURRENT_ENV

echo "Deployment completed successfully!"
```

### Rolling Update Configuration

```yaml
# docker-compose.rolling.yml
version: "3.8"

services:
  app:
    image: myapp:${VERSION}
    deploy:
      replicas: 6
      update_config:
        parallelism: 2
        delay: 30s
        failure_action: rollback
        monitor: 60s
        max_failure_ratio: 0.3
        order: start-first
      rollback_config:
        parallelism: 2
        delay: 10s
        failure_action: pause
        monitor: 30s
        max_failure_ratio: 0.3
        order: stop-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
          cpus: "0.25"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - app-network
```

### Container Monitoring and Logging

```yaml
# docker-compose.monitoring.yml
version: "3.8"

services:
  app:
    image: myapp:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,version,environment"
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=3000"
      - "prometheus.io/path=/metrics"
    networks:
      - app-network

  # Log aggregation
  fluentd:
    image: fluent/fluentd:v1.14-debian-1
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "24224:24224"
    environment:
      - FLUENTD_CONF=fluent.conf
    networks:
      - monitoring

  # Metrics collection
  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--collector.filesystem.ignored-mount-points"
      - "^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)"
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - monitoring

networks:
  app-network:
    external: true
  monitoring:
    external: true
```

## Real-World Examples

### Example 1: E-commerce Microservices Platform

```yaml
# E-commerce platform with multiple services
version: "3.8"

services:
  # User service
  user-service:
    build:
      context: ./services/user
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://user:pass@user-db:5432/users
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - user-db
      - redis
    networks:
      - backend
      - user-network
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 256M
          cpus: "0.3"

  # Product catalog service
  catalog-service:
    build:
      context: ./services/catalog
      dockerfile: Dockerfile
    environment:
      - MONGODB_URI=mongodb://catalog-db:27017/catalog
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - catalog-db
      - elasticsearch
    networks:
      - backend
      - catalog-network
    deploy:
      replicas: 2

  # Order processing service
  order-service:
    build:
      context: ./services/order
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://order:pass@order-db:5432/orders
      - PAYMENT_SERVICE_URL=http://payment-service:3000
      - INVENTORY_SERVICE_URL=http://inventory-service:3000
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - order-db
      - rabbitmq
    networks:
      - backend
      - order-network

  # API Gateway
  api-gateway:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./gateway/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./gateway/ssl:/etc/nginx/ssl:ro
    depends_on:
      - user-service
      - catalog-service
      - order-service
    networks:
      - backend
      - frontend

  # Databases
  user-db:
    image: postgres:13
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - user_data:/var/lib/postgresql/data
    networks:
      - user-network

  catalog-db:
    image: mongo:5
    volumes:
      - catalog_data:/data/db
    networks:
      - catalog-network

  order-db:
    image: postgres:13
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: order
      POSTGRES_PASSWORD: pass
    volumes:
      - order_data:/var/lib/postgresql/data
    networks:
      - order-network

  # Shared services
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - backend

  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - backend

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - backend

networks:
  frontend:
  backend:
  user-network:
  catalog-network:
  order-network:

volumes:
  user_data:
  catalog_data:
  order_data:
  redis_data:
  es_data:
  rabbitmq_data:
```

### Example 2: Social Media Application

```dockerfile
# Social media app with real-time features
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --production=false

# Build stage
FROM deps AS build
COPY . .
RUN npm run build && \
    npm run test:unit && \
    npm prune --production

# Production stage
FROM base AS production

# Install production dependencies
COPY package*.json ./
RUN npm ci --production=true && \
    npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Create uploads directory
RUN mkdir -p uploads && \
    addgroup -g 1001 -S nodejs && \
    adduser -S socials -u 1001 -G nodejs && \
    chown -R socials:nodejs uploads

# Health check for social media features
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health/detailed || exit 1

USER socials
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Example 3: Financial Trading Platform

```dockerfile
# High-performance trading platform
FROM ubuntu:22.04 AS base

# Install system dependencies for financial calculations
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    libssl3 \
    libcurl4 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Dependencies with specific versions for stability
FROM base AS deps
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --production=false --frozen-lockfile

# Build with extensive testing
FROM deps AS build
COPY . .

# Run comprehensive tests for financial accuracy
RUN npm run test:unit && \
    npm run test:integration && \
    npm run test:performance && \
    npm run build

# Security scanning for financial compliance
RUN npm audit --audit-level=moderate

# Production stage with minimal attack surface
FROM base AS production

# Create non-root user for security
RUN groupadd -r trading && useradd -r -g trading trader

# Copy production dependencies
COPY package*.json ./
RUN npm ci --production=true --frozen-lockfile && \
    npm cache clean --force

# Copy application
COPY --from=build --chown=trader:trading /app/dist ./dist
COPY --from=build --chown=trader:trading /app/package.json ./

# Set resource limits for financial calculations
ENV NODE_OPTIONS="--max_old_space_size=2048"

# Health check with financial service validation
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8000/health/trading || exit 1

USER trader
EXPOSE 8000

# Use process manager for high availability
CMD ["node", "--enable-source-maps", "dist/server.js"]
```

### Example 4: Gaming Application

```dockerfile
# Real-time gaming server
FROM node:18-alpine AS base

# Install game server dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Build stage with game assets
FROM base AS build
COPY package*.json ./
RUN npm ci

COPY . .

# Build game assets and server
RUN npm run build:assets && \
    npm run build:server && \
    npm run optimize:assets

# Production stage optimized for gaming
FROM base AS production

# Install production dependencies
COPY package*.json ./
RUN npm ci --production=true

# Copy game server and assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets

# Create game data directory
RUN mkdir -p /app/gamedata && \
    addgroup -g 1001 -S gamers && \
    adduser -S gameserver -u 1001 -G gamers && \
    chown -R gameserver:gamers /app/gamedata

# Gaming-specific health check
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8080/health/game || exit 1

USER gameserver

# Expose game server ports
EXPOSE 8080 8081

# Optimize for gaming performance
ENV NODE_OPTIONS="--max_old_space_size=1024 --optimize-for-size"

CMD ["node", "--experimental-worker", "dist/gameserver.js"]
```

### Example 5: ML/AI Data Processing Pipeline

```dockerfile
# Machine learning data processing
FROM python:3.11-slim AS base

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    libhdf5-dev \
    libnetcdf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
FROM base AS deps
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Model training stage
FROM deps AS training
COPY . .
RUN python -m pytest tests/ && \
    python scripts/validate_models.py

# Production stage
FROM base AS production

# Copy dependencies
COPY --from=deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application and models
COPY --from=training /app/src ./src
COPY --from=training /app/models ./models
COPY --from=training /app/config ./config

# Create non-root user
RUN groupadd -r mluser && useradd -r -g mluser mlworker

# ML-specific health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=120s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health/ml')" || exit 1

USER mlworker
EXPOSE 8000

# Run ML inference server
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Best Practices Summary

### Performance Optimization:

1. **Use multi-stage builds** to reduce final image size
2. **Layer caching** - order Dockerfile instructions by change frequency
3. **Minimize layers** - combine RUN commands where appropriate
4. **Use specific base images** - alpine for smaller size, distroless for security
5. **Remove unnecessary files** - documentation, package caches, dev dependencies

### Security Best Practices:

1. **Run as non-root user** - create and use dedicated application user
2. **Use specific image tags** - avoid 'latest' in production
3. **Scan for vulnerabilities** - integrate security scanning in CI/CD
4. **Minimize attack surface** - use minimal base images, remove unnecessary packages
5. **Secret management** - use Docker secrets or external secret managers

### Production Readiness:

1. **Health checks** - implement comprehensive health endpoints
2. **Resource limits** - set memory and CPU constraints
3. **Logging strategy** - structured logging with proper levels
4. **Monitoring integration** - expose metrics endpoints
5. **Graceful shutdown** - handle SIGTERM signals properly

### CI/CD Integration:

1. **Automated testing** - run tests in container builds
2. **Multi-architecture builds** - support AMD64 and ARM64
3. **Registry security** - scan images before deployment
4. **Version management** - proper tagging and versioning strategy
5. **Deployment strategies** - implement blue-green or rolling updates

This comprehensive Docker guide provides the foundation for containerizing applications with production-ready practices, security considerations, and scalability patterns essential for SDE2-level development.
