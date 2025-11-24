'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Maximize, Minimize } from 'lucide-react';
import BoardCanvas from '../components/BoardCanvas';
import { Dice } from '../components/Dice';
import { PlayerCard } from '../components/PlayerCard';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

export default function Home() {
  const { initGame, diceRoll, setDiceRoll, currentPlayerIndex, players, phase, moveToken, tokens, activatePowerUp, theme, toggleTheme } = useGameStore();
  const [rolling, setRolling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    initGame(4);
  }, [initGame]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleRoll = async () => {
    if (phase !== 'ROLLING') return;
    setRolling(true);
    // Simulate roll time
    await new Promise(resolve => setTimeout(resolve, 600));
    setDiceRoll();
    setRolling(false);
  };

  const currentPlayer = players[currentPlayerIndex];

  // Split players for layout
  const leftPlayers = players.filter((_, i) => i === 0 || i === 2);
  const rightPlayers = players.filter((_, i) => i === 1 || i === 3);

  const isDark = theme === 'dark';

  return (
    <main className={cn(
      "h-screen w-full flex overflow-hidden relative font-sans transition-colors duration-300",
      isDark ? "bg-neutral-950 text-white" : "bg-slate-100 text-slate-900"
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
      />

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className={cn(
            "p-2 rounded-full shadow-lg transition-all",
            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-100"
          )}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 rounded-full shadow-lg transition-all",
            isDark ? "bg-white/10 text-yellow-400 hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-100"
          )}
          title="Toggle Theme"
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Left Panel */}
      <div className={cn(
        "w-80 p-6 flex flex-col justify-center gap-6 z-10 backdrop-blur-sm border-r transition-colors duration-300",
        isDark ? "bg-black/20 border-white/10" : "bg-white/50 border-slate-200"
      )}>
        <div className="mb-8">
          <h1 className={cn(
            "text-4xl font-black tracking-tighter transition-colors",
            isDark ? "text-white" : "text-slate-800"
          )}>
            LUDO<br />{isDark ? 'NEON' : 'CLASSIC'}
          </h1>
          <p className={cn(
            "text-sm font-medium tracking-widest mt-2 transition-colors",
            isDark ? "text-gray-400" : "text-slate-500"
          )}>MODULAR CHAOS</p>
        </div>

        <div className="flex flex-col gap-4">
          {leftPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isActive={players[currentPlayerIndex]?.id === p.id}
              onActivatePowerUp={(idx) => {
                const myToken = Object.values(tokens).find(t => t.playerId === p.id && t.status === 'ACTIVE');
                if (myToken) activatePowerUp(p.id, idx, myToken.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Center Board */}
      <div className={cn(
        "flex-1 flex items-center justify-center relative z-0 transition-colors duration-300",
        isDark ? "bg-neutral-900" : "bg-slate-50"
      )}>
        <div className="w-full max-w-[90vh] aspect-square p-4">
          <BoardCanvas />
        </div>

        {/* Floating Controls (Bottom Center) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
          <AnimatePresence mode="wait">
            {phase === 'MOVING' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "px-6 py-3 rounded-full border text-sm font-bold shadow-xl backdrop-blur-md",
                  isDark ? "bg-black/80 border-white/20 text-white" : "bg-white/90 border-slate-200 text-slate-700"
                )}
              >
                Select a token to move
              </motion.div>
            )}
            {phase === 'SKIPPING' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-red-500/90 px-6 py-3 rounded-full border border-red-400 text-sm font-bold text-white shadow-xl backdrop-blur-md"
              >
                No moves available. Skipping...
              </motion.div>
            )}
          </AnimatePresence>

          <Dice
            rolling={rolling}
            value={diceRoll}
            onRoll={handleRoll}
            disabled={phase !== 'ROLLING' || rolling}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className={cn(
        "w-80 p-6 flex flex-col justify-center gap-6 z-10 backdrop-blur-sm border-l transition-colors duration-300",
        isDark ? "bg-black/20 border-white/10" : "bg-white/50 border-slate-200"
      )}>
        <div className="flex flex-col gap-4">
          {rightPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isActive={players[currentPlayerIndex]?.id === p.id}
              onActivatePowerUp={(idx) => {
                const myToken = Object.values(tokens).find(t => t.playerId === p.id && t.status === 'ACTIVE');
                if (myToken) activatePowerUp(p.id, idx, myToken.id);
              }}
            />
          ))}
        </div>

        {/* Game Log / Status */}
        <div className={cn(
          "mt-auto p-4 rounded-xl border shadow-sm transition-colors",
          isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        )}>
          <h4 className={cn(
            "text-xs font-bold uppercase tracking-wider mb-2",
            isDark ? "text-gray-500" : "text-slate-400"
          )}>Game Status</h4>
          <p className={cn(
            "text-sm font-medium",
            isDark ? "text-gray-300" : "text-slate-600"
          )}>
            {phase === 'ROLLING' ? `Waiting for ${currentPlayer?.name} to roll...` :
              phase === 'MOVING' ? `${currentPlayer?.name} is moving...` :
                phase === 'SKIPPING' ? `Skipping ${currentPlayer?.name}...` :
                  'Game in progress'}
          </p>
        </div>
      </div>
    </main>
  );
}
