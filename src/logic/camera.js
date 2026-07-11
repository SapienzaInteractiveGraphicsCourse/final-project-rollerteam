import { camera, controls } from '../renderer.js';
import { root } from '../objects/skater.js';
import {state} from '../state.js';
import { syncModeUI } from '../hud.js';
import { setIdlePose } from './animations.js';
import { resetVelocity } from './physics.js';


export let cameraMode = 'idle';
let idleCamAngle = 0;
let lockedCamAngle = 0;

export function setCameraMode(mode) {
    cameraMode = mode;
}

// Initial drone animation
export function triggerCameraTransition() {
    cameraMode = 'transition';
    controls.enabled = false;

    let targetPos = new THREE.Vector3();
    if (state.gameMode === 'exhibition') {
        targetPos.set(0, 4, 24);
    } else {
        targetPos.set(-20, 6, -18);
    }
    
    // Perform a non-linear temporal interpolation on the View matrix from the initial drone perspective to the active gameplay camera
    new TWEEN.Tween(camera.position)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 2500)
        .easing(TWEEN.Easing.Cubic.InOut) // C1 continuity
        .onUpdate(() => { 
            // Continually recomputes the View Vector to track the skater mid-flight
            camera.lookAt(root.position.x, root.position.y + 1.2, root.position.z); 
        })
        .onComplete(() => {
            const bottomUI = document.getElementById('bottomUI');
            const topModeBar = document.getElementById('topModeBar');
            if(bottomUI) bottomUI.style.display = 'flex';
            if(topModeBar) topModeBar.style.display = 'flex';
            window.dispatchEvent(new Event('resize'));

            cameraMode = 'orbit';
            const camSelect = document.getElementById('camSelect');
            if (camSelect) camSelect.value = 'orbit';
            
            // Hand over the transformation matrix to the OrbitControls
            controls.target.copy(root.position);
            controls.target.y += 1.2;
            controls.update();
        })
        .start();
}

// Dynamic View matrix updater ( called per frame by the render loop)
export function updateCamera() {
    if (!root) return;

    // During mode selection 
    if (cameraMode === 'idle') {
        controls.enabled = false;
        idleCamAngle += 0.001; // slow
        
        // Trigonometric spherical orbit around the World Space origin
        const radius = 35; 
        camera.position.x = Math.cos(idleCamAngle) * radius;
        camera.position.y = 8.5; 
        camera.position.z = Math.sin(idleCamAngle) * radius;
        camera.lookAt(0, 0, 0);

    } else if (cameraMode === 'orbit') {
        controls.enabled = true;
        controls.target.copy(root.position);
        controls.target.y = 1;
        controls.update();

        // Define the arena limits as the implicit equation of an ellipse f(x,z) = (x^2/a^2) + (z^2/b^2)
        const camX = camera.position.x;
        const camZ = camera.position.z;
        const limitX = 50.0;
        const limitZ = 38.0;

        // Collision check
        const cc = (camX * camX) / (limitX * limitX) + (camZ * camZ) / (limitZ * limitZ);
        // If the camera origin exceeds the boundary
        if (cc > 1.0) {
            // apply a scaling factor to project the View Matrix inside the arena
            const scale = 0.999 / Math.sqrt(cc);
            camera.position.x = camX * scale;
            camera.position.z = camZ * scale;
        }

        // y-axis clamping to prevent clipping through the roof and the floor
        if (camera.position.y > 9.5) {
            camera.position.y = 9.5;
        }
        if (camera.position.y < 0.4) {
            camera.position.y = 0.4;
        }

       // Third- person chase camera
    } else if (cameraMode === 'follow') {
        controls.enabled = false;
        
        // Remove the target look-vector only during jump/spin
        if (!state.jumping && !state.isSpinning) {
            if (state.gameMode === 'exhibition') {
                // In exhibition the camera aligns with the tangent vector of the elliptical path
                const dx = -30.0 * Math.sin(state.exhibitionAngle);
                const dz = 18.0 * Math.cos(state.exhibitionAngle);
                lockedCamAngle = Math.atan2(dx, dz);
            } else {
                lockedCamAngle = root.rotation.y;
            }
        }

        const offsetDistance = 6.0; 
        const offsetHeight = 2.8;  
        const dirX = Math.sin(lockedCamAngle);
        const dirZ = Math.cos(lockedCamAngle);

        // Temporal interpolation, exponential smoothing. Position += (Target - Position) * 0.35
        // covering only a percentage of the remaining distance to the target for each frame ( simulate camera inertia)
        const lerpSpeed = 0.35;
        camera.position.x += ((root.position.x - dirX * offsetDistance) - camera.position.x) * lerpSpeed;
        camera.position.y += ((root.position.y + offsetHeight) - camera.position.y) * lerpSpeed;
        camera.position.z += ((root.position.z - dirZ * offsetDistance) - camera.position.z) * lerpSpeed;
        camera.lookAt(root.position.x, root.position.y + 1.2, root.position.z);

        // Spectators perspective
    } else if (cameraMode === 'stands') {
        controls.enabled = false;
        // static View matrix simulating a fixed seat on the bleachers
        const targetCamX = 0;
        const targetCamY = 5.5;  // high seat
        const targetCamZ = -32; 

        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.position.z += (targetCamZ - camera.position.z) * 0.05;
        
        // Keep track of the skater (keep the root centered within the Canonical View Volume)
        camera.lookAt(root.position.x, root.position.y + 1, root.position.z);
    }
}

// Change modality 
export function changeGameModeCinematic(newMode, isFirstTime = false) {
    state.gameMode = newMode;
    syncModeUI();

    // Clears physical momentum and halts the Finite State Machine
    state.speedMag = 0;
    resetVelocity();
    
    TWEEN.removeAll();
    state.jumping = false;
    state.isSpinning = false;
    state.isFalling = false;
    setIdlePose(); // triggers the skater return to idle

    // Place the skater based on the modality
    if (newMode === 'exhibition') {
        root.position.set(0, 0, 18);
        root.rotation.set(0, Math.PI, 0); // Look toward the spectators
        state.exhibitionAngle = Math.PI / 2;
        state.exhibitionState = 'waiting';
    } else {
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
    }

    if (isFirstTime) {
        triggerCameraTransition();
    } else {
        // instantaneous view matrix translation
        snapCameraToPlayer();
    }
}

export function snapCameraToPlayer() {
    cameraMode = 'orbit';
    controls.enabled = true;
    
    if (state.gameMode === 'exhibition') {
        camera.position.set(0, 4, 30); // z positive (door side of the arena)
    } else {
        camera.position.set(-20, 6, -18); // z negative (stands side of the arena), x negative (right)
    }
    
    // looks toward the skater
    controls.target.copy(root.position);
    controls.target.y += 1.2;
    controls.update();

    // Reset default camera setting (orbit)
    const camSelect = document.getElementById('camSelect');
    if (camSelect) camSelect.value = 'orbit';
}