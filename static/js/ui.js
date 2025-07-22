// UI Controls

function loadDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
    document.getElementById('dark-mode-toggle').checked = isDarkMode;
}

function saveDarkMode(isDarkMode) {
    localStorage.setItem('darkMode', isDarkMode);
}

export function initUI() {
    const settingsPanel = document.getElementById('settings-panel');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsIcon = document.getElementById('settings-icon');

    // Load dark mode preference
    loadDarkMode();

    // Handle settings icon click to toggle checkbox (CSS handles the visual state)
    if (settingsIcon) {
        settingsIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            settingsToggle.checked = !settingsToggle.checked;
        });
    }

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && settingsToggle.checked) {
            settingsToggle.checked = false;
        }
    });

    // Prevent game controls when interacting with settings
    settingsPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle dark mode toggle - sync with localStorage
    darkModeToggle.addEventListener('change', (e) => {
        const isDarkMode = e.target.checked;
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : '');
        saveDarkMode(isDarkMode);
    });
}
