import { supabase } from "../supabaseClient";
import { GameConfig, Question } from "../types";

export interface GenerateTicket {
    adventureId: string;
    status: string;
    mode: string;
}

export const requestAdventureTicket = async (config: GameConfig): Promise<GenerateTicket> => {
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

        if (error) {
            console.error("Edge function error:", error);
            if (error.context?.status === 402) {
                throw new Error("Saldo insuficiente para generar las imágenes de la aventura.");
            }
            throw new Error(error.message || `Error del servidor: Edge Function falló`);
        }
        
        if (!data || data.error) {
            throw new Error(data?.error || `Error del servidor al generar aventura`);
        }

        return {
            adventureId: data.adventureId,
            status: data.status,
            mode: data.mode
        };
    } catch (e) {
        throw e;
    }
};

export const formatCompletedQuestions = (questions: any[]): Question[] => {
    if (!questions || questions.length === 0) return [];
    
    return questions.map((q: any) => {
        // Map image to imageData for frontend compatibility
        if (q.image && !q.imageData) {
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
        
        return q;
    });
};
