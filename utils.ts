import { supabase } from './supabaseClient';

// --- Storage Helper ---
export const uploadToStorage = async (base64Data: string): Promise<string> => {
    try {
        // 1. Convert Base64 to Blob
        const byteString = atob(base64Data.split(',')[1]);
        const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });

        // 2. Generate unique filename
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${mimeString.split('/')[1]}`;

        // 3. Upload to Supabase
        const { data, error } = await supabase.storage
            .from('adventure_images')
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Storage Upload Error:", error);
            return base64Data; // Fallback to base64 if upload fails
        }

        // 4. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('adventure_images')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (e) {
        console.error("Storage Conversion Error:", e);
        return base64Data; // Fallback
    }
};

// --- Quota Helper ---
export const checkDailyQuota = async (): Promise<boolean> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('daily_stats')
            .select('image_count')
            .eq('date', today)
            .single();

        if (error) {
            // If code is PGRST116, it means no row exists for today (count = 0), so quota is OK.
            if (error.code === 'PGRST116') return true;
            console.warn("Quota check error:", error);
            return true; // Fail open (allow generation) on DB error
        }

        return (data?.image_count || 0) < 800; // LIMIT 800
    } catch (e) {
        return true;
    }
};

export const incrementDailyQuota = async () => {
    try {
        await supabase.rpc('increment_image_count');
    } catch (e) {
        console.warn("Failed to increment quota", e);
    }
};

// --- Secure Database RPC Wrappers (New) ---

export const incrementPlayCount = async (id: string) => {
    try {
        trackEvent('game_start', 'Gameplay', 'Adventure Load');
        const { error } = await supabase.rpc('increment_play_count', { adventure_id: id });
        if (error) console.error("RPC increment_play_count failed:", error);
    } catch (e) {
        console.error("Tracking error", e);
    }
};

export const recordGameScore = async (id: string, scoreVal: number, playerAlias?: string, isCreator: boolean = false) => {
    try {
        trackEvent('game_complete', 'Gameplay', 'Score', scoreVal);

        // 0. Skip if Creator Mode (Editing/Testing) - OPTIONAL: User might want to record their own scores?
        // Usually creators playing their own game shouldn't skew stats, but for testing "first vs best" it might be useful.
        // Let's keep the block but maybe comment it out if user wants to test? 
        // User asked for logic change, not this. I'll leave it as is (blocked for creator).
        // 0. UPDATE: Allow Creator to save score for testing logic
        // if (isCreator) {
        //     console.log("Creator play - Score not saved.");
        //     return;
        // }

        // 1. Update Aggregate Stats (Legacy RPC) - Keeps total plays count accurate
        const { error } = await supabase.rpc('record_adventure_score', { adventure_id: id, score_val: scoreVal });
        if (error) console.error("RPC record_adventure_score failed:", error);

        // 2. Save Individual Session (Unique per Alias)
        if (playerAlias) {
            // Check if user already played
            const { data: existing } = await supabase
                .from('game_sessions')
                .select('*') // Get all to check first_score
                .eq('adventure_id', id)
                .eq('player_alias', playerAlias)
                .maybeSingle();

            if (existing) {
                // UPDATE EXISTING SESSION
                // Logic: 
                // - first_score: NEVER change (it's the first attempt).
                // - score: Update ONLY if new score is better (Max).
                // - played_at: Update to show latest activity? Or keep first? usually latest.

                const newBest = Math.max(existing.score, scoreVal);

                // Only update if score improved or just to update timestamp? 
                // Let's update timestamp to show they are active, and score if better.
                const { error: updateError } = await supabase
                    .from('game_sessions')
                    .update({
                        score: newBest,
                        played_at: new Date().toISOString()
                        // first_score is NOT updated
                    })
                    .eq('id', existing.id);

                if (updateError) console.error("Failed to update game session:", updateError);

            } else {
                // INSERT NEW SESSION
                // Logic: Both score and first_score are the current value
                const { error: insertError } = await supabase
                    .from('game_sessions')
                    .insert({
                        adventure_id: id,
                        player_alias: playerAlias,
                        score: scoreVal,
                        first_score: scoreVal, // Set initial score
                        played_at: new Date().toISOString()
                    });
                if (insertError) console.error("Failed to save new game session:", insertError);
            }
        }

    } catch (e) {
        console.error("Score recording error", e);
    }
};

export const toggleFeatured = async (id: string, currentVal: boolean, password: string) => {
    try {
        const { error } = await supabase.rpc('admin_toggle_featured', { adventure_id: id, password: password });
        if (error) throw error;
    } catch (e) {
        console.error("RPC toggleFeatured failed:", e);
        throw e;
    }
};

export const deleteAdventure = async (id: string, password: string) => {
    try {
        const { error } = await supabase.rpc('admin_delete_adventure', { adventure_id: id, password: password });
        if (error) throw error;
    } catch (e) {
        console.error("RPC deleteAdventure failed:", e);
        throw e;
    }
};


// --- Analytics & Haptics ---

export const trackEvent = (eventName: string, category: string, label: string, value?: number) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventName, {
            event_category: category,
            event_label: label,
            value: value
        });
    }
};

export const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const getRank = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return { rank: "Maestro", color: "text-amber-400", message: "¡Legendario! Eres un auténtico experto." };
    if (percentage >= 50) return { rank: "Aventurero", color: "text-cyan-400", message: "¡Buen trabajo! Vas por buen camino." };
    return { rank: "Novato", color: "text-rose-400", message: "¡Sigue practicando! El inicio es difícil." };
};

// --- System Logger (New) ---
export const logError = async (severity: 'info' | 'warning' | 'error', component: string, message: string, details?: any) => {
    try {
        await supabase.from('system_logs').insert({
            severity,
            component,
            message,
            details: details ? JSON.stringify(details) : null
        });
    } catch (e) {
        console.error("Failed to write system log:", e);
    }
};
