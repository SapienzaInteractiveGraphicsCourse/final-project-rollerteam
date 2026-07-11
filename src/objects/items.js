import { scene } from '../renderer.js';
import { state } from '../state.js';
import { root } from './skater.js';
import { updateScore, updateHUDText, challengeActive } from '../hud.js';
import { rinkRadiusX, rinkRadiusZ } from './rink.js';
import { applyItemPhysicsPenalty } from '../logic/physics.js';

export const itemsPool = [];
let lastSpawnTime = 0;

function createStarGeometry() {
    const starShape = new THREE.Shape();
    const outerRadius = 0.35;
    const innerRadius = 0.15;
    const spikes = 5;

    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (spikes * 2)) * Math.PI * 2 - (Math.PI / 2); 
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.02,
        bevelSegments: 2
    };
    
    const geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    geometry.center(); 
    return geometry;
}

function initItems() {
    // 1. BONUS 3D Stars
    const starGeo = createStarGeometry();
    const starMat = new THREE.MeshStandardMaterial({ 
        color: 0xffcc00, metalness: 0.8, roughness: 0.2, emissive: 0xaa8800 
    });

    for(let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(starGeo, starMat);
        mesh.castShadow = true;
        scene.add(mesh);
        itemsPool.push({ mesh, type: 'bonus', active: false, isFlying: false, despawnTime: 0 });
    }

     // 2. MALUS Orange Cones
    const coneGeo = new THREE.ConeGeometry(0.25, 0.6, 16);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff0800, roughness: 0.8 }); 
    for(let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(coneGeo, coneMat);
        mesh.castShadow = true;
        scene.add(mesh);
        itemsPool.push({ mesh, type: 'malus', active: false, isFlying: false, despawnTime: 0 });
    }
}

export function updateItems(time) {
    if (state.gameMode !== 'challenge' || !challengeActive) {
        itemsPool.forEach(item => item.mesh.visible = false);
        lastSpawnTime = time; 
        return;
    }

    // throwing logic from the stands
    if (time - lastSpawnTime > 4000) {
        lastSpawnTime = time;
        
        const inactiveItems = itemsPool.filter(i => !i.active);
        if (inactiveItems.length > 0) {

            const targetType = Math.random() < 0.5 ? 'bonus' : 'malus';
            
            // Filter the inactive objects, taking only those of the chosen type
            let candidates = inactiveItems.filter(i => i.type === targetType);
            
            // Safety fallback, if there are no clones of one type draw from what is left available
            if (candidates.length === 0) {
                candidates = inactiveItems;
            }

            // Pick a random object from the final candidates
            const item = candidates[Math.floor(Math.random() * candidates.length)];
            item.active = true;
            item.isFlying = true; 
            item.mesh.visible = true;
            
            // Starting point from the stands (180°) + a random value up to Math.PI
            const spawnAngle = Math.PI + (Math.random() * Math.PI); 
            
            const startX = Math.cos(spawnAngle) * (rinkRadiusX + 6); 
            const startZ = Math.sin(spawnAngle) * (rinkRadiusZ + 6);
            
            // randomness to the height 
            const startY = 4.0 + (Math.random() * 3.0); 

            const targetAngle = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.8; 
            const targetX = Math.cos(targetAngle) * (rinkRadiusX * r);
            const targetZ = Math.sin(targetAngle) * (rinkRadiusZ * r);
            const targetY = item.type === 'bonus' ? 0.6 : 0.3;

            item.mesh.position.set(startX, startY, startZ);
            item.mesh.scale.set(1, 1, 1);

            const throwData = { t: 0 }; 
            new TWEEN.Tween(throwData)
                .to({ t: 1 }, 1200) 
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(() => {
                    item.mesh.position.x = startX + (targetX - startX) * throwData.t;
                    item.mesh.position.z = startZ + (targetZ - startZ) * throwData.t;
                    const parabolaArc = 4 * 3.5 * throwData.t * (1 - throwData.t); 
                    item.mesh.position.y = startY + (targetY - startY) * throwData.t + parabolaArc;

                    item.mesh.rotation.x += 0.15;
                    item.mesh.rotation.z += 0.15;
                    if(item.type === 'bonus') item.mesh.rotation.y += 0.2;
                })
                .onComplete(() => {
                    item.isFlying = false; 
                    item.mesh.rotation.set(0, 0, 0); 
                })
                .start();

            item.despawnTime = time + 12000;
        }
    }

    // Collision logic
    itemsPool.forEach(item => {
        if (!item.active) return;

        // Star spins and floats when on the ground
        if (!item.isFlying && item.type === 'bonus') {
            item.mesh.rotation.y += 0.04;
            item.mesh.position.y = 0.6 + Math.sin(time * 0.005) * 0.1;
        }

        if (time > item.despawnTime) {
            item.active = false;
            item.mesh.visible = false;
            return;
        }

        if (!item.isFlying) {
            const dx = root.position.x - item.mesh.position.x;
            const dz = root.position.z - item.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 1.2 && !state.isFalling) {
                item.active = false;
                item.mesh.visible = false;

                if (item.type === 'bonus') {
                    updateScore(150);
                    updateHUDText("🌟 Star! (+150)");
                } else {
                    updateScore(-100);
                    updateHUDText("⚠️ Cone! (-100)");
                    applyItemPhysicsPenalty(); 
                }
            }
        }
    });
}

// Automatically initialize the meshes on startup
initItems();