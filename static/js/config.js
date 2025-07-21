let WORLD_SIZE = 2000;
let AI_COUNT = 10;
let FOOD_COUNT = 100;

let configLoaded = false;
export const loadConfig = async () => {
    if (configLoaded) return;
    try {
        const response = await fetch('/config');
        const config = await response.json();
        WORLD_SIZE = config.WORLD_SIZE;
        AI_COUNT = config.AI_COUNT;
        FOOD_COUNT = config.FOOD_COUNT;
        configLoaded = true;
    } catch (error) {
        console.warn('Failed to load shared config, using defaults:', error);
    }
};

export { WORLD_SIZE, AI_COUNT, FOOD_COUNT };
export const FOOD_SIZE = 5;
export const STARTING_SCORE = 100;
export const AI_STARTING_SCORE = 50;
export const FOOD_SCORE = 10;
export const COLLISION_THRESHOLD = 1.1;

// Split mechanics
export const MIN_SPLIT_SCORE = 40;
export const SPLIT_VELOCITY = 12;
export const MAX_PLAYER_CELLS = 16;
export const SPLIT_COOLDOWN = 5000;
export const MERGE_DISTANCE = 2;

// Merge mechanics
export const MERGE_COOLDOWN = 10000;
export const MERGE_FORCE = 0.3;
export const MERGE_START_FORCE = 0.1;

export const COLORS = {
    PLAYER: '#008080',
    MINIMAP: {
        PLAYER: '#4CAF50',
        TOP_PLAYER: '#FFC107',
        OTHER: 'rgba(255, 255, 255, 0.3)'
    }
};
