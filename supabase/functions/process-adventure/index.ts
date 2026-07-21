import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { refundCredits } from '../_shared/wallet.ts';

// Función auxiliar para buscar imagen gratuita en Pexels
async function searchPexelsImage(query: string, apiKey: string): Promise<string | null> {
    try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
            headers: { 'Authorization': apiKey }
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

// Convertir base64 a Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

serve(async (req) => {
    let adventureId = '';
    let supabaseClient: any = null;

    try {
        const payload = await req.json();
        const record = payload.record;
        
        if (!record || !record.id) {
            return new Response(JSON.stringify({ error: "No record found in webhook payload" }), { status: 400 });
        }

        adventureId = record.id;
        const { topic, audience, config, user_id } = record;
        const actualMode = config?.mode || 'stock';
        const configCount = config?.count || 5;
        const configDifficulty = config?.difficulty || 'Media';
        const totalImageCost = configCount * 10;

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        
        // Creamos el cliente usando la clave de servicio o anónima para poder actualizar
        supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseKey);

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const pexelsKey = Deno.env.get('PEXELS_API_KEY');

        if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada.");

        console.log(`[process-adventure] Iniciando generación para ${adventureId} en modo ${actualMode}`);

        // 1. GENERACIÓN DE TEXTO (GEMINI)
        const prompt = `Actúa como un diseñador instruccional experto y profesor. Crea una aventura educativa (quiz game) de ${configCount} preguntas sobre el tema "${topic}" adaptada específicamente para la audiencia: "${audience}".
        
        Requisitos Pedagógicos:
        1. Adapta el vocabulario y la complejidad a la audiencia ("${audience}"), pero mantén un tono natural y fluido, sin ser excesivamente formal.
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
        4. "stockKeyword": EXTRAE 1 o 2 palabras clave en INGLÉS para buscar fotos en Pexels.
           - IMPORTANTE: ADAPTA las palabras clave a la audiencia (ej: añade "kids", "toy" o "learning" para niños; "real", "authentic" o "museum" para adultos).
           - ANTI-SPOILER (CRÍTICO): Esta palabra clave NUNCA debe ser o contener la respuesta correcta. Debe ser un concepto general del entorno (ej: "space children learning" o "astronomy telescope").

        Estructura del Juego:
        Formato JSON estricto:
        {
          "correctedTopic": "Tema corregido",
          "correctedAudience": "Audiencia corregida",
          "questions": [
            {
              "id": 1,
              "question": "Pregunta...",
              "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
              "correctIndex": 0,
              "visualPrompt": "Descripción detallada...",
              "stockKeyword": "keyword in english",
              "hint": "Una pista útil...",
              "explanation": "Explicación breve..."
            }
          ]
        }`;

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
            throw new Error(`Gemini Text API Error: ${JSON.stringify(err)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No content generated from Gemini text.");

        let gameData = JSON.parse(text);
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

        // 2. BUCLE DE IMÁGENES CON DOBLE FALLBACK Y STORAGE NATIVO
        let fallbackCount = 0;

        if (gameData.questions && Array.isArray(gameData.questions)) {
            // Batching simple: procesar secuencialmente (o de 2 en 2 si quisiéramos)
            // Para asegurar que no falle por limites de memoria, secuencial es más seguro
            for (let i = 0; i < gameData.questions.length; i++) {
                const q = gameData.questions[i];
                let imgUrl: string | null = null;
                let source = 'ai';

                if (actualMode === 'ai') {
                    try {
                        console.log(`[process-adventure] Solicitando imagen AI ${i+1}/${gameData.questions.length}`);
                        const imgRes = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: q.visualPrompt || q.stockKeyword || 'educational illustration' }] }],
                                    generationConfig: { responseModalities: ["Image"] }
                                })
                            }
                        );
                        
                        if (imgRes.ok) {
                            const imgData = await imgRes.json();
                            const parts = imgData.candidates?.[0]?.content?.parts || [];
                            const imagePart = parts.find((p: any) => p.inlineData);
                            
                            if (imagePart) {
                                // PROHIBIDO BASE64 -> Subir a Supabase Storage
                                const mimeType = imagePart.inlineData.mimeType;
                                const base64Data = imagePart.inlineData.data;
                                const bytes = base64ToUint8Array(base64Data);
                                
                                const filename = `${adventureId}/${i}_${Date.now()}.jpg`;
                                const { data: uploadData, error: uploadError } = await supabaseClient
                                    .storage
                                    .from('adventure_images')
                                    .upload(filename, bytes, {
                                        contentType: mimeType,
                                        upsert: true
                                    });

                                if (uploadError) {
                                    console.error(`[process-adventure] Error subiendo imagen a Storage:`, uploadError);
                                    // Fallaremos silenciosamente y usará Pexels
                                } else {
                                    const { data: { publicUrl } } = supabaseClient
                                        .storage
                                        .from('adventure_images')
                                        .getPublicUrl(filename);
                                    imgUrl = publicUrl;
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`[process-adventure] AI Image generation failed for question ${i}`, e);
                    }
                }

                // FALLBACK 1 (Pexels)
                if (!imgUrl) {
                    fallbackCount++;
                    source = 'stock_fallback';
                    if (pexelsKey && q.stockKeyword) {
                        imgUrl = await searchPexelsImage(q.stockKeyword, pexelsKey);
                    }
                    
                    // FALLBACK 2 (Imagen Local)
                    if (!imgUrl) {
                        imgUrl = '/assets/fallback.png';
                    }
                }

                q.imageData = imgUrl; // El frontend espera imageData
                q.image = imgUrl; // Guardar también como fallback
                q.source = source;
            }
        }

        // 3. CONCILIACIÓN DE CRÉDITOS
        if (actualMode === 'ai') {
            // Buscamos si hay una transacción pendiente asociada
            const { data: pendingTx } = await supabaseClient
                .from('credit_transactions')
                .select('id')
                .eq('adventure_id', adventureId)
                .eq('status', 'pending')
                .single();

            if (pendingTx) {
                if (fallbackCount > 0) {
                    const refundAmount = fallbackCount * 10;
                    await refundCredits(supabaseClient, pendingTx.id, refundAmount);
                    console.log(`[process-adventure] Reembolsados ${refundAmount} créditos.`);
                }
                
                // Marcamos como completada para que no la devuelva el Cron
                await supabaseClient
                    .from('credit_transactions')
                    .update({ status: 'completed' })
                    .eq('id', pendingTx.id);
            }
        }

        // 4. ACTUALIZAR AVENTURA A COMPLETADO
        const { error: finalUpdateError } = await supabaseClient
            .from('adventures')
            .update({
                topic: gameData.correctedTopic || topic,
                audience: gameData.correctedAudience || audience,
                questions: gameData.questions,
                status: 'completed',
                thumbnail_url: gameData.questions[0]?.imageData || ''
            })
            .eq('id', adventureId);

        if (finalUpdateError) {
            throw new Error(`Error guardando datos finales: ${finalUpdateError.message}`);
        }

        console.log(`[process-adventure] Aventura ${adventureId} completada con éxito.`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error(`[process-adventure] Error Fatal:`, error.message);
        
        // Si falla masivamente, marcar como failed en BD para que el polling lo vea
        if (adventureId && supabaseClient) {
            await supabaseClient
                .from('adventures')
                .update({
                    status: 'failed',
                    error_message: error.message
                })
                .eq('id', adventureId);
            
            // Si hay una tx pendiente, el CRON la reembolsará a los 5 mins automáticamente, 
            // o podríamos reembolsar el 100% aquí si no ha subido imágenes.
        }

        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
