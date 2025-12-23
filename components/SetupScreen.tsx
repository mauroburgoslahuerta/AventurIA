import React from 'react';
import { motion } from 'framer-motion';
import { AI_ENGINE_LOGO, MAURO_BURGOS_LOGO, PORTFOLIO_URL } from '../constants';
import { GameConfig, Adventure } from '../types';

interface SetupScreenProps {
    config: GameConfig;
    setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
    generateGame: () => void;
    errorMsg: string | null;
    deferredPrompt: any;
    handleInstallClick: () => void;
    setAppState: (state: any) => void;
    featuredAdventures: Adventure[];
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
    config,
    setConfig,
    generateGame,
    errorMsg,
    deferredPrompt,
    handleInstallClick,
    setAppState,
    featuredAdventures
}) => {
    const pageVariants = {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
    };

    return (
        <>
            <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-xl flex flex-col z-10">
                <div className="glass-card overflow-hidden shadow-3xl flex flex-col bg-[#0f172a]/60 border border-white/5 px-8 pb-8 pt-4">
                    {/* Header Container */}
                    <div className="relative w-full flex flex-row items-center justify-center pt-0 pb-[30px] mb-6 border-b border-white/5">

                        {/* Global Offset Wrapper */}
                        <div className="flex flex-row items-center justify-center gap-[27px] translate-x-[-11px]">
                            {/* Brain Icon */}
                            <img src={AI_ENGINE_LOGO} className="h-16 md:h-[4.5rem] w-auto animate-float -mt-[18px] ml-[7px]" />

                            {/* Text Group */}
                            <div className="flex flex-col items-start justify-center z-10 -space-y-4">

                                {/* Row: Logo + Badges */}
                                <div className="flex items-center gap-[7px]">
                                    <img src="/aventuria_logo_text.png" alt="AventurIA" className="h-40 md:h-60 w-auto object-contain -my-10 md:-my-[68px] -ml-[42px]" />

                                    {/* Badges Container */}
                                    <div className="flex items-center gap-3 ml-[1px] relative top-[3px]">
                                        {/* Beta Badge - Tuner Trigger */}
                                        <div

                                            className="flex flex-col items-center justify-center border border-white/10 bg-white/5 rounded px-2 py-0.5 hover:bg-white/10 transition-colors cursor-default group transform scale-90 origin-left"

                                        >
                                            <span className="text-[7px] font-bold text-cyan-400/80 leading-none tracking-widest group-hover:text-cyan-300">BETA</span>
                                            <span className="text-[7px] font-medium text-white/40 leading-none tracking-wider group-hover:text-white/60">V1.4</span>
                                        </div>

                                        {/* Install Button */}
                                        {deferredPrompt && (
                                            <button onClick={handleInstallClick} className="bg-transparent text-emerald-400/90 text-[10px] font-bold px-4 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-300 transition-all flex items-center gap-2 hover:border-emerald-500/40">
                                                <i className="fa-solid fa-download text-[9px]"></i>
                                                <span>Instalar</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Subtitle */}
                                <p className="text-[10px] md:text-xs text-cyan-400 font-bold tracking-[0.2em] relative z-10 opacity-80 ml-[-31px]">Crea retos educativos interactivos en segundos</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">ESCRIBE TU TEMA</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-pen-nib text-white/20 text-xs"></i>
                                </div>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm font-semibold transition-all hover:bg-white/[0.07]" placeholder="Ej: antigua roma, las hojas..." value={config.topic} onChange={e => setConfig({ ...config, topic: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">AUDIENCIA OBJETIVO</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-users-viewfinder text-white/20 text-xs"></i>
                                </div>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm font-semibold transition-all hover:bg-white/[0.07]" placeholder="Ej: 3º Primaria, Adolescentes..." value={config.audience} onChange={e => setConfig({ ...config, audience: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 w-full">

                            {/* FILA SUPERIOR: Nº RETOS */}
                            <div className="w-full space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 block">Nº de Retos</label>
                                <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 relative overflow-hidden flex flex-col justify-center hover:border-white/10 transition-all">
                                    <div className="grid grid-cols-5 gap-1 w-full">
                                        {[5, 10, 15, 25, 50].map((n) => {
                                            const isAvailable = n === 5 || n === 10;
                                            return (
                                                <button
                                                    key={n}
                                                    disabled={!isAvailable}
                                                    onClick={() => isAvailable && setConfig({ ...config, count: n })}
                                                    className={`relative py-3 rounded-lg text-[9px] font-black transition-all flex items-center justify-center ${config.count === n ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(0,229,255,0.3)] scale-[1.02] z-10' : isAvailable ? 'text-white/40 hover:text-white hover:bg-white/5 bg-white/[0.02]' : 'text-white/5 cursor-not-allowed bg-black/20'}`}
                                                >
                                                    <span>{n}</span>
                                                    {!isAvailable && <i className="fa-solid fa-lock text-[6px] absolute top-0.5 right-0.5 opacity-50"></i>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* FILA INFERIOR: DIFICULTAD Y TIEMPO */}
                            <div className="grid grid-cols-2 gap-4 w-full">

                                {/* DIFICULTAD */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 block">Dificultad</label>
                                    <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-all">
                                        <div className="flex gap-1">
                                            {[
                                                { id: 'easy', label: 'FÁCIL', icon: 'fa-seedling', color: 'bg-emerald-500 text-emerald-950', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' },
                                                { id: 'medium', label: 'MEDIO', icon: 'fa-scale-balanced', color: 'bg-amber-500 text-amber-950', shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]' },
                                                { id: 'hard', label: 'DIFÍCIL', icon: 'fa-dragon', color: 'bg-rose-500 text-white', shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]' }
                                            ].map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setConfig({ ...config, difficulty: d.id })}
                                                    className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all flex items-center justify-center uppercase tracking-wider gap-1.5 whitespace-nowrap ${config.difficulty === d.id ? d.color + ' ' + d.shadow + ' scale-[1.02] z-10' : 'text-white/30 hover:text-white hover:bg-white/5 bg-white/[0.02]'}`}
                                                >
                                                    <i className={`fa-solid ${d.icon} text-[9px] opacity-80`}></i>
                                                    <span className="hidden md:inline">{d.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* TIEMPO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 block">Tiempo por reto</label>
                                    <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 flex flex-col justify-center hover:border-white/10 transition-all">
                                        <div className="flex gap-1">
                                            {[0, 30, 60].map(s => (
                                                <button key={s} onClick={() => setConfig({ ...config, timerSeconds: s })} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all whitespace-nowrap flex items-center justify-center ${config.timerSeconds === s ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'text-white/30 hover:text-white hover:bg-white/5 bg-white/[0.02]'}`}>{s === 0 ? <i className="fa-solid fa-infinity text-xs"></i> : s + 's'}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-4 animate-fade-in">
                            <i className="fa-solid fa-triangle-exclamation text-red-400 text-xl"></i>
                            <p className="text-red-200 text-xs font-bold">{errorMsg}</p>
                        </div>
                    )}

                    <button onClick={generateGame} disabled={!config.topic || !config.audience} className="w-full mt-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white hover:text-slate-900 transition-all uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-4 group shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]">
                        CREAR AVENTURA <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover:rotate-12 transition-transform"></i>
                    </button>


                </div>
            </motion.div>

            {/* --- Mobile Featured Strip --- */}
            {featuredAdventures.length > 0 && (
                <div className="md:hidden w-full max-w-xl px-6 mt-8 mb-20 z-10">
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                        <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Destacados</h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                        {featuredAdventures.map((adv) => {
                            const diff = adv.config.difficulty || 'medium';
                            const diffColors = {
                                easy: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                                medium: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
                                hard: 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                            }[diff] || 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10';

                            return (
                                <div key={adv.id} className="snap-center shrink-0 w-64 bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden group">
                                    <div className="flex justify-between items-start">
                                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${diffColors}`}>
                                            {diff}
                                        </span>
                                        <span className="text-[9px] font-bold text-white/40 flex items-center gap-1">
                                            <i className="fa-solid fa-play text-[8px]"></i> {adv.play_count}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm leading-tight line-clamp-2">{adv.topic}</h4>
                                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{adv.audience}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- Footer: Creado y desarrollado por --- */}
            <div className="fixed bottom-2 right-2 z-50 flex flex-col items-end gap-0 opacity-30 hover:opacity-100 transition-opacity duration-300">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white leading-none -mb-1">Creado y desarrollado por</span>
                <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform">
                    <img src={MAURO_BURGOS_LOGO} alt="Mauro Burgos" className="h-20 w-auto" />
                </a>
            </div>
        </>
    );
};
