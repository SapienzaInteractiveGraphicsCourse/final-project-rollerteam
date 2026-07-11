import { scene } from '../renderer.js';
import { HALL_RX, HALL_RZ, HALL_H, DOOR_CENTER_ANGLE, DOOR_HALF_ANGLE } from './architecture.js';

export const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x707070, roughness: 0.45, metalness: 0.55
});

export const doorLeafMat = new THREE.MeshStandardMaterial({
    color: 0x0078ff, roughness: 0.55, metalness: 0.20
});

export const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.03, metalness: 0.25,
    transparent: true, opacity: 0.55, side: THREE.DoubleSide
});

export const doorHandleMat = new THREE.MeshStandardMaterial({
    color: 0xFF0000, roughness: 0.35, metalness: 0.6,
    emissive: 0x990000, emissiveIntensity: 0.4
});

export const binBodyMat = new THREE.MeshStandardMaterial({ color: 0x2c5c38, roughness: 0.6, metalness: 0.25 });
export const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.75 });

export const DOOR_LEAF_H = 2.8; 
const JAMB_W = 0.70;

export function buildDoors() {
    
    const leftAngle = DOOR_CENTER_ANGLE - DOOR_HALF_ANGLE;
    const rightAngle = DOOR_CENTER_ANGLE + DOOR_HALF_ANGLE;

    const leftX = Math.cos(leftAngle) * HALL_RX;
    const leftZ = Math.sin(leftAngle) * HALL_RZ;

    const rightX = Math.cos(rightAngle) * HALL_RX;
    const rightZ = Math.sin(rightAngle) * HALL_RZ;
    
    const doorWidth = Math.hypot(rightX - leftX, rightZ - leftZ);

    // Vertical frames
    [-1, 1].forEach(side => {
        const angle = DOOR_CENTER_ANGLE + side * DOOR_HALF_ANGLE;
        const x = Math.cos(angle) * HALL_RX;
        const z = Math.sin(angle) * HALL_RZ;

        const jamb = new THREE.Mesh(new THREE.BoxGeometry(JAMB_W, HALL_H, JAMB_W), doorFrameMat);
        jamb.position.set(x, HALL_H / 2, z);
        jamb.castShadow = true; jamb.receiveShadow = true;
        scene.add(jamb);
    });

    // Top frame
    const lintelWidth = Math.abs(rightX - leftX) + JAMB_W;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(lintelWidth, 0.22, 0.30), doorFrameMat);
    lintel.position.set(0, DOOR_LEAF_H + 0.11, HALL_RZ - 0.15);
    lintel.castShadow = true; lintel.receiveShadow = true;
    scene.add(lintel);

    // Threshold
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.45, 0.12, 0.35), doorFrameMat);
    threshold.position.set(0, 0.06, HALL_RZ);
    scene.add(threshold);

    // Door leaf
    function buildDoorLeaf(side) {
        const leaf = new THREE.Group();
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(doorWidth / 2 - 0.10, DOOR_LEAF_H, 0.08), doorLeafMat);
        body.castShadow = true; leaf.add(body);
        
        const border = new THREE.Mesh(new THREE.BoxGeometry(doorWidth / 2 - 0.02, DOOR_LEAF_H + 0.02, 0.02), doorFrameMat);
        border.position.z = 0.05; leaf.add(border);
        
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth / 2 - 0.42, DOOR_LEAF_H - 0.55), doorGlassMat);
        glass.position.z = 0.055; leaf.add(glass);
        
        const midRail = new THREE.Mesh(new THREE.BoxGeometry(doorWidth / 2 - 0.15, 0.12, 0.10), doorFrameMat);
        leaf.add(midRail);
        
        const panicBar = new THREE.Group();
        const panicBarWidth = doorWidth / 2 - 0.35;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(panicBarWidth, 0.05, 0.05), doorHandleMat);
        panicBar.add(bar);
        
        const supportLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), doorHandleMat);
        supportLeft.position.x = -panicBarWidth / 2 + 0.03; supportLeft.position.z = 0.02; panicBar.add(supportLeft);
        
        const supportRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), doorHandleMat);
        supportRight.position.x = panicBarWidth / 2 - 0.03; supportRight.position.z = 0.02; panicBar.add(supportRight);
        
        panicBar.position.set(0, 0, -0.08); leaf.add(panicBar);
        
        // Translate the group nto Global world space
        leaf.position.set(side * doorWidth / 4, DOOR_LEAF_H / 2, HALL_RZ + 0.03);
        return leaf;
    }

    
    scene.add(buildDoorLeaf(-1));
    scene.add(buildDoorLeaf(1));

    const binEntranceL = buildBin();
    binEntranceL.position.set(-doorWidth / 2 - 1.6, 0, HALL_RZ - 1.6);
    scene.add(binEntranceL);
 
    const binEntranceR = buildBin();
    binEntranceR.position.set(doorWidth / 2 + 1.6, 0, HALL_RZ - 1.6);
    scene.add(binEntranceR);
}

function buildBin() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.20, 0.75, 10), binBodyMat);
    body.position.y = 0.375; body.castShadow = true; body.receiveShadow = true; g.add(body);
    
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), benchMetalMat);
    lid.position.y = 0.77; lid.castShadow = true; g.add(lid);
    
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.01), benchMetalMat);
    slot.position.set(0, 0.71, 0.27); g.add(slot);
    
    return g;
}


buildDoors();