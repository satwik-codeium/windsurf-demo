import { 
  splitPlayerCell, 
  handlePlayerSplit, 
  updatePlayer, 
  updateAI, 
  initEntities, 
  respawnAI,
  getUnusedAIName,
  updateCellMerging
} from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { 
  MIN_SPLIT_SCORE, 
  MAX_PLAYER_CELLS, 
  FOOD_COUNT, 
  AI_COUNT, 
  AI_STARTING_SCORE,
  MERGE_COOLDOWN,
  MERGE_DISTANCE,
  MERGE_FORCE,
  MERGE_START_FORCE,
  WORLD_SIZE
} from '../config.js';

// Mock gameState and mouse
jest.mock('../gameState.js', () => ({
  gameState: {
    playerCells: [],
    food: [],
    aiPlayers: []
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

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns first available name when no AI players exist', () => {
    const name = getUnusedAIName();
    expect(['Cursor', 'Zed', 'VSCode', 'Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs']).toContain(name);
  });

  test('returns unused name when some names are taken', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];
    
    const name = getUnusedAIName();
    expect(name).not.toBe('Cursor');
    expect(name).not.toBe('Zed');
    expect(['VSCode', 'Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs']).toContain(name);
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
  let dateNowSpy;

  beforeEach(() => {
    gameState.playerCells = [];
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  test('merges cells when close and past cooldown', () => {
    const now = 15000;
    dateNowSpy.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 }
    ];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
  });

  test('does not merge cells during cooldown period', () => {
    const now = 5000;
    dateNowSpy.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now - 5000 },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: now - 5000 }
    ];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('applies attraction force between cells past cooldown', () => {
    const now = 15000;
    dateNowSpy.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 },
      { x: 200, y: 200, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 }
    ];

    const initialVelocity1X = gameState.playerCells[0].velocityX;
    const initialVelocity1Y = gameState.playerCells[0].velocityY;

    updateCellMerging();

    expect(gameState.playerCells[0].velocityX).not.toBe(initialVelocity1X);
    expect(gameState.playerCells[0].velocityY).not.toBe(initialVelocity1Y);
  });

  test('applies repulsion when cells are too close', () => {
    const now = 5000;
    dateNowSpy.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now - 1000 },
      { x: 101, y: 101, score: 100, velocityX: 0, velocityY: 0, splitTime: now - 1000 }
    ];

    updateCellMerging();

    expect(gameState.playerCells[0].velocityX).toBeLessThan(0);
    expect(gameState.playerCells[0].velocityY).toBeLessThan(0);
    expect(gameState.playerCells[1].velocityX).toBeGreaterThan(0);
    expect(gameState.playerCells[1].velocityY).toBeGreaterThan(0);
  });

  test('calculates weighted position for merged cells', () => {
    const now = 15000;
    dateNowSpy.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 200, velocityX: 1, velocityY: 1, splitTime: 0 },
      { x: 110, y: 110, score: 100, velocityX: 2, velocityY: 2, splitTime: 0 }
    ];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    const mergedCell = gameState.playerCells[0];
    expect(mergedCell.score).toBe(300);
    expect(mergedCell.x).toBeCloseTo(103.33, 1);
    expect(mergedCell.y).toBeCloseTo(103.33, 1);
  });
});

describe('updateAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
    jest.spyOn(Math, 'random').mockRestore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('updates AI direction randomly', () => {
    const mockRandom = jest.spyOn(Math, 'random');
    mockRandom.mockReturnValueOnce(0.01);

    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    const originalDirection = ai.direction;
    updateAI();

    expect(ai.direction).not.toBe(originalDirection);
  });

  test('does not update direction when random value is high', () => {
    const mockRandom = jest.spyOn(Math, 'random');
    mockRandom.mockReturnValueOnce(0.5);

    const ai = { x: 100, y: 100, score: 100, direction: 1.5 };
    gameState.aiPlayers = [ai];

    const originalDirection = ai.direction;
    updateAI();

    expect(ai.direction).toBe(originalDirection);
  });

  test('moves AI based on direction and speed', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    const originalX = ai.x;
    updateAI();

    expect(ai.x).toBeGreaterThan(originalX);
  });

  test('constrains AI movement within world boundaries', () => {
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
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };

    gameState.aiPlayers = [smallAI];
    updateAI();
    const smallAIDistance = smallAI.x - 100;

    gameState.aiPlayers = [largeAI];
    updateAI();
    const largeAIDistance = largeAI.x - 200;

    expect(smallAIDistance).toBeGreaterThan(largeAIDistance);
  });
});

describe('initEntities', () => {
  let consoleLogSpy;

  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
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
    });
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1, color: 'red' }];
    gameState.aiPlayers = [{ x: 1, y: 1, score: 100 }];

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('logs initialization information', () => {
    initEntities();

    expect(consoleLogSpy).toHaveBeenCalledWith('Initializing entities...');
    expect(consoleLogSpy).toHaveBeenCalledWith('Entities initialized:', {
      foodCount: FOOD_COUNT,
      aiCount: AI_COUNT,
      playerCells: gameState.playerCells.length
    });
  });
});

describe('respawnAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns AI object with required properties', () => {
    const ai = respawnAI();

    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score');
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
  });

  test('sets correct starting score', () => {
    const ai = respawnAI();

    expect(ai.score).toBe(AI_STARTING_SCORE);
  });

  test('assigns valid AI name', () => {
    const ai = respawnAI();
    const validNames = ['Cursor', 'Zed', 'VSCode', 'Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs'];

    expect(validNames).toContain(ai.name);
  });

  test('generates random position using getRandomPosition', () => {
    const ai = respawnAI();

    expect(ai.x).toBe(100);
    expect(ai.y).toBe(100);
  });

  test('generates random direction between 0 and 2π', () => {
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    
    const ai = respawnAI();

    expect(ai.direction).toBeCloseTo(Math.PI, 2);
    
    mockRandom.mockRestore();
  });

  test('generates color string', () => {
    const ai = respawnAI();

    expect(typeof ai.color).toBe('string');
    expect(ai.color).toMatch(/^hsl\([\d.]+, 70%, 50%\)$/);
  });
});
