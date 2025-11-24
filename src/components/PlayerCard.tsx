'use client';

import { motion } from 'framer-motion';
import { Shield, RefreshCw, ArrowLeftRight, Zap } from 'lucide-react';
import { Player, PowerUp } from '../types/game';
import { cn } from '../lib/utils';

interface PlayerCardProps {
    player: Player;
    isActive: boolean;
    onActivatePowerUp: (index: number) => void;
}

const PowerUpIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'SHIELD': return <Shield size={16} className="text-blue-400" />;
        case 'REVERSE': return <RefreshCw size={16} className="text-yellow-400" />;
        case 'SWAP': return <ArrowLeftRight size={16} className="text-purple-400" />;
        default: return <Zap size={16} />;
    }
};

export const PlayerCard = ({ player, isActive, onActivatePowerUp }: PlayerCardProps) => {
    return (
        <motion.div
            animate={{
                scale: isActive ? 1.05 : 1,
                opacity: isActive ? 1 : 0.7,
                borderColor: isActive ? player.color : 'transparent'
            }}
            className={cn(
                "relative p-4 rounded-xl border-2 backdrop-blur-md transition-all",
                isActive ? "bg-white/10 shadow-lg" : "bg-white/5"
            )}
            style={{ borderColor: isActive ? player.color : 'rgba(255,255,255,0.1)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]"
                        style={{ backgroundColor: player.color, color: player.color }}
                    />
                    <h3 className="font-bold text-white">{player.name}</h3>
                </div>
                {isActive && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-white/20 text-white animate-pulse">
                        YOUR TURN
                    </span>
                )}
            </div>

            {/* Power Ups Inventory */}
            <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Inventory</p>
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {player.powerUps.length === 0 ? (
                        <span className="text-xs text-gray-600 italic">Empty</span>
                    ) : (
                        player.powerUps.map((p, idx) => (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => isActive && onActivatePowerUp(idx)}
                                disabled={!isActive}
                                className="p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 flex items-center gap-2"
                                title={p.type}
                            >
                                <PowerUpIcon type={p.type} />
                            </motion.button>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
};
