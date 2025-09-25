import { splitPlayerCell, handlePlayerSplit, updatePlayer, updateCellMerging, updateAI, initEntities, respawnAI, getUnusedAIName } from '../entities.js';
import { gameState, mouse } from '../gameState.js';
import { MIN_SPLIT_SCORE, MAX_PLAYER_CELLS, AI_STARTING_SCORE, MERGE_COOLDOWN, MERGE_DISTANCE, FOOD_COUNT, AI_COUNT } from '../config.js';

// Mock gameState and mouse
jest.mock('../gameState.js', () => ({
  gameState: {
    playerCells: [],
    aiPlayers: [],
    food: []
  },
  mouse: { x: 0, y: 0 }
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
  beforeEach(() => {
    gameState.playerCells = [];
    jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not merge cells during cooldown period', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN / 2)
    };
    
    const cell2 = { 
      x: 105, 
      y: 105, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN / 2)
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(2);
  });

  test('merges cells after cooldown period when close enough', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    const cell2 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
  });

  test('applies attraction force when cells can merge but are not close enough', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    const cell2 = { 
      x: 200, 
      y: 200, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].velocityX).toBeGreaterThan(0);
    expect(gameState.playerCells[0].velocityY).toBeGreaterThan(0);
    expect(gameState.playerCells[1].velocityX).toBeLessThan(0);
    expect(gameState.playerCells[1].velocityY).toBeLessThan(0);
  });

  test('applies repulsion when cells are too close but cannot merge', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - 1000
    };
    
    const cell2 = { 
      x: 101, 
      y: 101, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - 1000
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].velocityX).toBeLessThan(0);
    expect(gameState.playerCells[0].velocityY).toBeLessThan(0);
    expect(gameState.playerCells[1].velocityX).toBeGreaterThan(0);
    expect(gameState.playerCells[1].velocityY).toBeGreaterThan(0);
  });

  test('handles cells with no splitTime property', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0
    };
    
    const cell2 = { 
      x: 105, 
      y: 105, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(200);
  });

  test('applies attraction force when cells are far apart and can merge', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    const cell2 = { 
      x: 300, 
      y: 300, 
      score: 100, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    gameState.playerCells = [cell1, cell2];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(2);
    expect(gameState.playerCells[0].velocityX).toBeGreaterThan(0);
    expect(gameState.playerCells[0].velocityY).toBeGreaterThan(0);
  });

  test('handles multiple cell groups for merging', () => {
    const cell1 = { 
      x: 100, 
      y: 100, 
      score: 50, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    const cell2 = { 
      x: 100, 
      y: 100, 
      score: 50, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };

    const cell3 = { 
      x: 100, 
      y: 100, 
      score: 50, 
      velocityX: 0, 
      velocityY: 0,
      splitTime: Date.now() - (MERGE_COOLDOWN + 1000)
    };
    
    gameState.playerCells = [cell1, cell2, cell3];
    
    updateCellMerging();
    
    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(150);
  });
});

describe('updateAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('updates AI positions based on their direction', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    
    const ai = { 
      x: 100, 
      y: 100, 
      score: 100, 
      direction: Math.PI / 4
    };
    
    gameState.aiPlayers = [ai];
    
    updateAI();
    
    expect(gameState.aiPlayers[0].x).toBeGreaterThan(100);
    expect(gameState.aiPlayers[0].y).toBeGreaterThan(100);
    
    jest.restoreAllMocks();
  });

  test('changes AI direction randomly', () => {
    const ai = { 
      x: 100, 
      y: 100, 
      score: 100, 
      direction: 0
    };
    
    gameState.aiPlayers = [ai];
    
    let directionChanged = false;
    const originalDirection = ai.direction;
    
    for (let i = 0; i < 100; i++) {
      updateAI();
      if (gameState.aiPlayers[0].direction !== originalDirection) {
        directionChanged = true;
        break;
      }
    }
    
    expect(directionChanged).toBe(true);
  });

  test('keeps AI within world boundaries', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    
    const ai = { 
      x: 1999, 
      y: 1999, 
      score: 100, 
      direction: Math.PI / 4
    };
    
    gameState.aiPlayers = [ai];
    
    updateAI();
    
    expect(gameState.aiPlayers[0].x).toBeLessThanOrEqual(2000);
    expect(gameState.aiPlayers[0].y).toBeLessThanOrEqual(2000);
    
    jest.restoreAllMocks();
  });

  test('applies speed based on AI score', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    
    const smallAI = { 
      x: 100, 
      y: 100, 
      score: 50, 
      direction: 0
    };
    
    const largeAI = { 
      x: 200, 
      y: 200, 
      score: 400, 
      direction: 0
    };
    
    gameState.aiPlayers = [smallAI];
    updateAI();
    const smallAIMovement = gameState.aiPlayers[0].x - 100;
    
    gameState.aiPlayers = [largeAI];
    updateAI();
    const largeAIMovement = gameState.aiPlayers[0].x - 200;
    
    expect(smallAIMovement).toBeGreaterThan(largeAIMovement);
    
    jest.restoreAllMocks();
  });
});

describe('initEntities', () => {
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initializes food entities', () => {
    initEntities();
    
    expect(gameState.food.length).toBe(FOOD_COUNT);
    
    const food = gameState.food[0];
    expect(food).toHaveProperty('x');
    expect(food).toHaveProperty('y');
    expect(food).toHaveProperty('color');
    expect(food.color).toMatch(/hsl\([\d.]+, 50%, 50%\)/);
  });

  test('initializes AI players', () => {
    initEntities();
    
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
    
    const ai = gameState.aiPlayers[0];
    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score');
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
    expect(ai.color).toMatch(/hsl\([\d.]+, 70%, 50%\)/);
  });

  test('assigns unique names to AI players', () => {
    initEntities();
    
    const names = gameState.aiPlayers.map(ai => ai.name);
    
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('clears existing entities before initialization', () => {
    gameState.food = [{ x: 1, y: 1, color: 'red' }];
    gameState.aiPlayers = [{ x: 1, y: 1, score: 100, name: 'Test' }];
    
    initEntities();
    
    expect(gameState.food.length).toBe(FOOD_COUNT);
    expect(gameState.aiPlayers.length).toBe(AI_COUNT);
  });
});

describe('respawnAI', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('creates a new AI player with correct properties', () => {
    const ai = respawnAI();
    
    expect(ai).toHaveProperty('x');
    expect(ai).toHaveProperty('y');
    expect(ai).toHaveProperty('score');
    expect(ai.score).toBe(AI_STARTING_SCORE);
    expect(ai).toHaveProperty('color');
    expect(ai).toHaveProperty('direction');
    expect(ai).toHaveProperty('name');
    expect(ai.color).toMatch(/hsl\([\d.]+, 70%, 50%\)/);
  });

  test('assigns unused name to new AI player', () => {
    gameState.aiPlayers = [
      { name: 'Cursor' },
      { name: 'Zed' }
    ];
    
    const ai = respawnAI();
    
    expect(ai.name).not.toBe('Cursor');
    expect(ai.name).not.toBe('Zed');
  });

  test('returns first name when all names are taken', () => {
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
    expect(name).not.toBe('Cursor');
    expect(name).not.toBe('Zed');
    expect(name).toBe('VSCode');
  });

  test('returns first name when all names are taken', () => {
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
