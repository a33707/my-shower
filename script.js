export class GameState {
    constructor() {
        this.score = 0;
        this.isGameOver = false;
        this.isProcessing = false;
        this.completedSteps = new Set();
        this.listeners = [];
        this.expectedSequence = ['soap', 'water', 'towel', 'lotion', 'hair', 'glow', 'closet'];
        this.currentStepIndex = 0;
        this.perfectCombo = true;
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify(event, data) {
        this.listeners.forEach(listener => listener(event, data, this));
    }

    setProcessing(processing) {
        if (this.isGameOver) return;
        this.isProcessing = processing;
        this.notify('processingChanged', processing);
    }

    async performWashStep(stepId, scoreValue = 10) {
        if (this.isGameOver || this.isProcessing) return;

        // Check sequence constraints
        const expectedStep = this.expectedSequence[this.currentStepIndex];

        if (stepId === expectedStep) {
            // Correct step
            this.setProcessing(true);
            this.completedSteps.add(stepId);
            this.score += scoreValue;
            this.currentStepIndex++;
            this.notify('scoreUpdated', { amount: scoreValue });
            this.notify('progressUpdated', { progress: this.currentStepIndex / this.expectedSequence.length });
            this.notify('washStepPerformed', stepId);

            await new Promise(resolve => setTimeout(resolve, 600));
            this.setProcessing(false);
        } else if (this.completedSteps.has(stepId)) {
            // Re-clicking an old step breaks perfect combo but allows the action visually
            this.perfectCombo = false;
            this.setProcessing(true);
            this.notify('washStepPerformed', stepId);
            await new Promise(resolve => setTimeout(resolve, 600));
            this.setProcessing(false);
        } else {
            // Trying to click a future step - block it
            return;
        }
    }

    showCloset() {
        if (this.isGameOver || this.isProcessing) return;

        const expectedStep = this.expectedSequence[this.currentStepIndex];
        if (expectedStep === 'closet') {
            this.currentStepIndex++;
            this.completedSteps.add('closet');
            this.notify('progressUpdated', { progress: this.currentStepIndex / this.expectedSequence.length });
            this.notify('closetToggled', true);
        }
    }

    async putOn(type) {
        if (this.isGameOver || this.isProcessing) return;

        this.setProcessing(true);
        const stepId = `puton-${type}`;

        if (!this.completedSteps.has(stepId)) {
            this.completedSteps.add(stepId);
            this.score += 20;
            this.notify('scoreUpdated', { amount: 20 });
        }

        this.notify('itemEquipped', type);

        await new Promise(resolve => setTimeout(resolve, 600));
        this.setProcessing(false);
    }

    finishGame() {
        if (this.isGameOver || this.isProcessing) return;

        if (this.perfectCombo && this.currentStepIndex >= this.expectedSequence.length) {
            this.score += 50; // Perfect combo bonus
            this.notify('scoreUpdated', { amount: 50 });
            this.notify('perfectComboAchieved', null);
        }

        this.isGameOver = true;
        this.notify('gameOver', null);
    }

    resetGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isProcessing = false;
        this.completedSteps.clear();
        this.currentStepIndex = 0;
        this.perfectCombo = true;
        this.notify('gameReset', null);
    }
}

export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.gameState.subscribe(this.handleStateChange.bind(this));

        // DOM Elements
        this.msg = document.getElementById('message');
        this.char = document.getElementById('character');
        this.closet = document.getElementById('closet');
        this.scoreEl = document.getElementById('score');
        this.gameContainer = document.getElementById('game-container');
        this.buttons = document.querySelectorAll('button[data-action]');
        this.progressBar = document.getElementById('progress-bar-fill');

        this.bindEvents();
        this.updateButtonStates();
    }

    bindEvents() {
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action.startsWith('puton-')) {
                    this.gameState.putOn(action.replace('puton-', ''));
                } else if (action === 'closet') {
                    this.gameState.showCloset();
                } else if (action === 'finish') {
                    this.gameState.finishGame();
                } else if (action === 'reset') {
                    this.gameState.resetGame();
                } else {
                    this.gameState.performWashStep(action);
                }
            });
        });
    }

    updateButtonStates() {
        const expectedStep = this.gameState.expectedSequence[this.gameState.currentStepIndex];
        const isClosetPhase = this.gameState.currentStepIndex >= this.gameState.expectedSequence.length;

        this.buttons.forEach(btn => {
            const action = btn.getAttribute('data-action');

            // Buttons like reset or inside the closet shouldn't be disabled based on sequence
            if (action === 'reset' || action.startsWith('puton-') || action === 'finish') {
                btn.disabled = false;
                return;
            }

            const stepIndex = this.gameState.expectedSequence.indexOf(action);

            if (isClosetPhase) {
                // If we are in closet phase, only old actions or reset work
                 btn.disabled = false;
            } else if (stepIndex !== -1) {
                if (stepIndex > this.gameState.currentStepIndex) {
                    btn.disabled = true; // Future steps disabled
                } else {
                    btn.disabled = false; // Current or past steps enabled
                }
            }
        });
    }

    handleStateChange(event, data, state) {
        switch (event) {
            case 'scoreUpdated':
                this.updateScore(state.score, data.amount);
                break;
            case 'progressUpdated':
                if (this.progressBar) {
                    this.progressBar.style.width = `${data.progress * 100}%`;
                }
                this.updateButtonStates();
                break;
            case 'processingChanged':
                this.toggleProcessing(data);
                break;
            case 'washStepPerformed':
                this.handleWashStep(data);
                break;
            case 'closetToggled':
                this.closet.classList.toggle('show', data);
                break;
            case 'itemEquipped':
                this.handleEquip(data);
                break;
            case 'perfectComboAchieved':
                this.handlePerfectCombo();
                break;
            case 'gameOver':
                this.handleGameOver();
                break;
            case 'gameReset':
                location.reload();
                break;
        }
    }

    updateScore(newScore, amount) {
        this.scoreEl.innerText = newScore;
        this.showScorePopup(amount);
    }

    showScorePopup(amount, customText) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.innerText = customText || `+${amount}`;

        const left = 50 + Math.random() * 50;
        const top = 100 + Math.random() * 50;

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        this.gameContainer.appendChild(popup);

        setTimeout(() => {
            if(popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 1000);
    }

    toggleProcessing(isProcessing) {
        this.gameContainer.classList.toggle('is-processing', isProcessing);
        if (isProcessing) {
            this.buttons.forEach(btn => btn.disabled = true);
        } else {
            this.updateButtonStates(); // Re-evaluate enabled/disabled state based on logic
        }
    }

    handleWashStep(stepId) {
        this.char.className = ''; // reset classes for dynamic states
        this.char.style.background = "#ffe4e1";
        this.char.style.boxShadow = "none";

        switch (stepId) {
            case 'soap':
                this.msg.innerText = "손가락으로 보들보들~ 비누칠을 해요.";
                this.char.classList.add('state-soap');
                break;
            case 'water':
                this.msg.innerText = "물로 칙칙! 깨끗하게 씻어내요.";
                this.char.classList.add('state-water');
                break;
            case 'towel':
                this.msg.innerText = "수건으로 다이 다이 톡톡톡 닦아주기!";
                break;
            case 'lotion':
                this.msg.innerText = "아빠가 로션을 부드럽게 발라줄게~";
                this.char.style.boxShadow = "inset 0 0 20px white";
                break;
            case 'hair':
                this.msg.innerText = "따뜻한 바람으로 머리를 말려요. 윙~";
                this.char.classList.add('shake');
                break;
            case 'glow':
                this.msg.innerText = "누가 누가 더 오래, 더 밝게 빛나나 보자!";
                this.char.classList.add('glowing');
                break;
        }
    }

    handleEquip(type) {
        document.querySelectorAll('.clothes-item').forEach(el => el.style.display = 'none');
        const item = document.getElementById('item-' + type);
        if (item) {
            item.style.display = 'block';
            item.style.animation = 'none';
            item.offsetHeight;
            item.style.animation = null;
        }
        this.msg.innerText = type + "을(를) 예쁘게 입었어요!";
    }

    handlePerfectCombo() {
        this.showScorePopup(50, "Perfect! +50");
        this.gameContainer.classList.add('perfect-celebration');
    }

    handleGameOver() {
        this.closet.classList.remove('show');
        this.msg.innerText = "지퍼를 쭉~! 우리 아이 참 예쁘다. 잘 자요!";

        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.classList.add('show');

        if(this.gameState.perfectCombo) {
             const overlayContent = document.createElement('div');
             overlayContent.className = 'celebration-text';
             overlayContent.innerText = '🎉 Perfect Routine! 🎉';
             overlay.appendChild(overlayContent);
        }
    }
}

// Initialization code, only runs in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.isTestEnvironment) {
    document.addEventListener('DOMContentLoaded', () => {
        const gameState = new GameState();
        new UIManager(gameState);
    });
}
