import React, { useState, useRef } from 'react';
import { generateAdventure } from '../services/aiService';
import { checkDailyQuota, incrementDailyQuota } from '../utils';
import { supabase } from '../supabaseClient';
import { Question, GameConfig } from '../types';

// CRITICAL: TRIPLE FALLBACK LOGIC PRESERVED
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
    // Ref to avoid stale closure bug: async functions always read the current value
    const isUsingPollinationsRef = useRef(false);
    // Guard against duplicate concurrent generation for the same question index
    const inProgressImages = useRef<Set<number>>(new Set());

    const generateImage = async (index: number, prompt: string, forceRegen: boolean = false, currentQIndex: number, questions: Question[]) => {
        if (!prompt) return;

        // Si es invitado, no puede regenerar
        if (!user) {
            console.warn("Guest users cannot regenerate images.");
            return;
        }

        const adventureId = new URLSearchParams(window.location.search).get('id');
        if (!adventureId) {
            console.error("No adventure ID found in URL. Cannot regenerate image.");
            return;
        }

        // Only show loading state if we are regenerating the CURRENTLY viewed image
        if (index === currentQIndex) {
            setIsImageReady(false);
        }

        // Check if image already exists
        if (questions[index]?.imageData && !isRegeneratingImage && !forceRegen) {
            setIsImageReady(true);
            return;
        }

        // Guard: prevent duplicate concurrent generation for the same index
        if (!forceRegen && inProgressImages.current.has(index)) {
            return;
        }
        inProgressImages.current.add(index);

        // Main Generation Logic - Supabase Edge Function
        try {
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    adventure_id: adventureId,
                    question_index: index,
                    prompt: prompt
                }
            });

            if (error) {
                // El cliente arroja un HttpError si no es 2xx, o podemos leer error
                throw error;
            }

            if (data?.error) {
                if (data.error === 'Saldo insuficiente para regenerar la imagen' || data.status === 402) {
                    alert('Saldo insuficiente para regenerar la imagen (Se requieren 15 créditos).');
                }
                throw new Error(data.error);
            }

            if (data?.imageData) {
                // Success
                setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageData: data.imageData, source: 'ai' } : q));
                setIsImageReady(true);
                setIsRegeneratingImage(false);
                inProgressImages.current.delete(index);
            } else {
                throw new Error("No image data in response");
            }

        } catch (e: any) {
            console.error("Image generation failed:", e);
            
            // Re-throw or show error alert if it's 402
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
        // Start from startIndex (avoid re-fetching already preloaded images)
        qs.forEach((q, i) => {
            if (i < startIndex) return;
            setTimeout(() => generateImage(i, q.visualPrompt, false, -1, qs), (i - startIndex + 1) * 2000); // Pass -1 as currentQIndex to avoid loading state flicker
        });
    };

    const generateGame = async (config: GameConfig, setNormalizedTopic: (t: string) => void, setNormalizedAudience: (a: string) => void) => {
        if (!config.topic || !config.audience) return;

        // RESET: each new adventure starts fresh — Gemini gets a clean first try
        isUsingPollinationsRef.current = false;
        setIsUsingPollinations(false);
        inProgressImages.current.clear();

        setAppState('generating');
        setLoadingMessage('Generando aventura con IA (esto puede tardar unos segundos)...');
        setIsCreatorMode(true);
        setProgress(10);

        try {
            const data = await generateAdventure(config, setProgress);

            setQuestions(data.questions);
            setNormalizedTopic(data.correctedTopic || config.topic);
            setNormalizedAudience(data.correctedAudience || config.audience);

            setProgress(100);

            // Update state with ready images
            setQuestions([...data.questions]);

            // --- AUTO-SAVE (ALL USERS) ---
            try {
                const { data: savedData, error: saveError } = await supabase
                    .from('adventures')
                    .insert({
                        topic: data.correctedTopic || config.topic,
                        audience: data.correctedAudience || config.audience,
                        questions: data.questions,
                        config: config,
                        thumbnail_url: data.questions[0]?.imageData || '',
                        user_id: user?.id || null // Handle anon users
                    })
                    .select()
                    .single();

                if (!saveError && savedData) {
                    console.log("Auto-saved adventure:", savedData.id);
                    // Update URL silently
                    const newUrl = `${window.location.pathname}?id=${savedData.id}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                } else if (saveError) {
                    // Log but don't stop flow
                    console.warn("Auto-save failed (likely permissions):", saveError);
                }
            } catch (err) {
                console.error("Auto-save exception:", err);
            }

            setTimeout(() => {
                setAppState('start_screen');
            }, 500);
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : String(error);
            setErrorMsg(`Error: ${msg}`);
            setAppState('setup');
        }
    };

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
