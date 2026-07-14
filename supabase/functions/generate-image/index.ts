import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { spendCredits, refundCredits, InsufficientFundsError } from '../_shared/wallet.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { adventure_id, question_index, prompt } = await req.json()
    if (!adventure_id || question_index === undefined || !prompt) {
      return new Response(JSON.stringify({ error: 'adventure_id, question_index, and prompt are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Chequeo Atómico (Cobrar 15 créditos)
    const transactionId = await spendCredits(
      supabaseClient,
      user.id,
      15, // Coste estricto por regenerar una imagen
      'regeneration',
      adventure_id
    )

    console.log(`[generate-image] Créditos cobrados con éxito. TxID: ${transactionId}. Iniciando Gemini.`);

    // 2. Llamada a Gemini API
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      await refundCredits(supabaseClient, transactionId, 15);
      throw new Error("GEMINI_API_KEY no está configurada en los secrets.");
    }

    const reqOrigin = req.headers.get('Origin') || req.headers.get('Referer') || 'http://localhost:5173';
    let imgUrl = '';

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Referer': reqOrigin
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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
        imgUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      } else {
        throw new Error("No image data returned from Gemini.");
      }
    } catch (apiError: any) {
      console.error(`[generate-image] Error llamando a IA: ${apiError.message}`);
      await refundCredits(supabaseClient, transactionId, 15);
      throw apiError;
    }

    // 3. Actualizar la tabla adventures (JSONB)
    const { data: adventureData, error: fetchError } = await supabaseClient
      .from('adventures')
      .select('questions')
      .eq('id', adventure_id)
      .single();

    if (fetchError || !adventureData) {
      console.error(`[generate-image] Error fetching adventure:`, fetchError);
      // No devolvemos créditos aquí, porque la imagen ya se generó y costó dinero, 
      // pero por amabilidad podríamos hacerlo. Para seguir política estricta, si la base de datos falla al guardar, 
      // el usuario pierde el crédito pero tiene la imagen si se la pasamos en la respuesta.
      // O bien hacemos refund si falla el guardado:
      await refundCredits(supabaseClient, transactionId, 15);
      throw new Error(`Failed to fetch adventure for update`);
    }

    const questions = adventureData.questions;
    if (Array.isArray(questions) && questions[question_index]) {
      questions[question_index].imageData = imgUrl;
      questions[question_index].source = 'ai';

      const { error: updateError } = await supabaseClient
        .from('adventures')
        .update({ questions })
        .eq('id', adventure_id);
      
      if (updateError) {
        console.error(`[generate-image] Error updating adventure:`, updateError);
        // Refund on save failure
        await refundCredits(supabaseClient, transactionId, 15);
        throw new Error(`Failed to update adventure with new image`);
      }
    } else {
      await refundCredits(supabaseClient, transactionId, 15);
      throw new Error(`Invalid question_index: ${question_index}`);
    }

    // Completar transacción si existiese un flag status='completed', pero actualmente
    // el trigger no lo requiere para que se descuente.

    // 4. Respuesta de éxito
    return new Response(JSON.stringify({
      success: true,
      transaction_id: transactionId,
      imageData: imgUrl
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    if (error instanceof InsufficientFundsError || error.name === 'InsufficientFundsError') {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente para regenerar la imagen' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.error('[generate-image] Error inesperado:', error);
    // Devolver status 200 con error para que Supabase client no oculte el body
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
