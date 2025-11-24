export const getTrackLength = (playerCount: number): number => {
    if (playerCount === 4) return 52; // Main track has 52 positions (0-51), but each player skips one when entering home stretch
    return 13 * playerCount;
};

export const getStartPosition = (playerIndex: number, playerCount: number): number => {
    if (playerCount === 4) {
        // Player indices: 0=Red, 1=Green, 2=Blue, 3=Yellow
        // Start positions for 52-position track:
        // Red: position 0 = (1, 6)
        // Green: position 13 = (8, 1)
        // Blue: position 39 = (6, 13)
        // Yellow: position 26 = (13, 8)
        const startPositions = [0, 13, 39, 26];
        return startPositions[playerIndex] ?? playerIndex * 13;
    }
    return playerIndex * 13;
};

// Get the turning index where a player enters home stretch (skips the next index)
export const getTurningIndex = (playerIndex: number, playerCount: number): number => {
    if (playerCount === 4) {
        // Turning indices: where each player leaves main track to enter home stretch
        // Red: 50 (0,7), Green: 11 (7,0), Blue: 37 (7,14), Yellow: 24 (14,7)
        const turningIndices = [50, 11, 37, 24];
        return turningIndices[playerIndex] ?? 0;
    }
    return 0;
};

// Get the skipped index that the player never touches when entering home stretch
export const getSkippedIndex = (playerIndex: number, playerCount: number): number => {
    if (playerCount === 4) {
        // Skipped indices: the square after turning index that player skips
        // Red: 51 (0,6), Green: 12 (8,0), Blue: 38 (6,14), Yellow: 25 (14,8)
        const skippedIndices = [51, 12, 38, 25];
        return skippedIndices[playerIndex] ?? 0;
    }
    return 0;
};

export const isSafeZone = (position: number, playerCount: number): boolean => {
    // Standard Ludo Safe Zones:
    // 1. Start positions (Red=0, Green=13, Blue=39, Yellow=26) - for 52-position track
    // 2. Star positions (8, 21, 34, 47) - typically 8 steps from start
    if (playerCount === 4) {
        const starts = [0, 13, 39, 26]; // Red, Green, Blue, Yellow
        const stars = [8, 21, 34, 47];
        return starts.includes(position) || stars.includes(position);
    }

    for (let i = 0; i < playerCount; i++) {
        if (position === getStartPosition(i, playerCount)) return true;
    }
    return false;
};

export const isPowerUpZone = (position: number, playerCount: number): boolean => {
    if (playerCount === 4) {
        // Safe zones can also spawn power-ups
        const safeZones = [0, 8, 13, 21, 26, 34, 39, 47]; // Start positions and star positions
        if (safeZones.includes(position)) return true;
        
        // Random squares: positions 4, 17, 30, 43 (existing pattern)
        if (position % 13 === 4) return true;
        
        // Additional random positions per quadrant
        // Red quadrant: 2, 3, 5, 6
        // Green quadrant: 15, 16, 18, 19
        // Yellow quadrant: 28, 29, 31, 32
        // Blue quadrant: 41, 42, 44, 45
        const randomPositions = [2, 3, 5, 6, 15, 16, 18, 19, 28, 29, 31, 32, 41, 42, 44, 45];
        if (randomPositions.includes(position)) return true;
        
        return false;
    }
    
    // For other player counts, use modulo pattern
    return position % 13 === 4;
};

export const getPowerUpSpawnPositions = (playerCount: number): number[] => {
    if (playerCount === 4) {
        const safeZones = [0, 8, 13, 21, 26, 34, 39, 47];
        const randomPositions = [2, 3, 4, 5, 6, 15, 16, 17, 18, 19, 28, 29, 30, 31, 32, 41, 42, 43, 44, 45];
        return [...safeZones, ...randomPositions];
    }
    
    // For other player counts
    const positions: number[] = [];
    const trackLength = getTrackLength(playerCount);
    for (let i = 0; i < trackLength; i++) {
        if (isPowerUpZone(i, playerCount)) {
            positions.push(i);
        }
    }
    return positions;
};

export const getRandomPowerUpSpawnPositions = (count: number, playerCount: number, excludePositions: number[] = []): number[] => {
    const allPositions = getPowerUpSpawnPositions(playerCount);
    const available = allPositions.filter(pos => !excludePositions.includes(pos));
    
    // Shuffle and take count
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const getHomeStart = (playerIndex: number, playerCount: number): number => {
    const start = getStartPosition(playerIndex, playerCount);
    const length = getTrackLength(playerCount);
    return (start - 1 + length) % length;
};

// Standard Ludo Grid (15x15)
// Red: Top-Left (P0)
// Green: Top-Right (P1)
// Blue: Bottom-Left (P2)
// Yellow: Bottom-Right (P3)
// Note: Order in image is Red(TL) -> Green(TR) -> Yellow(BR) -> Blue(BL).
// Clockwise order of play usually: Red -> Green -> Yellow -> Blue.
// Player indices: 0=Red, 1=Green, 2=Blue, 3=Yellow
// Path:
// Red starts at (1, 6) -> Right to (5, 6) -> Up to (5, 0) -> Right to (6, 0) -> Down to (6, 5) -> Right to (8, 5) -> Up to (8, 0) ...
// Wait, let's map the 52 steps manually for precision.

const generateStandardPath = () => {
    const path: { x: number, y: number }[] = [];

    // We need to generate 52 coordinates in order.
    // Starting from Red's start position (index 0).
    // Red Start: (1, 6) (0-indexed: x=1, y=6)
    // Direction: Right -> (2,6), (3,6), (4,6), (5,6)
    // Then Up: (6,5), (6,4), (6,3), (6,2), (6,1), (6,0)
    // Then Right: (7,0), (8,0)
    // Then Down: (8,1), (8,2), (8,3), (8,4), (8,5)
    // Then Right: (9,6), (10,6), (11,6), (12,6), (13,6), (14,6)
    // Then Down: (14,7), (14,8)
    // Then Left: (13,8), (12,8), (11,8), (10,8), (9,8)
    // Then Down: (8,9), (8,10), (8,11), (8,12), (8,13), (8,14)
    // Then Left: (7,14), (6,14)
    // Then Up: (6,13), (6,12), (6,11), (6,10), (6,9)
    // Then Left: (5,8), (4,8), (3,8), (2,8), (1,8), (0,8)
    // Then Up: (0,7), (0,6) -> Back to start

    // Let's trace carefully.
    // Segment 1 (Red Home Stretch approach): (1,6) to (5,6) [5 steps]
    // Segment 2 (Up towards Green): (6,5) to (6,0) [6 steps]
    // Segment 3 (Turn): (7,0), (8,0) [2 steps]
    // Segment 4 (Down from Green): (8,1) to (8,5) [5 steps]
    // Segment 5 (Right towards Yellow): (9,6) to (14,6) [6 steps]
    // Segment 6 (Turn): (14,7), (14,8) [2 steps]
    // Segment 7 (Left from Yellow): (13,8) to (9,8) [5 steps]
    // Segment 8 (Down towards Blue): (8,9) to (8,14) [6 steps]
    // Segment 9 (Turn): (7,14), (6,14) [2 steps]
    // Segment 10 (Up from Blue): (6,13) to (6,9) [5 steps]
    // Segment 11 (Left towards Red): (5,8) to (0,8) [6 steps]
    // Segment 12 (Turn): (0,7), (0,6) [2 steps] 
    // Note: Red reaches (0,7) at index 50 and turns into home stretch, skipping (0,6) at index 51
    // Other colors use (0,6) as part of their path, but Red never touches it

    // Total steps: 5+6+2+5+6+2+5+6+2+5+6+2 = 52. Perfect.

    const add = (x: number, y: number) => path.push({ x, y });

    // 0-4: Red Straight
    for (let x = 1; x <= 5; x++) add(x, 6);
    // 5-10: Up
    for (let y = 5; y >= 0; y--) add(6, y);
    // 11-12: Top Turn
    add(7, 0); add(8, 0);
    // 13-17: Down
    for (let y = 1; y <= 5; y++) add(8, y);
    // 18-23: Right
    for (let x = 9; x <= 14; x++) add(x, 6);
    // 24-25: Right Turn
    add(14, 7); add(14, 8);
    // 26-30: Left
    for (let x = 13; x >= 9; x--) add(x, 8);
    // 31-36: Down
    for (let y = 9; y <= 14; y++) add(8, y);
    // 37-38: Bottom Turn
    add(7, 14); add(6, 14);
    // 39-43: Up
    for (let y = 13; y >= 9; y--) add(6, y);
    // 44-49: Left (x=5 to x=0, all at y=8)
    for (let x = 5; x >= 0; x--) add(x, 8);
    // Position 50: (0, 7) - turning point for Red
    add(0, 7);
    // Position 51: (0, 6) - skipped by Red, used by other colors
    add(0, 6);

    return path;
};

const STANDARD_PATH = generateStandardPath();

export const getHomeStretchCoordinates = (playerIndex: number, homePosition: number, playerCount: number) => {
    // homePosition: 0 = first square in lane (after start square), 1-4 = further in lane, 5 = at center home
    // For Red: 0 = (1, 7), 1 = (2, 7), 2 = (3, 7), 3 = (4, 7), 4 = (5, 7), 5 = center (7.5, 7.5)
    if (playerCount !== 4) return { x: 50, y: 50 };
    
    const cellSize = 100 / 15;
    const offset = cellSize / 2;
    
    // Home stretch lanes (first square is immediately after start square):
    // Red (0): x={1 to 6}, y=7 (left to right) - position 0 = (1, 7)
    // Green (1): x=7, y={1 to 6} (top to bottom) - position 0 = (7, 1)
    // Blue (2): x=7, y={9 to 14} (bottom to top) - position 0 = (7, 13)
    // Yellow (3): x={9 to 14}, y=7 (right to left) - position 0 = (13, 7)
    
    if (homePosition >= 5) {
        // At center home
        return { x: 50, y: 50 }; // Center of board (7.5 * cellSize = 50)
    }
    
    if (playerIndex === 0) { // Red - left to right
        return {
            x: (1 + homePosition) * cellSize + offset,
            y: 7 * cellSize + offset
        };
    } else if (playerIndex === 1) { // Green - top to bottom
        return {
            x: 7 * cellSize + offset,
            y: (1 + homePosition) * cellSize + offset
        };
    } else if (playerIndex === 2) { // Blue - bottom to top
        return {
            x: 7 * cellSize + offset,
            y: (13 - homePosition) * cellSize + offset
        };
    } else if (playerIndex === 3) { // Yellow - right to left
        return {
            x: (13 - homePosition) * cellSize + offset,
            y: 7 * cellSize + offset
        };
    }
    
    return { x: 50, y: 50 };
};

export const getCoordinates = (position: number, playerCount: number, status?: string, playerIndex?: number, homePosition?: number) => {
    // If token is in home stretch, use home stretch coordinates
    if (status === 'HOME_STRETCH' && playerIndex !== undefined && homePosition !== undefined) {
        return getHomeStretchCoordinates(playerIndex, homePosition, playerCount);
    }
    
    if (playerCount === 4) {
        // Map 15x15 grid to 0-100 viewbox
        // Grid size 15. Cell size = 100 / 15 = 6.66
        const cellSize = 100 / 15;
        const offset = cellSize / 2;

        const point = STANDARD_PATH[position % 52];
        if (point) {
            return {
                x: point.x * cellSize + offset,
                y: point.y * cellSize + offset
            };
        }
    }

    // Fallback for other player counts (Star shape)
    const length = getTrackLength(playerCount);
    const angle = (position / length) * 2 * Math.PI - Math.PI / 2;
    const r = 35;
    return {
        x: 50 + r * Math.cos(angle),
        y: 50 + r * Math.sin(angle)
    };
};

// Convert viewbox coordinates (0-100) back to board position
// Returns { position, status, homePosition } or null if not on a valid position
export const getPositionFromCoordinates = (
    x: number,
    y: number,
    playerCount: number,
    playerIndex?: number
): { position: number; status: 'BASE' | 'ACTIVE' | 'HOME_STRETCH' | 'FINISHED'; homePosition?: number } | null => {
    if (playerCount !== 4) return null;

    const cellSize = 100 / 15;
    const offset = cellSize / 2;
    const threshold = cellSize * 0.6; // Distance threshold for snapping

    // Convert viewbox coordinates to grid coordinates
    const gridX = (x - offset) / cellSize;
    const gridY = (y - offset) / cellSize;

    // Check if in center home (finished position)
    const centerX = 7.5;
    const centerY = 7.5;
    const distToCenter = Math.sqrt((gridX - centerX) ** 2 + (gridY - centerY) ** 2);
    if (distToCenter < 1.5 && playerIndex !== undefined) {
        return { position: 5, status: 'FINISHED', homePosition: 5 };
    }

    // Check home stretch lanes
    if (playerIndex !== undefined) {
        // Red (0): x={1 to 6}, y=7
        if (playerIndex === 0 && Math.abs(gridY - 7) < 0.5 && gridX >= 1 && gridX <= 6) {
            const homePos = Math.round(gridX - 1);
            if (homePos >= 0 && homePos < 5) {
                return { position: homePos, status: 'HOME_STRETCH', homePosition: homePos };
            }
        }
        // Green (1): x=7, y={1 to 6}
        if (playerIndex === 1 && Math.abs(gridX - 7) < 0.5 && gridY >= 1 && gridY <= 6) {
            const homePos = Math.round(gridY - 1);
            if (homePos >= 0 && homePos < 5) {
                return { position: homePos, status: 'HOME_STRETCH', homePosition: homePos };
            }
        }
        // Blue (2): x=7, y={9 to 14}
        if (playerIndex === 2 && Math.abs(gridX - 7) < 0.5 && gridY >= 9 && gridY <= 14) {
            const homePos = Math.round(13 - gridY);
            if (homePos >= 0 && homePos < 5) {
                return { position: homePos, status: 'HOME_STRETCH', homePosition: homePos };
            }
        }
        // Yellow (3): x={9 to 14}, y=7
        if (playerIndex === 3 && Math.abs(gridY - 7) < 0.5 && gridX >= 9 && gridX <= 14) {
            const homePos = Math.round(13 - gridX);
            if (homePos >= 0 && homePos < 5) {
                return { position: homePos, status: 'HOME_STRETCH', homePosition: homePos };
            }
        }
    }

    // Check base positions
    const basePositions = [
        { x: 2, y: 2, playerIdx: 0 }, { x: 4, y: 2, playerIdx: 0 },
        { x: 2, y: 4, playerIdx: 0 }, { x: 4, y: 4, playerIdx: 0 },
        { x: 11, y: 2, playerIdx: 1 }, { x: 13, y: 2, playerIdx: 1 },
        { x: 11, y: 4, playerIdx: 1 }, { x: 13, y: 4, playerIdx: 1 },
        { x: 2, y: 11, playerIdx: 2 }, { x: 4, y: 11, playerIdx: 2 },
        { x: 2, y: 13, playerIdx: 2 }, { x: 4, y: 13, playerIdx: 2 },
        { x: 11, y: 11, playerIdx: 3 }, { x: 13, y: 11, playerIdx: 3 },
        { x: 11, y: 13, playerIdx: 3 }, { x: 13, y: 13, playerIdx: 3 },
    ];

    for (const base of basePositions) {
        const dist = Math.sqrt((gridX - base.x) ** 2 + (gridY - base.y) ** 2);
        if (dist < 0.8 && (playerIndex === undefined || base.playerIdx === playerIndex)) {
            return { position: -1, status: 'BASE' };
        }
    }

    // Check main track positions - find closest
    let minDist = Infinity;
    let closestPosition = -1;

    for (let i = 0; i < STANDARD_PATH.length; i++) {
        const point = STANDARD_PATH[i]!;
        const pointX = point.x * cellSize + offset;
        const pointY = point.y * cellSize + offset;
        const dist = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);

        if (dist < minDist && dist < threshold) {
            minDist = dist;
            closestPosition = i;
        }
    }

    if (closestPosition >= 0) {
        return { position: closestPosition, status: 'ACTIVE' };
    }

    return null;
};
