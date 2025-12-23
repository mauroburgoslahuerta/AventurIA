import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Adventure } from '../types';

interface FeaturedSidebarProps {
    featuredAdventures: Adventure[];
    launchAdventure: (adv: Adventure) => void;
    playSfx: (type: any, muted?: boolean) => void; // Allow optional muted arg
    sfxMuted: boolean;
}

export const FeaturedSidebar: React.FC<FeaturedSidebarProps> = ({
    featuredAdventures,
    launchAdventure,
    playSfx,
    sfxMuted
}) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`fixed z-40 hidden md:flex left-6 top-32 flex-col transition-all duration-500 ease-in-out pointer-events-none ${isSidebarCollapsed ? 'w-12 delay-200' : 'w-72'}`}
        >
            {/* Expand Button */}
            <div className={`absolute top-0 left-0 z-50 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-0 pointer-events-none'}`}>
                <button
                    onClick={() => { playSfx('click', sfxMuted); setIsSidebarCollapsed(false); }}
                    className="w-12 h-12 bg-[#0f172a]/90 backdrop-blur-xl border border-white/20 text-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:bg-white/10 transition-all flex items-center justify-center group pointer-events-auto"
                    title="Ver Destacados"
                    style={{ cursor: 'pointer' }}
                >
                    <i className="fa-solid fa-star text-lg group-hover:scale-110 transition-transform"></i>
                </button>
            </div>

            {/* Sidebar Content */}
            <div className={`bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto max-h-[60vh] overflow-hidden flex flex-col transition-all duration-300 origin-left ${isSidebarCollapsed ? 'opacity-0 scale-90 -translate-x-10 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-star text-amber-500 text-xs animate-pulse"></i>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Destacados</h3>
                    </div>
                    <button onClick={() => { playSfx('click', sfxMuted); setIsSidebarCollapsed(true); }} className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                        <i className="fa-solid fa-minus text-[10px]"></i>
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar space-y-3 pr-1">
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
                                onClick={() => { playSfx('click', sfxMuted); launchAdventure(adv); }}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 rounded-xl p-3 flex gap-3 transition-all group text-left relative overflow-hidden"
                            >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-lg bg-slate-800 shrink-0 overflow-hidden relative">
                                    {adv.thumbnail_url ? (
                                        <img src={adv.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/20"></div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                        <i className="fa-solid fa-play text-white text-[10px]"></i>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                    <h4 className="text-xs font-bold text-white leading-tight truncate pr-2 group-hover:text-amber-400 transition-colors">{adv.topic}</h4>
                                    <span className="text-[9px] text-white/40 uppercase tracking-wider truncate w-full">{adv.audience}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${diffColors} self-start mt-0.5 inline-flex items-center gap-1`}>
                                        {diff === 'hard' ? 'Difícil' : diff === 'easy' ? 'Fácil' : 'Medio'}
                                    </span>
                                    {/* TIMER BADGE */}
                                    {(() => {
                                        const time = adv.config?.timerSeconds ?? 0;
                                        const timeConfig = {
                                            0: { color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10', label: '∞', icon: 'fa-infinity' },
                                            30: { color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', label: '30s', icon: 'fa-stopwatch' },
                                            60: { color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', label: '60s', icon: 'fa-clock' }
                                        }[time] || { color: 'text-slate-400 border-slate-500/20 bg-slate-500/10', label: time + 's', icon: 'fa-clock' };

                                        return (
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${timeConfig.color} self-start mt-0.5 inline-flex items-center gap-1 ml-1`}>
                                                <i className={`fa-solid ${timeConfig.icon} text-[6px]`}></i> {timeConfig.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};
