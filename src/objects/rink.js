
import { scene, renderer } from '../renderer.js';

export const rinkRadiusX = 36;
export const rinkRadiusZ = 24;

const texLoader = new THREE.TextureLoader();
const floorColor = texLoader.load('./assets/wood_color.jpg');
const floorRoughness = texLoader.load('./assets/wood_roughness.jpg');
const floorNormal = texLoader.load('./assets/wood_normal.jpg');

// Anisotropic Filtering to restore high-frequency details in the distance
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

[floorColor, floorRoughness, floorNormal].forEach(tex => {
    if(tex) { 
        tex.wrapS = THREE.RepeatWrapping; 
        tex.wrapT = THREE.RepeatWrapping; 
        tex.repeat.set(rinkRadiusX / 120, rinkRadiusZ / 120); 
        tex.anisotropy = maxAnisotropy; 
    }
});

if(floorColor) floorColor.encoding = THREE.sRGBEncoding;  // gamma correction

const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    map: floorColor, // Diffuse term
    roughnessMap: floorRoughness, // specular lobe spread
    normalMap: floorNormal, // render micro-shadows in the wood grooves
    normalScale: new THREE.Vector2(1.2, 1.2), 
    roughness: 0.35, 
    metalness: 0.0 
});

const ovalShape = new THREE.Shape();
ovalShape.absellipse(0, 0, rinkRadiusX, rinkRadiusZ, 0, Math.PI * 2, false, 0);

const floor = new THREE.Mesh(new THREE.ShapeGeometry(ovalShape, 150), floorMat);
floor.rotation.x = -Math.PI / 2; 
floor.receiveShadow = true;
scene.add(floor);

const gapSize = 0.0051;
const startT = 0.75 + gapSize;
const endT = 0.75 - gapSize + 1.0;
const ovalPoints3D = [];
// Loop 150 times to sample discrete mathematical control points along the rink's perimeter 
for (let i = 0; i <= 150; i++) {
    const t = startT + (i / 150) * (endT - startT);
    const angle = t * Math.PI * 2;
    ovalPoints3D.push(new THREE.Vector3(Math.cos(angle) * rinkRadiusX, 0, Math.sin(angle) * rinkRadiusZ));
}
// Generate a Catmull-Rom spline that strictly passes through all the previously computed 3D Cartesian control points
const ovalCurve = new THREE.CatmullRomCurve3(ovalPoints3D, false); 

const rail = new THREE.Mesh(new THREE.TubeGeometry(ovalCurve, 150, 0.05, 12, false), new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.3, metalness: 0.6 }));
rail.position.y = 1.15; rail.castShadow = true; scene.add(rail);

const board = new THREE.Mesh(new THREE.TubeGeometry(ovalCurve, 150, 0.05, 12, false), new THREE.MeshStandardMaterial({ color: 0x0044cc, roughness: 0.6 }));
board.scale.y = 3.0; board.position.y = 0.15; scene.add(board);

const glassMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
const glass = new THREE.Mesh(new THREE.TubeGeometry(ovalCurve, 150, 0.015, 8, false), glassMat);
glass.scale.y = 28.3; glass.position.y = 0.725; scene.add(glass); // scale the TubeGeometry to create a wall

// Mechanical gates
const gateT_angle = 0.75 * Math.PI * 2;
const gateX = Math.cos(gateT_angle) * rinkRadiusX;
const gateZ = Math.sin(gateT_angle) * rinkRadiusZ;

const tanX = -Math.sin(gateT_angle) * rinkRadiusX;
const tanZ = Math.cos(gateT_angle) * rinkRadiusZ;
const tLen = Math.sqrt(tanX * tanX + tanZ * tanZ);
// Exported tangent angle used by clones.js to animate the swinging gates
export const tangentAngle = Math.atan2(tanZ / tLen, tanX / tLen);

const gateMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.1, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const hingeMat2 = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: 0.9, roughness: 0.15 });
const postMat = new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.4, metalness: 0.3 });
const GATE_W = 1.15, GATE_H = 1.15;

function createGatePanel(side) {
    const pivot = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(GATE_W, GATE_H, 0.03), gateMat);
    panel.position.set(GATE_W / 2, GATE_H / 2, 0); panel.castShadow = true; pivot.add(panel);

    const gateRail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, GATE_W, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.6 }));
    gateRail.rotation.z = Math.PI / 2; gateRail.position.set(GATE_W / 2, GATE_H, 0); pivot.add(gateRail);
    
    const bottomBoard = new THREE.Mesh(new THREE.BoxGeometry(GATE_W, 0.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x0044cc, roughness: 0.6 }));
    bottomBoard.position.set(GATE_W / 2, 0.15, 0); pivot.add(bottomBoard);
    
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, GATE_H, 8), postMat);
    post.position.set(0, GATE_H / 2, 0); pivot.add(post);
    
    [0.3, GATE_H - 0.3].forEach(yOff => {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), hingeMat2);
        ring.position.set(0, yOff, 0); pivot.add(ring);
    });

    pivot.position.set(gateX + (tanX / tLen) * GATE_W * side, 0, gateZ + (tanZ / tLen) * GATE_W * side);
    pivot.rotation.y = side > 0 ? tangentAngle + Math.PI : tangentAngle;
    
    scene.add(pivot);
    return pivot;
}

export const gateLeft = createGatePanel(-1);
export const gateRight = createGatePanel(1);