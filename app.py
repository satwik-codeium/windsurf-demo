from flask import Flask, render_template, jsonify, request
import numpy as np
import json
import os

app = Flask(__name__)

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

def save_config(config):
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

config = load_config()
WORLD_SIZE = config['world']['size']
NUM_AI_PLAYERS = config['entities']['aiCount']
NUM_FOOD = config['entities']['foodCount']

@app.route('/')
def index():
    return render_template('game.html')

@app.route('/game_state')
def game_state():
    # In a real implementation, this would update AI positions and return current game state
    return jsonify({'status': 'ok'})

@app.route('/update_player', methods=['POST'])
def update_player():
    # Handle player position updates
    data = request.get_json()
    return jsonify({'status': 'ok'})

@app.route('/config')
def get_config():
    return jsonify(load_config())

@app.route('/config', methods=['POST'])
def update_config():
    try:
        new_config = request.get_json()
        if (new_config['world']['size'] < 500 or new_config['world']['size'] > 5000 or
            new_config['entities']['aiCount'] < 1 or new_config['entities']['aiCount'] > 50 or
            new_config['entities']['foodCount'] < 10 or new_config['entities']['foodCount'] > 500):
            return jsonify({'error': 'Invalid configuration values'}), 400
        
        save_config(new_config)
        global config, WORLD_SIZE, NUM_AI_PLAYERS, NUM_FOOD
        config = new_config
        WORLD_SIZE = config['world']['size']
        NUM_AI_PLAYERS = config['entities']['aiCount']
        NUM_FOOD = config['entities']['foodCount']
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
