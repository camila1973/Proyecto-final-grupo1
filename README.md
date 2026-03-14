# TravelHub Nx Monorepo

This is a monorepo workspace managed by [Nx](https://nx.dev), containing three applications:

- **backend** - NestJS API server
- **frontend** - React + Vite web application  
- **mobile** - Expo React Native mobile application

## 🚀 Getting Started

### Prerequisites

- Node.js 24
- npm or yarn
- For mobile development: iOS Simulator or Android Emulator

### Installation

```bash
npm install
```

## 📦 Projects

### Backend (NestJS)
Located in `backend/`

```bash
# Build
nx build backend

# Serve in development
nx serve backend

# Run tests
nx test backend

# Lint
nx lint backend
```

### Frontend (React + Vite)
Located in `frontend/`

```bash
# Build
nx build frontend

# Serve in development (runs on http://localhost:4200)
nx serve frontend

# Preview production build
nx preview frontend

# Lint
nx lint frontend
```

### Mobile (Expo)
Located in `mobile/`

```bash
# Start Expo dev server
nx start mobile

# Run on iOS
nx run-ios mobile

# Run on Android
nx run-android mobile

# Export for production
nx export mobile

# Lint
nx lint mobile
```

## 🔧 Common Nx Commands

### Run Multiple Projects

```bash
# Run all projects in development
nx run-many -t serve

# Build all projects
nx run-many -t build

# Lint all projects
nx run-many -t lint

# Test all projects
nx run-many -t test
```

### Dependency Graph

```bash
# View project dependency graph
nx graph
```

### Affected Commands

Run commands only on projects affected by your changes:

```bash
# Build only affected projects
nx affected -t build

# Test only affected projects
nx affected -t test

# Lint only affected projects
nx affected -t lint
```

## 📁 Workspace Structure

```
proyecto-travelhub/
├── backend/           # NestJS application
│   ├── src/
│   ├── test/
│   └── project.json   # Nx project configuration
├── frontend/          # React + Vite application
│   ├── src/
│   ├── public/
│   └── project.json   # Nx project configuration
├── mobile/            # Expo application
│   ├── app/
│   ├── components/
│   └── project.json   # Nx project configuration
├── dist/              # Build outputs
├── node_modules/      # Shared dependencies
├── nx.json            # Nx workspace configuration
└── package.json       # Root package.json with all dependencies
```

## 🎯 Benefits of Nx Monorepo

- **Unified Dependencies**: Single node_modules for all projects
- **Smart Caching**: Build and test cache for faster execution
- **Affected Commands**: Only build/test what changed
- **Code Sharing**: Easy to create shared libraries between projects
- **Task Orchestration**: Run tasks in parallel with optimal scheduling
- **Dependency Graph**: Visualize project relationships

## 🧪 Testing

```bash
# Test a specific project
nx test backend
nx test frontend
nx test mobile

# Test all projects
nx run-many -t test

# Watch mode
nx test backend --watch
```

## 🔁 CI (GitHub Actions)

This repository includes a CI workflow at `.github/workflows/ci.yml` that:

- builds `backend`, `frontend`, and `mobile`
- runs tests for `backend`, `frontend`, and `mobile`

It runs on every push and pull request.

## 📚 Learn More

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://nestjs.com)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Expo Documentation](https://docs.expo.dev)

## 🔄 Migration Notes

This workspace was converted from separate projects to an Nx monorepo:
- All dependencies consolidated to root `package.json`
- Each project has its own `project.json` for Nx configuration
- Build outputs go to `dist/<project-name>`
- Nx executors handle building, serving, and testing
