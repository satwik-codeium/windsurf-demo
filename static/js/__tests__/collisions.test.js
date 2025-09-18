import { handleFoodCollisions, handlePlayerAICollisions, handleAIAICollisions, respawnEntities } from '../collisions.js';
import { gameState } from '../gameState.js';
import { getSize } from '../utils.js';

// Mock gameState
jest.mock('../gameState.js', () => ({
  gameState: {
    playerCells: [],
    aiPlayers: [],
    food: []
  }
}));

describe('handleFoodCollisions', () => {
  beforeEach(() => {
    // Reset gameState before each test
    gameState.playerCells = [];
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
    expect(gameState.aiPlayers[0].score).toBe(110);
  });

  test('food remains when not overlapping with AI', () => {
    gameState.aiPlayers = [{ x: 100, y: 100, score: 100 }];
    gameState.food = [{ x: 500, y: 500 }];

    handleFoodCollisions();

    expect(gameState.food.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(100);
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

  test('second AI consumes first AI when larger', () => {
    const ai1 = { x: 100, y: 100, score: 100 };
    const ai2 = { x: 100, y: 100, score: 400 };

    gameState.aiPlayers = [ai1, ai2];

    handleAIAICollisions();

    expect(gameState.aiPlayers.length).toBe(1);
    expect(gameState.aiPlayers[0].score).toBe(600);
  });
});

describe('respawnEntities', () => {
  beforeEach(() => {
    gameState.food = [];
    gameState.aiPlayers = [];
    gameState.playerCells = [];
  });

  test('respawns food when below minimum count', () => {
    gameState.food = Array(50).fill().map(() => ({ x: 100, y: 100, color: 'red' }));
    
    respawnEntities();
    
    expect(gameState.food.length).toBe(100);
  });

  test('respawns AI players when below minimum count', () => {
    gameState.aiPlayers = Array(5).fill().map(() => ({ x: 100, y: 100, score: 50 }));
    
    respawnEntities();
    
    expect(gameState.aiPlayers.length).toBe(10);
  });

  test('respawns player cell when none exist', () => {
    gameState.playerCells = [];
    
    respawnEntities();
    
    expect(gameState.playerCells.length).toBe(1);
    expect(gameState.playerCells[0].score).toBe(100);
  });

  test('does not respawn when counts are sufficient', () => {
    gameState.food = Array(100).fill().map(() => ({ x: 100, y: 100, color: 'red' }));
    gameState.aiPlayers = Array(10).fill().map(() => ({ x: 100, y: 100, score: 50 }));
    gameState.playerCells = [{ x: 100, y: 100, score: 100 }];
    
    respawnEntities();
    
    expect(gameState.food.length).toBe(100);
    expect(gameState.aiPlayers.length).toBe(10);
    expect(gameState.playerCells.length).toBe(1);
  });
});
