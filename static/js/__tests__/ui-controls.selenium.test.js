const { createDriver, By, until } = require('./selenium-setup');

describe('UI Controls - Selenium Tests', () => {
  let driver;
  
  beforeAll(async () => {
    driver = await createDriver();
    await driver.get('http://localhost:5000');
    await driver.wait(until.elementLocated(By.id('settings-icon')), 10000);
  }, 15000);

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('settings panel toggles visibility', async () => {
    const settingsIcon = await driver.findElement(By.id('settings-icon'));
    const settingsPanel = await driver.findElement(By.id('settings-panel'));
    
    const initialVisible = await settingsPanel.getAttribute('class');
    expect(initialVisible).not.toContain('visible');
    
    await settingsIcon.click();
    await driver.sleep(100);
    
    const afterClick = await settingsPanel.getAttribute('class');
    expect(afterClick).toContain('visible');
    
    await settingsIcon.click();
    await driver.sleep(100);
    
    const afterSecondClick = await settingsPanel.getAttribute('class');
    expect(afterSecondClick).not.toContain('visible');
  });

  test('dark mode toggle changes theme', async () => {
    const settingsIcon = await driver.findElement(By.id('settings-icon'));
    const settingsPanel = await driver.findElement(By.id('settings-panel'));
    const darkModeToggle = await driver.findElement(By.id('dark-mode-toggle'));
    const documentElement = await driver.findElement(By.tagName('html'));
    
    await settingsIcon.click();
    await driver.sleep(200);
    
    
    const panelClass = await settingsPanel.getAttribute('class');
    const isDisplayed = await settingsPanel.isDisplayed();
    expect(panelClass.includes('visible') || isDisplayed).toBe(true);
    
    const initialTheme = await documentElement.getAttribute('data-theme');
    
    const toggleSlider = await driver.findElement(By.css('#dark-mode-toggle + .toggle-slider'));
    await toggleSlider.click();
    await driver.sleep(200);
    
    const newTheme = await documentElement.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
    
    const storedMode = await driver.executeScript('return localStorage.getItem("darkMode")');
    expect(storedMode).toBeDefined();
  });

  test('settings panel closes when clicking outside', async () => {
    const settingsIcon = await driver.findElement(By.id('settings-icon'));
    const settingsPanel = await driver.findElement(By.id('settings-panel'));
    const gameCanvas = await driver.findElement(By.id('gameCanvas'));
    
    await driver.executeScript('document.getElementById("settings-icon").click()');
    await driver.sleep(200);
    
    const panelClass = await settingsPanel.getAttribute('class');
    expect(panelClass).toContain('visible');
    
    await gameCanvas.click();
    await driver.sleep(200);
    
    const panelHidden = await settingsPanel.getAttribute('class');
    expect(panelHidden).not.toContain('visible');
  }, 10000);

  test('UI elements are properly loaded and accessible', async () => {
    const settingsIcon = await driver.findElement(By.id('settings-icon'));
    const settingsPanel = await driver.findElement(By.id('settings-panel'));
    const darkModeToggle = await driver.findElement(By.id('dark-mode-toggle'));
    const gameCanvas = await driver.findElement(By.id('gameCanvas'));
    
    expect(await settingsIcon.isDisplayed()).toBe(true);
    expect(await gameCanvas.isDisplayed()).toBe(true);
    
    const toggleType = await darkModeToggle.getAttribute('type');
    expect(toggleType).toBe('checkbox');
    
    const panelClass = await settingsPanel.getAttribute('class');
    expect(panelClass).toBeDefined();
  });
});
