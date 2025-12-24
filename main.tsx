import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { SetupScreen } from './components/SetupScreen';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/GameScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthOverlay } from './components/AuthOverlay';
import { ProfileScreen } from './components/ProfileScreen';
import { FeaturedSidebar } from './components/FeaturedSidebar';
import { AudioControls } from './components/AudioControls';
import { CustomConfetti } from './components/CustomConfetti';
import { DownloadPopup } from './components/DownloadPopup';

// Hooks
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';
import { useAuth } from './hooks/useAuth';
import { useAdmin } from './hooks/useAdmin';
import { useGameGen } from './hooks/useGameGen';

// Utils / Constants
import { supabase } from './supabaseClient';
import {
  incrementPlayCount as apiIncrementPlay,
  uploadToStorage,
  recordGameScore as apiRecordScore
} from './utils';
import { AI_ENGINE_LOGO, LOADING_SUBTITLES } from './constants';
import { Adventure } from './types';

const App = () => {
  // 1. Audio Hook (Bottom-level dependency)
  const {
    masterVolume, sfxMuted, setSfxMuted,
    showAudioMenu, setShowAudioMenu,
    playSfx, handleSpeak, isSpeaking, setIsSpeaking, showAudioHint
  } = useAudio();

  // 2. Auth Hook
  const {
    user,
    setUser,
    showAuthOverlay,
    setShowAuthOverlay,
    handleLoginSuccess,
    handleLogout
  } = useAuth();

  // 3. Game State Hook
  const {
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
    handleOptionClick
  } = useGameState('setup', playSfx, sfxMuted, user);

  // 4. Admin Hook
  const {
    adminPassword, setAdminPassword,
    adminAdventures, setAdminAdventures,
    featuredAdventures,
    adminLoading,
    googleImageCount,
    totalPlays, completionRate, globalAvgScore,
    fetchAdminAdventures, toggleFeatured, deleteAdventure,
    // requestAdminLoad handled locally to connect hooks
  } = useAdmin();

  // 5. Game Gen Hook
  const {
    isImageReady, setIsImageReady,
    isRegeneratingImage,
    imgError, setImgError,
    generateImage,
    generateGame
  } = useGameGen(setQuestions, setAppState, setLoadingMessage, setProgress, setErrorMsg, setIsCreatorMode, user);

  // --- Local UI State (Toasts, Popups) ---
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [flavorText, setFlavorText] = useState(LOADING_SUBTITLES[0]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- Helpers that bridge hooks ---

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  };

  // Auth w/ Toast
  const handleLoginSuccessWithToast = (u: any) => {
    handleLoginSuccess(u);
    showToast(`👋 Hola, ${u.email?.split('@')[0]}`);
  };

  const handleLogoutWithToast = async () => {
    await handleLogout();
    showToast("👋 Sesión cerrada");
  };

  // Connect Admin Load to Game Launch
  const launchAdventure = async (adv: Adventure) => {
    let fullAdventure = adv;
    if (!adv.questions || adv.questions.length === 0) {
      setLoadingMessage('Cargando aventura...');
      setAppState('generating');
      const { data } = await supabase
        .from('adventures')
        .select('*')
        .eq('id', adv.id)
        .single();
      if (data) fullAdventure = data;
    }

    setQuestions(fullAdventure.questions);
    setNormalizedTopic(fullAdventure.topic);
    setNormalizedAudience(fullAdventure.audience);
    setConfig(fullAdventure.config);
    setAppState('start_screen');
    apiIncrementPlay(fullAdventure.id);
  };

  const requestAdminLoad = async (id: string) => {
    const { data } = await supabase.from('adventures').select('*').eq('id', id).single();
    if (data) launchAdventure(data);
  };

  const handleAdminLogin = async () => {
    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      if (response.ok) {
        setAppState('admin_dashboard');
        fetchAdminAdventures();
      } else {
        showToast("⛔ Contraseña incorrecta");
      }
    } catch (e) {
      console.error("Admin login error:", e);
      showToast("❌ Error de conexión");
    }
  };

  // --- Effects ---

  // PWA Install
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Flavor Text Rotator
  useEffect(() => {
    if (appState === 'generating') {
      let i = 0;
      setFlavorText(LOADING_SUBTITLES[0]);
      const interval = setInterval(() => {
        i++;
        if (i < LOADING_SUBTITLES.length) {
          setFlavorText(LOADING_SUBTITLES[i]);
        } else {
          setFlavorText("Generando recursos gráficos...");
        }
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [appState]);

  // Image Gen Trigger (Creator Mode)
  useEffect(() => {
    if (appState === 'playing' && questions[currentQIndex] && !questions[currentQIndex].imageData) {
      if (isCreatorMode) {
        generateImage(currentQIndex, questions[currentQIndex].visualPrompt, false, currentQIndex, questions);
      }
    }
  }, [currentQIndex, appState, questions, isCreatorMode]);


  // Shared Adventure Load (URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adventureId = params.get('id');

    // Only load if NOT restoring from local storage logic (controlled effectively by useGameState's persistent check, 
    // but here we trigger the fetch if it's a cold start on a URL).
    // The useGameState hook handles the localStorage restore.
    // If useGameState restored something, appState won't be 'setup' (unless it was saved as setup).
    // But if we have a URL ID and NO local state for it, we fetch.

    if (adventureId && !isSharedAdventureRef.current) {
      // Simple check: logic inside useGameState handles restoration. 
      // We only fetch if state is still setup?
      // Actually, let's replicate the original logic simplified:
      // Original logic: "Only attempt restore if WE ARE IN A SHARED SESSION" inside hook.
      // Here:
      if (appState === 'setup' || appState === 'generating') {
        const loadSharedAdventure = async () => {
          // console.log("🔗 URL ID detected:", adventureId); 
          setAppState('generating');
          setLoadingMessage('Abriendo aventura compartida...');
          setProgress(20);
          isSharedAdventureRef.current = true;

          try {
            const { data, error } = await supabase
              .from('adventures')
              .select('*')
              .eq('id', adventureId)
              .single();

            if (error) {
              console.error("❌ Supabase Load Error:", error);
              throw error;
            }
            if (data) {
              console.log("✅ Adventure Loaded:", data);
              setQuestions(data.questions);
              setNormalizedTopic(data.topic);
              setNormalizedAudience(data.audience);
              // Ensure config has the topic/audience from the DB column, just in case JSON is missing it
              setConfig({ ...data.config, topic: data.topic, audience: data.audience });
              setTimeout(() => setAppState('start_screen'), 500);
              showToast("✨ Aventura compartida cargada");
              apiIncrementPlay(adventureId);
            } else {
              console.warn("⚠️ Adventure Not Found (Null Data)");
              showToast("❌ No se encontró la aventura");
              setAppState('setup');
            }
          } catch (err) {
            console.error("❌ Critical Load Error:", err);
            showToast("❌ Error cargando aventura");
            setAppState('setup');
          }
        };
        // Timeout to allow hydration? No, just run
        // But wait, if local storage restored it, appState != setup.
        // Ensuring no double load.
        const saved = localStorage.getItem('aventuria_gamestate');
        let restored = false;
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p.adventureId === adventureId) restored = true;
          } catch (e) { console.error("Parse Error", e); }
        }

        // Force load if we are in 'generating' state (meaning restore didn't switch us to playing)
        // OR if not restored at all.
        if (!restored || appState === 'generating') {
          console.log("🚀 Triggering loadSharedAdventure()...");
          loadSharedAdventure();
        }
      }
    }
  }, []);

  const handleShare = async (type: string) => {
    if (type === 'download') {
      setShowDownloadPopup(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let adventureId = params.get('id');

    setLoadingMessage('Guardando tu aventura...');
    setIsSharing(true);

    try {
      let thumbUrl = questions[0]?.imageData || '';
      if (thumbUrl.startsWith('data:')) {
        thumbUrl = await uploadToStorage(thumbUrl);
      }

      if (!adventureId) {
        // --- CREATE NEW ADVENTURE ---
        const { data, error } = await supabase
          .from('adventures')
          .insert({
            topic: normalizedTopic || config.topic,
            audience: normalizedAudience || config.audience,
            questions: questions,
            config: config,
            thumbnail_url: thumbUrl,
            play_count: 0,
            completions: 0,
            total_score: 0,
            user_id: user?.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          adventureId = data.id;
          const newUrl = `${window.location.pathname}?id=${data.id}`;
          window.history.pushState({ path: newUrl }, '', newUrl);
        }
      } else {
        // --- UPDATE EXISTING ADVENTURE (Fix for missing images) ---
        // If we are the creator (checked by RLS usually, but good to check user existence),
        // we update the questions to ensure all background-generated images are persisted.
        if (user) {
          const { error } = await supabase
            .from('adventures')
            .update({
              questions: questions, // Save the latest questions with ALL images
              thumbnail_url: thumbUrl // Update thumbnail if it changed (unlikely but safe)
            })
            .eq('id', adventureId)
            // .eq('user_id', user.id) // RLS handles this, but safety first? No, let RLS handle permission.
            ;

          if (error) {
            console.warn("Could not update adventure (probably not owner):", error);
            // We don't throw here, because we still want to allow sharing the link 
            // even if we couldn't update the source (e.g. sharing someone else's adventure).
          } else {
            console.log("✅ Adventure updated with latest images before share.");
          }
        }
      }

      if (adventureId) {
        const shareUrl = `${window.location.origin}/?id=${adventureId}`;
        if (type === 'link') {
          navigator.clipboard.writeText(shareUrl);
          showToast('🔗 Enlace copiado al portapapeles');
        } else if (type === 'whatsapp') {
          const text = `¡Juega a mi AventurIA sobre ${config.topic || normalizedTopic}! ${shareUrl}`;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

          if (isMobile) {
            window.location.href = `whatsapp://send?text=${encodeURIComponent(text)}`;
          } else {
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
          }
        }
      }

    } catch (e) {
      console.error("Save/Share Error:", e);
      showToast("❌ Error al guardar/compartir");
    } finally {
      setShowShareMenu(false);
      setIsSharing(false);
    }
  };

  const downloadHTML = () => {
    // HTML generation logic
    const gameData = JSON.stringify({ questions, config, topic: normalizedTopic });
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AventurIA - ${normalizedTopic}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap');
    body { background-color: #0f172a; color: white; font-family: 'Poppins', sans-serif; }
    .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
  <div id="game-root" class="w-full max-w-2xl"></div>
  <script>
    const data = ${gameData};
    let currentQ = 0;
    let score = 0;
    
    function render() {
      const root = document.getElementById('game-root');
      if (currentQ >= data.questions.length) {
        root.innerHTML = \`
          <div class="glass rounded-3xl p-8 text-center animate-bounce">
            <h1 class="text-4xl font-black mb-4 text-cyan-400">¡AVENTURA COMPLETADA!</h1>
            <p class="text-2xl font-bold mb-6">\${score} / \${data.questions.length} Aciertos</p>
            <button onclick="location.reload()" class="bg-cyan-500 text-slate-900 px-8 py-3 rounded-xl font-black uppercase hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 mb-4 w-full">Jugar Otra Vez</button>
            <button onclick="window.open('https://aventuria.vercel.app/', '_blank')" class="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-xl font-black uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Crea tu propia aventura
            </button>
          </div>
        \`;
        return;
      }
      
      const q = data.questions[currentQ];
      root.innerHTML = \`
        <div class="glass rounded-3xl overflow-hidden shadow-2xl">
          \${q.imageData ? \`<div class="h-64 bg-black/50"><img src="\${q.imageData}" class="w-full h-full object-cover"></div>\` : ''}
          <div class="p-8">
            <div class="flex justify-between items-center mb-6">
              <span class="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold">\${currentQ + 1} / \${data.questions.length}</span>
              <span class="text-cyan-400 font-bold">\${data.topic}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-black mb-8 leading-tight">\${q.question}</h2>
            <div class="grid gap-3">
              \${q.options.map((opt, i) => \`
                <button onclick="check(\${i})" class="text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-4">
                  <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs">\${String.fromCharCode(65+i)}</span>
                  <span class="font-bold text-sm">\${opt}</span>
                </button>
              \`).join('')}
            </div>
          </div>
        </div>
      \`;
    }

    function check(idx) {
      const q = data.questions[currentQ];
      if (idx === q.correctIndex) {
        alert("¡CORRECTO! 🎉");
        score++;
      } else {
        alert("Incorrecto. La respuesta era: " + q.options[q.correctIndex]);
      }
      currentQ++;
      render();
    }
    
    render();
  </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aventuria-${normalizedTopic.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadPopup(false);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-['Poppins'] selection:bg-cyan-500/30 overflow-x-hidden flex flex-col items-center justify-center relative">
      {showConfetti && <CustomConfetti />}

      <AudioControls
        showAudioMenu={showAudioMenu}
        setShowAudioMenu={setShowAudioMenu}
        sfxMuted={sfxMuted}
        setSfxMuted={setSfxMuted}
      />

      {appState === 'admin_login' && (
        <AdminLogin
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
          handleAdminLogin={handleAdminLogin}
          setAppState={setAppState}
        />
      )}

      {appState === 'admin_dashboard' && (
        <AdminDashboard
          setAppState={setAppState}
          setAdminPassword={setAdminPassword}
          adminAdventures={adminAdventures}
          googleImageCount={googleImageCount}
          totalPlays={totalPlays}
          completionRate={completionRate}
          globalAvgScore={globalAvgScore}
          toggleFeatured={toggleFeatured}
          requestAdminLoad={requestAdminLoad}
          deleteAdventure={deleteAdventure}
          adminLoading={adminLoading}
          playSfx={(type) => playSfx(type, sfxMuted)}
          sfxMuted={sfxMuted}
        />
      )}

      {/* Footer Admin Toggle */}
      {(appState === 'setup' || appState === 'start_screen') && (
        <button
          onClick={(e) => { e.stopPropagation(); setAppState('admin_login'); }}
          className="fixed bottom-2 left-2 w-6 h-6 flex items-center justify-center opacity-0 hover:opacity-20 transition-opacity z-50 text-white"
          title="Admin"
        >
          <i className="fa-solid fa-lock text-[10px]"></i>
        </button>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-fade-in-down">
          <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-500 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {showDownloadPopup && (
        <DownloadPopup
          setShowDownloadPopup={setShowDownloadPopup}
          downloadHTML={downloadHTML}
        />
      )}

      <AnimatePresence mode="wait">
        {appState === 'setup' && (
          <SetupScreen
            config={config}
            setConfig={setConfig}
            generateGame={(c) => generateGame(config, setNormalizedTopic, setNormalizedAudience)}
            errorMsg={errorMsg}
            deferredPrompt={deferredPrompt}
            handleInstallClick={handleInstallClick}
            setAppState={setAppState}
            featuredAdventures={featuredAdventures}
            launchAdventure={launchAdventure}
            user={user}
            setShowAuthOverlay={setShowAuthOverlay}
          />
        )}

        {appState === 'generating' && (
          <motion.div key="generating" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center space-y-8 max-w-lg w-full text-center z-10 p-6">
            <img src={AI_ENGINE_LOGO} className="h-24 animate-pulse-slow" />
            <div className="space-y-4 w-full">
              <h2 className="text-xl font-black uppercase tracking-widest leading-loose">{flavorText}</h2>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${progress}%` }}></div>
              </div>
              <button
                onClick={() => { playSfx('click', sfxMuted); handleGoHome(); setAppState('setup'); }}
                className="mt-8 text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-xmark"></i> Cancelar
              </button>
            </div>
          </motion.div>
        )}

        {appState === 'start_screen' && (
          <StartScreen
            setAppState={setAppState}
            normalizedTopic={normalizedTopic}
            normalizedAudience={normalizedAudience}
            config={config}
            setTimer={setTimer}
            playSfx={(type) => playSfx(type, sfxMuted)}
            isSharedAdventure={isSharedAdventureRef.current}
            user={user}
            setPlayerAlias={setPlayerAlias}
            initialAlias={playerAlias}
          />
        )}

        {appState === 'playing' && (
          <GameScreen
            appState={appState}
            setAppState={setAppState}
            handleGoHome={handleGoHome}
            normalizedTopic={normalizedTopic}
            config={config}
            timer={timer}
            streak={streak}
            correctCount={correctCount}
            questions={questions}
            currentQIndex={currentQIndex}
            isImageReady={isImageReady}
            setIsImageReady={setIsImageReady}
            isRegeneratingImage={isRegeneratingImage}
            imgError={imgError}
            setImgError={setImgError}
            feedback={feedback}
            isEditing={isEditing}
            isCreatorMode={isCreatorMode}
            setIsEditing={setIsEditing}
            handleRegenerateImage={() => generateImage(currentQIndex, questions[currentQIndex].visualPrompt, true, currentQIndex, questions)}
            setQuestions={setQuestions}
            setCurrentQIndex={setCurrentQIndex}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            handleSpeak={handleSpeak}
            selectedOption={selectedOption}
            handleOptionClick={handleOptionClick}
            showHint={showHint}
            setShowHint={setShowHint}
            handleNext={handleNext}
            playSfx={(type) => playSfx(type, sfxMuted)}
            isSharedAdventure={isSharedAdventureRef.current}
          />
        )}

        {appState === 'summary' && (
          <SummaryScreen
            handleGoHome={handleGoHome}
            normalizedTopic={normalizedTopic}
            streak={streak}
            correctCount={correctCount}
            questionCount={questions.length}
            score={score}
            playSfx={(type) => playSfx(type, sfxMuted)}
            resetGameState={resetGameState}
            setAppState={setAppState}
            showShareMenu={showShareMenu}
            setShowShareMenu={setShowShareMenu}
            handlePublishLink={() => handleShare('link')}
            handleShare={handleShare}
            isSharing={isSharing}
            showPromotionalButton={!isCreatorMode}
            isCreatorMode={isCreatorMode}
          />
        )}

        {appState === 'profile' && user && (
          <ProfileScreen
            user={user}
            setAppState={setAppState}
            handleGoHome={handleGoHome}
            launchAdventure={launchAdventure}
            playSfx={(type) => playSfx(type, sfxMuted)}
          />
        )}
      </AnimatePresence>

      {showAuthOverlay && (
        <AuthOverlay
          onClose={() => setShowAuthOverlay(false)}
          onLoginSuccess={handleLoginSuccessWithToast}
        />
      )}

      {appState === 'setup' && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-[#0f172a]/60 backdrop-blur-md border border-white/10 rounded-full pl-2 pr-1 py-1 shadow-xl">
              <button
                onClick={() => { playSfx('click', sfxMuted); setAppState('profile'); }}
                className="bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-slate-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all mr-2 border border-cyan-500/20 hover:border-transparent"
              >
                <i className="fa-solid fa-compass mr-2"></i>
                <span className="hidden md:inline">Mis Aventuras</span>
              </button>
              <span className="text-xs text-white/80 font-bold hidden md:block border-l border-white/10 pl-3">
                {user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogoutWithToast}
                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-colors"
                title="Cerrar Sesión"
              >
                <i className="fa-solid fa-power-off text-xs"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthOverlay(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <i className="fa-solid fa-user-astronaut"></i>
              <span>Acceder</span>
            </button>
          )}
        </div>
      )}

      {appState === 'setup' && featuredAdventures.length > 0 && (
        <FeaturedSidebar
          featuredAdventures={featuredAdventures}
          launchAdventure={launchAdventure}
          playSfx={playSfx}
          sfxMuted={sfxMuted}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
