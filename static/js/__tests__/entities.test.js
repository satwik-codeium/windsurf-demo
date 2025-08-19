import { splitPlayerCell, handlePlayerSplit, updatePlayer, updateAI, initEntities, respawnAI, getUnusedAIName } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, FOOD_COUNT, AI_COUNT, AI_STARTING_SCORE, MERGE_COOLDOWN, MERGE_DISTANCE, MERGE_FORCE, WORLD_SIZE } from '../config.js';

// Mock gameState and mouse
jest.mock('../gameState.js', () => ({
  gameState: {
    playerCells: [],
    aiPlayers: [],
    food: []
  },
  mouse: { x: 0, y: 0 }
}));

jest.mock('../utils.js', () => ({
  getSize: jest.fn((score) => Math.sqrt(score) + 20),
  getDistance: jest.fn((obj1, obj2) => {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }),
  getRandomPosition: jest.fn(() => ({ x: 100, y: 100 })),
  calculateCenterOfMass: jest.fn()
}));

describe('splitPlayerCell', () => {
  beforeEach(() => {
    gameState.playerCells = [];
  });

  test('does not split cell below minimum score', () => {
    const cell = { x: 100, y: 100, score: MIN_SPLIT_SCORE - 1 };
    gameState.playerCells = [cell];

    splitPlayerCell(cell);

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(MIN_SPLIT_SCORE - 1);
  });

  test('splits cell with sufficient score', () => {
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = [cell];

    splitPlayerCell(cell);

    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].score).toBe(50);
    expect(gameState.playerCells[1].score).toBe(50);
  });

  test('does not split when at max cells', () => {
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = Array(MAX_PLAYER_CELLS).fill({ ...cell });

    splitPlayerCell(cell);

    expect(gameState.playerCells.length).toBe(MAX_PLAYER_CELLS);
  });
});

describe('handlePlayerSplit', () => {
  beforeEach(() => {
    gameState.playerCells = [];
  });

  test('splits all eligible cells', () => {
    gameState.playerCells = [
      { x: 100, y: 100, score: 100 },
      { x: 200, y: 200, score: MIN_SPLIT_SCORE - 1 },
      { x: 300, y: 300, score: 100 }
    ];

    handlePlayerSplit();

    expect(gameState.playerCells.length).toBe(5);  // 2 split + 1 unchanged
  });
});

describe('updatePlayer', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 0;
    mouse.y = 0;
  });

  test('moves player cells towards mouse', () => {
    const cell = { 
      x: 0, 
      y: 0, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0 
    };
    gameState.playerCells = [cell];
    
    // Set mouse far to the right and run multiple updates to overcome inertia
    mouse.x = 1000;
    mouse.y = 0;
    
    // Run multiple updates to overcome initial inertia
    for (let i = 0; i < 5; i++) {
      updatePlayer();
    }

    expect(gameState.playerCells[0].velocityX).toBeGreaterThan(0);  // Should move right
  });

  test('applies speed based on cell size', () => {
    const smallCell = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0 };
    const largeCell = { x: 100, y: 100, score: 400, velocityX: 0, velocityY: 0 };

    // Test small cell
    gameState.playerCells = [smallCell];
    mouse.x = 200;
    updatePlayer();
    const smallCellSpeed = Math.abs(gameState.playerCells[0].velocityX);

    // Test large cell
    gameState.playerCells = [largeCell];
    mouse.x = 200;
    updatePlayer();
    const largeCellSpeed = Math.abs(gameState.playerCells[0].velocityX);

    expect(smallCellSpeed).toBeGreaterThan(largeCellSpeed);  // Smaller cells move faster
  });
});

describe('updateCellMerging', () => {
  let originalDateNow;
  
  beforeEach(() => {
    gameState.playerCells = [];
    originalDateNow = Date.now;
    Date.now = jest.fn(() => 20000);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('merges cells when close enough and cooldown expired', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
    expect(gameState.playerCells[0].splitTime).toBe(0);
  });

  test('applies attraction force when cells can merge but not close enough', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    const cell2 = { x: 200, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].velocityX).toBeGreaterThan(0);
    expect(gameState.playerCells[1].velocityX).toBeLessThan(0);
  });

  test('applies repulsion force when cells too close but cannot merge yet', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 15000 };
    const cell2 = { x: 110, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 15000 };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].velocityX).toBeLessThan(0);
    expect(gameState.playerCells[1].velocityX).toBeGreaterThan(0);
  });

  test('does not merge cells during cooldown period', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 15000 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 15000 };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('calculates weighted position and velocity for merged cells', () => {
    const cell1 = { x: 100, y: 100, score: 200, velocityX: 2, velocityY: 0, splitTime: 5000 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: -1, velocityY: 0, splitTime: 5000 };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(1);
    const merged = gameState.playerCells[0];
    expect(merged.score).toBe(300);
    expect(merged.x).toBeGreaterThan(100);
    expect(merged.x).toBeLessThan(105);
    expect(merged.velocityX).toBeCloseTo(1, 0);
  });

  test('handles single cell without errors', () => {
    const cell = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0 };
    gameState.playerCells = [cell];

    expect(() => updatePlayer()).not.toThrow();
    expect(gameState.playerCells.length).toBe(1);
  });

  test('handles empty cell array without errors', () => {
    gameState.playerCells = [];

    expect(() => updatePlayer()).not.toThrow();
    expect(gameState.playerCells.length).toBe(0);
  });
});

describe('updateAI', () => {
  let originalMathRandom;

  beforeEach(() => {
    gameState.aiPlayers = [];
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  test('changes AI direction with 2% probability', () => {
    Math.random = jest.fn()
      .mockReturnValueOnce(0.01)
      .mockReturnValue(1.5);

    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.direction).toBe(1.5 * Math.PI * 2);
  });

  test('does not change direction when random value above threshold', () => {
    Math.random = jest.fn().mockReturnValue(0.03);

    const ai = { x: 100, y: 100, score: 100, direction: 1.0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.direction).toBe(1.0);
  });

  test('moves AI based on direction and speed', () => {
    Math.random = jest.fn().mockReturnValue(0.5);

    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeGreaterThan(100);
    expect(ai.y).toBe(100);
  });

  test('constrains AI position within world boundaries', () => {
    Math.random = jest.fn().mockReturnValue(0.5);

    const ai1 = { x: -10, y: 100, score: 100, direction: Math.PI };
    const ai2 = { x: WORLD_SIZE + 10, y: 100, score: 100, direction: 0 };
    const ai3 = { x: 100, y: -10, score: 100, direction: Math.PI * 1.5 };
    const ai4 = { x: 100, y: WORLD_SIZE + 10, score: 100, direction: Math.PI * 0.5 };
    gameState.aiPlayers = [ai1, ai2, ai3, ai4];

    updateAI();

    expect(ai1.x).toBe(0);
    expect(ai2.x).toBe(WORLD_SIZE);
    expect(ai3.y).toBe(0);
    expect(ai4.y).toBe(WORLD_SIZE);
  });

  test('calculates speed based on AI score', () => {
    Math.random = jest.fn().mockReturnValue(0.5);

    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 100, score: 400, direction: 0 };
    gameState.aiPlayers = [smallAI, largeAI];

    const initialSmallX = smallAI.x;
    const initialLargeX = largeAI.x;

    updateAI();

    const smallDistance = smallAI.x - initialSmallX;
    const largeDistance = largeAI.x - initialLargeX;

    expect(smallDistance).toBeGreaterThan(largeDistance);
  });

  test('handles empty AI array without errors', () => {
    gameState.aiPlayers = [];

    expect(() => updateAI()).not.toThrow();
  });
});

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns first AI name when no AIs exist', () => {
    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });

  test('returns first unused name when some names are taken', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];

    const name = getUnusedAIName();
    expect(name).toBe('VSCode');
  });

  test('returns first name when all names are used', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' },
      { name: 'VSCode' },
      { name: 'Visual Studio' },
      { name: 'Eclipse' },
      { name: 'JetBrains' },
      { name: 'XCode' },
      { name: 'Sublime' },
      { name: 'Neovim' },
      { name: 'Emacs' }
    ];

    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });

  test('returns correct unused name from middle of array', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'VSCode' },
      { name: 'Eclipse' }
    ];

    const name = getUnusedAIName();
    expect(name).toBe('Zed');
  });
});

describe('initEntities', () => {
  let originalConsoleLog;
  let mockGetRandomPosition;

  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    gameState.playerCells = [{ x: 1000, y: 1000, score: 100 }];
    originalConsoleLog = console.log;
    console.log = jest.fn();
    
    const { getRandomPosition } = require('../utils.js');
    mockGetRandomPosition = getRandomPosition;
    mockGetRandomPosition.mockReturnValue({ x: 150, y: 150 });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1, name: 'Test' }];

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('creates correct number of food entities', () => {
    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    // getRandomPosition is called for each food and AI entity
    expect(mockGetRandomPosition).toHaveBeenCalled();
  });

  test('creates food with random positions and colors', () => {
    initEntities();

    gameState.food.forEach(food => {
      expect(food.x).toBe(150);
      expect(food.y).toBe(150);
      expect(food.color).toMatch(/^hsl\(\d+(\.\d+)?, 50%, 50%\)$/);
    });
  });

  test('creates correct number of AI players', () => {
    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('creates AI players with correct properties', () => {
    initEntities();

    gameState.aiPlayers.forEach(ai => {
      expect(ai.x).toBe(150);
      expect(ai.y).toBe(150);
      expect(ai.score).toBe(AI_STARTING_SCORE);
      expect(ai.color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
      expect(typeof ai.direction).toBe('number');
      expect(ai.direction).toBeGreaterThanOrEqual(0);
      expect(ai.direction).toBeLessThan(Math.PI * 2);
      expect(typeof ai.name).toBe('string');
    });
  });

  test('assigns unique names to AI players', () => {
    initEntities();

    const names = gameState.aiPlayers.map(ai => ai.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(Math.min(AI_COUNT, 10));
  });

  test('logs initialization information', () => {
    initEntities();

    expect(console.log).toHaveBeenCalledWith('Initializing entities...');
    expect(console.log).toHaveBeenCalledWith('Entities initialized:', {
      foodCount: FOOD_COUNT,
      aiCount: AI_COUNT,
      playerCells: 1
    });
  });
});

describe('respawnAI', () => {
  let mockGetRandomPosition;

  beforeEach(() => {
    gameState.aiPlayers = [];
    const { getRandomPosition } = require('../utils.js');
    mockGetRandomPosition = getRandomPosition;
    mockGetRandomPosition.mockReturnValue({ x: 200, y: 300 });
  });

  test('returns AI object with correct structure', () => {
    const ai = respawnAI();

    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score');
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
  });

  test('uses random position from getRandomPosition', () => {
    const ai = respawnAI();

    expect(ai.x).toBe(200);
    expect(ai.y).toBe(300);
    expect(mockGetRandomPosition).toHaveBeenCalled();
  });

  test('sets correct starting score', () => {
    const ai = respawnAI();

    expect(ai.score).toBe(AI_STARTING_SCORE);
  });

  test('generates random color in correct format', () => {
    const ai = respawnAI();

    expect(ai.color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
  });

  test('generates random direction within valid range', () => {
    const ai = respawnAI();

    expect(typeof ai.direction).toBe('number');
    expect(ai.direction).toBeGreaterThanOrEqual(0);
    expect(ai.direction).toBeLessThan(Math.PI * 2);
  });

  test('assigns unused AI name', () => {
    const ai = respawnAI();

    expect(ai.name).toBe('Cursor');
  });

  test('assigns different name when first is taken', () => {
    gameState.aiPlayers = [{ name: 'Cursor' }];

    const ai = respawnAI();

    expect(ai.name).toBe('Zed');
  });
});
