# DevOps, Cloud & Observability

## Table of Contents

1. [Containerization with Docker](#containerization-with-docker)
2. [Kubernetes Orchestration](#kubernetes-orchestration)
3. [CI/CD Pipelines](#cicd-pipelines)
4. [Observability - The Three Pillars](#observability---the-three-pillars)
5. [Metrics and Monitoring](#metrics-and-monitoring)
6. [Centralized Logging](#centralized-logging)
7. [Distributed Tracing](#distributed-tracing)
8. [Cloud Deployment](#cloud-deployment)

---

## Containerization with Docker

### Dockerfile Best Practices

```dockerfile
# Multi-stage build for Spring Boot application
FROM openjdk:17-jdk-slim as builder

# Set working directory
WORKDIR /app

# Copy maven files for dependency resolution
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Download dependencies (cached layer)
RUN ./mvnw dependency:resolve

# Copy source code
COPY src ./src

# Build application
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM openjdk:17-jre-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Change ownership to non-root user
RUN chown appuser:appuser app.jar

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Optimized Production Dockerfile

```dockerfile
FROM openjdk:17-jre-slim

# Install dependencies and clean up in single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && \
    useradd -r -g appuser appuser

WORKDIR /app

# Copy JAR file
COPY target/*.jar app.jar

# JVM tuning parameters
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+UnlockExperimentalVMOptions \
               -XX:+UseCGroupMemoryLimitForHeap"

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT exec java $JAVA_OPTS -jar app.jar
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/appdb
      - SPRING_REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
    networks:
      - app-network
    volumes:
      - ./logs:/app/logs

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - app-network

volumes:
  mysql_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

---

## Kubernetes Orchestration

### Deployment Configuration

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  labels:
    app: user-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
        version: v1
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:1.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "kubernetes"
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: username
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          volumeMounts:
            - name: config-volume
              mountPath: /app/config
      volumes:
        - name: config-volume
          configMap:
            name: user-service-config
      imagePullSecrets:
        - name: registry-secret
```

### Service Configuration

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  labels:
    app: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080
      name: http
  type: ClusterIP

---
apiVersion: v1
kind: Service
metadata:
  name: user-service-headless
  labels:
    app: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 8080
      targetPort: 8080
  clusterIP: None # Headless service for service discovery
```

### ConfigMap and Secrets

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
data:
  application.yml: |
    server:
      port: 8080
    management:
      endpoints:
        web:
          exposure:
            include: health,info,metrics,prometheus
      health:
        probes:
          enabled: true
    logging:
      level:
        com.example: DEBUG

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  url: amRiYzpteXNxbDovL215c3FsOjMzMDYvYXBwZGI= # base64 encoded
  username: YXBwdXNlcg== # base64 encoded
  password: YXBwcGFzc3dvcmQ= # base64 encoded
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: user-service-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.mycompany.com
      secretName: api-tls-secret
  rules:
    - host: api.mycompany.com
      http:
        paths:
          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Spring Boot Kubernetes Integration

```java
@Configuration
public class KubernetesConfig {

    @Bean
    @ConditionalOnProperty(name = "spring.profiles.active", havingValue = "kubernetes")
    public KubernetesInfoContributor kubernetesInfoContributor() {
        return new KubernetesInfoContributor();
    }
}

@Component
public class KubernetesHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        try {
            // Check if running in Kubernetes
            String namespace = System.getenv("KUBERNETES_NAMESPACE");
            String podName = System.getenv("HOSTNAME");

            if (namespace != null && podName != null) {
                return Health.up()
                    .withDetail("namespace", namespace)
                    .withDetail("pod", podName)
                    .withDetail("node", System.getenv("NODE_NAME"))
                    .build();
            } else {
                return Health.down()
                    .withDetail("error", "Not running in Kubernetes")
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

---

## CI/CD Pipelines

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: testdb
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2

      - name: Run tests
        run: ./mvnw clean test
        env:
          SPRING_DATASOURCE_URL: jdbc:mysql://localhost:3306/testdb
          SPRING_DATASOURCE_USERNAME: root
          SPRING_DATASOURCE_PASSWORD: rootpassword

      - name: Run integration tests
        run: ./mvnw verify -P integration-test

      - name: Generate test report
        uses: dorny/test-reporter@v1
        if: success() || failure()
        with:
          name: Maven Tests
          path: target/surefire-reports/*.xml
          reporter: java-junit

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: target/site/jacoco/jacoco.xml

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Build application
        run: ./mvnw clean package -DskipTests

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix=sha-

      - name: Build and push Docker image
        uses: docker/build-push-action@v3
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: "latest"

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to Kubernetes
        run: |
          export KUBECONFIG=kubeconfig
          sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/deployment.yaml
          kubectl apply -f k8s/
          kubectl rollout status deployment/user-service
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        REGISTRY = 'myregistry.com'
        IMAGE_NAME = 'user-service'
        KUBECONFIG = credentials('kubeconfig')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            sh './mvnw clean test'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'target/surefire-reports/*.xml'
                            publishCoverage adapters: [jacocoAdapter('target/site/jacoco/jacoco.xml')]
                        }
                    }
                }

                stage('Integration Tests') {
                    steps {
                        script {
                            sh './mvnw verify -P integration-test'
                        }
                    }
                }

                stage('Security Scan') {
                    steps {
                        script {
                            sh 'docker run --rm -v $(pwd):/project aquasec/trivy fs /project'
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh './mvnw clean package -DskipTests'
                }
            }
        }

        stage('Docker Build & Push') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def image = docker.build("${REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER}")
                    docker.withRegistry("https://${REGISTRY}", 'registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh """
                        sed -i 's|IMAGE_TAG|${env.BUILD_NUMBER}|g' k8s/deployment.yaml
                        kubectl apply -f k8s/ --namespace=staging
                        kubectl rollout status deployment/user-service --namespace=staging
                    """
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                script {
                    sh """
                        kubectl apply -f k8s/ --namespace=production
                        kubectl rollout status deployment/user-service --namespace=production
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            emailext (
                subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build failed. Check console output at ${env.BUILD_URL}",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

---

## Observability - The Three Pillars

### Spring Boot Actuator Configuration

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers,env
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
    metrics:
      enabled: true
  health:
    circuitbreakers:
      enabled: true
    ratelimiters:
      enabled: true
  info:
    env:
      enabled: true
    java:
      enabled: true
    build:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

### Custom Health Indicators

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Autowired
    private DataSource dataSource;

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                    .withDetail("database", "Available")
                    .withDetail("validationQuery", "SELECT 1")
                    .build();
            } else {
                return Health.down()
                    .withDetail("database", "Connection invalid")
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("database", "Connection failed")
                .build();
        }
    }
}

@Component
public class ExternalServiceHealthIndicator implements HealthIndicator {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${external.service.url}")
    private String externalServiceUrl;

    @Override
    public Health health() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                externalServiceUrl + "/health", String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                    .withDetail("external-service", "Available")
                    .withDetail("response-time", measureResponseTime())
                    .build();
            } else {
                return Health.down()
                    .withDetail("external-service", "HTTP " + response.getStatusCode())
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                .withDetail("external-service", "Unreachable")
                .build();
        }
    }

    private long measureResponseTime() {
        long start = System.currentTimeMillis();
        try {
            restTemplate.getForEntity(externalServiceUrl + "/ping", String.class);
        } catch (Exception e) {
            // Ignore for timing measurement
        }
        return System.currentTimeMillis() - start;
    }
}
```

---

## Metrics and Monitoring

### Custom Metrics with Micrometer

```java
@Service
public class UserService {

    private final Counter userCreatedCounter;
    private final Timer userCreationTimer;
    private final Gauge activeUsersGauge;
    private final UserRepository userRepository;

    public UserService(MeterRegistry meterRegistry, UserRepository userRepository) {
        this.userRepository = userRepository;
        this.userCreatedCounter = Counter.builder("users.created")
            .description("Number of users created")
            .tag("service", "user-service")
            .register(meterRegistry);

        this.userCreationTimer = Timer.builder("users.creation.time")
            .description("Time taken to create user")
            .register(meterRegistry);

        this.activeUsersGauge = Gauge.builder("users.active.count")
            .description("Number of active users")
            .register(meterRegistry, this, UserService::getActiveUserCount);
    }

    public User createUser(CreateUserRequest request) {
        return userCreationTimer.recordCallable(() -> {
            User user = new User(request.getUsername(), request.getEmail(), request.getPassword());
            User saved = userRepository.save(user);
            userCreatedCounter.increment();
            return saved;
        });
    }

    private double getActiveUserCount() {
        return userRepository.countByActive(true);
    }

    @EventListener
    public void handleUserEvent(UserEvent event) {
        Metrics.counter("user.events",
            "type", event.getType(),
            "source", event.getSource())
            .increment();
    }
}
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: "spring-boot-app"
    metrics_path: "/actuator/prometheus"
    static_configs:
      - targets: ["app:8080"]
    scrape_interval: 10s

  - job_name: "kubernetes-pods"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Spring Boot Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{application=\"user-service\"}[5m])",
            "legendFormat": "{{method}} {{uri}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{application=\"user-service\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "users_active_count{application=\"user-service\"}",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: spring-boot-alerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job="spring-boot-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

---

## Centralized Logging

### Logback Configuration

```xml
<!-- logback-spring.xml -->
<configuration>
    <springProfile name="!kubernetes">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <message/>
                    <mdc/>
                    <stackTrace/>
                </providers>
            </encoder>
        </appender>

        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/application.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
                <maxFileSize>100MB</maxFileSize>
                <maxHistory>30</maxHistory>
                <totalSizeCap>1GB</totalSizeCap>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <message/>
                    <mdc/>
                    <stackTrace/>
                </providers>
            </encoder>
        </appender>

        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>

    <springProfile name="kubernetes">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <message/>
                    <mdc/>
                    <stackTrace/>
                    <pattern>
                        <pattern>
                            {
                              "kubernetes": {
                                "namespace": "${KUBERNETES_NAMESPACE:-unknown}",
                                "pod": "${HOSTNAME:-unknown}",
                                "container": "user-service"
                              }
                            }
                        </pattern>
                    </pattern>
                </providers>
            </encoder>
        </appender>

        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

### Structured Logging

```java
@RestController
@Slf4j
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/api/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        MDC.put("operation", "createUser");
        MDC.put("userEmail", request.getEmail());

        try {
            log.info("Creating user with email: {}", request.getEmail());

            UserResponse response = userService.createUser(request);

            MDC.put("userId", response.getId().toString());
            log.info("User created successfully with ID: {}", response.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (DuplicateEmailException e) {
            log.warn("Attempt to create user with duplicate email: {}", request.getEmail());
            throw e;
        } catch (Exception e) {
            log.error("Failed to create user", e);
            throw e;
        } finally {
            MDC.clear();
        }
    }
}

@Component
@Slf4j
public class LoggingAspect {

    @Around("@annotation(Loggable)")
    public Object logMethodExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();

        MDC.put("method", methodName);
        MDC.put("class", className);

        Stopwatch stopwatch = Stopwatch.createStarted();

        try {
            log.info("Entering method: {}.{}", className, methodName);
            Object result = joinPoint.proceed();
            log.info("Method executed successfully: {}.{} in {}",
                    className, methodName, stopwatch.elapsed());
            return result;
        } catch (Exception e) {
            log.error("Method execution failed: {}.{} in {} - Error: {}",
                     className, methodName, stopwatch.elapsed(), e.getMessage());
            throw e;
        } finally {
            MDC.remove("method");
            MDC.remove("class");
        }
    }
}
```

### ELK Stack Configuration

```yaml
# docker-compose-elk.yml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5044:5044"
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.5.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - elasticsearch
      - logstash

volumes:
  elasticsearch_data:
```

```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - "/var/lib/docker/containers/*/*.log"
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

setup.kibana:
  host: "kibana:5601"
```

---

## Distributed Tracing

### Sleuth and Zipkin Configuration

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-sleuth-zipkin</artifactId>
</dependency>
```

```yaml
spring:
  sleuth:
    sampler:
      probability: 0.1 # Sample 10% of requests in production
    zipkin:
      base-url: http://zipkin:9411
    web:
      additional-skip-pattern: "/actuator.*|/health.*"
  application:
    name: user-service
```

### Custom Tracing

```java
@Service
@Slf4j
public class UserService {

    @Autowired
    private Tracer tracer;

    @Autowired
    private UserRepository userRepository;

    @NewSpan("user-creation")
    public User createUser(@SpanTag("user.email") String email,
                          @SpanTag("user.username") String username) {

        Span span = tracer.nextSpan()
            .name("validate-user-data")
            .tag("validation.type", "user-creation")
            .tag("validation.result", "success")
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            validateUserData(email, username);
            span.tag("validation.result", "success");
        } catch (ValidationException e) {
            span.tag("validation.result", "failed");
            span.tag("validation.error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }

        return saveUserWithTracing(username, email);
    }

    private User saveUserWithTracing(String username, String email) {
        Span span = tracer.nextSpan()
            .name("database-save-user")
            .tag("db.operation", "insert")
            .tag("db.table", "users")
            .start();

        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            User user = new User(username, email);
            User saved = userRepository.save(user);

            span.tag("db.user.id", saved.getId().toString());
            span.tag("db.result", "success");

            return saved;
        } catch (Exception e) {
            span.tag("db.result", "error");
            span.tag("error.message", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Jaeger Integration

```yaml
# For Jaeger instead of Zipkin
spring:
  sleuth:
    opentracing:
      jaeger:
        http-sender:
          url: http://jaeger-collector:14268/api/traces
        probabilistic-sampler:
          sampling-rate: 0.1
```

### Baggage Propagation

```java
@Service
public class OrderService {

    @Autowired
    private Tracer tracer;

    @Autowired
    private UserServiceClient userServiceClient;

    public Order createOrder(CreateOrderRequest request) {
        // Add baggage that will be propagated to downstream services
        Span span = tracer.nextSpan().name("create-order").start();

        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            // Set baggage
            BaggageInScope userId = tracer.createBaggage("user.id", request.getUserId().toString());
            BaggageInScope requestId = tracer.createBaggage("request.id", UUID.randomUUID().toString());

            try {
                // This call will automatically include the baggage
                User user = userServiceClient.getUserById(request.getUserId());

                Order order = new Order();
                order.setUserId(user.getId());
                order.setAmount(request.getAmount());

                return orderRepository.save(order);
            } finally {
                userId.close();
                requestId.close();
            }
        } finally {
            span.end();
        }
    }
}
```

---

## Cloud Deployment

### AWS Deployment with ECS

```json
{
  "family": "user-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "user-service",
      "image": "123456789012.dkr.ecr.us-west-2.amazonaws.com/user-service:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "SPRING_PROFILES_ACTIVE",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SPRING_DATASOURCE_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-west-2:123456789012:secret:db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/user-service",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Terraform Configuration

```hcl
# main.tf
provider "aws" {
  region = var.aws_region
}

resource "aws_ecs_cluster" "main" {
  name = "user-service-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "user_service" {
  name            = "user-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.user_service.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.user_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.user_service.arn
    container_name   = "user-service"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.user_service]
}

resource "aws_cloudwatch_log_group" "user_service" {
  name              = "/ecs/user-service"
  retention_in_days = 7
}
```

This comprehensive guide covers all essential DevOps, cloud, and observability concepts for building production-ready Spring Boot applications at the SDE2 level.
