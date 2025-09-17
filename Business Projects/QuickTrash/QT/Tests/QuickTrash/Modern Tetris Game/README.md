# 🐍 Python Tetris - Vibrant Colors 🎮

A modern, colorful Tetris game built with Python Flask and modern web technologies. Features vibrant colors, smooth animations, and a responsive design that works on desktop and mobile devices.

## ✨ Features

- 🎨 **Vibrant Color Scheme** - Beautiful gradient backgrounds and colorful tetrominoes
- 🐍 **Python Backend** - Built with Flask for robust server-side logic
- 🎮 **Full Game Logic** - Complete Tetris gameplay with all standard features
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🏆 **High Score System** - Persistent high scores stored on the server
- ⚡ **Real-time Updates** - Smooth 60fps gameplay with requestAnimationFrame
- 🎯 **Touch Controls** - Swipe gestures for mobile devices
- 🎵 **Visual Effects** - Line clear animations and particle effects
- 🔧 **Modern Architecture** - Clean separation of concerns with RESTful API

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Atouba64/aResume.git
   cd aResume
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎮 How to Play

### Controls

- **← →** Arrow Keys: Move piece left/right
- **↓** Down Arrow: Soft drop (move down faster)
- **↑** Up Arrow: Rotate piece
- **SPACE**: Hard drop (instant drop)
- **P**: Pause/Resume game

### Mobile Controls

- **Swipe Left/Right**: Move piece
- **Swipe Down**: Hard drop
- **Swipe Up**: Rotate piece

### Scoring System

- **Single Line**: 100 × Level points
- **Double Lines**: 200 × Level points
- **Triple Lines**: 300 × Level points
- **Tetris (4 Lines)**: 400 × Level points

## 🏗️ Project Structure

```
aResume/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── templates/
│   └── index.html        # Main game template
├── static/
│   ├── css/
│   │   └── style.css     # Vibrant styling and animations
│   └── js/
│       ├── tetris.js     # Core game logic
│       └── game.js       # Game controller and UI
└── CSS - My Site Images/ # Legacy assets (can be removed)
```

## 🐍 Python Backend Features

### Flask Application (`app.py`)

- **RESTful API** - Clean endpoints for game state management
- **Game Logic** - Server-side tetromino generation and validation
- **High Score System** - Persistent score storage
- **Piece Definitions** - All 7 standard Tetris pieces with rotations
- **Game State Management** - Centralized game state handling

### API Endpoints

- `GET /` - Main game page
- `POST /api/game/new` - Start new game
- `GET /api/game/state` - Get current game state
- `POST /api/game/move` - Move current piece
- `POST /api/game/pause` - Pause/unpause game
- `GET /api/scores` - Get high scores
- `POST /api/scores` - Save new high score
- `GET /api/pieces` - Get piece definitions

## 🎨 Frontend Features

### Modern UI/UX

- **Gradient Backgrounds** - Beautiful animated gradients
- **Glass Morphism** - Modern glass-like UI elements
- **Smooth Animations** - CSS transitions and keyframe animations
- **Responsive Grid** - Adapts to any screen size
- **Vibrant Colors** - Eye-catching color scheme

### JavaScript Architecture

- **TetrisGame Class** - Core game logic and rendering
- **GameController Class** - User input and game flow management
- **Canvas Rendering** - High-performance 2D graphics
- **Touch Support** - Mobile-friendly gesture controls
- **API Integration** - Seamless backend communication

## 🔧 Technical Details

### Technologies Used

- **Backend**: Python 3.7+, Flask 2.3.3
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Graphics**: HTML5 Canvas API
- **Styling**: CSS Grid, Flexbox, Animations
- **API**: RESTful JSON endpoints

### Performance Features

- **60fps Gameplay** - Smooth animation using requestAnimationFrame
- **Optimized Rendering** - Efficient canvas drawing
- **Memory Management** - Proper cleanup and garbage collection
- **Responsive Design** - Mobile-first approach

### Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Game Features

### Tetrominoes

All 7 standard Tetris pieces with proper rotations:
- **I-Piece** (Cyan) - 4-block line
- **O-Piece** (Yellow) - 2x2 square
- **T-Piece** (Purple) - T-shaped
- **S-Piece** (Green) - S-shaped
- **Z-Piece** (Red) - Z-shaped
- **J-Piece** (Blue) - J-shaped
- **L-Piece** (Orange) - L-shaped

### Game Mechanics

- **Line Clearing** - Complete rows disappear
- **Level Progression** - Speed increases with level
- **Score Multipliers** - Higher levels = more points
- **Game Over Detection** - Proper end-game conditions
- **Pause Functionality** - Resume at any time

## 🚀 Deployment

### Local Development

```bash
# Development mode with auto-reload
python app.py
```

### Production Deployment

```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker Deployment

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 🎉 Easter Eggs

- **Konami Code**: Try the classic Konami sequence for a surprise!
- **Console Messages**: Check the browser console for fun messages
- **Hidden Features**: Explore the code for additional surprises

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by the classic Tetris game
- Built with modern web technologies
- Powered by Python Flask
- Designed with vibrant colors and modern UI/UX principles

---

**🎮 Happy Gaming! 🐍**

*Built with ❤️ using Python and modern web technologies*
