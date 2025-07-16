// UI Controls
import { COLORS } from './config.js';
import { initEntities } from './entities.js';

function loadDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
    document.getElementById('dark-mode-toggle').checked = isDarkMode;
}

function saveDarkMode(isDarkMode) {
    localStorage.setItem('darkMode', isDarkMode);
}

function loadColorPreferences() {
    const savedColors = localStorage.getItem('gameColors');
    if (savedColors) {
        const colors = JSON.parse(savedColors);
        Object.assign(COLORS, colors);
    }
}

function saveColorPreferences() {
    const colorPrefs = {
        PLAYER: COLORS.PLAYER,
        FOOD_BASE_HUE: COLORS.FOOD_BASE_HUE,
        AI_BASE_HUE: COLORS.AI_BASE_HUE,
        MINIMAP: { ...COLORS.MINIMAP }
    };
    localStorage.setItem('gameColors', JSON.stringify(colorPrefs));
}

function updateGameColors() {
    if (window.gameInitialized) {
        initEntities();
    }
}

function updateColorInputs() {
    document.getElementById('player-color-picker').value = COLORS.PLAYER;
    document.getElementById('food-hue-slider').value = COLORS.FOOD_BASE_HUE;
    document.getElementById('food-hue-value').textContent = COLORS.FOOD_BASE_HUE + '°';
    document.getElementById('ai-hue-slider').value = COLORS.AI_BASE_HUE;
    document.getElementById('ai-hue-value').textContent = COLORS.AI_BASE_HUE + '°';
    document.getElementById('minimap-player-color-picker').value = COLORS.MINIMAP.PLAYER;
}

export function initUI() {
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    loadDarkMode();
    loadColorPreferences();
    updateColorInputs();

    // Toggle settings panel
    settingsIcon.addEventListener('click', (e) => {
        e.stopPropagation();  // Prevent click from propagating to document
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

    const playerColorPicker = document.getElementById('player-color-picker');
    const foodHueSlider = document.getElementById('food-hue-slider');
    const aiHueSlider = document.getElementById('ai-hue-slider');
    const minimapPlayerColorPicker = document.getElementById('minimap-player-color-picker');
    const resetColorsBtn = document.getElementById('reset-colors-btn');

    playerColorPicker.addEventListener('change', (e) => {
        COLORS.PLAYER = e.target.value;
        saveColorPreferences();
        updateGameColors();
    });

    foodHueSlider.addEventListener('input', (e) => {
        COLORS.FOOD_BASE_HUE = parseInt(e.target.value);
        document.getElementById('food-hue-value').textContent = e.target.value + '°';
        saveColorPreferences();
        updateGameColors();
    });

    aiHueSlider.addEventListener('input', (e) => {
        COLORS.AI_BASE_HUE = parseInt(e.target.value);
        document.getElementById('ai-hue-value').textContent = e.target.value + '°';
        saveColorPreferences();
        updateGameColors();
    });

    minimapPlayerColorPicker.addEventListener('change', (e) => {
        COLORS.MINIMAP.PLAYER = e.target.value;
        saveColorPreferences();
    });

    resetColorsBtn.addEventListener('click', () => {
        COLORS.PLAYER = '#008080';
        COLORS.FOOD_BASE_HUE = 180;
        COLORS.AI_BASE_HUE = 60;
        COLORS.MINIMAP.PLAYER = '#4CAF50';
        updateColorInputs();
        saveColorPreferences();
        updateGameColors();
    });
}
