# E2E Tests - PR Tracker

This directory contains end-to-end tests for the PR Tracker application using Playwright.

> **📍 Location**: These E2E tests are located in `backend/e2e/` as they test the integration between the backend API and frontend application.

## 🏗️ **Architecture**

The E2E tests cover the complete user journey across:
- **Backend API** (Fastify server on port 3000)
- **Mobile App** (React Native via Expo Web on port 8081)

## 📋 **Test Suites**

### 1. **Setup Tests** (`setup.spec.ts`)
- ✅ Backend health check
- ✅ Mobile app accessibility
- ✅ Error monitoring

### 2. **Authentication Tests** (`auth.spec.ts`)
- ✅ Login screen display
- ✅ Guest/demo login flow
- ✅ Admin login form
- ✅ Password visibility toggle
- ✅ Form validation
- ✅ Register navigation

### 3. **Workout Management Tests** (`workout.spec.ts`)
- ✅ Workout section navigation
- ✅ New workout creation
- ✅ Workout list viewing
- ✅ Workout details interaction
- ✅ Search/filter functionality

### 4. **Offline/Online Sync Tests** (`offline-sync.spec.ts`)
- ✅ Online mode functionality
- ✅ Offline mode graceful handling
- ✅ Data synchronization on reconnection
- ✅ Sync status indicators
- ✅ Network error handling
- ✅ Data integrity maintenance

## 🚀 **Getting Started**

### Prerequisites
- Backend server running on `localhost:3000`
- Mobile app (Expo Web) running on `localhost:8081`

### Installation
```bash
cd backend
pnpm install                # Installs both backend deps + Playwright
pnpm run e2e:install       # Install Playwright browsers
```

### Running Tests

#### From Backend Directory
```bash
cd backend

# All E2E tests
pnpm test:e2e               # Run all E2E tests headless
pnpm test:e2e:headed       # Run with browser visible
pnpm test:e2e:debug        # Debug mode
pnpm test:e2e:ui           # Interactive UI mode

# Specific test suites
pnpm test:e2e:setup        # Setup/health checks
pnpm test:e2e:auth         # Authentication flow
pnpm test:e2e:workout      # Workout management
pnpm test:e2e:offline      # Offline/sync functionality

# Combined testing
pnpm test:all              # Unit tests + E2E tests
pnpm e2e:report            # Show test results
```

#### Alternative: Direct from E2E directory
```bash
cd backend/e2e
pnpm test                  # Run all tests headless
pnpm test:headed          # Run with browser visible
pnpm test:debug           # Debug mode
pnpm test:ui              # Interactive UI mode
```

#### View Results
```bash
pnpm show-report            # Open HTML test report
```

## ⚙️ **Configuration**

### Test Environment
- **Base URL**: `http://localhost:8081` (Expo Web)
- **API URL**: `http://localhost:3000/api` (Backend)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### Auto-Start Servers
The tests automatically start both backend and mobile servers:
```typescript
webServer: [
  { command: 'cd ../backend && pnpm dev', port: 3000 },
  { command: 'cd ../mobile && pnpm web', port: 8081 }
]
```

## 🔧 **Test Structure**

```
e2e/
├── tests/
│   ├── helpers/
│   │   └── test-utils.ts       # Utility functions
│   ├── fixtures/
│   │   └── test-data.ts        # Test data and mocks
│   ├── setup.spec.ts           # Environment setup tests
│   ├── auth.spec.ts            # Authentication flow tests
│   ├── workout.spec.ts         # Workout management tests
│   └── offline-sync.spec.ts    # Sync functionality tests
├── playwright.config.ts        # Playwright configuration
└── README.md                   # This file
```

## 🎯 **Test Strategy**

### Resilient Testing Approach
The tests are designed to be resilient and adaptive:

1. **Flexible Element Selection**: Multiple selectors for each element
2. **Graceful Failure Handling**: Tests adapt to missing features
3. **Progressive Enhancement**: Tests work with partial implementations
4. **Error Monitoring**: Console error tracking and validation

### Example - Flexible Button Finding
```typescript
const newWorkoutSelectors = [
  'button:has-text("Novo Treino")',      // Portuguese
  'button:has-text("New Workout")',      // English
  'button:has-text("+")',                // Icon button
  '[data-testid="add-workout"]',         // Test ID
  '.add-workout-button'                  // CSS class
];
```

## 🐛 **Troubleshooting**

### Common Issues

#### 1. Browsers Not Installing
```bash
# Install system dependencies
sudo pnpm run install-deps

# Or install specific packages
sudo apt-get install libicu74 libxml2 libflite1
```

#### 2. Servers Not Starting
```bash
# Start manually
cd ../backend && pnpm dev        # Terminal 1
cd ../mobile && pnpm web         # Terminal 2
cd e2e && pnpm test             # Terminal 3
```

#### 3. Tests Timing Out
- Increase timeouts in `playwright.config.ts`
- Check if servers are running properly
- Use `--headed` mode to see what's happening

#### 4. Element Not Found
- Tests are designed to be flexible
- Check if the feature exists in the current app version
- Update selectors in test files if UI changed

## 📊 **Test Coverage**

### Core User Journeys ✅
- [x] Guest login and app access
- [x] Basic navigation
- [x] Workout interaction (where available)
- [x] Offline functionality testing
- [x] Error handling validation

### Future Enhancements 🚀
- [ ] Real authentication with backend
- [ ] Full CRUD operations for workouts
- [ ] Data persistence validation
- [ ] Performance testing
- [ ] Visual regression testing

## 🔍 **Debugging**

### Debug Mode
```bash
pnpm test:debug
```

### Console Logging
```bash
# Check browser console in tests
page.on('console', msg => console.log(msg.text()));
```

### Screenshots
Tests automatically capture screenshots on failures.

### Trace Viewer
```bash
# After test failure, view trace
npx playwright show-trace test-results/test-name/trace.zip
```

---

**Note**: These tests are designed to work with the current state of the application and will adapt as features are implemented. The flexible selectors ensure tests remain functional even as the UI evolves.