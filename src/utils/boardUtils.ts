const ARM_LENGTH = 6;

export const getTrackLength = (playerCount: number): number => {
    if (playerCount === 4) return 52;
    return 13 * playerCount;
};

export const getStartPosition = (playerIndex: number, playerCount: number): number => {
    if (playerCount === 4) {
        // Player indices: 0=Red, 1=Green, 2=Blue, 3=Yellow
        // Start positions: Red=0, Green=13, Blue=39, Yellow=26
        const startPositions = [0, 13, 39, 26];
        return startPositions[playerIndex] ?? playerIndex * 13;
    }
    return playerIndex * 13;
};

export const isSafeZone = (position: number, playerCount: number): boolean => {
    // Standard Ludo Safe Zones:
    // 1. Start positions (Red=0, Green=13, Blue=39, Yellow=26)
    // 2. Star positions (8, 21, 34, 47) - typically 8 steps from start?
    // Let's check the image.
    // Red Start is at index 0 (relative to Red).
    // Star is at index 8?
    // Let's define fixed safe indices for 4 players.
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
    if (isSafeZone(position, playerCount)) return false;
    // Place power-ups on non-safe spots
    // e.g., index 4, 17, 30, 43
    return position % 13 === 4;
};

export const getHomeStart = (playerIndex: number, playerCount: number): number => {
    const start = getStartPosition(playerIndex, playerCount);
    const length = getTrackLength(playerCount);
    return (start - 1 + length) % length;
};

// Standard Ludo Grid (15x15)
// Red: Top-Left (P0)
// Green: Top-Right (P1)
// Yellow: Bottom-Right (P2)
// Blue: Bottom-Left (P3)
// Note: Order in image is Red(TL) -> Green(TR) -> Yellow(BR) -> Blue(BL).
// Clockwise order of play usually: Red -> Green -> Yellow -> Blue.
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
    // 44-49: Left
    for (let x = 5; x >= 0; x--) add(x, 8);
    // 50-51: Left Turn
    add(0, 7); add(0, 6); // Note: 0,6 is index 51. Next is 1,6 (index 0).

    return path;
};

const STANDARD_PATH = generateStandardPath();

export const getCoordinates = (position: number, playerCount: number) => {
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
