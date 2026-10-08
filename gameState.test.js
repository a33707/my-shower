import { jest } from '@jest/globals';
import { GameState } from './script.js';

describe('GameState Sequential Progression', () => {
    let gameState;
    let listener;

    beforeEach(() => {
        gameState = new GameState();
        listener = jest.fn();
        gameState.subscribe(listener);
    });

    test('initializes correctly with perfectCombo', () => {
        expect(gameState.score).toBe(0);
        expect(gameState.perfectCombo).toBe(true);
        expect(gameState.currentStepIndex).toBe(0);
    });

    test('ignores actions that are out of order (future steps)', async () => {
        await gameState.performWashStep('water'); // 'water' is after 'soap'
        expect(gameState.score).toBe(0);
        expect(gameState.currentStepIndex).toBe(0);
        expect(gameState.completedSteps.has('water')).toBe(false);
        expect(listener).not.toHaveBeenCalledWith('scoreUpdated', expect.anything(), gameState);
    });

    test('processes correct sequential step', async () => {
        await gameState.performWashStep('soap');
        expect(gameState.score).toBe(10);
        expect(gameState.currentStepIndex).toBe(1);
        expect(gameState.perfectCombo).toBe(true);
    });

    test('breaks perfectCombo when clicking an already completed step', async () => {
        await gameState.performWashStep('soap');
        await gameState.performWashStep('soap'); // Click again

        expect(gameState.score).toBe(10); // Score doesn't increase
        expect(gameState.currentStepIndex).toBe(1); // Index doesn't increase
        expect(gameState.perfectCombo).toBe(false); // Combo is broken
    });

    test('calculates correct progress percentage', async () => {
        await gameState.performWashStep('soap');
        expect(listener).toHaveBeenCalledWith('progressUpdated', { progress: 1 / 7 }, gameState);
    });

    test('allows showCloset only when it is the next step', async () => {
        gameState.showCloset();
        expect(gameState.currentStepIndex).toBe(0); // Not closet step yet

        // Skip ahead to test closet
        gameState.currentStepIndex = 6;
        gameState.showCloset();
        expect(gameState.currentStepIndex).toBe(7);
        expect(listener).toHaveBeenCalledWith('closetToggled', true, gameState);
    });

    test('awards perfect combo bonus on finishGame if perfectCombo is true', async () => {
        gameState.currentStepIndex = 7; // Simulate finishing all steps
        gameState.perfectCombo = true;

        gameState.finishGame();

        expect(gameState.score).toBe(50); // 0 + 50 bonus
        expect(listener).toHaveBeenCalledWith('perfectComboAchieved', null, gameState);
    });

    test('does not award perfect combo bonus if perfectCombo is false', async () => {
        gameState.currentStepIndex = 7;
        gameState.perfectCombo = false;

        gameState.finishGame();

        expect(gameState.score).toBe(0);
        expect(listener).not.toHaveBeenCalledWith('perfectComboAchieved', null, gameState);
    });

    test('resets completely', async () => {
        await gameState.performWashStep('soap');
        gameState.perfectCombo = false;

        gameState.resetGame();

        expect(gameState.currentStepIndex).toBe(0);
        expect(gameState.perfectCombo).toBe(true);
    });
});
