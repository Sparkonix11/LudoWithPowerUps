export type PlayerId = string;
export type TokenId = string;

export type PowerUpType = 
    | 'SHIELD' | 'REVERSE' | 'SWAP'
    | 'TELEPORT' | 'DOUBLE_MOVE' | 'EXACT_MOVE' | 'WARP' | 'BACKWARDS_DASH'
    | 'SEND_BACK' | 'FREEZE' | 'STEAL_POWERUP' | 'MAGNET'
    | 'IMMUNITY' | 'PHASE' | 'SAFE_PASSAGE'
    | 'EXTRA_TURN' | 'BONUS_ROLL' | 'DICE_LOCK'
    | 'SWAP_DICE' | 'HOME_STRETCH_TELEPORT';

export interface PowerUp {
    id: string;
    type: PowerUpType;
}

export interface Player {
    id: PlayerId;
    name: string;
    color: string;
    powerUps: PowerUp[];
}

export type TokenStatus = 'BASE' | 'ACTIVE' | 'HOME_STRETCH' | 'FINISHED';

export interface Token {
    id: TokenId;
    playerId: PlayerId;
    position: number; // -1 for Base, 0-X for main track
    status: TokenStatus;
    // Power-up related state
    isInvulnerable: boolean;
    shieldTurnsRemaining: number;
    isReversed: boolean; // For Reverse Gear
    frozenTurnsRemaining: number;
    isPhased: boolean;
    phasedTurnsRemaining: number;
    isImmune: boolean;
    immunityTurnsRemaining: number;
    doubleMoveNext: boolean; // For DOUBLE_MOVE
    exactMoveValue: number | null; // For EXACT_MOVE
    safePassageMovesRemaining: number;
}

export interface BoardConfig {
    playerCount: number;
    // We'll add more geometry config here later
}

export type GamePhase = 'SETUP' | 'ROLLING' | 'MOVING' | 'POWERUP_SELECTION' | 'POWERUP_DISCARD' | 'ANIMATING' | 'SKIPPING';

export interface GameState {
    players: Player[];
    tokens: Record<TokenId, Token>;
    currentPlayerIndex: number;
    diceRoll: number | null;
    phase: GamePhase;
    boardConfig: BoardConfig;
    powerUpsOnBoard: Record<string, PowerUp>; // Keyed by position string
    powerUpUsedThisTurn: boolean;
    turnCount: number;
    pendingPowerUpCollection: { position: number; playerId: string } | null;
    pendingPowerUpSelection: { powerUpType: PowerUpType; powerUpIndex: number; playerId: string } | null;
}
