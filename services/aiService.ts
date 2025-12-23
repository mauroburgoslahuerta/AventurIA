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

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const data = await response.json();

    if (!data.questions || data.questions.length === 0) throw new Error("No se generaron preguntas");

    // --- SHUFFLE ANSWERS (Fix for AI Bias) ---
    data.questions.forEach((q: any) => {
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
};
