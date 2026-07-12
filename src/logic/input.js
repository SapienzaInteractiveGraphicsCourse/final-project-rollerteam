// handle what happens when the user presses keys on the keyboard

import { state } from '../state.js';
import { updateScore, setChallengeActive, syncModeUI, tryJump, trySpin, challengeActive, promptQuitChallenge, showTemporaryWarning } from '../hud.js';
import { doWaltz, doFlip, doAxel, startSpin } from './animations.js';
import { changeGameModeCinematic } from './camera.js';

const keyMap = { ArrowUp: 'kUp', ArrowDown: 'kDown', ArrowLeft: 'kLeft', ArrowRight: 'kRight' };

document.addEventListener('keydown', e => {
    const id = keyMap[e.key]; if(!id) return;
    const el = document.getElementById(id); if(!el) return;
    el.classList.add('key-pressed');
});

document.addEventListener('keyup', e => {
    const id = keyMap[e.key]; if(!id) return;
    const el = document.getElementById(id); if(!el) return;
    el.classList.remove('key-pressed');
});

// Keyboard input logic
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Remove the focus from any HTML element
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
        // prevent native HTML action
        e.preventDefault();
    }
    // store the key state for the physics loop
    if (state.keys.hasOwnProperty(e.key)) state.keys[e.key] = true;

    if (e.key === 'Enter') {
        e.preventDefault();
        if (document.activeElement) document.activeElement.blur();

        if (state.gameMode === 'exhibition') {
            if (state.exhibitionState === 'waiting' || state.exhibitionState === 'paused') {
                state.exhibitionState = 'skating';
            } else if (state.exhibitionState === 'skating') {
                state.exhibitionState = 'paused';
                state.speedMag = 0; 
                showTemporaryWarning("Exhibition paused");
            }
        } else if (state.gameMode === 'challenge') {
            const btnStart = document.getElementById('btnStartChallenge');
            if (btnStart && !btnStart.disabled) btnStart.click();
        }
        return;
    }

    if (e.key === 'm' || e.key === 'M') {
        
        const modes = ['training', 'exhibition', 'challenge'];
        const currentIndex = modes.indexOf(state.gameMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];

        // If a challenge is currently active, intercept the switch
        if (challengeActive) {
            promptQuitChallenge(nextMode);
            return;
        }
        
        // cinematic temporal interpolation for the camera transition
        changeGameModeCinematic(nextMode);
        return;
    }

    if (e.key === 'z' || e.key === 'Z') tryJump(doWaltz, 100, "Waltz");
    if (e.key === 'x' || e.key === 'X') tryJump(doFlip, 250, "Flip");
    if (e.key === 'c' || e.key === 'C') tryJump(doAxel, 500, "Axel");
    if (e.key === 's' || e.key === 'S') {
        if (state.gameMode !== 'exhibition' && state.speedMag < 0.03 && !state.isSpinning) {
            showTemporaryWarning("Too slow! Speed up to spin"); 
            return;
        }
        trySpin();
    }
});

window.addEventListener('keyup', (e) => {
    if (state.keys.hasOwnProperty(e.key)) {
        state.keys[e.key] = false; 
    }
});