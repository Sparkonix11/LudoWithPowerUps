'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../types/game';
import { PowerUpIcon } from './PlayerCard';
import { cn } from '../lib/utils';

interface PowerUpDiscardModalProps {
    player: Player;
    onClose: () => void;
}

export const PowerUpDiscardModal = ({ player, onClose }: PowerUpDiscardModalProps) => {
    const { discardPowerUp, theme } = useGameStore();
    const isDark = theme === 'dark';

    const handleDiscard = (index: number) => {
        discardPowerUp(player.id, index);
        onClose();
    };

    if (player.powerUps.length === 0) {
        onClose();
        return null;
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                        "relative p-6 rounded-xl shadow-2xl border-2 max-w-md w-full mx-4",
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
                        "text-2xl font-bold mb-4",
                        isDark ? "text-white" : "text-slate-800"
                    )}>
                        Inventory Full!
                    </h2>

                    <p className={cn(
                        "text-sm mb-6",
                        isDark ? "text-gray-400" : "text-slate-600"
                    )}>
                        You have 3 power-ups. Discard one to collect the new power-up:
                    </p>

                    <div className="space-y-3">
                        {player.powerUps.map((powerUp, index) => (
                            <motion.button
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleDiscard(index)}
                                className={cn(
                                    "w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4",
                                    isDark 
                                        ? "bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10"
                                        : "bg-slate-50 border-slate-200 hover:border-slate-400 hover:bg-slate-100"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-lg",
                                    isDark ? "bg-white/10" : "bg-slate-200"
                                )}>
                                    <PowerUpIcon type={powerUp.type} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className={cn(
                                        "font-semibold",
                                        isDark ? "text-white" : "text-slate-800"
                                    )}>
                                        {powerUp.type.replace(/_/g, ' ')}
                                    </p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

