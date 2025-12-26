import React, { useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
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
    launchAdventure: (adv: Adventure) => void;
    user: any; // Using any to avoid Supabase type dependency issues, as it's just a check
    setShowAuthOverlay: (show: boolean) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
    config,
    setConfig,
    generateGame,
    errorMsg,
    deferredPrompt,
    handleInstallClick,
    setAppState,
    featuredAdventures,
    launchAdventure,
    user,
    setShowAuthOverlay
}) => {
    const pageVariants = {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
    };

    const [showLoginNudge, setShowLoginNudge] = React.useState(false);
    const [showFeaturedSheet, setShowFeaturedSheet] = React.useState(false);
    const dragControls = useDragControls();

    const onDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            setShowFeaturedSheet(false);
        }
    };

    const handleGenerateClick = () => {
        if (!user) {
            setShowLoginNudge(true);
        } else {
            generateGame();
        }
    };

    return (
        <>
            <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-xl flex flex-col z-10">
                {/* ... existing content ... */}
                {/* Note: I need to be careful not to replace the whole file content here as I am targeting a partial block, but the instruction implies logic changes. 
                   Actually, I need to insert the `dragControls` logic inside the component body, which I can do by targeting the top of the component as I did above.
                   But wait, I need to REPLACE the sheet rendering block too.
                   Let's split this into two edits if needed, or one big one if contiguous. 
                   The `showFeaturedSheet` state and `handleGenerateClick` are close. I can insert `dragControls` there.
                */}

                <div className="glass-card overflow-hidden shadow-2xl flex flex-col bg-[#0f172a]/85 backdrop-blur-xl border border-white/10 px-8 pb-8 pt-4">
                    {/* Header Container */}
                    <div className="relative w-full flex flex-row items-center justify-center pt-0 pb-[30px] mb-6 border-b border-white/5">

                        {/* Global Offset Wrapper */}
                        <div className="flex flex-row items-center justify-center gap-[36px] md:gap-[27px] translate-x-[-7px] md:translate-x-[-11px]">
                            {/* Brain Icon */}
                            <img src={AI_ENGINE_LOGO} className="h-16 md:h-[4.5rem] w-auto animate-float -mt-[18px] ml-[7px]" />

                            {/* Text Group */}
                            <div className="flex flex-col items-start justify-center z-10 -space-y-4">

                                {/* Row: Logo + Badges */}
                                <div className="flex items-center gap-[7px]">
                                    <img src="/aventuria_logo_text.png" alt="AventurIA" className="h-40 md:h-60 w-auto object-contain -my-10 md:-my-[68px] -ml-[42px]" />

                                    {/* Badges Container */}
                                    <div className="flex items-center gap-2 md:gap-3 ml-[1px] relative top-[3px]">
                                        {/* Beta Badge - Tuner Trigger */}
                                        <div

                                            className="flex flex-col items-center justify-center border border-white/10 bg-white/5 rounded px-2 py-0.5 hover:bg-white/10 transition-colors cursor-default group transform scale-90 origin-left"

                                        >
                                            <span className="text-[7px] font-bold text-cyan-400/80 leading-none tracking-widest group-hover:text-cyan-300">BETA</span>
                                            <span className="text-[7px] font-medium text-white/40 leading-none tracking-wider group-hover:text-white/60">V1.5</span>
                                        </div>

                                        {/* Install Button (Smart State) */}
                                        {(() => {
                                            const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

                                            if (isStandalone) {
                                                return (
                                                    <div className="flex items-center gap-1.5 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 cursor-default">
                                                        <i className="fa-solid fa-check text-emerald-400 text-[8px] md:text-[9px]"></i>
                                                        <span className="text-emerald-400/90 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">En App</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    onClick={deferredPrompt
                                                        ? handleInstallClick
                                                        : () => alert("ℹ️ Opción de Instalación:\n\n• Si ya la tienes instalada: ¡Búscala en tus apps!\n• Android: Usa el menú (⋮) y busca 'Instalar aplicación'.\n• iOS: Pulsa 'Compartir' y elige 'Añadir a Inicio'.")
                                                    }
                                                    className="bg-transparent text-emerald-400/90 font-bold w-6 h-6 md:w-auto md:h-auto flex items-center justify-center md:px-4 md:py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-300 transition-all md:gap-2 hover:border-emerald-500/40"
                                                >
                                                    <i className="fa-solid fa-download text-[10px] md:text-[9px]"></i>
                                                    <span className="hidden md:block text-[10px]">Instalar</span>
                                                </button>
                                            );
                                        })()}
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
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm font-semibold transition-all hover:bg-white/[0.07]" placeholder="Ej: Las hojas, Animais (Galego)..." value={config.topic} onChange={e => setConfig({ ...config, topic: e.target.value })} />
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

                    <button onClick={handleGenerateClick} disabled={!config.topic || !config.audience} className="w-full mt-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white hover:text-slate-900 transition-all uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-4 group shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]">
                        CREAR AVENTURA <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover:rotate-12 transition-transform"></i>
                    </button>


                </div>
            </motion.div>

            {/* --- Mobile Featured FAB & Sheet --- */}

            {/* FAB - Elevated to avoid footer overlap - Draggable */}
            <motion.div
                className="md:hidden fixed bottom-24 right-4 z-40 touch-none"
                drag
                dragMomentum={false}
                dragElastic={0.1}
                whileTap={{ cursor: "grabbing" }}
            >
                <button
                    onClick={() => setShowFeaturedSheet(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.5)] flex items-center justify-center animate-bounce-slow hover:scale-110 transition-transform pointer-events-auto"
                >
                    <i className="fa-solid fa-star text-2xl"></i>
                    <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 border-2 border-[#0f172a] animate-pulse"></div>
                </button>
            </motion.div>

            {/* Bottom Sheet */}
            <AnimatePresence>
                {showFeaturedSheet && (
                    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFeaturedSheet(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                        />

                        {/* Sheet Content */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full bg-[#0f172a] border-t border-white/20 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
                        >
                            {/* Handle */}
                            <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setShowFeaturedSheet(false)}>
                                <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
                            </div>

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-star text-amber-500 text-lg"></i>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Aventuras Destacadas</h3>
                                </div>
                                <button onClick={() => setShowFeaturedSheet(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto p-4 space-y-3 pb-20">
                                {featuredAdventures.map((adv) => {
                                    const diff = adv.config?.difficulty || 'medium';
                                    const diffColors = {
                                        easy: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                                        medium: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
                                        hard: 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                                    }[diff] || 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10';

                                    return (
                                        <button
                                            key={adv.id}
                                            onClick={() => { launchAdventure(adv); setShowFeaturedSheet(false); }}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex gap-4 text-left active:scale-[0.98] transition-transform relative overflow-hidden group"
                                        >
                                            {/* Thumbnail (Ahora sí!) */}
                                            <div className="w-20 h-20 rounded-lg bg-slate-800 shrink-0 overflow-hidden relative shadow-lg">
                                                {adv.thumbnail_url ? (
                                                    <img src={adv.thumbnail_url} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/20"></div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${diffColors}`}>
                                                        {diff}
                                                    </span>
                                                    {(() => {
                                                        const time = adv.config?.timerSeconds ?? 0;
                                                        const label = time === 0 ? '∞' : time + 's';
                                                        const neutralStyle = "text-slate-400 border-slate-500/20 bg-slate-500/10";
                                                        return (
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${neutralStyle} flex items-center gap-1`}>
                                                                <i className={`fa-solid ${time === 0 ? 'fa-infinity' : 'fa-clock'} text-[6px]`}></i> {label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <h4 className="font-bold text-white text-sm leading-tight line-clamp-2">{adv.topic}</h4>
                                                <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">{adv.audience}</p>
                                            </div>

                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
                                                <i className="fa-solid fa-chevron-right text-xs"></i>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- Footer: Creado y desarrollado por --- */}
            <div className="fixed bottom-1 right-1 z-50 flex flex-col items-end gap-0 opacity-100 transition-opacity duration-300 pointer-events-none md:pointer-events-auto">
                <span className="hidden md:block text-[8px] font-black uppercase tracking-[0.2em] text-white/30 leading-none -mb-1">Creado y desarrollado por</span>
                <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform pointer-events-auto">
                    <img src={MAURO_BURGOS_LOGO} alt="Mauro Burgos" className="h-10 md:h-20 w-auto drop-shadow-lg" />
                </a>
            </div>

            {/* --- LOGIN NUDGE MODAL --- */}
            {showLoginNudge && (
                <div
                    onClick={() => setShowLoginNudge(false)}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2">
                                <i className="fa-solid fa-user-astronaut text-3xl text-cyan-400"></i>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wide">Modo Invitado</h3>
                            <p className="text-sm text-white/70 leading-relaxed font-medium">
                                ¡Espera! Estás en modo invitado. Si te conectas podrás guardar esta aventura, ver quién la juega y sus puntuaciones.
                            </p>

                            <div className="flex flex-col gap-3 w-full mt-4">
                                <button
                                    onClick={() => {
                                        setShowLoginNudge(false);
                                        setShowAuthOverlay(true);
                                    }}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-widest hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-[1.02]"
                                >
                                    Conectarse
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLoginNudge(false);
                                        generateGame();
                                    }}
                                    className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
