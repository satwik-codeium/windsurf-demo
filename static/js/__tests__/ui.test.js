import { initUI } from '../ui.js';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Dark Mode Functionality', () => {
  let settingsIcon, settingsPanel, darkModeToggle;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    
    document.body.innerHTML = `
      <div id="settings-icon"></div>
      <div id="settings-panel">
        <input type="checkbox" id="dark-mode-toggle">
      </div>
    `;
    
    settingsIcon = document.getElementById('settings-icon');
    settingsPanel = document.getElementById('settings-panel');
    darkModeToggle = document.getElementById('dark-mode-toggle');
    
    jest.clearAllMocks();
  });

  describe('loadDarkMode function', () => {
    test('applies dark theme when localStorage has darkMode=true', () => {
      localStorage.setItem('darkMode', 'true');
      
      initUI();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(darkModeToggle.checked).toBe(true);
    });

    test('applies light theme when localStorage has darkMode=false', () => {
      localStorage.setItem('darkMode', 'false');
      
      initUI();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('');
      expect(darkModeToggle.checked).toBe(false);
    });

    test('defaults to light theme when no localStorage preference exists', () => {
      initUI();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('');
      expect(darkModeToggle.checked).toBe(false);
    });
  });

  describe('saveDarkMode function', () => {
    test('saves dark mode preference to localStorage when toggled on', () => {
      initUI();
      
      darkModeToggle.checked = true;
      darkModeToggle.dispatchEvent(new Event('change'));
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('saves light mode preference to localStorage when toggled off', () => {
      localStorage.setItem('darkMode', 'true');
      initUI();
      
      darkModeToggle.checked = false;
      darkModeToggle.dispatchEvent(new Event('change'));
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('');
    });
  });

  describe('Settings Panel Interaction', () => {
    test('settings panel toggles visibility on icon click', () => {
      initUI();
      
      settingsIcon.click();
      expect(settingsPanel.classList.contains('visible')).toBe(true);
      
      settingsIcon.click();
      expect(settingsPanel.classList.contains('visible')).toBe(false);
    });

    test('settings panel closes when clicking outside', () => {
      initUI();
      
      settingsIcon.click();
      expect(settingsPanel.classList.contains('visible')).toBe(true);
      
      document.body.click();
      expect(settingsPanel.classList.contains('visible')).toBe(false);
    });

    test('settings panel stays open when clicking inside', () => {
      initUI();
      
      settingsIcon.click();
      expect(settingsPanel.classList.contains('visible')).toBe(true);
      
      settingsPanel.click();
      expect(settingsPanel.classList.contains('visible')).toBe(true);
    });
  });

  describe('Dark Mode Toggle Integration', () => {
    test('dark mode toggle works within settings panel workflow', () => {
      initUI();
      
      settingsIcon.click();
      expect(settingsPanel.classList.contains('visible')).toBe(true);
      
      darkModeToggle.checked = true;
      darkModeToggle.dispatchEvent(new Event('change'));
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', true);
      
      expect(settingsPanel.classList.contains('visible')).toBe(true);
    });

    test('dark mode persists across UI reinitializations', () => {
      initUI();
      darkModeToggle.checked = true;
      darkModeToggle.dispatchEvent(new Event('change'));
      
      document.documentElement.removeAttribute('data-theme');
      darkModeToggle.checked = false;
      
      initUI();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(darkModeToggle.checked).toBe(true);
    });
  });
});
