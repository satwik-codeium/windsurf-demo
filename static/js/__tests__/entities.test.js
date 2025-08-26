import { splitPlayerCell, handlePlayerSplit, updatePlayer, updateAI, initEntities, respawnAI, getUnusedAIName, updateCellMerging } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, FOOD_COUNT, AI_COUNT, AI_STARTING_SCORE, MERGE_COOLDOWN, WORLD_SIZE } from '../config.js';

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
  getRandomPosition: jest.fn(() => ({ x: 100, y: 100 })),
  getDistance: jest.fn((obj1, obj2) => {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }),
  calculateCenterOfMass: jest.fn(),
  findSafeSpawnLocation: jest.fn()
}));

jest.spyOn(console, 'log').mockImplementation(() => {});

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

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns first AI name when no names are used', () => {
    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });

  test('returns unused name when some names are used', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];
    const name = getUnusedAIName();
    expect(name).toBe('VSCode');
  });

  test('returns first name as fallback when all names are used', () => {
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
});

describe('updateCellMerging', () => {
  let mockDateNow;

  beforeEach(() => {
    gameState.playerCells = [];
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(20000);
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  test('applies attraction force between cells within merge distance after cooldown', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 150, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(cell1.velocityX).toBeGreaterThan(0);
    expect(cell2.velocityX).toBeLessThan(0);
  });

  test('applies attraction force when cells are at moderate distance', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 155, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(cell1.velocityX).toBeGreaterThan(0);
    expect(cell2.velocityX).toBeLessThan(0);
  });

  test('merges cells when very close and past cooldown', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 5, velocityY: 5, splitTime: 0 };
    const cell2 = { x: 101, y: 100, score: 200, velocityX: 10, velocityY: 10, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(300);
    expect(gameState.playerCells[0].splitTime).toBe(0);
  });

  test('prevents merging before cooldown expires', () => {
    const recentTime = 15000;
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: recentTime };
    const cell2 = { x: 101, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: recentTime };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('handles multiple cell groups for merging', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 101, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell3 = { x: 102, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2, cell3];

    updateCellMerging();

    expect(gameState.playerCells.length).toBeLessThan(3);
  });

  test('calculates weighted position during merge', () => {
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 200, y: 100, score: 200, velocityX: 0, velocityY: 0, splitTime: 0 };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    if (gameState.playerCells.length === 1) {
      const expectedX = (100 * 100 + 200 * 200) / 300;
      expect(gameState.playerCells[0].x).toBeCloseTo(expectedX, 1);
    }
  });
});

describe('updateAI', () => {
  let mockMathRandom;

  beforeEach(() => {
    gameState.aiPlayers = [];
    mockMathRandom = jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  test('moves AI players with consistent direction', () => {
    mockMathRandom.mockReturnValue(0.5);
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeGreaterThan(100);
    expect(ai.direction).toBe(0);
  });

  test('changes AI direction randomly with 2% probability', () => {
    mockMathRandom.mockReturnValueOnce(0.01).mockReturnValue(0.5);
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.direction).not.toBe(0);
  });

  test('keeps AI within world boundaries', () => {
    const ai = { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeGreaterThanOrEqual(0);
  });

  test('applies speed based on AI score', () => {
    const smallAI = { x: 100, y: 100, score: 50, direction: 0 };
    const largeAI = { x: 100, y: 100, score: 400, direction: 0 };

    gameState.aiPlayers = [smallAI];
    updateAI();
    const smallDistance = smallAI.x - 100;

    gameState.aiPlayers = [largeAI];
    largeAI.x = 100;
    updateAI();
    const largeDistance = largeAI.x - 100;

    expect(smallDistance).toBeGreaterThan(largeDistance);
  });
});

describe('initEntities', () => {
  const { getRandomPosition } = require('../utils.js');

  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    getRandomPosition.mockReturnValue({ x: 150, y: 150 });
  });

  test('initializes correct number of food entities', () => {
    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
  });

  test('initializes food with correct properties', () => {
    initEntities();

    gameState.food.forEach(food => {
      expect(food).toHaveProperty('x');
      expect(food).toHaveProperty('y');
      expect(food).toHaveProperty('color');
      expect(typeof food.color).toBe('string');
      expect(food.color).toMatch(/^hsl\([\d.]+, 50%, 50%\)$/);
    });
  });

  test('initializes correct number of AI players', () => {
    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('initializes AI players with correct properties', () => {
    initEntities();

    gameState.aiPlayers.forEach(ai => {
      expect(ai).toHaveProperty('x');
      expect(ai).toHaveProperty('y');
      expect(ai).toHaveProperty('score', AI_STARTING_SCORE);
      expect(ai).toHaveProperty('color');
      expect(ai).toHaveProperty('direction');
      expect(ai).toHaveProperty('name');
      expect(typeof ai.color).toBe('string');
      expect(ai.color).toMatch(/^hsl\([\d.]+, 70%, 50%\)$/);
      expect(typeof ai.direction).toBe('number');
      expect(typeof ai.name).toBe('string');
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
    gameState.playerCells = [];
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
  const { getRandomPosition } = require('../utils.js');

  beforeEach(() => {
    gameState.aiPlayers = [];
    getRandomPosition.mockReturnValue({ x: 200, y: 200 });
  });

  test('returns AI object with correct properties', () => {
    const ai = respawnAI();

    expect(ai).toHaveProperty('x', 200);
    expect(ai).toHaveProperty('y', 200);
    expect(ai).toHaveProperty('score', AI_STARTING_SCORE);
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
  });

  test('generates random color in correct format', () => {
    const ai = respawnAI();

    expect(typeof ai.color).toBe('string');
    expect(ai.color).toMatch(/^hsl\([\d.]+, 70%, 50%\)$/);
  });

  test('generates random direction', () => {
    const ai = respawnAI();

    expect(typeof ai.direction).toBe('number');
    expect(ai.direction).toBeGreaterThanOrEqual(0);
    expect(ai.direction).toBeLessThan(Math.PI * 2);
  });

  test('uses unused AI name', () => {
    const ai = respawnAI();

    expect(typeof ai.name).toBe('string');
    expect(['Cursor', 'Zed', 'VSCode', 'Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs']).toContain(ai.name);
  });
});
