// Python Tetris - Main Game Controller
class GameController {
    constructor() {
        this.gameCanvas = document.getElementById('gameCanvas');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.startButton = document.getElementById('startButton');
        
        this.game = new TetrisGame(this.gameCanvas, this.nextCanvas);
        this.gameRunning = false;
        this.lastTime = 0;
        this.keys = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadHighScores();
        this.showStartScreen();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Start button
        this.startButton.addEventListener('click', () => this.startGame());
        
        // Touch controls for mobile
        this.setupTouchControls();
        
        // Window focus/blur for pause
        window.addEventListener('blur', () => this.handleWindowBlur());
        window.addEventListener('focus', () => this.handleWindowFocus());
    }
    
    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.gameCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        this.gameCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 50) {
                    this.game.movePiece(1, 0);
                } else if (deltaX < -50) {
                    this.game.movePiece(-1, 0);
                }
            } else {
                if (deltaY > 50) {
                    this.game.dropPiece();
                } else if (deltaY < -50) {
                    this.game.rotatePiece();
                }
            }
        });
    }
    
    handleKeyDown(e) {
        if (!this.gameRunning) return;
        
        this.keys[e.code] = true;
        
        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                this.game.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.game.movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.game.movePiece(0, 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.game.rotatePiece();
                break;
            case 'Space':
                e.preventDefault();
                this.game.dropPiece();
                break;
            case 'KeyP':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    handleWindowBlur() {
        if (this.gameRunning && !this.game.gameOver) {
            this.game.pause();
            this.showPauseScreen();
        }
    }
    
    handleWindowFocus() {
        // Resume game when window regains focus
    }
    
    startGame() {
        this.gameRunning = true;
        this.game.reset();
        this.hideOverlay();
        this.gameLoop();
        
        // Send new game to Python backend
        this.sendNewGameToBackend();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        const isPaused = this.game.pause();
        if (isPaused) {
            this.showPauseScreen();
        } else {
            this.hideOverlay();
        }
        
        // Send pause state to Python backend
        this.sendPauseToBackend(isPaused);
    }
    
    showStartScreen() {
        this.gameOverlay.style.display = 'flex';
        document.getElementById('overlayTitle').textContent = '🐍 PYTHON TETRIS 🐍';
        document.getElementById('overlayMessage').textContent = 'Press SPACE to start!';
        this.startButton.style.display = 'block';
    }
    
    showPauseScreen() {
        this.gameOverlay.style.display = 'flex';
        document.getElementById('overlayTitle').textContent = '⏸️ PAUSED ⏸️';
        document.getElementById('overlayMessage').textContent = 'Press P to resume';
        this.startButton.style.display = 'none';
    }
    
    showGameOverScreen() {
        this.gameOverlay.style.display = 'flex';
        document.getElementById('overlayTitle').textContent = '💀 GAME OVER 💀';
        document.getElementById('overlayMessage').textContent = `Final Score: ${this.game.score.toLocaleString()}`;
        this.startButton.textContent = 'PLAY AGAIN';
        this.startButton.style.display = 'block';
        
        // Save score to Python backend
        this.saveScoreToBackend();
    }
    
    hideOverlay() {
        this.gameOverlay.style.display = 'none';
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.game.update(deltaTime);
        
        // Check for game over
        if (this.game.gameOver) {
            this.gameRunning = false;
            this.showGameOverScreen();
            return;
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    // Python Backend Communication
    async sendNewGameToBackend() {
        try {
            const response = await fetch('/api/game/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('New game created on backend:', data);
            }
        } catch (error) {
            console.error('Error creating new game on backend:', error);
        }
    }
    
    async sendMoveToBackend(direction) {
        try {
            const response = await fetch('/api/game/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ direction: direction })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Update game state from backend if needed
                this.updateGameFromBackend(data);
            }
        } catch (error) {
            console.error('Error sending move to backend:', error);
        }
    }
    
    async sendPauseToBackend(paused) {
        try {
            const response = await fetch('/api/game/pause', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Pause state sent to backend:', data);
            }
        } catch (error) {
            console.error('Error sending pause to backend:', error);
        }
    }
    
    async saveScoreToBackend() {
        try {
            const playerName = prompt('Enter your name for the high score:') || 'Anonymous';
            
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player_name: playerName,
                    score: this.game.score
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateHighScores(data.high_scores);
                console.log('Score saved to backend:', data);
            }
        } catch (error) {
            console.error('Error saving score to backend:', error);
        }
    }
    
    async loadHighScores() {
        try {
            const response = await fetch('/api/scores');
            
            if (response.ok) {
                const data = await response.json();
                this.updateHighScores(data.high_scores);
            }
        } catch (error) {
            console.error('Error loading high scores:', error);
        }
    }
    
    updateHighScores(highScores) {
        const highScoresList = document.getElementById('highScoresList');
        highScoresList.innerHTML = '';
        
        highScores.slice(0, 5).forEach((score, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.textContent = `${index + 1}. ${score.player}: ${score.score.toLocaleString()}`;
            highScoresList.appendChild(scoreItem);
        });
    }
    
    updateGameFromBackend(gameState) {
        // Update local game state from backend if needed
        // This could be used for multiplayer or server-side validation
        if (gameState.board) {
            this.game.board = gameState.board;
        }
        if (gameState.score !== undefined) {
            this.game.score = gameState.score;
        }
        if (gameState.level !== undefined) {
            this.game.level = gameState.level;
        }
        if (gameState.lines !== undefined) {
            this.game.lines = gameState.lines;
        }
    }
    
    // Utility functions
    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Sound effects (placeholder for future implementation)
    playSound(soundType) {
        // Could implement sound effects here
        console.log(`Playing sound: ${soundType}`);
    }
    
    // Particle effects for line clears
    createParticleEffect(x, y, color) {
        // Could implement particle effects here
        console.log(`Creating particle effect at ${x}, ${y} with color ${color}`);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new GameController();
    
    // Make it globally accessible for debugging
    window.gameController = gameController;
    
    // Add some fun Easter eggs
    let konamiCode = [];
    const konamiSequence = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            console.log('🎉 Konami Code activated! 🎉');
            // Could add special effects here
            konamiCode = [];
        }
    });
    
    // Add some fun console messages
    console.log('🐍 Python Tetris loaded successfully! 🐍');
    console.log('🎮 Use arrow keys to move and rotate pieces');
    console.log('🚀 Built with Python Flask and modern web technologies');
    console.log('💡 Try the Konami code for a surprise!');
}); 