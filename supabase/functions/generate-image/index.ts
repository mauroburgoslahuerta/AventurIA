import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { spendCredits, refundCredits, InsufficientFundsError } from '../_shared/wallet.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Cliente autenticado del usuario
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: req.headers.get('Authorization')! } } 
    })

    // Cliente de servicio para bypass de RLS en Storage si fuera necesario
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

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

    let imgUrl = '';

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Referer': 'http://localhost:3000/'
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
        // PROHIBIDO BASE64 -> Subir a Supabase Storage
        const mimeType = imagePart.inlineData.mimeType;
        const base64Data = imagePart.inlineData.data;
        const bytes = base64ToUint8Array(base64Data);
        
        const filename = `${adventure_id}/regen_${question_index}_${Date.now()}.jpg`;
        const { error: uploadError } = await serviceClient
            .storage
            .from('adventure_images')
            .upload(filename, bytes, {
                contentType: mimeType,
                upsert: true
            });

        if (uploadError) {
            console.error(`[generate-image] Error subiendo imagen a Storage:`, uploadError);
            throw new Error(`Storage Upload Failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = serviceClient
            .storage
            .from('adventure_images')
            .getPublicUrl(filename);
            
        imgUrl = publicUrl;
      } else {
        throw new Error("No image data returned from Gemini.");
      }
    } catch (apiError: any) {
      console.error(`[generate-image] Error llamando a IA o Storage: ${apiError.message}`);
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
      await refundCredits(supabaseClient, transactionId, 15);
      throw new Error(`Failed to fetch adventure for update`);
    }

    const questions = adventureData.questions;
    if (Array.isArray(questions) && questions[question_index]) {
      questions[question_index].imageData = imgUrl; // Ahora es una URL pública
      questions[question_index].source = 'ai';

      // Usar serviceClient para saltar RLS si hay problemas, o supabaseClient si el usuario es dueño
      const { error: updateError } = await serviceClient
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

    // Completar transacción explícitamente para que el cron (5 mins) no la reembolse
    await serviceClient
        .from('credit_transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId);

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
