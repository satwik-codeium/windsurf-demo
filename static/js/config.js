import { loadConfig } from './configLoader.js';

let config = null;

async function ensureConfig() {
    if (!config) {
        config = await loadConfig();
    }
    return config;
}

export const getConfig = async () => await ensureConfig();

export let WORLD_SIZE, FOOD_SIZE, STARTING_SCORE, AI_STARTING_SCORE, FOOD_SCORE, FOOD_COUNT, AI_COUNT, COLLISION_THRESHOLD;
export let MIN_SPLIT_SCORE, SPLIT_VELOCITY, MAX_PLAYER_CELLS, SPLIT_COOLDOWN, MERGE_DISTANCE;
export let MERGE_COOLDOWN, MERGE_FORCE, MERGE_START_FORCE, COLORS;

export async function initConfig() {
    const cfg = await ensureConfig();
    WORLD_SIZE = cfg.world.size;
    FOOD_SIZE = cfg.rendering.foodSize;
    STARTING_SCORE = cfg.gameplay.startingScore;
    AI_STARTING_SCORE = cfg.gameplay.aiStartingScore;
    FOOD_SCORE = cfg.gameplay.foodScore;
    FOOD_COUNT = cfg.entities.foodCount;
    AI_COUNT = cfg.entities.aiCount;
    COLLISION_THRESHOLD = cfg.gameplay.collisionThreshold;
    MIN_SPLIT_SCORE = cfg.gameplay.minSplitScore;
    SPLIT_VELOCITY = cfg.gameplay.splitVelocity;
    MAX_PLAYER_CELLS = cfg.gameplay.maxPlayerCells;
    SPLIT_COOLDOWN = cfg.gameplay.splitCooldown;
    MERGE_DISTANCE = cfg.gameplay.mergeDistance;
    MERGE_COOLDOWN = cfg.gameplay.mergeCooldown;
    MERGE_FORCE = cfg.gameplay.mergeForce;
    MERGE_START_FORCE = cfg.gameplay.mergeStartForce;
    COLORS = cfg.rendering.colors;
}
