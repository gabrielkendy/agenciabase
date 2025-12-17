// Edge Function: AI Image Generation
// Suporta: Freepik Mystic, OpenAI DALL-E, FAL.ai

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageRequest {
  provider: 'freepik' | 'openai' | 'falai'
  prompt: string
  negative_prompt?: string
  style?: string
  size?: string
  num_images?: number
  guidance_scale?: number
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

    const body: ImageRequest = await req.json()
    const { provider, prompt, negative_prompt, style, size, num_images = 1, guidance_scale = 7.5 } = body

    // Get API key
    const { data: userKeys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let apiKey = ''
    if (provider === 'freepik') {
      apiKey = userKeys?.freepik_key || Deno.env.get('FREEPIK_API_KEY') || ''
    } else if (provider === 'openai') {
      apiKey = userKeys?.openai_key || Deno.env.get('OPENAI_API_KEY') || ''
    } else if (provider === 'falai') {
      apiKey = userKeys?.falai_key || Deno.env.get('FALAI_API_KEY') || ''
    }

    if (!apiKey) throw new Error(`API key not configured for ${provider}`)

    let images: string[] = []
    let cost = 0

    // Freepik Mystic
    if (provider === 'freepik') {
      // Map size to Freepik format
      const sizeMap: Record<string, string> = {
        '1:1': 'square_1_1',
        '16:9': 'widescreen_16_9',
        '9:16': 'portrait_9_16',
        '4:3': 'classic_4_3',
        '3:4': 'traditional_3_4',
      }

      const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-freepik-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          negative_prompt,
          guidance_scale,
          num_images,
          image: { size: sizeMap[size || '1:1'] || 'square_1_1' },
          styling: style ? { style } : undefined,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Freepik API error')
      }

      const data = await response.json()
      const generationId = data.data.id

      // Poll for completion
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000))

        const statusResponse = await fetch(`https://api.freepik.com/v1/ai/mystic/${generationId}`, {
          headers: {
            'Accept': 'application/json',
            'x-freepik-api-key': apiKey,
          }
        })

        const statusData = await statusResponse.json()

        if (statusData.data.status === 'COMPLETED') {
          images = statusData.data.generated?.map((g: any) => g.url) || []
          cost = statusData.meta?.credits_used || num_images * 0.1
          break
        }

        if (statusData.data.status === 'FAILED') {
          throw new Error('Image generation failed')
        }
      }
    }
    // OpenAI DALL-E
    else if (provider === 'openai') {
      const sizeMap: Record<string, string> = {
        '1:1': '1024x1024',
        '16:9': '1792x1024',
        '9:16': '1024x1792',
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1, // DALL-E 3 only supports 1
          size: sizeMap[size || '1:1'] || '1024x1024',
          quality: 'standard',
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'OpenAI API error')
      }

      const data = await response.json()
      images = data.data?.map((img: any) => img.url) || []
      cost = 0.04 // DALL-E 3 standard price
    }
    // FAL.ai
    else if (provider === 'falai') {
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt,
          num_images,
          image_size: size === '16:9' ? 'landscape_16_9' : size === '9:16' ? 'portrait_9_16' : 'square',
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'FAL.ai API error')
      }

      const data = await response.json()
      images = data.images?.map((img: any) => img.url) || []
      cost = num_images * 0.003 // FAL.ai Flux Schnell price
    }

    // Log generation
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'image',
      provider,
      model: provider === 'freepik' ? 'mystic' : provider === 'openai' ? 'dall-e-3' : 'flux-schnell',
      input: JSON.stringify({ prompt, negative_prompt, style, size }),
      output: JSON.stringify(images),
      cost_estimate: cost,
    })

    return new Response(JSON.stringify({
      images,
      provider,
      cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Image Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
