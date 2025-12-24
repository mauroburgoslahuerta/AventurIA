import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Adventure, AppState } from '../types';

interface ProfileScreenProps {
    user: any;
    setAppState: (state: AppState) => void;
    handleGoHome: () => void;
    launchAdventure: (adv: Adventure) => void;
    playSfx: (type: 'click' | 'correct' | 'wrong' | 'win' | 'lose') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, setAppState, handleGoHome, launchAdventure, playSfx }) => {
    const [adventures, setAdventures] = useState<Adventure[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({}); // Store play counts per adventure

    // Analytics Modal State
    const [selectedAdventureId, setSelectedAdventureId] = useState<string | null>(null);
    const [adventureSessions, setAdventureSessions] = useState<any[]>([]);
    const [paramLoading, setParamLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // New: Selection State

    // Fetch User Adventures
    useEffect(() => {
        if (!user) return;
        const fetchAdventures = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('adventures')
                .select('id, created_at, topic, audience, config, thumbnail_url, play_count, total_score, is_featured')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                setAdventures(data);
                // Fetch stats (play counts) for these adventures
                // We do this by aggregating game_sessions
                // Note: This matches the plan to show "Analytics"
                const advIds = data.map(a => a.id);
                if (advIds.length > 0) {
                    const { data: sessionData } = await supabase
                        .from('game_sessions')
                        .select('adventure_id, score')
                        .in('adventure_id', advIds);

                    if (sessionData) {
                        const newStats: any = {};
                        sessionData.forEach((s: any) => {
                            if (!newStats[s.adventure_id]) newStats[s.adventure_id] = { plays: 0, bestScore: 0 };
                            newStats[s.adventure_id].plays++;
                            newStats[s.adventure_id].bestScore = Math.max(newStats[s.adventure_id].bestScore, s.score || 0);
                        });
                        setStats(newStats);
                    }
                }
            }
            setLoading(false);
        };

        fetchAdventures();
    }, [user]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de querer borrar esta aventura? No se puede deshacer.')) return;

        playSfx('wrong'); // Audio feedback
        const { error } = await supabase.from('adventures').delete().eq('id', id);

        if (!error) {
            setAdventures(prev => prev.filter(a => a.id !== id));
        } else {
            alert('Error al borrar: ' + error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`¿Vas a borrar ${selectedIds.length} aventuras? No se puede deshacer.`)) return;
        playSfx('wrong');
        const { error } = await supabase.from('adventures').delete().in('id', selectedIds);
        if (!error) {
            setAdventures(prev => prev.filter(a => !selectedIds.includes(a.id)));
            setSelectedIds([]);
        } else {
            alert('Error al borrar: ' + error.message);
        }
    };

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleViewStats = async (advId: string) => {
        setSelectedAdventureId(advId);
        setParamLoading(true);
        const { data, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('adventure_id', advId) // Ensure this column matches DB
            .order('score', { ascending: false });

        if (data) {
            setAdventureSessions(data);
        }
        setParamLoading(false);
    };

    const handleQuickShare = (advId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?id=${advId}`;
        navigator.clipboard.writeText(shareUrl);
        // Simple visual feedback since we don't have showToast prop passed here easily without refactoring parent.
        // We can use alert or just rely on the button animation I'll add.
        // Or better: Let's assume user wants feedback.
        alert("🔗 ¡Enlace copiado! Compártelo donde quieras.");
        playSfx('click');
    };

    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("¿Borrar este registro? Desaparecerá del ranking.")) return;

        // Optimistic UI update
        setAdventureSessions(prev => prev.filter(s => s.id !== sessionId));

        const { error } = await supabase
            .from('game_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) {
            alert("Error al borrar: " + error.message);
            // Revert if error? For now, fetch again or leave it. 
            // Simple approach: Reload stats
            if (selectedAdventureId) handleViewStats(selectedAdventureId);
        }
    };

    const [modalSortConfig, setModalSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });

    const handleModalSort = (key: string) => {
        setModalSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // ... existing remove this block if handled by multi_replace ...

    return (
        <div className="min-h-screen w-full flex flex-col items-center bg-[#0f172a] text-white p-6 relative overflow-hidden">
            {/* ... (Keep Background) ... */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* ANALYTICS MODAL OVERLAY */}
            {selectedAdventureId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">
                        <button
                            onClick={() => setSelectedAdventureId(null)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all z-10"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        <div className="p-8 pb-4">
                            <h3 className="text-xl font-black text-white mb-1 uppercase">Ranking de Jugadores</h3>
                            <p className="text-xs text-white/40 font-mono tracking-wider">{selectedAdventureId}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                            {paramLoading ? (
                                <div className="p-10 text-center text-white/40 animate-pulse">Cargando datos...</div>
                            ) : adventureSessions.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center gap-4 text-white/30">
                                    <i className="fa-solid fa-ghost text-3xl"></i>
                                    <p className="text-xs uppercase tracking-widest">Nadie ha jugado a esto aún.</p>
                                </div>
                            ) : (
                                <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-white/40 sticky top-0 backdrop-blur-md">
                                            <tr>
                                                <th onClick={() => handleModalSort('player_alias')} className="p-4 cursor-pointer hover:text-white select-none">Jugador {modalSortConfig.key === 'player_alias' && (modalSortConfig.direction === 'desc' ? '▼' : '▲')}</th>
                                                <th onClick={() => handleModalSort('score')} className="p-4 text-center text-cyan-400 cursor-pointer hover:text-white select-none">Mejor {modalSortConfig.key === 'score' && (modalSortConfig.direction === 'desc' ? '▼' : '▲')}</th>
                                                <th onClick={() => handleModalSort('first_score')} className="p-4 text-center text-white/60 cursor-pointer hover:text-white select-none">Inicial {modalSortConfig.key === 'first_score' && (modalSortConfig.direction === 'desc' ? '▼' : '▲')}</th>
                                                <th onClick={() => handleModalSort('played_at')} className="p-4 text-right cursor-pointer hover:text-white select-none">Fecha {modalSortConfig.key === 'played_at' && (modalSortConfig.direction === 'desc' ? '▼' : '▲')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs font-bold text-white/80">
                                            {(() => {
                                                const currentAdv = adventures.find(a => a.id === selectedAdventureId);
                                                const qCount = currentAdv?.questions?.length || 0;

                                                const sortedData = [...adventureSessions].sort((a, b) => {
                                                    let valA = a[modalSortConfig.key];
                                                    let valB = b[modalSortConfig.key];

                                                    // Handle sort by player alias (string)
                                                    if (modalSortConfig.key === 'player_alias') {
                                                        valA = valA || '';
                                                        valB = valB || '';
                                                        return modalSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                                                    }
                                                    // Handle sort by date (string/date)
                                                    if (modalSortConfig.key === 'played_at') {
                                                        return modalSortConfig.direction === 'asc' ? new Date(valA).getTime() - new Date(valB).getTime() : new Date(valB).getTime() - new Date(valA).getTime();
                                                    }

                                                    // Handle numbers (score, first_score)
                                                    return modalSortConfig.direction === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
                                                });

                                                return sortedData.map((s, idx) => {
                                                    const bestRaw = qCount > 0 ? Math.round((s.score / 100) * qCount) : 0;
                                                    const firstRaw = (s.first_score !== null && qCount > 0) ? Math.round((s.first_score / 100) * qCount) : null;

                                                    return (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                            <td className="p-4 flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => handleDeleteSession(s.id, e)}
                                                                    className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold"
                                                                    title="Borrar registro"
                                                                >
                                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                                </button>
                                                                {s.player_alias || 'Anónimo'}
                                                            </td>
                                                            <td className="p-4 text-center text-cyan-400">{bestRaw}/{qCount} ({s.score}%)</td>
                                                            <td className="p-4 text-center text-white/40">{firstRaw !== null ? `${firstRaw}/${qCount} (${s.first_score}%)` : '-'}</td>
                                                            <td className="p-4 text-right font-mono text-[10px] text-white/30">
                                                                {new Date(s.played_at).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="z-10 w-full max-w-4xl relative">
                {/* ... (Keep Header) ... */}
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <span className="font-bold text-xl">{user?.email?.[0].toUpperCase()}</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                                MIS AVENTURAS
                            </h1>
                            {selectedIds.length > 0 ? (
                                <button onClick={handleBulkDelete} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold uppercase tracking-widest transition-all animate-pulse shadow-lg shadow-red-500/20 mt-1">
                                    <i className="fa-solid fa-trash mr-2"></i> Borrar ({selectedIds.length})
                                </button>
                            ) : (
                                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                                    {adventures.length} Creadas
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => { playSfx('click'); handleGoHome(); }}
                        className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest border border-white/5 hover:border-white/20"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Volver
                    </button>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-cyan-500"></i>
                        <p className="text-xs font-bold uppercase tracking-widest">Cargando biblioteca...</p>
                    </div>
                ) : adventures.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-scroll text-3xl text-white/20"></i>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Comienza tu viaje</h3>
                        <p className="text-white/40 max-w-sm mx-auto mb-8 text-sm">
                            Aún no has creado ninguna aventura. Ve al inicio y usa la IA para generar tu primera misión.
                        </p>
                        <button
                            onClick={() => { playSfx('click'); handleGoHome(); }}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
                        >
                            CREAR NUEVA
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {adventures.map((adv) => {
                            const advStats = stats[adv.id] || { plays: 0, bestScore: 0 };
                            return (
                                <div key={adv.id} className={`bg-[#0f172a]/80 border ${selectedIds.includes(adv.id) ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-white/10 hover:border-cyan-500/50'} rounded-2xl p-4 transition-all group relative overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-cyan-500/10`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3">
                                            <div onClick={(e) => toggleSelect(adv.id, e)} className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all shrink-0 mt-1 ${selectedIds.includes(adv.id) ? 'bg-cyan-500 border-cyan-500 text-slate-900' : 'bg-white/5 border-white/20 hover:border-white/50'}`}>
                                                {selectedIds.includes(adv.id) && <i className="fa-solid fa-check text-xs font-black"></i>}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block mb-1">
                                                    {adv.config?.topic || 'Sin Tema'}
                                                </span>
                                                <h3 className="text-lg font-bold leading-tight group-hover:text-cyan-300 transition-colors">
                                                    {adv.topic || 'Aventura sin título'}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => handleQuickShare(adv.id, e)}
                                                className="w-8 h-8 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400/60 hover:text-cyan-400 flex items-center justify-center transition-colors"
                                                title="Copiar Enlace para Compartir"
                                            >
                                                <i className="fa-solid fa-share-nodes text-xs"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(adv.id)}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 flex items-center justify-center transition-colors"
                                                title="Borrar"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 rounded-xl p-3 mb-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] text-white/30 uppercase block">Audiencia</span>
                                            <span className="text-xs font-bold text-white/80">{adv.config?.audience || 'General'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-white/30 uppercase block">Dificultad</span>
                                            <span className="text-xs font-bold text-white/80 capitalize">{adv.config?.difficulty || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Stats Bar */}
                                    <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-100 opacity-60 transition-opacity" onClick={() => handleViewStats(adv.id)} title="Ver Ranking Detallado">
                                            <div className="flex items-center gap-1.5" title="Veces jugada">
                                                <i className="fa-solid fa-gamepad text-emerald-400 text-xs"></i>
                                                <span className="text-xs font-bold">{advStats.plays}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Mejor Puntuación">
                                                <i className="fa-solid fa-trophy text-amber-400 text-xs"></i>
                                                <span className="text-xs font-bold">{advStats.bestScore}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { playSfx('click'); launchAdventure(adv); }}
                                            className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-900 border border-cyan-500/30 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2"
                                        >
                                            <i className="fa-solid fa-play"></i> JUGAR
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
