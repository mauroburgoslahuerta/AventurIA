import React, { useState, useEffect } from 'react';
import { Adventure, SoundType, UserStats, AdminUser, SystemLog } from '../types';
import { supabase } from '../supabaseClient';

interface AdminDashboardProps {
    setAppState: (state: any) => void;
    setAdminPassword: (password: string) => void;
    adminAdventures: Adventure[];
    googleImageCount: number;
    totalPlays: number;
    completionRate: number;
    globalAvgScore: number;
    toggleFeatured: (id: string, currentVal: boolean) => void;
    requestAdminLoad: (id: string) => void;
    deleteAdventure: (id: string) => void;
    adminLoading: boolean;
    playSfx: (type: SoundType) => void;
    sfxMuted: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    setAppState,
    setAdminPassword,
    adminAdventures,
    googleImageCount,
    totalPlays,
    completionRate,
    globalAvgScore,
    toggleFeatured,
    requestAdminLoad,
    deleteAdventure,
    adminLoading,
    playSfx,
    sfxMuted
}) => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'adventures' | 'users' | 'logs'>('adventures');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
    const [userFilter, setUserFilter] = useState<'all' | 'new_today'>('all');

    // New Data States
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({ total_users: 0, new_users_today: 0 });
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // New: Selection State

    // --- STATS VIEW STATE ---
    const [viewStatsId, setViewStatsId] = useState<string | null>(null);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [modalSortConfig, setModalSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });

    const fetchAdventureStats = async (adventureId: string) => {
        setLoadingStats(true);
        const { data, error } = await supabase
            .from('game_sessions')
            .select('player_alias, score, first_score, played_at')
            .eq('adventure_id', adventureId); // Removed default order to use JS sort

        if (data && !error) {
            setStatsData(data);
        }
        setLoadingStats(false);
    };

    const handleModalSort = (key: string) => {
        setModalSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    useEffect(() => {
        if (viewStatsId) {
            fetchAdventureStats(viewStatsId);
        } else {
            setStatsData([]);
        }
    }, [viewStatsId]);

    // --- EFFECTS ---
    useEffect(() => {
        fetchUserStats();
        fetchUsersList(); // Fetch users immediately to populate creator names
        if (activeTab === 'logs') fetchLogsList();
    }, [activeTab]);

    // --- FETCHERS ---
    const fetchUserStats = async () => {
        const { data, error } = await supabase.rpc('get_daily_user_stats');
        if (data && !error) setUserStats(data as UserStats);
    };

    const fetchUsersList = async () => {
        // Only show loading if we haven't loaded them yet
        if (users.length === 0) setIsLoadingUsers(true);
        const { data, error } = await supabase.rpc('get_admin_users_list');
        if (data && !error) setUsers(data as AdminUser[]);
        setIsLoadingUsers(false);
    };

    const fetchLogsList = async () => {
        setIsLoadingLogs(true);
        const { data, error } = await supabase.rpc('get_recent_logs', { limit_count: 50 });
        if (data && !error) setLogs(data as SystemLog[]);
        setIsLoadingLogs(false);
    };

    const deleteUser = async (userId: string) => {
        if (!confirm("¿ESTÁS SEGURO? Esto borrará al usuario y TODAS sus aventuras para siempre.")) return;
        const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: userId });
        if (!error) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            alert("Usuario eliminado.");
        } else {
            alert("Error al eliminar usuario.");
            console.error(error);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`¿ESTÁS SEGURO? Vas a eliminar ${selectedIds.length} aventuras permanentemente.`)) return;

        // Optimización: Borrado secuencial para evitar timeouts en DB
        let deletedCount = 0;
        const idsToDelete = [...selectedIds];

        for (const id of idsToDelete) {
            const { error } = await supabase.from('adventures').delete().eq('id', id);
            if (!error) {
                deletedCount++;
            } else {
                console.error(`Error borrando aventura ${id}:`, error);
            }
        }

        if (deletedCount > 0) {
            alert(`${deletedCount} de ${idsToDelete.length} aventuras eliminadas.`);
            setSelectedIds([]);
            window.location.reload(); // Recargar para limpiar la vista
        } else {
            alert("No se pudo eliminar ninguna aventura. Revisa la consola o los permisos.");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAll = () => {
        const visibleIds = getFilteredAdventures().map(a => a.id);
        setSelectedIds(selectedIds.length === visibleIds.length ? [] : visibleIds);
    };

    // --- CSV EXPORT ---
    const downloadCSV = (data: any[], filename: string) => {
        if (!data || !data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // --- HELPERS ---
    const getPlaysToday = () => {
        const today = new Date().toISOString().split('T')[0];
        return adminAdventures.reduce((acc, curr) => acc + ((curr.daily_plays && curr.daily_plays[today]) || 0), 0);
    };

    const getUserIdentity = (userId?: string) => {
        if (!userId) return { name: 'Anónimo', email: null };
        const u = users.find(u => u.id === userId);
        if (u && u.email) return { name: u.email.split('@')[0], email: u.email, fullId: userId };
        return { name: userId.substring(0, 6) + '...', email: null, fullId: userId };
    };

    const goToUser = (userId: string) => {
        const u = users.find(u => u.id === userId);
        setSearchTerm(u?.email || userId);
        setActiveTab('users');
    };

    // --- ADVENTURE FILTERING ---
    const getFilteredAdventures = () => {
        let result = [...adminAdventures];
        const today = new Date().toISOString().split('T')[0];

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(a => a.topic.toLowerCase().includes(lower) || a.audience.toLowerCase().includes(lower));
        }

        result.sort((a: any, b: any) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'trending') {
                valA = (a.daily_plays && a.daily_plays[today]) || 0;
                valB = (b.daily_plays && b.daily_plays[today]) || 0;
            }
            if (sortConfig.key === 'quality') {
                valA = a.completions > 0 ? (a.total_score / a.completions) : 0;
                valB = b.completions > 0 ? (b.total_score / b.completions) : 0;
            }
            if (sortConfig.key === 'questions.length') {
                valA = a.questions.length;
                valB = b.questions.length;
            }

            if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
        return result;
    };

    // --- USER FILTERING ---
    const getFilteredUsers = () => {
        let result = [...users];

        // Filter: New Today
        if (userFilter === 'new_today') {
            const today = new Date().toDateString();
            result = result.filter(u => new Date(u.created_at).toDateString() === today);
        }

        // Search
        if (searchTerm && activeTab === 'users') {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u => u.email?.toLowerCase().includes(lower) || u.id.includes(lower));
        }

        // Dynamic Sort
        result.sort((a: any, b: any) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle potential nulls/undefined for strings
            if (sortConfig.key === 'email') {
                valA = a.email || '';
                valB = b.email || '';
            }

            if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            // Default numbers/dates
            // Handle play counts which are numbers
            return sortConfig.direction === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
        });

        return result;
    };

    return (
        <div className="flex flex-col h-full animate-fade-in bg-[#0f172a] absolute inset-0 z-[200]">
            {/* ... Existing Header ... */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-30">
                {/* ... Keep existing header content ... */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <i className="fa-solid fa-server text-white text-lg"></i>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-white tracking-tight uppercase leading-none">Panel Admin</h2>
                        <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mt-1">V3.1 System</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {[
                        { id: 'adventures', label: 'Aventuras', icon: 'fa-gamepad' },
                        { id: 'users', label: 'Usuarios', icon: 'fa-users' },
                        { id: 'logs', label: 'Logs', icon: 'fa-stethoscope' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { playSfx('click'); setActiveTab(tab.id as any); setUserFilter('all'); }} // Reset filters on tab switch
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    {activeTab === 'adventures' && selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-all animate-pulse shadow-lg shadow-red-500/20"
                        >
                            <i className="fa-solid fa-trash mr-2"></i> Borrar ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (activeTab === 'adventures') downloadCSV(adminAdventures, 'aventurias.csv');
                            if (activeTab === 'users') downloadCSV(users, 'usuarios.csv');
                            if (activeTab === 'logs') downloadCSV(logs, 'logs.csv');
                        }}
                        className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-white/40 hover:text-cyan-400 text-xs font-bold uppercase tracking-wider transition-all"
                        title="Exportar CSV"
                    >
                        <i className="fa-solid fa-download"></i> CSV
                    </button>
                    <button
                        onClick={() => { setAppState('setup'); setAdminPassword(''); }}
                        className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 flex items-center justify-center transition-all"
                    >
                        <i className="fa-solid fa-power-off"></i>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* 2. KPI Grid (GLOBAL) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Users KPI */}
                        <button
                            onClick={() => { playSfx('click'); setActiveTab('users'); setUserFilter('all'); }}
                            className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 hover:bg-white/[0.05] transition-all text-left"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <i className="fa-solid fa-users text-5xl text-blue-500"></i>
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Usuarios Totales</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{userStats.total_users}</span>
                                {userStats.new_users_today > 0 && (
                                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <i className="fa-solid fa-arrow-up"></i>
                                        +{userStats.new_users_today} HOY
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* New Users KPI */}
                        {/* Daily Plays KPI (RESTORADO) */}
                        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 hover:bg-white/[0.05] transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <i className="fa-solid fa-bolt text-5xl text-amber-500"></i>
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Partidas Hoy</h3>
                            <span className="text-3xl font-black text-amber-400">+{getPlaysToday()}</span>
                        </div>

                        {/* RESTORED: Plays KPI (Total + Today) */}
                        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <i className="fa-solid fa-gamepad text-5xl text-cyan-500"></i>
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Partidas Totales</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{totalPlays}</span>
                                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="fa-solid fa-arrow-up"></i>
                                    {getPlaysToday()} hoy
                                </div>
                            </div>
                        </div>

                        {/* Google KPI */}
                        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Cuota Google</h3>
                            <div className="flex items-end gap-2">
                                <span className={`text-3xl font-black ${googleImageCount >= 800 ? 'text-red-400' : 'text-white'}`}>{googleImageCount}</span>
                                <span className="text-xs font-bold text-white/20 mb-1">/ 800</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
                                <div className={`h-full ${googleImageCount >= 800 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${Math.min((googleImageCount / 800) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>


                    {/* === ADVENTURES TAB === */}
                    {activeTab === 'adventures' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                <div className="relative w-full md:w-96 group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <i className="fa-solid fa-magnifying-glass text-white/20 group-focus-within:text-cyan-400 transition-colors text-sm"></i>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar aventura..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-500/50 outline-none transition-all placeholder-white/20"
                                    />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.02]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-white/40">
                                            <tr>
                                                <th className="p-6 w-10">
                                                    <input type="checkbox" onChange={selectAll} checked={selectedIds.length > 0 && selectedIds.length === getFilteredAdventures().length} className="w-4 h-4 rounded border-white/30 bg-white/5 checked:bg-cyan-500 cursor-pointer" />
                                                </th>
                                                <th onClick={() => handleSort('created_at')} className="p-6 cursor-pointer hover:text-white">Fecha</th>
                                                <th onClick={() => handleSort('is_featured')} className="p-6 text-center cursor-pointer hover:text-white w-24">Destacado</th>
                                                <th onClick={() => handleSort('topic')} className="p-6 cursor-pointer hover:text-white">Aventura</th>
                                                <th className="p-6">Creador</th>
                                                <th className="p-6 text-center">Datos</th>
                                                <th onClick={() => handleSort('play_count')} className="p-6 text-center cursor-pointer hover:text-white">Jugadas</th>
                                                <th onClick={() => handleSort('trending')} className="p-6 text-center cursor-pointer hover:text-white text-emerald-400">Hoy</th>
                                                <th className="p-6 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-medium text-white/80">
                                            {getFilteredAdventures().map((adv, idx) => {
                                                const creator = getUserIdentity(adv.user_id);
                                                const todayKey = new Date().toISOString().split('T')[0];
                                                const todayCount = (adv.daily_plays && adv.daily_plays[todayKey]) || 0;

                                                return (
                                                    <tr key={adv.id} className={`border-b border-white/5 transition-colors ${selectedIds.includes(adv.id) ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}>
                                                        <td className="p-6">
                                                            <input type="checkbox" checked={selectedIds.includes(adv.id)} onChange={() => toggleSelect(adv.id)} className="w-4 h-4 rounded border-white/30 bg-white/5 checked:bg-cyan-500 cursor-pointer" />
                                                        </td>
                                                        <td className="p-6 font-mono text-xs text-white/30">{new Date(adv.created_at).toLocaleDateString()}</td>

                                                        {/* FEATURED COLUMN */}
                                                        <td className="p-6 text-center">
                                                            <button
                                                                onClick={() => toggleFeatured(adv.id, adv.is_featured || false)}
                                                                className={`w-8 h-8 rounded-full ${adv.is_featured ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110' : 'bg-white/5 text-white/20 hover:text-amber-400 hover:bg-white/10'} transition-all`}
                                                                title={adv.is_featured ? "Quitar de destacados" : "Destacar"}
                                                            >
                                                                <i className="fa-solid fa-star text-xs"></i>
                                                            </button>
                                                        </td>

                                                        <td className="p-6">
                                                            <div className="font-bold text-white text-base">{adv.topic}</div>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                <div className="inline-block px-2 py-0.5 rounded-md bg-white/10 text-white/50 text-[10px] font-black uppercase tracking-wider">{adv.audience}</div>

                                                                {/* RESTORED DIFFICULTY BADGE */}
                                                                {(() => {
                                                                    const diff = adv.config?.difficulty || 'medium';
                                                                    const diffConfig = {
                                                                        easy: { label: 'FÁCIL', icon: 'fa-seedling', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                                                                        medium: { label: 'MEDIO', icon: 'fa-scale-balanced', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                                                                        hard: { label: 'DIFÍCIL', icon: 'fa-dragon', className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
                                                                    }[diff] || { label: diff, icon: 'fa-circle-question', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

                                                                    return (
                                                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${diffConfig.className}`}>
                                                                            <i className={`fa-solid ${diffConfig.icon}`}></i>
                                                                            <span>{diffConfig.label}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            {adv.user_id ? (
                                                                <button
                                                                    onClick={() => goToUser(adv.user_id!)}
                                                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors group"
                                                                >
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                                                        {creator.name.substring(0, 2)}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-white/60 group-hover:text-cyan-400 transition-colors">{creator.name}</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-mono text-white/20 italic">Anónimo</span>
                                                            )}
                                                        </td>
                                                        <td className="p-6 text-center font-mono text-xs text-white/50">
                                                            <div className="flex flex-col gap-1">
                                                                <span>{adv.questions?.length || '?'} R</span>
                                                                <span className={adv.completions > 0 ? 'text-emerald-400' : ''}>{(adv.completions > 0 ? Math.round(adv.total_score / adv.completions) : 0)}% Avg</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-center font-black text-lg">{adv.play_count}</td>

                                                        {/* COLUMNA HOY */}
                                                        <td className="p-6 text-center">
                                                            {todayCount > 0 ? (
                                                                <div className="inline-flex flex-col items-center">
                                                                    <span className="text-lg font-black text-emerald-400">+{todayCount}</span>
                                                                    <i className="fa-solid fa-bolt text-[10px] text-emerald-500/50 animate-pulse"></i>
                                                                </div>
                                                            ) : (
                                                                <span className="text-white/10 font-mono">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setViewStatsId(adv.id)} className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-900 grid place-items-center transition-all" title="Ver Estadísticas"><i className="fa-solid fa-chart-simple text-xs"></i></button>
                                                                <button onClick={() => requestAdminLoad(adv.id)} className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-900 grid place-items-center transition-all" title="Jugar"><i className="fa-solid fa-play text-xs"></i></button>
                                                                <button onClick={() => deleteAdventure(adv.id)} className="w-8 h-8 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white grid place-items-center transition-all" title="Borrar"><i className="fa-solid fa-trash text-xs"></i></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === USERS TAB === */}
                    {activeTab === 'users' && (
                        // ... Existing Users Tab Code ...
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                    Directorio de Usuarios
                                    {userFilter === 'new_today' && (
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded-lg uppercase tracking-wider font-black flex items-center gap-2">
                                            <i className="fa-solid fa-filter"></i> Registrados Hoy
                                            <button onClick={() => setUserFilter('all')} className="hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                                        </span>
                                    )}
                                </h3>
                                <div className="text-xs text-white/40 font-mono">Total: {getFilteredUsers().length}</div>
                            </div>

                            {isLoadingUsers ? <div className="p-20 text-center text-white/30 animate-pulse">Cargando usuarios...</div> : (
                                <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.02]">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-white/40">
                                                <tr>
                                                    <th onClick={() => handleSort('email')} className="p-6 cursor-pointer hover:text-white">Usuario (Email/ID)</th>
                                                    <th onClick={() => handleSort('created_at')} className="p-6 cursor-pointer hover:text-white">Registrado</th>
                                                    <th onClick={() => handleSort('last_sign_in_at')} className="p-6 cursor-pointer hover:text-white">Último Acceso</th>
                                                    <th onClick={() => handleSort('adventure_count')} className="p-6 text-center cursor-pointer hover:text-white">Aventuras Creadas</th>
                                                    <th onClick={() => handleSort('total_play_count')} className="p-6 text-center cursor-pointer hover:text-white">Plays Totales</th>
                                                    <th className="p-6 text-right">Admin</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm font-medium text-white/80">
                                                {getFilteredUsers().map((u) => (
                                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-bold text-white">{u.email || 'Email Oculto'}</div>
                                                            <div className="text-[10px] font-mono text-white/30">{u.id}</div>
                                                        </td>
                                                        <td className="p-6 text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                                                        <td className="p-6 text-xs text-amber-400/80">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Nunca'}</td>
                                                        <td className="p-6 text-center font-black text-white">{u.adventure_count}</td>
                                                        <td className="p-6 text-center font-mono text-cyan-400">{u.total_play_count}</td>
                                                        <td className="p-6 text-right">
                                                            <button onClick={() => deleteUser(u.id)} className="px-3 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold uppercase"><i className="fa-solid fa-ban mr-1"></i> Eliminar</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === LOGS TAB === */}
                    {activeTab === 'logs' && (
                        // ... Existing Logs Tab Code ...
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-lg font-bold text-white px-2">Logs del Sistema (Últimos 50)</h3>
                            {isLoadingLogs ? <div className="p-20 text-center text-white/30 animate-pulse">Cargando logs...</div> : (
                                <div className="space-y-2">
                                    {logs.map(log => (
                                        <div key={log.id} className={`p-4 rounded-xl border flex gap-4 items-start ${log.severity === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.severity === 'error' ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{log.component}</span>
                                                    <span className="text-[10px] font-mono text-white/20">{new Date(log.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm font-mono text-white/80 break-words">{log.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <div className="text-center p-10 text-white/30 italic">No hay logs registrados recientemente.</div>}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* --- STATS MODAL --- */}
                {viewStatsId && (
                    <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                        <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl relative flex flex-col max-h-[80vh]">
                            <button
                                onClick={() => setViewStatsId(null)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                            <h3 className="text-xl font-black text-white mb-1 uppercase">Estadísticas de Jugadores</h3>
                            <p className="text-xs text-white/40 mb-6 font-mono tracking-wider">{viewStatsId}</p>

                            {loadingStats ? (
                                <div className="flex-1 flex items-center justify-center text-white/30 animate-pulse">
                                    Cargando datos...
                                </div>
                            ) : statsData.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3 py-10">
                                    <i className="fa-solid fa-ghost text-3xl opacity-50"></i>
                                    <p className="text-xs uppercase tracking-widest">Nadie ha jugado aún</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-white/[0.02]">
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
                                                const currentAdv = adminAdventures.find(a => a.id === viewStatsId);
                                                const qCount = currentAdv?.questions?.length || 0;
                                                const sortedData = [...statsData].sort((a, b) => {
                                                    let valA = a[modalSortConfig.key];
                                                    let valB = b[modalSortConfig.key];
                                                    if (typeof valA === 'string') return modalSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                                                    return modalSortConfig.direction === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
                                                });

                                                return sortedData.map((s, i) => {
                                                    const bestRaw = qCount > 0 ? Math.round((s.score / 100) * qCount) : 0;
                                                    const firstRaw = (s.first_score !== null && qCount > 0) ? Math.round((s.first_score / 100) * qCount) : null;

                                                    return (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="p-4">{s.player_alias || 'Anónimo'}</td>
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
                )}
            </div>
        </div>
    );
};
