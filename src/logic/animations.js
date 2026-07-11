import { state } from '../state.js';
import { updateHUDText } from '../hud.js';
import { root, torso, legL, legR, armL, armR } from '../objects/skater.js';
import { MAX_SPEED } from './physics.js';

// Reads the current angles of the hierarchy and uses it to start the Tween interpolation
export function getTweenState() {
    return {
        y: root.position.y, rotY: root.rotation.y,
        hipLx: legL.hip.rotation.x, hipRx: legR.hip.rotation.x,
        kneeLx: legL.knee.rotation.x, kneeRx: legR.knee.rotation.x,
        ankleLx: legL.ankle.rotation.x, ankleRx: legR.ankle.rotation.x,
        shLx: armL.shoulder.rotation.x, shRx: armR.shoulder.rotation.x,
        shLz: armL.shoulder.rotation.z, shRz: armR.shoulder.rotation.z,
        elbowL: armL.elbow.rotation.x, elbowR: armR.elbow.rotation.x,
        torsoZ: torso.rotation.z, torsoX: torso.rotation.x,
        hipLy: legL.hip.rotation.y, hipRy: legR.hip.rotation.y,
    };
}
// Apply the interpolated values back to the skater
export function applyTweenState(s) {
    root.position.y = s.y;
    root.rotation.y = s.rotY;
    torso.rotation.x = s.torsoX || 0;
    torso.rotation.z = s.torsoZ || 0;
    legL.hip.rotation.x = s.hipLx; legR.hip.rotation.x = s.hipRx;
    legL.knee.rotation.x = s.kneeLx; legR.knee.rotation.x = s.kneeRx;
    legL.ankle.rotation.x = s.ankleLx; legR.ankle.rotation.x = s.ankleRx;
    legL.hip.rotation.z = s.hipLz || 0; legR.hip.rotation.z = s.hipRz || 0;
    legL.hip.rotation.y = s.hipLy || 0; legR.hip.rotation.y = s.hipRy || 0;
    armL.shoulder.rotation.x = s.shLx; armR.shoulder.rotation.x = s.shRx;
    armL.shoulder.rotation.z = s.shLz; armR.shoulder.rotation.z = s.shRz;
    armL.elbow.rotation.x = s.elbowL; armR.elbow.rotation.x = s.elbowR;
}

// JUMP ANIMATIONS
// rotations are calculated in an absolute way ( start rotation + trick rotation)
// to keep the foot flat on the ground during knee bends: Anklex = -(HipX)

// WALTZ
export function doWaltz() {
    if (state.jumping) return; 
    state.jumping = true; 
    stopSkateLoop();
    updateHUDText('Jump Waltz');

    // Current skater pose before the jump
    const s = getTweenState();
    const startRot = root.rotation.y; // store the trajectory direction before the jump
    s.trickRot = 0;
    const timeScale = 1.2;

    // Recompute the y-axis rotation (direction) at every frame of the Tween interpolation
    const updateJumpRot = () => {
        if (state.gameMode === 'exhibition') {
            // Exhibition mode, the skater follows an elliptical path
            // need to add the trick rotation to the uderlying rotation of the skater along the curve
            const dx = -20.0 * Math.sin(state.exhibitionAngle);
            const dz = 12.0 * Math.cos(state.exhibitionAngle);
            s.rotY = Math.atan2(dx, dz) + s.trickRot;
        } else {
            s.rotY = startRot + s.trickRot;
        }
        applyTweenState(s);
    };
    // 1. Setup pose
    const init = new TWEEN.Tween(s).to({ 
        torsoX: 0.0, // straight torso
        hipLx: 0, kneeLx: 0, ankleLx: 0, // left foot flat
        hipRx: 0.5, kneeRx: 1.2, ankleRx: 0.2, // right foot begins to bend
        shLx: -1.5, shLz: 0.1, shRx: 0, shRz: -1.2, elbowL: 0, elbowR: 0 // left arm forward, right arm extended to the side 
    }, 200 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 2. preparation
    const prep = new TWEEN.Tween(s).to({ 
        y: -0.153,    // lower torso height, otherwise the leg will float because knee is bending
        torsoX: 0.1, // torso forward
        hipLx: -0.7, kneeLx: 1.4, ankleLx: -0.8, //left leg bent to support weight, negative ankle rotation to avoid entering the floor -(HipX + KneeX)
        hipRx: -1.2, kneeRx: 1.3, ankleRx: -0.2, // right leg bent forward
        shLx: -1.5, shLz: 0.1, shRx: 0, shRz: -1.2, elbowL: 0, elbowR: 0 
    }, 350 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);
    
    // 3. Jump ( 180 degrees)
    const jump = new TWEEN.Tween(s).to({ 
        y: 1.2, trickRot: Math.PI, // skater jumping, torso height increases
        hipLx: -0.6, kneeLx: 0.0, ankleLx: 0.0, // legs straighten out during the flight
        hipRx: 0.1, kneeRx: 0.1, ankleRx: 0.2, 
        shLx: -0.2, shRx: -0.2, shLz: 0.8, shRz: -0.8, elbowL: -2.0, elbowR: -2.0 // elbows strongly bent (-2.0) and pulled close to the body to increase rotation speed
    }, 450 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);
    
    // 4. Landing impact
    const land = new TWEEN.Tween(s).to({ 
        y: -0.14, torsoX: 0.1, 
        hipRx: -0.6, kneeRx: 1.2, ankleRx: -0.7, // land on the bent right leg 
        hipLx: 0.5, kneeLx: 0.1, ankleLx: 0.2, // left leg continues the backward swing mid-air
        shLx: -0.2, shRx: -0.2, shLz: 0.8, shRz: -0.8, elbowL: -2.0, elbowR: -2.0 
    }, 250 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 5. exit pose
    const exitPosing = new TWEEN.Tween(s).to({ 
        y: 0.0,  torsoX: 0.0, 
        hipRx: -0.1, kneeRx: 0.3, ankleRx: -0.15,  
        hipLx: 0.85, kneeLx: 0.1, ankleLx: 0.3, // left leg swings back
        shLx: 0, shRx: 0, shLz: 1.5, shRz: -1.5, elbowL: 0, elbowR: 0 // arms fully extended horizontally
    }, 350 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot);
    
    // 6. reset ( return to the idle pose and rotate to the nearest 360-degree multiple)
    const reset = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI * 2, 
        hipLx: 0, kneeLx: 0, ankleLx: 0, 
        hipRx: 0, kneeRx: 0, ankleRx: 0, 
        shLz: 0.2, shRz: -0.2 
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot)
    .onComplete(() => { root.rotation.y = root.rotation.y % (Math.PI * 2); state.jumping = false; updateHUDText('Idle'); });

    init.chain(prep); prep.chain(jump); jump.chain(land); land.chain(exitPosing); exitPosing.chain(reset); 
    init.start();
}

// FLIP
export function doFlip() {
    if (state.jumping) return; 
    state.jumping = true; 
    stopSkateLoop();
    updateHUDText('Jump Flip');
    const s = getTweenState();
    const startRot = root.rotation.y;
    s.trickRot = 0;
    const timeScale = 1.2;

    const updateJumpRot = () => {
        if (state.gameMode === 'exhibition') {
            const dx = -20.0 * Math.sin(state.exhibitionAngle);
            const dz = 12.0 * Math.cos(state.exhibitionAngle);
            s.rotY = Math.atan2(dx, dz) + s.trickRot;
        } else {
            s.rotY = startRot + s.trickRot;
        }
        applyTweenState(s);
    };

    // 1. Setup backwards
    const prepTurn = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI, // 180 degree rotation 
        y: 0.0, torsoX: 0.05, // begins to lean forward
        hipLx: -0.15, kneeLx: 0.3, ankleLx: -0.1, // Left leg slightly bent
        hipRx: 0.2, kneeRx: 0.1, ankleRx: 0.1, // Right leg preparing to reach back
        shLx: -0.5, shRx: 0.5, shLz: 0.5, shRz: -0.5 // left arm forward, right arm backward
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot);
        
    // 2. Elongation, reach back with right toe
    const reachBack = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI, // still backward, not rotated yet
        y: -0.01, torsoX: 0.15,       
        hipLx: -0.15, kneeLx: 0.3, ankleLx: -0.30, // left leg bent
        hipRx: 0.85, kneeRx: 0.05, ankleRx: 0.0, // right led extended bacward
        shLx: -0.7, shRx: 0.7, shLz: 0.3, shRz: -0.3 
    }, 250 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot);

    // 3. Toe pick
    const toePick = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI,
        y: -0.15, //drop the center of the skater
        torsoX: 0.25,
        hipLx: -0.55, kneeLx: 1.15, ankleLx: -0.75, // deep bend on the left leg to vault
        hipRx: 0.40, kneeRx: 0.1, ankleRx: 0.45,   // right leg drops down to strike the floor with the toe pick
        shLx: -0.9, shRx: 0.9, shLz: 0.4, shRz: -0.4 
    }, 180 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 4. Jump ( 360 degree)
    const jump = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI * 3, // (Math.PI starting + Math.PI * 2 for the spin)
        y: 1.4, torsoX: 0.0, // torso straight during rotation
        hipLx: 0.0, kneeLx: 0.1, ankleLx: 0.4, 
        hipRx: 0.0, kneeRx: 0.1, ankleRx: 0.4, // Both legs straighten
        shLx: -0.2, shRx: -0.2, shLz: 0.2, shRz: -0.2, elbowL: -1.5, elbowR: -1.5  // arms slightly forward and open (opposite z signs)
    }, 500 * timeScale).easing(TWEEN.Easing.Cubic.Out).onUpdate(updateJumpRot);
    
    // 5. Landing 
    const land = new TWEEN.Tween(s).to({ 
        y: -0.05, torsoX: 0.05, 
        hipLx: 0.5, kneeLx: 0.1, ankleLx: 0.2, // Left leg swings backward (+0.5 pitch) mid-air to prepare for the exit pose
        hipRx: -0.3, kneeRx: 0.7, ankleRx: -0.45, // land smoothly on the right leg
        shLx: -0.2, shRx: -0.2, shLz: 1.0, shRz: -1.0, elbowL: -0.2, elbowR: -0.2 // Arms open wide
    }, 250 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 6. Exit pose
    const exitPosing = new TWEEN.Tween(s).to({ 
        y: -0.01,  torsoX: -0.05, // torso slightly back
        hipLx: 0.7, kneeLx: 0.0, ankleLx: 0.3, // Left leg lifts high backward
        hipRx: -0.1, kneeRx: 0.3, ankleRx: -0.1, 
        shLx: -0.1, shRx: -0.1, 
        shLz: 1.3, shRz: -1.3,
        elbowL: 0.0, elbowR: 0.0 //arms fully extended horizontally
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot);
    
    // 7. Reset
    const reset = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI * 4, 
        hipLx: 0, kneeLx: 0, ankleLx: 0, hipRx: 0, kneeRx: 0, ankleRx: 0, 
        shLz: 0.2, shRz: -0.2 
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot)
        .onComplete(() => { root.rotation.y = root.rotation.y % (Math.PI * 2); state.jumping = false; updateHUDText('Idle'); });

    prepTurn.chain(reachBack); reachBack.chain(toePick), toePick.chain(jump); jump.chain(land); land.chain(exitPosing); exitPosing.chain(reset); 
    prepTurn.start();
}

// AXEL
export function doAxel() {
    if (state.jumping) return; 
    state.jumping = true; 
    stopSkateLoop();
    updateHUDText('Jump double Axel');
    const s = getTweenState();
    const startRot = root.rotation.y;
    s.trickRot = 0;
    s.boost = 0;
    const timeScale = 1.2;

    const updateJumpRot = () => {
        // Speed boost
        if (state.gameMode === 'training' && s.boost > 0) {
            state.speedMag += 0.003 * s.boost;
            if (state.speedMag > 0.15) state.speedMag = 0.15;
        }
        if (state.gameMode === 'exhibition') {
            const dx = -20.0 * Math.sin(state.exhibitionAngle);
            const dz = 12.0 * Math.cos(state.exhibitionAngle);
            s.rotY = Math.atan2(dx, dz) + s.trickRot;
        } else {
            s.rotY = startRot + s.trickRot;
        }
        applyTweenState(s);
    };

    // 1. Preparation
    const prep = new TWEEN.Tween(s).to({ 
        boost: 1, 
        y: -0.04, // slight y drop to lower the center of mass
        torsoX: 0.15, // Forward pitch of the torso
        hipLx: -0.2, kneeLx: 0.4, ankleLx: -0.35, // left leg slightly bent forward (-x)
        hipRx: 0.5, kneeRx: 0.8, ankleRx: 0.3, // right leg extended bacward (+x)
        shLx: -0.8, shRx: 0.8, shLz: 0.4, shRz: -0.4 // Left arm forward (-x), right arm backward (+x), slightly open
    }, 500 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 2. load jump
    const load = new TWEEN.Tween(s).to({ 
        boost: 1.5, 
        y: -0.14, // y drop to prevent the bent leg from floating
        torsoX: 0.25, // torso lean further forward
        hipLx: -0.6, kneeLx: 1.2, ankleLx: -0.85, // Deep squat on left leg
        hipRx: 0.7, kneeRx: 1.5, ankleRx: 0.4, // right leg lifted higher backward
        shLx: -1.2, shRx: 1.0, shLz: 0.5, shRz: -0.5 
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 3. Takeoff (Pre-rotation)
    const takeoff = new TWEEN.Tween(s).to({ 
        boost: 1, 
        y: 0.6, // torso height increses because knees are no longer bent
        trickRot: Math.PI * 1.0, // pre-rotating 180 degrees
        torsoX: 0.0,  
        hipLx: 0.2, kneeLx: 0.0, ankleLx: 0.3, // Left leg straightens out to push
        hipRx: -1.2, kneeRx: 1, ankleRx: -0.2, // right leg goes forward to generate the upward lift
        shLx: 0.5, shRx: 0.5, shLz: 0.1, shRz: -0.1 
    }, 150 * timeScale).easing(TWEEN.Easing.Quadratic.In).onUpdate(updateJumpRot); // Easing.In to accelerate the motion into the jump

    // 4. jump
    const jump = new TWEEN.Tween(s).to({ 
        y: 1.8, 
        trickRot: Math.PI * 5, // 2.5 rotations
        torsoX: 0.0, 
        hipLx: 0.0, kneeLx: 0, ankleLx: 0.4, 
        hipRx: 0.0, kneeRx: 0, ankleRx: 0.4, // Both legs straighten
        shLx: -0.2, shRx: -0.2, shLz: 0.2, shRz: -0.2, // arms slightly open and forward
        elbowL: -2.0, elbowR: -2.0 // Elbow bent 
    }, 550 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 5. Landing bacward
    const land = new TWEEN.Tween(s).to({ 
        y: -0.05, torsoX: 0.1, // slight forward pitch
        hipLx: 0.6, kneeLx: 0.1, ankleLx: 0.2, // left leg swings backward
        hipRx: -0.3, kneeRx: 0.7, ankleRx: -0.5, // right knee bent
        shLx: -0.3, shRx: -0.3, shLz: 1.2, shRz: -1.2, elbowL: -0.2, elbowR: -0.2 // Arms open wide laterally
    }, 250 * timeScale).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateJumpRot);

    // 6. exit
    const exitPosing = new TWEEN.Tween(s).to({ 
        y: -0.01, 
        torsoX: -0.05,
        hipLx: 0.7, kneeLx: 0.0, ankleLx: 0.3, // left leg lifts straight backward
        hipRx: -0.3, kneeRx: 0.7, ankleRx: -0.35, 
        shLx: -0.2, shRx: -0.2, shLz: 1.4, shRz: -1.4, 
        elbowL: 0.0, elbowR: 0.0 
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot);

    // 7. 
    const reset = new TWEEN.Tween(s).to({ 
        trickRot: Math.PI * 6, // turn forward
        hipLx: 0, kneeLx: 0, ankleLx: 0, 
        hipRx: 0, kneeRx: 0, ankleRx: 0,
        shLz: 0.2, shRz: -0.2 
    }, 400 * timeScale).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(updateJumpRot)
    .onComplete(() => { root.rotation.y = root.rotation.y % (Math.PI * 2); state.jumping = false; updateHUDText('Idle'); });

    prep.chain(load); load.chain(takeoff); takeoff.chain(jump); jump.chain(land); land.chain(exitPosing); exitPosing.chain(reset); 
    prep.start();
}


// SPIN ANIMATIONS ( Procedural )
let spinTrickRot = 0; 

export function startSpin() {
    if (state.jumping || state.isSpinning) return;
    state.isSpinning = true;
    stopSkateLoop();
    state.spinTimer = 0;
    spinTrickRot = 0; // reset spin angle
    
    // In exhibition mode, store the starting rotation angle
    if (state.gameMode !== 'exhibition') {
        state.spinBaseRot = root.rotation.y;
    }
    updateHUDText('Spinning');
}

export function updateSpinFrame() {
    state.spinTimer++;
    const s = getTweenState();

    // 1. Entry transition
    if (state.spinTimer < 30) {
        // Normalized parametric time t for the first 30 frame ( between 0.0 and 1.0 )
        const t = state.spinTimer / 30;

        // Hermite blending function (Smoothstep function) b1(t) = 3t^2 - 2t^3 to guarantee C1 continuity
        // it outputs a non-linear multiplier to ease-in and ease-out the rotations
        const ease = t * t * (3 - 2 * t); 

        // Equation format: current = start + ( distance * ease)
        s.y = 0 + (-0.28 * ease); s.torsoX = 0 + (1.5 * ease); // torso forward
        s.hipLx = 0 + (-1.4 * ease); s.kneeLx = 0 + (0.2 * ease); s.ankleLx = 0 + (-0.2 * ease);
        s.hipRx = 0; s.kneeRx = 0 + (0.1 * ease); s.ankleRx = 0 + (0.2 * ease); 
        // Arms open wide horizontally (+z -z)
        s.shLx = -0.05 + (0.05 * ease); s.shRx = -0.05 + (0.05 * ease); s.shLz = 0.15 + (1.35 * ease); s.shRz = -0.15 + (-1.35 * ease); 
        s.elbowL = 0.05 + (0.05 * ease); s.elbowR = 0.05 + (0.05 * ease);
    
        // 2. Camel spin hold (static phase, no t parameter is needed)
    } else if (state.spinTimer < 90) {
        s.y = -0.28; s.torsoX = 1.5; 
        s.hipLx = -1.4; s.kneeLx = 0.2; s.ankleLx = -0.2;
        s.hipRx = 0.0; s.kneeRx = 0.1; s.ankleRx = 0.2;
        s.shLx = 0.0; s.shRx = 0.0; s.shLz = 1.5; s.shRz = -1.5; // Arms kept wide
        s.elbowL = 0.1; s.elbowR = 0.1; 
    
        // 3. Transition to Upright spin 
    } else if (state.spinTimer < 120) {
        // Normalizing the time for this specific 30-frames segment
        const t = (state.spinTimer - 90) / 30;

        // Applying standard C0 linear interpolation: P(t) = P0 + (P1 - P0) * t (to simulate a fast, constant-speed)
        s.y = -0.05 + (0.07 * t); s.torsoX = 1.5 - (1.5 * t); 
        s.hipLx = -1.4 + (1.4 * t); s.kneeLx = 0.2 - (0.2 * t); s.ankleLx = -0.2 + (0.15 * t);
        s.hipRx = 0.0 - (0.5 * t); s.kneeRx = 0.1 + (0.7 * t); s.ankleRx = 0.2 + (0.2 * t);
        s.shLx = 0.0 - (0.2 * t); s.shRx = 0.0 - (0.2 * t); s.shLz = 1.5 - (1.3 * t); s.shRz = -1.5 + (1.3 * t); // Arms pull inward
        s.elbowL = 0.1 - (1.6 * t); s.elbowR = 0.1 - (1.6 * t); // Elbows bend tight to the body
    
        // 4. Upright spin hold
    } else if (state.spinTimer < 180) {
        s.y = 0.02; s.torsoX = 0.0; 
        s.hipLx = 0.0; s.kneeLx = 0.0; s.ankleLx = -0.05; 
        s.hipRx = -0.5; s.kneeRx = 0.8; s.ankleRx = 0.4; 
        s.shLx = -0.2; s.shRx = -0.2; s.shLz = 0.2; s.shRz = -0.2; 
        s.elbowL = -1.5; s.elbowR = -1.5; // Arms are pulled tight to the chest
    
        // 5. Deceleration and exit transition
    } else if (state.spinTimer < 210) {
        // Mapping time into the parametric space for the exit linear interpolation
        const t = (state.spinTimer - 180) / 30;
        s.y = 0.02 - (0.03 * t); s.torsoX = 0.0;
        s.hipLx = 0.0 - (0.1 * t); s.kneeLx = 0.0 + (0.2 * t); s.ankleLx = -0.05 - (0.05 * t);
        s.hipRx = -0.5 + (0.8 * t); s.kneeRx = 0.8 - (0.8 * t); s.ankleRx = 0.4 + (0.05 * t); // right leg backward 
        s.shLx = -0.2; s.shRx = -0.2; s.shLz = 0.2 + (1.0 * t); s.shRz = -0.2 - (1.0 * t); // arms open wide
        s.elbowL = -1.5 + (1.6 * t); s.elbowR = -1.5 + (1.6 * t);
        
        // 6. Final exit pose
    } else if (state.spinTimer < 240) {
        s.y = -0.01; s.torsoX = 0.0; 
        s.hipLx = -0.1; s.kneeLx = 0.2; s.ankleLx = -0.1; 
        s.hipRx = 0.3; s.kneeRx = 0.0; s.ankleRx = 0.45; // Right leg extended backward (toe pick)
        s.shLx = -0.2; s.shRx = -0.2; s.shLz = 1.2; s.shRz = -1.2; 
        s.elbowL = 0.1; s.elbowR = 0.1;
    
    } else {
        // restart skating animation smoothly 
        state.isSpinning = false;
        forceLeftPush = true; // start skating animation with left push
        updateHUDText('Idle');
        return; 
    }

    // Conservation of Angular moment

    // The rotation speed dynamically responds to the skater's moment of inertia based on their pose
    let deltaRot = 0;
    if (state.spinTimer < 30) deltaRot = 0.10 + (0.15 * (state.spinTimer / 30));       
    else if (state.spinTimer < 90) deltaRot = 0.25;   // Camel Spin, higher moment of inertia results in a slower angular velocity                                 
    else if (state.spinTimer < 120) deltaRot = 0.25 + (0.11 * ((state.spinTimer - 90) / 30)); // As arms and legs are pulled tight to the chest, the moment of inertia decreases, the angular velocity linearly increase
    else if (state.spinTimer < 180) deltaRot = 0.36; // Lower moment of inertia results in the maximum angular velocity                                  
    else if (state.spinTimer < 210) deltaRot = 0.36 * (1.0 - ((state.spinTimer - 180) / 30)); // Deceleration
    
    spinTrickRot -= deltaRot; // negative rotation around y-axis spins the character to the right

    // From frame 190 (braking phase), interpolate the trick rotation toward the nearest multiple of 360 degrees
    if (state.spinTimer >= 190) {
        const targetRot = Math.round(spinTrickRot / (Math.PI * 2)) * (Math.PI * 2);
        // Exponential smoothing
        spinTrickRot += (targetRot - spinTrickRot) * 0.08; 
    }

    if (state.gameMode === 'exhibition') {
        const rX = 30.0; const rZ = 18.0; 
        // add the trick rotation to the uderlying rotation of the skater along the curve 
        const baseRot = Math.atan2(-rX * Math.sin(state.exhibitionAngle), rZ * Math.cos(state.exhibitionAngle));
        s.rotY = baseRot + spinTrickRot;
    } else {
        s.rotY = state.spinBaseRot + spinTrickRot;
    }
    applyTweenState(s);
}

// FALL ANIMATION 
export function doFall( onCompleteCallback) {
    const s = getTweenState();
    s.fallRotX = root.rotation.x;
    // Reset all local joint rotations to avoid inheriting weird poses from an interrupted jump
    s.torsoZ = 0; s.torsoX = 0;
    s.hipLx = 0; s.hipRx = 0; s.kneeLx = 0; s.kneeRx = 0; s.ankleLx = 0; s.ankleRx = 0;
    s.hipLy = 0; s.hipRy = 0; s.shLx = 0; s.shRx = 0; s.shLz = 0; s.shRz = 0; s.elbowL = 0; s.elbowR = 0;

    const updateFall = () => {
        root.rotation.order = 'YXZ';
        root.rotation.x = s.fallRotX;
        root.rotation.z = 0;
        applyTweenState(s);
    };

    // 1. Initial drop
    const drop = new TWEEN.Tween(s).to({
        y: -0.88, // center of mass drops to floor
        fallRotX: -0.35, 
        trickRot: 0, torsoX: 0.05,
        // Both legs up and forward
        hipLx: -1.30, hipRx: -1.30,
        kneeLx: 0.0, kneeRx: 0.0,
        ankleLx: 0.1, ankleRx: 0.1, 
        // arms thrown forward (-1x)
        shLx: -1.0, shRx: -1.0, shLz: 0.5, shRz: -0.5, elbowL: -0.2, elbowR: -0.2
    }, 250).easing(TWEEN.Easing.Quadratic.In).onUpdate(updateFall); // Easing.In simulates gravitational acceleration

    // Bounce up
    const bounceUp = new TWEEN.Tween(s).to({ 
        y: -0.70, fallRotX: -0.20,
        hipLx: -1.45, hipRx: -1.45 
    }, 150).easing(TWEEN.Easing.Quadratic.Out).onUpdate(updateFall); // Easing.Out to decelerate at the peak of the bounce

    // Bounce down
    const bounceDown = new TWEEN.Tween(s).to({ 
        y: -0.88, fallRotX: -0.35,
        hipLx: -1.30, hipRx: -1.30 
    }, 150).easing(TWEEN.Easing.Quadratic.In).onUpdate(updateFall);

    // transition back to the idle pose
    const getUp = new TWEEN.Tween(s).to({
        y: 0, fallRotX: 0, torsoX: 0,
        hipLx: 0, hipRx: 0, kneeLx: 0, kneeRx: 0, ankleLx: 0, ankleRx: 0, 
        shLx: -0.05, shRx: -0.05, shLz: 0.15, shRz: -0.15, elbowL: 0.05, elbowR: 0.05
    }, 500).delay(800).easing(TWEEN.Easing.Cubic.Out).onUpdate(updateFall)

    .onComplete(() => { 
        root.rotation.order = 'XYZ'; // Restore standard Euler evaluation order 
        if (onCompleteCallback) onCompleteCallback(); 
    });

    drop.chain(bounceUp);
    bounceUp.chain(bounceDown);
    bounceDown.chain(getUp); 
    
    drop.start();
}

// SKATING ANIMATION 
let skateLoopActive = false;
let isReturningToIdle = false;
let skateTweenGroup = [];
let currentSkateState = null;
let forceLeftPush = false; 

export function stopSkateLoop() {
    if (!skateLoopActive && !isReturningToIdle) return;
    skateLoopActive = false;
    isReturningToIdle = false;
    skateTweenGroup.forEach(t => t.stop());
    skateTweenGroup = [];
}

// Manages a single cyclic iteration of the skating stride.
function startNextSkateCycle() {
    if (!skateLoopActive) return;

    let pressingFwd = state.keys.ArrowUp || (state.gameMode === 'exhibition' && state.exhibitionState === 'skating');
    if (!pressingFwd) {
        triggerReturnToIdle();
        return;
    }
    
    // The duration of the animation adapts to the physical speed
    let speedRatio = Math.max(0.01, Math.min(state.speedMag / MAX_SPEED, 1.0));
    const timeScale = 0.90 + (1.0 - speedRatio) * 0.40; // if the speed ratio is maximum (1), push animation will last only 90% of its required time
                                                        // if speedratio is minimum (0.01), push animation will last 1.40 times its required time
    // 1. right push
    const pushRight = new TWEEN.Tween(currentSkateState).to({
        y: -0.07, torsoX: 0.15, torsoZ: 0.05, // torso leans forward and right
        hipLx: -0.15, kneeLx: 0.55, ankleLx: -0.55, // left leg bend
        hipRx: 0.6, kneeRx: 0.0, ankleRx: 0.2, // right leg pushing bacward
        hipLz: 0, hipRz: -0.1, hipLy: 0, hipRy: -0.1, 
        shLx: -0.1, shRx: -0.1, shLz: 1.1, shRz: -1.1, elbowL: 0.0, elbowR: 0.0
    }, 350 * timeScale).easing(TWEEN.Easing.Quadratic.Out);

    // 2. weight transfer
    const glide1 = new TWEEN.Tween(currentSkateState).to({
        y: 0.02, torsoX: 0.05, torsoZ: 0.0, 
        hipLx: -0.05, kneeLx: 0.1, ankleLx: -0.10, 
        hipRx: -0.05, kneeRx: 0.1, ankleRx: -0.10,
        hipLz: 0, hipRz: 0, hipLy: 0, hipRy: 0, 
        shLx: -0.1, shRx: -0.1, shLz: 1.1, shRz: -1.1, elbowL: 0.0, elbowR: 0.0
    }, 250 * timeScale).easing(TWEEN.Easing.Cubic.InOut); // C1 continuity

    // 3. left push ( symmetric to the right push)
    const pushLeft = new TWEEN.Tween(currentSkateState).to({
        y: -0.07, torsoX: 0.15, torsoZ: -0.05, 
        hipLx: 0.6, kneeLx: 0.0, ankleLx: 0.2, // left pushing
        hipRx: -0.15, kneeRx: 0.55, ankleRx: -0.55,  // right supporting
        hipLz: 0.1, hipRz: 0, hipLy: 0.1, hipRy: 0,  
        shLx: -0.1, shRx: -0.1, shLz: 1.1, shRz: -1.1, elbowL: 0.0, elbowR: 0.0
    }, 350 * timeScale).easing(TWEEN.Easing.Quadratic.Out);

    // 4. weight transfer
    const glide2 = new TWEEN.Tween(currentSkateState).to({
        y: 0.02, torsoX: 0.05, torsoZ: 0.0,
        hipLx: -0.05, kneeLx: 0.1, ankleLx: -0.10,
        hipRx: -0.05, kneeRx: 0.1, ankleRx: -0.10,
        hipLz: 0, hipRz: 0, hipLy: 0, hipRy: 0,
        shLx: -0.1, shRx: -0.1, shLz: 1.1, shRz: -1.1, elbowL: 0.0, elbowR: 0.0
    }, 250 * timeScale).easing(TWEEN.Easing.Cubic.InOut);

    pushRight.chain(glide1); glide1.chain(pushLeft); pushLeft.chain(glide2);
    
    glide2.onComplete(() => {
        if (skateLoopActive) startNextSkateCycle();
    });

    skateTweenGroup = [pushRight, glide1, pushLeft, glide2];

    // To start the skating cycle with the opposite leg
    if (forceLeftPush) {
        forceLeftPush = false; 
        pushLeft.start();      
    } else {
        pushRight.start();    
    }

}

// Dissipates residual kinematic animation energy
function triggerReturnToIdle() {
    skateLoopActive = false;
    isReturningToIdle = true;
    skateTweenGroup.forEach(t => t.stop());

    const returnTween = new TWEEN.Tween(currentSkateState).to({
        y: 0, torsoX: 0, torsoZ: 0,
        hipLx: 0, kneeLx: 0, ankleLx: 0, hipLz: 0, hipRz: 0, hipLy: 0, hipRy: 0,
        hipRx: 0, kneeRx: 0, ankleRx: 0,
        shLx: -0.05, shRx: -0.05, shLz: 0.15, shRz: -0.15, elbowL: 0.05, elbowR: 0.05
    }, 400).easing(TWEEN.Easing.Cubic.Out).onComplete(() => {
        isReturningToIdle = false;
    });

    returnTween.start();
    skateTweenGroup = [returnTween];
}

export function updateSkatingAnimation(pressingBrake) {
    if (pressingBrake) {
        stopSkateLoop();
        const s = getTweenState();
        s.rotY = root.rotation.y;
        s.torsoX = 0.05; 
        s.hipLx = -0.1; s.kneeLx = 0.2; s.ankleLx = -0.1; s.hipRx = 0.25; s.kneeRx = 0.0; s.ankleRx = 0.45;
        s.shLx = -0.4; s.shRx = 0.1; s.shLz = 0.6; s.shRz = -0.8; s.elbowL = -0.1; s.elbowR = -0.1;
        s.hipLz = 0; s.hipRz = 0; s.hipLy = 0; s.hipRy = 0; 
        applyTweenState(s);
        updateHUDText(`Pressing brake`);
        return;
    }

    let pressingFwd = state.keys.ArrowUp || (state.gameMode === 'exhibition' && state.exhibitionState === 'skating');

    // 1. Skater start to move
    if (pressingFwd && !skateLoopActive) {
        stopSkateLoop();
        skateLoopActive = true;
        currentSkateState = getTweenState();
        startNextSkateCycle();
    } 
    // 2. Stop the cycle and ease to idle if user releases the key
    else if (!pressingFwd && skateLoopActive) {
        triggerReturnToIdle();
    }

    if (currentSkateState && (skateLoopActive || isReturningToIdle)) {
        currentSkateState.rotY = root.rotation.y;
        applyTweenState(currentSkateState);
    }

    if (state.gameMode === 'exhibition') {
        updateHUDText(`Skating`);
    } else {
        const pct = Math.round((state.speedMag / MAX_SPEED) * 100);
        updateHUDText(pressingFwd ? `Push (${pct}%)` : `Deceleration (${pct}%)`);
    }
}

// IDLE 
export function setIdlePose() {
    stopSkateLoop();
    const s = getTweenState();
    s.y = 0; s.rotY = root.rotation.y; 
    s.torsoX = 0; s.torsoZ = 0;
    s.hipLx = 0; s.kneeLx = 0; s.ankleLx = 0; s.hipLz = 0; s.hipLy = 0; 
    s.hipRx = 0; s.kneeRx = 0; s.ankleRx = 0; s.hipRz = 0; s.hipRy = 0; 
    s.shLx = -0.05; s.shRx = -0.05; s.shLz = 0.15; s.shRz = -0.15;
    s.elbowL = 0.05; s.elbowR = 0.05;
    applyTweenState(s);
    updateHUDText(`Idle`);
}