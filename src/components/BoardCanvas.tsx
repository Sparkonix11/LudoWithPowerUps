'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getCoordinates, getPositionFromCoordinates } from '../utils/boardUtils';

interface BoardCanvasProps {
    debugMode?: boolean;
}

const BoardCanvas = ({ debugMode = false }: BoardCanvasProps) => {
    const { boardConfig, tokens, players, moveToken, phase, setTokenPosition, powerUpsOnBoard } = useGameStore();
    const [mounted, setMounted] = useState(false);
    const [draggingToken, setDraggingToken] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Convert mouse coordinates to SVG viewBox coordinates
    const getSVGCoordinates = (e: React.MouseEvent<SVGElement> | MouseEvent): { x: number; y: number } | null => {
        if (!svgRef.current) return null;
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        
        const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
        const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;
        
        return { x, y };
    };

    const handleDragStart = (e: React.MouseEvent<SVGElement>, tokenId: string) => {
        if (!debugMode) return;
        e.preventDefault();
        setDraggingToken(tokenId);
        const coords = getSVGCoordinates(e);
        if (coords) {
            setDragPosition(coords);
        }
    };

    const handleDrag = useCallback((e: React.MouseEvent<SVGElement> | MouseEvent) => {
        if (!debugMode || !draggingToken) return;
        const coords = getSVGCoordinates(e);
        if (coords) {
            setDragPosition(coords);
        }
    }, [debugMode, draggingToken]);

    const handleDragEnd = useCallback((e: React.MouseEvent<SVGElement> | MouseEvent) => {
        if (!debugMode || !draggingToken) return;
        
        const coords = getSVGCoordinates(e);
        if (coords && draggingToken) {
            const token = tokens[draggingToken];
            if (token) {
                const playerIndex = players.findIndex(p => p.id === token.playerId);
                const positionData = getPositionFromCoordinates(
                    coords.x,
                    coords.y,
                    boardConfig.playerCount,
                    playerIndex
                );
                
                if (positionData) {
                    setTokenPosition(
                        draggingToken,
                        positionData.position,
                        positionData.status,
                        positionData.homePosition
                    );
                }
            }
        }
        
        setDraggingToken(null);
        setDragPosition(null);
    }, [debugMode, draggingToken, tokens, players, boardConfig.playerCount, setTokenPosition]);

    useEffect(() => {
        if (!debugMode || !draggingToken) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleDrag(e);
        };

        const handleMouseUp = (e: MouseEvent) => {
            handleDragEnd(e);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [debugMode, draggingToken, handleDrag, handleDragEnd]);

    if (!mounted) return null;

    // Grid constants
    const CELL_SIZE = 100 / 15;

    // Standard Ludo Colors (Always Light/Classic for the board itself)
    const COLORS = {
        RED: '#ED1C24',
        GREEN: '#00A651',
        YELLOW: '#FFF200',
        BLUE: '#00AEEF',
        WHITE: '#FFFFFF',
        GRID: '#000000',
        SHADOW: 'rgba(0,0,0,0.3)',
        TEXT: '#FFFFFF'
    };

    const renderGridBackground = () => {
        if (boardConfig.playerCount !== 4) return null;

        return (
            <g>
                {/* Main Board Background */}
                <rect x="0" y="0" width="100" height="100" fill={COLORS.WHITE} stroke={COLORS.GRID} strokeWidth="0.5" />

                {/* --- BASES --- */}
                {/* Red Base (Top Left) */}
                <rect x="0" y="0" width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={COLORS.RED} stroke={COLORS.GRID} strokeWidth="0.2" />
                <rect x={1 * CELL_SIZE} y={1 * CELL_SIZE} width={4 * CELL_SIZE} height={4 * CELL_SIZE} fill={COLORS.WHITE} stroke={COLORS.GRID} strokeWidth="0.2" />
                {/* Green Base (Top Right) */}
                <rect x={9 * CELL_SIZE} y="0" width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={COLORS.GREEN} stroke={COLORS.GRID} strokeWidth="0.2" />
                <rect x={10 * CELL_SIZE} y={1 * CELL_SIZE} width={4 * CELL_SIZE} height={4 * CELL_SIZE} fill={COLORS.WHITE} stroke={COLORS.GRID} strokeWidth="0.2" />
                {/* Blue Base (Bottom Left) */}
                <rect x="0" y={9 * CELL_SIZE} width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={COLORS.BLUE} stroke={COLORS.GRID} strokeWidth="0.2" />
                <rect x={1 * CELL_SIZE} y={10 * CELL_SIZE} width={4 * CELL_SIZE} height={4 * CELL_SIZE} fill={COLORS.WHITE} stroke={COLORS.GRID} strokeWidth="0.2" />
                {/* Yellow Base (Bottom Right) */}
                <rect x={9 * CELL_SIZE} y={9 * CELL_SIZE} width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={COLORS.YELLOW} stroke={COLORS.GRID} strokeWidth="0.2" />
                <rect x={10 * CELL_SIZE} y={10 * CELL_SIZE} width={4 * CELL_SIZE} height={4 * CELL_SIZE} fill={COLORS.WHITE} stroke={COLORS.GRID} strokeWidth="0.2" />

                {/* Base Token Spots (Circles) */}
                {[
                    { cx: 2, cy: 2, color: COLORS.RED }, { cx: 4, cy: 2, color: COLORS.RED },
                    { cx: 2, cy: 4, color: COLORS.RED }, { cx: 4, cy: 4, color: COLORS.RED },
                    { cx: 11, cy: 2, color: COLORS.GREEN }, { cx: 13, cy: 2, color: COLORS.GREEN },
                    { cx: 11, cy: 4, color: COLORS.GREEN }, { cx: 13, cy: 4, color: COLORS.GREEN },
                    { cx: 2, cy: 11, color: COLORS.BLUE }, { cx: 4, cy: 11, color: COLORS.BLUE },
                    { cx: 2, cy: 13, color: COLORS.BLUE }, { cx: 4, cy: 13, color: COLORS.BLUE },
                    { cx: 11, cy: 11, color: COLORS.YELLOW }, { cx: 13, cy: 11, color: COLORS.YELLOW },
                    { cx: 11, cy: 13, color: COLORS.YELLOW }, { cx: 13, cy: 13, color: COLORS.YELLOW },
                ].map((spot, i) => (
                    <circle
                        key={`base-spot-${i}`}
                        cx={spot.cx * CELL_SIZE}
                        cy={spot.cy * CELL_SIZE}
                        r={0.8 * CELL_SIZE}
                        fill={spot.color}
                        stroke={COLORS.GRID}
                        strokeWidth="0.1"
                    />
                ))}

                {/* --- CENTER HOME --- */}
                <polygon points={`${6 * CELL_SIZE},${6 * CELL_SIZE} ${9 * CELL_SIZE},${6 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`} fill={COLORS.GREEN} stroke={COLORS.GRID} strokeWidth="0.1" />
                <polygon points={`${9 * CELL_SIZE},${6 * CELL_SIZE} ${9 * CELL_SIZE},${9 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`} fill={COLORS.YELLOW} stroke={COLORS.GRID} strokeWidth="0.1" />
                <polygon points={`${9 * CELL_SIZE},${9 * CELL_SIZE} ${6 * CELL_SIZE},${9 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`} fill={COLORS.BLUE} stroke={COLORS.GRID} strokeWidth="0.1" />
                <polygon points={`${6 * CELL_SIZE},${9 * CELL_SIZE} ${6 * CELL_SIZE},${6 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`} fill={COLORS.RED} stroke={COLORS.GRID} strokeWidth="0.1" />

                {/* --- TRACK GRID --- */}
                {/* Vertical Lines */}
                {[6, 7, 8, 9].map(i => (
                    <line key={`v${i}`} x1={i * CELL_SIZE} y1="0" x2={i * CELL_SIZE} y2="100" stroke={COLORS.GRID} strokeWidth="0.1" />
                ))}
                {/* Horizontal Lines */}
                {[6, 7, 8, 9].map(i => (
                    <line key={`h${i}`} x1="0" y1={i * CELL_SIZE} x2="100" y2={i * CELL_SIZE} stroke={COLORS.GRID} strokeWidth="0.1" />
                ))}
                {/* Cross Lines for individual cells */}
                {/* Top Arm (6-9 x 0-6) */}
                {[1, 2, 3, 4, 5].map(i => <line key={`ht${i}`} x1={6 * CELL_SIZE} y1={i * CELL_SIZE} x2={9 * CELL_SIZE} y2={i * CELL_SIZE} stroke={COLORS.GRID} strokeWidth="0.1" />)}
                {/* Bottom Arm (6-9 x 9-15) */}
                {[10, 11, 12, 13, 14].map(i => <line key={`hb${i}`} x1={6 * CELL_SIZE} y1={i * CELL_SIZE} x2={9 * CELL_SIZE} y2={i * CELL_SIZE} stroke={COLORS.GRID} strokeWidth="0.1" />)}
                {/* Left Arm (0-6 x 6-9) */}
                {[1, 2, 3, 4, 5].map(i => <line key={`vl${i}`} x1={i * CELL_SIZE} y1={6 * CELL_SIZE} x2={i * CELL_SIZE} y2={9 * CELL_SIZE} stroke={COLORS.GRID} strokeWidth="0.1" />)}
                {/* Right Arm (9-15 x 6-9) */}
                {[10, 11, 12, 13, 14].map(i => <line key={`vr${i}`} x1={i * CELL_SIZE} y1={6 * CELL_SIZE} x2={i * CELL_SIZE} y2={9 * CELL_SIZE} stroke={COLORS.GRID} strokeWidth="0.1" />)}

                {/* --- HOME RUNS (Colored Tracks) --- */}
                {/* Red Home Run (Left to Right) */}
                <rect x={1 * CELL_SIZE} y={7 * CELL_SIZE} width={5 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.RED} opacity="1" />
                {/* Green Home Run (Top to Bottom) */}
                <rect x={7 * CELL_SIZE} y={1 * CELL_SIZE} width={1 * CELL_SIZE} height={5 * CELL_SIZE} fill={COLORS.GREEN} opacity="1" />
                {/* Yellow Home Run (Right to Left) */}
                <rect x={9 * CELL_SIZE} y={7 * CELL_SIZE} width={5 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.YELLOW} opacity="1" />
                {/* Blue Home Run (Bottom to Top) */}
                <rect x={7 * CELL_SIZE} y={9 * CELL_SIZE} width={1 * CELL_SIZE} height={5 * CELL_SIZE} fill={COLORS.BLUE} opacity="1" />

                {/* --- START SQUARES (Colored) --- */}
                <rect x={1 * CELL_SIZE} y={6 * CELL_SIZE} width={1 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.RED} />
                <rect x={8 * CELL_SIZE} y={1 * CELL_SIZE} width={1 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.GREEN} />
                <rect x={13 * CELL_SIZE} y={8 * CELL_SIZE} width={1 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.YELLOW} />
                <rect x={6 * CELL_SIZE} y={13 * CELL_SIZE} width={1 * CELL_SIZE} height={1 * CELL_SIZE} fill={COLORS.BLUE} />

                {/* --- ARROWS --- */}
                {/* Red Arrow (Left) */}
                <text x={0.5 * CELL_SIZE} y={7.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="middle" fill={COLORS.RED}>→</text>
                {/* Green Arrow (Top) */}
                <text x={7.5 * CELL_SIZE} y={0.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="middle" fill={COLORS.GREEN}>↓</text>
                {/* Yellow Arrow (Right) */}
                <text x={14.5 * CELL_SIZE} y={7.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="middle" fill={COLORS.YELLOW}>←</text>
                {/* Blue Arrow (Bottom) */}
                <text x={7.5 * CELL_SIZE} y={14.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="middle" fill={COLORS.BLUE}>↑</text>

                {/* --- STARS (Safe Zones) --- */}
                {[
                    { x: 6.5, y: 2.5 }, // Top Left Safe
                    { x: 12.5, y: 6.5 }, // Top Right Safe
                    { x: 8.5, y: 12.5 }, // Bottom Right Safe
                    { x: 2.5, y: 8.5 }, // Bottom Left Safe
                ].map((pos, i) => (
                    <text key={`star-${i}`} x={pos.x * CELL_SIZE} y={pos.y * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="central" fill="#888">★</text>
                ))}

                {/* White Stars on Colored Start Squares */}
                <text x={1.5 * CELL_SIZE} y={6.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="central" fill="white">★</text>
                <text x={8.5 * CELL_SIZE} y={1.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="central" fill="white">★</text>
                <text x={13.5 * CELL_SIZE} y={8.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="central" fill="white">★</text>
                <text x={6.5 * CELL_SIZE} y={13.5 * CELL_SIZE} fontSize="4" textAnchor="middle" dominantBaseline="central" fill="white">★</text>

            </g>
        );
    };

    return (
        <div className="relative flex items-center justify-center w-full h-full p-4 bg-white rounded-xl shadow-2xl border-4 border-gray-800">
            <svg 
                ref={svgRef}
                viewBox="0 0 100 100" 
                className="w-full h-full max-w-[80vh] max-h-[80vh]"
                onMouseMove={debugMode ? handleDrag : undefined}
                onMouseUp={debugMode ? handleDragEnd : undefined}
            >
                {renderGridBackground()}

                {/* Render Power-ups on Board */}
                {Object.entries(powerUpsOnBoard).map(([positionStr, powerUp]) => {
                    const position = parseInt(positionStr);
                    const coords = getCoordinates(position, boardConfig.playerCount);
                    return (
                        <motion.g
                            key={powerUp.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="cursor-pointer"
                        >
                            {/* Power-up glow effect */}
                            <circle
                                cx={coords.x}
                                cy={coords.y}
                                r="3"
                                fill="rgba(255, 215, 0, 0.3)"
                                className="animate-pulse"
                            />
                            {/* Power-up background */}
                            <circle
                                cx={coords.x}
                                cy={coords.y}
                                r="2.5"
                                fill="rgba(255, 255, 255, 0.9)"
                                stroke="rgba(255, 215, 0, 0.8)"
                                strokeWidth="0.3"
                            />
                            {/* Power-up icon placeholder - would need SVG conversion */}
                            <text
                                x={coords.x}
                                y={coords.y}
                                fontSize="2"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#FFD700"
                                fontWeight="bold"
                            >
                                ⚡
                            </text>
                        </motion.g>
                    );
                })}

                {/* Render Tokens */}
                {Object.values(tokens).map((token) => {
                    let cx, cy;

                    // If dragging this token, use drag position
                    if (draggingToken === token.id && dragPosition) {
                        cx = dragPosition.x;
                        cy = dragPosition.y;
                    } else if (token.status === 'BASE') {
                        const pIdx = players.findIndex(p => p.id === token.playerId);
                        // Base positions mapping
                        let baseX = 0, baseY = 0;

                        if (pIdx === 0) { baseX = 2; baseY = 2; } // Red
                        else if (pIdx === 1) { baseX = 11; baseY = 2; } // Green
                        else if (pIdx === 2) { baseX = 2; baseY = 11; } // Blue
                        else if (pIdx === 3) { baseX = 11; baseY = 11; } // Yellow

                        const tokenIdx = parseInt(token.id.split('_t')[1] ?? '0');
                        const dx = (tokenIdx % 2) * 2;
                        const dy = Math.floor(tokenIdx / 2) * 2;

                        cx = (baseX + dx) * CELL_SIZE;
                        cy = (baseY + dy) * CELL_SIZE;
                    } else if (token.status === 'HOME_STRETCH' || token.status === 'FINISHED') {
                        const pIdx = players.findIndex(p => p.id === token.playerId);
                        const homePos = token.status === 'FINISHED' ? 5 : token.position;
                        const coords = getCoordinates(0, boardConfig.playerCount, 'HOME_STRETCH', pIdx, homePos);
                        cx = coords.x;
                        cy = coords.y;
                    } else {
                        const coords = getCoordinates(token.position, boardConfig.playerCount);
                        cx = coords.x;
                        cy = coords.y;
                    }

                    const player = players.find((p) => p.id === token.playerId);
                    const isDragging = draggingToken === token.id;

                    return (
                        <motion.g
                            key={token.id}
                            initial={{ cx, cy }}
                            animate={{ cx, cy }}
                            transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                            onClick={() => !debugMode && phase === 'MOVING' && moveToken(token.id)}
                            onMouseDown={(e) => debugMode && handleDragStart(e, token.id)}
                            className={debugMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                            whileHover={!isDragging ? { scale: 1.2 } : {}}
                            style={{ opacity: isDragging ? 0.8 : 1 }}
                        >
                            {/* Token Shadow */}
                            <circle cx={cx + 0.5} cy={cy + 0.5} r="2.5" fill={COLORS.SHADOW} />

                            {/* Token Body (Pin Style) */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r="2.5"
                                fill={player?.color ?? '#fff'}
                                stroke="#fff"
                                strokeWidth="0.5"
                            />
                            {/* Inner Detail */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r="1.5"
                                fill="none"
                                stroke="rgba(0,0,0,0.2)"
                                strokeWidth="0.2"
                            />

                            {/* Status Indicators */}
                            {token.isInvulnerable && (
                                <circle cx={cx} cy={cy} r="3" fill="none" stroke="#00FFFF" strokeWidth="0.5" strokeDasharray="1,1" />
                            )}
                            {token.isReversed && (
                                <text
                                    x={cx}
                                    y={cy}
                                    fontSize="2"
                                    textAnchor="middle"
                                    dy="0.7"
                                    fill="white"
                                    fontWeight="bold"
                                    style={{ textShadow: '0px 0px 2px black' }}
                                >
                                    R
                                </text>
                            )}
                        </motion.g>
                    );
                })}
            </svg>
        </div>
    );
};

export default BoardCanvas;
