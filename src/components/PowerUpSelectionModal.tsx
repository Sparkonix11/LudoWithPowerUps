'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { PowerUpType } from '../types/game';
import { cn } from '../lib/utils';

interface PowerUpSelectionModalProps {
    powerUpType: PowerUpType;
    powerUpIndex: number;
    playerId: string;
    onClose: () => void;
}

export const PowerUpSelectionModal = ({ 
    powerUpType, 
    powerUpIndex, 
    playerId,
    onClose 
}: PowerUpSelectionModalProps) => {
    const { 
        tokens, 
        players, 
        boardConfig, 
        activatePowerUp, 
        theme
    } = useGameStore();
    const isDark = theme === 'dark';

    const handleSelect = (targetTokenId?: string, targetPosition?: number, targetPlayerId?: string, targetDiceValue?: number) => {
        activatePowerUp(playerId, powerUpIndex, targetTokenId, targetPosition, targetPlayerId, targetDiceValue);
        onClose();
    };

    // Get player's tokens
    const playerTokens = Object.values(tokens).filter(t => t.playerId === playerId);
    const opponentTokens = Object.values(tokens).filter(t => t.playerId !== playerId);
    const opponentPlayers = players.filter(p => p.id !== playerId);

    // Render based on power-up type
    const renderSelection = () => {
        switch (powerUpType) {
            case 'TELEPORT': {
                // Show board positions to select
                const trackLength = boardConfig.playerCount === 4 ? 52 : 13 * boardConfig.playerCount;
                const positions = Array.from({ length: trackLength }, (_, i) => i);
                return (
                    <div>
                        <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-slate-600")}>
                            Select a token and target position:
                        </p>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {playerTokens
                                .filter(t => t.status === 'ACTIVE')
                                .map(token => (
                                    <div key={token.id} className="space-y-2">
                                        <p className={cn("text-xs font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>
                                            Token at position {token.position}
                                        </p>
                                        <div className="grid grid-cols-6 gap-2">
                                            {positions.slice(0, 20).map(pos => (
                                                <button
                                                    key={pos}
                                                    onClick={() => handleSelect(token.id, pos)}
                                                    className={cn(
                                                        "p-2 rounded text-xs border transition-all",
                                                        isDark
                                                            ? "bg-white/5 border-white/20 hover:bg-white/10"
                                                            : "bg-slate-100 border-slate-300 hover:bg-slate-200"
                                                    )}
                                                >
                                                    {pos}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            }
            case 'EXACT_MOVE': {
                return (
                    <div>
                        <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-slate-600")}>
                            Select a token and dice value:
                        </p>
                        <div className="space-y-3">
                            {playerTokens
                                .filter(t => t.status !== 'BASE' && t.status !== 'FINISHED')
                                .map(token => (
                                    <div key={token.id} className="space-y-2">
                                        <p className={cn("text-xs font-semibold", isDark ? "text-gray-300" : "text-slate-700")}>
                                            Token {token.id.split('_')[1]}
                                        </p>
                                        <div className="grid grid-cols-6 gap-2">
                                            {[1, 2, 3, 4, 5, 6].map(value => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleSelect(token.id, undefined, undefined, value)}
                                                    className={cn(
                                                        "p-3 rounded-lg font-bold border transition-all",
                                                        isDark
                                                            ? "bg-white/5 border-white/20 hover:bg-white/10"
                                                            : "bg-slate-100 border-slate-300 hover:bg-slate-200"
                                                    )}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            }
            case 'SEND_BACK':
            case 'FREEZE':
            case 'MAGNET': {
                return (
                    <div>
                        <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-slate-600")}>
                            Select an opponent&apos;s token:
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {opponentTokens
                                .filter(t => t.status === 'ACTIVE' || t.status === 'HOME_STRETCH')
                                .map(token => {
                                    const tokenPlayer = players.find(p => p.id === token.playerId);
                                    return (
                                        <button
                                            key={token.id}
                                            onClick={() => handleSelect(token.id)}
                                            className={cn(
                                                "w-full p-3 rounded-lg border transition-all text-left",
                                                isDark
                                                    ? "bg-white/5 border-white/20 hover:bg-white/10"
                                                    : "bg-slate-100 border-slate-300 hover:bg-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: tokenPlayer?.color }}
                                                />
                                                <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-800")}>
                                                    {tokenPlayer?.name}&apos;s Token
                                                </span>
                                                <span className={cn("text-xs ml-auto", isDark ? "text-gray-400" : "text-slate-600")}>
                                                    Pos: {token.position}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                );
            }
            case 'STEAL_POWERUP':
            case 'DICE_LOCK': {
                return (
                    <div>
                        <p className={cn("text-sm mb-4", isDark ? "text-gray-400" : "text-slate-600")}>
                            Select an opponent:
                        </p>
                        <div className="space-y-2">
                            {opponentPlayers.map(opponent => (
                                <button
                                    key={opponent.id}
                                    onClick={() => handleSelect(undefined, undefined, opponent.id)}
                                    className={cn(
                                        "w-full p-4 rounded-lg border transition-all text-left",
                                        isDark
                                            ? "bg-white/5 border-white/20 hover:bg-white/10"
                                            : "bg-slate-100 border-slate-300 hover:bg-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: opponent.color }}
                                        />
                                        <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-800")}>
                                            {opponent.name}
                                        </span>
                                        <span className={cn("text-xs ml-auto", isDark ? "text-gray-400" : "text-slate-600")}>
                                            {opponent.powerUps.length} power-ups
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }
            default:
                return <p className={cn("text-sm", isDark ? "text-gray-400" : "text-slate-600")}>No selection needed</p>;
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                        "relative p-6 rounded-xl shadow-2xl border-2 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto",
                        isDark ? "bg-neutral-900 border-white/20" : "bg-white border-slate-300"
                    )}
                >
                    <button
                        onClick={onClose}
                        className={cn(
                            "absolute top-4 right-4 p-1 rounded-full transition-colors",
                            isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-700"
                        )}
                    >
                        <X size={20} />
                    </button>

                    <h2 className={cn(
                        "text-2xl font-bold mb-2",
                        isDark ? "text-white" : "text-slate-800"
                    )}>
                        {powerUpType.replace(/_/g, ' ')}
                    </h2>

                    <p className={cn(
                        "text-sm mb-6",
                        isDark ? "text-gray-400" : "text-slate-600"
                    )}>
                        Select a target:
                    </p>

                    {renderSelection()}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

