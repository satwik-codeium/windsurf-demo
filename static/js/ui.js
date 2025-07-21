// UI Controls
import { WORLD_SIZE, AI_COUNT, FOOD_COUNT } from './config.js';

function loadDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
    document.getElementById('dark-mode-toggle').checked = isDarkMode;
}

function saveDarkMode(isDarkMode) {
    localStorage.setItem('darkMode', isDarkMode);
}

function loadDebugMode() {
    const isDebugMode = localStorage.getItem('debugMode') === 'true';
    const debugPanel = document.getElementById('debug-panel');
    const debugToggle = document.getElementById('debug-mode-toggle');
    
    debugPanel.style.display = isDebugMode ? 'block' : 'none';
    debugToggle.checked = isDebugMode;
    
    if (isDebugMode) {
        updateDebugInfo();
    }
}

function saveDebugMode(isDebugMode) {
    localStorage.setItem('debugMode', isDebugMode);
}

function updateDebugInfo() {
    document.getElementById('debug-world-size').textContent = WORLD_SIZE;
    document.getElementById('debug-ai-count').textContent = AI_COUNT;
    document.getElementById('debug-food-count').textContent = FOOD_COUNT;
}

export function initUI() {
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const debugModeToggle = document.getElementById('debug-mode-toggle');

    loadDarkMode();
    loadDebugMode();

    // Toggle settings panel
    settingsIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('visible');
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && settingsPanel.classList.contains('visible')) {
            settingsPanel.classList.remove('visible');
        }
    });

    // Prevent game controls when interacting with settings
    settingsPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle dark mode toggle
    darkModeToggle.addEventListener('change', (e) => {
        const isDarkMode = e.target.checked;
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
        saveDarkMode(isDarkMode);
    });

    // Handle debug mode toggle
    debugModeToggle.addEventListener('change', (e) => {
        const isDebugMode = e.target.checked;
        const debugPanel = document.getElementById('debug-panel');
        
        debugPanel.style.display = isDebugMode ? 'block' : 'none';
        saveDebugMode(isDebugMode);
        
        if (isDebugMode) {
            updateDebugInfo();
        }
    });
}
