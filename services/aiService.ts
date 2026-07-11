import { supabase } from "../supabaseClient";
import { GameConfig, Question } from "../types";

interface AdventureData {
    questions: Question[];
    correctedTopic?: string;
    correctedAudience?: string;
    meta?: {
        topic_display?: string;
        audience_display?: string;
    };
}

export const generateAdventure = async (config: GameConfig, setProgress?: (progress: number) => void): Promise<AdventureData> => {
    if (setProgress) setProgress(10);

    // Lógica de progreso simulado (Fake Progress Bar)
    let progressValue = 10;
    const progressInterval = setProgress ? setInterval(() => {
        progressValue += (90 - progressValue) * 0.15; // Suavizado asintótico hasta el 90%
        setProgress(progressValue);
    }, 1500) : null;

    try {
        const { data, error } = await supabase.functions.invoke('generate-adventure', {
            body: {
                action: 'generate_game',
                topic: config.topic,
                audience: config.audience,
                count: config.count,
                difficulty: config.difficulty,
                mode: config.mode || 'ai'
            }
        });

        if (progressInterval) clearInterval(progressInterval);

        if (error) {
            console.error("Edge function error:", error);
            // Capturamos específicamente el error 402 si el edge function lo lanza como HTTP Error
            if (error.context?.status === 402) {
                throw new Error("Saldo insuficiente para generar las imágenes de la aventura.");
            }
            throw new Error(error.message || `Error del servidor: Edge Function falló`);
        }
        
        if (!data || data.error) {
            throw new Error(data?.error || `Error del servidor al generar aventura`);
        }

        if (!data.questions || data.questions.length === 0) throw new Error("No se generaron preguntas");

        // --- Mapeo de la imagen de backend al formato esperado por frontend y SHUFFLE ANSWERS ---
        data.questions.forEach((q: any) => {
            // Map image to imageData for frontend compatibility
            if (q.image) {
                q.imageData = q.image;
            }

            // Store original correct answer string
            const correctAnswer = q.options[q.correctIndex];

            // Shuffle options
            for (let i = q.options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
            }

            // Find new correct index
            q.correctIndex = q.options.indexOf(correctAnswer);
        });

        return {
            questions: data.questions,
            correctedTopic: data.correctedTopic || data.meta?.topic_display,
            correctedAudience: data.correctedAudience || data.meta?.audience_display
        };
    } catch (e) {
        if (progressInterval) clearInterval(progressInterval);
        throw e;
    }
};
