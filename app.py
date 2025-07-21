from flask import Flask, render_template, jsonify, request
import numpy as np
import json

app = Flask(__name__)

with open('config.json', 'r') as f:
    config = json.load(f)

WORLD_SIZE = config['WORLD_SIZE']
NUM_AI_PLAYERS = config['AI_COUNT']
NUM_FOOD = config['FOOD_COUNT']

@app.route('/')
def index():
    return render_template('game.html')

@app.route('/config')
def get_config():
    return jsonify(config)

@app.route('/game_state')
def game_state():
    # In a real implementation, this would update AI positions and return current game state
    return jsonify({'status': 'ok'})

@app.route('/update_player', methods=['POST'])
def update_player():
    # Handle player position updates
    data = request.get_json()
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True)
