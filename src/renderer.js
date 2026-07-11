const canvas = document.getElementById('cv');
const cont = canvas.parentElement;

// 1. RENDERER configuration
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference: "high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); //limit the pixel ratio to 1.5
renderer.setSize(cont.clientWidth, cont.clientHeight);

// Shadow map configuration
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

// color management
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Compression HDR light values into 0-1 Low Dynamic Range space preventing burnt-out white
renderer.toneMappingExposure = 1.15; // multiply the global light intensity by 15% prior to the Tone Mapping compression
renderer.outputEncoding = THREE.sRGBEncoding; // Reverse gamma correction C_out = C_in^1/γ


// 2. SCENE, CAMERA setup
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(35, cont.clientWidth/cont.clientHeight, 0.1, 1000);
camera.position.set(0, 8, 25); 

export const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // simulates physical camera inertia (damping)
controls.dampingFactor = 0.05;

// View Volume mathematical constraints
controls.maxPolarAngle = Math.PI / 1.4; // Upper limit
controls.minPolarAngle = 0.2;  // lower limit
// zoom in and zoom out limits
controls.minDistance = 3;
controls.maxDistance = 34; 


// 3. GRAPHICS QUALITY setting to scale out the internal WebGL rendering resolution 
// (reduce the total fragment count processed per frame)
export function setGraphicsQuality(scaleFactor) {
    const safeBaseRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(safeBaseRatio * parseFloat(scaleFactor)); //scale factor chosen by the user
}
// Disable the computation of the shadow map
export function toggleShadows(enabled) {
    // prevents the GPU from doing a second render pass for the Depth Map
    renderer.shadowMap.enabled = enabled;
    
    // force all materials to recompile their GLSL shaders without the shadow code
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.needsUpdate = true; 
        }
    });
}


// 4. Viewport resize handler
window.addEventListener('resize', () => {
    const w = cont.clientWidth;
    const h = cont.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});