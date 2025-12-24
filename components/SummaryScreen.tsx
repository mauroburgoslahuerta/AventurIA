import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { getRank } from '../utils';
import { SoundType } from '../types';

interface Session {
    id: string;
    player_alias: string;
    score: number;
    played_at: string;
}

interface SummaryScreenProps {
    handleGoHome: () => void;
    normalizedTopic: string;
    streak: number;
    correctCount: number;
    questionCount: number;
    score: number;
    playSfx: (type: SoundType) => void;
    resetGameState: () => void;
    setAppState: (state: any) => void;
    showShareMenu: boolean;
    setShowShareMenu: (show: boolean) => void;
    handlePublishLink: () => void;
    handleShare: (type: string) => void;


    showPromotionalButton?: boolean;
    isCreatorMode?: boolean;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
    handleGoHome,
    normalizedTopic,
    streak,
    correctCount,
    questionCount,
    score,
    playSfx,
    resetGameState,
    setAppState,
    showShareMenu,
    setShowShareMenu,
    handlePublishLink,
    handleShare,
    isSharing,

    showPromotionalButton = false,
    isCreatorMode = true // Default to true (Creator) if not specified, or false? Logic: Default to showing Home if unsure, or hide? "Inicio" is for Setup. Default is usually Creator context in dev.
}) => {
    const pageVariants = {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
    };

    const [leaderboard, setLeaderboard] = useState<Session[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: 'score' | 'first_score', direction: 'desc' | 'asc' }>({ key: 'score', direction: 'desc' });

    const handleSort = (key: 'score' | 'first_score') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        const valA = a[sortConfig.key] ?? -1;
        const valB = b[sortConfig.key] ?? -1;

        // Handle undefined first_score by treating it as -1
        const safeA = valA === undefined ? -1 : valA;
        const safeB = valB === undefined ? -1 : valB;

        return sortConfig.direction === 'asc' ? safeA - safeB : safeB - safeA;
    });

    useEffect(() => {
        const fetchLeaderboard = async () => {
            // 1. Get Adventure ID from URL
            const params = new URLSearchParams(window.location.search);
            const adventureId = params.get('id');

            if (!adventureId) {
                setLoadingLeaderboard(false);
                return;
            }

            // Fetch top 50 sessions ordered by score (best)
            const { data, error } = await supabase
                .from('game_sessions')
                .select('id, player_alias, score, first_score, played_at')
                .eq('adventure_id', adventureId)
                .order('score', { ascending: false })
                .limit(50);

            if (data && !error) {
                setLeaderboard(data);
            }
            setLoadingLeaderboard(false);
        };

        fetchLeaderboard();
    }, []);

    return (
        <motion.div
            key="summary"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-7xl h-full flex flex-col py-4 z-10 overflow-hidden"
        >
            {/* Header (Simplified for Summary - No Timer) */}
            <div className="flex justify-between items-center mb-6 bg-white/[0.03] backdrop-blur-3xl p-5 rounded-3xl border border-white/10 shrink-0 relative">
                <div className="flex items-center z-10">
                    {isCreatorMode && <button onClick={handleGoHome} className="flex items-center gap-3 bg-white/5 hover:bg-white hover:text-slate-900 px-6 py-2 rounded-2xl transition-all border border-white/10 font-black text-[10px] uppercase tracking-widest"><i className="fa-solid fa-house"></i> Inicio</button>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs md:text-sm font-black uppercase text-cyan-400 tracking-widest bg-[#0f172a]/80 px-4 py-1 rounded-full backdrop-blur-md border border-white/5 shadow-xl">{normalizedTopic}</span>
                </div>

                <div className="flex items-center gap-4 z-10">
                    <div className={`bg-orange-500/10 border border-orange-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 transition-opacity duration-300 ${streak >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                        <i className={`fa-solid fa-fire text-orange-500 ${streak >= 3 ? 'animate-bounce' : ''}`}></i>
                        <span className="font-black text-xs text-orange-500">{streak}</span>
                    </div>

                    <div className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-3 rounded-2xl font-black text-cyan-400 text-xs tracking-widest">{correctCount}/{questionCount}</div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6"> {/* Enable Scrolling */}
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start justify-center">

                    {/* LEFT COLUMN: RESULT CARD (Main Focus - 2/3) */}
                    <div className="w-full md:w-2/3 glass-card p-8 text-center border border-white/10 flex flex-col items-center">
                        <span className="text-[10px] font-black tracking-[0.4em] uppercase mb-6 text-cyan-500">Misión Completada</span>
                        <span className="text-8xl font-black mb-6">{score}/{questionCount}</span>
                        {(() => {
                            const r = getRank(score, questionCount);
                            return (
                                <div className="mb-8 flex flex-col items-center animate-fade-in">
                                    <div className={`px-6 py-2 rounded-full border bg-white/5 border-white/10 mb-4`}>
                                        <span className={`font-black uppercase tracking-widest text-sm ${r.color}`}>{r.rank}</span>
                                    </div>
                                    <p className="text-white/60 text-sm italic max-w-xs">{r.message}</p>
                                </div>
                            )
                        })()}
                        <div className="flex flex-col gap-3 w-full max-w-sm"> {/* Restricted width for buttons */}
                            <button onClick={() => { playSfx('click'); resetGameState(); setAppState('start_screen'); }} className="w-full bg-cyan-500 text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">Repetir Reto</button>
                            <button onClick={() => { playSfx('click'); handleGoHome(); }} className="w-full bg-white/5 text-white/60 hover:text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 relative flex items-center justify-center">
                                <i className="fa-solid fa-house absolute left-6"></i> Menú Principal
                            </button>
                            <div className="relative w-full">
                                <button onClick={() => { playSfx('click'); setShowShareMenu(!showShareMenu); }} className="w-full bg-white/5 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 relative flex items-center justify-center">
                                    <i className="fa-solid fa-share-nodes absolute left-6"></i> Compartir / Descargar
                                </button>
                                {showShareMenu && (
                                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-3xl animate-fade-in z-50 flex flex-col">
                                        <button onClick={() => handleShare('link')} className="p-4 hover:bg-white/5 flex items-center gap-3 text-left transition-colors border-b border-white/5 group bg-cyan-500/5 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSharing}>
                                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                                                {isSharing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-globe"></i>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-xs uppercase tracking-wider text-cyan-400">{isSharing ? 'Generando...' : 'Generar Enlace'}</div>
                                                <div className="text-[10px] text-white/40">Crear URL para RRSS / WhatsApp (Recomendado)</div>
                                            </div>
                                        </button>
                                        <button onClick={() => handleShare('download')} className="p-4 hover:bg-white/5 flex items-center gap-3 text-left transition-colors border-b border-white/5 group disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSharing}>
                                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                                                {isSharing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-xs uppercase tracking-wider text-cyan-400">Descargar HTML</div>
                                                <div className="text-[10px] text-white/40">Guardar archivo en este dispositivo</div>
                                            </div>
                                        </button>
                                        <button onClick={() => handleShare('whatsapp')} className="p-4 hover:bg-white/5 flex items-center gap-3 text-left transition-colors border-b border-white/5 group disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSharing}>
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-all">
                                                {isSharing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-brands fa-whatsapp"></i>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-xs uppercase tracking-wider text-emerald-400">WhatsApp</div>
                                                <div className="text-[10px] text-white/40">Compartir enlace al reto</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {showPromotionalButton && (
                            <button onClick={() => window.open('https://aventuria.vercel.app/', '_blank')} className="w-full max-w-sm mt-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-3 border border-white/10">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                <span className="text-xs">Crea tu propia aventura</span>
                            </button>
                        )}
                    </div>

                    {/* RIGHT COLUMN: LEADERBOARD (Narrower - 1/3) */}
                    <div className="w-full md:w-1/3 glass-card border border-white/10 flex flex-col overflow-hidden h-[500px]">
                        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-amber-400"></i> Tabla de Clasificación
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingLeaderboard ? (
                                <div className="h-full flex items-center justify-center text-white/30 text-xs uppercase tracking-widest animate-pulse">
                                    Cargando Ranking...
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 gap-3">
                                    <i className="fa-solid fa-ghost text-3xl opacity-50"></i>
                                    <span className="text-xs uppercase tracking-widest">Sin registros aún</span>
                                </div>
                            ) : (
                                <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <div className="overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="text-[10px] uppercase font-black text-white/40 sticky top-0 bg-[#0f172a] z-10">
                                                <tr>
                                                    <th className="pb-2">Jugador</th>
                                                    <th
                                                        className="pb-2 text-center cursor-pointer hover:text-cyan-400 transition-colors select-none"
                                                        onClick={() => handleSort('score')}
                                                    >
                                                        Mejor {sortConfig.key === 'score' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                                                    </th>
                                                    <th
                                                        className="pb-2 text-right cursor-pointer hover:text-cyan-400 transition-colors select-none"
                                                        onClick={() => handleSort('first_score')}
                                                    >
                                                        Inicial {sortConfig.key === 'first_score' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs font-bold">
                                                {sortedLeaderboard.map((entry, idx) => {
                                                    // Convert Percentage (DB) to Raw Score for Display
                                                    const bestRaw = Math.round((entry.score / 100) * questionCount);
                                                    const firstRaw = entry.first_score !== undefined ? Math.round((entry.first_score / 100) * questionCount) : '-';

                                                    return (
                                                        <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                            <td className="py-2 text-white truncate max-w-[100px]">
                                                                {idx + 1}. {entry.player_alias}
                                                            </td>
                                                            <td className="py-2 text-center text-cyan-400">
                                                                {bestRaw}/{questionCount}
                                                            </td>
                                                            <td className="py-2 text-right text-white/40">
                                                                {firstRaw !== '-' ? `${firstRaw}/${questionCount}` : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
