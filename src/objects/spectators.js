import { scene } from '../renderer.js';
import { state } from '../state.js';

let spectatorData = [];         
let torsoMesh, headMesh, armLMesh, armRMesh, handLMesh, handRMesh;

// Shared crowd state machine to manage global events (cheering)
const crowdState = { mode: 'idle', intensity: 1, startTime: -999 };

const CHEER_DURATION_NORMAL = 1.9;
const CHEER_DURATION_AXEL = 2.6;
const CHEER_FREQ_NORMAL = 5;
const CHEER_FREQ_AXEL = 6;      
const ARM_LENGTH = 0.34;

// Pre-allocated mathematical objects reused at every frame to avoid continuous memory allocation
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _restDir = new THREE.Vector3();
const _cheerDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _armQuat = new THREE.Quaternion();
const _identityQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();

// Sine wave with linear decay
function cheerEnvelope(t, duration, freq) {
    if (t < 0 || t > duration) return 0;
    const decay = 1 - (t / duration); // linear decay over time
    // Generate the bounce using a high frequency absolute sin wave 
    return Math.abs(Math.sin(t * freq)) * decay;
}

// External triggers for the crowd's Finite State Machine
export function triggerCrowdCheer(jumpType = 'normal') {
    crowdState.mode = 'cheer';
    crowdState.intensity = jumpType === 'axel' ? 2 : 1;
    crowdState.startTime = performance.now() / 1000;
}

// Procedural animation
export function updateSpectators(elapsedTime) {
    if (!spectatorData.length) return;
    const isVisible = (state.gameMode === 'exhibition' || state.gameMode === 'challenge');

    torsoMesh.visible = isVisible;
    headMesh.visible = isVisible;
    armLMesh.visible = isVisible;
    armRMesh.visible = isVisible;
    handLMesh.visible = isVisible;
    handRMesh.visible = isVisible;

    if (!isVisible) return;

    const tGlobal = elapsedTime - crowdState.startTime;
    let baseCheerActive = false;
    let duration = 0, freq = 0, axelBoost = 1;

    if (crowdState.mode === 'cheer') {
        duration = crowdState.intensity === 2 ? CHEER_DURATION_AXEL : CHEER_DURATION_NORMAL;
        freq = crowdState.intensity === 2 ? CHEER_FREQ_AXEL : CHEER_FREQ_NORMAL;
        axelBoost = crowdState.intensity === 2 ? 1.35 : 1.0; 
        baseCheerActive = true;
        if (tGlobal > duration + 0.3) {
            crowdState.mode = 'idle';
        } 
    }

    // Update the local transformation matrix for each instanced spectator
    for (let i = 0; i < spectatorData.length; i++) {
        const sp = spectatorData[i];
        const t = tGlobal - sp.phaseDelay; // temporal phase shift by subtracting a randomized phase delay

        // Calculates the excitement level (from 0 to 1) for this exact frame
        const cheerValue = baseCheerActive ? cheerEnvelope(t, duration, freq) : 0;
        const idleness = 1 - cheerValue ;

        // Idle sine wave
        const idleSway = Math.sin(elapsedTime * 1.2 + sp.phaseDelay * 6) * 0.02 * idleness;
        const jumpHeight = cheerValue * 0.28 * axelBoost * sp.ampVariance;

        // The final torso height is the sum of the Y position and the computed bounce
        const torsoY = sp.torsoBaseY + jumpHeight + idleSway;

        // torso
        _euler.set(0, sp.rotY, 0, 'YXZ');
        _quat.setFromEuler(_euler);
        _pos.set(sp.x, torsoY, sp.z);
        _matrix.compose(_pos, _quat, _scale);
        torsoMesh.setMatrixAt(i, _matrix);

        // head
        _pos.set(sp.x, torsoY + 0.30 + jumpHeight * 0.25, sp.z);
        _matrix.compose(_pos, _quat, _scale);
        headMesh.setMatrixAt(i, _matrix);

        // Arms  
        for (let side = -1; side <= 1; side += 2) { // for both arms
            const isLeft = side < 0;

            // 1. Definition of the Target Directions
            _restDir.set(side * 0.22, -1, 0).normalize();  // Resting direction (pointing down)
            _cheerDir.set(side * 0.6, 1, 0).normalize(); // Cheering direction
            // 2. Blending: computes the intermediate pointing direction by interpolating (lerp) 
            _dir.copy(_restDir).lerp(_cheerDir, cheerValue).normalize();
            // 3. Realigns the computed vector relative to the spectator's base orientation
            _dir.applyAxisAngle(_yAxis, sp.rotY);
            // 4. Calculate the 3D rotation required to align the arm
            _armQuat.setFromUnitVectors(_upAxis, _dir);

            const shoulderX = sp.x + Math.cos(sp.rotY) * side * 0.15;
            const shoulderZ = sp.z - Math.sin(sp.rotY) * side * 0.15;
            const shoulderY = torsoY + 0.16;

            // Arm
            _pos.set(
                shoulderX + _dir.x * ARM_LENGTH * 0.5,
                shoulderY + _dir.y * ARM_LENGTH * 0.5,
                shoulderZ + _dir.z * ARM_LENGTH * 0.5
            );
            _matrix.compose(_pos, _armQuat, _scale);
            (isLeft ? armLMesh : armRMesh).setMatrixAt(i, _matrix);

            // Hand
            _pos.set(
                shoulderX + _dir.x * ARM_LENGTH,
                shoulderY + _dir.y * ARM_LENGTH,
                shoulderZ + _dir.z * ARM_LENGTH
            );
            // composition of the 4x4 Transformation Matrix 
            _matrix.compose(_pos, _identityQuat, _scale);
            (isLeft ? handLMesh : handRMesh).setMatrixAt(i, _matrix);
        }
    }

    // Flag the WebGL buffer attributes for GPU upload
    torsoMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    armLMesh.instanceMatrix.needsUpdate = true;
    armRMesh.instanceMatrix.needsUpdate = true;
    handLMesh.instanceMatrix.needsUpdate = true;
    handRMesh.instanceMatrix.needsUpdate = true;
}

// Instancing initialization
export function buildSpectators(seatAnchors, density = 0.4) {
    
    const FRONT_ROW_MAX_Y = 0.45;
    const anchors = seatAnchors.filter(a => a.y > FRONT_ROW_MAX_Y && Math.random() < density); // randomly chooses seats not belonging to the first row
    const count = anchors.length;
    if (count === 0) return;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a878, roughness: 0.8 });
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

    const torsoGeo = new THREE.BoxGeometry(0.30, 0.40, 0.20);
    const headGeo = new THREE.SphereGeometry(0.14, 8, 6);
    const armGeo = new THREE.BoxGeometry(0.07, ARM_LENGTH, 0.07);
    const handGeo = new THREE.SphereGeometry(0.075, 8, 6);

    torsoMesh = new THREE.InstancedMesh(torsoGeo, torsoMat, count);
    headMesh = new THREE.InstancedMesh(headGeo, skinMat, count);
    armLMesh = new THREE.InstancedMesh(armGeo, skinMat, count);
    armRMesh = new THREE.InstancedMesh(armGeo, skinMat, count);
    handLMesh = new THREE.InstancedMesh(handGeo, skinMat, count);
    handRMesh = new THREE.InstancedMesh(handGeo, skinMat, count);

    [torsoMesh, headMesh, armLMesh, armRMesh, handLMesh, handRMesh].forEach(m => {
        m.castShadow = true;
        m.receiveShadow = true;
    });

    const fanColors = [0xdd2233, 0x0044cc, 0xffaa00, 0x228833, 0xffffff, 0x333333];
    const fanColor = new THREE.Color();

    spectatorData = anchors.map((a, i) => {
        fanColor.setHex(fanColors[i % fanColors.length]);
        torsoMesh.setColorAt(i, fanColor);
        return {
            x: a.x,
            z: a.z,
            rotY: a.rotY,
            torsoBaseY: a.y + 0.32,
            phaseDelay: Math.random() * 0.35,
            ampVariance: 0.85 + Math.random() * 0.3
        };
    });
    if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;

    const spectatorsGroup = new THREE.Group();
    spectatorsGroup.add(torsoMesh, headMesh, armLMesh, armRMesh, handLMesh, handRMesh);
    return spectatorsGroup;
}