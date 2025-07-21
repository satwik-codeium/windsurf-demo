// UI Controls
import { getConfig, initConfig } from './config.js';
import { updateConfig } from './configLoader.js';
import { initEntities } from './entities.js';

function loadDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
    document.getElementById('dark-mode-toggle').checked = isDarkMode;
}

function saveDarkMode(isDarkMode) {
    localStorage.setItem('darkMode', isDarkMode);
}

export function initUI() {
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Load dark mode preference
    loadDarkMode();

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
}

window.toggleDebugMode = function() {
    const debugToggle = document.getElementById('debug-mode-toggle');
    const debugControls = document.getElementById('debug-controls');
    
    if (debugToggle.checked) {
        debugControls.style.display = 'block';
        loadCurrentConfig();
    } else {
        debugControls.style.display = 'none';
    }
};

async function loadCurrentConfig() {
    try {
        const config = await getConfig();
        document.getElementById('world-size-input').value = config.world.size;
        document.getElementById('ai-count-input').value = config.entities.aiCount;
        document.getElementById('food-count-input').value = config.entities.foodCount;
    } catch (error) {
        console.error('Failed to load current config:', error);
    }
}

window.applyDebugConfig = async function() {
    const worldSize = parseInt(document.getElementById('world-size-input').value);
    const aiCount = parseInt(document.getElementById('ai-count-input').value);
    const foodCount = parseInt(document.getElementById('food-count-input').value);
    
    if (worldSize < 500 || worldSize > 5000 || aiCount < 1 || aiCount > 50 || foodCount < 10 || foodCount > 500) {
        alert('Invalid configuration values. Please check the ranges.');
        return;
    }
    
    try {
        const currentConfig = await getConfig();
        const newConfig = {
            ...currentConfig,
            world: { ...currentConfig.world, size: worldSize },
            entities: { ...currentConfig.entities, aiCount, foodCount }
        };
        
        const success = await updateConfig(newConfig);
        if (success) {
            window.location.reload();
        } else {
            alert('Failed to update configuration.');
        }
    } catch (error) {
        console.error('Error applying debug config:', error);
        alert('Error applying configuration changes.');
    }
};
