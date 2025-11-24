'use client';

import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { cn } from '../lib/utils';

interface DiceProps {
    rolling: boolean;
    value: number | null;
    onRoll: () => void;
    disabled?: boolean;
    color?: string;
}

export const Dice = ({ rolling, value, onRoll, disabled, color: _color = '#fff' }: DiceProps) => {
    return (
        <div className="flex flex-col items-center gap-4">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRoll}
                disabled={disabled}
                className={cn(
                    "relative w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                    disabled ? "opacity-50 cursor-not-allowed bg-gray-800" : "bg-gradient-to-br from-indigo-600 to-purple-700 cursor-pointer hover:shadow-indigo-500/50"
                )}
            >
                <motion.div
                    animate={rolling ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.5, repeat: rolling ? Infinity : 0, ease: "linear" }}
                >
                    {value === null || rolling ? (
                        <Dices size={48} className="text-white" />
                    ) : (
                        <span className="text-5xl font-bold text-white">{value}</span>
                    )}
                </motion.div>
            </motion.button>
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                {rolling ? 'Rolling...' : 'Roll Dice'}
            </span>
        </div>
    );
};
