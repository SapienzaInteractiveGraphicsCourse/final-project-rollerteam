import { scene } from '../renderer.js';
import { gateLeft, gateRight, tangentAngle } from './rink.js';
import { root } from './skater.js';
import { state } from '../state.js';
import { updateHUDText } from '../hud.js';
import { triggerCloneCollision} from '../logic/physics.js';
import { cameraMode } from '../logic/camera.js';

export const clones = [];
let isCloneOnBreak = false;
let lastBreakTime = 0;

// Generates a random coordinate inside the implicit boundary of the elliptical rink
function pickRandomRinkTarget(clone) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random();
    clone.targetX = Math.cos(angle) * (32 * Math.sqrt(r));
    clone.targetZ = Math.sin(angle) * (20 * Math.sqrt(r));
}

// Pre allocate all the NPCs in RAM during the initialization phase
const numClones = 5;

const suitColors = [0x0044cc, 0x228833, 0xffaa00, 0x8822aa]; // blue, green, yellow, purple
const bootColors = [0xffffff, 0x222222, 0x00ffff]; //white, black, cyan
const hairColors = [0x3b2414, 0x1a1a1a]; // dark brown, black

for (let i = 0; i < numClones; i++) {
    const mySuitColor = suitColors[i % suitColors.length];
    const myBootColor = bootColors[i % bootColors.length];
    const myHairColor = hairColors[Math.floor(Math.random() * hairColors.length)];

    const cloneModel = root.clone();
    
    // Distinct colors for each NPC
    cloneModel.traverse((child) => {
        if (child.isMesh) {
            //Head
            if (Array.isArray(child.material)) {
                child.material = new THREE.MeshStandardMaterial({ 
                    color: 0xffcc99, 
                    roughness: 0.7, 
                    metalness: 0 
                }); 
            } else {
                child.material = child.material.clone();
            }
            
            child.castShadow = false;
            child.receiveShadow = false;
            
            if (child.name === 'torso' || child.name.includes('Arm')) {
                child.material.color.setHex(mySuitColor);
            } 
            else if (child.name.includes('boot')) {
                child.material.color.setHex(myBootColor);
            } 
            else if (child.name === 'hair') {
                child.geometry.dispose();
                child.geometry = new THREE.BoxGeometry(0.37, 0.1, 0.37);
                child.material.color.setHex(myHairColor);
                child.position.y = 0.23;
            }
        }
    });

    const startAngle = Math.random() * Math.PI * 2;
    const startR = Math.random();
    const startX = Math.cos(startAngle) * (32 * Math.sqrt(startR));
    const startZ = Math.sin(startAngle) * (20 * Math.sqrt(startR));
    cloneModel.position.set(startX, 0, startZ);
    scene.add(cloneModel);

    clones.push({
        mesh: cloneModel,
        state: 'skating',
        skateSpeed: 0.08 + (Math.random() * 0.08),
        targetX: undefined,
        targetZ: undefined,
        waitTime: 0
    });
}

// NPC state machine
export function updateClonesLogic(time) {
    let isAnyCloneNearGate = false;
    let isAnyGateOpen = false;
    const gateX = 0, gateZ = -24;
    const seatX = 0, seatZ = -26.6;

    // Difficulty settings ( change number of NPCs)
    let activeCount = 2; // Default 
    
    if (state.gameMode === 'challenge') {
        if (state.challengeDifficulty === 'easy') activeCount = 2;
        else if (state.challengeDifficulty === 'medium') activeCount = 3;
        else if (state.challengeDifficulty === 'hard') activeCount = 5;
    }

    clones.forEach((clone, index) => {
        // Hide inactive clones
        if (state.gameMode === 'exhibition' || index >= activeCount) {
            clone.mesh.visible = false;
            return;
        }

        clone.mesh.visible = true;

        const distToGate = Math.sqrt(Math.pow(clone.mesh.position.x - gateX, 2) + Math.pow(clone.mesh.position.z - gateZ, 2));
        if (distToGate < 5 && clone.state !== 'sitting' && clone.state !== 'skating') {
            isAnyCloneNearGate = true;
        }

        let dx, dz, dist;
        // Finite state machine 
        switch(clone.state) {
            case 'skating':
                if (clone.targetX === undefined) pickRandomRinkTarget(clone);
                dx = clone.targetX - clone.mesh.position.x;
                dz = clone.targetZ - clone.mesh.position.z;
                dist = Math.sqrt(dx*dx + dz*dz);
                
                // Move toward the target
                if (dist > 0.5) {
                    clone.mesh.position.x += (dx/dist) * clone.skateSpeed;
                    clone.mesh.position.z += (dz/dist) * clone.skateSpeed;
                    clone.mesh.lookAt(clone.targetX, clone.mesh.position.y, clone.targetZ);

                    // Anti collision logic for clones
                    clones.forEach((otherClone, j) => {
                        if (index !== j && otherClone.state === 'skating') {
                            // Compute distance 
                            const cdx = clone.mesh.position.x - otherClone.mesh.position.x;
                            const cdz = clone.mesh.position.z - otherClone.mesh.position.z;
                            const cDist = Math.sqrt(cdx*cdx + cdz*cdz);
                            
                            if (cDist < 1.8 && cDist > 0) { 
                                // Apply a repulsive separation force vector to push them apart
                                clone.mesh.position.x += (cdx/cDist) * 0.05;
                                clone.mesh.position.z += (cdz/cDist) * 0.05;
                                pickRandomRinkTarget(clone); // find a new target
                            }
                        }
                    });

                } else {
                    pickRandomRinkTarget(clone);
                }

                // Collision with the player
                const playerDist = Math.sqrt(Math.pow(root.position.x - clone.mesh.position.x, 2) + Math.pow(root.position.z - clone.mesh.position.z, 2));
                if(playerDist < 1.2 && !state.isFalling && cameraMode !== 'transition') {
                    triggerCloneCollision(clone.mesh.position.x, clone.mesh.position.z, state.gameMode);
                }

                // Random event, exit the rink
                const currentDistToGate = Math.sqrt(Math.pow(clone.mesh.position.x - 0, 2) + Math.pow(clone.mesh.position.z - (-24), 2));
                if (!isCloneOnBreak && currentDistToGate < 12 && time > lastBreakTime + 20000 && Math.random() < 0.03) {
                    clone.state = 'exiting';
                    clone.targetX = 0; clone.targetZ = -24;
                    isCloneOnBreak = true; isAnyGateOpen = true;
                    lastBreakTime = time;
                }
                break;

            case 'exiting':
            case 'walkingToSeat':
            case 'returning':
            case 'entering':
                dx = clone.targetX - clone.mesh.position.x;
                dz = clone.targetZ - clone.mesh.position.z;
                dist = Math.sqrt(dx*dx + dz*dz);
                if (dist > 0.1) {
                    clone.mesh.position.x += (dx/dist) * 0.04; // slow down the velocity
                    clone.mesh.position.z += (dz/dist) * 0.04;
                    clone.mesh.lookAt(clone.targetX, clone.mesh.position.y, clone.targetZ);
                } else {
                    // arrived at destination
                    if (clone.state === 'exiting') {
                        clone.state = 'walkingToSeat';
                        clone.targetX = seatX; clone.targetZ = seatZ;
                    } else if (clone.state === 'walkingToSeat') {
                        clone.state = 'sitting';
                        clone.waitTime = time + 5000 + Math.random() * 4000;
                        // sitting position
                        clone.mesh.lookAt(0, clone.mesh.position.y, 0);
                        clone.mesh.position.y = -0.45;
                        clone.mesh.position.z = -26.85;

                        // Hierarchical Model overrides for the sitting posture
                        const sides = ['L', 'R'];
                        sides.forEach(s => {
                            const hip = clone.mesh.getObjectByName('leg' + s);
                            const knee = clone.mesh.getObjectByName('knee' + s);
                            const ankle = clone.mesh.getObjectByName('ankle' + s);
                            const shoulder = clone.mesh.getObjectByName('arm' + s);
                            const elbow = clone.mesh.getObjectByName('elbow' + s);

                            if (hip) hip.rotation.x = -1.60;
                            if (knee) knee.rotation.x = 0.9;
                            if (ankle) ankle.rotation.x = 0.4;
                            if (shoulder) {
                                shoulder.rotation.x = -0.5;
                                shoulder.rotation.z = (s === 'L') ? 0.2 : -0.2;
                            }
                            if (elbow) elbow.rotation.x = -1.2;
                        });
                    } else if (clone.state === 'returning') {
                        clone.state = 'entering';
                        clone.targetX = 0; clone.targetZ = -18;
                    } else if (clone.state === 'entering') {
                        clone.state = 'skating';
                        isCloneOnBreak = false;
                        pickRandomRinkTarget(clone);
                    }
                }
                break;

            case 'sitting':
                if (time > clone.waitTime) {
                    clone.state = 'returning';
                    clone.mesh.position.y = 0;
                    clone.mesh.position.z = -26.6;
                    // Restoring the default rotations
                    const sides = ['L', 'R'];
                    sides.forEach(s => {
                        const hip = clone.mesh.getObjectByName('leg' + s);
                        const knee = clone.mesh.getObjectByName('knee' + s);
                        const ankle = clone.mesh.getObjectByName('ankle' + s);
                        const shoulder = clone.mesh.getObjectByName('arm' + s);
                        const elbow = clone.mesh.getObjectByName('elbow' + s);
                        
                        if (hip) hip.rotation.x = 0;
                        if (knee) knee.rotation.x = 0;
                        if (ankle) ankle.rotation.x = 0;
                        if (shoulder) { shoulder.rotation.x = 0; shoulder.rotation.z = 0; }
                        if (elbow) elbow.rotation.x = 0;
                    });
                }
                break;
        }
    });

    // Animate gates based on proximity
    if (isAnyGateOpen || isAnyCloneNearGate) {
        // Open gates
        gateLeft.rotation.y += ( (tangentAngle + Math.PI/2) - gateLeft.rotation.y ) * 0.1; // adding 90 degrees to the curve's tangent
        gateRight.rotation.y += ( (tangentAngle + Math.PI - Math.PI/2) - gateRight.rotation.y ) * 0.1;
    } else {
        // Close gates
        gateLeft.rotation.y += ( tangentAngle - gateLeft.rotation.y ) * 0.1;
        gateRight.rotation.y += ( (tangentAngle + Math.PI) - gateRight.rotation.y ) * 0.1;
    }
}