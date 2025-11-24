'use client';

import { motion } from 'framer-motion';
import { 
    Shield, RefreshCw, ArrowLeftRight, Zap, Navigation, 
    Move, Target, Rocket, ArrowDown, Send, Snowflake, 
    Hand, Magnet, Lock, Ghost, ShieldCheck, 
    RotateCw, Dice6, LockKeyhole, Shuffle, Home
} from 'lucide-react';
import type { Player } from '../types/game';
import { cn } from '../lib/utils';
import { useGameStore } from '../store/gameStore';

interface PlayerCardProps {
    player: Player;
    isActive: boolean;
    onActivatePowerUp: (index: number) => void;
}

export const PowerUpIcon = ({ type }: { type: string }) => {
    const iconProps = { size: 16 };
    switch (type) {
        case 'SHIELD': return <Shield {...iconProps} className="text-blue-400" />;
        case 'REVERSE': return <RefreshCw {...iconProps} className="text-yellow-400" />;
        case 'SWAP': return <ArrowLeftRight {...iconProps} className="text-purple-400" />;
        case 'TELEPORT': return <Navigation {...iconProps} className="text-cyan-400" />;
        case 'DOUBLE_MOVE': return <Move {...iconProps} className="text-green-400" />;
        case 'EXACT_MOVE': return <Target {...iconProps} className="text-orange-400" />;
        case 'WARP': return <Rocket {...iconProps} className="text-pink-400" />;
        case 'BACKWARDS_DASH': return <ArrowDown {...iconProps} className="text-red-400" />;
        case 'SEND_BACK': return <Send {...iconProps} className="text-red-500" />;
        case 'FREEZE': return <Snowflake {...iconProps} className="text-cyan-300" />;
        case 'STEAL_POWERUP': return <Hand {...iconProps} className="text-yellow-500" />;
        case 'MAGNET': return <Magnet {...iconProps} className="text-indigo-400" />;
        case 'IMMUNITY': return <Lock {...iconProps} className="text-emerald-400" />;
        case 'PHASE': return <Ghost {...iconProps} className="text-violet-400" />;
        case 'SAFE_PASSAGE': return <ShieldCheck {...iconProps} className="text-teal-400" />;
        case 'EXTRA_TURN': return <RotateCw {...iconProps} className="text-lime-400" />;
        case 'BONUS_ROLL': return <Dice6 {...iconProps} className="text-amber-400" />;
        case 'DICE_LOCK': return <LockKeyhole {...iconProps} className="text-rose-400" />;
        case 'SWAP_DICE': return <Shuffle {...iconProps} className="text-fuchsia-400" />;
        case 'HOME_STRETCH_TELEPORT': return <Home {...iconProps} className="text-green-500" />;
        default: return <Zap {...iconProps} className="text-gray-400" />;
    }
};

export const PlayerCard = ({ player, isActive, onActivatePowerUp }: PlayerCardProps) => {
    const powerUpUsedThisTurn = useGameStore(state => state.powerUpUsedThisTurn);
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
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Inventory</p>
                    <span className="text-xs text-gray-500">
                        {player.powerUps.length}/3
                    </span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {player.powerUps.length === 0 ? (
                        <span className="text-xs text-gray-600 italic">Empty</span>
                    ) : (
                        player.powerUps.map((p, idx) => {
                            const canUse = isActive && !powerUpUsedThisTurn;
                            return (
                                <motion.button
                                    key={idx}
                                    whileHover={canUse ? { scale: 1.1 } : {}}
                                    whileTap={canUse ? { scale: 0.9 } : {}}
                                    onClick={() => canUse && onActivatePowerUp(idx)}
                                    disabled={!canUse}
                                    className={cn(
                                        "p-2 rounded-lg border flex items-center gap-2 transition-all",
                                        canUse
                                            ? "bg-black/40 hover:bg-black/60 border-white/10"
                                            : "bg-black/20 border-white/5 opacity-50 cursor-not-allowed"
                                    )}
                                    title={p.type.replace(/_/g, ' ')}
                                >
                                    <PowerUpIcon type={p.type} />
                                </motion.button>
                            );
                        })
                    )}
                </div>
            </div>
        </motion.div>
    );
};
