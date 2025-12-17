// Edge Function: AI Router
// Roteador inteligente que seleciona o melhor provider/modelo baseado na tarefa

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouterRequest {
  task: 'chat' | 'image' | 'video' | 'voice' | 'analyze'
  input: any
  preferences?: {
    quality?: 'fast' | 'balanced' | 'best'
    cost?: 'free' | 'cheap' | 'any'
    provider?: string
  }
}

// Model rankings by task and quality
const MODEL_RANKINGS = {
  chat: {
    free: [
      { provider: 'openrouter', model: 'google/gemma-2-9b-it:free' },
      { provider: 'openrouter', model: 'meta-llama/llama-3.2-3b-instruct:free' },
      { provider: 'gemini', model: 'gemini-2.0-flash-exp' },
    ],
    cheap: [
      { provider: 'gemini', model: 'gemini-1.5-flash' },
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'openrouter', model: 'anthropic/claude-3-haiku' },
    ],
    best: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'gemini', model: 'gemini-1.5-pro' },
      { provider: 'openrouter', model: 'anthropic/claude-3-5-sonnet' },
    ],
  },
  image: {
    free: [
      { provider: 'falai', model: 'flux-schnell' },
    ],
    cheap: [
      { provider: 'freepik', model: 'mystic' },
      { provider: 'falai', model: 'flux-schnell' },
    ],
    best: [
      { provider: 'openai', model: 'dall-e-3' },
      { provider: 'freepik', model: 'mystic' },
    ],
  },
  video: {
    cheap: [
      { provider: 'falai', model: 'kling' },
    ],
    best: [
      { provider: 'falai', model: 'runway-gen3' },
      { provider: 'falai', model: 'luma-dream-machine' },
    ],
  },
  voice: {
    cheap: [
      { provider: 'elevenlabs', model: 'eleven_turbo_v2' },
    ],
    best: [
      { provider: 'elevenlabs', model: 'eleven_multilingual_v2' },
    ],
  },
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

    const body: RouterRequest = await req.json()
    const { task, input, preferences = {} } = body
    const { quality = 'balanced', cost = 'any', provider: preferredProvider } = preferences

    // Get user's API keys
    const { data: userKeys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Determine available providers
    const availableProviders: string[] = []
    if (userKeys?.gemini_key || Deno.env.get('GEMINI_API_KEY')) availableProviders.push('gemini')
    if (userKeys?.openai_key || Deno.env.get('OPENAI_API_KEY')) availableProviders.push('openai')
    if (userKeys?.openrouter_key || Deno.env.get('OPENROUTER_API_KEY')) availableProviders.push('openrouter')
    if (userKeys?.freepik_key || Deno.env.get('FREEPIK_API_KEY')) availableProviders.push('freepik')
    if (userKeys?.falai_key || Deno.env.get('FALAI_API_KEY')) availableProviders.push('falai')
    if (userKeys?.elevenlabs_key || Deno.env.get('ELEVENLABS_API_KEY')) availableProviders.push('elevenlabs')

    // Select best model for task
    const costTier = cost === 'free' ? 'free' : cost === 'cheap' ? 'cheap' : quality === 'best' ? 'best' : 'cheap'
    const taskModels = MODEL_RANKINGS[task as keyof typeof MODEL_RANKINGS]

    if (!taskModels) {
      throw new Error(`Unknown task type: ${task}`)
    }

    const tierModels = taskModels[costTier as keyof typeof taskModels] || taskModels['cheap'] || []

    // Find first available model
    let selectedModel = null
    for (const model of tierModels) {
      if (preferredProvider && model.provider !== preferredProvider) continue
      if (availableProviders.includes(model.provider)) {
        selectedModel = model
        break
      }
    }

    if (!selectedModel) {
      throw new Error(`No available providers for task: ${task}. Configure API keys in settings.`)
    }

    // Route to appropriate function
    const baseUrl = Deno.env.get('SUPABASE_URL')
    const functionKey = Deno.env.get('SUPABASE_ANON_KEY')

    let endpoint = ''
    let requestBody: any = {}

    switch (task) {
      case 'chat':
        endpoint = `${baseUrl}/functions/v1/ai-chat`
        requestBody = {
          provider: selectedModel.provider,
          model: selectedModel.model,
          ...input,
        }
        break
      case 'image':
        endpoint = `${baseUrl}/functions/v1/ai-image`
        requestBody = {
          provider: selectedModel.provider,
          ...input,
        }
        break
      case 'video':
        endpoint = `${baseUrl}/functions/v1/ai-video`
        requestBody = {
          provider: selectedModel.provider,
          model: selectedModel.model,
          ...input,
        }
        break
      case 'voice':
        endpoint = `${baseUrl}/functions/v1/ai-voice`
        requestBody = {
          provider: selectedModel.provider,
          ...input,
        }
        break
      default:
        throw new Error(`Unsupported task: ${task}`)
    }

    // Forward request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': functionKey || '',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Router request failed')
    }

    return new Response(JSON.stringify({
      ...data,
      routed_to: selectedModel,
      available_providers: availableProviders,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Router Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
