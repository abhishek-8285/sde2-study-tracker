# Code Review & Quality Monitoring

A comprehensive guide to modern code review practices, quality monitoring tools, and automated quality gates essential for SDE2-level development workflows.

## 📋 Table of Contents

1. [Code Review Best Practices](#code-review-best-practices)
2. [Automated Quality Tools](#automated-quality-tools)
3. [Static Analysis & Security](#static-analysis--security)
4. [Git Workflow Strategies](#git-workflow-strategies)
5. [Quality Gates & CI Integration](#quality-gates--ci-integration)
6. [Metrics & Monitoring](#metrics--monitoring)
7. [Real-World Examples](#real-world-examples)

## Code Review Best Practices

### Review Process Framework

```yaml
# .github/pull_request_template.md
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Performance impact considered
```

### Review Checklist Template

```javascript
// Review checklist for JavaScript/TypeScript
const REVIEW_CHECKLIST = {
  functionality: ["Does the code do what it says it does?", "Are edge cases handled?", "Is error handling appropriate?", "Are there any obvious bugs?"],
  design: ["Is the code well-designed and consistent with existing patterns?", "Are there any code smells or anti-patterns?", "Is the code reusable and maintainable?", "Are there any architectural concerns?"],
  complexity: ["Is the code easy to understand?", "Are functions and classes appropriately sized?", "Is the logic clear and well-documented?", "Can any complex code be simplified?"],
  tests: ["Are tests comprehensive and meaningful?", "Do tests cover edge cases?", "Are tests maintainable and readable?", "Is test coverage adequate?"],
  naming: ["Are variable and function names clear?", "Do names follow conventions?", "Are there any misleading names?", "Is the code self-documenting?"],
};
```

### Effective Review Comments

```javascript
// ❌ Poor review comment
"This is wrong"

// ✅ Good review comment
"Consider using Array.find() instead of filter()[0] for better performance
and clarity. This also handles the case where no element is found more gracefully.

// Suggested change:
const user = users.find(u => u.id === targetId);
if (!user) {
  throw new Error('User not found');
}"

// ❌ Poor review comment
"Fix this"

// ✅ Good review comment
"This function is doing too many things. Consider extracting the validation
logic into a separate function to improve readability and testability.

// Example:
function validateUserInput(input) {
  // validation logic here
}

function processUser(userData) {
  validateUserInput(userData);
  // processing logic here
}"
```

## Automated Quality Tools

### SonarQube Setup and Configuration

```yaml
# docker-compose.yml for SonarQube
version: "3.8"
services:
  sonarqube:
    image: sonarqube:9.9-community
    container_name: sonarqube
    depends_on:
      - sonarqube-db
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://sonarqube-db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ports:
      - "9000:9000"

  sonarqube-db:
    image: postgres:13
    container_name: sonarqube-db
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - postgresql_data:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
  postgresql_data:
```

```javascript
// sonar-project.js - SonarQube configuration
module.exports = {
  "sonar.projectKey": "my-react-app",
  "sonar.projectName": "My React Application",
  "sonar.projectVersion": "1.0.0",
  "sonar.sources": "src",
  "sonar.tests": "src",
  "sonar.test.inclusions": "**/*.test.ts,**/*.test.tsx,**/*.spec.ts",
  "sonar.coverage.exclusions": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/node_modules/**", "**/coverage/**", "**/*.config.js"].join(","),
  "sonar.javascript.lcov.reportPaths": "coverage/lcov.info",
  "sonar.typescript.lcov.reportPaths": "coverage/lcov.info",
  "sonar.qualitygate.wait": true,
};
```

### ESLint Advanced Configuration

```javascript
// .eslintrc.js - Production-ready ESLint config
module.exports = {
  extends: ["eslint:recommended", "@typescript-eslint/recommended", "react-hooks/recommended", "plugin:react/recommended", "plugin:jsx-a11y/recommended", "plugin:import/recommended", "plugin:import/typescript"],
  plugins: ["@typescript-eslint", "react", "react-hooks", "jsx-a11y", "import", "security", "unicorn"],
  rules: {
    // Code Quality
    complexity: ["error", { max: 10 }],
    "max-depth": ["error", 4],
    "max-lines": ["error", 300],
    "max-lines-per-function": ["error", 50],
    "max-params": ["error", 4],

    // Security
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-buffer-noassert": "error",

    // Performance
    "react-hooks/exhaustive-deps": "error",
    "react/jsx-no-bind": "error",
    "react/jsx-no-leaked-render": "error",

    // Best Practices
    "unicorn/prefer-array-some": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-string-starts-ends-with": "error",
    "import/no-default-export": "error",
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
  },
  overrides: [
    {
      files: ["*.test.*", "*.spec.*"],
      rules: {
        "max-lines-per-function": "off",
        "max-lines": "off",
      },
    },
  ],
};
```

### CodeClimate Configuration

```yaml
# .codeclimate.yml
version: "2"

checks:
  argument-count:
    config:
      threshold: 4
  complex-logic:
    config:
      threshold: 4
  file-lines:
    config:
      threshold: 250
  method-complexity:
    config:
      threshold: 5
  method-count:
    config:
      threshold: 20
  method-lines:
    config:
      threshold: 25
  nested-control-flow:
    config:
      threshold: 4
  return-statements:
    config:
      threshold: 4
  similar-code:
    config:
      threshold: 70
  identical-code:
    config:
      threshold: 50

plugins:
  eslint:
    enabled: true
    config:
      config: .eslintrc.js
    channel: "eslint-8"
  stylelint:
    enabled: true
  duplication:
    enabled: true
    config:
      languages:
        - javascript
        - typescript

exclude_patterns:
  - "node_modules/"
  - "coverage/"
  - "build/"
  - "dist/"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
```

## Static Analysis & Security

### Snyk Security Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Snyk Code Quality
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: code test
```

### SAST with Semgrep

```yaml
# .semgrep.yml - Custom security rules
rules:
  - id: hardcoded-secret
    message: Potential hardcoded secret detected
    languages: [javascript, typescript]
    severity: ERROR
    pattern-either:
      - pattern: |
          const $VAR = "$SECRET"
      - pattern: |
          let $VAR = "$SECRET"
    pattern-where:
      - metavariable: $SECRET
        regex: "^[A-Za-z0-9+/]{20,}={0,2}$"

  - id: sql-injection
    message: Potential SQL injection vulnerability
    languages: [javascript, typescript]
    severity: ERROR
    pattern-either:
      - pattern: |
          $DB.query($QUERY + $INPUT)
      - pattern: |
          $DB.execute(`SELECT * FROM users WHERE id = ${$INPUT}`)

  - id: xss-vulnerability
    message: Potential XSS vulnerability
    languages: [javascript, typescript]
    severity: WARNING
    pattern: |
      $EL.innerHTML = $INPUT
```

### Dependency Scanning

```javascript
// package.json - npm audit configuration
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated",
    "security:check": "npm audit && snyk test"
  },
  "auditConfig": {
    "report-type": "full",
    "registry": "https://registry.npmjs.org"
  }
}
```

## Git Workflow Strategies

### GitFlow Implementation

```bash
#!/bin/bash
# gitflow-setup.sh - Initialize GitFlow

# Initialize git flow
git flow init

# Start a new feature
git flow feature start user-authentication

# Finish feature (merges to develop)
git flow feature finish user-authentication

# Start a release
git flow release start v1.0.0

# Finish release (merges to main and develop)
git flow release finish v1.0.0

# Hotfix for production
git flow hotfix start critical-bug-fix
git flow hotfix finish critical-bug-fix
```

### GitHub Flow with Quality Gates

```yaml
# .github/workflows/pull-request.yml
name: Pull Request Quality Check

on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint check
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
            const coveragePercent = coverage.total.lines.pct;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Quality Gate Results
              
              ✅ Lint: Passed
              ✅ Type Check: Passed  
              ✅ Tests: Passed
              📊 Coverage: ${coveragePercent}%
              
              ${coveragePercent >= 80 ? '✅' : '❌'} Coverage threshold (80%)`
            });
```

### Conventional Commits with Validation

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Formatting
        "refactor", // Code refactoring
        "test", // Adding tests
        "chore", // Maintenance
        "perf", // Performance improvement
        "ci", // CI/CD changes
        "build", // Build system changes
        "revert", // Revert changes
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "scope-case": [2, "always", "lower-case"],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 72],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
};
```

## Quality Gates & CI Integration

### Multi-stage Quality Pipeline

```yaml
# .github/workflows/quality-pipeline.yml
name: Quality Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  code-quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: E2E tests
        run: npm run test:e2e

      - name: Coverage report
        run: npm run test:coverage

      - name: Bundle analysis
        run: npm run analyze

  security-scan:
    runs-on: ubuntu-latest
    needs: code-quality

    steps:
      - uses: actions/checkout@v3

      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  performance-budget:
    runs-on: ubuntu-latest
    needs: code-quality

    steps:
      - uses: actions/checkout@v3

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: "./.lighthouserc.json"
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### SonarQube Quality Gate

```javascript
// sonar-quality-gate.js
const SonarQubeAPI = require("sonarqube-web-api");

class QualityGateChecker {
  constructor(sonarUrl, token) {
    this.sonar = new SonarQubeAPI({
      serverUrl: sonarUrl,
      token: token,
    });
  }

  async checkQualityGate(projectKey) {
    try {
      const qualityGate = await this.sonar.qualityGates.getProjectStatus({
        projectKey: projectKey,
      });

      const conditions = qualityGate.projectStatus.conditions;
      const failedConditions = conditions.filter((c) => c.status === "ERROR");

      if (failedConditions.length > 0) {
        console.error("Quality Gate Failed:");
        failedConditions.forEach((condition) => {
          console.error(`- ${condition.metricKey}: ${condition.actualValue} (threshold: ${condition.errorThreshold})`);
        });
        process.exit(1);
      }

      console.log("✅ Quality Gate Passed");
      return true;
    } catch (error) {
      console.error("Error checking quality gate:", error);
      process.exit(1);
    }
  }

  async getCodeCoverage(projectKey) {
    const coverage = await this.sonar.measures.getComponentMeasures({
      component: projectKey,
      metricKeys: "coverage,line_coverage,branch_coverage",
    });

    return coverage.measures.reduce((acc, measure) => {
      acc[measure.metric] = parseFloat(measure.value);
      return acc;
    }, {});
  }
}

// Usage
const checker = new QualityGateChecker(process.env.SONAR_URL, process.env.SONAR_TOKEN);

checker.checkQualityGate(process.env.SONAR_PROJECT_KEY);
```

## Metrics & Monitoring

### Code Quality Metrics Dashboard

```javascript
// quality-metrics.js - Collect and track quality metrics
class QualityMetrics {
  constructor() {
    this.metrics = {
      codeComplexity: 0,
      testCoverage: 0,
      techDebt: 0,
      duplicatedCode: 0,
      maintainabilityIndex: 0,
      securityIssues: 0,
    };
  }

  async collectMetrics() {
    // Collect from SonarQube
    const sonarMetrics = await this.getSonarMetrics();

    // Collect from ESLint
    const lintMetrics = await this.getLintMetrics();

    // Collect from tests
    const testMetrics = await this.getTestMetrics();

    return {
      ...sonarMetrics,
      ...lintMetrics,
      ...testMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  async getSonarMetrics() {
    const response = await fetch(`${process.env.SONAR_URL}/api/measures/component`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.SONAR_TOKEN}`,
      },
      params: {
        component: process.env.SONAR_PROJECT_KEY,
        metricKeys: "complexity,coverage,sqale_index,duplicated_lines_density,reliability_rating,security_rating",
      },
    });

    const data = await response.json();
    return this.transformSonarMetrics(data);
  }

  async getLintMetrics() {
    const { ESLint } = require("eslint");
    const eslint = new ESLint();

    const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
    const formatter = await eslint.loadFormatter("json");
    const resultText = formatter.format(results);

    return this.transformLintResults(JSON.parse(resultText));
  }

  transformLintResults(results) {
    const errors = results.reduce((sum, result) => sum + result.errorCount, 0);
    const warnings = results.reduce((sum, result) => sum + result.warningCount, 0);

    return {
      lintErrors: errors,
      lintWarnings: warnings,
      lintScore: this.calculateLintScore(errors, warnings),
    };
  }

  calculateLintScore(errors, warnings) {
    // Simple scoring: start with 100, subtract points for issues
    let score = 100;
    score -= errors * 5; // 5 points per error
    score -= warnings * 1; // 1 point per warning
    return Math.max(0, score);
  }
}

// Export metrics to monitoring system
const metrics = new QualityMetrics();
metrics.collectMetrics().then((data) => {
  console.log("Quality Metrics:", JSON.stringify(data, null, 2));

  // Send to monitoring system (Prometheus, DataDog, etc.)
  if (process.env.METRICS_ENDPOINT) {
    fetch(process.env.METRICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }
});
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Code Quality Metrics",
    "panels": [
      {
        "title": "Test Coverage Trend",
        "type": "graph",
        "targets": [
          {
            "expr": "code_coverage_percentage",
            "legendFormat": "Coverage %"
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
      },
      {
        "title": "Technical Debt",
        "type": "singlestat",
        "targets": [
          {
            "expr": "technical_debt_hours",
            "legendFormat": "Hours"
          }
        ],
        "thresholds": "10,20",
        "colorBackground": true
      },
      {
        "title": "Code Complexity",
        "type": "graph",
        "targets": [
          {
            "expr": "cyclomatic_complexity_avg",
            "legendFormat": "Average Complexity"
          }
        ]
      },
      {
        "title": "Security Issues",
        "type": "graph",
        "targets": [
          {
            "expr": "security_issues_count",
            "legendFormat": "{{severity}}"
          }
        ]
      }
    ]
  }
}
```

## Real-World Examples

### Example 1: E-commerce Platform Quality Pipeline

```javascript
// E-commerce quality configuration
class EcommerceQualityPipeline {
  constructor() {
    this.qualityGates = {
      // Critical for payment processing
      security: {
        vulnerabilities: 0,
        securityHotspots: 0,
      },
      // Important for user experience
      performance: {
        bundleSize: 500, // KB
        loadTime: 3000, // ms
      },
      // Essential for maintainability
      maintainability: {
        coverage: 85,
        complexity: 10,
        duplication: 3,
      },
    };
  }

  async validateQualityGates(metrics) {
    const results = {
      security: this.validateSecurity(metrics),
      performance: this.validatePerformance(metrics),
      maintainability: this.validateMaintainability(metrics),
    };

    const allPassed = Object.values(results).every((result) => result.passed);

    if (!allPassed) {
      throw new Error(`Quality gates failed: ${JSON.stringify(results, null, 2)}`);
    }

    return results;
  }

  validateSecurity(metrics) {
    return {
      passed: metrics.vulnerabilities === 0 && metrics.securityHotspots === 0,
      details: {
        vulnerabilities: metrics.vulnerabilities,
        securityHotspots: metrics.securityHotspots,
      },
    };
  }
}
```

### Example 2: Social Media App Review Process

```yaml
# Social media app review workflow
name: Social Media Review Process

on:
  pull_request:
    paths:
      - "src/components/**"
      - "src/features/**"
      - "src/utils/**"

jobs:
  ui-review:
    runs-on: ubuntu-latest
    steps:
      - name: Visual regression tests
        run: npm run test:visual

      - name: Accessibility audit
        run: npm run audit:a11y

      - name: Performance budget
        run: npm run test:performance

  content-safety:
    runs-on: ubuntu-latest
    steps:
      - name: Content moderation checks
        run: npm run test:content-safety

      - name: Privacy compliance
        run: npm run audit:privacy
```

### Example 3: Financial Services Security Review

```javascript
// Financial services security-first review process
class FinancialServicesReview {
  constructor() {
    this.securityChecks = ["dataEncryption", "inputValidation", "authenticationChecks", "auditLogging", "complianceValidation"];
  }

  async performSecurityReview(codeChanges) {
    const results = await Promise.all([this.checkDataEncryption(codeChanges), this.validateInputSanitization(codeChanges), this.verifyAuthenticationLogic(codeChanges), this.auditComplianceRequirements(codeChanges)]);

    return this.generateSecurityReport(results);
  }

  async checkDataEncryption(changes) {
    // Check for PII handling without encryption
    const piiPatterns = [/social.*security/i, /credit.*card/i, /bank.*account/i, /ssn|ein/i];

    const violations = [];
    for (const file of changes) {
      for (const pattern of piiPatterns) {
        if (pattern.test(file.content) && !this.hasEncryption(file.content)) {
          violations.push({
            file: file.path,
            issue: "PII detected without encryption",
            line: this.findLineNumber(file.content, pattern),
          });
        }
      }
    }

    return { passed: violations.length === 0, violations };
  }
}
```

### Example 4: SaaS Platform Automated Reviews

```typescript
// SaaS platform automated review system
interface ReviewCriteria {
  performance: PerformanceCriteria;
  security: SecurityCriteria;
  scalability: ScalabilityCriteria;
  maintainability: MaintainabilityCriteria;
}

class SaaSPlatformReviewer {
  private criteria: ReviewCriteria;

  constructor(criteria: ReviewCriteria) {
    this.criteria = criteria;
  }

  async reviewPullRequest(prData: PullRequestData): Promise<ReviewResult> {
    const [performanceResult, securityResult, scalabilityResult, maintainabilityResult] = await Promise.all([this.checkPerformance(prData), this.checkSecurity(prData), this.checkScalability(prData), this.checkMaintainability(prData)]);

    return this.aggregateResults({
      performance: performanceResult,
      security: securityResult,
      scalability: scalabilityResult,
      maintainability: maintainabilityResult,
    });
  }

  private async checkPerformance(prData: PullRequestData): Promise<CheckResult> {
    // Database query optimization check
    const dbQueries = this.extractDatabaseQueries(prData.changes);
    const inefficientQueries = dbQueries.filter((q) => this.isInefficient(q));

    // API response time check
    const apiChanges = this.extractApiChanges(prData.changes);
    const slowEndpoints = await this.benchmarkEndpoints(apiChanges);

    return {
      passed: inefficientQueries.length === 0 && slowEndpoints.length === 0,
      issues: [...inefficientQueries, ...slowEndpoints],
    };
  }

  private async checkScalability(prData: PullRequestData): Promise<CheckResult> {
    // Memory usage patterns
    const memoryLeaks = this.detectMemoryLeaks(prData.changes);

    // Resource utilization
    const resourceIssues = this.checkResourceUtilization(prData.changes);

    // Concurrency safety
    const concurrencyIssues = this.checkConcurrencySafety(prData.changes);

    return {
      passed: memoryLeaks.length === 0 && resourceIssues.length === 0 && concurrencyIssues.length === 0,
      issues: [...memoryLeaks, ...resourceIssues, ...concurrencyIssues],
    };
  }
}
```

### Example 5: Gaming Application Performance Review

```javascript
// Gaming application performance-focused review
class GamingAppReviewer {
  constructor() {
    this.performanceThresholds = {
      frameRate: 60, // FPS
      latency: 16.67, // ms (60 FPS target)
      memoryUsage: 100, // MB
      batteryDrain: 5, // % per hour
    };
  }

  async reviewGameplayChanges(changes) {
    return await Promise.all([this.checkRenderPerformance(changes), this.validateNetworkOptimization(changes), this.analyzeMemoryManagement(changes), this.testBatteryImpact(changes)]);
  }

  async checkRenderPerformance(changes) {
    // Look for expensive rendering operations
    const expensiveOperations = this.findExpensiveRenderCalls(changes);

    // Check for unnecessary re-renders
    const renderIssues = this.detectUnnecessaryRenders(changes);

    // Validate frame timing
    const frameTimingIssues = await this.benchmarkFrameTiming(changes);

    return {
      category: "performance",
      passed: expensiveOperations.length === 0 && renderIssues.length === 0,
      issues: [...expensiveOperations, ...renderIssues, ...frameTimingIssues],
    };
  }

  findExpensiveRenderCalls(changes) {
    const expensivePatterns = [
      /getContext\('2d'\).*\.drawImage/g, // Canvas operations
      /\.innerHTML\s*=/g, // DOM manipulation
      /document\.createElement/g, // Dynamic element creation
      /\.appendChild\(/g, // DOM insertion
    ];

    const issues = [];
    for (const file of changes) {
      for (const pattern of expensivePatterns) {
        const matches = file.content.match(pattern);
        if (matches) {
          issues.push({
            file: file.path,
            type: "expensive_render_operation",
            description: `Found ${matches.length} potentially expensive render operations`,
            suggestion: "Consider using requestAnimationFrame() or canvas optimization techniques",
          });
        }
      }
    }

    return issues;
  }
}
```

## Decision Framework

### Tool Selection Matrix

| Tool            | Use Case           | Team Size | Complexity | Cost | Integration |
| --------------- | ------------------ | --------- | ---------- | ---- | ----------- |
| **SonarQube**   | Enterprise quality | Large     | High       | $$$  | Excellent   |
| **CodeClimate** | SaaS quality       | Medium    | Medium     | $$   | Good        |
| **ESLint**      | Code linting       | Any       | Low        | Free | Excellent   |
| **Snyk**        | Security scanning  | Any       | Low        | $$   | Excellent   |
| **Semgrep**     | Custom rules       | Medium    | Medium     | $    | Good        |

### When to Use Each Approach

**Use SonarQube when:**

- Enterprise environment with dedicated DevOps team
- Need comprehensive quality tracking over time
- Require detailed technical debt analysis
- Security and compliance are critical

**Use CodeClimate when:**

- SaaS/startup environment
- Want quick setup with minimal configuration
- Need good GitHub integration
- Budget is a consideration

**Use ESLint + Prettier when:**

- JavaScript/TypeScript projects
- Need fast, reliable linting
- Want extensive rule customization
- Integrating with existing workflows

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Over-aggressive Quality Gates

```javascript
// ❌ Too strict - blocks development
const qualityGates = {
  coverage: 95, // Unrealistic for most projects
  complexity: 1, // Too restrictive
  duplication: 0, // Impossible in practice
};

// ✅ Balanced approach
const qualityGates = {
  coverage: 80, // Achievable and meaningful
  complexity: 10, // Allows reasonable complexity
  duplication: 3, // Some duplication acceptable
  gradualImprovement: true, // Improve over time
};
```

### ❌ Pitfall 2: Ignoring Review Context

```javascript
// ❌ Generic review comments
"This function is too complex"

// ✅ Context-aware feedback
"This payment processing function has high complexity (15).
Consider extracting validation logic into separate functions
to improve testability and reduce risk for financial operations."
```

### ❌ Pitfall 3: Manual Process Bottlenecks

```yaml
# ❌ Manual gates slow down delivery
- Manual security review (2-3 days)
- Manual performance testing (1-2 days)
- Manual documentation review (1 day)

# ✅ Automated with human oversight
- Automated security scanning (5 minutes)
- Automated performance benchmarks (10 minutes)
- Generated documentation with review (30 minutes)
```

## Best Practices Summary

### For Code Reviews:

1. **Small, focused PRs** - easier to review thoroughly
2. **Clear descriptions** - explain the "why" not just "what"
3. **Automated checks first** - catch obvious issues before human review
4. **Constructive feedback** - suggest solutions, not just problems
5. **Review your own code** - self-review before requesting review

### For Quality Monitoring:

1. **Establish baselines** - know your current quality metrics
2. **Set realistic targets** - gradual improvement over time
3. **Monitor trends** - focus on direction, not just absolute values
4. **Automate collection** - reduce manual effort and errors
5. **Act on insights** - metrics are only valuable if you use them

### For Tool Integration:

1. **Start simple** - begin with basic tools and add complexity gradually
2. **Consistent configuration** - standardize across projects
3. **Regular updates** - keep tools and rules current
4. **Team training** - ensure everyone understands the tools
5. **Measure effectiveness** - track whether tools improve outcomes

---

This comprehensive guide provides the foundation for implementing robust code review and quality monitoring practices that scale with your team and technology stack.
