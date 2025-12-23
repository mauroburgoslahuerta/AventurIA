import React from 'react';

interface DownloadPopupProps {
    setShowDownloadPopup: (show: boolean) => void;
    downloadHTML: () => void;
}

export const DownloadPopup: React.FC<DownloadPopupProps> = ({ setShowDownloadPopup, downloadHTML }) => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0f172a]/95">
            <div className="glass-card max-w-sm w-full p-8 text-center border border-cyan-500/30 shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-fade-in">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/50">
                    <i className="fa-solid fa-cloud-arrow-down text-2xl text-cyan-400"></i>
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">¡Aventura Lista!</h3>
                <p className="text-white/60 text-xs mb-8 leading-relaxed font-medium">Descarga tu AventurIA para jugar en cualquier lugar sin conexión a internet.</p>
                <button onClick={downloadHTML} className="w-full bg-cyan-500 text-slate-900 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-arrow-down"></i> Descargar Archivo
                </button>
                <button onClick={() => setShowDownloadPopup(false)} className="mt-3 text-white/40 text-[9px] hover:text-white font-bold uppercase tracking-widest transition-colors">Cancelar</button>
            </div>
        </div>
    );
};
