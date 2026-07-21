import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { spendCredits, InsufficientFundsError } from '../_shared/wallet.ts';

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
        
        // --- LÓGICA DE TIERS ---
        const isGuest = !userId;
        const requestedMode = mode || 'ai'; 
        // Si es invitado, forzamos modo 'stock' siempre
        const actualMode = isGuest ? 'stock' : requestedMode;

        // --- ACTION: GENERATE GAME (ASÍNCRONO/TICKET) ---
        if (action === 'generate_game') {
            if (!supabaseClient) {
                // Invitados o sin token, creamos cliente básico
                supabaseClient = createClient(supabaseUrl, supabaseKey);
            }

            const configCount = count || 5;
            const configDifficulty = difficulty || 'Media';
            const configTopic = topic || 'General';
            const configAudience = audience || 'General';
            const totalImageCost = configCount * 10; // 10 créditos por imagen

            // 1. Generar UUID para la aventura de antemano
            const adventureId = crypto.randomUUID();

            // 2. COBRO ANTICIPADO ATÓMICO (Solo registrados en modo IA)
            if (!isGuest && actualMode === 'ai') {
                try {
                    await spendCredits(
                        supabaseClient,
                        userId!,
                        totalImageCost,
                        'generation',
                        adventureId // Enlazamos el coste con la aventura
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

            // 3. INSERTAR FILA 'PROCESSING'
            // Esto dispara el Database Webhook hacia 'process-adventure'
            const { error: insertError } = await supabaseClient
                .from('adventures')
                .insert({
                    id: adventureId,
                    user_id: userId,
                    topic: configTopic,
                    audience: configAudience,
                    config: { count: configCount, difficulty: configDifficulty, mode: actualMode },
                    status: 'processing'
                });

            if (insertError) {
                throw new Error(`Error al insertar la aventura: ${insertError.message}`);
            }

            // 4. DEVOLVER EL TICKET RÁPIDAMENTE
            return new Response(JSON.stringify({ 
                adventureId: adventureId, 
                status: 'processing',
                mode: actualMode
            }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // --- ACTION: GENERATE IMAGE ---
        // (Se mantiene por retrocompatibilidad temporal)
        if (action === 'generate_image') {
            if (!imagePrompt) throw new Error("Missing 'prompt' for image generation.");

            const apiKey = Deno.env.get('GEMINI_API_KEY');
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Referer': 'http://localhost:3000/'
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: imagePrompt }] }],
                        generationConfig: {
                            responseModalities: ["Image"]
                        }
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
            status: 200, // Supabase edge client won't parse body on 500 cleanly sometimes
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
