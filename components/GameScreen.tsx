import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameConfig, Question, SoundType } from '../types';

interface GameScreenProps {
    appState: string;
    setAppState: (state: any) => void;
    handleGoHome: () => void;
    normalizedTopic: string;
    config: GameConfig;
    timer: number;
    streak: number;
    correctCount: number;
    score: number;
    questions: Question[];
    currentQIndex: number;
    isImageReady: boolean;
    setIsImageReady: (ready: boolean) => void;
    isRegeneratingImage: boolean;
    imgError: boolean;
    setImgError: (error: boolean) => void;
    feedback: string;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    handleRegenerateImage: () => void;
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    setCurrentQIndex: React.Dispatch<React.SetStateAction<number>>;
    isSpeaking: boolean;
    setIsSpeaking: (speaking: boolean) => void;
    handleSpeak: (text: string) => void;
    selectedOption: number | null;
    handleOptionClick: (index: number) => void;
    showHint: boolean;
    setShowHint: (show: boolean) => void;
    handleNext: () => void;
    playSfx: (type: SoundType) => void;

    isCreatorMode?: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = ({
    appState,
    setAppState,
    handleGoHome,
    normalizedTopic,
    config,
    timer,
    streak,
    correctCount,
    score,
    questions,
    currentQIndex,
    isImageReady,
    setIsImageReady,
    isRegeneratingImage,
    imgError,
    setImgError,
    feedback,
    isEditing,
    setIsEditing,
    handleRegenerateImage,
    setQuestions,
    setCurrentQIndex,
    isSpeaking,
    setIsSpeaking,
    handleSpeak,
    selectedOption,
    handleOptionClick,
    showHint,
    setShowHint,
    handleNext,
    playSfx,

    isCreatorMode = false,
    isSharedAdventure = false
}) => {
    const pageVariants = {
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
    };

    // --- IMAGE FALLBACK LOGIC ---
    // If current Q has no image, look backwards for the last valid one.
    let displayImage = questions[currentQIndex]?.imageData || "";
    if (!displayImage && !isCreatorMode) {
        for (let i = currentQIndex - 1; i >= 0; i--) {
            if (questions[i].imageData) {
                displayImage = questions[i].imageData;
                break;
            }
        }
    }

    return (
        <motion.div
            key="playing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-7xl h-full flex flex-col py-4 z-10 overflow-hidden"
        >
            <div className="flex justify-between items-center mb-6 bg-white/[0.03] backdrop-blur-3xl p-5 rounded-3xl border border-white/10 shrink-0 relative">
                <div className="flex items-center z-10">
                    {!isSharedAdventure && <button onClick={handleGoHome} className="flex items-center gap-3 bg-white/5 hover:bg-white hover:text-slate-900 px-6 py-2 rounded-2xl transition-all border border-white/10 font-black text-[10px] uppercase tracking-widest"><i className="fa-solid fa-house"></i> Inicio</button>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="hidden md:block text-xs md:text-sm font-black uppercase text-cyan-400 tracking-widest bg-[#0f172a]/80 px-4 py-1 rounded-full backdrop-blur-md border border-white/5 shadow-xl">{normalizedTopic}</span>
                </div>

                <div className="flex items-center gap-4 z-10">
                    {config.timerSeconds > 0 && !isEditing && (
                        <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 animate-fade-in">
                            <i className={`fa-solid fa-clock text-amber-500 ${timer < 6 ? 'animate-pulse' : ''}`}></i>
                            <span className="font-black text-xs text-amber-500">{timer}s</span>
                        </div>
                    )}
                    <div className={`bg-orange-500/10 border border-orange-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 transition-opacity duration-300 ${streak >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                        <i className={`fa-solid fa-fire text-orange-500 ${streak >= 3 ? 'animate-bounce' : ''}`}></i>
                        <span className="font-black text-xs text-orange-500">{streak}</span>
                    </div>

                    <div className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-3 rounded-2xl font-black text-cyan-400 text-xs tracking-widest">{score}/{questions.length}</div>
                </div>
            </div>

            <div className="flex-1 glass-card overflow-hidden flex flex-col md:flex-row border border-white/10 relative">
                <div className="md:w-[45%] bg-black/40 relative h-48 md:h-auto overflow-hidden">
                    {!isImageReady && !isRegeneratingImage && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/60 backdrop-blur-md">
                            <div className="w-10 h-10 border-4 border-white/10 border-l-cyan-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    {isRegeneratingImage && <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-cyan-400">Regenerando...</div>}
                    <img
                        key={displayImage}
                        src={displayImage}
                        className={`w-full h-full object-cover transition-opacity duration-500 ${isImageReady && !imgError ? 'opacity-60' : 'opacity-0'} ${imgError ? 'hidden' : ''}`}
                        onLoad={() => setIsImageReady(true)}
                        onError={() => {
                            console.warn("Image Failed to Load");
                            setIsImageReady(true);
                            setImgError(true);
                        }}
                    />
                    {imgError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 border-r border-white/10 animate-fade-in">
                            <i className="fa-solid fa-image text-4xl text-white/10 mb-4"></i>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Imagen no disponible</span>
                        </div>
                    )}
                    {feedback !== 'none' && !isEditing && (
                        <div className="fixed inset-0 z-[100] md:absolute md:inset-0 md:z-50 bg-[#0f172a]/95 backdrop-blur-3xl px-6 py-8 md:p-10 flex flex-col items-center text-center animate-fade-in overflow-hidden">
                            <div className="flex-1 w-full overflow-y-auto custom-scrollbar min-h-0 px-2">
                                <div className="min-h-full flex flex-col justify-center items-center py-4 md:py-8">
                                    <span className={`shrink-0 text-[10px] font-black uppercase tracking-[0.5em] mb-6 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {feedback === 'correct' ? (streak >= 3 ? '¡ESTÁS EN RACHA! 🔥' : '¡MISIÓN LOGRADA!') : 'ANÁLISIS DEL ERROR'}
                                    </span>
                                    <p className="text-white text-sm md:text-lg italic font-medium max-w-md leading-relaxed">"{questions[currentQIndex].explanation}"</p>

                                    <button onClick={handleNext} className="mt-8 bg-cyan-500 text-slate-900 font-black px-8 py-3 md:px-10 md:py-4 rounded-xl uppercase text-[10px] md:text-[12px] tracking-[0.2em] hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)] flex items-center gap-2 group">
                                        Siguiente <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isCreatorMode && (
                        <div className="absolute bottom-6 right-6 z-[100] group/edit">
                            {!isEditing && (
                                <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap animate-bounce">
                                    <div className="bg-cyan-500 text-slate-900 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg relative">
                                        ¡Edita el contenido!
                                        <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-cyan-500"></div>
                                    </div>
                                </div>
                            )}
                            <button onClick={() => { playSfx('click'); setIsEditing(!isEditing); }} className={`p-5 rounded-full shadow-3xl transition-all border ${isEditing ? 'bg-cyan-500 text-slate-900 border-white scale-110' : 'bg-white/10 text-white border-white/20 hover:bg-white hover:text-slate-900'}`}>
                                <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-pen-to-square'} text-lg`}></i>
                            </button>
                        </div>
                    )}
                </div>
                <div className="md:w-[55%] p-6 md:p-10 flex flex-col relative overflow-hidden h-full">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/20 text-cyan-400 font-black text-[10px] uppercase tracking-[0.2em]">RETO {currentQIndex + 1} DE {questions.length}</div>
                        {isEditing && <span className="text-[10px] font-black text-amber-500 uppercase animate-pulse">Modo Edición Activo</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-4">
                        {isEditing ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/50">Pregunta</label>
                                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-cyan-500/50" rows={3} value={questions[currentQIndex].question} onChange={e => setQuestions(prev => prev.map((q, idx) => idx === currentQIndex ? { ...q, question: e.target.value } : q))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/50">Visual Prompt (Sin spoilers)</label>
                                    <div className="flex gap-3">
                                        <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold" value={questions[currentQIndex].visualPrompt} onChange={e => setQuestions(prev => prev.map((q, idx) => idx === currentQIndex ? { ...q, visualPrompt: e.target.value } : q))} />
                                        <button onClick={handleRegenerateImage} disabled={isRegeneratingImage} className="bg-cyan-500 px-6 rounded-2xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all shrink-0">
                                            {isRegeneratingImage ? <i className="fa-solid fa-spinner animate-spin"></i> : "Regenerar"}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/50">Opciones</label>
                                    {questions[currentQIndex].options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <input type="radio" checked={questions[currentQIndex].correctIndex === i} onChange={() => setQuestions(prev => prev.map((q, idx) => idx === currentQIndex ? { ...q, correctIndex: i } : q))} className="w-5 h-5 accent-cyan-500" />
                                            <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold" value={opt} onChange={e => {
                                                const newVal = e.target.value;
                                                setQuestions(prev => prev.map((q, idx) => {
                                                    if (idx !== currentQIndex) return q;
                                                    const newOpts = [...q.options];
                                                    newOpts[i] = newVal;
                                                    return { ...q, options: newOpts };
                                                }));
                                            }} />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                                    <button
                                        onClick={() => { playSfx('click'); if (currentQIndex > 0) setCurrentQIndex(i => i - 1); }}
                                        disabled={currentQIndex === 0}
                                        className="flex-1 py-4 rounded-xl bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-arrow-left"></i> Anterior
                                    </button>
                                    <button
                                        onClick={() => { playSfx('click'); if (currentQIndex < questions.length - 1) setCurrentQIndex(i => i + 1); }}
                                        disabled={currentQIndex === questions.length - 1}
                                        className="flex-1 py-4 rounded-xl bg-cyan-500 text-slate-900 font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        Siguiente <i className="fa-solid fa-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div key={currentQIndex} className="animate-slide-up h-full flex flex-col">
                                <div className="flex items-start gap-4 mb-4">
                                    <h2 className="text-lg md:text-xl font-extrabold leading-tight text-white/95 break-words hyphens-auto flex-1">{questions[currentQIndex].question}</h2>
                                    <button
                                        onClick={() => {
                                            if (isSpeaking) {
                                                window.speechSynthesis.cancel();
                                                setIsSpeaking(false);
                                            } else {
                                                handleSpeak(questions[currentQIndex].question);
                                            }
                                        }}
                                        className={`p-3 rounded-xl transition-all ${isSpeaking ? 'bg-cyan-500 text-slate-900 animate-pulse' : 'bg-white/5 text-white/30 hover:text-cyan-400 hover:bg-white/10'}`}
                                    >
                                        <i className={`fa-solid ${isSpeaking ? 'fa-ear-listen animate-pulse' : 'fa-ear-listen'}`}></i>
                                    </button>
                                </div>
                                <div className="space-y-2 flex-1">
                                    {questions[currentQIndex].options.map((opt, i) => {
                                        const isCorrect = i === questions[currentQIndex].correctIndex;
                                        const isSelected = i === selectedOption;
                                        let statusClass = "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]";
                                        if (feedback !== 'none') {
                                            if (isCorrect) statusClass = "bg-emerald-500/30 border-emerald-500/80 scale-[1.01] shadow-[0_0_30px_rgba(16,185,129,0.3)] text-emerald-300 ring-1 ring-emerald-500/40";
                                            else if (isSelected) statusClass = "bg-red-500/20 border-red-500/60 opacity-60";
                                            else statusClass = "bg-white/[0.01] border-white/5 opacity-30";
                                        }
                                        return (
                                            <button key={i} onClick={() => handleOptionClick(i)} className={`w-full p-3 md:p-4 rounded-xl text-left border flex items-center gap-4 transition-all group ${statusClass}`}>
                                                <span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs bg-white/10 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all shrink-0">{String.fromCharCode(65 + i)}</span>
                                                <span className="flex-1 font-bold text-[10px] md:text-sm leading-snug compact-text">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button onClick={() => { if (feedback === 'none') { playSfx('hint'); setShowHint(!showHint); } }} className="mt-8 text-cyan-500/40 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 hover:text-cyan-400 transition-colors shrink-0">
                                    <i className="fa-regular fa-lightbulb"></i> {showHint ? questions[currentQIndex].hint : "Solicitar Pista"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
