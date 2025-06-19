# 🔥 DOOM CLONE 3D

A browser-based retro first-person shooter inspired by the classic DOOM, built with Three.js and modern web technologies.

![Game Screenshot](https://img.shields.io/badge/Status-Playable-green) ![License](https://img.shields.io/badge/License-MIT-blue) ![Platform](https://img.shields.io/badge/Platform-Web%20Browser-orange)

## 🎮 Features

• **🎯 Classic First-Person Shooter** - WASD controls, mouse look, instant action  
• **🗺️ Procedural Levels** - Unique maps every time with custom seed sharing  
• **👹 Survive the Invasion** - Destroy enemy spawn portals, collect health & shields  
• **🎮 No Downloads** - Play instantly in any modern web browser  
• **🧭 Smart Minimap** - Navigate complex multi-room dungeons with ease  
• **🎵 Immersive Audio** - Dynamic sound effects and atmospheric music  
• **🏆 Complete Experience** - Menu, HUD, victory conditions, and scoring system  

**Pure retro shooting action - no installation required!**

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/doom-clone-3d.git
   cd doom-clone-3d
   ```

2. **Serve locally (any method works):**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using Caddy
   caddy file-server --listen :8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

## 🕹️ Controls

| Action | Key/Mouse |
|--------|-----------|
| Move Forward/Backward | W / S |
| Rotate Left/Right | A / D |
| Look Around | Mouse |
| Shoot | Left Click |
| Jump | Spacebar |
| Capture Mouse | Click on game area |
| Release Mouse | ESC |

## 🎯 How to Play

1. **Enter a level seed** (optional) for consistent level generation
2. **Click START GAME** to begin
3. **Destroy all enemy spawn points** (purple portals) to win
4. **Collect health packs** (red crosses) to restore health
5. **Grab shield pickups** (blue diamonds) for temporary invulnerability
6. **Survive as long as possible** and achieve the highest score!

## 🛠️ Technical Details

- **Engine:** Three.js (WebGL)
- **Audio:** Web Audio API + HTML5 Audio
- **Architecture:** Vanilla JavaScript ES6+
- **Features:** Procedural generation, collision detection, particle effects
- **Browser Support:** Modern browsers with WebGL support

## 📁 Project Structure

```
doom-clone-3d/
├── index.html          # Main game interface
├── game.js             # Core game logic and rendering
├── assets/             # Game assets
│   └── video-game-boss-fiight-259885.mp3
└── README.md           # This file
```

## 🎵 Credits & Attribution

### Music
Background music: **"Video Game Boss Fight"** by **TimTaj**  
Source: https://pixabay.com/music/upbeat-video-game-boss-fiight-259885/  
License: Free for commercial and non-commercial use  

**Special thanks to TimTaj** for creating the atmospheric boss fight music that perfectly complements the intense gameplay experience!

### Development
- **Three.js** - 3D graphics library
- **Web Audio API** - Procedural sound effects
- **Modern Web Standards** - No external dependencies beyond Three.js

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Share your custom level seeds

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🌟 Show Your Support

If you enjoyed this retro FPS experience, please give it a ⭐ on GitHub!

---

*Built with ❤️ for the retro gaming community*