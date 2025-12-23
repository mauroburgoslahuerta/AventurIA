import React from 'react';
import { motion } from 'framer-motion';
import { START_SCREEN_LOGO } from '../constants';
import { GameConfig, SoundType } from '../types';

interface StartScreenProps {
    setAppState: (state: any) => void;
    normalizedTopic: string;
    normalizedAudience: string;
    config: GameConfig;
    setTimer: (time: number) => void;
    playSfx: (type: SoundType) => void;
    // New Props for Auth Flow
    isSharedAdventure: boolean;
    user: any;
    setPlayerAlias: (alias: string) => void;
    initialAlias?: string; // New Prop
}

export const StartScreen: React.FC<StartScreenProps> = ({
    setAppState,
    normalizedTopic,
    normalizedAudience,
    config,
    setTimer,
    playSfx,

    // New Props for Auth Flow
    isSharedAdventure,
    user,
    setPlayerAlias,
    initialAlias
}) => {
    // Local state for the alias input - Prioritize User, then Initial (Previous), then Empty
    const [localAlias, setLocalAlias] = React.useState(user ? user.email.split('@')[0] : (initialAlias || ''));
    const [error, setError] = React.useState('');

    // Update alias when user logs in/out
    React.useEffect(() => {
        if (user && user.email) {
            setLocalAlias(user.email.split('@')[0]);
        }
    }, [user]);

    const handleStart = () => {
        playSfx('click');

        // Validation for Shared Adventures
        if (isSharedAdventure) {
            if (!localAlias.trim()) {
                setError('Introduce un nombre para guardar tu puntuación');
                return;
            }
        }

        // Set the global player alias
        if (setPlayerAlias) setPlayerAlias(localAlias.trim() || 'Invitado');

        setAppState('playing');
        setTimer(config.timerSeconds);
    };

    const pageVariants = {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
    };

    return (
        <motion.div key="start_screen" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="glass-card max-w-lg w-full p-6 md:p-12 text-center shadow-3xl border border-white/10 flex flex-col items-center relative">
            {!isSharedAdventure && (
                <button
                    onClick={() => setAppState('setup')}
                    className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                    title="Volver"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
            )}
            <img src={START_SCREEN_LOGO} className="h-24 mb-8" />
            <h1 className="text-xl md:text-3xl font-black mb-2 uppercase leading-tight max-w-lg break-words hyphens-auto text-cyan-50">{normalizedTopic}</h1>
            <p className="mb-8 text-xs text-white/40 italic">Para: <span className="text-white/80 font-bold">{normalizedAudience}</span></p>

            <div className="flex items-center justify-center gap-3 mb-8 w-full">
                {(() => {
                    const diff = config.difficulty || 'medium';
                    const diffColors = {
                        easy: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                        medium: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
                        hard: 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                    }[diff] || 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10';
                    return (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${diffColors} flex items-center gap-2`}>
                            <i className={`fa-solid ${diff === 'easy' ? 'fa-seedling' : diff === 'hard' ? 'fa-dragon' : 'fa-scale-balanced'}`}></i>
                            {diff === 'hard' ? 'DIFÍCIL' : diff === 'easy' ? 'FÁCIL' : 'MEDIO'}
                        </span>
                    );
                })()}
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60">
                    <i className="fa-solid fa-clock mr-2"></i>{config.timerSeconds > 0 ? config.timerSeconds + 's' : '∞'}
                </span>
            </div>

            {/* --- ALIAS INPUT (Only for Shared Adventures) --- */}
            {isSharedAdventure && !user && (
                <div className="w-full mb-6 relative">
                    {initialAlias && initialAlias === localAlias ? (
                        // Welcome Back View
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-2 animate-fade-in">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">¡Hola de nuevo!</p>
                            <h3 className="text-xl font-black text-white">{localAlias}</h3>
                            <button
                                onClick={() => setLocalAlias('')}
                                className="text-[9px] text-white/50 underline mt-2 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                Cambiar de usuario
                            </button>
                        </div>
                    ) : (
                        // Standard Input View
                        <>
                            <label className="block text-left text-[10px] font-black uppercase tracking-widest text-cyan-400/80 mb-2 pl-1">
                                Tu Nombre / Alias
                            </label>
                            <input
                                type="text"
                                value={localAlias}
                                onChange={(e) => { setLocalAlias(e.target.value); setError(''); }}
                                placeholder="Ej. Explorador123"
                                className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-all font-bold text-center"
                                autoFocus={!initialAlias}
                            />
                            {error && (
                                <p className="text-rose-400 text-[10px] font-bold mt-2 animate-pulse">
                                    <i className="fa-solid fa-circle-exclamation mr-1"></i> {error}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {isSharedAdventure && user && (
                <div className="w-full mb-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-cyan-300 text-xs font-bold">
                    <i className="fa-solid fa-user-check"></i>
                    <span>Jugando como: {user.email?.split('@')[0]}</span>
                </div>
            )}


            <button
                onClick={handleStart}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 ${isSharedAdventure && !localAlias.trim() && !user
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 hover:brightness-110'
                    }`}
            >
                {isSharedAdventure ? (initialAlias && initialAlias === localAlias ? 'REPETIR AVENTURA' : 'EMPEZAR AVENTURA') : 'INICIAR AHORA'}
            </button>

            {isSharedAdventure && !user && !initialAlias && (
                <p className="mt-4 text-[10px] text-white/30">
                    ¿Quieres guardar tus progresos? <span className="text-cyan-400 underline cursor-pointer hover:text-cyan-300">Inicia sesión</span>
                </p>
            )}
        </motion.div>
    );
};
