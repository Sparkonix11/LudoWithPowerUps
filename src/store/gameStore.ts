import { create } from 'zustand';
import type { GameState, Player, Token, TokenId, PowerUp, PowerUpType } from '../types/game';
import { getTrackLength, getStartPosition, getTurningIndex, getSkippedIndex, isSafeZone, isPowerUpZone, getRandomPowerUpSpawnPositions } from '../utils/boardUtils';

interface GameActions {
    initGame: (playerCount: number) => void;
    setDiceRoll: () => void;
    setDiceRollValue: (value: number) => void;
    moveToken: (tokenId: TokenId) => void;
    setTokenStatus: (tokenId: TokenId, status: Token['status']) => void;
    setTokenPosition: (tokenId: TokenId, position: number, status: Token['status'], homePosition?: number) => void;
    nextTurn: () => void;
    activatePowerUp: (playerId: string, powerUpIndex: number, targetTokenId?: string, targetPosition?: number, targetPlayerId?: string, targetDiceValue?: number) => void;
    collectPowerUp: (position: number, playerId: string) => void;
    discardPowerUp: (playerId: string, powerUpIndex: number) => void;
    spawnPowerUpOnBoard: (position: number) => void;
    respawnPowerUps: () => void;
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
    powerUpsOnBoard: {},
    powerUpUsedThisTurn: false,
    turnCount: 0,
    pendingPowerUpCollection: null,
    pendingPowerUpSelection: null,
    // @ts-expect-error - theme is part of actions but we init it here for state
    theme: 'light',
};

const generatePowerUp = (): PowerUp => {
    const types: PowerUpType[] = [
        'SHIELD', 'REVERSE', 'SWAP',
        'TELEPORT', 'DOUBLE_MOVE', 'EXACT_MOVE', 'WARP', 'BACKWARDS_DASH',
        'SEND_BACK', 'FREEZE', 'STEAL_POWERUP', 'MAGNET',
        'IMMUNITY', 'PHASE', 'SAFE_PASSAGE',
        'EXTRA_TURN', 'BONUS_ROLL', 'DICE_LOCK',
        'SWAP_DICE', 'HOME_STRETCH_TELEPORT'
    ];
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
            color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'][i] ?? '#000000',
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
                    frozenTurnsRemaining: 0,
                    isPhased: false,
                    phasedTurnsRemaining: 0,
                    isImmune: false,
                    immunityTurnsRemaining: 0,
                    doubleMoveNext: false,
                    exactMoveValue: null,
                    safePassageMovesRemaining: 0,
                };
            }
        });

        // Spawn initial power-ups on board
        const powerUpsOnBoard: Record<string, PowerUp> = {};
        const spawnPositions = getRandomPowerUpSpawnPositions(6, playerCount);
        spawnPositions.forEach(pos => {
            const powerUp = generatePowerUp();
            powerUpsOnBoard[pos.toString()] = powerUp;
        });

        set({
            players,
            tokens,
            boardConfig: { playerCount },
            phase: 'ROLLING',
            currentPlayerIndex: 0,
            powerUpsOnBoard,
            powerUpUsedThisTurn: false,
            turnCount: 0,
            pendingPowerUpCollection: null,
            pendingPowerUpSelection: null,
        });
    },

    setDiceRoll: () => {
        const state = get();
        const player = state.players[state.currentPlayerIndex];
        if (!player) return;

        const playerTokens = Object.values(state.tokens).filter(t => t.playerId === player.id);
        
        // Check if all tokens are locked (in BASE status)
        const allTokensLocked = playerTokens.length > 0 && playerTokens.every(token => token.status === 'BASE');
        
        // If all tokens are locked, give a slightly higher chance of rolling 6
        let roll: number;
        if (allTokensLocked) {
            // 25% chance of 6, 15% chance each for 1-5
            const random = Math.random();
            if (random < 0.25) {
                roll = 6;
            } else {
                // Distribute remaining 75% evenly among 1-5 (15% each)
                roll = Math.floor((random - 0.25) / 0.15) + 1;
            }
        } else {
            // Normal distribution
            roll = Math.floor(Math.random() * 6) + 1;
        }

        const hasValidMove = playerTokens.some(token => {
            if (token.status === 'BASE') return roll === 6;
            if (token.status === 'ACTIVE') return true;
            if (token.status === 'HOME_STRETCH') {
                // Can move if the roll won't overshoot (position + roll <= 5)
                return token.position + roll <= 5;
            }
            return false;
        });

        // Reset power-up used flag at start of turn
        set({ powerUpUsedThisTurn: false });

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

        // Reset power-up used flag at start of turn
        set({ powerUpUsedThisTurn: false });

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

        // Check if token is frozen
        if (token.frozenTurnsRemaining > 0) return;

        const newTokens = { ...tokens };
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

            // Handle power-up effects on dice roll
            let effectiveRoll = diceRoll;
            if (token.doubleMoveNext) {
                effectiveRoll = diceRoll * 2;
                newTokens[tokenId] = { ...newTokens[tokenId]!, doubleMoveNext: false };
            }
            if (token.exactMoveValue !== null) {
                effectiveRoll = token.exactMoveValue;
                newTokens[tokenId] = { ...newTokens[tokenId]!, exactMoveValue: null };
            }

            // Handle Reverse Power-Up
            const direction = token.isReversed ? -1 : 1;
            const newPos = (token.position + (effectiveRoll * direction) + trackLen) % trackLen;

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
                    // Position 0 = first square in home stretch, so effectiveRoll determines final position
                    enteredHomeStretch = true;
                    remainingSteps = effectiveRoll; // effectiveRoll = 1 means position 0, effectiveRoll = 2 means position 1, etc.
                } else if (oldPos === (turningIndex - 1 + trackLen) % trackLen) {
                    // At position before turning index
                    // If rolling 1, go to turning index (don't enter home stretch yet)
                    // If rolling 2+, we pass through turning index and enter home stretch
                    if (effectiveRoll >= 2) {
                        enteredHomeStretch = true;
                        // We go 1 step to turning index, then use remaining steps in home stretch
                        // remainingSteps = effectiveRoll - 1 means: 1 step to enter (position 0), then (effectiveRoll-1) more steps
                        remainingSteps = effectiveRoll - 1;
                    }
                    // If rolling 1, enteredHomeStretch stays false, token moves to turning index
                } else if (oldPos !== startPos && oldPos !== turningIndex && oldPos !== skippedIndex) {
                    // For other positions, check if we would reach or pass the turning index
                    const distanceToTurning = (turningIndex - oldPos + trackLen) % trackLen;
                    if (distanceToTurning < effectiveRoll && distanceToTurning > 0) {
                        // Would pass turning index (not land exactly on it)
                        enteredHomeStretch = true;
                        // Calculate steps after reaching turning index
                        // We go distanceToTurning steps to reach turning index, then remaining steps into home stretch
                        // remainingSteps = effectiveRoll - distanceToTurning means: distanceToTurning steps to turning index, then (effectiveRoll - distanceToTurning) steps into home stretch
                        remainingSteps = effectiveRoll - distanceToTurning;
                    }
                    // If distanceToTurning == effectiveRoll, we land exactly at turning index, so don't enter home stretch yet
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
                // Check Capture (skip if phased)
                let hitInvulnerable = false;
                if (!token.isPhased) {
                    const collisionTokenId = Object.keys(tokens).find((tid) => {
                        const t = tokens[tid];
                        if (!t) return false;
                        return t.position === newPos && t.status === 'ACTIVE' && t.id !== tokenId;
                    });

                    if (collisionTokenId) {
                        const collisionToken = tokens[collisionTokenId];
                        const isSafe = isSafeZone(newPos, boardConfig.playerCount) || token.safePassageMovesRemaining > 0;
                        if (collisionToken && collisionToken.playerId !== token.playerId && !isSafe) {
                            if (collisionToken.isInvulnerable || collisionToken.isImmune) {
                                shouldEndTurn = true;
                                hitInvulnerable = true;
                            } else {
                                // Capture!
                                newTokens[collisionTokenId] = { ...collisionToken, status: 'BASE', position: -1 };
                                shouldEndTurn = false; // Bonus turn for capture
                            }
                        }
                    }
                }

                // Power-Up Acquisition
                if (isPowerUpZone(newPos, boardConfig.playerCount)) {
                    const powerUpKey = newPos.toString();
                    const state = get();
                    if (state.powerUpsOnBoard[powerUpKey]) {
                        // Collect power-up
                        get().collectPowerUp(newPos, token.playerId);
                        // Update newPlayers to reflect the power-up collection
                        const stateAfterCollection = get();
                        newPlayers = [...stateAfterCollection.players];
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
            // Position in home stretch: 0 = at start square, 1-5 = in lane, 5 = finished
            let homePos = token.position;
            if (homePos < 0 || homePos > 5) {
                // If position is still the track position, convert to home stretch position 0
                homePos = 0;
            }
            
            // Handle power-up effects on dice roll
            let effectiveRoll = diceRoll;
            if (token.doubleMoveNext) {
                effectiveRoll = diceRoll * 2;
                newTokens[tokenId] = { ...newTokens[tokenId]!, doubleMoveNext: false };
            }
            if (token.exactMoveValue !== null) {
                effectiveRoll = token.exactMoveValue;
                newTokens[tokenId] = { ...newTokens[tokenId]!, exactMoveValue: null };
            }
            
            const newHomePos = homePos + effectiveRoll;
            
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

        // Decrement status counters for current player's tokens
        Object.keys(newTokens).forEach(tid => {
            const t = newTokens[tid]!;
            if (t.playerId === players[currentPlayerIndex]?.id) {
                if (t.shieldTurnsRemaining > 0) {
                    const updatedToken = { ...t, shieldTurnsRemaining: t.shieldTurnsRemaining - 1 };
                    newTokens[tid] = updatedToken;
                    if (t.shieldTurnsRemaining - 1 <= 0) {
                        newTokens[tid] = { ...updatedToken, isInvulnerable: false };
                    }
                }
                if (t.frozenTurnsRemaining > 0) {
                    newTokens[tid] = { ...t, frozenTurnsRemaining: t.frozenTurnsRemaining - 1 };
                }
                if (t.phasedTurnsRemaining > 0) {
                    const updatedToken = { ...t, phasedTurnsRemaining: t.phasedTurnsRemaining - 1 };
                    newTokens[tid] = updatedToken;
                    if (t.phasedTurnsRemaining - 1 <= 0) {
                        newTokens[tid] = { ...updatedToken, isPhased: false };
                    }
                }
                if (t.immunityTurnsRemaining > 0) {
                    const updatedToken = { ...t, immunityTurnsRemaining: t.immunityTurnsRemaining - 1 };
                    newTokens[tid] = updatedToken;
                    if (t.immunityTurnsRemaining - 1 <= 0) {
                        newTokens[tid] = { ...updatedToken, isImmune: false };
                    }
                }
                if (t.safePassageMovesRemaining > 0) {
                    newTokens[tid] = { ...newTokens[tid]!, safePassageMovesRemaining: t.safePassageMovesRemaining - 1 };
                }
            }
        });

        // Check if there's a pending power-up collection (player has 3 power-ups)
        const finalState = get();
        const finalPhase = finalState.pendingPowerUpCollection 
            ? 'POWERUP_DISCARD' 
            : (shouldEndTurn ? 'ROLLING' : 'ROLLING');
        
        set({ tokens: newTokens, players: newPlayers, phase: finalPhase, diceRoll: null });
        if (shouldEndTurn && !finalState.pendingPowerUpCollection) {
            get().nextTurn();
        }
    },

    collectPowerUp: (position, playerId) => {
        const state = get();
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const player = state.players[playerIndex]!;
        const powerUpKey = position.toString();
        const powerUp = state.powerUpsOnBoard[powerUpKey];
        if (!powerUp) return;

        // Check if player has max power-ups (3)
        if (player.powerUps.length >= 3) {
            // Trigger discard UI
            set({
                phase: 'POWERUP_DISCARD',
                pendingPowerUpCollection: { position, playerId }
            });
            return;
        }

        // Add power-up to inventory
        const newPlayers = [...state.players];
        newPlayers[playerIndex] = {
            ...player,
            powerUps: [...player.powerUps, powerUp]
        };

        // Remove from board
        const newPowerUpsOnBoard = { ...state.powerUpsOnBoard };
        delete newPowerUpsOnBoard[powerUpKey];

        set({
            players: newPlayers,
            powerUpsOnBoard: newPowerUpsOnBoard
        });
    },

    discardPowerUp: (playerId, powerUpIndex) => {
        const state = get();
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const player = state.players[playerIndex]!;
        if (powerUpIndex < 0 || powerUpIndex >= player.powerUps.length) return;

        const newPowerUps = [...player.powerUps];
        newPowerUps.splice(powerUpIndex, 1);

        const newPlayers = [...state.players];
        newPlayers[playerIndex] = { ...player, powerUps: newPowerUps };

        set({ players: newPlayers });

        // If there's a pending collection, complete it
        if (state.pendingPowerUpCollection) {
            get().collectPowerUp(state.pendingPowerUpCollection.position, state.pendingPowerUpCollection.playerId);
            set({ pendingPowerUpCollection: null, phase: 'ROLLING' });
        }
    },

    spawnPowerUpOnBoard: (position) => {
        const state = get();
        const powerUp = generatePowerUp();
        const newPowerUpsOnBoard = { ...state.powerUpsOnBoard };
        newPowerUpsOnBoard[position.toString()] = powerUp;
        set({ powerUpsOnBoard: newPowerUpsOnBoard });
    },

    respawnPowerUps: () => {
        const state = get();
        const occupiedPositions = Object.keys(state.powerUpsOnBoard).map(k => parseInt(k));
        const maxPowerUps = 8;
        const currentCount = Object.keys(state.powerUpsOnBoard).length;

        if (currentCount < maxPowerUps) {
            const spawnCount = Math.min(2, maxPowerUps - currentCount);
            const newPositions = getRandomPowerUpSpawnPositions(
                spawnCount,
                state.boardConfig.playerCount,
                occupiedPositions
            );

            newPositions.forEach(pos => {
                get().spawnPowerUpOnBoard(pos);
            });
        }
    },

    activatePowerUp: (playerId, powerUpIndex, targetTokenId, targetPosition, targetPlayerId, targetDiceValue) => {
        const state = get();
        
        // Check if power-up already used this turn
        if (state.powerUpUsedThisTurn) return;
        
        // Check if it's player's turn
        if (state.players[state.currentPlayerIndex]?.id !== playerId) return;

        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        const player = state.players[playerIndex]!;
        const powerUp = player.powerUps[powerUpIndex];
        if (!powerUp) return;

        const newTokens = { ...state.tokens };
        const newPlayers = [...state.players];
        let used = false;
        let needsSelection = false;

        // Movement Power-ups
        if (powerUp.type === 'TELEPORT') {
            if (targetPosition !== undefined && targetTokenId) {
                const token = newTokens[targetTokenId];
                if (token?.playerId === playerId && token.status === 'ACTIVE') {
                    const trackLen = getTrackLength(state.boardConfig.playerCount);
                    if (targetPosition >= 0 && targetPosition < trackLen) {
                        newTokens[targetTokenId] = { ...token, position: targetPosition };
                        used = true;
                    }
                }
            } else {
                needsSelection = true;
            }
        } else if (powerUp.type === 'DOUBLE_MOVE' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, doubleMoveNext: true };
                used = true;
            }
        } else if (powerUp.type === 'EXACT_MOVE') {
            if (targetDiceValue !== undefined && targetTokenId) {
                const token = newTokens[targetTokenId];
                if (token?.playerId === playerId && targetDiceValue >= 1 && targetDiceValue <= 6) {
                    newTokens[targetTokenId] = { ...token, exactMoveValue: targetDiceValue };
                    used = true;
                }
            } else {
                needsSelection = true;
            }
        } else if (powerUp.type === 'WARP' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId && token.status === 'ACTIVE') {
                const trackLen = getTrackLength(state.boardConfig.playerCount);
                const newPos = (token.position + 10) % trackLen;
                newTokens[targetTokenId] = { ...token, position: newPos };
                used = true;
            }
        } else if (powerUp.type === 'BACKWARDS_DASH' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId && token.status === 'ACTIVE') {
                const trackLen = getTrackLength(state.boardConfig.playerCount);
                const newPos = (token.position - 5 + trackLen) % trackLen;
                newTokens[targetTokenId] = { ...token, position: newPos };
                used = true;
            }
        } else if (powerUp.type === 'HOME_STRETCH_TELEPORT' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId && token.status === 'ACTIVE') {
                const playerIdx = state.players.findIndex(p => p.id === playerId);
                const turningIndex = getTurningIndex(playerIdx, state.boardConfig.playerCount);
                // Move to turning index to enter home stretch
                newTokens[targetTokenId] = { ...token, position: turningIndex };
                used = true;
            }
        }
        // Offensive Power-ups
        else if (powerUp.type === 'SEND_BACK' && targetTokenId) {
            const targetToken = newTokens[targetTokenId];
            if (targetToken?.playerId !== playerId && targetToken?.status === 'ACTIVE') {
                if (!targetToken.isImmune) {
                    newTokens[targetTokenId] = { ...targetToken, status: 'BASE', position: -1 };
                    used = true;
                }
            }
        } else if (powerUp.type === 'FREEZE' && targetTokenId) {
            const targetToken = newTokens[targetTokenId];
            if (targetToken?.playerId !== playerId && targetToken && targetToken.status !== 'BASE') {
                if (!targetToken.isImmune) {
                    newTokens[targetTokenId] = { ...targetToken, frozenTurnsRemaining: 2 };
                    used = true;
                }
            }
        } else if (powerUp.type === 'STEAL_POWERUP' && targetPlayerId) {
            const targetPlayerIndex = state.players.findIndex(p => p.id === targetPlayerId);
            if (targetPlayerIndex !== -1 && targetPlayerIndex !== playerIndex) {
                const targetPlayer = state.players[targetPlayerIndex]!;
                if (targetPlayer.powerUps.length > 0) {
                    const stolenIndex = Math.floor(Math.random() * targetPlayer.powerUps.length);
                    const stolenPowerUp = targetPlayer.powerUps[stolenIndex]!;
                    const newTargetPowerUps = [...targetPlayer.powerUps];
                    newTargetPowerUps.splice(stolenIndex, 1);
                    newPlayers[targetPlayerIndex] = { ...targetPlayer, powerUps: newTargetPowerUps };
                    newPlayers[playerIndex] = { ...player, powerUps: [...player.powerUps, stolenPowerUp] };
                    used = true;
                }
            }
        } else if (powerUp.type === 'MAGNET' && targetTokenId) {
            const myTokenId = Object.keys(newTokens).find(tid => 
                newTokens[tid]!.playerId === playerId && newTokens[tid]!.status === 'ACTIVE'
            );
            const targetToken = newTokens[targetTokenId];
            if (myTokenId && targetToken?.playerId !== playerId && targetToken?.status === 'ACTIVE') {
                if (!targetToken.isImmune) {
                    const trackLen = getTrackLength(state.boardConfig.playerCount);
                    // Calculate direction toward my token
                    const targetPos = targetToken.position;
                    const newPos = (targetPos - 3 + trackLen) % trackLen;
                    newTokens[targetTokenId] = { ...targetToken, position: newPos };
                    used = true;
                }
            }
        }
        // Defensive Power-ups
        else if (powerUp.type === 'IMMUNITY' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isImmune: true, immunityTurnsRemaining: 3 };
                used = true;
            }
        } else if (powerUp.type === 'PHASE' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isPhased: true, phasedTurnsRemaining: 1 };
                used = true;
            }
        } else if (powerUp.type === 'SAFE_PASSAGE' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, safePassageMovesRemaining: 3 };
                used = true;
            }
        }
        // Utility Power-ups
        else if (powerUp.type === 'EXTRA_TURN') {
            // This will be handled in nextTurn logic
            used = true;
        } else if (powerUp.type === 'BONUS_ROLL') {
            // This will be handled in UI - allow another roll
            used = true;
        } else if (powerUp.type === 'DICE_LOCK' && targetPlayerId) {
            // Store this in player state or game state for next turn
            used = true;
        } else if (powerUp.type === 'SWAP_DICE' && targetPlayerId) {
            // This would need to be handled differently - swap current roll with opponent's last roll
            used = true;
        }
        // Original Power-ups
        else if (powerUp.type === 'SHIELD' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isInvulnerable: true, shieldTurnsRemaining: 2 };
                used = true;
            }
        } else if (powerUp.type === 'REVERSE' && targetTokenId) {
            const token = newTokens[targetTokenId];
            if (token?.playerId === playerId) {
                newTokens[targetTokenId] = { ...token, isReversed: true };
                used = true;
            }
        } else if (powerUp.type === 'SWAP' && targetTokenId) {
            const sourceTokenId = Object.keys(newTokens).find(tid => newTokens[tid]!.playerId === playerId && newTokens[tid]!.status === 'ACTIVE');
            const targetToken = newTokens[targetTokenId];

            if (sourceTokenId && targetToken?.playerId !== playerId && targetToken?.status === 'ACTIVE') {
                if (!targetToken.isImmune) {
                    const sourceToken = newTokens[sourceTokenId]!;
                    const sourcePos = sourceToken.position;
                    const targetPos = targetToken.position;

                    newTokens[sourceTokenId] = { ...sourceToken, position: targetPos };
                    newTokens[targetTokenId] = { ...targetToken, position: sourcePos };
                    used = true;
                }
            }
        }

        if (needsSelection) {
            set({
                phase: 'POWERUP_SELECTION',
                pendingPowerUpSelection: { powerUpType: powerUp.type, powerUpIndex, playerId }
            });
        } else if (used) {
            const newPowerUps = [...player.powerUps];
            newPowerUps.splice(powerUpIndex, 1);
            newPlayers[playerIndex] = { ...player, powerUps: newPowerUps };
            set({ 
                tokens: newTokens, 
                players: newPlayers,
                powerUpUsedThisTurn: true,
                pendingPowerUpSelection: null
            });
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

    setTokenPosition: (tokenId, position, status, homePosition) =>
        set((state) => {
            const token = state.tokens[tokenId];
            if (!token) return state;

            const updatedToken: Token = {
                ...token,
                position,
                status,
            };

            // If status is HOME_STRETCH, ensure position is set correctly
            if (status === 'HOME_STRETCH' && homePosition !== undefined) {
                updatedToken.position = homePosition;
            } else if (status === 'FINISHED') {
                updatedToken.position = 5;
            } else if (status === 'BASE') {
                updatedToken.position = -1;
            }

            return {
                tokens: {
                    ...state.tokens,
                    [tokenId]: updatedToken,
                },
            };
        }),

    nextTurn: () =>
        set((state) => {
            // Clockwise turn order: Red(0) -> Green(1) -> Yellow(3) -> Blue(2) -> Red(0)
            // For 4 players, the clockwise sequence is: 0 -> 1 -> 3 -> 2 -> 0
            let nextPlayerIndex: number;
            const newTurnCount = state.turnCount + 1;
            if (state.players.length === 4) {
                const clockwiseOrder = [0, 1, 3, 2];
                const currentIndexInOrder = clockwiseOrder.indexOf(state.currentPlayerIndex);
                const nextIndexInOrder = (currentIndexInOrder + 1) % clockwiseOrder.length;
                nextPlayerIndex = clockwiseOrder[nextIndexInOrder]!;
            } else {
                // For other player counts, use standard sequential order
                nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
            }
            
            // Respawn power-ups every 4 turns
            if (newTurnCount % 4 === 0) {
                get().respawnPowerUps();
            }
            
            return {
                currentPlayerIndex: nextPlayerIndex,
                diceRoll: null,
                phase: 'ROLLING',
                powerUpUsedThisTurn: false,
                turnCount: newTurnCount,
            };
        }),

    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
