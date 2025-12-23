import React from 'react';

interface AudioControlsProps {
    showAudioMenu: boolean;
    setShowAudioMenu: (show: boolean) => void;
    sfxMuted: boolean;
    setSfxMuted: (muted: boolean) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
    showAudioMenu,
    setShowAudioMenu,
    sfxMuted,
    setSfxMuted
}) => {
    return (
        <div className="fixed top-4 left-4 z-[300] flex flex-col gap-2 items-start">
            <button
                onClick={() => setShowAudioMenu(!showAudioMenu)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg border ${showAudioMenu ? 'bg-cyan-500 text-slate-900 border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}
            >
                <i className="fa-solid fa-volume-high"></i>
            </button>
            {showAudioMenu && (
                <div className="absolute top-full left-0 mt-3 p-4 bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl w-48 animate-fade-in-down z-[100]">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Efectos</span>
                        <button onClick={() => setSfxMuted(!sfxMuted)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${sfxMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                            {sfxMuted ? 'SILENCIADO' : 'ACTIVO'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
