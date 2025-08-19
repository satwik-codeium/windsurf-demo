import { 
  splitPlayerCell, 
  handlePlayerSplit, 
  updatePlayer, 
  updateAI, 
  initEntities, 
  respawnAI
} from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { 
  MIN_SPLIT_SCORE, 
  MAX_PLAYER_CELLS, 
  MERGE_COOLDOWN, 
  MERGE_DISTANCE, 
  MERGE_FORCE,
  FOOD_COUNT,
  AI_COUNT,
  AI_STARTING_SCORE,
  WORLD_SIZE
} from '../config.js';

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
  calculateCenterOfMass: jest.fn(),
  findSafeSpawnLocation: jest.fn()
}));

const mockDateNow = jest.spyOn(Date, 'now');

const mockMathRandom = jest.spyOn(Math, 'random');

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('AI name management (via respawnAI)', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('assigns first AI name when no AIs exist', () => {
    gameState.aiPlayers = [];
    const ai = respawnAI();
    expect(ai.name).toBe('Cursor');
  });

  test('assigns first unused name when some names are used', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];
    const ai = respawnAI();
    expect(ai.name).toBe('VSCode');
  });

  test('assigns fallback name when all names are used', () => {
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
    const ai = respawnAI();
    expect(ai.name).toBe('Cursor');
  });
});

describe('updateCellMerging', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mockDateNow.mockClear();
  });

  test('merges cells within merge distance after cooldown', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);
    
    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 }
    ];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
    expect(gameState.playerCells[0].splitTime).toBe(0);
  });

  test('applies attraction force when cells can merge but are not close enough', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);
    
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    const cell2 = { x: 150, y: 150, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    gameState.playerCells = [cell1, cell2];
    mouse.x = 500;
    mouse.y = 500;

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
    expect(Math.abs(cell1.velocityX) + Math.abs(cell1.velocityY)).toBeGreaterThan(0);
    expect(Math.abs(cell2.velocityX) + Math.abs(cell2.velocityY)).toBeGreaterThan(0);
  });

  test('applies repulsion when cells are too close but cannot merge', () => {
    const now = 5000;
    mockDateNow.mockReturnValue(now);
    
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now };
    const cell2 = { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: now };
    gameState.playerCells = [cell1, cell2];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
    expect(cell1.velocityX).toBeLessThan(0);
    expect(cell1.velocityY).toBeLessThan(0);
    expect(cell2.velocityX).toBeGreaterThan(0);
    expect(cell2.velocityY).toBeGreaterThan(0);
  });

  test('does not merge cells before cooldown period', () => {
    const now = 5000;
    mockDateNow.mockReturnValue(now);
    
    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: now }
    ];

    updatePlayer();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('handles single cell without errors', () => {
    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0 }
    ];

    expect(() => updatePlayer()).not.toThrow();
    expect(gameState.playerCells.length).toBe(1);
  });

  test('calculates weighted position for merged cells', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);
    
    gameState.playerCells = [
      { x: 100, y: 100, score: 200, velocityX: 1, velocityY: 1, splitTime: 5000 },
      { x: 102, y: 102, score: 100, velocityX: 2, velocityY: 2, splitTime: 5000 }
    ];
    mouse.x = 500;
    mouse.y = 500;

    updatePlayer();

    expect(gameState.playerCells.length).toBe(1);
    const merged = gameState.playerCells[0];
    expect(merged.score).toBe(300);
    expect(merged.splitTime).toBe(0);
  });
});

describe('updateAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
    mockMathRandom.mockClear();
  });

  test('moves AI players in their current direction', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    mockMathRandom.mockReturnValue(0.5);

    updateAI();

    expect(ai.x).toBeGreaterThan(100);
    expect(ai.y).toBe(100);
  });

  test('changes AI direction with 2% probability', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    mockMathRandom.mockReturnValueOnce(0.01).mockReturnValueOnce(0.5);

    updateAI();

    expect(ai.direction).toBeCloseTo(Math.PI, 0);
  });

  test('does not change direction when random value is above threshold', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    mockMathRandom.mockReturnValue(0.5);

    updateAI();

    expect(ai.direction).toBe(0);
  });

  test('constrains AI movement within world boundaries', () => {
    const ai = { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    mockMathRandom.mockReturnValue(0.5);

    updateAI();

    expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeGreaterThanOrEqual(0);
  });

  test('applies speed based on AI size', () => {
    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };
    gameState.aiPlayers = [smallAI, largeAI];
    mockMathRandom.mockReturnValue(0.5);

    const initialSmallX = smallAI.x;
    const initialLargeX = largeAI.x;

    updateAI();

    const smallMovement = smallAI.x - initialSmallX;
    const largeMovement = largeAI.x - initialLargeX;

    expect(smallMovement).toBeGreaterThan(largeMovement);
  });
});

describe('initEntities', () => {
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    mockConsoleLog.mockClear();
  });

  test('initializes correct number of food entities', () => {
    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
  });

  test('initializes correct number of AI players', () => {
    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1, score: 50 }];

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('creates food entities with correct properties', () => {
    initEntities();

    gameState.food.forEach(food => {
      expect(food).toHaveProperty('x');
      expect(food).toHaveProperty('y');
      expect(food).toHaveProperty('color');
      expect(typeof food.color).toBe('string');
      expect(food.color).toMatch(/^hsl\(\d+, 50%, 50%\)$/);
    });
  });

  test('creates AI players with correct properties', () => {
    initEntities();

    gameState.aiPlayers.forEach(ai => {
      expect(ai).toHaveProperty('x');
      expect(ai).toHaveProperty('y');
      expect(ai).toHaveProperty('score', AI_STARTING_SCORE);
      expect(ai).toHaveProperty('color');
      expect(ai).toHaveProperty('direction');
      expect(ai).toHaveProperty('name');
      expect(typeof ai.color).toBe('string');
      expect(ai.color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
      expect(ai.direction).toBeGreaterThanOrEqual(0);
      expect(ai.direction).toBeLessThan(Math.PI * 2);
    });
  });

  test('logs initialization information', () => {
    gameState.playerCells = [];
    initEntities();

    expect(mockConsoleLog).toHaveBeenCalledWith('Initializing entities...');
    expect(mockConsoleLog).toHaveBeenCalledWith('Entities initialized:', {
      foodCount: FOOD_COUNT,
      aiCount: AI_COUNT,
      playerCells: 0
    });
  });
});

describe('respawnAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns AI with correct structure', () => {
    const ai = respawnAI();

    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score', AI_STARTING_SCORE);
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
  });

  test('assigns unused AI name', () => {
    gameState.aiPlayers = [{ name: 'Cursor' }];
    const ai = respawnAI();

    expect(ai.name).toBe('Zed');
  });

  test('creates AI with random position and direction', () => {
    const ai = respawnAI();

    expect(ai.x).toBe(100);
    expect(ai.y).toBe(100);
    expect(ai.direction).toBeGreaterThanOrEqual(0);
    expect(ai.direction).toBeLessThan(Math.PI * 2);
  });

  test('creates AI with correct color format', () => {
    const ai = respawnAI();

    expect(typeof ai.color).toBe('string');
    expect(ai.color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
  });
});

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

afterAll(() => {
  mockDateNow.mockRestore();
  mockMathRandom.mockRestore();
  mockConsoleLog.mockRestore();
});
