import { getConfig } from './config.js';

let WORLD_SIZE;

export function getSize(score) {
    return Math.sqrt(score) + 20;
}

export async function getRandomPosition() {
    if (!WORLD_SIZE) {
        const config = await getConfig();
        WORLD_SIZE = config.world.size;
    }
    return {
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE
    };
}

export function getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function calculateCenterOfMass(cells) {
    const totalScore = cells.reduce((sum, cell) => sum + cell.score, 0);
    if (totalScore === 0) return { x: 0, y: 0 };
    
    return {
        x: cells.reduce((sum, cell) => sum + cell.x * cell.score, 0) / totalScore,
        y: cells.reduce((sum, cell) => sum + cell.y * cell.score, 0) / totalScore
    };
}

export async function findSafeSpawnLocation(gameState, minDistance = 100) {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const pos = await getRandomPosition();
        let isSafe = true;

        // Check distance from AI players
        for (const ai of gameState.aiPlayers) {
            const distance = getDistance(pos, ai);
            const safeDistance = getSize(ai.score) + minDistance;
            if (distance < safeDistance) {
                isSafe = false;
                break;
            }
        }

        // Check distance from player cells
        for (const cell of gameState.playerCells) {
            const distance = getDistance(pos, cell);
            const safeDistance = getSize(cell.score) + minDistance;
            if (distance < safeDistance) {
                isSafe = false;
                break;
            }
        }

        if (isSafe) {
            return pos;
        }

        attempts++;
    }

    // If no safe spot found after max attempts, find the spot furthest from all players
    let bestPos = getRandomPosition();
    let maxMinDistance = 0;

    for (let i = 0; i < 20; i++) {
        const pos = await getRandomPosition();
        let minDistanceToPlayer = Infinity;

        // Check distance to all players and cells
        [...gameState.aiPlayers, ...gameState.playerCells].forEach(entity => {
            const distance = getDistance(pos, entity);
            minDistanceToPlayer = Math.min(minDistanceToPlayer, distance);
        });

        if (minDistanceToPlayer > maxMinDistance) {
            maxMinDistance = minDistanceToPlayer;
            bestPos = pos;
        }
    }

    return bestPos;
}
