import { splitPlayerCell, handlePlayerSplit, updatePlayer, updateAI, initEntities, respawnAI, getUnusedAIName, updateCellMerging } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, AI_COUNT, FOOD_COUNT, AI_STARTING_SCORE, MERGE_COOLDOWN, MERGE_DISTANCE } from '../config.js';

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

const { getSize, getRandomPosition, getDistance } = require('../utils.js');

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
});

describe('handlePlayerSplit', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 0;
    mouse.y = 0;
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

  test('handles zero mouse distance', () => {
    const cell = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0 };
    gameState.playerCells = [cell];
    
    // Set mouse at center of screen (same as cell relative position)
    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight / 2;
    
    updatePlayer();
    
    expect(gameState.playerCells[0].x).toBe(100);
    expect(gameState.playerCells[0].y).toBe(100);
  });

  test('respects world boundaries', () => {
    const cell = { x: 1990, y: 1990, score: 100, velocityX: 50, velocityY: 50 };
    gameState.playerCells = [cell];
    
    mouse.x = 2000;
    mouse.y = 2000;
    
    updatePlayer();
    
    expect(gameState.playerCells[0].x).toBeLessThanOrEqual(2000);
    expect(gameState.playerCells[0].y).toBeLessThanOrEqual(2000);
  });
});

describe('splitPlayerCell edge cases', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    mouse.x = 0;
    mouse.y = 0;
  });

  test('does not split with zero mouse distance', () => {
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = [cell];
    
    // Set mouse at center (zero distance)
    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight / 2;
    
    splitPlayerCell(cell);
    
    expect(gameState.playerCells.length).toBe(1);
  });

  test('applies correct velocities when splitting', () => {
    const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000);
    
    const cell = { x: 100, y: 100, score: 100 };
    gameState.playerCells = [cell];
    
    // Set mouse to the right
    mouse.x = window.innerWidth / 2 + 100;
    mouse.y = window.innerHeight / 2;
    
    splitPlayerCell(cell);
    
    expect(gameState.playerCells.length).toBe(2);
    
    expect(gameState.playerCells[0].velocityX).toBeLessThan(0);
    
    expect(gameState.playerCells[1].velocityX).toBeGreaterThan(0);
    
    expect(gameState.playerCells[0].splitTime).toBe(1000);
    expect(gameState.playerCells[1].splitTime).toBe(1000);
    
    mockDateNow.mockRestore();
  });
});

describe('getUnusedAIName', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('returns first available name when no AIs exist', () => {
    const name = getUnusedAIName();
    expect(['Cursor', 'Zed', 'VSCode', 'Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs']).toContain(name);
  });

  test('returns unused name when some names are taken', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' },
      { name: 'VSCode' }
    ];
    
    const name = getUnusedAIName();
    expect(name).not.toBe('Cursor');
    expect(name).not.toBe('Zed');
    expect(name).not.toBe('VSCode');
    expect(['Visual Studio', 'Eclipse', 'JetBrains', 'XCode', 'Sublime', 'Neovim', 'Emacs']).toContain(name);
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

  test('changes AI direction with 2% probability', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 };
    gameState.aiPlayers = [ai];
    
    mockMathRandom.mockReturnValue(0.01);
    
    updateAI();
    
    expect(ai.direction).not.toBe(0);
  });

  test('does not change direction when random >= 0.02', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 1.5 };
    gameState.aiPlayers = [ai];
    
    mockMathRandom.mockReturnValue(0.5);
    
    updateAI();
    
    expect(ai.direction).toBe(1.5);
  });

  test('moves AI based on direction and speed', () => {
    const ai = { x: 100, y: 100, score: 100, direction: 0 }; // Direction 0 = move right
    gameState.aiPlayers = [ai];
    
    mockMathRandom.mockReturnValue(0.5); // No direction change
    
    const initialX = ai.x;
    updateAI();
    
    expect(ai.x).toBeGreaterThan(initialX);
  });

  test('respects world boundaries', () => {
    const ai = { x: 1999, y: 1999, score: 100, direction: 0 }; // Near boundary, moving right
    gameState.aiPlayers = [ai];
    
    mockMathRandom.mockReturnValue(0.5); // No direction change
    
    updateAI();
    
    expect(ai.x).toBeLessThanOrEqual(2000);
    expect(ai.y).toBeLessThanOrEqual(2000);
    expect(ai.x).toBeGreaterThanOrEqual(0);
    expect(ai.y).toBeGreaterThanOrEqual(0);
  });

  test('calculates speed based on AI size', () => {
    const smallAI = { x: 100, y: 100, score: 100, direction: 0 };
    const largeAI = { x: 200, y: 200, score: 400, direction: 0 };
    gameState.aiPlayers = [smallAI, largeAI];
    
    mockMathRandom.mockReturnValue(0.5); // No direction change
    
    const smallInitialX = smallAI.x;
    const largeInitialX = largeAI.x;
    
    updateAI();
    
    const smallMovement = smallAI.x - smallInitialX;
    const largeMovement = largeAI.x - largeInitialX;
    
    // Smaller AI should move faster
    expect(smallMovement).toBeGreaterThan(largeMovement);
  });
});

describe('initEntities', () => {
  let mockMathRandom;
  let mockConsoleLog;
  
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    mockMathRandom = jest.spyOn(Math, 'random');
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    getRandomPosition.mockReturnValue({ x: 150, y: 150 });
  });
  
  afterEach(() => {
    mockMathRandom.mockRestore();
    mockConsoleLog.mockRestore();
  });

  test('creates correct number of food entities', () => {
    mockMathRandom.mockReturnValue(0.5);
    
    initEntities();
    
    expect(gameState.food.length).toBe(FOOD_COUNT);
  });

  test('creates correct number of AI players', () => {
    mockMathRandom.mockReturnValue(0.5);
    
    initEntities();
    
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });

  test('food entities have correct properties', () => {
    mockMathRandom.mockReturnValue(0.5); // For color generation
    
    initEntities();
    
    const food = gameState.food[0];
    expect(food.x).toBe(150);
    expect(food.y).toBe(150);
    expect(food.color).toMatch(/^hsl\(\d+\.?\d*, 50%, 50%\)$/);
  });

  test('AI players have correct properties', () => {
    mockMathRandom.mockReturnValue(0.5); // For color and direction
    
    initEntities();
    
    const ai = gameState.aiPlayers[0];
    expect(ai.x).toBe(150);
    expect(ai.y).toBe(150);
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai.color).toMatch(/^hsl\(\d+\.?\d*, 70%, 50%\)$/);
    expect(typeof ai.direction).toBe('number');
    expect(typeof ai.name).toBe('string');
  });

  test('AI players get unique names', () => {
    mockMathRandom.mockReturnValue(0.5);
    
    initEntities();
    
    const names = gameState.aiPlayers.map(ai => ai.name);
    const uniqueNames = new Set(names);
    
    expect(uniqueNames.size).toBe(Math.min(AI_COUNT, 10)); // 10 is the number of AI_NAMES
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1 }];
    gameState.aiPlayers = [{ x: 1, y: 1 }];
    
    mockMathRandom.mockReturnValue(0.5);
    
    initEntities();
    
    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });
});

describe('respawnAI', () => {
  let mockMathRandom;
  
  beforeEach(() => {
    gameState.aiPlayers = [];
    mockMathRandom = jest.spyOn(Math, 'random');
    getRandomPosition.mockReturnValue({ x: 200, y: 200 });
  });
  
  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  test('returns AI object with correct properties', () => {
    mockMathRandom.mockReturnValue(0.7); // For color and direction
    
    const ai = respawnAI();
    
    expect(ai.x).toBe(200);
    expect(ai.y).toBe(200);
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai.color).toMatch(/^hsl\(\d+\.?\d*, 70%, 50%\)$/);
    expect(typeof ai.direction).toBe('number');
    expect(typeof ai.name).toBe('string');
  });

  test('gets unused AI name', () => {
    gameState.aiPlayers = [{ name: 'Cursor' }, { name: 'Zed' }];
    mockMathRandom.mockReturnValue(0.5);
    
    const ai = respawnAI();
    
    expect(ai.name).not.toBe('Cursor');
    expect(ai.name).not.toBe('Zed');
  });

  test('generates random color and direction', () => {
    mockMathRandom.mockReturnValueOnce(0.3).mockReturnValueOnce(0.8);
    
    const ai = respawnAI();
    
    expect(ai.color).toBe('hsl(108, 70%, 50%)');
    
    expect(ai.direction).toBeCloseTo(0.8 * Math.PI * 2);
  });
});

describe('updateCellMerging', () => {
  let mockDateNow;
  
  beforeEach(() => {
    gameState.playerCells = [];
    mockDateNow = jest.spyOn(Date, 'now');
    getDistance.mockImplementation((obj1, obj2) => {
      const dx = obj1.x - obj2.x;
      const dy = obj1.y - obj2.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
    getSize.mockImplementation((score) => Math.sqrt(score) + 20);
  });
  
  afterEach(() => {
    mockDateNow.mockRestore();
  });

  test('applies attraction force when cells are within merge distance', () => {
    mockDateNow.mockReturnValue(15000); // After merge cooldown
    
    const cell1 = { 
      x: 100, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    const cell2 = { 
      x: 150, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(cell1.velocityX).toBeGreaterThan(0); // Moving right towards cell2
    expect(cell2.velocityX).toBeLessThan(0); // Moving left towards cell1
  });

  test('applies repulsion force when cells are too close', () => {
    mockDateNow.mockReturnValue(5000); // Before merge cooldown
    
    const cell1 = { 
      x: 100, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    const cell2 = { 
      x: 105, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(cell1.velocityX).toBeLessThan(0); // Moving left away from cell2
    expect(cell2.velocityX).toBeGreaterThan(0); // Moving right away from cell1
  });

  test('merges cells when very close and cooldown has passed', () => {
    mockDateNow.mockReturnValue(15000); // After merge cooldown
    
    const cell1 = { 
      x: 100, y: 100, score: 100, 
      velocityX: 5, velocityY: 3, 
      splitTime: 0 
    };
    const cell2 = { 
      x: 101, y: 100, score: 200, 
      velocityX: -2, velocityY: 4, 
      splitTime: 0 
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(1);
    
    const mergedCell = gameState.playerCells[0];
    expect(mergedCell.score).toBe(300); // 100 + 200
    expect(mergedCell.splitTime).toBe(0); // Reset split time
    
    const expectedX = (100 * 100 + 101 * 200) / 300;
    const expectedY = (100 * 100 + 100 * 200) / 300;
    expect(mergedCell.x).toBeCloseTo(expectedX);
    expect(mergedCell.y).toBeCloseTo(expectedY);
    
    const expectedVelX = (5 * 100 + (-2) * 200) / 300;
    const expectedVelY = (3 * 100 + 4 * 200) / 300;
    expect(mergedCell.velocityX).toBeCloseTo(expectedVelX);
    expect(mergedCell.velocityY).toBeCloseTo(expectedVelY);
  });

  test('does not merge cells during cooldown period', () => {
    mockDateNow.mockReturnValue(5000); // During cooldown period
    
    const cell1 = { 
      x: 100, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    const cell2 = { 
      x: 101, y: 100, score: 100, 
      velocityX: 0, velocityY: 0, 
      splitTime: 0 
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(2);
  });

  test('handles multiple cell groups for merging', () => {
    mockDateNow.mockReturnValue(15000); // After merge cooldown
    
    const cell1 = { x: 100, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    const cell2 = { x: 102, y: 100, score: 100, velocityX: 0, velocityY: 0, splitTime: 0 };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(1);
    
    const totalScore = gameState.playerCells.reduce((sum, cell) => sum + cell.score, 0);
    expect(totalScore).toBe(200);
  });
});
