import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoModalProps {
    onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'philosophy' | 'mechanics' | 'tips'>('philosophy');

    const tabs = [
        { id: 'philosophy', label: 'Filosofía', icon: 'fa-heart' },
        { id: 'mechanics', label: 'Mecánicas', icon: 'fa-microchip' },
        { id: 'tips', label: 'Pro Tips', icon: 'fa-wand-magic-sparkles' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <i className="fa-solid fa-info text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider">Sobre AventurIA</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Descubre lo invisible</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-black/20">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20'
                                    : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon}`}></i>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'philosophy' && (
                            <motion.div
                                key="philosophy"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                        <i className="fa-solid fa-pen-to-square"></i> Control Total
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed text-justify">
                                        No eres dependiente de la IA. Tú tienes la última palabra.
                                        Puedes <strong>editar cualquier pregunta, respuesta o explicación</strong> al instante.
                                        Incluso puedes cambiar la imagen generada si no te convence, modificando su descripción visual.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                                        <i className="fa-solid fa-hand-holding-heart"></i> Enfoque Constructivo
                                    </h3>
                                    <p className="text-xs text-slate-300 leading-relaxed text-justify">
                                        No bloqueamos contenido "complicado" (violencia, insultos, temas tabú).
                                        En su lugar, nuestra IA lo <strong>reformula</strong> hacia un enfoque estrictamente educativo.
                                        Transformamos la intención negativa en una lección constructiva.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'mechanics' && (
                            <motion.div
                                key="mechanics"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-brain"></i> Pedagogía Invisible
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        No son preguntas aleatorias. Usamos la <strong>Taxonomía de Bloom</strong> para ajustar
                                        la complejidad cognitiva según la dificultad que elijas (Recordar, Analizar, Crear).
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-image"></i> Resiliencia Visual
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        ¿Falló Gemini? Saltamos a Pollinations (Flux).
                                        ¿Falló Flux? Usamos Turbo. <strong>Siempre habrá una imagen</strong>. El show debe continuar.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'tips' && (
                            <motion.div
                                key="tips"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                    <div className="w-12 bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                        <i className="fa-solid fa-globe text-xl"></i>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-sm font-bold text-white mb-1">Idiomas Secretos</h4>
                                        <p className="text-xs text-slate-300">
                                            La interfaz es en español, pero puedes crear contenido en cualquier idioma.
                                            Solo indícalo en el tema: <strong>"Animals (Inglés)"</strong> o <strong>"Verbes (Francés)"</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                    <div className="w-12 bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <i className="fa-solid fa-ghost text-xl"></i>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-sm font-bold text-white mb-1">Modo Invitado vs Registrado</h4>
                                        <p className="text-xs text-slate-300">
                                            Como invitado, tus aventuras son efímeras. Regístrate para guardar tu historial,
                                            aparecer en los rankings globales y (próximamente) editar tus creaciones.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
