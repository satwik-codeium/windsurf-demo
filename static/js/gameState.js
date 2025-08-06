import { WORLD_SIZE, STARTING_SCORE } from './config.js';

export const gameState = {
    playerCells: [{
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        score: STARTING_SCORE,
        velocityX: 0,
        velocityY: 0,
        lastFoodTime: Date.now(),
        createdTime: Date.now()
    }],
    playerName: 'Windsurf',
    camera: {
        x: 0,
        y: 0
    },
    food: [],
    aiPlayers: []
};

export const mouse = { x: 0, y: 0 };
