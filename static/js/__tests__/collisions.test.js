import { handleFoodCollisions, handlePlayerAICollisions, handleAIAICollisions, respawnEntities } from '../collisions.js';
import { gameState } from '../gameState.js';
import { getSize } from '../utils.js';
import { respawnAI } from '../entities.js';

// Mock gameState
jest.mock('../gameState.js', () => ({
  gameState: {
    playerCells: [],
    aiPlayers: [],
    food: []
  }
}));

jest.mock('../entities.js', () => ({
  respawnAI: jest.fn()
}));

describe('handleFoodCollisions', () => {
  beforeEach(() => {
    // Reset gameState before each test
    gameState.playerCells = [];
    gameState.aiPlayers = [];
    gameState.food = [];
  });

  test('player cell consumes food when overlapping', () => {
    gameState.playerCells = [{ x: 100, y: 100, score: 100 }];
    gameState.food = [{ x: 100, y: 100 }];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(0);
    expect(gameState.playerCells[0].score).toBe(110);  // Initial + FOOD_SCORE
  });

  test('food remains when not overlapping with player', () => {
    gameState.playerCells = [{ x: 100, y: 100, score: 100 }];
    gameState.food = [{ x: 500, y: 500 }];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(100);
  });

  test('AI consumes food when overlapping', () => {
    gameState.aiPlayers = [{ x: 100, y: 100, score: 100 }];
    gameState.food = [{ x: 100, y: 100 }];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(0);
    expect(gameState.aiPlayers[0].score).toBe(110);  // Initial + FOOD_SCORE
  });

  test('food remains when not overlapping with AI', () => {
    gameState.aiPlayers = [{ x: 100, y: 100, score: 100 }];
    gameState.food = [{ x: 500, y: 500 }];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(100);
  });

  test('multiple AI entities eat different food items', () => {
    gameState.aiPlayers = [
      { x: 100, y: 100, score: 100 },
      { x: 200, y: 200, score: 150 }
    ];
    gameState.food = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 500, y: 500 }
    ];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(110);
    expect(gameState.aiPlayers[1].score).toBe(160);
  });
});

describe('handlePlayerAICollisions', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    gameState.aiPlayers = [];
  });

  test('larger player cell consumes AI', () => {
    const playerCell = { x: 100, y: 100, score: 400 };  // Large player
    const ai = { x: 100, y: 100, score: 100 };  // Small AI

    gameState.playerCells = [playerCell];
    gameState.aiPlayers = [ai];

    handlePlayerAICollisions();

    expect(gameState.aiPlayers.length).toBe(0);
    expect(gameState.playerCells[0].score).toBe(600);  // 400 + 100 + 100 bonus
  });

  test('larger AI consumes player cell', () => {
    const playerCell = { x: 100, y: 100, score: 100 };  // Small player
    const ai = { x: 100, y: 100, score: 400 };  // Large AI

    gameState.playerCells = [playerCell];
    gameState.aiPlayers = [ai];

    handlePlayerAICollisions();

    expect(gameState.playerCells.length).toBe(1);  // Player respawns
    expect(gameState.aiPlayers[0].score).toBe(600);  // 400 + 100 + 100 bonus
  });

  test('entities at collision threshold boundary - player barely larger', () => {
    const playerCell = { x: 100, y: 100, score: 144 };  // Size = sqrt(144) + 20 = 32, AI size = sqrt(100) + 20 = 30, 32 > 30 * 1.1 = 33 (false), so need higher
    const ai = { x: 100, y: 100, score: 100 };  // Size = sqrt(100) + 20 = 30

    gameState.playerCells = [playerCell];
    gameState.aiPlayers = [ai];

    handlePlayerAICollisions();

    expect(gameState.aiPlayers.length).toBe(1);  // No consumption since 32 < 33
    expect(gameState.playerCells[0].score).toBe(144);  // No change
    expect(gameState.aiPlayers[0].score).toBe(100);  // No change
  });

  test('entities at collision threshold boundary - AI barely larger', () => {
    const playerCell = { x: 100, y: 100, score: 100 };  // Size = sqrt(100) + 20 = 30
    const ai = { x: 100, y: 100, score: 189 };  // Size = sqrt(189) + 20 ≈ 33.75, 33.75 > 30 * 1.1 = 33 (true)

    gameState.playerCells = [playerCell];
    gameState.aiPlayers = [ai];

    handlePlayerAICollisions();

    expect(gameState.playerCells.length).toBe(1);  // Player respawns
    expect(gameState.aiPlayers[0].score).toBe(389);  // 189 + 100 + 100 bonus
  });

  test('equal sized entities do not consume each other', () => {
    const playerCell = { x: 100, y: 100, score: 100 };
    const ai = { x: 100, y: 100, score: 100 };

    gameState.playerCells = [playerCell];
    gameState.aiPlayers = [ai];

    handlePlayerAICollisions();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.aiPlayers.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(100);
    expect(gameState.aiPlayers[0].score).toBe(100);
  });

  test('multiple simultaneous collisions', () => {
    const playerCells = [
      { x: 100, y: 100, score: 400 },  // Large player
      { x: 200, y: 200, score: 100 }   // Small player
    ];
    const ais = [
      { x: 100, y: 100, score: 100 },  // Small AI (will be consumed)
      { x: 200, y: 200, score: 400 }   // Large AI (will consume)
    ];

    gameState.playerCells = playerCells;
    gameState.aiPlayers = ais;

    handlePlayerAICollisions();

    expect(gameState.aiPlayers.length).toBe(1);  // One AI consumed
    expect(gameState.playerCells.length).toBe(1);  // One player consumed, one respawned
    const remainingPlayerCell = gameState.playerCells[0];
    expect(remainingPlayerCell.score === 600 || remainingPlayerCell.score === 100).toBeTruthy();  // Either large player with gain or respawned player
    expect(gameState.aiPlayers[0].score).toBe(600);  // Large AI gained score
  });
});

describe('handleAIAICollisions', () => {
  beforeEach(() => {
    gameState.aiPlayers = [];
  });

  test('larger AI consumes smaller AI', () => {
    const ai1 = { x: 100, y: 100, score: 400 };  // Large AI
    const ai2 = { x: 100, y: 100, score: 100 };  // Small AI

    gameState.aiPlayers = [ai1, ai2];

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(600);  // 400 + 100 + 100 bonus
  });

  test('equal sized AIs do not consume each other', () => {
    const ai1 = { x: 100, y: 100, score: 100 };
    const ai2 = { x: 100, y: 100, score: 100 };

    gameState.aiPlayers = [ai1, ai2];

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(2);
    expect(gameState.aiPlayers[0].score).toBe(100);
    expect(gameState.aiPlayers[1].score).toBe(100);
  });

  test('AI2 consumes AI1 and breaks from inner loop', () => {
    const ai1 = { x: 100, y: 100, score: 100 };  // Small AI
    const ai2 = { x: 100, y: 100, score: 400 };  // Large AI
    const ai3 = { x: 300, y: 300, score: 200 };  // Separate AI

    gameState.aiPlayers = [ai1, ai2, ai3];

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(2);
    expect(gameState.aiPlayers.find(ai => ai.score === 600)).toBeTruthy();  // AI2 consumed AI1
    expect(gameState.aiPlayers.find(ai => ai.score === 200)).toBeTruthy();  // AI3 unchanged
  });

  test('multiple AI collision scenarios', () => {
    const ais = [
      { x: 100, y: 100, score: 400 },  // Large AI
      { x: 100, y: 100, score: 100 },  // Small AI (will be consumed)
      { x: 200, y: 200, score: 300 },  // Medium AI
      { x: 200, y: 200, score: 150 }   // Small AI (will be consumed)
    ];

    gameState.aiPlayers = ais;

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(2);  // Two AIs consumed
    const scores = gameState.aiPlayers.map(ai => ai.score).sort((a, b) => b - a);
    expect(scores[0]).toBe(600);  // 400 + 100 + 100 bonus
    expect(scores[1]).toBe(550);  // 300 + 150 + 100 bonus
  });

  test('collision threshold boundary in AI-AI collisions', () => {
    const ai1 = { x: 100, y: 100, score: 189 };  // Size = sqrt(189) + 20 ≈ 33.75, 33.75 > 30 * 1.1 = 33 (true)
    const ai2 = { x: 100, y: 100, score: 100 };  // Size = sqrt(100) + 20 = 30

    gameState.aiPlayers = [ai1, ai2];

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(389);  // 189 + 100 + 100 bonus
  });
});
describe('respawnEntities', () => {
  beforeEach(() => {
    gameState.playerCells = [];
    gameState.aiPlayers = [];
    gameState.food = [];
    respawnAI.mockClear();
    respawnAI.mockReturnValue({
      x: 500,
      y: 500,
      score: 50,
      color: 'hsl(180, 70%, 50%)',
      direction: 1.5,
      name: 'TestAI'
    });
  });

  test('respawns food when below FOOD_COUNT', () => {
    gameState.food = [
      { x: 100, y: 100, color: 'red' },
      { x: 200, y: 200, color: 'blue' }
    ];

    respawnEntities();

    expect(gameState.food.length).toBe(100);
    expect(gameState.food[0]).toEqual({ x: 100, y: 100, color: 'red' });
    expect(gameState.food[1]).toEqual({ x: 200, y: 200, color: 'blue' });
  });

  test('does not respawn food when at FOOD_COUNT', () => {
    const initialFood = Array(100).fill(null).map((_, i) => ({
      x: i * 10,
      y: i * 10,
      color: `hsl(${i}, 50%, 50%)`
    }));
    gameState.food = initialFood;

    respawnEntities();

    expect(gameState.food.length).toBe(100);
    expect(gameState.food).toEqual(initialFood);
  });

  test('respawns AI when below AI_COUNT', () => {
    gameState.aiPlayers = [
      { x: 100, y: 100, score: 100, name: 'ExistingAI' }
    ];

    respawnEntities();

    expect(gameState.aiPlayers.length).toBe(10);
    expect(respawnAI).toHaveBeenCalledTimes(9);
    expect(gameState.aiPlayers[0]).toEqual({ x: 100, y: 100, score: 100, name: 'ExistingAI' });
  });

  test('does not respawn AI when at AI_COUNT', () => {
    const initialAIs = Array(10).fill(null).map((_, i) => ({
      x: i * 50,
      y: i * 50,
      score: 50 + i,
      name: `AI${i}`
    }));
    gameState.aiPlayers = initialAIs;

    respawnEntities();

    expect(gameState.aiPlayers.length).toBe(10);
    expect(respawnAI).not.toHaveBeenCalled();
    expect(gameState.aiPlayers).toEqual(initialAIs);
  });

  test('respawns player when no cells exist', () => {
    gameState.playerCells = [];

    respawnEntities();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0]).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      score: 100,
      velocityX: 0,
      velocityY: 0
    });
  });

  test('does not respawn player when cells exist', () => {
    const existingCells = [
      { x: 100, y: 100, score: 200, velocityX: 5, velocityY: 3 }
    ];
    gameState.playerCells = existingCells;

    respawnEntities();

    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells).toEqual(existingCells);
  });

  test('respawns all entity types when all are missing', () => {
    respawnEntities();

    expect(gameState.food.length).toBe(100);
    expect(gameState.aiPlayers.length).toBe(10);
    expect(gameState.playerCells.length).toBe(1);
    expect(respawnAI).toHaveBeenCalledTimes(10);
  });

  test('sets correct position for respawned AI from findSafeSpawnLocation', () => {
    gameState.aiPlayers = [];

    respawnEntities();

    expect(gameState.aiPlayers.length).toBe(10);
    gameState.aiPlayers.forEach(ai => {
      expect(ai.x).toBeGreaterThanOrEqual(0);
      expect(ai.x).toBeLessThanOrEqual(2000);
      expect(ai.y).toBeGreaterThanOrEqual(0);
      expect(ai.y).toBeLessThanOrEqual(2000);
    });
  });
});
