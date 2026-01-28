import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, topic, audience, count, difficulty, prompt: imagePrompt } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
        }

        // --- ACTION: GENERATE GAME (Text) ---
        if (action === 'generate_game') {
            const configCount = count || 5;
            const configDifficulty = difficulty || 'Media';
            const configTopic = topic || 'General';
            const configAudience = audience || 'General';

            const prompt = `Actúa como un diseñador instruccional experto y profesor. Crea una aventura educativa (quiz game) de ${configCount} preguntas sobre el tema "${configTopic}" adaptada específicamente para la audiencia: "${configAudience}".
      
      Requisitos Pedagógicos:
      1. Adapta el vocabulario y la complejidad a la audiencia ("${configAudience}"), pero mantén un tono natural y fluido, sin ser excesivamente formal.
      2. Las preguntas deben ser educativas y curiosas.
      3. Asegura que los datos sean correctos.
      4. Dificultad seleccionada: ${configDifficulty}. Define la complejidad así:
         - FÁCIL: Nivel "Recordar/Comprender" (Taxonomía de Bloom). Preguntas directas, conceptos básicos, opciones incorrectas obvias.
         - MEDIO: Nivel "Aplicar/Analizar". Requiere relacionar conceptos. Las opciones incorrectas son plausibles ("distractores").
         - DIFÍCIL: Nivel "Evaluar/Crear". Requiere pensamiento lateral, excepciones a la regla o análisis de casos complejos. Muy desafiante.

      Requisitos de Seguridad y Adaptación Visual:
      1. CORRECCIÓN INTELIGENTE: Si el tema o la audiencia tienen erratas o abreviaturas (ej: "Dinasaurios" -> "Dinosaurios", "3 pim" -> "3º Primaria"), CORRÍGELAS silenciosamente e interpreta la intención correcta.
      2. FILTRO ÉTICO (CRÍTICO):
         - Temas FANTÁSTICOS/CREATIVOS (Zombies, Magia...): VÁLIDOS.
         - Temas INADECUADOS (Violencia, insultos, explícito...): NO uses el bloqueo estándar. REFORMULA el tema hacia una vertiente educativa estricta (ej: "Violencia" -> "Resolución de Conflictos y Paz", "Robar" -> "Ética y Leyes", "Drogas" -> "Salud y Neurociencia"). ¡Dale la vuelta educativa!
      3. "visualPrompt": Debe describir una imagen para generar con IA.
         - IMPORTANTE: Define un ESTILO VISUAL adecuado para la audiencia (ej: "ilustración vectorial colorida estilo Pixar" para niños, "fotorealismo cinemático" para adultos).
         - ANTI-SPOILER (CRÍTICO): Si la pregunta requiere identificar algo, describe un PAISAJE o ESCENA GENÉRICA. 
         - PROHIBIDO: NO incluyas visualmente NINGUNA de las opciones de respuesta (ni correcta ni incorrectas). Por ejemplo, si las opciones son animales, NO dibujes ninguno de ellos. Dibuja su hábitat o comida.
         - Asegura que la descripción sea "Safe For Work" y amable.

      Estructura del Juego:
      Formato JSON estricto:
      {
        "correctedTopic": "Tema corregido y bien formateado (ej: 'Dinosaurios' si puso 'dinasaurios')",
        "correctedAudience": "Audiencia corregida y formal (ej: '3º Primaria' si puso '3 pim')",
        "questions": [
          {
            "id": 1,
            "question": "Pregunta...",
            "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
            "correctIndex": 0, // ¡IMPORTANTE!: Aleatoriza este índice (0-3) para cada pregunta. No pongas siempre la A.
            "visualPrompt": "Descripción detallada de la imagen INCLUYENDO EL ESTILO VISUAL ADAPTADO...",
            "hint": "Una pista útil...",
            "explanation": "Explicación breve de la respuesta correcta..."
          }
        ]
      }`;

            // Call Gemini 2.0 Flash
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Gemini API Error: ${JSON.stringify(err)}`);
            }

            const data = await response.json();
            // Extract text content
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No content generated from Gemini.");

            // --- ANSWER SHUFFLING LOGIC ---
            let gameData;
            try {
                gameData = JSON.parse(text);
                if (gameData.questions && Array.isArray(gameData.questions)) {
                    gameData.questions = gameData.questions.map((q: any) => {
                        if (!q.options || !Array.isArray(q.options) || typeof q.correctIndex !== 'number') return q;

                        const correctAnswer = q.options[q.correctIndex];
                        // Shuffle options
                        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
                        // Find new correct index
                        const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);

                        return {
                            ...q,
                            options: shuffledOptions,
                            correctIndex: newCorrectIndex
                        };
                    });
                }
            } catch (e) {
                console.error("Failed to parse/shuffle JSON", e);
                // Return original text if parsing fails (fallback)
                return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify(gameData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- ACTION: GENERATE IMAGE ---
        if (action === 'generate_image') {
            if (!imagePrompt) throw new Error("Missing 'prompt' for image generation.");

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: imagePrompt }] }]
                    })
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Gemini Image API Error: ${JSON.stringify(err)}`);
            }

            const data = await response.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData);

            if (imagePart) {
                const imgUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                return new Response(JSON.stringify({ imageData: imgUrl }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                throw new Error("No image data returned from Gemini.");
            }
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
