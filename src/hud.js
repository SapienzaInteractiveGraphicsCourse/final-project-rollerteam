import { state } from './state.js';
import { doWaltz, doFlip, doAxel, startSpin } from './logic/animations.js';
import { setCameraMode, snapCameraToPlayer, triggerCameraTransition, changeGameModeCinematic } from './logic/camera.js';
import { updateTimeOfDay } from './objects/lighting.js';
import { skylightMat } from './objects/architecture.js';
import { setGraphicsQuality, toggleShadows } from './renderer.js';
import { root } from './objects/skater.js';
import { triggerCrowdCheer } from './objects/spectators.js';

const lbl = document.getElementById('lbl');
const camSelect = document.getElementById('camSelect');
const uiMovement = document.getElementById('ui-movement');
const uiExhibition = document.getElementById('ui-exhibition');
const hudChallenge = document.getElementById('hudChallenge');
const movTitle = document.getElementById('movTitle');

export let challengeActive = false;
export let challengeScore = 0;
export let challengePointsGained = 0;
export let challengePointsLost = 0;
export let currentJumpPoints = 0;

// 1. DYNAMIC STYLING

// Synchronizes the HTML with the game mode (training, exhibition, challenge)
export function updateUIStyles(mode) {
    if (mode === 'challenge') {
        uiMovement.style.display = 'flex';
        uiExhibition.style.display = 'none';
        hudChallenge.style.display = 'flex';
        movTitle.textContent = "Movement";
    } else if (mode === 'exhibition') {
        uiMovement.style.display = 'none';
        uiExhibition.style.display = 'flex';
        hudChallenge.style.display = 'none';
        movTitle.textContent = "";
    } else {
        uiMovement.style.display = 'flex';
        uiExhibition.style.display = 'none';
        hudChallenge.style.display = 'none';
        movTitle.textContent = "Movement";
    }
}

// Update Tab color
export function syncModeUI() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
        if(tab.dataset.mode === state.gameMode) {
            tab.classList.add('active');
            
            if (state.gameMode === 'training') {
                tab.style.backgroundColor = '#5cd699';
                tab.style.boxShadow = '0 4px 15px rgba(92, 214, 153, 0.5)'; 
            } else if (state.gameMode === 'exhibition') {
                tab.style.backgroundColor = '#b366ff'; 
                tab.style.boxShadow = '0 4px 15px rgba(179, 102, 255, 0.5)'; 
            } else if (state.gameMode === 'challenge') {
                tab.style.backgroundColor = '#ffaa44';
                tab.style.boxShadow = '0 4px 15px rgba(255, 170, 68, 0.5)'; 
            } else {
                tab.style.backgroundColor = '#00ffcc';
                tab.style.boxShadow = '0 4px 15px rgba(0, 255, 204, 0.5)';
            }
        } else {
            tab.classList.remove('active');
            tab.style.backgroundColor = 'transparent';
            tab.style.boxShadow = 'none';
        }
        tab.blur(); 
    });
    updateUIStyles(state.gameMode);
}

// HUD text update
export function updateHUDText(text) {
    if (lbl.textContent !== text) {
        lbl.textContent = text;
    }
}

// 2. CHALLENGE STATE MACHINE 
let pendingModeToSwitch = null;

export function promptQuitChallenge(newMode) {
    pendingModeToSwitch = newMode;
    document.getElementById('quitChallengeModal').style.display = 'flex';
}

// Event listener for the Tab click (change modality)
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const newMode = e.target.dataset.mode;
        // Intercepts the state change if a challenge is actively running
        if (challengeActive && newMode !== 'challenge') {
            e.preventDefault();
            e.stopPropagation();
            promptQuitChallenge(newMode);
            return;
        }
        changeGameModeCinematic(newMode);
    });
});

// Quit popup
document.getElementById('btnConfirmQuit').addEventListener('click', () => {
    document.getElementById('quitChallengeModal').style.display = 'none';
    const endScreen = document.getElementById('endGameScreen');
    if (endScreen) endScreen.style.display = 'none';

    setChallengeActive(false);

    // reset the Challenge states
    challengeScore = 0;
    challengePointsGained = 0;
    challengePointsLost = 0;
    state.challengeTimer = 9999; 

    // Reset points and timer
    const scoreEl = document.getElementById('uiScore');
    if (scoreEl) {
        scoreEl.textContent = "0";
        scoreEl.style.color = "black";
        scoreEl.style.textShadow = "none";
    }
    const timerEl = document.getElementById('uiTimer');
    if (timerEl) timerEl.textContent = " 0:00";
    updateHUDText("Challenge quit");
    
    // Reset the challenge panel
    const btn = document.getElementById('btnStartChallenge');
    if(btn) { btn.disabled = false; btn.style.background = '#ffaa44'; btn.innerHTML = `Start <span class="btn-key">⏎</span>`; }
    if(document.getElementById('diffSelect')) document.getElementById('diffSelect').disabled = false;

    // execute the suspended switch modality
    if (pendingModeToSwitch) {
        changeGameModeCinematic(pendingModeToSwitch);
    }
});

document.getElementById('btnCancelQuit').addEventListener('click', () => {
    document.getElementById('quitChallengeModal').style.display = 'none';
    pendingModeToSwitch = null;
});

// Start challenge popup
document.getElementById('btnStartChallenge').addEventListener('click', () => {
    if (state.gameMode === 'challenge' && !challengeActive) {
        const diff = document.getElementById('diffSelect').value;
        let targetScore = diff === 'easy' ? 1500 : (diff === 'medium' ? 3000 : 5000);
        let timeStr = diff === 'easy' ? "2:00 minutes" : (diff === 'medium' ? "1:30 minutes" : "1:00 minutes");

        document.getElementById('startModalDiff').textContent = diff.toUpperCase();
        document.getElementById('startModalScore').textContent = targetScore;
        document.getElementById('startModalTime').textContent = timeStr;
        document.getElementById('startChallengeModal').style.display = 'flex';
    }
});

// Trigger the challenge
document.getElementById('btnConfirmStart').addEventListener('click', () => {
    document.getElementById('startChallengeModal').style.display = 'none';
    const diff = document.getElementById('diffSelect').value;
    state.challengeDifficulty = diff;
    
    if (diff === 'easy') state.challengeTimer = 120;
    else if (diff === 'medium') state.challengeTimer = 90;
    else if (diff === 'hard') state.challengeTimer = 60;

    challengeScore = 0; challengePointsGained = 0; challengePointsLost = 0;
    challengeActive = true;
    updateScore(0);
    updateHUDText("Challenge in progress...");

    const btn = document.getElementById('btnStartChallenge');
    btn.disabled = true; btn.style.background = '#555'; btn.textContent = 'In progress...';
    document.getElementById('diffSelect').disabled = true;
});

// Score system
export function updateScore(points) {
    if (!challengeActive) return;
    challengeScore += points;
    if (points > 0) {
        challengePointsGained += points;
    } else {
        challengePointsLost += Math.abs(points);
    }
    const scoreEl = document.getElementById('uiScore');
    if (scoreEl) {
        scoreEl.textContent = challengeScore;
        scoreEl.style.color = points > 0 ? '#00ffcc' : '#ff4444';
        setTimeout(() => scoreEl.style.color = 'black', 300);
    }
}

// End game screen
export function showEndGameScreen() {
    const endScreen = document.getElementById('endGameScreen');
    const diff = document.getElementById('diffSelect').value;
    let targetScore = diff === 'easy' ? 1500 : (diff === 'medium' ? 3000 : 5000);
    
    let grade = "", gradeColor = "";
    if (challengeScore >= targetScore * 1.5) {
        grade = " LEGENDARY!"; gradeColor = "#FFD700";
    } else if (challengeScore >= targetScore) {
        grade = " GREAT JOB!"; gradeColor = "#00ffcc";
    } else {
        grade = "FAILED - TRY AGAIN!"; gradeColor = "#ff4444";
    }

    document.getElementById('endPointsGained').textContent = `+${challengePointsGained}`;
    document.getElementById('endPointsLost').textContent = `-${challengePointsLost}`;
    document.getElementById('endFinalScore').textContent = challengeScore;
    
    const gradeEl = document.getElementById('endGrade');
    gradeEl.textContent = grade;
    gradeEl.style.color = gradeColor;
    gradeEl.style.textShadow = `0 0 15px ${gradeColor}`;
    
    endScreen.style.display = 'flex';
}

// Close End Screen
document.getElementById('btnCloseEndScreen').addEventListener('click', () => {
    document.getElementById('endGameScreen').style.display = 'none';
    challengeScore = 0; challengePointsGained = 0; challengePointsLost = 0;
    const scoreEl = document.getElementById('uiScore');
    if (scoreEl) scoreEl.textContent = "0";
});

export function updateChallengeTimerDisplay(dt) {
    state.challengeTimer -= dt;
    // challenge finished
    if (state.challengeTimer <= 0) {
        state.challengeTimer = 0;
        setChallengeActive(false);
        showEndGameScreen();
        
        const btn = document.getElementById('btnStartChallenge');
        if (btn) {  btn.disabled = false; btn.style.background = '#ffaa44'; btn.innerHTML = `Start <span class="btn-key">⏎</span>`; }
        
        const diffSel = document.getElementById('diffSelect');
        if (diffSel) diffSel.disabled = false;
    }
    
    // Update timer text
    const mins = Math.floor(state.challengeTimer / 60);
    const secs = Math.floor(state.challengeTimer % 60);
    const timerEl = document.getElementById('uiTimer');
    if (timerEl) {
        timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

// 3. JUMP AND SPIN

// Validate physical constraints (speed, current FSM state) before begin the spin/jump
export function tryJump(jumpFunction, points, jumpName) {
    if (state.gameMode !== 'exhibition' && state.speedMag < 0.03) { updateHUDText("Too slow! Speed up to jump"); return; }
    if (state.jumping || state.isSpinning) return;
    if (jumpName === "Axel" && state.gameMode !== 'training'){
        triggerCrowdCheer('axel');
    } else if(state.gameMode !== 'training'){
       triggerCrowdCheer();
    }
    jumpFunction();
    currentJumpPoints = points;
    updateHUDText(`${jumpName} started`);
}
export function trySpin() {
    if (state.gameMode !== 'exhibition' && state.speedMag < 0.03 && !state.isSpinning) { 
        updateHUDText("Too slow! Speed up to spin"); 
        return; 
    }
    // If already jumping or spinning block the button
    if (state.jumping || state.isSpinning) return; 
    if (state.gameMode !== 'training') {
       triggerCrowdCheer();
    }
    startSpin();
    currentJumpPoints = 300;
    updateHUDText("Spinning");
}

document.getElementById('bwaltz').addEventListener('click', () => tryJump(doWaltz, 100, "Waltz"));
document.getElementById('bflip').addEventListener('click', () => tryJump(doFlip, 250, "Flip"));
document.getElementById('baxel').addEventListener('click', () => tryJump(doAxel, 500, "Axel"));
document.getElementById('bSpin').addEventListener('click', () => {trySpin();});

// Binds the HTML UI trigger to the WebGL viewport initialization
window.enterGame = function(mode) {
    // Remove the Main menu overlay
    document.getElementById('mainMenu').style.opacity = '0';
    document.getElementById('mainMenu').style.pointerEvents = 'none';
    
    // Trigger the drone to player transition
    changeGameModeCinematic(mode, true);
};


// 4. EXHIBITION BUTTONS
const btnExhStart = document.getElementById('btnExhStart');
if(btnExhStart) btnExhStart.addEventListener('click', () => {
    if (state.gameMode === 'exhibition') state.exhibitionState = 'skating';
});

const btnExhStop = document.getElementById('btnExhStop');
if(btnExhStop) btnExhStop.addEventListener('click', () => {
    if (state.gameMode === 'exhibition') {
        state.exhibitionState = 'paused';
        state.speedMag = 0; 
        updateHUDText("Esibizione: In Pausa");
    }
});

// 5. SETTINGS MENU
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const qualitySelect = document.getElementById('qualitySelect');
const shadowToggle = document.getElementById('shadowToggle');

if (settingsBtn && settingsPanel) {
    // Animate gear on hover
    settingsBtn.addEventListener('mouseenter', () => settingsBtn.style.transform = 'rotate(45deg)');
    settingsBtn.addEventListener('mouseleave', () => settingsBtn.style.transform = 'rotate(0deg)');

    // Toggle panel visibility
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
    });
}

// Adjusts the Fragment Shader workload by scaling the render target resolution
if (qualitySelect) {
    qualitySelect.addEventListener('change', (e) => {
        setGraphicsQuality(e.target.value);
        console.log(`[GPU Pipeline] Resolution scaled to ${e.target.value}x`);
    });
}

// Toggles the Shadow Map generation pass
if (shadowToggle) {
    shadowToggle.addEventListener('change', (e) => {
        toggleShadows(e.target.checked);
        console.log(e.target.checked ? "[GPU Pipeline] Shadows Enabled" : "[GPU Pipeline] Shadows Disabled");
    });
}

export function updateFPSDisplay(fps) {
    const fpsText = document.getElementById('fpsCounter');
    if (fpsText) {
        fpsText.textContent = fps;
        fpsText.style.color = fps < 45 ? '#ff4444' : '#138542';
    }
}

// Camera menu selection
const camSelectMenu = document.getElementById('camSelect');
if(camSelectMenu) camSelectMenu.addEventListener('change', (e) => setCameraMode(e.target.value));

// 6. ILLUMINATION
const timeSlider = document.getElementById('timeSlider');
const timeLabel = document.getElementById('timeLabel');
const segBtns = document.querySelectorAll('.seg-btn');

let manualLightsOverride = null; // null = Auto, true = On, false = Off

// Maps the UI slider value to the 3D spherical coordinates of the light sources
export function handleTimeChange() {
    if (!timeSlider) return;
    const time = parseFloat(timeSlider.value);
    
    // Update slider time text
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    if (timeLabel) {
        timeLabel.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Pass the time parameter and light setting to the lighting module
    updateTimeOfDay(time, manualLightsOverride, skylightMat);
}

// Listener for the time slider
if (timeSlider) {
    timeSlider.addEventListener('input', handleTimeChange);
}

// Lighting logic override (Auto, on, off)
if (segBtns.length > 0) {
    segBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            segBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const mode = e.target.dataset.mode;
            if (mode === 'on') {
                manualLightsOverride = true;
            } else if (mode === 'off') {
                manualLightsOverride = false;
            } else {
                manualLightsOverride = null; // auto
            }
            
            handleTimeChange(); // Force shader update
        });
    });
}

// Initialize the global illumination parameters
setTimeout(handleTimeChange, 100);

export function hideLoadingScreen() {
    // Smooth transition from the loading screen to the DOM Interface
    const loadingScreen = document.getElementById('loadingScreen');
    const gameContainer = document.getElementById('gameContainer');
    const mainMenu = document.getElementById('mainMenu');
    
    if(loadingScreen) loadingScreen.style.opacity = '0';
    if(gameContainer) gameContainer.style.opacity = '1';
    if(mainMenu) {
        mainMenu.style.opacity = '1';
        mainMenu.style.pointerEvents = 'auto';
    }
    
    setTimeout(() => { 
        if(loadingScreen) loadingScreen.style.display = 'none'; 
    }, 1000);
}

export function resetCurrentJumpPoints() { currentJumpPoints = 0; }
export function setChallengeActive(val) { challengeActive = val; }