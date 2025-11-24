import { create } from 'zustand';
import type { GameState, Player, Token, TokenId, PowerUp, PowerUpType } from '../types/game';
import { getTrackLength, getStartPosition, getTurningIndex, getSkippedIndex, isSafeZone, isPowerUpZone } from '../utils/boardUtils';

interface GameActions {
    initGame: (playerCount: number) => void;
    setDiceRoll: () => void;
    setDiceRollValue: (value: number) => void;
    moveToken: (tokenId: TokenId) => void;
    setTokenStatus: (tokenId: TokenId, status: Token['status']) => void;
    nextTurn: () => void;
    activatePowerUp: (playerId: string, powerUpIndex: number, targetTokenId?: string) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const INITIAL_STATE: GameState = {
    players: [],
    tokens: {},
    currentPlayerIndex: 0,
    diceRoll: null,
    phase: 'SETUP',
    boardConfig: {
        playerCount: 4,
    },
    // @ts-ignore - theme is part of actions but we init it here for state
    theme: 'light',
};

const generatePowerUp = (): PowerUp => {
    const types: PowerUpType[] = ['SHIELD', 'REVERSE', 'SWAP'];
    const type = types[Math.floor(Math.random() * types.length)]!;
    return { id: Math.random().toString(36).substr(2, 9), type };
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
    ...INITIAL_STATE,
    theme: 'light',

    initGame: (playerCount) => {
        const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
            id: `p${i}`,
            name: `Player ${i + 1}`,
            color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'][i] || '#000000',
            powerUps: [],
        }));

        const tokens: Record<TokenId, Token> = {};
        players.forEach((p) => {
            for (let i = 0; i < 4; i++) {
                const tokenId = `${p.id}_t${i}`;
                tokens[tokenId] = {
                    id: tokenId,
                    playerId: p.id,
                    position: -1, // Base
                    status: 'BASE',
                    isInvulnerable: false,
                    shieldTurnsRemaining: 0,
                    isReversed: false,
                };
            }
        });

        set({
            players,
            tokens,
            boardConfig: { playerCount },
            phase: 'ROLLING',
            currentPlayerIndex: 0,
        });
    },

    setDiceRoll: () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        const state = get();
        const player = state.players[state.currentPlayerIndex];
        if (!player) return;

        const playerTokens = Object.values(state.tokens).filter(t => t.playerId === player.id);

        const hasValidMove = playerTokens.some(token => {
            if (token.status === 'BASE') return roll === 6;
            if (token.status === 'ACTIVE') return true;
            if (token.status === 'HOME_STRETCH') {
                // Can move if the roll won't overshoot (position + roll <= 5)
                return token.position + roll <= 5;
            }
            return false;
        });

        if (hasValidMove) {
            set({ diceRoll: roll, phase: 'MOVING' });
        } else {
            set({ diceRoll: roll, phase: 'SKIPPING' });
            setTimeout(() => {
                get().nextTurn();
            }, 1000);
        }
    },

    setDiceRollValue: (value: number) => {
        if (value < 1 || value > 6) return;
        const state = get();
        const player = state.players[state.currentPlayerIndex];
        if (!player) return;

        const playerTokens = Object.values(state.tokens).filter(t => t.playerId === player.id);

        const hasValidMove = playerTokens.some(token => {
            if (token.status === 'BASE') return value === 6;
            if (token.status === 'ACTIVE') return true;
            if (token.status === 'HOME_STRETCH') {
                // Can move if the roll won't overshoot (position + value <= 5)
                return token.position + value <= 5;
            }
            return false;
        });

        if (hasValidMove) {
            set({ diceRoll: value, phase: 'MOVING' });
        } else {
            set({ diceRoll: value, phase: 'SKIPPING' });
            setTimeout(() => {
                get().nextTurn();
            }, 1000);
        }
    },

    moveToken: (tokenId) => {
        const state = get();
        const { tokens, diceRoll, players, boardConfig, currentPlayerIndex } = state;
        const token = tokens[tokenId];

        if (!token || diceRoll === null) return;

        // Validate ownership
        if (token.playerId !== players[currentPlayerIndex]?.id) return;

        let newTokens = { ...tokens };
        let newPlayers = [...players];
        let shouldEndTurn = true;

        // Logic: Base -> Start
        if (token.status === 'BASE') {
            if (diceRoll === 6) {
                const startPos = getStartPosition(currentPlayerIndex, boardConfig.playerCount);
                newTokens[tokenId] = { ...token, status: 'ACTIVE', position: startPos };
                shouldEndTurn = false; // Bonus turn for rolling 6
            } else {
                // Cannot move
                return;
            }
        } else if (token.status === 'ACTIVE') {
            // Logic: Move
            const trackLen = getTrackLength(boardConfig.playerCount);
            const playerIndex = players.findIndex(p => p.id === token.playerId);
            const startPos = getStartPosition(playerIndex, boardConfig.playerCount);

            // Handle Reverse Power-Up
            const direction = token.isReversed ? -1 : 1;
            let newPos = (token.position + (diceRoll * direction) + trackLen) % trackLen;

            // Reset Reverse flag after use
            if (token.isReversed) {
                newTokens[tokenId] = { ...newTokens[tokenId]!, isReversed: false };
            }

            // Check if token has passed its start position (completed circuit)
            // A token enters home stretch when it reaches its "turning index" and would move forward
            // Each player has a specific turning index where they leave the main track:
            // Red: 50 (0,7), Green: 11 (7,0), Yellow: 24 (14,7), Blue: 37 (7,14)
            // When at turning index, tokens skip the next index (skippedIndex) and go directly to home stretch
            // The first step into home stretch is always position 0, then remaining steps move forward
            let enteredHomeStretch = false;
            let remainingSteps = 0;
            if (direction === 1 && !token.isReversed) {
                const oldPos = token.position;
                const turningIndex = getTurningIndex(playerIndex, boardConfig.playerCount);
                const skippedIndex = getSkippedIndex(playerIndex, boardConfig.playerCount);
                
                // Check if we're at the turning index (where we enter home stretch)
                if (oldPos === turningIndex) {
                    // At turning index, any roll enters home stretch
                    // We skip the skippedIndex and go directly to home stretch
                    // Position 0 = first square in home stretch, so diceRoll determines final position
                    enteredHomeStretch = true;
                    remainingSteps = diceRoll; // diceRoll = 1 means position 0, diceRoll = 2 means position 1, etc.
                } else if (oldPos === (turningIndex - 1 + trackLen) % trackLen) {
                    // At position before turning index
                    // If rolling 1, go to turning index (don't enter home stretch yet)
                    // If rolling 2+, we pass through turning index and enter home stretch
                    if (diceRoll >= 2) {
                        enteredHomeStretch = true;
                        // We go 1 step to turning index, then use remaining steps in home stretch
                        // remainingSteps = diceRoll - 1 means: 1 step to enter (position 0), then (diceRoll-1) more steps
                        remainingSteps = diceRoll - 1;
                    }
                    // If rolling 1, enteredHomeStretch stays false, token moves to turning index
                } else if (oldPos !== startPos && oldPos !== turningIndex && oldPos !== skippedIndex) {
                    // For other positions, check if we would reach or pass the turning index
                    const distanceToTurning = (turningIndex - oldPos + trackLen) % trackLen;
                    if (distanceToTurning < diceRoll && distanceToTurning > 0) {
                        // Would pass turning index (not land exactly on it)
                        enteredHomeStretch = true;
                        // Calculate steps after reaching turning index
                        // We go distanceToTurning steps to reach turning index, then remaining steps into home stretch
                        // remainingSteps = diceRoll - distanceToTurning means: distanceToTurning steps to turning index, then (diceRoll - distanceToTurning) steps into home stretch
                        remainingSteps = diceRoll - distanceToTurning;
                    }
                    // If distanceToTurning == diceRoll, we land exactly at turning index, so don't enter home stretch yet
                }
            }

            if (enteredHomeStretch) {
                // Enter home stretch directly into the lane, skipping the skippedIndex square
                // Position 0 = first position in lane (1, 7 for red), 1-4 = further in lane, 5 = at center home
                // remainingSteps represents how many steps we take into the home stretch:
                // - remainingSteps = 1 means we enter at position 0 (first square)
                // - remainingSteps = 2 means we enter and move 1 more step to position 1
                // - etc.
                // So homeStretchPos = remainingSteps - 1 (but minimum 0)
                const homeStretchPos = Math.max(0, remainingSteps - 1);
                
                if (homeStretchPos >= 5 || remainingSteps >= 6) {
                    // Reached center home - token is finished!
                    newTokens[tokenId] = { ...token, status: 'FINISHED', position: 5 };
                } else {
                    newTokens[tokenId] = { ...token, status: 'HOME_STRETCH', position: homeStretchPos };
                    // If rolling 6, get extra turn
                    if (diceRoll === 6) {
                        shouldEndTurn = false;
                    }
                }
            } else {
                // Continue on main track
                // Check Capture
                const collisionTokenId = Object.keys(tokens).find((tid) => {
                    const t = tokens[tid];
                    return t.position === newPos && t.status === 'ACTIVE' && t.id !== tokenId;
                });

                let hitInvulnerable = false;
                if (collisionTokenId) {
                    const collisionToken = tokens[collisionTokenId];
                    if (collisionToken && collisionToken.playerId !== token.playerId && !isSafeZone(newPos, boardConfig.playerCount)) {
                        if (collisionToken.isInvulnerable) {
                            shouldEndTurn = true;
                            hitInvulnerable = true;
                        } else {
                            // Capture!
                            newTokens[collisionTokenId] = { ...collisionToken, status: 'BASE', position: -1 };
                            shouldEndTurn = false; // Bonus turn for capture
                        }
                    }
                }

                // Power-Up Acquisition
                if (isPowerUpZone(newPos, boardConfig.playerCount)) {
                    if (playerIndex !== -1) {
                        const newPowerUp = generatePowerUp();
                        newPlayers[playerIndex] = {
                            ...newPlayers[playerIndex]!,
                            powerUps: [...newPlayers[playerIndex]!.powerUps, newPowerUp]
                        };
                    }
                }

                newTokens[tokenId] = { ...newTokens[tokenId]!, position: newPos };
                // If rolling 6 with an active token, get an extra turn (unless invulnerable capture occurred)
                if (diceRoll === 6 && !hitInvulnerable) {
                    shouldEndTurn = false;
                }
            }
        } else if (token.status === 'HOME_STRETCH') {
            // Logic: Move in home stretch
            const playerIndex = players.findIndex(p => p.id === token.playerId);
            // Position in home stretch: 0 = at start square, 1-5 = in lane, 5 = finished
            // We store the home stretch position in a special way - using position % 1000 to store home stretch pos
            // Actually, let's use position differently: for HOME_STRETCH, position represents home stretch index (0-5)
            let homePos = token.position;
            if (homePos < 0 || homePos > 5) {
                // If position is still the track position, convert to home stretch position 0
                homePos = 0;
            }
            
            const newHomePos = homePos + diceRoll;
            
            if (newHomePos >= 5) {
                // Reached center home - token is finished!
                newTokens[tokenId] = { ...token, status: 'FINISHED', position: 5 };
                // Finished token doesn't get extra turn
            } else {
                // Move forward in home stretch
                newTokens[tokenId] = { ...token, position: newHomePos };
                // If rolling 6, get extra turn
                if (diceRoll === 6) {
                    shouldEndTurn = false;
                }
            }
        }

        // Decrement Shield counters for current player's tokens
        Object.keys(newTokens).forEach(tid => {
            const t = newTokens[tid]!;
            if (t.playerId === players[currentPlayerIndex]?.id && t.shieldTurnsRemaining > 0) {
                newTokens[tid] = { ...t, shieldTurnsRemaining: t.shieldTurnsRemaining - 1 };
                if (t.shieldTurnsRemaining - 1 <= 0) {
                    newTokens[tid]!.isInvulnerable = false;
                }
            }
        });

        set({ tokens: newTokens, players: newPlayers, phase: shouldEndTurn ? 'ROLLING' : 'ROLLING', diceRoll: null });
        if (shouldEndTurn) {
            get().nextTurn();
        }
    },

    activatePowerUp: (playerId, powerUpIndex, targetTokenId) => {
        const state = get();
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const player = state.players[playerIndex]!;
        const powerUp = player.powerUps[powerUpIndex];
        if (!powerUp) return;

        let newTokens = { ...state.tokens };
        let used = false;

        if (powerUp.type === 'SHIELD' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token && token.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isInvulnerable: true, shieldTurnsRemaining: 2 };
                used = true;
            }
        } else if (powerUp.type === 'REVERSE' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token && token.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isReversed: true };
                used = true;
            }
        } else if (powerUp.type === 'SWAP' && targetTokenId) {
            const sourceTokenId = Object.keys(newTokens).find(tid => newTokens[tid]!.playerId === playerId && newTokens[tid]!.status === 'ACTIVE');
            const targetToken = newTokens[targetTokenId];

            if (sourceTokenId && targetToken && targetToken.playerId !== playerId && targetToken.status === 'ACTIVE') {
                const sourceToken = newTokens[sourceTokenId]!;
                const sourcePos = sourceToken.position;
                const targetPos = targetToken.position;

                newTokens[sourceTokenId] = { ...sourceToken, position: targetPos };
                newTokens[targetTokenId] = { ...targetToken, position: sourcePos };
                used = true;
            }
        }

        if (used) {
            const newPowerUps = [...player.powerUps];
            newPowerUps.splice(powerUpIndex, 1);
            const newPlayers = [...state.players];
            newPlayers[playerIndex] = { ...player, powerUps: newPowerUps };
            set({ tokens: newTokens, players: newPlayers });
        }
    },

    setTokenStatus: (tokenId, status) =>
        set((state) => ({
            tokens: {
                ...state.tokens,
                [tokenId]: {
                    ...state.tokens[tokenId]!,
                    status,
                },
            },
        })),

    nextTurn: () =>
        set((state) => {
            // Clockwise turn order: Red(0) -> Green(1) -> Yellow(3) -> Blue(2) -> Red(0)
            // For 4 players, the clockwise sequence is: 0 -> 1 -> 3 -> 2 -> 0
            let nextPlayerIndex: number;
            if (state.players.length === 4) {
                const clockwiseOrder = [0, 1, 3, 2];
                const currentIndexInOrder = clockwiseOrder.indexOf(state.currentPlayerIndex);
                const nextIndexInOrder = (currentIndexInOrder + 1) % clockwiseOrder.length;
                nextPlayerIndex = clockwiseOrder[nextIndexInOrder]!;
            } else {
                // For other player counts, use standard sequential order
                nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
            }
            return {
                currentPlayerIndex: nextPlayerIndex,
                diceRoll: null,
                phase: 'ROLLING',
            };
        }),

    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
