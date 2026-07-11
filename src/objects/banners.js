import { scene, renderer } from '../renderer.js';
import { HALL_RX, HALL_RZ, HALL_H, SKY_RX, SKY_RZ, DOOR_CENTER_ANGLE, DOOR_HALF_ANGLE, wallMat } from './architecture.js';
import { DOOR_LEAF_H } from './doors.js';

export const GAME_BANNER_THETA_LENGTH = 1.6;
export const GAME_BANNER_CENTER_ANGLE = DOOR_CENTER_ANGLE + Math.PI;

// Procedural Normal Map generation ( genrated once and cached in memory)
let fabricNormalTex = null;
function getFabricNormalMap() {
    if (fabricNormalTex) return fabricNormalTex;

    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');

    // Flat base (neutral normal = pure blue in tangent space)
    ctx.fillStyle = 'rgb(128,128,255)';
    ctx.fillRect(0, 0, 256, 256);

    // Thin and irregular vertical streaks to simulate fabric texture
    for (let x = 0; x < 256; x += 3) {
        const shade = 116 + Math.round(Math.random() * 24);
        ctx.strokeStyle = `rgb(${shade},${shade},255)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }

    fabricNormalTex = new THREE.CanvasTexture(c);
    fabricNormalTex.wrapS = THREE.RepeatWrapping;
    fabricNormalTex.wrapT = THREE.RepeatWrapping;
    fabricNormalTex.repeat.set(4, 6);
    return fabricNormalTex;
}

// Procedurally generates text texture 
function createTextTexture(text, bgColor, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; 
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the centered text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 130px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    // Prevent texture distortion
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    tex.repeat.x = -1; // flips the image horizontally
    tex.offset.x = 1;  

    if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.encoding = THREE.sRGBEncoding; // Gamma correction

    return tex;
}

// Scene graph assembly

function buildGameBanner() {
    const bannerGroup = new THREE.Group();
    
    const bannerRZ = HALL_RZ - 0.8;
    const bannerRX = HALL_RX - 0.8;
    const scaleX = bannerRX / bannerRZ;
    const bannerH = 4;
    const bannerY = HALL_H - 3.5;
    const thetaStart = Math.PI - GAME_BANNER_THETA_LENGTH / 2;
    const numCables = 9;

    // Non-uniform scaling to fit the elliptical arena shape
    bannerGroup.scale.set(scaleX, 1, 1);

    const gameTex = createTextTexture("ROLLER RINK 3D", "#ffffff", "#ffaa00");

    const bannerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: gameTex, 
        normalMap: getFabricNormalMap(),
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.95,
        side: THREE.DoubleSide
    });

    const bannerGeo = new THREE.CylinderGeometry(bannerRZ, bannerRZ, bannerH - 0.4, 64, 1, true, thetaStart, GAME_BANNER_THETA_LENGTH);
   
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.y = bannerY;
    bannerGroup.add(bannerMesh);

    // Rigid frames and back plates
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, side: THREE.DoubleSide });
    const backMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(bannerRZ + 0.1, bannerRZ + 0.1, bannerH + 0.2, 64, 1, true, thetaStart - 0.02, GAME_BANNER_THETA_LENGTH + 0.04),
        backMat
    );
    backMesh.position.y = bannerY;
    bannerGroup.add(backMesh);

    const topMat = new THREE.MeshStandardMaterial({ color: 0xdd2233, roughness: 0.6, side: THREE.DoubleSide });
    const topFrame = new THREE.Mesh(
        new THREE.CylinderGeometry(bannerRZ - 0.02, bannerRZ - 0.02, 0.4, 64, 1, true, thetaStart, GAME_BANNER_THETA_LENGTH),
        topMat
    );
    topFrame.position.y = bannerY + bannerH / 2 - 0.2;
    bannerGroup.add(topFrame);

    const botMat = new THREE.MeshStandardMaterial({ color: 0x0044cc, roughness: 0.6, side: THREE.DoubleSide });
    const botFrame = new THREE.Mesh(
        new THREE.CylinderGeometry(bannerRZ - 0.02, bannerRZ - 0.02, 0.4, 64, 1, true, thetaStart, GAME_BANNER_THETA_LENGTH),
        botMat
    );
    botFrame.position.y = bannerY - bannerH / 2 + 0.2;
    bannerGroup.add(botFrame);

    // Suspension cables
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    for (let i = 0; i < numCables; i++) {
        const angle = thetaStart + (i / (numCables - 1)) * GAME_BANNER_THETA_LENGTH;
        const cx = Math.sin(angle) * bannerRZ;
        const cz = Math.cos(angle) * bannerRZ;
        const cableBotY = bannerY + bannerH / 2;
        const cableLength = HALL_H - cableBotY;

        if (cableLength > 0) {
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, cableLength, 8), cableMat);
            cable.position.set(cx, cableBotY + cableLength / 2, cz);
            
            cable.scale.set(1 / scaleX, 1, 1); // Inverse hierarchical transformations, to undo parent distortion
            bannerGroup.add(cable);
        }
    }

    // banner positioned in the opposite side with respect to the door
    bannerGroup.rotation.y = DOOR_CENTER_ANGLE - Math.PI / 2;
    scene.add(bannerGroup);
}


function buildWelcomeBanner() {
    const headerBottom = DOOR_LEAF_H;
    const headerH = HALL_H - headerBottom;

    if (headerH > 0) {
        const headerGroup = new THREE.Group();
        headerGroup.scale.set(HALL_RX / HALL_RZ, 1, 1);

        const wallTheta = DOOR_HALF_ANGLE * 2.2;
        const wallThetaStart = -wallTheta / 2;

        const headerWallGeo = new THREE.CylinderGeometry(HALL_RZ, HALL_RZ, headerH, 32, 1, true, wallThetaStart, wallTheta);
        const headerWall = new THREE.Mesh(headerWallGeo, wallMat);
        headerWall.position.y = headerBottom + headerH / 2;
        headerWall.receiveShadow = true;
        headerGroup.add(headerWall);

        const bannerRadius = HALL_RZ - 0.15;
        const bannerTheta = DOOR_HALF_ANGLE * 1.8;
        const bannerThetaStart = -bannerTheta / 2;
        const welcomeBannerH = headerH - 1.2;
        const numSupports = 5;

        const welcomeTex = createTextTexture("WELCOME", "#ffaa00", "#ffffff");

        const bannerGeo = new THREE.CylinderGeometry(bannerRadius, bannerRadius, welcomeBannerH, 32, 1, true, bannerThetaStart, bannerTheta);

        const bannerMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: welcomeTex,
            normalMap: getFabricNormalMap(),
            normalScale: new THREE.Vector2(0.3, 0.3),
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const bigBanner = new THREE.Mesh(bannerGeo, bannerMat);
        bigBanner.position.y = headerBottom + headerH / 2;
        bigBanner.castShadow = true;
        headerGroup.add(bigBanner);

        headerGroup.rotation.y = DOOR_CENTER_ANGLE - Math.PI / 2;
        scene.add(headerGroup);
    }
}
function buildTeamBanners() {
    const teamBannersGroup = new THREE.Group();
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
    const bannerColors = [0x0044cc, 0xffaa00, 0x228833];

    const texLoader = new THREE.TextureLoader();
    const teamTextures = [
        texLoader.load('./assets/skater1.png'),
        texLoader.load('./assets/skater2.png'),
        texLoader.load('./assets/skater3.png')
    ];

    teamTextures.forEach(tex => {
        tex.encoding = THREE.sRGBEncoding;
    });

    const GAME_BANNER_HALF_ANGLE = GAME_BANNER_THETA_LENGTH / 2;
    function angleDelta(a, b) {
        return Math.atan2(Math.sin(a - b), Math.cos(a - b));
    }

    const bgW = 2.8;  
    const bgH = 4.0;  
    const logoW = 2.0; 
    const logoH = 3.2; 

    let teamCursor = 0;
    function addTeamBanner(t) {
        // Avoid placing banners over the door or the main game banner
        if (Math.abs(angleDelta(t, DOOR_CENTER_ANGLE)) < DOOR_HALF_ANGLE + 0.15) return;
        if (Math.abs(angleDelta(t, GAME_BANNER_CENTER_ANGLE)) < GAME_BANNER_HALF_ANGLE + 0.3) return;

        const bx = Math.cos(t) * (HALL_RX - 1.0);
        const bz = Math.sin(t) * (HALL_RZ - 1.0);
        const rotY = Math.atan2(-bx, -bz);

        // Support pole
        const poleLength = bgW + 0.3; 
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, poleLength, 8), trussMat);
        pole.position.set(bx, HALL_H - 1.8, bz);
        pole.rotation.set(0, rotY, Math.PI / 2, 'YXZ');
        
        teamBannersGroup.add(pole);

        const color = bannerColors[teamCursor % bannerColors.length];
        const currentTex = teamTextures[teamCursor % teamTextures.length];
        teamCursor++;

        // materials
        const bgMat = new THREE.MeshStandardMaterial({ // background material
            color: color,
            normalMap: getFabricNormalMap(),
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughness: 0.95,
            side: THREE.DoubleSide
        });

        const logoMat = new THREE.MeshStandardMaterial({ // logo material
            color: 0xffffff,
            map: currentTex,
            transparent: true,
            roughness: 0.9,
            depthWrite: false 
        });

        // geometries
        const bgGeo = new THREE.PlaneGeometry(bgW, bgH);
        const logoGeo = new THREE.PlaneGeometry(logoW, logoH);

        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(bx, HALL_H - 3.8, bz);
        bgMesh.rotation.y = rotY;

        const logoMesh = new THREE.Mesh(logoGeo, logoMat);
        logoMesh.position.z = 0.02; 
        bgMesh.add(logoMesh);

        //Suspension cables
        const cableLength = 1.8; 
        const cableGeo = new THREE.CylinderGeometry(0.012, 0.012, cableLength, 8);
        const cableMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            metalness: 0.8, 
            roughness: 0.4 
        });

        const inset = 0.15;
        const cableCenterY = (bgH / 2) + (cableLength / 2); 

        const cableL = new THREE.Mesh(cableGeo, cableMat);
        cableL.position.set(-bgW / 2 + inset, cableCenterY, 0);
        
        const cableR = new THREE.Mesh(cableGeo, cableMat);
        cableR.position.set(bgW / 2 - inset, cableCenterY, 0);

        bgMesh.add(cableL);
        bgMesh.add(cableR);
        
        teamBannersGroup.add(bgMesh);
    }

    const availableArc = Math.PI / 2;
    const stepAngle = availableArc / 4;

    // Right wall
    teamCursor = 0;
    for (let i = 1; i <= 3; i++) {
        const tRight = (Math.PI / 2) - (stepAngle * i);
        addTeamBanner(tRight);
    }

    // Left wall
    teamCursor = 0;
    for (let i = 1; i <= 3; i++) {
        const tLeft = (Math.PI / 2) + (stepAngle * i);
        addTeamBanner(tLeft);
    }

    teamBannersGroup.rotation.y = DOOR_CENTER_ANGLE - Math.PI / 2;
    scene.add(teamBannersGroup);
}

// Initialize all banner
buildGameBanner();
buildWelcomeBanner();
buildTeamBanners();