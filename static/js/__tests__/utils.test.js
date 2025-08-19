import { getSize, getDistance, calculateCenterOfMass, getRandomPosition, findSafeSpawnLocation } from '../utils.js';

describe('getSize', () => {
  test('returns correct size for score 0', () => {
    expect(getSize(0)).toBe(20);  // sqrt(0) + 20
  });

  test('returns correct size for score 100', () => {
    expect(getSize(100)).toBe(30);  // sqrt(100) + 20
  });

  test('returns correct size for score 400', () => {
    expect(getSize(400)).toBe(40);  // sqrt(400) + 20
  });

  test('returns correct size for score 1', () => {
    expect(getSize(1)).toBe(21);  // sqrt(1) + 20
  });

  test('handles fractional scores', () => {
    expect(getSize(2.25)).toBeCloseTo(21.5);  // sqrt(2.25) + 20 = 1.5 + 20
  });

  test('handles very large scores', () => {
    expect(getSize(10000)).toBe(120);  // sqrt(10000) + 20 = 100 + 20
  });

  test('handles negative scores gracefully', () => {
    expect(getSize(-1)).toBeNaN();  // sqrt(-1) is NaN
  });
});

describe('getDistance', () => {
  test('returns 0 for same point', () => {
    const point = { x: 10, y: 10 };
    expect(getDistance(point, point)).toBe(0);
  });

  test('returns correct horizontal distance', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 3, y: 0 };
    expect(getDistance(point1, point2)).toBe(3);
  });

  test('returns correct vertical distance', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 0, y: 4 };
    expect(getDistance(point1, point2)).toBe(4);
  });

  test('returns correct diagonal distance', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 3, y: 4 };
    expect(getDistance(point1, point2)).toBe(5);  // 3-4-5 triangle
  });

  test('handles negative coordinates', () => {
    const point1 = { x: -3, y: -4 };
    const point2 = { x: 0, y: 0 };
    expect(getDistance(point1, point2)).toBe(5);
  });

  test('handles very large coordinate differences', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 1000, y: 1000 };
    expect(getDistance(point1, point2)).toBeCloseTo(1414.21, 2);
  });

  test('handles floating point coordinates', () => {
    const point1 = { x: 1.5, y: 2.5 };
    const point2 = { x: 4.5, y: 6.5 };
    expect(getDistance(point1, point2)).toBe(5);
  });
});

describe('calculateCenterOfMass', () => {
  test('returns center for single cell', () => {
    const cells = [{ x: 10, y: 20, score: 100 }];
    const center = calculateCenterOfMass(cells);
    expect(center).toEqual({ x: 10, y: 20 });
  });

  test('returns weighted center for multiple cells', () => {
    const cells = [
      { x: 0, y: 0, score: 100 },
      { x: 10, y: 10, score: 300 }
    ];
    const center = calculateCenterOfMass(cells);
    expect(center.x).toBeCloseTo(7.5);
    expect(center.y).toBeCloseTo(7.5);
  });

  test('returns {x: 0, y: 0} for empty cells array', () => {
    expect(calculateCenterOfMass([])).toEqual({ x: 0, y: 0 });
  });

  test('returns {x: 0, y: 0} for cells with zero total score', () => {
    const cells = [
      { x: 10, y: 20, score: 0 },
      { x: 30, y: 40, score: 0 }
    ];
    expect(calculateCenterOfMass(cells)).toEqual({ x: 0, y: 0 });
  });

  test('returns center for single cell with zero score', () => {
    const cells = [{ x: 15, y: 25, score: 0 }];
    expect(calculateCenterOfMass(cells)).toEqual({ x: 0, y: 0 });
  });

  test('handles mixed positive and zero scores', () => {
    const cells = [
      { x: 0, y: 0, score: 0 },
      { x: 10, y: 10, score: 100 },
      { x: 20, y: 20, score: 0 }
    ];
    const center = calculateCenterOfMass(cells);
    expect(center).toEqual({ x: 10, y: 10 });
  });

  test('handles very large score values', () => {
    const cells = [
      { x: 0, y: 0, score: 1000000 },
      { x: 100, y: 100, score: 1000000 }
    ];
    const center = calculateCenterOfMass(cells);
    expect(center).toEqual({ x: 50, y: 50 });
  });

  test('handles floating point precision in weighted calculations', () => {
    const cells = [
      { x: 1.1, y: 2.2, score: 33.3 },
      { x: 4.4, y: 5.5, score: 66.6 }
    ];
    const center = calculateCenterOfMass(cells);
    expect(center.x).toBeCloseTo(3.3, 5);
    expect(center.y).toBeCloseTo(4.4, 5);
  });
});

describe('getRandomPosition', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('returns object with x and y properties', () => {
    const position = getRandomPosition();
    expect(position).toHaveProperty('x');
    expect(position).toHaveProperty('y');
    expect(typeof position.x).toBe('number');
    expect(typeof position.y).toBe('number');
  });

  test('returns coordinates within world boundaries', () => {
    for (let i = 0; i < 100; i++) {
      const position = getRandomPosition();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThan(2000);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThan(2000);
    }
  });

  test('returns deterministic position when Math.random is mocked', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const position = getRandomPosition();
    expect(position).toEqual({ x: 1000, y: 1000 });
  });

  test('returns different positions on multiple calls', () => {
    const positions = [];
    for (let i = 0; i < 10; i++) {
      positions.push(getRandomPosition());
    }
    const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  test('returns corner positions when Math.random returns 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const position = getRandomPosition();
    expect(position).toEqual({ x: 0, y: 0 });
  });

  test('returns near-boundary positions when Math.random returns close to 1', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    const position = getRandomPosition();
    expect(position.x).toBeCloseTo(1998, 0);
    expect(position.y).toBeCloseTo(1998, 0);
  });
});

describe('findSafeSpawnLocation', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('returns position for empty game state', () => {
    const gameState = { aiPlayers: [], playerCells: [] };
    const position = findSafeSpawnLocation(gameState);
    expect(position).toHaveProperty('x');
    expect(position).toHaveProperty('y');
    expect(typeof position.x).toBe('number');
    expect(typeof position.y).toBe('number');
  });

  test('returns safe position away from single AI player', () => {
    const gameState = {
      aiPlayers: [{ x: 100, y: 100, score: 100 }],
      playerCells: []
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const position = findSafeSpawnLocation(gameState, 100);
    const distance = Math.sqrt((position.x - 100) ** 2 + (position.y - 100) ** 2);
    const requiredDistance = Math.sqrt(100) + 20 + 100;
    expect(distance).toBeGreaterThanOrEqual(requiredDistance);
  });

  test('returns safe position away from single player cell', () => {
    const gameState = {
      aiPlayers: [],
      playerCells: [{ x: 200, y: 200, score: 400 }]
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const position = findSafeSpawnLocation(gameState, 50);
    const distance = Math.sqrt((position.x - 200) ** 2 + (position.y - 200) ** 2);
    const requiredDistance = Math.sqrt(400) + 20 + 50;
    expect(distance).toBeGreaterThanOrEqual(requiredDistance);
  });

  test('uses custom minDistance parameter', () => {
    const gameState = {
      aiPlayers: [{ x: 500, y: 500, score: 100 }],
      playerCells: []
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.8);
    const position = findSafeSpawnLocation(gameState, 200);
    const distance = Math.sqrt((position.x - 500) ** 2 + (position.y - 500) ** 2);
    const requiredDistance = Math.sqrt(100) + 20 + 200;
    expect(distance).toBeGreaterThanOrEqual(requiredDistance);
  });

  test('uses default minDistance when not provided', () => {
    const gameState = {
      aiPlayers: [{ x: 300, y: 300, score: 100 }],
      playerCells: []
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.7);
    const position = findSafeSpawnLocation(gameState);
    const distance = Math.sqrt((position.x - 300) ** 2 + (position.y - 300) ** 2);
    const requiredDistance = Math.sqrt(100) + 20 + 100;
    expect(distance).toBeGreaterThanOrEqual(requiredDistance);
  });

  test('triggers fallback algorithm when no safe spots found', () => {
    const gameState = {
      aiPlayers: [
        { x: 1000, y: 1000, score: 10000 },
        { x: 500, y: 500, score: 10000 },
        { x: 1500, y: 1500, score: 10000 }
      ],
      playerCells: [
        { x: 250, y: 250, score: 10000 },
        { x: 1750, y: 1750, score: 10000 }
      ]
    };
    
    let callCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount <= 50) {
        return 0.5;
      }
      return 0.1;
    });

    const position = findSafeSpawnLocation(gameState, 50);
    expect(position).toHaveProperty('x');
    expect(position).toHaveProperty('y');
    expect(callCount).toBeGreaterThan(50);
  });

  test('fallback algorithm finds furthest position from entities', () => {
    const gameState = {
      aiPlayers: [{ x: 100, y: 100, score: 10000 }],
      playerCells: [{ x: 1900, y: 1900, score: 10000 }]
    };
    
    let callCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      if (callCount <= 50) {
        return 0.01;
      }
      if (callCount === 51) {
        return 0.5;
      }
      return 0.01;
    });

    const position = findSafeSpawnLocation(gameState, 50);
    expect(position).toHaveProperty('x');
    expect(position).toHaveProperty('y');
    expect(callCount).toBeGreaterThan(50);
    
    const allEntities = [...gameState.aiPlayers, ...gameState.playerCells];
    const minDistance = Math.min(...allEntities.map(entity => {
      return Math.sqrt((position.x - entity.x) ** 2 + (position.y - entity.y) ** 2);
    }));
    expect(minDistance).toBeGreaterThan(0);
  });

  test('handles game state with both AI players and player cells', () => {
    const gameState = {
      aiPlayers: [
        { x: 100, y: 100, score: 100 },
        { x: 1900, y: 1900, score: 100 }
      ],
      playerCells: [
        { x: 100, y: 1900, score: 100 },
        { x: 1900, y: 100, score: 100 }
      ]
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const position = findSafeSpawnLocation(gameState, 100);
    
    const allEntities = [...gameState.aiPlayers, ...gameState.playerCells];
    const minDistance = Math.min(...allEntities.map(entity => {
      const distance = Math.sqrt((position.x - entity.x) ** 2 + (position.y - entity.y) ** 2);
      return distance;
    }));
    const requiredDistance = Math.sqrt(100) + 20 + 100;
    expect(minDistance).toBeGreaterThanOrEqual(requiredDistance);
  });
});
