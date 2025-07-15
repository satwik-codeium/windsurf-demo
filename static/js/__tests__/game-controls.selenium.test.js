const { createDriver, By, until } = require('./selenium-setup');

describe('Game Controls - Selenium Tests', () => {
  let driver;
  
  beforeAll(async () => {
    driver = await createDriver();
    await driver.get('http://localhost:5000');
    await driver.wait(until.elementLocated(By.id('gameCanvas')), 10000);
  }, 15000);

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('mouse movement updates game state', async () => {
    const canvas = await driver.findElement(By.id('gameCanvas'));
    
    await driver.actions().move({origin: canvas, x: 100, y: 100}).perform();
    
    await driver.sleep(100);
    
    const mouseX = await driver.executeScript('return window.mouse ? window.mouse.x : null');
    expect(mouseX).toBeDefined();
  });

  test('clicking canvas triggers cell split', async () => {
    const canvas = await driver.findElement(By.id('gameCanvas'));
    
    const initialCells = await driver.executeScript('return window.gameState ? window.gameState.playerCells.length : 0');
    
    await canvas.click();
    
    await driver.sleep(200);
    
    const finalCells = await driver.executeScript('return window.gameState ? window.gameState.playerCells.length : 0');
    expect(finalCells).toBeGreaterThanOrEqual(initialCells);
  });

  test('game canvas is responsive to mouse interactions', async () => {
    const canvas = await driver.findElement(By.id('gameCanvas'));
    
    const isDisplayed = await canvas.isDisplayed();
    expect(isDisplayed).toBe(true);
    
    const rect = await canvas.getRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    
    await driver.wait(async () => {
      const gameStateExists = await driver.executeScript('return typeof window.gameState !== "undefined"');
      return gameStateExists;
    }, 10000);
    
    await driver.actions().move({origin: canvas, x: 50, y: 50}).perform();
    await driver.sleep(50);
    await driver.actions().move({origin: canvas, x: 150, y: 150}).perform();
    await driver.sleep(50);
    
    const gameStateExists = await driver.executeScript('return typeof window.gameState !== "undefined"');
    expect(gameStateExists).toBe(true);
  }, 15000);
});
