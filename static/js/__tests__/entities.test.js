import { splitPlayerCell, handlePlayerSplit, updatePlayer, updateCellMerging, updateAI, initEntities, respawnAI, getUnusedAIName } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, AI_STARTING_SCORE, FOOD_COUNT, AI_COUNT, MERGE_COOLDOWN, WORLD_SIZE } from '../config.js';

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
  getRandomPosition: jest.fn(() => ({ x: 500, y: 500 })),
  getDistance: jest.fn((obj1, obj2) => {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }),
  calculateCenterOfMass: jest.fn((cells) => {
    const totalScore = cells.reduce((sum, cell) => sum + cell.score, 0);
    if (totalScore === 0) return { x: 0, y: 0 };
    return {
      x: cells.reduce((sum, cell) => sum + cell.x * cell.score, 0) / totalScore,
      y: cells.reduce((sum, cell) => sum + cell.y * cell.score, 0) / totalScore
    };
  })
}));

const AI_NAMES = [
  'Cursor',
  'Zed',
  'VSCode',
  'Visual Studio',
  'Eclipse',
  'JetBrains',
  'XCode',
  'Sublime',
  'Neovim',
  'Emacs'
];

describe('splitPlayerCell', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    gameState.aiPlayers = [];
    gameState.food = [];
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
    gameState.aiPlayers = [];
    gameState.food = [];
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
    gameState.aiPlayers = [];
    gameState.food = [];
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

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
    gameState.playerCells = [];
    gameState.food = [];
  });

  test('returns first AI name when no AI players exist', () => {
    const name = getUnusedAIName();
    expect(AI_NAMES).toContain(name);
    expect(name).toBe('Cursor');
  });

  test('returns unused name when some names are taken', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];
    const name = getUnusedAIName();
    expect(name).toBe('VSCode');
  });

  test('returns first name when all names are used', () => {
    gameState.aiPlayers = AI_NAMES.map(name => ({ name }));
    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });
});

describe('updateCellMerging', () => {
  let originalDateNow;

  beforeEach(() => {
    gameState.playerCells = [];
    gameState.aiPlayers = [];
    gameState.food = [];
    originalDateNow = Date.now;
    Date.now = jest.fn(() => 15000);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('merges cells when they are very close and past cooldown', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
  });

  test('does not merge cells during cooldown period', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 10000 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 10000 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('applies attraction force when cells can merge', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 200, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(cell1.velocityX).toBeGreaterThan(0);
    expect(cell2.velocityX).toBeLessThan(0);
  });

  test('applies repulsion when cells are too close but cannot merge', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 10000 };
    const cell2 = { x: 110, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 10000 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(cell1.velocityX).toBeLessThan(0);
    expect(cell2.velocityX).toBeGreaterThan(0);
  });

  test('handles multiple cells merging', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 105, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell3 = { x: 110, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2, cell3];

    updateCellMerging();

    expect(gameState.playerCells.length).toBeLessThan(3);
  });
});

describe('updateAI', () => {
  let originalMathRandom;

  beforeEach(() => {
    gameState.aiPlayers = [];
    gameState.playerCells = [];
    gameState.food = [];
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  test('updates AI positions based on direction and speed', () => {
    Math.random = jest.fn(() => 0.5);
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeGreaterThan(100);
    expect(ai.y).toBe(100);
  });

  test('keeps AI within world boundaries', () => {
    Math.random = jest.fn(() => 0.5);
    const ai = { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
  });

  test('prevents AI from going below zero coordinates', () => {
    Math.random = jest.fn(() => 0.5);
    const ai = { x: 1, y: 1, score: 100, direction: Math.PI };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeGreaterThanOrEqual(0);
  });

  test('changes AI direction randomly', () => {
    Math.random = jest.fn(() => 0.01);
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    const originalDirection = ai.direction;

    updateAI();

    expect(ai.direction).not.toBe(originalDirection);
  });

  test('speed is inversely proportional to size', () => {
    Math.random = jest.fn(() => 0.5);
    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };
    gameState.aiPlayers = [smallAI, largeAI];

    const smallAIStartX = smallAI.x;
    const largeAIStartX = largeAI.x;

    updateAI();

    const smallAIDistance = smallAI.x - smallAIStartX;
    const largeAIDistance = largeAI.x - largeAIStartX;

    expect(smallAIDistance).toBeGreaterThan(largeAIDistance);
  });
});

describe('initEntities', () => {
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    gameState.playerCells = [];
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  test('initializes correct number of food entities', () => {
    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
  });

  test('initializes correct number of AI players', () => {
    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('food entities have required properties', () => {
    initEntities();

    gameState.food.forEach(food => {
      expect(food).toHaveProperty('x');
      expect(food).toHaveProperty('y');
      expect(food).toHaveProperty('color');
      expect(typeof food.x).toBe('number');
      expect(typeof food.y).toBe('number');
      expect(typeof food.color).toBe('string');
    });
  });

  test('AI players have required properties', () => {
    initEntities();

    gameState.aiPlayers.forEach(ai => {
      expect(ai).toHaveProperty('x');
      expect(ai).toHaveProperty('y');
      expect(ai).toHaveProperty('score');
      expect(ai).toHaveProperty('color');
      expect(ai).toHaveProperty('direction');
      expect(ai).toHaveProperty('name');
      expect(ai.score).toBe(AI_STARTING_SCORE);
      expect(typeof ai.direction).toBe('number');
      expect(AI_NAMES).toContain(ai.name);
    });
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1 }];

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('logs initialization information', () => {
    initEntities();

    expect(console.log).toHaveBeenCalledWith('Initializing entities...');
    expect(console.log).toHaveBeenCalledWith('Entities initialized:', {
      foodCount: FOOD_COUNT,
      aiCount: AI_COUNT,
      playerCells: 0
    });
  });
});

describe('respawnAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
    gameState.playerCells = [];
    gameState.food = [];
  });

  test('creates AI with correct properties', () => {
    const ai = respawnAI();

    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
    expect(typeof ai.direction).toBe('number');
    expect(ai.direction).toBeGreaterThanOrEqual(0);
    expect(ai.direction).toBeLessThan(Math.PI * 2);
    expect(AI_NAMES).toContain(ai.name);
  });

  test('returns different AI names when called multiple times', () => {
    const ai1 = respawnAI();
    gameState.aiPlayers.push(ai1);
    const ai2 = respawnAI();

    expect(ai1.name).not.toBe(ai2.name);
  });

  test('color is a valid HSL string', () => {
    const ai = respawnAI();

    expect(ai.color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
  });

  test('position comes from getRandomPosition', () => {
    const ai = respawnAI();

    expect(ai.x).toBe(500);
    expect(ai.y).toBe(500);
  });
});
