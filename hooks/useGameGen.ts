import React, { useState, useRef } from 'react';
import { requestAdventureTicket, formatCompletedQuestions } from '../services/aiService';
import { supabase } from '../supabaseClient';
import { Question, GameConfig } from '../types';

export const useGameGen = (
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>,
    setAppState: (state: any) => void,
    setLoadingMessage: (msg: string) => void,
    setProgress: React.Dispatch<React.SetStateAction<number>>,
    setErrorMsg: (msg: string | null) => void,
    setIsCreatorMode: (val: boolean) => void,
    user: any
) => {
    const [isImageReady, setIsImageReady] = useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [isUsingPollinations, setIsUsingPollinations] = useState(false);
    const isUsingPollinationsRef = useRef(false);
    const inProgressImages = useRef<Set<number>>(new Set());
    const pollingIntervalRef = useRef<number | null>(null);

    const generateImage = async (index: number, prompt: string, forceRegen: boolean = false, currentQIndex: number, questions: Question[]) => {
        if (!prompt) return;

        if (!user) {
            console.warn("Guest users cannot regenerate images.");
            return;
        }

        const adventureId = new URLSearchParams(window.location.search).get('id');
        if (!adventureId) {
            console.error("No adventure ID found in URL. Cannot regenerate image.");
            return;
        }

        if (index === currentQIndex) {
            setIsImageReady(false);
        }

        if (questions[index]?.imageData && !isRegeneratingImage && !forceRegen) {
            setIsImageReady(true);
            return;
        }

        if (!forceRegen && inProgressImages.current.has(index)) {
            return;
        }
        inProgressImages.current.add(index);

        try {
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: { adventure_id: adventureId, question_index: index, prompt: prompt }
            });

            if (error) throw error;
            if (data?.error) {
                if (data.error === 'Saldo insuficiente para regenerar la imagen' || data.status === 402) {
                    alert('Saldo insuficiente para regenerar la imagen (Se requieren 15 créditos).');
                }
                throw new Error(data.error);
            }

            if (data?.imageData) {
                setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageData: data.imageData, source: 'ai' } : q));
                setIsImageReady(true);
                setIsRegeneratingImage(false);
                inProgressImages.current.delete(index);
            } else {
                throw new Error("No image data in response");
            }

        } catch (e: any) {
            console.error("Image generation failed:", e);
            if (e.message && e.message.includes("402")) {
                alert('Saldo insuficiente para regenerar la imagen (Se requieren 15 créditos).');
            }
            setImgError(true);
            setIsImageReady(true);
            setIsRegeneratingImage(false);
            inProgressImages.current.delete(index);
        }
    };

    const preloadImages = (qs: Question[], startIndex: number) => {
        qs.forEach((q, i) => {
            if (i < startIndex) return;
            setTimeout(() => generateImage(i, q.visualPrompt, false, -1, qs), (i - startIndex + 1) * 2000);
        });
    };

    const clearPolling = () => {
        if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const generateGame = async (config: GameConfig, setNormalizedTopic: (t: string) => void, setNormalizedAudience: (a: string) => void) => {
        if (!config.topic || !config.audience) return;

        isUsingPollinationsRef.current = false;
        setIsUsingPollinations(false);
        inProgressImages.current.clear();
        clearPolling();

        setAppState('generating');
        setLoadingMessage('Iniciando sistema... preparando créditos y servidor...');
        setIsCreatorMode(true);
        setProgress(5);

        try {
            // 1. OBTENER EL TICKET
            const ticket = await requestAdventureTicket(config);
            setLoadingMessage('¡Aventura en proceso! El servidor está trabajando en segundo plano...');
            
            // Lógica de progreso simulado
            let progressValue = 10;
            const progressTimer = setInterval(() => {
                progressValue += (90 - progressValue) * 0.10;
                setProgress(progressValue);
            }, 1000);

            // 2. POLLING AL SERVIDOR (Fire & Forget Check)
            pollingIntervalRef.current = window.setInterval(async () => {
                const { data, error } = await supabase
                    .from('adventures')
                    .select('*')
                    .eq('id', ticket.adventureId)
                    .single();

                if (error) {
                    console.error("Error al consultar el estado de la aventura:", error);
                    return; // Retries next interval
                }

                if (data.status === 'completed') {
                    clearPolling();
                    clearInterval(progressTimer);
                    setProgress(100);

                    // Formatear preguntas recibidas (shuffle + fallback map)
                    const formattedQuestions = formatCompletedQuestions(data.questions);
                    
                    setQuestions(formattedQuestions);
                    setNormalizedTopic(data.topic);
                    setNormalizedAudience(data.audience);

                    // Actualizar URL al ID real (el auto-save ya se hizo en el backend)
                    const newUrl = `${window.location.pathname}?id=${data.id}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);

                    setTimeout(() => setAppState('start_screen'), 500);
                } else if (data.status === 'failed') {
                    clearPolling();
                    clearInterval(progressTimer);
                    setErrorMsg(`Error en el servidor: ${data.error_message || 'Desconocido'}`);
                    setAppState('setup');
                }
            }, 3000); // Polling cada 3 segundos

        } catch (error) {
            console.error(error);
            clearPolling();
            const msg = error instanceof Error ? error.message : String(error);
            setErrorMsg(`Error: ${msg}`);
            setAppState('setup');
        }
    };

    // Cleanup al desmontar
    React.useEffect(() => {
        return () => clearPolling();
    }, []);

    return {
        isImageReady, setIsImageReady,
        isRegeneratingImage, setIsRegeneratingImage,
        imgError, setImgError,
        isUsingPollinations, setIsUsingPollinations,
        generateImage,
        generateGame,
        preloadImages
    };
};
