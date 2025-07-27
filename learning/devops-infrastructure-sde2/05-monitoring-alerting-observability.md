# Monitoring, Alerting & Observability

A comprehensive guide to production monitoring, alerting strategies, and observability practices essential for SDE2-level system reliability and performance optimization.

## 📋 Table of Contents

1. [Three Pillars of Observability](#three-pillars-of-observability)
2. [Metrics & Monitoring](#metrics--monitoring)
3. [Centralized Logging](#centralized-logging)
4. [Distributed Tracing](#distributed-tracing)
5. [Application Performance Monitoring](#application-performance-monitoring)
6. [Alerting Strategies](#alerting-strategies)
7. [SLI/SLO/SLA Framework](#slislosla-framework)
8. [Incident Response](#incident-response)
9. [Cost Monitoring](#cost-monitoring)
10. [Real-World Examples](#real-world-examples)

## Three Pillars of Observability

### Understanding the Observability Stack

```javascript
// Observability data model
const ObservabilityPillars = {
  metrics: {
    purpose: "Quantitative data about system behavior",
    examples: ["CPU usage", "Request rate", "Error rate", "Latency percentiles"],
    characteristics: ["Aggregatable", "Efficient storage", "Good for alerting"],
    tools: ["Prometheus", "DataDog", "CloudWatch", "New Relic"],
  },

  logs: {
    purpose: "Discrete events with contextual information",
    examples: ["Application logs", "Access logs", "Error logs", "Audit logs"],
    characteristics: ["High cardinality", "Searchable", "Contextual"],
    tools: ["ELK Stack", "Splunk", "Fluentd", "Loki"],
  },

  traces: {
    purpose: "Request flow across distributed systems",
    examples: ["API request journey", "Database query spans", "Service interactions"],
    characteristics: ["Request-scoped", "Causal relationships", "Performance insights"],
    tools: ["Jaeger", "Zipkin", "DataDog APM", "AWS X-Ray"],
  },
};

// Correlation between pillars
class ObservabilityCorrelation {
  constructor() {
    this.correlationStrategies = {
      traceId: "Link logs and spans using trace ID",
      timestamp: "Correlate metrics and logs by time",
      metadata: "Use service/instance labels across all pillars",
    };
  }

  correlateTroubleshooting(incident) {
    return {
      step1: "Start with metrics to identify affected systems",
      step2: "Use logs to understand what happened",
      step3: "Leverage traces to see request flow and bottlenecks",
      step4: "Cross-reference timeline across all data sources",
    };
  }
}
```

### Data Collection Strategy

```yaml
# observability-pipeline.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: observability-config
data:
  collection-strategy: |
    # Metrics Collection
    metrics:
      scrape_interval: 15s
      retention: 30d
      high_cardinality_limit: 10000
      
    # Log Collection  
    logs:
      buffer_size: 64MB
      flush_interval: 5s
      structured_format: json
      retention: 7d
      
    # Trace Collection
    traces:
      sampling_rate: 0.01  # 1% for high-volume services
      max_spans_per_trace: 1000
      retention: 3d
      
    # Cost Optimization
    cost_controls:
      log_sampling: true
      metric_downsampling: true
      trace_tail_sampling: true
```

## Metrics & Monitoring

### Prometheus Production Setup

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: "production"
    region: "us-west-2"

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Kubernetes API Server
  - job_name: "kubernetes-apiservers"
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

  # Application services
  - job_name: "app-services"
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
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  # Node Exporter
  - job_name: "node-exporter"
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  # Custom business metrics
  - job_name: "business-metrics"
    static_configs:
      - targets: ["business-metrics-exporter:8080"]
    scrape_interval: 30s
    metrics_path: /metrics

# Storage configuration
storage:
  tsdb:
    retention.time: 30d
    retention.size: 100GB
    wal-compression: true

# Remote write for long-term storage
remote_write:
  - url: "https://prometheus-remote-write.monitoring.svc.cluster.local/write"
    queue_config:
      capacity: 10000
      max_shards: 50
      min_shards: 1
      max_samples_per_send: 5000
      batch_send_deadline: 5s
```

### Application Metrics Implementation

```javascript
// comprehensive-metrics.js - Production metrics collection
const promClient = require("prom-client");

class ApplicationMetrics {
  constructor() {
    // Register default metrics
    promClient.collectDefaultMetrics({ prefix: "nodejs_" });

    this.initializeCustomMetrics();
    this.initializeBusinessMetrics();
  }

  initializeCustomMetrics() {
    // HTTP Request metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code", "user_type"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.httpRequestsTotal = new promClient.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code", "user_type"],
    });

    // Database metrics
    this.dbConnectionPool = new promClient.Gauge({
      name: "db_connection_pool_size",
      help: "Current database connection pool size",
      labelNames: ["database", "pool_type"],
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: "db_query_duration_seconds",
      help: "Database query duration",
      labelNames: ["query_type", "table", "operation"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });

    // Cache metrics
    this.cacheOperations = new promClient.Counter({
      name: "cache_operations_total",
      help: "Total cache operations",
      labelNames: ["operation", "cache_name", "result"],
    });

    this.cacheHitRate = new promClient.Gauge({
      name: "cache_hit_rate",
      help: "Cache hit rate percentage",
      labelNames: ["cache_name"],
    });

    // Queue metrics
    this.queueSize = new promClient.Gauge({
      name: "queue_size",
      help: "Current queue size",
      labelNames: ["queue_name", "priority"],
    });

    this.queueProcessingTime = new promClient.Histogram({
      name: "queue_processing_duration_seconds",
      help: "Time spent processing queue items",
      labelNames: ["queue_name", "job_type"],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
    });
  }

  initializeBusinessMetrics() {
    // E-commerce specific metrics
    this.orderValue = new promClient.Histogram({
      name: "order_value_dollars",
      help: "Order value in dollars",
      labelNames: ["product_category", "user_segment", "payment_method"],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    });

    this.userSessions = new promClient.Gauge({
      name: "active_user_sessions",
      help: "Number of active user sessions",
      labelNames: ["user_type", "device_type"],
    });

    this.conversionFunnel = new promClient.Counter({
      name: "conversion_funnel_events_total",
      help: "Conversion funnel events",
      labelNames: ["step", "source", "campaign"],
    });
  }

  // Middleware for HTTP metrics
  trackHttpMetrics() {
    return (req, res, next) => {
      const start = Date.now();
      const userType = req.user?.type || "anonymous";

      res.on("finish", () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode,
          user_type: userType,
        };

        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestsTotal.inc(labels);
      });

      next();
    };
  }

  // Database query tracking
  trackDatabaseQuery(queryType, table, operation, duration) {
    this.dbQueryDuration.observe({ query_type: queryType, table, operation }, duration);
  }

  // Business metrics tracking
  trackOrder(orderValue, productCategory, userSegment, paymentMethod) {
    this.orderValue.observe({ product_category: productCategory, user_segment: userSegment, payment_method: paymentMethod }, orderValue);
  }

  trackConversionEvent(step, source, campaign) {
    this.conversionFunnel.inc({ step, source, campaign });
  }
}

// Advanced metrics for microservices
class MicroserviceMetrics extends ApplicationMetrics {
  constructor(serviceName) {
    super();
    this.serviceName = serviceName;
    this.initializeMicroserviceMetrics();
  }

  initializeMicroserviceMetrics() {
    // Service dependency metrics
    this.serviceCallDuration = new promClient.Histogram({
      name: "service_call_duration_seconds",
      help: "Duration of service-to-service calls",
      labelNames: ["source_service", "target_service", "operation", "status"],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    });

    // Circuit breaker metrics
    this.circuitBreakerState = new promClient.Gauge({
      name: "circuit_breaker_state",
      help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
      labelNames: ["service", "operation"],
    });

    // Message queue metrics
    this.messagePublished = new promClient.Counter({
      name: "messages_published_total",
      help: "Total messages published",
      labelNames: ["topic", "event_type"],
    });

    this.messageConsumed = new promClient.Counter({
      name: "messages_consumed_total",
      help: "Total messages consumed",
      labelNames: ["topic", "consumer_group", "status"],
    });

    // Resource utilization
    this.memoryUsage = new promClient.Gauge({
      name: "process_memory_usage_bytes",
      help: "Process memory usage",
      labelNames: ["type"],
    });
  }

  trackServiceCall(targetService, operation, status, duration) {
    this.serviceCallDuration.observe(
      {
        source_service: this.serviceName,
        target_service: targetService,
        operation,
        status,
      },
      duration
    );
  }

  updateCircuitBreakerState(service, operation, state) {
    this.circuitBreakerState.set(
      { service, operation },
      state // 0=closed, 1=open, 2=half-open
    );
  }
}

module.exports = { ApplicationMetrics, MicroserviceMetrics };
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Production Application Dashboard",
    "tags": ["production", "sre", "performance"],
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate & Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}} - Requests/sec"
          },
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) by (service)",
            "legendFormat": "{{service}} - Errors/sec"
          }
        ],
        "yAxes": [
          {
            "label": "Requests per second",
            "min": 0
          }
        ],
        "alert": {
          "conditions": [
            {
              "query": {
                "params": ["A", "5m", "now"]
              },
              "reducer": {
                "type": "avg"
              },
              "evaluator": {
                "params": [100],
                "type": "gt"
              }
            }
          ],
          "executionErrorState": "alerting",
          "frequency": "10s",
          "handler": 1,
          "name": "High Error Rate Alert",
          "noDataState": "no_data"
        }
      },
      {
        "id": 2,
        "title": "Response Time Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}} - 50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}} - 95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}} - 99th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response time (seconds)",
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Business Metrics - Order Volume",
        "type": "singlestat",
        "targets": [
          {
            "expr": "sum(increase(order_value_dollars_count[1h]))",
            "legendFormat": "Orders per hour"
          }
        ],
        "thresholds": "100,500",
        "colorBackground": true,
        "valueName": "current"
      },
      {
        "id": 4,
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, operation))",
            "legendFormat": "{{operation}} - 95th percentile"
          },
          {
            "expr": "sum(rate(db_connection_pool_size[5m])) by (database)",
            "legendFormat": "{{database}} - Pool size"
          }
        ]
      },
      {
        "id": 5,
        "title": "Cache Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(cache_operations_total{result=\"hit\"}[5m])) / sum(rate(cache_operations_total[5m])) * 100",
            "legendFormat": "Cache hit rate %"
          }
        ],
        "yAxes": [
          {
            "min": 0,
            "max": 100,
            "unit": "percent"
          }
        ],
        "thresholds": [
          {
            "value": 80,
            "colorMode": "critical",
            "op": "lt"
          }
        ]
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

## Centralized Logging

### ELK Stack Production Setup

```yaml
# elasticsearch-cluster.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production-logs
spec:
  version: 8.5.0
  nodeSets:
    - name: master
      count: 3
      config:
        node.roles: ["master"]
        cluster.remote.connect: false
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 2Gi
                  cpu: 1
                limits:
                  memory: 2Gi
                  cpu: 2
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 50Gi
            storageClassName: fast-ssd

    - name: data
      count: 6
      config:
        node.roles: ["data", "ingest"]
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 4Gi
                  cpu: 2
                limits:
                  memory: 4Gi
                  cpu: 4
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms2g -Xmx2g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
            storageClassName: fast-ssd

---
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: production-kibana
spec:
  version: 8.5.0
  count: 2
  elasticsearchRef:
    name: production-logs
  config:
    server.rewriteBasePath: false
    logging.verbose: true
```

### Logstash Configuration for Multiple Services

```ruby
# logstash.conf - Production pipeline
input {
  # Application logs from Filebeat
  beats {
    port => 5044
    codec => json
  }

  # System logs
  file {
    path => "/var/log/syslog"
    type => "syslog"
    start_position => "beginning"
  }

  # Kubernetes logs
  http {
    port => 8080
    codec => json
  }

  # Direct application logging
  tcp {
    port => 5000
    codec => json_lines
  }
}

filter {
  # Common fields
  mutate {
    add_field => {
      "[@metadata][index_prefix]" => "app-logs"
      "environment" => "${ENVIRONMENT:production}"
      "cluster" => "${CLUSTER_NAME:prod-cluster}"
    }
  }

  # Application-specific parsing
  if [fields][service] == "api-server" {
    if [level] == "ERROR" {
      mutate {
        add_tag => ["error", "alert"]
      }

      # Extract error details
      grok {
        match => {
          "message" => "(?<error_type>\w+):\s+(?<error_message>.*?)(\s+at\s+(?<error_location>.*))?$"
        }
        tag_on_failure => ["_grok_parse_failure"]
      }

      # PII detection and masking
      mutate {
        gsub => [
          "message", "\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", "[CARD_MASKED]",
          "message", "\b\d{3}-\d{2}-\d{4}\b", "[SSN_MASKED]",
          "message", "\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL_MASKED]"
        ]
      }
    }

    # Performance log parsing
    if [fields][type] == "performance" {
      grok {
        match => {
          "message" => "(?<operation>\w+)\s+took\s+(?<duration>\d+)ms"
        }
      }

      mutate {
        convert => { "duration" => "integer" }
      }

      if [duration] > 1000 {
        mutate {
          add_tag => ["slow_query", "performance_alert"]
        }
      }
    }
  }

  # Database logs
  if [fields][service] == "database" {
    grok {
      match => {
        "message" => "\[(?<timestamp>.*?)\]\s+(?<log_level>\w+):\s+(?<db_message>.*)"
      }
    }

    # Slow query detection
    if [db_message] =~ /slow query/ {
      mutate {
        add_tag => ["slow_query", "database_performance"]
      }

      grok {
        match => {
          "db_message" => "Query_time:\s+(?<query_time>\d+\.\d+)"
        }
      }
    }
  }

  # Security logs
  if [fields][service] == "auth" {
    if [message] =~ /failed login/ {
      mutate {
        add_tag => ["security", "failed_login"]
      }

      grok {
        match => {
          "message" => "failed login.*from\s+(?<source_ip>\d+\.\d+\.\d+\.\d+)"
        }
      }

      # GeoIP lookup
      geoip {
        source => "source_ip"
        target => "geoip"
      }
    }
  }

  # Structured log enhancement
  if [request_id] {
    mutate {
      add_field => { "[@metadata][routing_key]" => "%{request_id}" }
    }
  }

  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss" ]
    target => "@timestamp"
  }

  # Clean up
  mutate {
    remove_field => ["agent", "ecs", "host", "input"]
  }
}

output {
  # Main application logs
  elasticsearch {
    hosts => ["${ELASTICSEARCH_HOSTS}"]
    index => "%{[@metadata][index_prefix]}-%{+YYYY.MM.dd}"
    template_name => "app-logs"
    template_pattern => "app-logs-*"
    template => "/etc/logstash/templates/app-logs.json"

    # Authentication
    user => "${ELASTICSEARCH_USER}"
    password => "${ELASTICSEARCH_PASSWORD}"

    # Performance optimization
    pipeline => "logs-pipeline"
  }

  # Error logs to separate index
  if "error" in [tags] {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOSTS}"]
      index => "error-logs-%{+YYYY.MM.dd}"
      user => "${ELASTICSEARCH_USER}"
      password => "${ELASTICSEARCH_PASSWORD}"
    }
  }

  # Security events
  if "security" in [tags] {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOSTS}"]
      index => "security-logs-%{+YYYY.MM.dd}"
      user => "${ELASTICSEARCH_USER}"
      password => "${ELASTICSEARCH_PASSWORD}"
    }

    # Also send to SIEM
    http {
      url => "${SIEM_WEBHOOK_URL}"
      http_method => "post"
      format => "json"
    }
  }

  # Debug output
  if [@metadata][debug] {
    stdout { codec => rubydebug }
  }
}
```

### Application Logging Standards

```javascript
// structured-logging.js - Production logging implementation
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");

class ProductionLogger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
    this.requestContext = new Map();
  }

  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, requestId, userId, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          service: service || this.serviceName,
          message,
          requestId,
          userId,
          ...meta,
        };

        // Remove undefined fields
        Object.keys(logEntry).forEach((key) => {
          if (logEntry[key] === undefined) {
            delete logEntry[key];
          }
        });

        return JSON.stringify(logEntry);
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: logFormat,
      defaultMeta: {
        service: this.serviceName,
        version: process.env.APP_VERSION,
        environment: process.env.NODE_ENV,
        hostname: require("os").hostname(),
        pid: process.pid,
      },
      transports: [
        // Console for local development
        new winston.transports.Console({
          format: process.env.NODE_ENV === "development" ? winston.format.combine(winston.format.colorize(), winston.format.simple()) : logFormat,
        }),

        // File for production
        new winston.transports.File({
          filename: `/var/log/${this.serviceName}/error.log`,
          level: "error",
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),

        new winston.transports.File({
          filename: `/var/log/${this.serviceName}/app.log`,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
        }),
      ],

      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({
          filename: `/var/log/${this.serviceName}/exceptions.log`,
        }),
      ],

      // Handle unhandled rejections
      rejectionHandlers: [
        new winston.transports.File({
          filename: `/var/log/${this.serviceName}/rejections.log`,
        }),
      ],
    });
  }

  // Request context middleware
  requestContextMiddleware() {
    return (req, res, next) => {
      const requestId = req.headers["x-request-id"] || uuidv4();
      const userId = req.user?.id;

      // Store context
      this.requestContext.set(requestId, { userId, startTime: Date.now() });

      // Add to request
      req.requestId = requestId;
      req.logger = this.child({ requestId, userId });

      // Clean up on response
      res.on("finish", () => {
        this.requestContext.delete(requestId);
      });

      next();
    };
  }

  // Create child logger with additional context
  child(context) {
    return {
      debug: (message, meta = {}) => this.logger.debug(message, { ...context, ...meta }),
      info: (message, meta = {}) => this.logger.info(message, { ...context, ...meta }),
      warn: (message, meta = {}) => this.logger.warn(message, { ...context, ...meta }),
      error: (message, meta = {}) => this.logger.error(message, { ...context, ...meta }),
    };
  }

  // Performance logging
  logPerformance(operation, duration, metadata = {}) {
    const level = duration > 1000 ? "warn" : "info";
    this.logger[level]("Performance metric", {
      type: "performance",
      operation,
      duration,
      threshold_exceeded: duration > 1000,
      ...metadata,
    });
  }

  // Business event logging
  logBusinessEvent(eventType, eventData, userId = null) {
    this.logger.info("Business event", {
      type: "business_event",
      eventType,
      eventData,
      userId,
    });
  }

  // Security event logging
  logSecurityEvent(eventType, details, severity = "medium") {
    this.logger.warn("Security event", {
      type: "security_event",
      eventType,
      severity,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Error logging with context
  logError(error, context = {}) {
    this.logger.error("Application error", {
      type: "application_error",
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      context,
    });
  }

  // Database query logging
  logDatabaseQuery(query, duration, rowCount = null) {
    const level = duration > 500 ? "warn" : "debug";
    this.logger[level]("Database query", {
      type: "database_query",
      query: query.substr(0, 100) + (query.length > 100 ? "..." : ""),
      duration,
      rowCount,
      slow_query: duration > 500,
    });
  }

  // API call logging
  logApiCall(service, endpoint, method, statusCode, duration) {
    const level = statusCode >= 400 ? "warn" : "info";
    this.logger[level]("External API call", {
      type: "api_call",
      service,
      endpoint,
      method,
      statusCode,
      duration,
      success: statusCode < 400,
    });
  }
}

// Usage examples
const logger = new ProductionLogger("user-service");

// Express middleware
app.use(logger.requestContextMiddleware());

// Business logic logging
app.post("/users", (req, res) => {
  const startTime = Date.now();

  req.logger.info("Creating user", { email: req.body.email });

  try {
    const user = createUser(req.body);

    logger.logBusinessEvent(
      "user_created",
      {
        userId: user.id,
        userType: user.type,
        registrationSource: req.body.source,
      },
      user.id
    );

    logger.logPerformance("user_creation", Date.now() - startTime, {
      userType: user.type,
    });

    req.logger.info("User created successfully", { userId: user.id });
    res.json(user);
  } catch (error) {
    logger.logError(error, {
      operation: "user_creation",
      requestBody: req.body,
      duration: Date.now() - startTime,
    });

    res.status(500).json({ error: "User creation failed" });
  }
});

module.exports = ProductionLogger;
```

## Distributed Tracing

### OpenTelemetry Production Implementation

```javascript
// tracing-setup.js - Complete OpenTelemetry configuration
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-otlp-http");
const { BatchSpanProcessor, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-otlp-http");

class TracingManager {
  constructor(serviceName, version, environment) {
    this.serviceName = serviceName;
    this.version = version;
    this.environment = environment;
    this.sdk = null;
  }

  initialize() {
    // Resource identification
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.version,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.environment,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: "ecommerce",
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: require("os").hostname(),
        [SemanticResourceAttributes.HOST_NAME]: require("os").hostname(),
        [SemanticResourceAttributes.PROCESS_PID]: process.pid,
      })
    );

    // Configure exporters
    const traceExporters = this.configureTraceExporters();
    const metricExporter = this.configureMetricExporter();

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      spanProcessors: [
        new BatchSpanProcessor(traceExporters.primary, {
          maxQueueSize: 1000,
          maxExportBatchSize: 100,
          exportTimeoutMillis: 30000,
          scheduledDelayMillis: 5000,
        }),
        // Backup exporter for reliability
        new BatchSpanProcessor(traceExporters.backup),
      ],
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy instrumentations
          "@opentelemetry/instrumentation-fs": { enabled: false },

          // Configure HTTP instrumentation
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            ignoredUrls: [/\/health/, /\/metrics/, /\/favicon/],
            requestHook: this.httpRequestHook.bind(this),
            responseHook: this.httpResponseHook.bind(this),
          },

          // Configure database instrumentations
          "@opentelemetry/instrumentation-mysql2": {
            enabled: true,
            responseHook: this.dbResponseHook.bind(this),
          },
          "@opentelemetry/instrumentation-redis": {
            enabled: true,
            dbStatementSerializer: this.redisSerializer.bind(this),
          },

          // Express instrumentation
          "@opentelemetry/instrumentation-express": {
            enabled: true,
            requestHook: this.expressRequestHook.bind(this),
          },
        }),
      ],
    });

    this.sdk.start();
    console.log(`OpenTelemetry started for service: ${this.serviceName}`);
  }

  configureTraceExporters() {
    const exporters = {};

    // Primary exporter (Jaeger)
    if (process.env.JAEGER_ENDPOINT) {
      exporters.primary = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
        headers: {
          "x-auth-token": process.env.JAEGER_AUTH_TOKEN,
        },
      });
    }

    // Backup exporter (OTLP)
    if (process.env.OTLP_ENDPOINT) {
      exporters.backup = new OTLPTraceExporter({
        url: process.env.OTLP_ENDPOINT + "/v1/traces",
        headers: {
          Authorization: `Bearer ${process.env.OTLP_TOKEN}`,
        },
      });
    }

    // Fallback to console exporter for development
    if (!exporters.primary && !exporters.backup) {
      const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-base");
      exporters.primary = new ConsoleSpanExporter();
    }

    return exporters;
  }

  configureMetricExporter() {
    if (process.env.OTLP_ENDPOINT) {
      return new OTLPMetricExporter({
        url: process.env.OTLP_ENDPOINT + "/v1/metrics",
        headers: {
          Authorization: `Bearer ${process.env.OTLP_TOKEN}`,
        },
      });
    }

    // Fallback to console for development
    const { ConsoleMetricExporter } = require("@opentelemetry/sdk-metrics");
    return new ConsoleMetricExporter();
  }

  // Custom hooks for enriching spans
  httpRequestHook(span, requestInfo) {
    // Add custom attributes
    span.setAttributes({
      "http.request.size": requestInfo.headers["content-length"] || 0,
      "http.user_agent": requestInfo.headers["user-agent"] || "",
      "http.x_forwarded_for": requestInfo.headers["x-forwarded-for"] || "",
      "custom.request_id": requestInfo.headers["x-request-id"] || "",
    });

    // Sample high-volume endpoints less frequently
    if (requestInfo.url?.includes("/api/v1/metrics")) {
      span.setAttribute("custom.sampling_rate", 0.01);
    }
  }

  httpResponseHook(span, responseInfo) {
    span.setAttributes({
      "http.response.size": responseInfo.headers["content-length"] || 0,
      "http.response.content_type": responseInfo.headers["content-type"] || "",
    });

    // Mark high latency responses
    const duration = span.endTime?.[0] - span.startTime?.[0] || 0;
    if (duration > 1) {
      // > 1 second
      span.setAttribute("custom.high_latency", true);
    }
  }

  dbResponseHook(span, responseInfo) {
    if (responseInfo.data) {
      span.setAttributes({
        "db.rows_affected": responseInfo.data.affectedRows || 0,
        "db.rows_returned": responseInfo.data.length || 0,
      });
    }
  }

  redisSerializer(operation, args) {
    // Don't log sensitive data
    const sensitiveCommands = ["auth", "config"];
    if (sensitiveCommands.includes(operation.toLowerCase())) {
      return `${operation} [REDACTED]`;
    }

    // Limit argument logging
    const limitedArgs = args.slice(0, 3).map((arg) => (typeof arg === "string" && arg.length > 100 ? arg.substring(0, 100) + "..." : arg));

    return `${operation} ${limitedArgs.join(" ")}`;
  }

  expressRequestHook(span, requestInfo) {
    // Add business context
    if (requestInfo.user) {
      span.setAttributes({
        "user.id": requestInfo.user.id,
        "user.type": requestInfo.user.type,
        "user.subscription": requestInfo.user.subscription,
      });
    }

    // Add route parameters
    if (requestInfo.params) {
      Object.entries(requestInfo.params).forEach(([key, value]) => {
        span.setAttribute(`http.route.${key}`, value);
      });
    }
  }

  shutdown() {
    return this.sdk?.shutdown();
  }
}

// Custom span creation for business operations
const { trace } = require("@opentelemetry/api");

class BusinessTracing {
  constructor(serviceName) {
    this.tracer = trace.getTracer(serviceName);
  }

  // Trace business operations
  async traceOperation(operationName, operation, attributes = {}) {
    const span = this.tracer.startSpan(operationName, {
      kind: 1, // INTERNAL
      attributes: {
        "operation.type": "business",
        ...attributes,
      },
    });

    try {
      const result = await operation(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: 2, // ERROR
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  // Trace payment processing
  async tracePaymentProcessing(paymentData, processor) {
    return this.traceOperation(
      "payment.process",
      async (span) => {
        span.setAttributes({
          "payment.amount": paymentData.amount,
          "payment.currency": paymentData.currency,
          "payment.method": paymentData.method,
          "payment.processor": processor,
        });

        // Process payment
        const result = await processPayment(paymentData, processor);

        span.setAttributes({
          "payment.transaction_id": result.transactionId,
          "payment.status": result.status,
        });

        return result;
      },
      {
        "business.operation": "payment_processing",
        "business.critical": true,
      }
    );
  }

  // Trace order fulfillment
  async traceOrderFulfillment(orderId, items) {
    return this.traceOperation("order.fulfill", async (span) => {
      span.setAttributes({
        "order.id": orderId,
        "order.item_count": items.length,
        "order.total_value": items.reduce((sum, item) => sum + item.price, 0),
      });

      // Process each item
      for (const [index, item] of items.entries()) {
        const itemSpan = this.tracer.startSpan(`order.fulfill.item`, {
          parent: span,
          attributes: {
            "item.index": index,
            "item.sku": item.sku,
            "item.quantity": item.quantity,
          },
        });

        try {
          await fulfillItem(item);
          itemSpan.setStatus({ code: 1 });
        } catch (error) {
          itemSpan.recordException(error);
          itemSpan.setStatus({ code: 2, message: error.message });
          throw error;
        } finally {
          itemSpan.end();
        }
      }

      return { orderId, status: "fulfilled" };
    });
  }
}

// Initialize tracing
const tracingManager = new TracingManager(process.env.SERVICE_NAME || "unknown-service", process.env.SERVICE_VERSION || "1.0.0", process.env.NODE_ENV || "development");

tracingManager.initialize();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await tracingManager.shutdown();
  process.exit(0);
});

module.exports = { TracingManager, BusinessTracing };
```

## Advanced Grafana Dashboard Configurations

### Multi-Tenant E-commerce Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "E-commerce Multi-Tenant Operations Dashboard",
    "tags": ["ecommerce", "multi-tenant", "business-metrics"],
    "templating": {
      "list": [
        {
          "name": "tenant",
          "type": "query",
          "query": "label_values(http_requests_total, tenant)",
          "refresh": 1,
          "multi": true,
          "includeAll": true
        },
        {
          "name": "timeframe",
          "type": "interval",
          "options": ["5m", "15m", "1h", "6h", "24h"],
          "current": "15m"
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Revenue Metrics by Tenant",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(order_value_dollars_sum{tenant=~\"$tenant\"}[$timeframe])) by (tenant)",
            "legendFormat": "{{tenant}} Revenue"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "displayName": "${__field.labels.tenant}",
            "thresholds": {
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 10000 },
                { "color": "green", "value": 50000 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Real-time User Activity Heat Map",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum(rate(active_user_sessions{tenant=~\"$tenant\"}[5m])) by (tenant, user_type)",
            "format": "heatmap",
            "legendFormat": "{{tenant}}"
          }
        ],
        "heatmap": {
          "xBucketSize": "1h",
          "yBucketSize": "auto",
          "colorMode": "spectrum"
        }
      }
    ]
  }
}
```

### Financial Trading Dashboard

```json
{
  "dashboard": {
    "title": "Trading Platform Risk & Performance Dashboard",
    "panels": [
      {
        "id": 1,
        "title": "Order Latency Distribution",
        "type": "histogram",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(order_processing_latency_microseconds_bucket[5m])) by (le, market))",
            "legendFormat": "{{market}} - P99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "µs",
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 1000 },
                { "color": "red", "value": 5000 }
              ]
            }
          }
        },
        "alert": {
          "frequency": "1s",
          "name": "High Order Latency Alert"
        }
      }
    ]
  }
}
```

## Complete Incident Response Workflows

### Incident Management Framework

```javascript
// incident-manager.js - Comprehensive incident management
class IncidentManager {
  constructor() {
    this.incidents = new Map();
    this.escalationRules = this.loadEscalationRules();
    this.communicationChannels = this.initializeCommunication();
  }

  async createIncident(alert, severity, description) {
    const incident = {
      id: this.generateIncidentId(),
      severity,
      status: "investigating",
      description,
      createdAt: new Date(),
      alerts: [alert],
      timeline: [],
      responders: [],
      affectedServices: this.identifyAffectedServices(alert),
      estimatedImpact: this.calculateImpact(alert, severity),
    };

    // Auto-assign incident commander
    incident.commander = await this.assignIncidentCommander(severity);

    // Create war room
    incident.warRoomId = await this.createWarRoom(incident);

    // Notify stakeholders
    await this.notifyStakeholders(incident);

    // Start status page updates
    if (severity >= 2) {
      await this.updateStatusPage(incident, "investigating");
    }

    this.incidents.set(incident.id, incident);
    this.addTimelineEvent(incident.id, "incident_created", {
      severity,
      commander: incident.commander,
      affectedServices: incident.affectedServices,
    });

    return incident;
  }

  async escalateIncident(incidentId, newSeverity, reason) {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error("Incident not found");

    const oldSeverity = incident.severity;
    incident.severity = newSeverity;

    // Reassign commander if needed
    if (newSeverity > oldSeverity) {
      const newCommander = await this.assignIncidentCommander(newSeverity);
      if (newCommander !== incident.commander) {
        incident.commander = newCommander;
        await this.notifyCommanderChange(incident, newCommander);
      }

      // Add more responders
      const additionalResponders = await this.getAdditionalResponders(newSeverity);
      incident.responders.push(...additionalResponders);

      // Notify executives for critical incidents
      if (newSeverity === 1) {
        await this.notifyExecutives(incident);
      }
    }

    this.addTimelineEvent(incidentId, "incident_escalated", {
      oldSeverity,
      newSeverity,
      reason,
      commander: incident.commander,
    });

    await this.updateStatusPage(incident, "investigating");
  }

  async resolveIncident(incident) {
    incident.resolvedAt = new Date();
    incident.duration = incident.resolvedAt - incident.createdAt;

    // Schedule post-mortem
    const postMortemDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.schedulePostMortem(incident, postMortemDate);

    // Close war room
    await this.closeWarRoom(incident.warRoomId);

    // Generate incident report
    const report = await this.generateIncidentReport(incident);

    // Update metrics
    await this.updateIncidentMetrics(incident);

    this.addTimelineEvent(incident.id, "incident_resolved", {
      duration: incident.duration,
      reportId: report.id,
    });

    await this.notifyResolution(incident);
  }
}
```

## Production Troubleshooting Guides

### Database Performance Diagnostics

```bash
#!/bin/bash
# db-troubleshooting.sh - Database performance diagnostics

diagnose_database_performance() {
    echo "=== Database Performance Diagnostics ==="

    # Check active connections
    echo "Active Connections:"
    kubectl exec -n production postgres-0 -- psql -U postgres -c "
        SELECT count(*) as active_connections,
               state,
               wait_event_type,
               wait_event
        FROM pg_stat_activity
        WHERE state != 'idle'
        GROUP BY state, wait_event_type, wait_event
        ORDER BY active_connections DESC;"

    # Check slow queries
    echo "Slow Queries (>1s):"
    kubectl exec -n production postgres-0 -- psql -U postgres -c "
        SELECT query_start,
               now() - query_start as duration,
               state,
               substring(query, 1, 100) as query_snippet
        FROM pg_stat_activity
        WHERE now() - query_start > interval '1 second'
        AND state != 'idle'
        ORDER BY duration DESC;"

    # Check database size and growth
    echo "Database Size Analysis:"
    kubectl exec -n production postgres-0 -- psql -U postgres -c "
        SELECT schemaname,
               tablename,
               pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;"
}

# Application performance diagnostics
diagnose_application_performance() {
    echo "=== Application Performance Diagnostics ==="

    # Check pod resource usage
    echo "Pod Resource Usage:"
    kubectl top pods -n production --sort-by=memory
    kubectl top pods -n production --sort-by=cpu

    # Check application logs for errors
    echo "Recent Error Logs:"
    kubectl logs -n production --selector=app=api-server --since=10m | grep -i error | tail -20
}

# Network diagnostics
diagnose_network_issues() {
    echo "=== Network Diagnostics ==="

    # Check service endpoints
    kubectl get endpoints -n production

    # Test internal connectivity
    kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh -c "
        nslookup api-server.production.svc.cluster.local &&
        wget -qO- --timeout=5 http://api-server.production.svc.cluster.local:8080/health
    "
}
```

## Cost Monitoring Strategies

### Cloud Cost Optimization Framework

```javascript
// cost-optimizer.js - Cloud cost monitoring and optimization
class CloudCostOptimizer {
  constructor(cloudProvider = "aws") {
    this.cloudProvider = cloudProvider;
    this.costThresholds = this.loadCostThresholds();
    this.optimizationRules = this.loadOptimizationRules();
  }

  async analyzeCostTrends() {
    const costData = await this.fetchCostData();
    const analysis = {
      totalCost: costData.total,
      breakdown: costData.breakdown,
      trends: this.calculateTrends(costData.historical),
      anomalies: this.detectAnomalies(costData.daily),
      recommendations: [],
    };

    // Analyze compute costs
    const computeAnalysis = await this.analyzeComputeCosts(costData.compute);
    analysis.recommendations.push(...computeAnalysis.recommendations);

    // Analyze storage costs
    const storageAnalysis = await this.analyzeStorageCosts(costData.storage);
    analysis.recommendations.push(...storageAnalysis.recommendations);

    return analysis;
  }

  async analyzeComputeCosts(computeData) {
    const recommendations = [];

    // Check for over-provisioned instances
    for (const instance of computeData.instances) {
      const utilization = await this.getInstanceUtilization(instance.id);

      if (utilization.cpu.avg < 20 && utilization.memory.avg < 30) {
        recommendations.push({
          type: "rightsizing",
          severity: "medium",
          instance: instance.id,
          currentType: instance.type,
          recommendedType: this.getRecommendedInstanceType(utilization),
          estimatedSavings: this.calculateRightsizingSavings(instance, utilization),
          description: `Instance ${instance.id} is under-utilized. Consider downsizing.`,
        });
      }
    }

    return { recommendations };
  }

  async generateCostReport(timeframe = "monthly") {
    const costData = await this.fetchCostData(timeframe);

    const report = {
      summary: {
        totalCost: costData.total,
        previousPeriod: costData.previousTotal,
        changePercent: (((costData.total - costData.previousTotal) / costData.previousTotal) * 100).toFixed(2),
      },
      breakdown: {
        byService: costData.serviceBreakdown,
        byEnvironment: costData.environmentBreakdown,
        byTeam: costData.teamBreakdown,
      },
      optimization: {
        potentialSavings: await this.calculatePotentialSavings(),
        implementedSavings: await this.getImplementedSavings(timeframe),
      },
    };

    return report;
  }
}
```

## Chaos Engineering Examples

### Chaos Testing Framework

```javascript
// chaos-engineering.js - Production chaos testing
class ChaosTestRunner {
  constructor() {
    this.experiments = [];
    this.safetyChecks = this.loadSafetyChecks();
    this.rollbackStrategies = this.loadRollbackStrategies();
  }

  // Network chaos experiments
  async runNetworkPartitionExperiment(config) {
    const experiment = {
      id: this.generateExperimentId(),
      type: "network_partition",
      config,
      startTime: new Date(),
      status: "running",
      metrics: {},
    };

    try {
      // Pre-flight safety checks
      await this.performSafetyChecks(experiment);

      // Baseline metrics collection
      experiment.metrics.baseline = await this.collectBaselineMetrics();

      // Inject network partition
      console.log(`Starting network partition: ${config.sourceService} -> ${config.targetService}`);
      await this.injectNetworkPartition(config);

      // Monitor system behavior
      const monitoring = this.startContinuousMonitoring(experiment);

      // Run for specified duration
      await this.sleep(config.duration);

      // Collect impact metrics
      experiment.metrics.impact = await this.collectImpactMetrics();

      // Check if system degraded gracefully
      const gracefulDegradation = await this.validateGracefulDegradation(experiment);
      experiment.gracefulDegradation = gracefulDegradation;

      // Restore network
      await this.restoreNetwork(config);

      // Wait for recovery
      await this.waitForRecovery(config.targetService);

      experiment.status = "completed";
      experiment.endTime = new Date();

      // Generate report
      const report = await this.generateExperimentReport(experiment);

      return { success: true, experiment, report };
    } catch (error) {
      // Emergency rollback
      await this.emergencyRollback(experiment);
      experiment.status = "failed";
      experiment.error = error.message;

      return { success: false, experiment, error: error.message };
    }
  }

  // Service failure experiments
  async runServiceFailureExperiment(config) {
    const experiment = {
      id: this.generateExperimentId(),
      type: "service_failure",
      config,
      startTime: new Date(),
    };

    try {
      // Gradually reduce service capacity
      const originalReplicas = await this.getServiceReplicas(config.service);

      for (let replicas = originalReplicas - 1; replicas >= config.minReplicas; replicas--) {
        console.log(`Scaling ${config.service} to ${replicas} replicas`);

        await this.scaleService(config.service, replicas);
        await this.sleep(config.stepDuration);

        // Check system health
        const healthCheck = await this.performHealthCheck(config.dependencies);
        if (!healthCheck.healthy) {
          console.log("System unhealthy, stopping experiment");
          break;
        }

        // Collect metrics
        const metrics = await this.collectServiceMetrics(config.service);
        experiment.metrics = experiment.metrics || [];
        experiment.metrics.push({
          replicas,
          timestamp: new Date(),
          ...metrics,
        });
      }

      // Restore original capacity
      await this.scaleService(config.service, originalReplicas);

      experiment.status = "completed";
      return { success: true, experiment };
    } catch (error) {
      await this.emergencyRollback(experiment);
      return { success: false, error: error.message };
    }
  }

  // Database chaos experiments
  async runDatabaseChaosExperiment(config) {
    const experiment = {
      id: this.generateExperimentId(),
      type: "database_chaos",
      config,
      startTime: new Date(),
    };

    try {
      switch (config.chaosType) {
        case "slow_queries":
          await this.injectSlowQueries(config);
          break;
        case "connection_exhaustion":
          await this.exhaustDatabaseConnections(config);
          break;
        case "network_latency":
          await this.injectDatabaseLatency(config);
          break;
      }

      // Monitor application behavior
      const behavior = await this.monitorApplicationBehavior(config.duration);
      experiment.applicationBehavior = behavior;

      // Cleanup
      await this.cleanupDatabaseChaos(config);

      experiment.status = "completed";
      return { success: true, experiment };
    } catch (error) {
      await this.emergencyRollback(experiment);
      return { success: false, error: error.message };
    }
  }

  // Safety mechanisms
  async performSafetyChecks(experiment) {
    const checks = ["business_hours_check", "incident_check", "deployment_check", "team_availability_check"];

    for (const check of checks) {
      const result = await this.safetyChecks[check]();
      if (!result.safe) {
        throw new Error(`Safety check failed: ${check} - ${result.reason}`);
      }
    }
  }

  async emergencyRollback(experiment) {
    console.log(`Emergency rollback for experiment ${experiment.id}`);

    const rollbackStrategy = this.rollbackStrategies[experiment.type];
    if (rollbackStrategy) {
      await rollbackStrategy(experiment);
    }

    // Send emergency alert
    await this.sendEmergencyAlert(experiment);
  }

  // Scheduled chaos experiments
  async scheduleRegularChaosTests() {
    const schedule = [
      {
        name: "weekly_service_failure",
        cron: "0 10 * * 1", // Monday 10 AM
        experiment: "service_failure",
        config: { service: "api-server", minReplicas: 1 },
      },
      {
        name: "monthly_network_partition",
        cron: "0 14 1 * *", // First day of month 2 PM
        experiment: "network_partition",
        config: { sourceService: "api-server", targetService: "database" },
      },
    ];

    for (const job of schedule) {
      await this.scheduleChaosJob(job);
    }
  }
}
```

## Real-World Implementation Examples

### Example 1: E-commerce Platform Monitoring

```javascript
// E-commerce specific monitoring setup
class EcommerceMonitoring {
  constructor() {
    this.businessMetrics = this.initializeBusinessMetrics();
  }

  initializeBusinessMetrics() {
    return {
      // Revenue tracking
      orderValue: new promClient.Histogram({
        name: "ecommerce_order_value_dollars",
        help: "Order value in dollars",
        labelNames: ["product_category", "user_segment", "payment_method"],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      }),

      // Conversion funnel
      conversionFunnel: new promClient.Counter({
        name: "ecommerce_conversion_events_total",
        help: "Conversion funnel events",
        labelNames: ["step", "source", "campaign"],
      }),

      // Inventory alerts
      inventoryLevels: new promClient.Gauge({
        name: "ecommerce_inventory_level",
        help: "Current inventory levels",
        labelNames: ["product_sku", "warehouse"],
      }),

      // Customer satisfaction
      reviewScores: new promClient.Histogram({
        name: "ecommerce_review_score",
        help: "Product review scores",
        labelNames: ["product_category"],
        buckets: [1, 2, 3, 4, 5],
      }),
    };
  }

  trackPurchase(order) {
    this.businessMetrics.orderValue.observe(
      {
        product_category: order.category,
        user_segment: order.userSegment,
        payment_method: order.paymentMethod,
      },
      order.totalValue
    );

    this.businessMetrics.conversionFunnel.inc({
      step: "purchase",
      source: order.source,
      campaign: order.campaign,
    });
  }

  updateInventory(productSku, warehouse, level) {
    this.businessMetrics.inventoryLevels.set({ product_sku: productSku, warehouse }, level);

    // Alert if inventory is low
    if (level < 10) {
      this.sendInventoryAlert(productSku, warehouse, level);
    }
  }
}
```

### Example 2: Financial Trading Monitoring

```javascript
// Financial trading specific monitoring
class TradingMonitoring {
  constructor() {
    this.tradingMetrics = this.initializeTradingMetrics();
  }

  initializeTradingMetrics() {
    return {
      // Order latency - critical for trading
      orderLatency: new promClient.Histogram({
        name: "trading_order_latency_microseconds",
        help: "Order processing latency in microseconds",
        labelNames: ["order_type", "market"],
        buckets: [100, 500, 1000, 5000, 10000, 50000], // microseconds
      }),

      // Trading volume
      tradingVolume: new promClient.Counter({
        name: "trading_volume_total",
        help: "Total trading volume",
        labelNames: ["symbol", "market", "order_type"],
      }),

      // Risk exposure
      riskExposure: new promClient.Gauge({
        name: "trading_risk_exposure_usd",
        help: "Current risk exposure in USD",
        labelNames: ["portfolio", "asset_class"],
      }),

      // Compliance checks
      complianceChecks: new promClient.Counter({
        name: "trading_compliance_checks_total",
        help: "Total compliance checks performed",
        labelNames: ["check_type", "result"],
      }),
    };
  }

  trackTrade(trade) {
    const latencyMicroseconds = trade.processingTime * 1000; // Convert to microseconds

    this.tradingMetrics.orderLatency.observe(
      {
        order_type: trade.orderType,
        market: trade.market,
      },
      latencyMicroseconds
    );

    this.tradingMetrics.tradingVolume.inc(
      {
        symbol: trade.symbol,
        market: trade.market,
        order_type: trade.orderType,
      },
      trade.volume
    );

    // Alert if latency exceeds threshold (5ms)
    if (latencyMicroseconds > 5000) {
      this.sendLatencyAlert(trade, latencyMicroseconds);
    }
  }
}
```

### Example 3: Gaming Platform Monitoring

```javascript
// Gaming platform specific monitoring
class GamingMonitoring {
  constructor() {
    this.gamingMetrics = this.initializeGamingMetrics();
  }

  initializeGamingMetrics() {
    return {
      // Player activity
      activePlayersSessions: new promClient.Gauge({
        name: "gaming_active_players",
        help: "Number of active players",
        labelNames: ["game_mode", "region", "platform"],
      }),

      // Game performance
      gameLatency: new promClient.Histogram({
        name: "gaming_latency_milliseconds",
        help: "Game latency in milliseconds",
        labelNames: ["game_mode", "region"],
        buckets: [10, 25, 50, 100, 200, 500, 1000],
      }),

      // Revenue metrics
      inAppPurchases: new promClient.Counter({
        name: "gaming_iap_revenue_dollars",
        help: "In-app purchase revenue",
        labelNames: ["item_type", "user_segment"],
      }),

      // Player engagement
      sessionDuration: new promClient.Histogram({
        name: "gaming_session_duration_minutes",
        help: "Player session duration in minutes",
        labelNames: ["game_mode", "player_level"],
        buckets: [1, 5, 15, 30, 60, 120, 300],
      }),
    };
  }

  trackPlayerSession(session) {
    this.gamingMetrics.activePlayersSessions.set(
      {
        game_mode: session.gameMode,
        region: session.region,
        platform: session.platform,
      },
      session.activePlayers
    );

    const sessionMinutes = session.duration / 60000; // Convert to minutes
    this.gamingMetrics.sessionDuration.observe(
      {
        game_mode: session.gameMode,
        player_level: session.playerLevel,
      },
      sessionMinutes
    );
  }
}
```

## Best Practices Summary

### Monitoring Strategy Framework

1. **Golden Signals First**: Latency, Traffic, Errors, Saturation
2. **Business Metrics Integration**: Revenue, user engagement, conversion rates
3. **Proactive Alerting**: Predict issues before they impact users
4. **Cost Consciousness**: Monitor infrastructure costs alongside performance
5. **Chaos Engineering**: Regular resilience testing and game days

### Implementation Checklist

✅ **Metrics Collection**: Prometheus with custom business metrics
✅ **Centralized Logging**: ELK stack with structured logging
✅ **Distributed Tracing**: OpenTelemetry with proper correlation
✅ **Dashboard Design**: Grafana with role-based views
✅ **Alerting Strategy**: Tiered alerts with escalation paths
✅ **Incident Response**: Automated workflows with war rooms
✅ **Cost Monitoring**: Regular optimization and forecasting
✅ **Chaos Testing**: Scheduled experiments with safety nets

This comprehensive monitoring guide provides enterprise-level observability practices essential for SDE2 positions, covering all major technology stacks and industry scenarios.
