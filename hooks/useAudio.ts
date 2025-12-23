import { useState, useEffect } from 'react';
import { SOUND_URLS } from '../constants';

export const useAudio = (
    initialVolume: number = 1.0,
    initialMuted: boolean = false
) => {
    const [masterVolume, setMasterVolume] = useState(initialVolume);
    const [sfxMuted, setSfxMuted] = useState(initialMuted);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [showAudioHint, setShowAudioHint] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Audio Hint Effect
    useEffect(() => {
        const timer1 = setTimeout(() => setShowAudioHint(true), 1500);
        const timer2 = setTimeout(() => setShowAudioHint(false), 5500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // Global Keys (M)
    useEffect(() => {
        const handleGlobalKeys = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (e.key.toLowerCase() === 'm') {
                setSfxMuted(v => !v);
            }
        };
        window.addEventListener('keydown', handleGlobalKeys);
        return () => window.removeEventListener('keydown', handleGlobalKeys);
    }, []);

    const playSfx = (type: keyof typeof SOUND_URLS, forcedMuted?: boolean) => {
        const isMuted = forcedMuted !== undefined ? forcedMuted : sfxMuted;
        if (isMuted || !SOUND_URLS[type]) return;
        const audio = new Audio(SOUND_URLS[type]);
        audio.volume = 0.4 * masterVolume;
        audio.play().catch(() => { });
    };

    const handleSpeak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        const voice = voices.find(v => v.name === 'Google español') ||
            voices.find(v => v.name.includes('Google') && v.lang.startsWith('es')) ||
            voices.find(v => v.lang.startsWith('es'));

        if (voice) utterance.voice = voice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = masterVolume;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Stop speaking on unmount or updates if needed is handled in component effects mainly,
    // but providing cancel method is good.
    const cancelSpeech = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    return {
        masterVolume, setMasterVolume,
        sfxMuted, setSfxMuted,
        showAudioMenu, setShowAudioMenu,
        showAudioHint, setShowAudioHint,
        isSpeaking, setIsSpeaking,
        playSfx,
        handleSpeak,
        cancelSpeech
    };
};
