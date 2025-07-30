import numpy as np

def compute_product_of_world(WORLD_SIZE,NUM_AI_PLAYERS,NUM_FOOD):
    """
    Compute product of world size, number of AI players and food.
    
    Parameters
    ----------
    WORLD_SIZE : int
        The size of the world.
    NUM_AI_PLAYERS : int
        The number of AI players.
    NUM_FOOD : int
        The number of food.
    
    Returns
    -------
    product : int
        The product of the three parameters.
    """
    return np.prod([WORLD_SIZE,NUM_AI_PLAYERS,NUM_FOOD])
