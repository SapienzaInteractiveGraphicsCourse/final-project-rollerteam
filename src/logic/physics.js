import { state } from '../state.js';
import { root, wheels } from '../objects/skater.js';
import { doFall, setIdlePose } from './animations.js';
import { updateHUDText, updateScore, resetCurrentJumpPoints, challengeActive } from '../hud.js';


// Physics constants
export let vx = 0, vz = 0; // velocity vector components
const ACCEL = 0.0055;  // linear acceleration applied per frame
const FRICTION = 0.972; // damping factor simulating wood surface friction
export const MAX_SPEED = 0.18; 
export const PUSH_SPEED = 0.025; // Linear spatial increment per frame simulating the push of a single stride 
const TURN_SPEED = 0.075;  
let lastPenaltyTime = 0;

export function resetVelocity() {
    vx = 0; vz = 0;
}

// FALL
function triggerFallAndGetUp() {
    if (state.isFalling) return;
    state.jumping = false;
    state.isFalling = true;
    state.isSpinning = false;
    resetCurrentJumpPoints();
    
    // Reset velocity vectors
    vx = 0;
    vz = 0;
    state.speedMag = 0;
    TWEEN.removeAll(); 
    
    updateHUDText("Fall!");

    // Calculate the final coordinate after the fall
    const dirX = -root.position.x; // direction of the collision 
    const dirZ = -root.position.z;
    root.rotation.x = 0;
    root.rotation.z = 0;

    // Inelastic collision
    const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (dist > 0) {
        // Vector Normalization (dirX / dist) calculates the unit vector pointing away from the impact
        const pushX = root.position.x + (dirX / dist) * 1.5; // final position = initial position + ( collision vector * 1.5)
        const pushZ = root.position.z + (dirZ / dist) * 1.5;

        new TWEEN.Tween(root.position)
            .to({ x: pushX, z: pushZ }, 350) // final destination 
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
    }

    doFall( () => {
        state.isFalling = false;
        updateHUDText("Recovered, keep going");
    });
}

// WALL BOUNCE
function triggerWallBounce() {
    if (state.isFalling) return; 
    state.isFalling = true; // temporarily freeze user inputs

    vx = 0; 
    vz = 0; 
    state.speedMag = 0;

    // Calculate the recoil normal vector towards the center
    const dirX = -root.position.x;
    const dirZ = -root.position.z;
    const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const pushX = root.position.x + (dirX / dist) * 1.5;
    const pushZ = root.position.z + (dirZ / dist) * 1.5;

    // Backward slide animation 
    new TWEEN.Tween(root.position)
        .to({ x: pushX, z: pushZ }, 350)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            state.isFalling = false;
        })
    .start();
}

// Clone collision detection and response
export function triggerCloneCollision(cloneX, cloneZ, mode) {
    if (state.isFalling) return; // avoid multiple collisions 

    // 1. Calculate the Collision Normal Vector
    const dirX = root.position.x - cloneX; // direction of the collision bounce
    const dirZ = root.position.z - cloneZ;
    const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const nX = dirX / dist; // normalize
    const nZ = dirZ / dist;

    // 2. Halt current velocity and procedural states
    vx = 0; vz = 0; state.speedMag = 0;
    state.jumping = false;
    state.isSpinning = false; 
    TWEEN.removeAll(); // Removes the spin/jump animations 

    if (mode === 'challenge') {
        state.isFalling = true;
        resetCurrentJumpPoints();
        TWEEN.removeAll();
        updateHUDText("Clash with a clone!");
        updateScore(-150);

        // Compute where the player will be thrown 
        const pushX = root.position.x + nX * 1.5;
        const pushZ = root.position.z + nZ * 1.5;
        
        new TWEEN.Tween(root.position)
        .to({ x: pushX, z: pushZ }, 350)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

        // Call fall animation
        doFall(() => {
            state.isFalling = false;
            updateHUDText("Recovered, keep going");
        });
        
    } else if (mode === 'training') {
        // Only bounce during training mode
        state.isFalling = true; 
        
        const pushX = root.position.x + nX * 1.2;
        const pushZ = root.position.z + nZ * 1.2;

        new TWEEN.Tween(root.position)
        .to({ x: pushX, z: pushZ }, 350)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            state.isFalling = false; 
        }).start();
        
        updateHUDText("Pay attention to the clones!");
    }
}

export function applyItemPhysicsPenalty() {
    vx *= 0.5;
    vz *= 0.5;
    state.speedMag *= 0.5;
}

// Physics integration running at every frame, called in main.js
export function updatePhysics(time) {
    let canMove = state.gameMode === 'training' || state.gameMode === 'challenge';
    let pressingFwd = canMove && state.keys.ArrowUp;
    let pressingBrake = canMove && state.keys.ArrowDown;
    let pressingLeft = canMove && state.keys.ArrowLeft;
    let pressingRight = canMove && state.keys.ArrowRight;

    state.isMoving = false;

    if (state.gameMode === 'exhibition') {
        const raggioX = 30.0, raggioZ = 18.0;
        if (state.exhibitionState === 'waiting') {
            root.position.x = Math.cos(state.exhibitionAngle) * raggioX;
            root.position.z = Math.sin(state.exhibitionAngle) * raggioZ;
            root.rotation.y = Math.PI;
        } else if (state.exhibitionState === 'paused') {
            state.speedMag = 0;
        } else {
            if (state.isSpinning) {
                if (state.spinTimer < 45) {
                    let glideSpeed = 0.014 * (1 - (state.spinTimer / 45)); // simulates the friction that progressively slows down the sliding
                    state.exhibitionAngle += Math.max(0, glideSpeed);  
                }
                state.speedMag *= 0.98; // reduces the velocity of 0.2 at every frame
           } else {
                // SKater is skating or jumping during exhibition mode
                const targetSpeed = 0.22; 

                // Acceleration post spin
                if (state.speedMag < targetSpeed) {
                    state.speedMag += 0.006; 
                } else {
                    state.speedMag = targetSpeed;
                }
        
                // Distance from origin to the current point on the ellipse
                const instantRadius = Math.sqrt(
                    Math.pow(raggioX * Math.sin(state.exhibitionAngle), 2) + 
                    Math.pow(raggioZ * Math.cos(state.exhibitionAngle), 2)
                );
                
                // Angular velocity = Linear Speed / Instantaneous Radius (w = v / r), guarantees the same physical speed on curves and straights
                //state.exhibitionAngle += targetSpeed / instantRadius; 
                state.exhibitionAngle += state.speedMag / instantRadius; 
                state.isMoving = true;
            }
            // Update the x and z coordinates x = a * cos(theta), z = b * sin(theta)
            root.position.x = Math.cos(state.exhibitionAngle) * raggioX;
            root.position.z = Math.sin(state.exhibitionAngle) * raggioZ;
        }
        if (!state.jumping && !state.isSpinning && state.exhibitionState !== 'waiting') {
            // align orientation to the tangent of the elliptical curve
            root.rotation.y = Math.atan2(-raggioX * Math.sin(state.exhibitionAngle), raggioZ * Math.cos(state.exhibitionAngle));
        }
        
    // TRAINING / CHALLENGE MODE
    } else {
        // Friction and energy dissipation
        if (state.isSpinning) {
            if (state.spinTimer < 90) {
                vx *= 0.95; vz *= 0.95; // Rapid deceleration
            } else {
                vx = 0; vz = 0;
            }
        } else {
            // If not spinning apply rink surface friction (less friction if mid-air)
            vx *= state.jumping ? 0.996 : FRICTION;
            vz *= state.jumping ? 0.996 : FRICTION;
        }
        // Compute the velocity vector magnitude
        state.speedMag = Math.sqrt(vx * vx + vz * vz);
        
        // Keep velocity below max speed
        if (state.speedMag > MAX_SPEED) {
            vx = (vx / state.speedMag) * MAX_SPEED;
            vz = (vz / state.speedMag) * MAX_SPEED;
            state.speedMag = MAX_SPEED;
        }
        state.isMoving = state.speedMag > 0.002;

        // USER INPUT
        // The user can steer or accelerate only if not jumping and not falling
        if (!state.jumping && !state.isFalling) {
            let turnSpeed = (state.isMoving || pressingFwd) ? TURN_SPEED : 0;
            let currentTurn = 0;
            if (pressingLeft) currentTurn = turnSpeed;
            if (pressingRight) currentTurn = -turnSpeed;

            // 2D Rotation matrix
            if (currentTurn !== 0) {
                root.rotation.y += currentTurn; // rotate the avatar
                
                // Mathematically rotate the velocity vector to steer without losing momentum
                const cosTurn = Math.cos(currentTurn);
                const sinTurn = Math.sin(currentTurn);
                const newVx = vx * cosTurn + vz * sinTurn;
                const newVz = -vx * sinTurn + vz * cosTurn;
                vx = newVx;
                vz = newVz;
            }

            if (pressingFwd) {
                vx += Math.sin(root.rotation.y) * ACCEL;
                vz += Math.cos(root.rotation.y) * ACCEL;
            }
            if (pressingBrake) { vx *= 0.85; vz *= 0.85; }
        }

        // COLLISION DETECTION
        if (state.isMoving) {
            let nextX = root.position.x + vx;
            let nextZ = root.position.z + vz;

            // Implicit ellipse equation defining the rink boundaries
            const bX = 35.5, bZ = 23.5;
            const cc = (nextX * nextX) / (bX * bX) + (nextZ * nextZ) / (bZ * bZ);

            if (cc > 1.0) {
                const sc = 0.999 / Math.sqrt(cc); // project the avatar back inside
                nextX *= sc; 
                nextZ *= sc;

                // Evaluate the penalty based on the current state
                if (state.jumping || state.isSpinning) {
                    triggerFallAndGetUp(); // if hit the wall during a jump, fall
                } else {
                    triggerWallBounce(); // if hit the wall while skating, trigger a bounce
                }
                // Apply sore penalty if in challenge mode
                if (state.gameMode === 'challenge' && challengeActive) {
                    if (time - lastPenaltyTime > 1000) {
                        updateScore(-50);
                        updateHUDText("Hit the railing (-50 pt)");
                        lastPenaltyTime = time;
                    }
                }
            }
            // If Bounch, update the position
            if (!state.isFalling) {
                root.position.x = nextX;
                root.position.z = nextZ;
            }
        }
       
        
    }

    // Wheel kinematics
        if (state.isMoving && !state.jumping && !state.isFalling) {
            const rotSpeed = state.speedMag / 0.045; //pure rolling, Angular Velocity = Linear Speed / Radius
            
            wheels.forEach(w => {
                w.rotation.x += rotSpeed;
            });
        }
}
