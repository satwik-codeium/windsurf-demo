interface Position {
    x: number;
    y: number;
}

interface PlayerCell extends Position {
    score: number;
    velocityX: number;
    velocityY: number;
    splitTime?: number;
}

interface AIPlayer extends Position {
    score: number;
    color: string;
    direction: number;
    name: string;
}

interface Food extends Position {
    color: string;
}

interface GameState {
    playerCells: PlayerCell[];
    aiPlayers: AIPlayer[];
    food: Food[];
}

import { gameState } from './gameState.js';
import { getDistance, getSize, getRandomPosition, findSafeSpawnLocation } from './utils.js';
import { FOOD_SIZE, FOOD_SCORE, COLLISION_THRESHOLD, FOOD_COUNT, AI_COUNT, STARTING_SCORE, WORLD_SIZE } from './config.js';
import { respawnAI } from './entities.js';

const typedGameState = gameState as GameState;

export function handleFoodCollisions(): void {
    for (const playerCell of typedGameState.playerCells) {
        typedGameState.food = typedGameState.food.filter((food: Food) => {
            const distance: number = getDistance(playerCell, food);
            const playerSize: number = getSize(playerCell.score);

            if (distance < playerSize + FOOD_SIZE) {
                playerCell.score += FOOD_SCORE;
                return false;
            }
            return true;
        });
    }

    for (const ai of typedGameState.aiPlayers) {
        typedGameState.food = typedGameState.food.filter((food: Food) => {
            const distance: number = getDistance(ai, food);
            const aiSize: number = getSize(ai.score);

            if (distance < aiSize + FOOD_SIZE) {
                ai.score += FOOD_SCORE;
                return false;
            }
            return true;
        });
    }
}

export function handlePlayerAICollisions(): void {
    const aiIndicesToRemove = new Set<number>();
    const playerCellsToRemove = new Set<number>();
    const scoreGains = new Map<number, number>();

    typedGameState.playerCells.forEach((playerCell: PlayerCell, playerCellIndex: number) => {
        typedGameState.aiPlayers.forEach((ai: AIPlayer, aiIndex: number) => {
            if (aiIndicesToRemove.has(aiIndex)) return;
            if (playerCellsToRemove.has(playerCellIndex)) return;

            const distance: number = getDistance(playerCell, ai);
            const playerSize: number = getSize(playerCell.score);
            const aiSize: number = getSize(ai.score);
            const minDistance: number = playerSize + aiSize;

            if (distance < minDistance) {
                if (playerSize > aiSize * COLLISION_THRESHOLD) {
                    const currentGain: number = scoreGains.get(playerCellIndex) || 0;
                    scoreGains.set(playerCellIndex, currentGain + ai.score + 100);
                    aiIndicesToRemove.add(aiIndex);
                }
                else if (aiSize > playerSize * COLLISION_THRESHOLD) {
                    ai.score += playerCell.score + 100;
                    playerCellsToRemove.add(playerCellIndex);
                }
            }
        });
    });

    [...aiIndicesToRemove].sort((a: number, b: number) => b - a).forEach((index: number) => {
        typedGameState.aiPlayers.splice(index, 1);
    });

    scoreGains.forEach((gain: number, cellIndex: number) => {
        if (!playerCellsToRemove.has(cellIndex)) {
            typedGameState.playerCells[cellIndex].score += gain;
        }
    });

    [...playerCellsToRemove].sort((a: number, b: number) => b - a).forEach((index: number) => {
        typedGameState.playerCells.splice(index, 1);
    });

    if (typedGameState.playerCells.length === 0) {
        const safePos: Position = findSafeSpawnLocation(typedGameState);
        typedGameState.playerCells.push({
            x: safePos.x,
            y: safePos.y,
            score: STARTING_SCORE,
            velocityX: 0,
            velocityY: 0
        });
    }
}

export function handleAIAICollisions(): void {
    const aisToRemove = new Set<number>();
    const scoreGains = new Map<number, number>();

    for (let i = 0; i < typedGameState.aiPlayers.length; i++) {
        if (aisToRemove.has(i)) continue;

        for (let j = i + 1; j < typedGameState.aiPlayers.length; j++) {
            if (aisToRemove.has(j)) continue;

            const ai1: AIPlayer = typedGameState.aiPlayers[i];
            const ai2: AIPlayer = typedGameState.aiPlayers[j];
            
            const distance: number = getDistance(ai1, ai2);
            const ai1Size: number = getSize(ai1.score);
            const ai2Size: number = getSize(ai2.score);
            const minDistance: number = ai1Size + ai2Size;

            if (distance < minDistance) {
                if (ai1Size > ai2Size * COLLISION_THRESHOLD) {
                    const currentGain: number = scoreGains.get(i) || 0;
                    scoreGains.set(i, currentGain + ai2.score + 100);
                    aisToRemove.add(j);
                } else if (ai2Size > ai1Size * COLLISION_THRESHOLD) {
                    const currentGain: number = scoreGains.get(j) || 0;
                    scoreGains.set(j, currentGain + ai1.score + 100);
                    aisToRemove.add(i);
                    break;
                }
            }
        }
    }

    scoreGains.forEach((gain: number, aiIndex: number) => {
        if (!aisToRemove.has(aiIndex)) {
            typedGameState.aiPlayers[aiIndex].score += gain;
        }
    });

    [...aisToRemove].sort((a: number, b: number) => b - a).forEach((index: number) => {
        typedGameState.aiPlayers.splice(index, 1);
    });
}

export function respawnEntities(): void {
    while (typedGameState.food.length < FOOD_COUNT) {
        const pos: Position = getRandomPosition();
        typedGameState.food.push({
            x: pos.x,
            y: pos.y,
            color: `hsl(${Math.random() * 360}, 50%, 50%)`
        });
    }

    while (typedGameState.aiPlayers.length < AI_COUNT) {
        const safePos: Position = findSafeSpawnLocation(typedGameState);
        const newAI: AIPlayer = respawnAI();
        newAI.x = safePos.x;
        newAI.y = safePos.y;
        typedGameState.aiPlayers.push(newAI);
    }

    if (typedGameState.playerCells.length === 0) {
        const safePos: Position = findSafeSpawnLocation(typedGameState);
        typedGameState.playerCells.push({
            x: safePos.x,
            y: safePos.y,
            score: STARTING_SCORE,
            velocityX: 0,
            velocityY: 0
        });
    }
}
