import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { spendCredits, refundCredits, InsufficientFundsError } from '../_shared/wallet.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función auxiliar para buscar imagen gratuita en Pexels
async function searchPexelsImage(query: string, apiKey: string): Promise<string | null> {
    try {
        // Añadimos 'orientation=landscape' para que encajen mejor en el diseño
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
            headers: {
                'Authorization': apiKey
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.photos && data.photos.length > 0) {
            return data.photos[0].src.large; 
        }
        return null;
    } catch (e) {
        console.error("Pexels fetch error", e);
        return null;
    }
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Inicializar cliente Supabase si hay auth header (para validación de usuario)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');
        
        let userId: string | null = null;
        let supabaseClient: any = null;

        if (authHeader) {
            supabaseClient = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: authHeader } }
            });
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                userId = user.id;
            }
        }

        const { action, topic, audience, count, difficulty, prompt: imagePrompt, mode } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const pexelsKey = Deno.env.get('PEXELS_API_KEY');

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY no está configurada en los secrets.");
        }

        // --- LÓGICA DE TIERS ---
        const isGuest = !userId;
        const requestedMode = mode || 'ai'; 
        // Si es invitado, forzamos modo 'stock' siempre
        const actualMode = isGuest ? 'stock' : requestedMode;

        // --- ACTION: GENERATE GAME (Texto + Bucle de Imágenes) ---
        if (action === 'generate_game') {
            const configCount = count || 5;
            const configDifficulty = difficulty || 'Media';
            const configTopic = topic || 'General';
            const configAudience = audience || 'General';
            const totalImageCost = configCount * 10; // 10 créditos por imagen

            let transactionId: string | null = null;

            // 1. COBRO ANTICIPADO ATÓMICO (Solo registrados en modo IA)
            if (!isGuest && actualMode === 'ai') {
                try {
                    transactionId = await spendCredits(
                        supabaseClient,
                        userId!,
                        totalImageCost,
                        'generation'
                    );
                } catch (e: any) {
                    if (e instanceof InsufficientFundsError || e.name === 'InsufficientFundsError') {
                        return new Response(JSON.stringify({ error: 'Saldo insuficiente para generar las imágenes de la aventura.' }), {
                            status: 402, // 402 Payment Required
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    }
                    throw e; // Relanzar errores no controlados de BD
                }
            }

            // 2. GENERACIÓN DE TEXTO (GEMINI)
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
      4. "stockKeyword": EXTRAE de la pregunta 1 o 2 palabras clave simples en INGLÉS optimizadas para buscar en Pexels.
         - ANTI-SPOILER (CRÍTICO): Esta palabra clave NUNCA debe ser o contener la respuesta correcta. Debe ser un concepto general del entorno (ej: "jungle", "space", "laboratory").

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
            "stockKeyword": "keyword in english",
            "hint": "Una pista útil...",
            "explanation": "Explicación breve de la respuesta correcta..."
          }
        ]
      }`;
            const reqOrigin = req.headers.get('Origin') || req.headers.get('Referer') || 'http://localhost:5173';

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Referer': reqOrigin
                    },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                }
            );

            // Si falla la generación de texto (y habíamos cobrado), reembolsamos TODO y abortamos.
            if (!response.ok) {
                const err = await response.json();
                if (transactionId && supabaseClient) {
                    await refundCredits(supabaseClient, transactionId, totalImageCost);
                }
                throw new Error(`Gemini API Error: ${JSON.stringify(err)}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                if (transactionId && supabaseClient) await refundCredits(supabaseClient, transactionId, totalImageCost);
                throw new Error("No content generated from Gemini.");
            }

            let gameData;
            try {
                gameData = JSON.parse(text);
                if (gameData.questions && Array.isArray(gameData.questions)) {
                    gameData.questions = gameData.questions.map((q: any) => {
                        if (!q.options || !Array.isArray(q.options) || typeof q.correctIndex !== 'number') return q;
                        const correctAnswer = q.options[q.correctIndex];
                        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
                        return {
                            ...q,
                            options: shuffledOptions,
                            correctIndex: shuffledOptions.indexOf(correctAnswer)
                        };
                    });
                }
            } catch (e) {
                console.error("Failed to parse JSON", e);
                if (transactionId && supabaseClient) await refundCredits(supabaseClient, transactionId, totalImageCost);
                throw new Error("Falló el parseo del JSON de Gemini.");
            }

            // 3. BUCLE DE IMÁGENES CON DOBLE FALLBACK
            let fallbackCount = 0;

            if (gameData.questions && Array.isArray(gameData.questions)) {
                for (let i = 0; i < gameData.questions.length; i++) {
                    const q = gameData.questions[i];
                    let imgUrl: string | null = null;
                    let source = 'ai';

                    // 3.A Intentar generar con IA si estamos en ese modo
                    if (actualMode === 'ai') {
                        try {
                            const imgRes = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                                {
                                    method: 'POST',
                                    headers: { 
                                        'Content-Type': 'application/json',
                                        'Referer': reqOrigin
                                    },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: q.visualPrompt || q.stockKeyword || 'educational illustration' }] }]
                                    })
                                }
                            );
                            if (imgRes.ok) {
                                const imgData = await imgRes.json();
                                const parts = imgData.candidates?.[0]?.content?.parts || [];
                                const imagePart = parts.find((p: any) => p.inlineData);
                                if (imagePart) {
                                    imgUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                                }
                            }
                        } catch (e) {
                            console.error(`AI Image generation failed for question ${i}`, e);
                        }
                    }

                    // 3.B FALLBACK 1 (Pexels) si IA falló o estamos en modo Stock (Invitados)
                    if (!imgUrl) {
                        fallbackCount++;
                        source = 'stock_fallback';
                        if (pexelsKey && q.stockKeyword) {
                            imgUrl = await searchPexelsImage(q.stockKeyword, pexelsKey);
                        }
                        
                        // 3.C FALLBACK 2 (Imagen Local) si Pexels también falla
                        if (!imgUrl) {
                            imgUrl = '/assets/fallback.png';
                        }
                    }

                    q.image = imgUrl;
                    q.source = source;
                }
            }

            // 4. CONCILIACIÓN (Reembolso Parcial por Fallbacks)
            // Solo reembolsamos si hay transacción y se produjeron fallbacks estando en modo IA
            if (transactionId && supabaseClient && fallbackCount > 0 && actualMode === 'ai') {
                const refundAmount = fallbackCount * 10;
                await refundCredits(supabaseClient, transactionId, refundAmount);
                console.log(`[generate-adventure] Reembolsados ${refundAmount} créditos por ${fallbackCount} imágenes fallidas.`);
            }

            return new Response(JSON.stringify(gameData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- ACTION: GENERATE IMAGE ---
        // (Se mantiene por retrocompatibilidad temporal, aunque ahora haya una Edge Function dedicada)
        if (action === 'generate_image') {
            if (!imagePrompt) throw new Error("Missing 'prompt' for image generation.");

            const reqOrigin = req.headers.get('Origin') || req.headers.get('Referer') || 'http://localhost:5173';
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Referer': reqOrigin
                    },
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

    } catch (error: any) {
        console.error("[generate-adventure] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
