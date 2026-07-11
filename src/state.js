// Global state shared across all modules (physics, animation, input, etc.)

export const state = {
  // Game mode
  gameMode: 'training', // 'training', 'exhibition', or 'challenge'
  exhibitionState: 'waiting', // 'waiting', 'skating', 'paused'
  exhibitionAngle: Math.PI / 2,
  
  // Physics 
  speedMag: 0,
  isMoving: false,
  
  // Skater states
  jumping: false,
  isSpinning: false,
  spinTimer: 0,
  isFalling: false,

  // Challenge mode state
  challengeTimer: 0,
  challengeDifficulty: 'easy',
  
  // User Input (Keyboard)
  keys: {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  }
};