
import { scene } from '../renderer.js';
import { HALL_RX, HALL_RZ, HALL_H } from './architecture.js';
 
// Export the hands to animate them from the day/night cycle
export let clockHourHand = null;
export let clockMinuteHand = null;
 
export function initWallClock() {
    function buildWallClock() {
        const clockGroup = new THREE.Group();
        
        // Dial and hour ticks, procedural 2D texture
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 512;
        faceCanvas.height = 512;
        const ctx = faceCanvas.getContext('2d');
 
        ctx.fillStyle = '#f4ecd8';
        ctx.beginPath(); ctx.arc(256, 256, 248, 0, Math.PI * 2); ctx.fill();
 
        ctx.fillStyle = '#3a2a18';
        for (let h = 0; h < 12; h++) {
            // Calculate the angle in radians for the current hour (a full circle is 2π)
            const a = (h / 12) * Math.PI * 2;
            const isMain = h % 3 === 0; // Make 12, 3, 6, and 9 ticks longer
            const rOuter = 235, rInner = isMain ? 195 : 213;

            // Map polar coordinates to Cartesian to draw the lines
            const x1 = 256 + Math.sin(a) * rOuter; 
            const x2 = 256 + Math.sin(a) * rInner;
            const y1 = 256 - Math.cos(a) * rOuter;
            const y2 = 256 - Math.cos(a) * rInner;
            ctx.lineWidth = isMain ? 9 : 4;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
 
        // Convert the generated canvas into a WebGL texture
        const faceTex = new THREE.CanvasTexture(faceCanvas);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: faceTex, roughness: 0.65 });
        const face = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), faceMat);
        clockGroup.add(face);
 
        // Metal frame
        const clockFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.06, 12, 48), clockFrameMat);
        clockGroup.add(rim);
 
        // Central pin
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), clockFrameMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.z = 0.035;
        clockGroup.add(pin);
 
        // Hour hand 
        const hourHand = new THREE.Group(); // The parent group acts as the rotation center (pivot)
        const hourMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.55, 0.02), clockFrameMat);
        hourMesh.position.y = 0.275; // Shift the mesh upwards by exactly half its height allowing the hand to rotate around the central pin
        hourHand.add(hourMesh);
        hourHand.position.z = 0.045;
        clockGroup.add(hourHand);
 
        // Minute hand (Hierarchical Model with shifted Pivot)
        const minuteHand = new THREE.Group();
        const minuteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.85, 0.02), clockFrameMat);
        minuteMesh.position.y = 0.425;
        minuteHand.add(minuteMesh);
        minuteHand.position.z = 0.055;
        clockGroup.add(minuteHand);
 
        // Save the global references in the module
        clockHourHand = hourHand;
        clockMinuteHand = minuteHand;
 
        return clockGroup;
    }
 
    // Positioning on the wall
    const clockAngle = 0.02;
    const clockX = Math.cos(clockAngle) * (HALL_RX - 0.35);
    const clockZ = Math.sin(clockAngle) * (HALL_RZ - 0.35);
    const clockRotY = Math.atan2(-clockX, -clockZ); 
 
    const wallClock = buildWallClock();
    wallClock.position.set(clockX, HALL_H - 3.5, clockZ);
    wallClock.rotation.y = clockRotY;
    wallClock.scale.set(1.4, 1.4, 1.4);
    scene.add(wallClock);
}
