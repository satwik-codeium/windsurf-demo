let config = null;

export async function loadConfig() {
    if (!config) {
        try {
            const response = await fetch('/config');
            config = await response.json();
        } catch (error) {
            console.error('Failed to load config, using defaults:', error);
            config = {
                world: { size: 2000 },
                entities: { aiCount: 10, foodCount: 100 },
                gameplay: { startingScore: 100, aiStartingScore: 50, foodScore: 10, collisionThreshold: 1.1, minSplitScore: 40, splitVelocity: 12, maxPlayerCells: 16, splitCooldown: 5000, mergeDistance: 2, mergeCooldown: 10000, mergeForce: 0.3, mergeStartForce: 0.1 },
                rendering: { foodSize: 5, colors: { player: "#008080", minimap: { player: "#4CAF50", topPlayer: "#FFC107", other: "rgba(255, 255, 255, 0.3)" } } }
            };
        }
    }
    return config;
}

export async function updateConfig(newConfig) {
    try {
        const response = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        if (response.ok) {
            config = newConfig;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to update config:', error);
        return false;
    }
}
