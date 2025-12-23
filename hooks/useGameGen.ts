import React, { useState } from 'react';
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

    /* 
     * 🔒 BLINDAJE: TRIPLE FALLBACK DE IMÁGENES (CRÍTICO)
     * ESTRATEGIA: Gemini -> Pollinations (Flux) -> Pollinations (Turbo/Default)
     * NO TOCAR SIN VALIDACIÓN.
     */
    const fetchSmartImage = async (prompt: string, isRegen: boolean): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            const attemptPollinations = (model: string) => {
                const encodedPrompt = encodeURIComponent(prompt);
                const modelParam = model ? `&model=${model}` : '';
                const url = `/pollinations/prompt/${encodedPrompt}?width=1024&height=600${modelParam}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

                const img = new Image();
                const safetyTimeout = setTimeout(() => {
                    img.src = "";
                    img.onerror?.(new Event('timeout'));
                }, 20000); // 20s timeout

                img.src = url;
                img.onload = () => {
                    clearTimeout(safetyTimeout);
                    if (!isRegen) setIsUsingPollinations(true);
                    resolve(url);
                };
                img.onerror = () => {
                    clearTimeout(safetyTimeout);
                    if (model === 'flux') {
                        console.warn("Flux failed, trying Turbo...");
                        attemptPollinations('turbo');
                    } else if (model === 'turbo') {
                        console.warn("Turbo failed, trying Default...");
                        attemptPollinations('');
                    } else {
                        reject(new Error("All Pollinations models failed"));
                    }
                };
            };

            if (isRegen || isUsingPollinations) {
                attemptPollinations('flux');
                return;
            }

            // 1. Gemini Image Generation (High-Volume Model: gemini-2.5-flash-preview-image)
            try {
                // Enforce Quota (Limit 2000)
                const quotaOk = await checkDailyQuota();
                if (!quotaOk) {
                    console.warn("Daily Quota Exceeded (2000). Switching to Pollinations.");
                    throw new Error("Quota Exceeded");
                }

                console.log("Attempting Gemini 2.5 Flash Preview generation..."); // DEBUG

                const response1 = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                if (!response1.ok) {
                    const errorData = await response1.json().catch(() => ({}));
                    console.error("Gemini 2.5 API Error Details:", errorData);
                    throw new Error(`Gemini API Error: ${response1.status} - ${JSON.stringify(errorData)}`);
                }

                const data1 = await response1.json();

                let imgUrl = '';
                // Parse Gemini generateContent response
                const parts = data1.candidates?.[0]?.content?.parts || [];
                const imagePart = parts.find((p: any) => p.inlineData);

                if (imagePart) {
                    const inlineData = imagePart.inlineData;
                    imgUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
                } else {
                    // Fallback logging
                    console.warn("Gemini response parts:", parts);
                    if (parts.some((p: any) => p.text)) {
                        console.warn("Gemini returned text:", parts.find((p: any) => p.text)?.text);
                    }
                    throw new Error("No Gemini image data in response");
                }

                // Validate image loads
                const img = new Image();
                img.src = imgUrl;
                img.onload = () => {
                    incrementDailyQuota();
                    resolve(imgUrl);
                };
                img.onerror = () => { throw new Error("Gemini blob failed load"); };

            } catch (geminiError) {
                console.error("Gemini 2.5 Flash Preview failed. Switching to Pollinations. Reason:", geminiError);
                // showToast("⚠️ Fallo en Gemini. Usando Pollinations.");
                setIsUsingPollinations(true);
                attemptPollinations('flux');
            }
        });
    };

    const generateImage = async (index: number, prompt: string, forceRegen: boolean = false, currentQIndex: number, questions: Question[]) => {
        if (!prompt) return;

        // Only show loading state if we are regenerating the CURRENTLY viewed image
        if (index === currentQIndex) {
            setIsImageReady(false);
        }

        // Check if image already exists
        if (questions[index]?.imageData && !isRegeneratingImage && !forceRegen) {
            setIsImageReady(true);
            return;
        }

        const startPollinations = (modelToStartWith: string) => {
            attemptPollinations(modelToStartWith);
        };

        const attemptPollinations = (model: string) => {
            const encodedPrompt = encodeURIComponent(prompt);
            // If model string is empty/null, Pollinations uses default (Midjourney-like)
            const modelParam = model ? `&model=${model}` : '';
            const url = `/pollinations/prompt/${encodedPrompt}?width=1024&height=600${modelParam}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

            const img = new Image();

            // Safety Timeout: 12 seconds max per try
            const safetyTimeout = setTimeout(() => {
                img.src = ""; // Cancel load
                img.onerror?.(new Event('timeout'));
            }, 12000);

            img.src = url;
            img.onload = () => {
                clearTimeout(safetyTimeout);
                setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageData: url } : q));
                setIsImageReady(true);
                setIsRegeneratingImage(false);
                if (!isRegeneratingImage) setIsUsingPollinations(true);
            };
            img.onerror = () => {
                clearTimeout(safetyTimeout);
                if (model === 'flux') {
                    console.warn("Pollinations Flux failed (or timeout), retrying with Turbo...");
                    attemptPollinations('turbo');
                } else if (model === 'turbo') {
                    console.warn("Pollinations Turbo failed, retrying with Default...");
                    attemptPollinations('');
                } else {
                    console.error("All image generation attempts failed.");
                    setImgError(true);
                    setIsImageReady(true);
                    setIsRegeneratingImage(false);
                }
            };
        };

        // LOGIC: If regenerating OR already flagging quota exceeded, skip Gemini.
        // 'forceRegen' parameter ensures we don't rely on async state 'isRegeneratingImage' exclusively.
        if (forceRegen || isRegeneratingImage || isUsingPollinations) {
            startPollinations('flux');
            return;
        }

        // 2. Main Generation Logic - Gemini 2.5 Flash Preview
        try {
            // Enforce Quota
            const quotaOk = await checkDailyQuota();
            if (!quotaOk) {
                throw new Error("Quota Exceeded");
            }

            const response1 = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response1.ok) {
                const errorData = await response1.json().catch(() => ({}));
                console.error("Gemini 2.5 API Error Details:", errorData);
                throw new Error(`Gemini API Error: ${response1.status} - ${JSON.stringify(errorData)}`);
            }

            const data1 = await response1.json();

            let imgUrl = '';
            const parts = data1.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData);

            if (imagePart) {
                const inlineData = imagePart.inlineData;
                imgUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
            } else {
                console.error("Invalid Gemini response structure (No Image Part):", data1);
                throw new Error("No Gemini data in response");
            }

            // Success
            setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageData: imgUrl } : q));
            setIsImageReady(true);
            setIsRegeneratingImage(false);
            incrementDailyQuota();

        } catch (e) {
            console.warn("Gemini 2.5 failed, switching to Pollinations...", e);
            // showToast("⚠️ Fallo en Gemini. Usando Pollinations.");
            setIsUsingPollinations(true);
            startPollinations('flux');
        }
    };

    const preloadImages = (qs: Question[], startIndex: number) => {
        // Start from startIndex (avoid re-fetching already preloaded images)
        qs.forEach((q, i) => {
            if (i < startIndex) return;
            setTimeout(() => generateImage(i, q.visualPrompt, false, -1, qs), (i - startIndex + 1) * 4000); // Pass -1 as currentQIndex to avoid loading state flicker
        });
    };

    const generateGame = async (config: GameConfig, setNormalizedTopic: (t: string) => void, setNormalizedAudience: (a: string) => void) => {
        if (!config.topic || !config.audience) return;
        setAppState('generating');
        setLoadingMessage('Conectando con la IA...');
        setIsCreatorMode(true);
        setProgress(10);

        try {
            const data = await generateAdventure(config, setProgress);

            setQuestions(data.questions);
            setNormalizedTopic(data.correctedTopic || config.topic);
            setNormalizedAudience(data.correctedAudience || config.audience);

            setLoadingMessage('Pintando tu aventura...');
            setProgress(40); // Text generation complete

            const preloadCount = Math.min(3, data.questions.length);
            const progressPerImage = 55 / preloadCount; // Distribute ~55% across images to reach ~95%

            for (let i = 0; i < preloadCount; i++) {
                try {
                    if (i > 0) setLoadingMessage(`Generando imagen ${i + 1}/${config.count}...`);

                    const imgUrl = await fetchSmartImage(data.questions[i].visualPrompt, false);
                    data.questions[i].imageData = imgUrl;
                } catch (e) {
                    console.warn(`Preload Q${i} failed`, e);
                } finally {
                    setProgress(prev => Math.min(95, prev + progressPerImage));
                }
            }
            setProgress(100);

            // Update state with ready images
            setQuestions([...data.questions]);

            // --- AUTO-SAVE (Logged In Users) ---
            if (user) {
                try {
                    const { data: savedData, error: saveError } = await supabase
                        .from('adventures')
                        .insert({
                            topic: data.correctedTopic || config.topic,
                            audience: data.correctedAudience || config.audience,
                            questions: data.questions,
                            config: config,
                            thumbnail_url: data.questions[0]?.imageData || '',
                            user_id: user.id
                        })
                        .select()
                        .single();

                    if (!saveError && savedData) {
                        console.log("Auto-saved adventure:", savedData.id);
                        // Update URL silently
                        const newUrl = `${window.location.pathname}?id=${savedData.id}`;
                        window.history.pushState({ path: newUrl }, '', newUrl);
                    }
                } catch (err) {
                    console.error("Auto-save failed:", err);
                }
            }

            // Start Background Preloading
            preloadImages(data.questions, preloadCount);

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
        fetchSmartImage,
        generateImage,
        generateGame,
        preloadImages
    };
};
