import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { spendCredits, InsufficientFundsError } from '../_shared/wallet.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar cliente Supabase con el token del usuario que hace la petición
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Validar usuario autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Leer payload
    const { adventure_id, image_id } = await req.json()
    if (!adventure_id) {
      return new Response(JSON.stringify({ error: 'adventure_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Chequeo Atómico (Cobrar 15 créditos)
    // Según plan: atomic_spend(user_id, 15, adventure_id, 'regeneration')
    const transactionId = await spendCredits(
      supabaseClient,
      user.id,
      15, // Coste estricto por regenerar una imagen
      'regeneration',
      adventure_id
    )

    // TODO: 2. Implementar la llamada a OpenAI y actualizar la DB
    console.log(`[generate-image] Créditos cobrados con éxito. TxID: ${transactionId}. Generación IA pendiente.`);

    // 3. Respuesta de éxito temporal
    return new Response(JSON.stringify({
      success: true,
      transaction_id: transactionId,
      message: "Créditos cobrados. Generación IA pendiente de implementar."
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    // Capturamos específicamente la falta de fondos (402 Payment Required)
    if (error instanceof InsufficientFundsError || error.name === 'InsufficientFundsError') {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente para regenerar la imagen' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.error('[generate-image] Error inesperado:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
