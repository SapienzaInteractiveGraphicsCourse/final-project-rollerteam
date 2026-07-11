import { scene } from '../renderer.js';
import { buildSpectators } from './spectators.js';

const seatAnchors = [];

export function buildDetailedStands(x, z, rotationY) {
    const stands = new THREE.Group();
    const steps = 8;
    
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0. });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xdd2233, roughness: 0.45, metalness: 0.1 });

    const cushionGeo = new THREE.BoxGeometry(0.8, 0.1, 0.45);
    const backGeo = new THREE.BoxGeometry(0.8, 0.35, 0.08);
    const curvedStepGeo = new THREE.BoxGeometry(1.0, 0.4, 1.2);

    // Central straight block
    const centerSeatXs = [];
    for (let j = -9; j <= 9; j += 1.0) {
        centerSeatXs.push(j);
    }

    const maxTheta = Math.PI / 2.2;

    const SEAT_PITCH = 1.0; // physical distance between 2 adjacent seats
    const curvedRowSeatCounts = [];
    for (let i = 0; i < steps; i++) {
        const Ri = 28 + i * 1.2;
        const arcLength = Ri * maxTheta; // arc length of each row based on its radius
        curvedRowSeatCounts.push(Math.max(4, Math.round(arcLength / SEAT_PITCH))); // Divide the arc length by the pitch to determine how many seats fit in this row
    }
    // Accumulate total instance counts for VRAM buffer allocation
    const totalCurvedSeatsAllRows = curvedRowSeatCounts.reduce((sum, n) => sum + n, 0) * 2;

    const totalSeats = centerSeatXs.length * steps + totalCurvedSeatsAllRows;
    const totalCurvedSteps = totalCurvedSeatsAllRows;

    // Allocated a single InstancedMesh per component ( only 3 Draw calls)
    const cushionMesh = new THREE.InstancedMesh(cushionGeo, seatMat, totalSeats);
    const backMesh = new THREE.InstancedMesh(backGeo, seatMat, totalSeats);
    const curvedStepMesh = new THREE.InstancedMesh(curvedStepGeo, concreteMat, totalCurvedSteps);

    cushionMesh.castShadow = true; cushionMesh.receiveShadow = true;
    backMesh.castShadow = true; backMesh.receiveShadow = true;
    curvedStepMesh.castShadow = true; curvedStepMesh.receiveShadow = true;

    // Object strictly used to compute the 4x4 Transformation Matrices (M = T * R * S)
    // locally on the CPU before uploading them to the GPU instance buffers.
    const dummy = new THREE.Object3D();
    let seatIdx = 0, curvedStepIdx = 0;

    function placeSeat(lx, ly, lz, rotY, colInRow) {
        // Cushion Matrix
        dummy.position.set(lx, ly + 0.05, lz);
        dummy.rotation.set(0, rotY, 0, 'YXZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); 
        cushionMesh.setMatrixAt(seatIdx, dummy.matrix);

        // Backrest Matrix (with trigonometric offset and a -12° ergonomic pitch)
        const backOffsetX = -0.26 * Math.sin(rotY);
        const backOffsetZ = -0.26 * Math.cos(rotY);
        dummy.position.set(lx + backOffsetX, ly + 0.25, lz + backOffsetZ);
        dummy.rotation.set(THREE.MathUtils.degToRad(-12), rotY, 0, 'YXZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        backMesh.setMatrixAt(seatIdx, dummy.matrix);
        seatIdx++;

        // position vector in Local Space
        const localPos = new THREE.Vector3(lx, ly, lz);

        // apply the global rotatio matrix
        localPos.applyEuler(new THREE.Euler(0, rotationY, 0));

        // Translate the vector to its final position in Global World Space
        localPos.add(new THREE.Vector3(x, 0, z));

        // Cache the absolute global coordinates
        seatAnchors.push({ 
            x: localPos.x, 
            y: localPos.y, 
            z: localPos.z, 
            rotY: rotY + rotationY, 
            colInRow: colInRow
        });
        
    }

    function placeCurvedStep(lx, ly, lz, rotY, arcWidth) {
        dummy.position.set(lx, ly, lz);
        dummy.rotation.set(0, rotY, 0, 'YXZ');
        dummy.scale.set(arcWidth * 1.05, 1, 1); 
        dummy.updateMatrix();
        curvedStepMesh.setMatrixAt(curvedStepIdx, dummy.matrix);
        curvedStepIdx++;

    }

    // 1. Straight central block
    for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 1.2), concreteMat);
        step.position.set(0, i * 0.4 + 0.2, -i * 1.2);
        step.receiveShadow = true; step.castShadow = true;
        stands.add(step);
        centerSeatXs.forEach((j, colInRow) => placeSeat(j, i * 0.4 + 0.4, -i * 1.2 + 0.2, 0, i, colInRow));
    }

    // 2. Curved lateral extensions
    for (let i = 0; i < steps; i++) {
        const Ri = 28 + i * 1.2;
        const curvedSeatCount = curvedRowSeatCounts[i];
        const arcWidth = Ri * (maxTheta / curvedSeatCount);
        let colInRow = 0;
        
        for (let s = 0.5; s < curvedSeatCount; s++) {
            const theta = s * (maxTheta / curvedSeatCount);

            // Right side (+X)
            const baseX_R = 12 + Ri * Math.sin(theta);
            const baseZ_R = 28 - Ri * Math.cos(theta);
            const seatX_R = baseX_R - 0.2 * Math.sin(theta);
            const seatZ_R = baseZ_R + 0.2 * Math.cos(theta);
            placeSeat(seatX_R, i * 0.4 + 0.4, seatZ_R, -theta, colInRow);
            placeCurvedStep(baseX_R, i * 0.4 + 0.2, baseZ_R, -theta, arcWidth);

            // Left side (-X)
            const baseX_L = -12 - Ri * Math.sin(theta);
            const baseZ_L = 28 - Ri * Math.cos(theta);
            const seatX_L = baseX_L + 0.2 * Math.sin(theta);
            const seatZ_L = baseZ_L + 0.2 * Math.cos(theta);
            placeSeat(seatX_L, i * 0.4 + 0.4, seatZ_L, theta, colInRow);
            placeCurvedStep(baseX_L, i * 0.4 + 0.2, baseZ_L, theta, arcWidth);

            colInRow ++;
        }
    }

    cushionMesh.instanceMatrix.needsUpdate = true;
    backMesh.instanceMatrix.needsUpdate = true;
    curvedStepMesh.instanceMatrix.needsUpdate = true;
    stands.add(cushionMesh, backMesh, curvedStepMesh);

    stands.position.set(x, 0, z);
    stands.rotation.y = rotationY;
    scene.add(stands);

    // Pass the calculated global anchors to generate the audience
    const spectatorsGroup = buildSpectators(seatAnchors, 0.2); 
    if (spectatorsGroup) {
        scene.add(spectatorsGroup);
    }
}

// Initialize the stands
buildDetailedStands(0, -27.2, 0); 