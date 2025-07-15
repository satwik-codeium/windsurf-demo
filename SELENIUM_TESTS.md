# Selenium Tests for Game Controls

## Prerequisites
- Flask server running on localhost:5000
- Chrome browser installed
- Node.js dependencies installed

## Running Tests
```bash
# Start Flask server first
python3 app.py

# In another terminal, run Selenium tests
npm run test:selenium

# Or run all tests
npm run test:all
```

## Test Coverage
- Mouse movement tracking
- Cell splitting on click
- Settings panel toggle
- Dark mode toggle
- UI responsiveness

## Test Files
- `static/js/__tests__/selenium-setup.js` - WebDriver configuration and utilities
- `static/js/__tests__/game-controls.selenium.test.js` - Tests for mouse movement and canvas interactions
- `static/js/__tests__/ui-controls.selenium.test.js` - Tests for settings panel and dark mode functionality

## Test Details

### Game Controls Tests
1. **Mouse Movement Tracking** - Validates that mouse coordinates are properly tracked in the game state
2. **Cell Splitting on Click** - Tests that clicking the canvas triggers the cell split functionality
3. **Canvas Responsiveness** - Verifies that the game canvas is properly loaded and responsive to interactions

### UI Controls Tests
1. **Settings Panel Toggle** - Tests opening and closing the settings panel via the settings icon
2. **Dark Mode Toggle** - Validates theme switching and localStorage persistence
3. **Click Outside to Close** - Tests that clicking outside the settings panel closes it
4. **UI Element Accessibility** - Verifies that all key UI elements are properly loaded and accessible

## Configuration
The Selenium tests use headless Chrome with the following configuration:
- `--headless` - Run browser in headless mode
- `--no-sandbox` - Disable sandbox for CI environments
- `--disable-dev-shm-usage` - Overcome limited resource problems

## Dependencies
- `selenium-webdriver` - WebDriver implementation for browser automation
- `chromedriver` - Chrome browser driver for Selenium

## Notes
- Tests require the Flask server to be running on localhost:5000
- All tests use headless Chrome to avoid conflicts with the development browser
- Tests include proper setup and teardown to prevent resource leaks
- Each test file focuses on specific functionality areas for better organization
