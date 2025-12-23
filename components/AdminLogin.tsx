import React from 'react';

interface AdminLoginProps {
    adminPassword: string;
    setAdminPassword: (password: string) => void;
    handleAdminLogin: () => void;
    setAppState: (state: any) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
    adminPassword,
    setAdminPassword,
    handleAdminLogin,
    setAppState
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in space-y-6">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Acceso Studio Pro</h2>
            <input
                type="password"
                placeholder="Contraseña Maestra..."
                className="bg-white/10 border-2 border-white/20 rounded-xl px-6 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 font-mono text-center tracking-[0.5em] w-64 transition-all"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <div className="flex gap-4">
                <button onClick={() => setAppState('setup')} className="text-white/40 hover:text-white px-4 py-2 uppercase text-xs font-bold tracking-widest transition-colors">Volver</button>
                <button onClick={handleAdminLogin} className="bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]">Entrar</button>
            </div>
        </div>
    );
};
