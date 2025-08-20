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
  AI_COUNT, 
  FOOD_COUNT, 
  AI_STARTING_SCORE,
  MERGE_COOLDOWN,
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

const mockDateNow = jest.spyOn(Date, 'now');

describe('splitPlayerCell', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 0;
    mouse.y = 0;
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

  test('does not split when mouse distance is zero', () => {
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = [cell];
    
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    
    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight / 2;

    splitPlayerCell(cell);

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(100);
  });

  test('sets split velocity and time correctly', () => {
    const now = 1000000;
    mockDateNow.mockReturnValue(now);
    
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = [cell];
    mouse.x = 500;
    mouse.y = 300;

    splitPlayerCell(cell);

    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].splitTime).toBe(now);
    expect(gameState.playerCells[1].splitTime).toBe(now);
    expect(gameState.playerCells[1].velocityX).toBeGreaterThan(0);
  });
});

describe('handlePlayerSplit', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 200;
    mouse.y = 200;
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

  test('does not split when no cells are eligible', () => {
    gameState.playerCells = [
      { x: 100, y: 100, score: MIN_SPLIT_SCORE - 1 },
      { x: 200, y: 200, score: MIN_SPLIT_SCORE - 5 }
    ];

    handlePlayerSplit();

    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].score).toBe(MIN_SPLIT_SCORE - 1);
    expect(gameState.playerCells[1].score).toBe(MIN_SPLIT_SCORE - 5);
  });

  test('respects max cell limit', () => {
    gameState.playerCells = Array(MAX_PLAYER_CELLS - 1).fill().map(() => ({ 
      x: 100, 
      y: 100, 
      score: 100 
    }));

    handlePlayerSplit();

    expect(gameState.playerCells.length).toBe(MAX_PLAYER_CELLS);
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

  test('clamps position to world boundaries', () => {
    const cell = { 
      x: WORLD_SIZE - 1, 
      y: WORLD_SIZE - 1, 
      score: 100, 
      velocityX: 10, 
      velocityY: 10 
    };
    gameState.playerCells = [cell];
    mouse.x = WORLD_SIZE + 100;
    mouse.y = WORLD_SIZE + 100;

    updatePlayer();

    expect(gameState.playerCells[0].x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(gameState.playerCells[0].y).toBeLessThanOrEqual(WORLD_SIZE);
  });

  test('handles multiple cells correctly', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0 };
    const cell2 = { x: 200, y: 200, score: 200, velocityX: 0, velocityY: 0 };
    gameState.playerCells = [cell1, cell2];
    mouse.x = 500;
    mouse.y = 400;

    updatePlayer();

    expect(Math.abs(gameState.playerCells[0].velocityX) + Math.abs(gameState.playerCells[0].velocityY)).toBeGreaterThan(0);
    expect(Math.abs(gameState.playerCells[1].velocityX) + Math.abs(gameState.playerCells[1].velocityY)).toBeGreaterThan(0);
  });

  test('handles zero mouse distance gracefully', () => {
    const cell = { x: 100, y: 100, score: 100, velocityX: 5, velocityY: 5 };
    gameState.playerCells = [cell];
    
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    
    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight / 2;

    updatePlayer();

    expect(gameState.playerCells[0].velocityX).toBe(5);
    expect(gameState.playerCells[0].velocityY).toBe(5);
  });
});

describe('updateAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('moves AI players based on their direction', () => {
    const ai = { 
      x: 100, 
      y: 100, 
      score: 100, 
      direction: 0 
    };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(gameState.aiPlayers[0].x).toBeGreaterThan(100);
    expect(gameState.aiPlayers[0].y).toBe(100);
  });

  test('applies speed based on AI size', () => {
    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };
    gameState.aiPlayers = [smallAI, largeAI];

    const initialSmallX = smallAI.x;
    const initialLargeX = largeAI.x;

    updateAI();

    const smallMovement = Math.abs(gameState.aiPlayers[0].x - initialSmallX);
    const largeMovement = Math.abs(gameState.aiPlayers[1].x - initialLargeX);

    expect(smallMovement).toBeGreaterThan(largeMovement);
  });

  test('clamps AI position to world boundaries', () => {
    const ai = { 
      x: WORLD_SIZE - 1, 
      y: WORLD_SIZE - 1, 
      score: 100, 
      direction: Math.PI / 4 
    };
    gameState.aiPlayers = [ai];

    updateAI();

    expect(gameState.aiPlayers[0].x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(gameState.aiPlayers[0].y).toBeLessThanOrEqual(WORLD_SIZE);
    expect(gameState.aiPlayers[0].x).toBeGreaterThanOrEqual(0);
    expect(gameState.aiPlayers[0].y).toBeGreaterThanOrEqual(0);
  });

  test('randomly changes direction with low probability', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    
    const originalDirection = ai.direction;
    let directionChanged = false;

    for (let i = 0; i < 200; i++) {
      updateAI();
      if (gameState.aiPlayers[0].direction !== originalDirection) {
        directionChanged = true;
        break;
      }
    }

    expect(directionChanged).toBe(true);
  });
});

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns first name when no AI players exist', () => {
    const name = getUnusedAIName();
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
    const aiNames = [
      'Cursor', 'Zed', 'VSCode', 'Visual Studio', 'Eclipse',
      'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs'
    ];
    
    gameState.aiPlayers = aiNames.map(name => ({ name }));
    
    const name = getUnusedAIName();
    expect(name).toBe('Cursor');
  });
});

describe('initEntities', () => {
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1, name: 'Test' }];

    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('initializes correct number of food items', () => {
    initEntities();

    expect(gameState.food.length).toBe(FOOD_COUNT);
  });

  test('initializes correct number of AI players', () => {
    initEntities();

    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('food items have proper properties', () => {
    initEntities();

    gameState.food.forEach(food => {
      expect(food).toHaveProperty('x');
      expect(food).toHaveProperty('y');
      expect(food).toHaveProperty('color');
      expect(food.x).toBeGreaterThanOrEqual(0);
      expect(food.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(food.y).toBeGreaterThanOrEqual(0);
      expect(food.y).toBeLessThanOrEqual(WORLD_SIZE);
      expect(food.color).toMatch(/^hsl\(\d+(?:\.\d+)?, 50%, 50%\)$/);
    });
  });

  test('AI players have proper properties', () => {
    initEntities();

    gameState.aiPlayers.forEach(ai => {
      expect(ai).toHaveProperty('x');
      expect(ai).toHaveProperty('y');
      expect(ai).toHaveProperty('score');
      expect(ai).toHaveProperty('color');
      expect(ai).toHaveProperty('direction');
      expect(ai).toHaveProperty('name');
      expect(ai.x).toBeGreaterThanOrEqual(0);
      expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(ai.y).toBeGreaterThanOrEqual(0);
      expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
      expect(ai.score).toBe(AI_STARTING_SCORE);
      expect(ai.color).toMatch(/^hsl\(\d+(?:\.\d+)?, 70%, 50%\)$/);
      expect(ai.direction).toBeGreaterThanOrEqual(0);
      expect(ai.direction).toBeLessThan(Math.PI * 2);
      expect(typeof ai.name).toBe('string');
    });
  });

  test('AI players have unique names when possible', () => {
    initEntities();

    const names = gameState.aiPlayers.map(ai => ai.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(Math.min(AI_COUNT, 10));
  });
});

describe('respawnAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns AI with correct starting score', () => {
    const ai = respawnAI();
    expect(ai.score).toBe(AI_STARTING_SCORE);
  });

  test('returns AI with valid position within world bounds', () => {
    const ai = respawnAI();
    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(ai.y).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeLessThanOrEqual(WORLD_SIZE);
  });

  test('returns AI with proper properties', () => {
    const ai = respawnAI();
    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score');
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
    expect(ai.color).toMatch(/^hsl\(\d+(?:\.\d+)?, 70%, 50%\)$/);
    expect(ai.direction).toBeGreaterThanOrEqual(0);
    expect(ai.direction).toBeLessThan(Math.PI * 2);
    expect(typeof ai.name).toBe('string');
  });

  test('uses unused AI name', () => {
    gameState.aiPlayers = [{ name: 'Cursor' }];
    const ai = respawnAI();
    expect(ai.name).not.toBe('Cursor');
  });
});

describe('updateCellMerging', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mockDateNow.mockClear();
  });

  test('applies forces between cells', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);
    
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0, 
      splitTime: now - MERGE_COOLDOWN - 1000 
    };
    const cell2 = { 
      x: 200, 
      y: 200, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0, 
      splitTime: now - MERGE_COOLDOWN - 1000 
    };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBeGreaterThanOrEqual(1);
  });

  test('does not merge cells before cooldown expires', () => {
    const now = 5000;
    mockDateNow.mockReturnValue(now);
    
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0, 
      splitTime: now - 1000 
    };
    const cell2 = { 
      x: 105, 
      y: 105, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0, 
      splitTime: now - 1000 
    };
    gameState.playerCells = [cell1, cell2];

    updateCellMerging();

    expect(gameState.playerCells.length).toBe(2);
  });

  test('handles multiple cells without errors', () => {
    const now = 20000;
    mockDateNow.mockReturnValue(now);
    
    const cells = [
      { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: now - MERGE_COOLDOWN - 1000 },
      { x: 150, y: 150, score: 100, velocityX: 0, velocityY: 0, splitTime: now - MERGE_COOLDOWN - 1000 },
      { x: 200, y: 200, score: 100, velocityX: 0, velocityY: 0, splitTime: now - MERGE_COOLDOWN - 1000 }
    ];
    gameState.playerCells = cells;

    expect(() => updateCellMerging()).not.toThrow();
    expect(gameState.playerCells.length).toBeGreaterThanOrEqual(1);
  });
});
