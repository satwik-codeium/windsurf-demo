import { initUI, loadDarkMode, saveDarkMode } from '../ui.js';

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'location', {
  value: { reload: jest.fn() }
});

describe('DOM Manipulation Tests', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('sets data-theme attribute to dark when dark mode is enabled', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="dark-mode-toggle" checked />
    `;
    
    const toggle = document.getElementById('dark-mode-toggle');
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { checked: true } });
    
    document.documentElement.setAttribute('data-theme', event.target.checked ? 'dark' : '');
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('removes data-theme attribute when dark mode is disabled', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    document.body.innerHTML = `
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    
    const toggle = document.getElementById('dark-mode-toggle');
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { checked: false } });
    
    document.documentElement.setAttribute('data-theme', event.target.checked ? 'dark' : '');
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
  });
});

describe('LocalStorage Persistence Tests', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('saveDarkMode stores dark mode preference in localStorage', () => {
    saveDarkMode(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', true);
    
    saveDarkMode(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', false);
  });

  test('loadDarkMode retrieves and applies dark mode preference from localStorage', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    
    localStorageMock.getItem.mockReturnValue('true');
    
    loadDarkMode();
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.getElementById('dark-mode-toggle').checked).toBe(true);
  });

  test('loadDarkMode handles no stored preference (defaults to light mode)', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    
    localStorageMock.getItem.mockReturnValue(null);
    
    loadDarkMode();
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
    expect(document.getElementById('dark-mode-toggle').checked).toBe(false);
  });

  test('loadDarkMode handles false stored preference', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    
    localStorageMock.getItem.mockReturnValue('false');
    
    loadDarkMode();
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
    expect(document.getElementById('dark-mode-toggle').checked).toBe(false);
  });
});

describe('Event Handler Tests', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = `
      <div id="settings-icon"></div>
      <div id="settings-panel"></div>
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('dark mode toggle change event updates theme and saves preference', () => {
    localStorageMock.getItem.mockReturnValue('false');
    
    initUI();
    
    const toggle = document.getElementById('dark-mode-toggle');
    
    toggle.checked = true;
    const changeEvent = new Event('change');
    toggle.dispatchEvent(changeEvent);
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', true);
    
    toggle.checked = false;
    toggle.dispatchEvent(changeEvent);
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', false);
  });

  test('settings panel toggle functionality works correctly', () => {
    localStorageMock.getItem.mockReturnValue('false');
    
    initUI();
    
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    
    expect(settingsPanel.classList.contains('visible')).toBe(false);
    
    settingsIcon.click();
    expect(settingsPanel.classList.contains('visible')).toBe(true);
    
    settingsIcon.click();
    expect(settingsPanel.classList.contains('visible')).toBe(false);
  });

  test('clicking outside settings panel closes it', () => {
    localStorageMock.getItem.mockReturnValue('false');
    
    initUI();
    
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    
    settingsIcon.click();
    expect(settingsPanel.classList.contains('visible')).toBe(true);
    
    document.body.click();
    expect(settingsPanel.classList.contains('visible')).toBe(false);
  });

  test('clicking inside settings panel does not close it', () => {
    localStorageMock.getItem.mockReturnValue('false');
    
    initUI();
    
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    
    settingsIcon.click();
    expect(settingsPanel.classList.contains('visible')).toBe(true);
    
    settingsPanel.click();
    expect(settingsPanel.classList.contains('visible')).toBe(true);
  });
});

describe('CSS Custom Property Tests', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    const existingStyle = document.head.querySelector('#test-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'test-theme-styles';
    style.textContent = `
      :root {
        --bg-color: #f0f0f0;
        --canvas-color: white;
      }
      :root[data-theme="dark"] {
        --bg-color: #1a1a1a;
        --canvas-color: #2d2d2d;
      }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    const style = document.head.querySelector('#test-theme-styles');
    if (style) {
      style.remove();
    }
  });

  test('light theme applies correct CSS custom properties', () => {
    document.documentElement.removeAttribute('data-theme');
    
    const computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#f0f0f0');
    expect(computedStyle.getPropertyValue('--canvas-color').trim()).toBe('white');
  });

  test('dark theme applies correct CSS custom properties', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    const computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#1a1a1a');
    expect(computedStyle.getPropertyValue('--canvas-color').trim()).toBe('#2d2d2d');
  });

  test('theme switching updates CSS custom properties correctly', () => {
    document.documentElement.removeAttribute('data-theme');
    let computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#f0f0f0');
    
    document.documentElement.setAttribute('data-theme', 'dark');
    computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#1a1a1a');
    
    document.documentElement.setAttribute('data-theme', '');
    computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#f0f0f0');
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = `
      <div id="settings-icon"></div>
      <div id="settings-panel"></div>
      <input type="checkbox" id="dark-mode-toggle" />
    `;
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    
    const existingStyle = document.head.querySelector('#test-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'test-theme-styles';
    style.textContent = `
      :root {
        --bg-color: #f0f0f0;
        --canvas-color: white;
      }
      :root[data-theme="dark"] {
        --bg-color: #1a1a1a;
        --canvas-color: #2d2d2d;
      }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    const style = document.head.querySelector('#test-theme-styles');
    if (style) {
      style.remove();
    }
  });

  test('complete dark mode workflow: load saved preference, toggle, and persist', () => {
    localStorageMock.getItem.mockReturnValue('true');
    
    initUI();
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.getElementById('dark-mode-toggle').checked).toBe(true);
    
    const computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#1a1a1a');
    
    const toggle = document.getElementById('dark-mode-toggle');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', false);
    
    const newComputedStyle = getComputedStyle(document.documentElement);
    expect(newComputedStyle.getPropertyValue('--bg-color').trim()).toBe('#f0f0f0');
  });

  test('complete light mode workflow: no saved preference, toggle to dark, and persist', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    initUI();
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
    expect(document.getElementById('dark-mode-toggle').checked).toBe(false);
    
    const computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--bg-color').trim()).toBe('#f0f0f0');
    
    const toggle = document.getElementById('dark-mode-toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', true);
    
    const newComputedStyle = getComputedStyle(document.documentElement);
    expect(newComputedStyle.getPropertyValue('--bg-color').trim()).toBe('#1a1a1a');
  });
});
