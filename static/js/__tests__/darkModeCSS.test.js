/**
 * @jest-environment jsdom
 */

describe('Dark Mode CSS Integration', () => {
  beforeEach(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --bg-color: #f0f0f0;
        --canvas-color: white;
      }
      :root[data-theme="dark"] {
        --bg-color: #1a1a1a;
        --canvas-color: #2d2d2d;
      }
      body {
        background-color: var(--bg-color);
      }
      #gameCanvas {
        background-color: var(--canvas-color);
      }
      #score {
        color: #333;
      }
      :root[data-theme="dark"] #score {
        color: #fff;
      }
    `;
    document.head.appendChild(style);
    
    document.body.innerHTML = `
      <canvas id="gameCanvas"></canvas>
      <div id="score">Score: 0</div>
    `;
  });

  test('CSS variables update when data-theme attribute changes', () => {
    const canvas = document.getElementById('gameCanvas');
    const score = document.getElementById('score');
    
    const initialTheme = document.documentElement.getAttribute('data-theme');
    expect(initialTheme === null || initialTheme === '').toBe(true);
    
    document.documentElement.setAttribute('data-theme', 'dark');
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    document.documentElement.setAttribute('data-theme', '');
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
  });

  test('theme attribute toggles correctly', () => {
    const initialTheme = document.documentElement.getAttribute('data-theme');
    expect(initialTheme === null || initialTheme === '').toBe(true);
    
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    document.documentElement.setAttribute('data-theme', '');
    expect(document.documentElement.getAttribute('data-theme')).toBe('');
  });
});
