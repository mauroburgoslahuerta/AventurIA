import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { trackEvent, triggerHaptic, recordGameScore as apiRecordScore, incrementPlayCount as apiIncrementPlay } from '../utils';
import { AppState, GameConfig, Question } from '../types';

export const useGameState = (
    initialState: AppState = 'setup',
    playSfx: (type: any, muted: boolean) => void,
    sfxMuted: boolean,
    user: any
) => {
    // 1. Detect URL ID immediately
    const urlId = new URLSearchParams(window.location.search).get('id');
    // If URL has ID, we start in 'generating' (loading) state to let Parent fetch data, UNLESS local storage overrides.
    // Actually, safest is to let Parent handle the fetch if it detects ID. 
    // We just need to make sure we don't overwrite it.
    // FORCE 'setup' is the default only if NO URL ID.
    const startState: AppState = urlId ? 'generating' : initialState;

    const [appState, setAppState] = useState<AppState>(startState);
    const [config, setConfig] = useState<GameConfig>({
        topic: '',
        audience: '',
        count: 5,
        timerSeconds: 0,
        difficulty: 'medium'
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [timer, setTimer] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [turnStarted, setTurnStarted] = useState(false);

    // Persistence for shared games
    const [playerAlias, setPlayerAlias] = useState<string>('');
    const [normalizedTopic, setNormalizedTopic] = useState('');
    const [normalizedAudience, setNormalizedAudience] = useState('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isCreatorMode, setIsCreatorMode] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const isSharedAdventureRef = useRef(false);

    // Persistence Logic (Load on Mount)
    useEffect(() => {
        const saved = localStorage.getItem('aventuria_gamestate');
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id');

        if (saved && urlId) {
            try {
                const parsed = JSON.parse(saved);
                // Only restore if the saved state belongs to THIS adventure ID
                if (parsed.adventureId === urlId && parsed.appState && parsed.appState !== 'setup' && parsed.appState !== 'summary' && parsed.appState !== 'generating') {
                    setAppState(parsed.appState);
                    setConfig(parsed.config);
                    setQuestions(parsed.questions);
                    setCurrentQIndex(parsed.currentQIndex);
                    setScore(parsed.score);
                    setStreak(parsed.streak);
                    setCorrectCount(parsed.correctCount);
                    setNormalizedTopic(parsed.normalizedTopic);
                    setNormalizedAudience(parsed.normalizedAudience);
                    // showToast("🔄 Partida recuperada"); // Toast managed in main/utils or we need callback
                }
            } catch (e) { console.error("Failed to load save", e); }
        }
    }, []);

    // Persistence Saver
    useEffect(() => {
        // Sanitize state: Remove large images
        const sanitizedQuestions = questions.map(q => ({
            ...q,
            imageData: null
        }));

        const stateToSave = {
            appState,
            config,
            questions: sanitizedQuestions,
            currentQIndex,
            score,
            streak,
            correctCount,
            normalizedTopic,
            normalizedAudience,
            sfxMuted, // Note: sfxMuted passed from prop, might need sync
            adventureId: new URLSearchParams(window.location.search).get('id')
        };

        try {
            localStorage.setItem('aventuria_gamestate', JSON.stringify(stateToSave));
        } catch (e) {
            console.warn("LocalStorage Error:", e);
        }
    }, [appState, config, questions, currentQIndex, score, streak, correctCount, normalizedTopic, normalizedAudience, sfxMuted]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (appState === 'playing' && config.timerSeconds > 0 && timer > 0 && feedback === 'none' && !isEditing) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        playSfx('wrong', sfxMuted);
                        setFeedback('wrong');
                        setStreak(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [appState, config.timerSeconds, timer, feedback, sfxMuted, isEditing]);

    // Reset Logic
    const resetGameState = () => {
        setScore(0);
        setStreak(0);
        setCorrectCount(0);
        setCurrentQIndex(0);
        setFeedback('none');
        setSelectedOption(null);
        setTimer(config.timerSeconds);
        localStorage.removeItem('aventuria_gamestate');
    };

    const handleGoHome = () => {
        resetGameState();
        window.history.pushState({}, '', window.location.pathname);
        setAppState('setup');
        setIsCreatorMode(false);
    };

    const handleNext = async () => {
        playSfx('click', sfxMuted);
        setFeedback('none');
        setSelectedOption(null);
        setShowHint(false);
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(v => v + 1);
        } else {
            const finalScore = Math.round(((score + (feedback === 'correct' ? 0 : 0)) / questions.length) * 100);
            const params = new URLSearchParams(window.location.search);
            const adventureId = params.get('id');

            if (adventureId) {
                await apiRecordScore(adventureId, finalScore, playerAlias, isCreatorMode);
            }

            trackEvent('game_complete', 'Gameplay', 'Score', finalScore);
            setAppState('summary');
        }
    };

    const handleOptionClick = (index: number) => {
        if (feedback !== 'none') return;
        setSelectedOption(index);
        setTurnStarted(true);

        if (showConfetti) setShowConfetti(false);

        const isCorrect = index === questions[currentQIndex].correctIndex;
        if (isCorrect) {
            triggerHaptic(50);
            playSfx('correct', sfxMuted);
            setScore(s => s + 1);
            setStreak(s => s + 1);
            setCorrectCount(c => c + 1);
            setFeedback('correct');
            if (streak > 0 && streak % 3 === 0) {
                setShowConfetti(true);
                triggerHaptic([50, 50, 50, 50, 50]);
            }
        } else {
            triggerHaptic([50, 100, 50]);
            playSfx('wrong', sfxMuted);
            setStreak(0);
            setFeedback('wrong');
        }
    };

    return {
        appState, setAppState,
        config, setConfig,
        questions, setQuestions,
        currentQIndex, setCurrentQIndex,
        score, setScore,
        streak, setStreak,
        correctCount, setCorrectCount,
        feedback, setFeedback,
        selectedOption, setSelectedOption,
        timer, setTimer,
        showConfetti, setShowConfetti,
        showHint, setShowHint,
        turnStarted, setTurnStarted,
        playerAlias, setPlayerAlias,
        normalizedTopic, setNormalizedTopic,
        normalizedAudience, setNormalizedAudience,
        loadingMessage, setLoadingMessage,
        progress, setProgress,
        errorMsg, setErrorMsg,
        isCreatorMode, setIsCreatorMode,
        isSharing, setIsSharing,
        showShareMenu, setShowShareMenu,
        isEditing, setIsEditing,
        isSharedAdventureRef,
        handleGoHome,
        resetGameState,
        handleNext,
        handleOptionClick,
    };
};
