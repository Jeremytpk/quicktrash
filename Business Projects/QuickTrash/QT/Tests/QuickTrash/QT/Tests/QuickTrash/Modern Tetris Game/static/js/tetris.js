// Python Tetris - Core Game Logic
class TetrisGame {
    constructor(canvas, nextCanvas) {
        this.canvas = canvas;
        this.nextCanvas = nextCanvas;
        this.ctx = canvas.getContext('2d');
        this.nextCtx = nextCanvas.getContext('2d');
        
        this.blockSize = 30;
        this.boardWidth = 10;
        this.boardHeight = 20;
        this.board = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(0));
        
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        
        this.pieces = {
            'I': { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
            'O': { shape: [[1, 1], [1, 1]], color: '#ffff00' },
            'T': { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
            'S': { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
            'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
            'J': { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
            'L': { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff7f00' }
        };
        
        this.pieceRotations = {
            'I': [
                [[1, 1, 1, 1]],
                [[1], [1], [1], [1]]
            ],
            'O': [[[1, 1], [1, 1]]],
            'T': [
                [[0, 1, 0], [1, 1, 1]],
                [[1, 0], [1, 1], [1, 0]],
                [[1, 1, 1], [0, 1, 0]],
                [[0, 1], [1, 1], [0, 1]]
            ],
            'S': [
                [[0, 1, 1], [1, 1, 0]],
                [[1, 0], [1, 1], [0, 1]]
            ],
            'Z': [
                [[1, 1, 0], [0, 1, 1]],
                [[0, 1], [1, 1], [1, 0]]
            ],
            'J': [
                [[1, 0, 0], [1, 1, 1]],
                [[1, 1], [1, 0], [1, 0]],
                [[1, 1, 1], [0, 0, 1]],
                [[0, 1], [0, 1], [1, 1]]
            ],
            'L': [
                [[0, 0, 1], [1, 1, 1]],
                [[1, 0], [1, 0], [1, 1]],
                [[1, 1, 1], [1, 0, 0]],
                [[1, 1], [0, 1], [0, 1]]
            ]
        };
        
        this.init();
    }
    
    init() {
        this.clearBoard();
        this.drawBoard();
        this.newPiece();
        this.updateDisplay();
    }
    
    clearBoard() {
        this.board = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(0));
    }
    
    newPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.getRandomPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();
        
        // Check if new piece can be placed
        if (!this.isValidPosition(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.gameOver = true;
        }
    }
    
    getRandomPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        const piece = this.pieces[type];
        
        return {
            type: type,
            shape: piece.shape,
            color: piece.color,
            x: Math.floor(this.boardWidth / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0,
            rotationIndex: 0
        };
    }
    
    isValidPosition(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= this.boardWidth || 
                        newY >= this.boardHeight || 
                        (newY >= 0 && this.board[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    rotatePiece() {
        if (!this.currentPiece) return false;
        
        const rotations = this.pieceRotations[this.currentPiece.type];
        const nextRotation = (this.currentPiece.rotationIndex + 1) % rotations.length;
        const newShape = rotations[nextRotation];
        
        if (this.isValidPosition(newShape, this.currentPiece.x, this.currentPiece.y)) {
            this.currentPiece.shape = newShape;
            this.currentPiece.rotationIndex = nextRotation;
            return true;
        }
        return false;
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return false;
        
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (this.isValidPosition(this.currentPiece.shape, newX, newY)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            return true;
        }
        return false;
    }
    
    dropPiece() {
        if (!this.currentPiece) return false;
        
        while (this.movePiece(0, 1)) {
            // Keep moving down until it can't
        }
        this.lockPiece();
        return true;
    }
    
    lockPiece() {
        if (!this.currentPiece) return;
        
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const boardY = this.currentPiece.y + row;
                    const boardX = this.currentPiece.x + col;
                    
                    if (boardY >= 0 && boardY < this.boardHeight && 
                        boardX >= 0 && boardX < this.boardWidth) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.newPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let row = this.boardHeight - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(this.boardWidth).fill(0));
                linesCleared++;
                row++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            
            // Add visual feedback for line clear
            this.showLineClearEffect(linesCleared);
        }
    }
    
    showLineClearEffect(linesCleared) {
        // Add a brief flash effect
        const flashDuration = 200;
        const originalBoard = this.board.map(row => [...row]);
        
        // Flash white
        setTimeout(() => {
            this.board = this.board.map(row => row.map(() => '#ffffff'));
            this.drawBoard();
        }, 0);
        
        // Return to normal
        setTimeout(() => {
            this.board = originalBoard;
            this.drawBoard();
        }, flashDuration);
    }
    
    update(deltaTime) {
        if (this.gameOver || this.paused) return;
        
        this.dropTime += deltaTime;
        
        if (this.dropTime >= this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.dropTime = 0;
        }
        
        this.drawBoard();
        this.drawNextPiece();
        this.updateDisplay();
    }
    
    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.boardWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.boardHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }
        
        // Draw placed pieces
        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }
    }
    
    drawPiece(piece) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    this.drawBlock(piece.x + col, piece.y + row, piece.color);
                }
            }
        }
    }
    
    drawBlock(x, y, color) {
        const pixelX = x * this.blockSize;
        const pixelY = y * this.blockSize;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, this.blockSize - 2, this.blockSize - 2);
        
        // Highlight
        this.ctx.fillStyle = this.lightenColor(color, 0.3);
        this.ctx.fillRect(pixelX + 1, pixelY + 1, this.blockSize - 2, 3);
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 3, this.blockSize - 2);
        
        // Shadow
        this.ctx.fillStyle = this.darkenColor(color, 0.3);
        this.ctx.fillRect(pixelX + this.blockSize - 4, pixelY + 1, 3, this.blockSize - 2);
        this.ctx.fillRect(pixelX + 1, pixelY + this.blockSize - 4, this.blockSize - 2, 3);
    }
    
    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!this.nextPiece) return;
        
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
        
        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col]) {
                    const x = offsetX + col * blockSize;
                    const y = offsetY + row * blockSize;
                    
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                    
                    // Highlight
                    this.nextCtx.fillStyle = this.lightenColor(this.nextPiece.color, 0.3);
                    this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, 2);
                    this.nextCtx.fillRect(x + 1, y + 1, 2, blockSize - 2);
                }
            }
        }
    }
    
    lightenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    reset() {
        this.clearBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.init();
    }
    
    pause() {
        this.paused = !this.paused;
        return this.paused;
    }
    
    getGameState() {
        return {
            board: this.board,
            currentPiece: this.currentPiece,
            nextPiece: this.nextPiece,
            score: this.score,
            level: this.level,
            lines: this.lines,
            gameOver: this.gameOver,
            paused: this.paused
        };
    }
} 