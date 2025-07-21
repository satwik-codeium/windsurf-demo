import { getConfig } from './config.js';

export const gameState = {
    playerCells: [],
    playerName: 'Windsurf',
    camera: {
        x: 0,
        y: 0
    },
    food: [],
    aiPlayers: []
};

export async function initGameState() {
    const config = await getConfig();
    gameState.playerCells = [{
        x: config.world.size / 2,
        y: config.world.size / 2,
        score: config.gameplay.startingScore,
        velocityX: 0,
        velocityY: 0
    }];
}

export const mouse = { x: 0, y: 0 };
