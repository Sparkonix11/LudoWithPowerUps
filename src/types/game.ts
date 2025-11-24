export type PlayerId = string;
export type TokenId = string;

export type PowerUpType = 'SHIELD' | 'REVERSE' | 'SWAP';

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
}

export interface BoardConfig {
    playerCount: number;
    // We'll add more geometry config here later
}

export type GamePhase = 'SETUP' | 'ROLLING' | 'MOVING' | 'POWERUP_SELECTION' | 'ANIMATING' | 'SKIPPING';

export interface GameState {
    players: Player[];
    tokens: Record<TokenId, Token>;
    currentPlayerIndex: number;
    diceRoll: number | null;
    phase: GamePhase;
    boardConfig: BoardConfig;
}
