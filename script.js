export class GameState {
    constructor() {
        this.score = 0;
        this.isGameOver = false;
        this.isProcessing = false;
        this.completedSteps = new Set();
        this.listeners = [];
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

        this.setProcessing(true);

        if (!this.completedSteps.has(stepId)) {
            this.completedSteps.add(stepId);
            this.score += scoreValue;
            this.notify('scoreUpdated', { amount: scoreValue });
        }

        this.notify('washStepPerformed', stepId);

        // Simulate a small delay for animation/processing
        await new Promise(resolve => setTimeout(resolve, 600));
        this.setProcessing(false);
    }

    showCloset() {
        if (this.isGameOver || this.isProcessing) return;
        this.notify('closetToggled', true);
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
        this.isGameOver = true;
        this.notify('gameOver', null);
    }

    resetGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isProcessing = false;
        this.completedSteps.clear();
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
        this.buttons = document.querySelectorAll('button');

        this.bindEvents();
    }

    bindEvents() {
        // Find buttons by data-action attribute
        document.querySelectorAll('button[data-action]').forEach(btn => {
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

    handleStateChange(event, data, state) {
        switch (event) {
            case 'scoreUpdated':
                this.updateScore(state.score, data.amount);
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
            case 'gameOver':
                this.handleGameOver();
                break;
            case 'gameReset':
                location.reload(); // Quickest way to reset UI correctly since initial styles are in CSS
                break;
        }
    }

    updateScore(newScore, amount) {
        this.scoreEl.innerText = newScore;
        this.showScorePopup(amount);
    }

    showScorePopup(amount) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.innerText = `+${amount}`;

        // Randomize position slightly
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
        this.buttons.forEach(btn => {
            btn.disabled = isProcessing;
        });
    }

    handleWashStep(stepId) {
        // Reset glowing if it's a different action
        if (stepId !== 'glow') {
            this.char.classList.remove('glowing');
        }

        switch (stepId) {
            case 'soap':
                this.msg.innerText = "손가락으로 보들보들~ 비누칠을 해요.";
                this.char.style.background = "#ffffff";
                this.char.style.boxShadow = "none";
                break;
            case 'water':
                this.msg.innerText = "물로 칙칙! 깨끗하게 씻어내요.";
                this.char.style.background = "#e0f0ff";
                this.char.style.boxShadow = "none";
                break;
            case 'towel':
                this.msg.innerText = "수건으로 다이 다이 톡톡톡 닦아주기!";
                this.char.style.background = "#ffe4e1";
                this.char.style.boxShadow = "none";
                break;
            case 'lotion':
                this.msg.innerText = "아빠가 로션을 부드럽게 발라줄게~";
                this.char.style.boxShadow = "inset 0 0 20px white";
                break;
            case 'hair':
                this.msg.innerText = "따뜻한 바람으로 머리를 말려요. 윙~";
                // Add a small shake animation to character
                this.char.classList.add('shake');
                setTimeout(() => this.char.classList.remove('shake'), 500);
                break;
            case 'glow':
                this.msg.innerText = "누가 누가 더 오래, 더 밝게 빛나나 보자!";
                this.char.classList.add('glowing');
                break;
        }
    }

    handleEquip(type) {
        // 모든 옷 숨기기
        document.querySelectorAll('.clothes-item').forEach(el => el.style.display = 'none');
        // 선택한 옷 보이기
        const item = document.getElementById('item-' + type);
        if (item) {
            item.style.display = 'block';

            // Re-trigger animation
            item.style.animation = 'none';
            item.offsetHeight; // trigger reflow
            item.style.animation = null;
        }
        this.msg.innerText = type + "을(를) 예쁘게 입었어요!";
    }

    handleGameOver() {
        this.closet.classList.remove('show');
        this.msg.innerText = "지퍼를 쭉~! 우리 아이 참 예쁘다. 잘 자요!";

        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.classList.add('show');
    }
}

// Initialization code, only runs in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.isTestEnvironment) {
    document.addEventListener('DOMContentLoaded', () => {
        const gameState = new GameState();
        new UIManager(gameState);
    });
}
