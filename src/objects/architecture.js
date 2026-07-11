import { scene } from '../renderer.js';
import { rinkRadiusX, rinkRadiusZ } from './rink.js';
import { buildPendantLight } from './lighting.js'; 


export const HALL_RX = rinkRadiusX + 16;
export const HALL_RZ = rinkRadiusZ + 16;
export const HALL_H = 10; 
export const SKY_RX = rinkRadiusX + 4;
export const SKY_RZ = rinkRadiusZ + 4;

export const DOOR_CENTER_ANGLE = Math.PI / 2;
export const DOOR_HALF_ANGLE = 0.13; 

export const skylightMat = new THREE.MeshStandardMaterial({
    color: 0xcfe6ff, 
    roughness: 1, 
    metalness: 0.05, 
    transparent: true,
    opacity: 0.5, side: THREE.DoubleSide, emissive: 0x000000, emissiveIntensity: 0, depthWrite: false
});

export const wallMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    roughness: 0.9, 
    side: THREE.DoubleSide 
});
export const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x0044cc, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
export const friezeMat = new THREE.MeshStandardMaterial({ color: 0xdd2233, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
export const pilasterMat = new THREE.MeshStandardMaterial({ color: 0x889098, roughness: 0.6, metalness: 0.3 });
export const ledMat = new THREE.MeshBasicMaterial({ color: 0xbbddff });

function buildHallFloor() {
    const hallFloorShape = new THREE.Shape();
    hallFloorShape.absellipse(0, 0, HALL_RX - 0.5, HALL_RZ - 0.5, 0, Math.PI * 2, false, 0);

    const hallFloorMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a3a3a, 
        roughness: 0.8, 
        metalness: 0.1 
    });

    const hallFloor = new THREE.Mesh(new THREE.ShapeGeometry(hallFloorShape, 64), hallFloorMat);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.y = -0.02;
    hallFloor.receiveShadow = true;
    scene.add(hallFloor);
}

function buildWallArc(startAngle, endAngle) {
    if (endAngle < startAngle) endAngle += Math.PI * 2;
    const arcLength = endAngle - startAngle;

    const group = new THREE.Group();
    // Coordinate space alignment 
    const cylStart = startAngle - Math.PI / 2;

    // Curved wall
    const wallGeo = new THREE.CylinderGeometry(1, 1, HALL_H, 64, 1, true, cylStart, arcLength);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = HALL_H / 2;
    wall.scale.set(HALL_RX, 1, HALL_RZ); 
    wall.receiveShadow = true;
    group.add(wall);

    const wainscot = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.9, 64, 1, true, cylStart, arcLength), wainscotMat);
    wainscot.position.y = 0.45;
    wainscot.scale.set(HALL_RX - 0.05, 1, HALL_RZ - 0.05);
    group.add(wainscot);

    const ledStrip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 64, 1, true, cylStart, arcLength), ledMat);
    ledStrip.position.y = HALL_H - 0.8;
    ledStrip.scale.set(HALL_RX - 0.05, 1, HALL_RZ - 0.05);
    group.add(ledStrip);

    const frieze = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 64, 1, true, cylStart, arcLength), friezeMat);
    frieze.position.y = HALL_H - 0.25;
    frieze.scale.set(HALL_RX - 0.05, 1, HALL_RZ - 0.05);
    group.add(frieze);

    // Pilaster
    const numPilasters = 36;
    const pilasterHeight = HALL_H - 0.9;
    const pilasterGeo = new THREE.BoxGeometry(0.3, pilasterHeight, 0.2);

    for (let i = 0; i <= numPilasters; i++) {
        const t = startAngle + (i / numPilasters) * arcLength;
        // Parametric coordinates for the ellipse
        const x = Math.cos(t) * (HALL_RX - 0.05);
        const z = Math.sin(t) * (HALL_RZ - 0.05);

        const dx = -HALL_RX * Math.sin(t);
        const dz = HALL_RZ * Math.cos(t);
        const rotY = Math.atan2(dx, dz) + Math.PI / 2; // normal vector angle

        const pilaster = new THREE.Mesh(pilasterGeo, pilasterMat);
        pilaster.position.set(x, 0.9 + pilasterHeight / 2, z);
        pilaster.rotation.y = rotY;
        pilaster.castShadow = true;
        group.add(pilaster);
    }

    scene.add(group);
}

function buildRoofAndSkylight() {
    
    const roofShape = new THREE.Shape();
    roofShape.absellipse(0, 0, HALL_RX, HALL_RZ, 0, Math.PI * 2, false, 0);

    const roofHole = new THREE.Path();
    roofHole.absellipse(0, 0, SKY_RX, SKY_RZ, 0, Math.PI * 2, false, 0);
    roofShape.holes.push(roofHole);

    const roof = new THREE.Mesh(new THREE.ShapeGeometry(roofShape, 64), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, side: THREE.DoubleSide }));
    roof.rotation.x = -Math.PI / 2; 
    roof.position.y = HALL_H;
    roof.receiveShadow = true; 
    roof.castShadow = true;
    scene.add(roof);

    // Skylight glass
    const skyShape = new THREE.Shape();
    skyShape.absellipse(0, 0, SKY_RX, SKY_RZ, 0, Math.PI * 2, false, 0);
    const skylightGlass = new THREE.Mesh(new THREE.ShapeGeometry(skyShape, 64), skylightMat);
    skylightGlass.rotation.x = -Math.PI / 2; skylightGlass.position.y = HALL_H - 0.05;
    scene.add(skylightGlass);

    // Truss placement
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
    const trussCount = 7;
    
    for (let i = 0; i < trussCount; i++) {
        const f = (i / (trussCount - 1) - 0.5) * 2;
        const localZ = f * SKY_RZ * 0.96;
        const localXHalf = SKY_RX * Math.sqrt(Math.max(0, 1 - (localZ / SKY_RZ) ** 2));
        if (localXHalf < 0.3) continue;
        
        const beam = new THREE.Mesh(new THREE.BoxGeometry(localXHalf * 2, 0.15, 0.25), trussMat);
        beam.position.set(0, HALL_H + 0.075, localZ);
        scene.add(beam);

        // Pendant light placement
        if (i === 2 || i === 4) {
            scene.add(buildPendantLight(-12, localZ, HALL_H, HALL_H - 1.5));
            scene.add(buildPendantLight(12, localZ, HALL_H, HALL_H - 1.5));
        }
        
    }
    
}


// Main generation function
export function buildIndoorHall() {
    buildHallFloor();
    // Generate the C shaped wall leaving space for the doors
    const start = DOOR_CENTER_ANGLE + DOOR_HALF_ANGLE;
    const end = DOOR_CENTER_ANGLE - DOOR_HALF_ANGLE;
    buildWallArc(start, end);
    buildRoofAndSkylight();
}


