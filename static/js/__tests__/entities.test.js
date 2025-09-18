import { splitPlayerCell, handlePlayerSplit, updatePlayer, getUnusedAIName, updateAI, initEntities, respawnAI, updateCellMerging } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, WORLD_SIZE, AI_COUNT, FOOD_COUNT, AI_STARTING_SCORE, MERGE_COOLDOWN } from '../config.js';
import { getRandomPosition, getSize, getDistance } from '../utils.js';

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
  getRandomPosition: jest.fn(),
  getSize: jest.fn(),
  getDistance: jest.fn()
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
  let mockGetSize;

  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 0;
    mouse.y = 0;
    mockGetSize = require('../utils.js').getSize;
    mockGetSize.mockImplementation((score) => Math.sqrt(score) + 20);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  test('returns first available name when all names are available', () => {
    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });

  test('returns correct unused name when some names are taken', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' },
      { name: 'VSCode' }
    ];
    const name = getUnusedAIName();
    expect(name).toBe('Visual Studio');
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
  let mockGetDistance;
  let mockGetSize;

  beforeEach(() => {
    gameState.playerCells = [];
    mockDateNow = jest.spyOn(Date, 'now');
    mockGetDistance = require('../utils.js').getDistance;
    mockGetSize = require('../utils.js').getSize;
    
    mockGetSize.mockImplementation((score) => Math.sqrt(score) + 20);
    mockGetDistance.mockImplementation((obj1, obj2) => {
      const dx = obj1.x - obj2.x;
      const dy = obj1.y - obj2.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
  });

  afterEach(() => {
    mockDateNow.mockRestore();
    jest.clearAllMocks();
  });

  test('merges cells when within merge distance and cooldown passed', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 }
    ];

    mockGetDistance.mockReturnValue(5);

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
  });

  test('applies attraction force when cells can merge but are not close enough', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);

    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    const cell2 = { x: 200, y: 200, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 };
    
    gameState.playerCells = [cell1, cell2];

    mockGetDistance.mockReturnValue(80);

    updateCellMerging();

    expect(cell1.velocityX).toBeGreaterThan(0);
    expect(cell1.velocityY).toBeGreaterThan(0);
    expect(cell2.velocityX).toBeLessThan(0);
    expect(cell2.velocityY).toBeLessThan(0);
  });

  test('applies repulsion when cells are too close but cannot merge', () => {
    const now = 5000;
    mockDateNow.mockReturnValue(now);

    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now };
    const cell2 = { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: now };
    
    gameState.playerCells = [cell1, cell2];

    mockGetDistance.mockReturnValue(10);

    updateCellMerging();

    expect(cell1.velocityX).toBeLessThan(0);
    expect(cell1.velocityY).toBeLessThan(0);
    expect(cell2.velocityX).toBeGreaterThan(0);
    expect(cell2.velocityY).toBeGreaterThan(0);
  });

  test('does not merge cells when cooldown has not passed', () => {
    const now = 5000;
    mockDateNow.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now },
      { x: 105, y: 105, score: 100, velocityX: 0, velocityY: 0, splitTime: now }
    ];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('merges multiple cells in groups', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);

    gameState.playerCells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 },
      { x: 102, y: 102, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 },
      { x: 104, y: 104, score: 100, velocityX: 0, velocityY: 0, splitTime: 5000 }
    ];

    mockGetDistance.mockReturnValue(5);

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(300);
  });
});

describe('updateAI', () => {
  let mockMathRandom;
  let mockGetSize;

  beforeEach(() => {
    gameState.aiPlayers = [];
    mockMathRandom = jest.spyOn(Math, 'random');
    mockGetSize = require('../utils.js').getSize;
    mockGetSize.mockImplementation((score) => Math.sqrt(score) + 20);
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
    jest.clearAllMocks();
  });

  test('changes AI direction randomly', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    mockMathRandom.mockReturnValueOnce(0.01); // Less than 0.02 threshold
    mockMathRandom.mockReturnValueOnce(0.5); // For new direction

    const originalDirection = ai.direction;
    updateAI();

    expect(ai.direction).not.toBe(originalDirection);
    expect(ai.direction).toBe(0.5 * Math.PI * 2);
  });

  test('does not change direction when random value is high', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 1.5 };
    gameState.aiPlayers = [ai];

    mockMathRandom.mockReturnValue(0.5); // Greater than 0.02 threshold

    const originalDirection = ai.direction;
    updateAI();

    expect(ai.direction).toBe(originalDirection);
  });

  test('moves AI based on direction and speed', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 }; // Direction 0 = right
    gameState.aiPlayers = [ai];

    mockMathRandom.mockReturnValue(0.5); // Don't change direction

    const originalX = ai.x;
    updateAI();

    expect(ai.x).toBeGreaterThan(originalX); // Should move right
  });

  test('applies speed based on AI size', () => {
    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };
    
    gameState.aiPlayers = [smallAI, largeAI];
    mockMathRandom.mockReturnValue(0.5); // Don't change direction

    const smallOriginalX = smallAI.x;
    const largeOriginalX = largeAI.x;

    updateAI();

    const smallMovement = smallAI.x - smallOriginalX;
    const largeMovement = largeAI.x - largeOriginalX;

    expect(smallMovement).toBeGreaterThan(largeMovement); // Smaller AI moves faster
  });

  test('keeps AI within world boundaries', () => {
    const ai = { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];

    mockMathRandom.mockReturnValue(0.5); // Don't change direction

    updateAI();

    expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeGreaterThanOrEqual(0);
  });
});

describe('initEntities', () => {
  let mockGetRandomPosition;
  let mockMathRandom;
  let consoleSpy;

  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    mockGetRandomPosition = require('../utils.js').getRandomPosition;
    mockMathRandom = jest.spyOn(Math, 'random');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('clears existing entities', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1 }];

    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('creates correct number of food items', () => {
    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(mockGetRandomPosition).toHaveBeenCalledTimes(FOOD_COUNT + AI_COUNT);
  });

  test('creates food with random positions and colors', () => {
    mockGetRandomPosition.mockReturnValue({ x: 150, y: 200 });
    mockMathRandom.mockReturnValue(0.3);

    initEntities();

    expect(gameState.food[0].x).toBe(150);
    expect(gameState.food[0].y).toBe(200);
    expect(gameState.food[0].color).toMatch(/^hsl\(\d+(\.\d+)?, 50%, 50%\)$/);
  });

  test('creates correct number of AI players', () => {
    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('initializes AI players with correct properties', () => {
    mockGetRandomPosition.mockReturnValue({ x: 250, y: 300 });
    mockMathRandom.mockReturnValueOnce(0.4); // For food color
    mockMathRandom.mockReturnValueOnce(0.6); // For AI color
    mockMathRandom.mockReturnValueOnce(0.8); // For AI direction

    initEntities();

    const ai = gameState.aiPlayers[0];
    expect(ai.x).toBe(250);
    expect(ai.y).toBe(300);
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai.color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
    expect(typeof ai.direction).toBe('number');
    expect(ai.name).toBe('Cursor'); // First available name
  });

  test('logs initialization information', () => {
    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    initEntities();

    expect(consoleSpy).toHaveBeenCalledWith('Initializing entities...');
    expect(consoleSpy).toHaveBeenCalledWith('Entities initialized:', {
      foodCount: FOOD_COUNT,
      aiCount: AI_COUNT,
      playerCells: gameState.playerCells.length
    });
  });
});

describe('respawnAI', () => {
  let mockGetRandomPosition;
  let mockMathRandom;

  beforeEach(() => {
    gameState.aiPlayers = [];
    mockGetRandomPosition = require('../utils.js').getRandomPosition;
    mockMathRandom = jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
    jest.clearAllMocks();
  });

  test('returns AI object with correct structure', () => {
    mockGetRandomPosition.mockReturnValue({ x: 400, y: 500 });
    mockMathRandom.mockReturnValueOnce(0.7); // For color
    mockMathRandom.mockReturnValueOnce(0.3); // For direction

    const ai = respawnAI();

    expect(ai).toEqual({
      x: 400,
      y: 500,
      score: AI_STARTING_SCORE,
      color: expect.stringMatching(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/),
      direction: 0.3 * Math.PI * 2,
      name: 'Cursor'
    });
  });

  test('uses random position from getRandomPosition', () => {
    mockGetRandomPosition.mockReturnValue({ x: 123, y: 456 });
    mockMathRandom.mockReturnValue(0.5);

    const ai = respawnAI();

    expect(mockGetRandomPosition).toHaveBeenCalledTimes(1);
    expect(ai.x).toBe(123);
    expect(ai.y).toBe(456);
  });

  test('assigns unused AI name', () => {
    gameState.aiPlayers = [{ name: 'Cursor' }, { name: 'Zed' }];
    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    const ai = respawnAI();

    expect(ai.name).toBe('VSCode'); // Next available name
  });

  test('sets correct starting score', () => {
    mockGetRandomPosition.mockReturnValue({ x: 100, y: 100 });
    mockMathRandom.mockReturnValue(0.5);

    const ai = respawnAI();

    expect(ai.score).toBe(AI_STARTING_SCORE);
  });
});
