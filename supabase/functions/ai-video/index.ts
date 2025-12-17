// Edge Function: AI Video Generation
// Suporta: FAL.ai (Runway, Kling, etc)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VideoRequest {
  provider: 'falai'
  model: 'runway-gen3' | 'kling' | 'luma-dream-machine'
  prompt: string
  image_url?: string  // For image-to-video
  duration?: number   // seconds
  aspect_ratio?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header required')

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid authentication')

    const body: VideoRequest = await req.json()
    const { provider, model, prompt, image_url, duration = 5, aspect_ratio = '16:9' } = body

    // Get API key
    const { data: userKeys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const apiKey = userKeys?.falai_key || Deno.env.get('FALAI_API_KEY') || ''
    if (!apiKey) throw new Error('FAL.ai API key not configured')

    let videoUrl = ''
    let cost = 0

    // Model endpoints
    const modelEndpoints: Record<string, string> = {
      'runway-gen3': 'fal-ai/runway-gen3/turbo/image-to-video',
      'kling': 'fal-ai/kling-video/v1/standard/image-to-video',
      'luma-dream-machine': 'fal-ai/luma-dream-machine',
    }

    const endpoint = modelEndpoints[model] || modelEndpoints['kling']

    // Start generation
    const response = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_url,
        duration: Math.min(duration, 10), // Max 10 seconds
        aspect_ratio,
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'FAL.ai API error')
    }

    const data = await response.json()

    // For async operations, we get a request_id
    if (data.request_id) {
      // Poll for completion
      for (let i = 0; i < 60; i++) { // 2 minutes max
        await new Promise(r => setTimeout(r, 3000))

        const statusResponse = await fetch(`https://fal.run/${endpoint}/requests/${data.request_id}/status`, {
          headers: { 'Authorization': `Key ${apiKey}` }
        })

        const statusData = await statusResponse.json()

        if (statusData.status === 'COMPLETED') {
          // Get result
          const resultResponse = await fetch(`https://fal.run/${endpoint}/requests/${data.request_id}`, {
            headers: { 'Authorization': `Key ${apiKey}` }
          })
          const resultData = await resultResponse.json()
          videoUrl = resultData.video?.url || resultData.output?.url || ''
          break
        }

        if (statusData.status === 'FAILED') {
          throw new Error('Video generation failed')
        }
      }
    } else {
      // Sync response
      videoUrl = data.video?.url || data.output?.url || ''
    }

    // Cost estimation per model
    const modelCosts: Record<string, number> = {
      'runway-gen3': 0.25,
      'kling': 0.10,
      'luma-dream-machine': 0.15,
    }
    cost = (modelCosts[model] || 0.15) * (duration / 5) // Per 5 seconds

    // Log generation
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'video',
      provider,
      model,
      input: JSON.stringify({ prompt, image_url, duration, aspect_ratio }),
      output: videoUrl,
      cost_estimate: cost,
    })

    return new Response(JSON.stringify({
      video_url: videoUrl,
      provider,
      model,
      cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Video Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
