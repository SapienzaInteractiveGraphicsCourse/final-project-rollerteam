import { scene } from '../renderer.js';

// Helper function to create boxes which are used to build the different body parts
function box(w, h, d, col){
    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w,h,d),
        new THREE.MeshStandardMaterial({color: col, roughness: 0.7, metalness: 0.1})
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

// Main wrapper
const skaterContainer = new THREE.Group();
scene.add(skaterContainer);

// Root node to apply global animations
const root = new THREE.Group();
skaterContainer.add(root);

// Central mesh ( every limb is attached to it )
const torso = box(0.52, 0.62, 0.3, 0xe63946, 0.85, 0.0);
torso.name = 'torso';
torso.position.y = 1.40;
root.add(torso);

// Canvas for the front face
const canvas = document.createElement('canvas');
canvas.width = 512; canvas.height = 512;
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#ffcc99'; // skin color
ctx.fillRect(0, 0, 512, 512);

const faceCanvasTex = new THREE.CanvasTexture(canvas);
faceCanvasTex.colorSpace = THREE.SRGBColorSpace;

// Material for the front face
const faceMaterial = new THREE.MeshStandardMaterial({ 
    map: faceCanvasTex, 
    roughness: 0.6, 
    metalness: 0.1 
});

// Canvas for the side and back faces
const sideCanvas = document.createElement('canvas');
sideCanvas.width = 512;
sideCanvas.height = 512;
const sideCtx = sideCanvas.getContext('2d');

sideCtx.fillStyle = '#ffcc99';
sideCtx.fillRect(0, 0, 512, 512);
sideCtx.fillStyle = '#E49847'; // hair color
sideCtx.fillRect(0, 0, 512, 240); 

const sideTex = new THREE.CanvasTexture(sideCanvas);
sideTex.colorSpace = THREE.SRGBColorSpace;

const sideMaterial = new THREE.MeshStandardMaterial({ 
    map: sideTex, 
    roughness: 0.6, 
    metalness: 0.1 
});

const skinMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffcc99, 
    roughness: 0.6, 
    metalness: 0.1 
});

// Multi material array mapping to 6 faces of the BoxGeometry
const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.36, 0.36, 0.36),
  [
    sideMaterial, // Right 
    sideMaterial, // left
    skinMaterial,  // Top
    skinMaterial, // Bottom
    faceMaterial, // front
    sideMaterial  // back
  ]
);

head.castShadow = true;
head.receiveShadow = true;
head.position.y = 0.5;
torso.add(head);

const faceImg = new Image();
faceImg.src = './assets/face.png';
faceImg.onload = () => {
  ctx.drawImage(faceImg, 0, 0, 512, 512); // push the raster image into the Canvas context
  faceCanvasTex.needsUpdate = true;
};

const hair = box(0.36, 0.04, 0.36, 0xe49847, 0.9, 0.0);
hair.name = 'hair';
hair.position.y = 0.20; 
head.add(hair);

export const wheels = [];

// ARMS hierarchy (Shoulder -> Elbow -> Hand)
function makeArm(side) {
    // SHOULDER joint for rotation
    const shoulder = new THREE.Group();
    shoulder.name = (side === 1) ? 'armL' : 'armR';
    shoulder.position.set(side * 0.32, 0.2, 0);
    torso.add(shoulder);

    // Visual marker to emphasize the hierarchical node connection
    const jointS = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshLambertMaterial({color: 0x333333}));
    shoulder.add(jointS);

    // Upper arm mesh
    const upperArmLength = 0.3;
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, upperArmLength, 12), new THREE.MeshLambertMaterial({color: 0xe63946}));
    upperArm.name = (side === 1) ? 'upperArmL' : 'upperArmR';
    // Translation (translate geometry vertices down by half its length, so local origin aligns with shoulder group pivot)
    upperArm.geometry.translate(0, -upperArmLength / 2, 0);
    shoulder.add(upperArm);

    // ELBOW joint
    const elbow = new THREE.Group();
    elbow.name = (side === 1) ? 'elbowL' : 'elbowR';
    elbow.position.y = -upperArmLength;
    shoulder.add(elbow);
    // visual marker
    const jointE = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshLambertMaterial({color: 0x333333}));
    elbow.add(jointE);
    // Lower arm mesh
    const lowerArmLength = 0.26;
    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, lowerArmLength, 12), new THREE.MeshLambertMaterial({color: 0xe63946}));
    lowerArm.name = (side === 1) ? 'lowerArmL' : 'lowerArmR';

    lowerArm.geometry.translate(0, -lowerArmLength / 2, 0);
    elbow.add(lowerArm);

    // Hand mesh
    const hand = box(0.12, 0.12, 0.12, 0xffcc99, 0.6, 0.1);
    hand.position.y = -lowerArmLength - 0.06;
    elbow.add(hand);

    return { shoulder, elbow };
}

const armL = makeArm(1);
const armR = makeArm(-1);

// LEGS hierarchy (Hip -> Knee -> Ankle)
function makeLeg(side) {
    // HIP joint ( attached to the torso)
    const hip = new THREE.Group();
    hip.name = (side === 1) ? 'legL' : 'legR';
    hip.position.set(side * 0.16, -0.31, 0);
    torso.add(hip);
    // visual marker
    const jointH = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshLambertMaterial({color: 0x333333}));
    hip.add(jointH);

    // Thigh mesh ( translated to align local origin with hip group pivot)
    const thighLength = 0.4;
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, thighLength, 12), new THREE.MeshLambertMaterial({color: 0x1a1a4a}));
    thigh.name = (side === 1) ? 'thighL' : 'thighR';
    thigh.geometry.translate(0, -thighLength / 2, 0);
    hip.add(thigh);

    // KNEE joint
    const knee = new THREE.Group();
    knee.name = (side === 1) ? 'kneeL' : 'kneeR';
    knee.position.y = -thighLength;
    hip.add(knee);

    const jointK = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshLambertMaterial({color: 0x333333}));
    knee.add(jointK);

    const shinLength = 0.4;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, shinLength, 12), new THREE.MeshLambertMaterial({color: 0x1a1a4a}));
    shin.name = (side === 1) ? 'shinL' : 'shinR';
    shin.geometry.translate(0, -shinLength / 2, 0);
    knee.add(shin);

    // ANKLE joint
    const ankle = new THREE.Group();
    ankle.name = (side === 1) ? 'ankleL' : 'ankleR';
    ankle.position.y = -shinLength;
    knee.add(ankle);

    const jointA = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16), 
        new THREE.MeshLambertMaterial({color: 0x333333})
    );
    ankle.add(jointA);

    // ROLLERBLADES
    const boot = box(0.14, 0.16, 0.28, 0xe63946, 0.4, 0.1);
    boot.name = 'boot'
    boot.position.set(0, -0.09, 0.04);
    ankle.add(boot);

    const frame = box(0.10, 0.03, 0.26, 0xaaaaaa, 0.2, 0.8);
    frame.position.set(0, -0.185, 0.04);
    ankle.add(frame);

    const stopperMat = new THREE.MeshLambertMaterial({color: 0x333333});
    const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.07, 16), stopperMat);
    stopper.position.set(0, -0.22, 0.18);
    stopper.rotation.x = -Math.PI / 7;
    ankle.add(stopper);

    // Tread texture: vertical dashes with gaps between them
    const treadCanvas = document.createElement('canvas');
    treadCanvas.width = 256;
    treadCanvas.height = 64;
    const tctx = treadCanvas.getContext('2d');
    tctx.fillStyle = '#ffcc00';
    tctx.fillRect(0, 0, 256, 64);

    // Draw a single dashed line in the center of the canvas
    tctx.strokeStyle = '#505154';
    tctx.lineWidth = 18; // Line thickness
    tctx.setLineDash([23, 18]); // 23px of dash, 18px of gap
    tctx.beginPath();
    tctx.moveTo(0, 32);   // Start from the left edge, at the center (y=32)
    tctx.lineTo(256, 32); // End at the right edge, at the center (y=32)
    tctx.stroke();

    const treadTex = new THREE.CanvasTexture(treadCanvas);
    treadTex.wrapS = THREE.RepeatWrapping;
    treadTex.encoding = THREE.sRGBEncoding;

    // Side texture, single-color spiral
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 128;
    sideCanvas.height = 128;
    const sctx = sideCanvas.getContext('2d');
    sctx.fillStyle = '#ffcc00';
    sctx.fillRect(0, 0, 128, 128);
    sctx.strokeStyle = '#505154';
    sctx.lineWidth = 10;
    sctx.beginPath();
    const turns = 2.5, cx = 64, cy = 64, maxR = 58;
    for (let a = 0; a <= turns * Math.PI * 2; a += 0.05) {
        const r = (a / (turns * Math.PI * 2)) * maxR;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        a === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    }
    sctx.stroke();
    const sideTex = new THREE.CanvasTexture(sideCanvas);
    sideTex.encoding = THREE.sRGBEncoding;

    const treadMat = new THREE.MeshLambertMaterial({ map: treadTex });
    const sideMat = new THREE.MeshLambertMaterial({ map: sideTex });
    // group 0 = tread (side), groups 1/2 = the two caps
    const wheelMat = [treadMat, sideMat, sideMat];
    const wheelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14);

    const xOffsets = [-0.065, 0.065];
    const zOffsets = [0.14, -0.06];

    xOffsets.forEach(x => {
        zOffsets.forEach(z => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, -0.245, z);
            ankle.add(w);
            wheels.push(w);
        });
    });

    return { hip, knee, ankle };
}

const legL = makeLeg(1);
const legR = makeLeg(-1);

// export the parts needed for animations and physics
export { root, torso, legL, legR, armL, armR };