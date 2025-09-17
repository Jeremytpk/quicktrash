from flask import Flask, render_template, jsonify, request
import json
import os
from datetime import datetime
import random

app = Flask(__name__)

# Game state storage (in production, use a proper database)
GAME_STATE = {
    'high_scores': [],
    'current_game': None
}

# Tetris piece definitions
TETROMINOES = {
    'I': {
        'shape': [[1, 1, 1, 1]],
        'color': '#00f5ff',  # Cyan
        'rotations': [
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]]
        ]
    },
    'O': {
        'shape': [[1, 1], [1, 1]],
        'color': '#ffff00',  # Yellow
        'rotations': [[[1, 1], [1, 1]]]
    },
    'T': {
        'shape': [[0, 1, 0], [1, 1, 1]],
        'color': '#a000f0',  # Purple
        'rotations': [
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]]
        ]
    },
    'S': {
        'shape': [[0, 1, 1], [1, 1, 0]],
        'color': '#00f000',  # Green
        'rotations': [
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]]
        ]
    },
    'Z': {
        'shape': [[1, 1, 0], [0, 1, 1]],
        'color': '#f00000',  # Red
        'rotations': [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ]
    },
    'J': {
        'shape': [[1, 0, 0], [1, 1, 1]],
        'color': '#0000f0',  # Blue
        'rotations': [
            [[1, 0, 0], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[0, 1], [0, 1], [1, 1]]
        ]
    },
    'L': {
        'shape': [[0, 0, 1], [1, 1, 1]],
        'color': '#ff7f00',  # Orange
        'rotations': [
            [[0, 0, 1], [1, 1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1], [0, 1], [0, 1]]
        ]
    }
}

class TetrisGame:
    def __init__(self):
        self.board_width = 10
        self.board_height = 20
        self.board = [[0 for _ in range(self.board_width)] for _ in range(self.board_height)]
        self.current_piece = None
        self.next_piece = None
        self.score = 0
        self.level = 1
        self.lines_cleared = 0
        self.game_over = False
        self.paused = False
        
    def new_piece(self):
        if not self.next_piece:
            self.next_piece = self.get_random_piece()
        self.current_piece = self.next_piece
        self.next_piece = self.get_random_piece()
        
        # Check if new piece can be placed
        if not self.is_valid_position(self.current_piece['shape'], self.current_piece['x'], self.current_piece['y']):
            self.game_over = True
            
    def get_random_piece(self):
        piece_type = random.choice(list(TETROMINOES.keys()))
        piece_data = TETROMINOES[piece_type]
        return {
            'type': piece_type,
            'shape': piece_data['shape'],
            'color': piece_data['color'],
            'x': self.board_width // 2 - len(piece_data['shape'][0]) // 2,
            'y': 0,
            'rotations': piece_data['rotations'],
            'rotation_index': 0
        }
    
    def is_valid_position(self, shape, x, y):
        for row_idx, row in enumerate(shape):
            for col_idx, cell in enumerate(row):
                if cell:
                    new_x = x + col_idx
                    new_y = y + row_idx
                    
                    if (new_x < 0 or new_x >= self.board_width or 
                        new_y >= self.board_height or 
                        (new_y >= 0 and self.board[new_y][new_x])):
                        return False
        return True
    
    def rotate_piece(self):
        if not self.current_piece:
            return False
            
        current_rotation = self.current_piece['rotation_index']
        rotations = self.current_piece['rotations']
        next_rotation = (current_rotation + 1) % len(rotations)
        
        new_shape = rotations[next_rotation]
        if self.is_valid_position(new_shape, self.current_piece['x'], self.current_piece['y']):
            self.current_piece['shape'] = new_shape
            self.current_piece['rotation_index'] = next_rotation
            return True
        return False
    
    def move_piece(self, dx, dy):
        if not self.current_piece:
            return False
            
        new_x = self.current_piece['x'] + dx
        new_y = self.current_piece['y'] + dy
        
        if self.is_valid_position(self.current_piece['shape'], new_x, new_y):
            self.current_piece['x'] = new_x
            self.current_piece['y'] = new_y
            return True
        return False
    
    def drop_piece(self):
        if not self.current_piece:
            return False
            
        while self.move_piece(0, 1):
            pass
        self.lock_piece()
        return True
    
    def lock_piece(self):
        if not self.current_piece:
            return
            
        for row_idx, row in enumerate(self.current_piece['shape']):
            for col_idx, cell in enumerate(row):
                if cell:
                    board_y = self.current_piece['y'] + row_idx
                    board_x = self.current_piece['x'] + col_idx
                    if 0 <= board_y < self.board_height and 0 <= board_x < self.board_width:
                        self.board[board_y][board_x] = self.current_piece['color']
        
        self.clear_lines()
        self.new_piece()
    
    def clear_lines(self):
        lines_to_clear = []
        for y in range(self.board_height):
            if all(self.board[y]):
                lines_to_clear.append(y)
        
        for y in lines_to_clear:
            del self.board[y]
            self.board.insert(0, [0 for _ in range(self.board_width)])
        
        if lines_to_clear:
            self.lines_cleared += len(lines_to_clear)
            self.score += len(lines_to_clear) * 100 * self.level
            self.level = self.lines_cleared // 10 + 1
    
    def get_game_state(self):
        return {
            'board': self.board,
            'current_piece': self.current_piece,
            'next_piece': self.next_piece,
            'score': self.score,
            'level': self.level,
            'lines_cleared': self.lines_cleared,
            'game_over': self.game_over,
            'paused': self.paused
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/game/new', methods=['POST'])
def new_game():
    global GAME_STATE
    GAME_STATE['current_game'] = TetrisGame()
    GAME_STATE['current_game'].new_piece()
    return jsonify({'status': 'success', 'game_state': GAME_STATE['current_game'].get_game_state()})

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    if GAME_STATE['current_game']:
        return jsonify(GAME_STATE['current_game'].get_game_state())
    return jsonify({'error': 'No active game'})

@app.route('/api/game/move', methods=['POST'])
def move_piece():
    data = request.get_json()
    direction = data.get('direction')
    
    if not GAME_STATE['current_game'] or GAME_STATE['current_game'].game_over:
        return jsonify({'error': 'No active game'})
    
    game = GAME_STATE['current_game']
    
    if direction == 'left':
        game.move_piece(-1, 0)
    elif direction == 'right':
        game.move_piece(1, 0)
    elif direction == 'down':
        game.move_piece(0, 1)
    elif direction == 'drop':
        game.drop_piece()
    elif direction == 'rotate':
        game.rotate_piece()
    
    return jsonify(game.get_game_state())

@app.route('/api/game/pause', methods=['POST'])
def pause_game():
    if GAME_STATE['current_game']:
        GAME_STATE['current_game'].paused = not GAME_STATE['current_game'].paused
        return jsonify({'paused': GAME_STATE['current_game'].paused})
    return jsonify({'error': 'No active game'})

@app.route('/api/scores', methods=['GET', 'POST'])
def handle_scores():
    global GAME_STATE
    
    if request.method == 'POST':
        data = request.get_json()
        score = data.get('score', 0)
        player_name = data.get('player_name', 'Anonymous')
        
        new_score = {
            'player': player_name,
            'score': score,
            'date': datetime.now().isoformat()
        }
        
        GAME_STATE['high_scores'].append(new_score)
        GAME_STATE['high_scores'].sort(key=lambda x: x['score'], reverse=True)
        GAME_STATE['high_scores'] = GAME_STATE['high_scores'][:10]  # Keep top 10
        
        return jsonify({'status': 'success', 'high_scores': GAME_STATE['high_scores']})
    
    return jsonify({'high_scores': GAME_STATE['high_scores']})

@app.route('/api/pieces', methods=['GET'])
def get_pieces():
    return jsonify(TETROMINOES)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 