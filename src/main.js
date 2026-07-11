import './logic/input.js';
import './objects/lighting.js';
import {buildIndoorHall} from  './objects/architecture.js';
import './objects/doors.js';
import './objects/banners.js';
import './objects/seating.js';
import { state } from './state.js';
import { scene, camera, renderer } from './renderer.js';
import { updateSpectators } from './objects/spectators.js';
import { updateClonesLogic } from './objects/clones.js';
import { updatePhysics } from './logic/physics.js';
import { updateCamera } from './logic/camera.js';
import { updateSpinFrame, updateSkatingAnimation, setIdlePose } from './logic/animations.js';
import { showEndGameScreen, challengeActive, currentJumpPoints, resetCurrentJumpPoints, setChallengeActive, updateScore, updateChallengeTimerDisplay, updateFPSDisplay, hideLoadingScreen} from './hud.js';
import { initWallClock } from './objects/clock.js';
import {updateItems} from './objects/items.js'

// Store timestamp of the previous frame to calculate delta time
let lastFrameTime = 0;

let wasJumping = false;
let wasSpinning = false;

// Variables to monitor the render loop execution speed
let lastFPSUpdate = performance.now();
let frameCount = 0; 
let currentFPS = 0;

// Scene Initialization 
buildIndoorHall(); // Construct the architecture and lights first
initWallClock();  

// Main render loop
function animate(time) {
    requestAnimationFrame(animate); // syncs the loop with the monitor's refresh rate
    TWEEN.update(time);

    // Compute the delta time in second, makes the game timer independent from the hardware's monitor refresh rate
    const dt = (time - lastFrameTime) / 1000;
    lastFrameTime = time;

    // Challenge time update
    if (state.gameMode === 'challenge' && challengeActive) {
        updateChallengeTimerDisplay(dt);
    }

    // Spectators and clones
    updateSpectators(time/1000);
    updateClonesLogic(time);
    updateItems(time);

    // Physics integration and viewing transformations
    updatePhysics(time); // integrates velocity vectors and evaluates implicit boundary equations
    updateCamera(); // dynamically recomputes the View Matrix mapping World Space to Camera Space

    let canMove = state.gameMode === 'training' || state.gameMode === 'challenge';
    let pressingBrake = canMove && state.keys.ArrowDown;
    let pressingFwd = canMove && state.keys.ArrowUp;
    let isPressing = pressingFwd || pressingBrake || (canMove && state.keys.ArrowLeft) || (canMove && state.keys.ArrowRight);

    // Skater pose computation
    if (state.isSpinning) {
        updateSpinFrame();
    } else if (!state.jumping && !state.isFalling) {
        // Update skating animation only upon user input 
        if (state.isMoving || isPressing || (state.gameMode === 'exhibition' && state.exhibitionState === 'skating')) {
            updateSkatingAnimation(pressingBrake);
        } else {
            setIdlePose();
        }
    }

    // Assign points only if the jump/spin completes correctly 
    if (wasJumping && !state.jumping && state.gameMode === 'challenge' && challengeActive) {
        if (currentJumpPoints > 0) {
            updateScore(currentJumpPoints);
            resetCurrentJumpPoints();
        }
    }
    if (wasSpinning && !state.isSpinning && state.gameMode === 'challenge' && challengeActive) {
        if (currentJumpPoints > 0) {
            updateScore(currentJumpPoints);
            
            resetCurrentJumpPoints();
        }
    }

    // stores the current states in memory for the next frame 
    wasJumping = state.jumping; 
    wasSpinning = state.isSpinning;

    // GPU pipeline 
    renderer.render(scene, camera);

    // Computes FPS in real time
    frameCount++;
    const now = performance.now();
    if (now - lastFPSUpdate >= 1000) {
        currentFPS = frameCount;
        updateFPSDisplay(currentFPS);
        frameCount = 0;
        lastFPSUpdate = now;
    }
}

// Pipeline pre-compilation

// Asynchronously pre compiles all GLSL (vertex and fragment) shaders attached to the scene
renderer.compile(scene, camera);
// Forces the immediate allocation of Vertex Buffer Objects and textures from the CPU RAM to the GPU VRAM
renderer.render(scene, camera); 
// Smooth transition from the loading screen to the DOM Interface
setTimeout(() => {
    hideLoadingScreen();
}, 1000); // waiting 1s 

// Start the recursive loop
animate(0);
