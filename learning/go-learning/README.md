# Go Learning Journey - Quick Start Guide

## 🚀 Getting Started

### Prerequisites

- macOS 10.15+ (you're on darwin 24.5.0 ✅)
- Terminal access
- Text editor (VS Code recommended)

### 1. Install Go

```bash
# Using Homebrew (recommended for macOS)
brew install go

# Verify installation
go version
```

### 2. Setup Workspace

```bash
# Create main learning directory
mkdir -p ~/go-learning
cd ~/go-learning

# Initialize as Go module
go mod init go-learning

# Create project structure
mkdir -p {week01,week02,week03,week04}/{theory,practice,projects}
mkdir -p {week05,week06,week07,week08}/{theory,practice,projects}
mkdir -p {week09,week10,week11,week12}/{theory,practice,projects}
```

### 3. Install Essential Tools

```bash
# VS Code Go extension dependencies
go install golang.org/x/tools/gopls@latest
go install github.com/go-delve/delve/cmd/dlv@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
```

### 4. Configure VS Code (Optional)

Install the official Go extension and add these settings:

```json
{
  "go.useLanguageServer": true,
  "go.toolsManagement.autoUpdate": true,
  "go.lintOnSave": "workspace",
  "go.formatOnSave": true,
  "go.testOnSave": true
}
```

## 📁 Project Structure

```
go-learning/
├── week01/
│   ├── theory/          # Notes and concepts
│   ├── practice/        # Small exercises
│   └── projects/        # Week projects
├── week02/
│   └── ...
├── portfolio/           # Major projects
├── resources/           # Books, links, cheatsheets
└── assessments/         # Weekly quizzes and tests
```

## 🎯 Daily Workflow

### Morning Routine (20 min theory + 40 min coding)

1. Read theory material for current week
2. Take notes in `weekXX/theory/` folder
3. Complete coding exercises in `weekXX/practice/`
4. Commit progress to Git

### Evening Session (1.5 hours)

1. Work on weekly project
2. Test and debug code
3. Review and optimize
4. Update progress tracker

## 📊 Progress Tracking

Create these files in each week folder:

- `progress.md` - Daily achievements
- `notes.md` - Key learnings
- `challenges.md` - Difficulties faced
- `resources.md` - Helpful links found

## 🆘 Need Help?

### Debugging Checklist

1. Check Go version: `go version`
2. Verify module: `go mod tidy`
3. Run tests: `go test ./...`
4. Check formatting: `go fmt ./...`
5. Static analysis: `staticcheck ./...`

### Community Resources

- [Go Forum](https://forum.golangbridge.org/)
- [Gopher Slack](https://gophers.slack.com/)
- [r/golang](https://reddit.com/r/golang)

## ✅ Week 1 Checklist

- [ ] Go installed and verified
- [ ] Workspace created and organized
- [ ] VS Code setup with Go extension
- [ ] First "Hello World" program written
- [ ] Git repository initialized
- [ ] Progress tracking system setup

**Ready to start? Jump into Week 1 of your parallel learning plan!**
