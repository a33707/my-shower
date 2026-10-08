import { jest } from '@jest/globals';
import { GameState } from './script.js';

describe('GameState', () => {
    let gameState;
    let listener;

    beforeEach(() => {
        gameState = new GameState();
        listener = jest.fn();
        gameState.subscribe(listener);
    });

    test('initializes correctly', () => {
        expect(gameState.score).toBe(0);
        expect(gameState.isGameOver).toBe(false);
        expect(gameState.isProcessing).toBe(false);
        expect(gameState.completedSteps.size).toBe(0);
    });

    test('increments score for unique wash steps', async () => {
        await gameState.performWashStep('soap');
        expect(gameState.score).toBe(10);
        expect(gameState.completedSteps.has('soap')).toBe(true);
        expect(listener).toHaveBeenCalledWith('scoreUpdated', { amount: 10 }, gameState);
        expect(listener).toHaveBeenCalledWith('washStepPerformed', 'soap', gameState);
    });

    test('does not increment score for duplicate wash steps', async () => {
        await gameState.performWashStep('soap');
        await gameState.performWashStep('soap');
        expect(gameState.score).toBe(10); // Score should remain 10
    });

    test('increments score for unique putOn actions', async () => {
        await gameState.putOn('panties');
        expect(gameState.score).toBe(20);
        expect(gameState.completedSteps.has('puton-panties')).toBe(true);
        expect(listener).toHaveBeenCalledWith('scoreUpdated', { amount: 20 }, gameState);
        expect(listener).toHaveBeenCalledWith('itemEquipped', 'panties', gameState);
    });

    test('does not increment score for duplicate putOn actions', async () => {
        await gameState.putOn('panties');
        await gameState.putOn('panties');
        expect(gameState.score).toBe(20);
    });

    test('prevents actions when isProcessing is true', async () => {
        // We start an action but don't await it, so isProcessing is true
        const promise = gameState.performWashStep('soap');

        expect(gameState.isProcessing).toBe(true);

        // Try to perform another action while processing
        await gameState.performWashStep('water');

        expect(gameState.completedSteps.has('water')).toBe(false);
        expect(gameState.score).toBe(10); // Only soap scored

        await promise; // finish first action
    });

    test('prevents actions when isGameOver is true', async () => {
        gameState.finishGame();
        expect(gameState.isGameOver).toBe(true);
        expect(listener).toHaveBeenCalledWith('gameOver', null, gameState);

        await gameState.performWashStep('soap');
        expect(gameState.score).toBe(0); // Score should not increment
    });

    test('resets correctly', async () => {
        await gameState.performWashStep('soap');
        gameState.finishGame();

        gameState.resetGame();

        expect(gameState.score).toBe(0);
        expect(gameState.isGameOver).toBe(false);
        expect(gameState.isProcessing).toBe(false);
        expect(gameState.completedSteps.size).toBe(0);
        expect(listener).toHaveBeenCalledWith('gameReset', null, gameState);
    });

    test('toggles closet correctly', () => {
        gameState.showCloset();
        expect(listener).toHaveBeenCalledWith('closetToggled', true, gameState);
    });
});
