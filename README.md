# Roller Rink 3D 🛼

**Play Now:** The project is available online through [GitHub Pages](https://sapienzainteractivegraphicscourse.github.io/final-project-rollerteam/)

## Project overview
Roller Rink 3D is an interactive 3D roller skating simulation set inside an indoor sports arena.
The project is on one hand a simulator where the character can perform figure skating moves (such as the Waltz, Flip, Double Axel jumps, and spins), while on the other hand, it is a fully playable game.
To satisfy both the simulation and the gaming aspects, the application offers three distinct game modes accessible via the top navigation bar:
1. **Training mode (Default):** The player can freely navigate the arena using the arrow keys. This environment is ideal for getting comfortable with the custom physics, mastering jump timings, and train to dodge the other autonomous skaters wandering around the rink.
2. **Exhibition mode:** In this mode, the skater automatically travels along a perfect elliptical trajectory. The player only needs to focus on executing acrobatics (jumps and spins) with perfect timing, supported by the audience in the stands.
3. **Challenge mode:** A competitive race against time. After choosing a difficulty level (easy, medium, hard), the player must accumulate as many points as possible by chaining jumps and spins, avoiding other skaters or cones thrown by the spectators, and collecting bonus items thrown onto the rink by the crowd.

Surrounding the gameplay there is a dynamic environment: the arena features a day/night cycle that automatically turns on the stadium lights, a dynamic camera that changes perspective based on the player's needs (follow, free orbit, or a "from the stands" view), and (for exhibition and challenge mode) an interactive audience that cheers and reacts to the player's acrobatics.

> **Note**: The primary goal of this project is to implement faithful animations of technical roller skating jumps from scratch, **without importing any external animations**. For this reason the skater, NPCs, and various environmental props are intentionally built using simple geometric shapes to prioritize animation fluidity over aesthetics.


## Controls

The application supports a dual control scheme: physical keyboard inputs (highly recommended for fast reactions in challenge mode) and on-screen HUD buttons.   
*Note: To ensure physical realism, directional inputs are temporarily locked during mid-air flights and fall animations.*

| Keyboard Key / UI Button | Action | Points (challenge) |
| :--- | :--- | :--- |
| `Arrow Keys` | Push forward, Brake, Steer Left/Right | - |
| `Z` / **Waltz** | Waltz Jump | +100 pts |
| `X` / **Flip** | Flip Jump | +250 pts |
| `C` / **Axel** | Double Axel Jump | +500 pts |
| `S` / **Spin** | Spin | +300 pts |
| `M` | Switch Mode / Abort active challenge | - |
| `Enter` | Start challenge / Play-Pause (Exhibition) | - |

> ⚙️ **Performance Troubleshooting:** If you experience a frame rate (FPS) drop, click the gear icon in the top-left corner to **dynamically scale down the rendering resolution** or **disable shadows**, this reduces the workload on less powerful devices.   
> I recommend using Microsoft Edge for Windows users and Safari for macOS users, because in my experience, they offer better performance than Google Chrome.

## Repository Structure

The source code strictly enforces the separation of concerns, isolating geometric modeling from physics logic and animations.

```text
/Project
├── index.html            # WebGL Canvas container and HTML UI overlay
├── style.css
├── Documentation.pdf     # Technical presentation and User Manual
├── assets/               # External assets: Textures (wood, normal map) and raster images
└── src/                  
    ├── main.js           # Main render loop (requestAnimationFrame)
    ├── state.js          # Shared global variables (game mode, timers, scores)
    ├── renderer.js       # WebGLRenderer, Camera, and Shadows setup
    ├── hud.js            # HTML DOM logic 
    ├── objects/          # Geometries (Model Space)
    │   ├── skaterModel.js  # Procedural hierarchical skater construction
    │   ├── architecture.js # Arena, roof
    │   ├── seating.js    # Procedural stands using Hardware Instancing
    │   ├── lighting.js   # Day/Night cycle, LED lights
    │   └── ...           # (clones, spectators, items, doors, clock)
    └── logic/            
        ├── physics.js    # Custom physics, momentum, friction, and collisions
        ├── animations.js # Tween.js interpolation for jumps, spins, and kinematic poses
        ├── camera.js     # Cinematic camera transitions (Follow, Orbit, Stands)
        └── input.js      # Keyboard event listeners
```       


Project developed for the **Interactive Graphics** course at Sapienza University of Rome.   
Author: Claudia Cornacchia.   
