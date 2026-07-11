
import { scene } from '../renderer.js';
import { clockHourHand, clockMinuteHand } from './clock.js';
export const arenaLights = [];

// GLOBAL AMBIENT LIGHTING SETUP

// Environment light: realistic light coming from all directions
export const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

// Directional light: easy to use, approximation of the light coming from the sun
export const sun = new THREE.DirectionalLight(0xfff4dd, 1.2);
sun.castShadow = true;
// To check if the light source can see the point, I put a second camera on the light source
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
// Shadow bias, small offset to avoid self-shadowing artifacts 
sun.shadow.bias = -0.0002; 
sun.shadow.normalBias = 0.02;

scene.add(sun);

// Directional light for night shadowing
export const nightShadowLight = new THREE.DirectionalLight(0xf4f8ff, 0.0); 
nightShadowLight.position.set(0, 9, 0); // Under the skylight
nightShadowLight.target.position.set(0, 0, 0); // Points to the center of the arena

nightShadowLight.castShadow = true;
nightShadowLight.shadow.mapSize.width = 1024;
nightShadowLight.shadow.mapSize.height = 1024;
// The shadow camera defines the area of the scene that will be rendered into the shadow map
nightShadowLight.shadow.camera.left = -30;
nightShadowLight.shadow.camera.right = 30;
nightShadowLight.shadow.camera.top = 20;
nightShadowLight.shadow.camera.bottom = -20;
nightShadowLight.shadow.bias = -0.0005;

scene.add(nightShadowLight);
scene.add(nightShadowLight.target);

// SUN and MOON
// The sun and moon are a sphere with a point light attached to it
export const celestialMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
export const celestialDisc = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), celestialMat);
scene.add(celestialDisc);

export const celestialGlow = new THREE.PointLight(0xffffff, 0, 25);
celestialDisc.add(celestialGlow);


// STARS
const starsGeo = new THREE.BufferGeometry();
const posArray = new Float32Array(1500 * 3); // 1500 stars, each with x, y, z coordinates
// Generate random positions for the stars 
for (let i = 0; i < 1500; i++) {
    const radius = 60 + Math.random() * 40; 
    // Theta, between 0 and 2π
    const theta = 2 * Math.PI * Math.random(); 
    // Phi is limited between 0 and π to create a dome of stars above the arena 
    const phi = Math.acos(Math.random()); 
    
    // Mapping spherical coordinates to Cartesian coordinates ( y axis is up )
    posArray[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);  // Coordinate X (Left/Right)
    posArray[i * 3 + 1] = 10 + radius * Math.cos(phi); // Coordinate Y (High/Low), add 10 to lift the stars above the arena
    posArray[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta); // Coordinate Z (Forward/Backward)
}

// Create a BufferAttribute from the position array and assign it to the geometry
starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
export const starField = new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 0.15, color: 0xffddaa, transparent: true, opacity: 0 }));
scene.add(starField);


// PENDANT LIGHTS
export function buildPendantLight(x, z, ceilingY, shadeY) {
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.5 });
    
    // Support pole and canopy
    const poleLength = Math.max(0.1, ceilingY - shadeY);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, poleLength, 8), frameMat);
    pole.position.y = (ceilingY + shadeY) / 2;
    g.add(pole);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), frameMat);
    canopy.position.y = ceilingY - 0.025;
    g.add(canopy);

    // Crossbar for the three LED projectors
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.15), frameMat);
    crossbar.position.y = shadeY;
    g.add(crossbar);
    // Light of the LED ( emissive material)
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 0 });

    // Hierarchical construction of the LED projectors
    [-0.6, 0, 0.6].forEach(offsetX => {
        const projector = new THREE.Group();
        
        // first define the components of the projector: casing, LED panel in the object space ( centered at the pivot point of the projector )
        const casing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.15), frameMat);
        projector.add(casing);

        const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), bulbMat);
        ledPanel.position.z = 0.076; 
        projector.add(ledPanel);

        // Translation from the projector's local space to the world space
        projector.position.set(offsetX, shadeY - 0.15, 0);

        const tiltDown = Math.PI / 2.2; 
        const panLeftRight = offsetX < 0 ? 0.25 : (offsetX > 0 ? -0.25 : 0); 
        projector.rotation.set(tiltDown, panLeftRight, 0, 'YXZ');
        g.add(projector);
    });
    
    // Point light attached to the pendant light, simulating the LED illumination on the surrounding area
    const light = new THREE.PointLight(0xf4f8ff, 0, 45);
    light.position.y = shadeY - 0.5;
    light.castShadow = false;
    g.add(light);

    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);

    // Save the light and its material for later updates in the day/night cycle
    arenaLights.push({ bulbMat, light });
    return g;
}

// DAY/NIGHT CYCLE
const skyDay = new THREE.Color(0x77BBFF);     // Sky Blue 
const skySunset = new THREE.Color(0xDA8A67);   // Orange
const skyNight = new THREE.Color(0x0a0a1a);   // Blackish Blue
const sunColorSunrise = new THREE.Color(0xffe4b5);  
const sunColorDay = new THREE.Color(0xffffff);     
const moonColor = new THREE.Color(0xcbd6ff);

// Easing C1 (Hermite Spline) for smooth transitions
function smoothstep(t) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
}

// Spline interpolation for keyframe sampling
function sampleKeyframes(time, keyframes, lerpFn) {
    const t = THREE.MathUtils.euclideanModulo(time, 24);
    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i], b = keyframes[i + 1];
        if (t >= a.time && t <= b.time) {
            const localT = smoothstep((t - a.time) / (b.time - a.time));
            return lerpFn(a.value, b.value, localT);
        }
    }
    return keyframes[keyframes.length - 1].value;
}

const lerpColor = (a, b, t) => new THREE.Color().lerpColors(a, b, t);
const lerpNumber = (a, b, t) => THREE.MathUtils.lerp(a, b, t);

// Keyframes for the sky color over a 24-hour period
const skyColorKeyframes = [
    { time: 0, value: skyNight },
    { time: 6, value: skyNight },
    { time: 8, value: skyDay },      
    { time: 17, value: skyDay },
    { time: 19, value: skySunset },  
    { time: 20, value: skyNight },   
    { time: 24, value: skyNight },
];

export function updateTimeOfDay(time, manualLightsOverride, skylightMat) {
    // 1. Evaluate the sky color based on the time of day using keyframe sampling
    const skyColor = sampleKeyframes(time, skyColorKeyframes, lerpColor);

    // Sinusoidal function for 12 hours of daylight (between 8 AM and 8 PM), normalized to have 1 at 14:00 and 0 at 8:00 and 20:00
    const dayness = Math.max(0, Math.sin(((time - 8) / 12) * Math.PI));
    
    // Night factor is the inverse of dayness
    const nightFactor = 1.0 - dayness; 
    const isNight = time < 8 || time >= 20;

    starField.material.opacity = nightFactor;
    scene.background = skyColor;
    if (scene.fog) { scene.fog.color = skyColor; }

    // 2. Compute the position of the sun and moon based on the time of day
    let celestialAngle;
    if (isNight) {
        let nightTime = time >= 20 ? time - 20 : time + 4; 
        celestialAngle = (nightTime / 12) * Math.PI;
    } else {
        celestialAngle = ((time - 8) / 12) * Math.PI;
    }

    const celestialDistance = 70;
    const cX = -Math.cos(celestialAngle) * celestialDistance;
    const cY = Math.sin(celestialAngle) * celestialDistance;

    // Position the sun and moon in the scene
    sun.position.set(cX, cY, 0);
    celestialDisc.position.set(cX, cY, 0);
    // Scale the celestial disc based on whether it's night or day (smaller for the moon, larger for the sun)
    celestialDisc.scale.set(isNight ? 0.4 : 0.8, isNight ? 0.4 : 0.8, isNight ? 0.4 : 0.8);

    // 3. Light intensity and color adjustments based on the time of day
    const sunAngle = ((time - 8) / 12) * Math.PI;
    const sunHeightFactor = Math.max(0, Math.sin(sunAngle)); // max to avoid negative values

    if (isNight) {
        sun.intensity = 0.05; 
        sun.color.copy(moonColor);
        hemiLight.intensity = 0.02;
    } else {
        sun.intensity = sunHeightFactor * 1.2;
        sun.color = sunColorSunrise.clone().lerp(sunColorDay, sunHeightFactor);
        hemiLight.intensity = 0.5 + (sunHeightFactor * 0.4);
    }

    celestialMat.color.copy(isNight ? moonColor : sunColorSunrise.clone().lerp(sunColorDay, dayness));
    celestialGlow.intensity = isNight ? 0.3 : dayness * 2.2;

    if (skylightMat) {
        skylightMat.opacity = 0.32 + dayness * 0.35;
        skylightMat.emissive.copy(skyColor);
        skylightMat.emissiveIntensity = isNight ? nightFactor * 0.15 : dayness * 0.5;
    }

    // 4. Turn on/off the pendant lights based on the time of day or manual override
    let shouldBeOn = (manualLightsOverride !== null) ? manualLightsOverride : isNight;

    // Update the intensity of the night shadow light 
    nightShadowLight.intensity = shouldBeOn ? 0.35 : 0.0;

    arenaLights.forEach(lamp => {
        lamp.light.intensity = shouldBeOn ? 0.4 : 0;
        lamp.bulbMat.emissiveIntensity = shouldBeOn ? 2.0 : 0;
    });

    // 5. Update the wall clock hands based on the time of day
    if (clockHourHand && clockMinuteHand) {
        const hourAngle = ((time % 12) / 12) * (Math.PI * 2); // Convert 24-hour time to 12-hour format for the hour hand
        const minuteAngle = ((time % 1) / 1) * (Math.PI * 2); // Minute hand completes a full rotation every hour
        clockHourHand.rotation.z = -hourAngle; // minus to have a clockwise rotation
        clockMinuteHand.rotation.z = -minuteAngle;
    }
}