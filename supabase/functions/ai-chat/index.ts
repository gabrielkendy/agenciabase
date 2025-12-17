// Edge Function: AI Chat
// Suporta: OpenRouter, Gemini, OpenAI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  provider: 'openrouter' | 'gemini' | 'openai'
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Get request body
    const body: ChatRequest = await req.json()
    const { provider, model, messages, temperature = 0.7, max_tokens = 4096 } = body

    // Get API keys from database or env
    let apiKey = ''

    // Try to get from user's api_keys table first
    const { data: userKeys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (provider === 'openrouter') {
      apiKey = userKeys?.openrouter_key || Deno.env.get('OPENROUTER_API_KEY') || ''
    } else if (provider === 'gemini') {
      apiKey = userKeys?.gemini_key || Deno.env.get('GEMINI_API_KEY') || ''
    } else if (provider === 'openai') {
      apiKey = userKeys?.openai_key || Deno.env.get('OPENAI_API_KEY') || ''
    }

    if (!apiKey) {
      throw new Error(`API key not configured for ${provider}`)
    }

    let response: Response

    // OpenRouter
    if (provider === 'openrouter') {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': Deno.env.get('SITE_URL') || 'https://agency-saas.com',
          'X-Title': 'Agency SaaS'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
        })
      })
    }
    // Gemini
    else if (provider === 'gemini') {
      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }]
      }))

      // Handle system prompt
      const systemPrompt = messages.find(m => m.role === 'system')?.content || ''
      const userMessages = messages.filter(m => m.role !== 'system')

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: userMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: {
              temperature,
              maxOutputTokens: max_tokens,
            }
          })
        }
      )
    }
    // OpenAI
    else {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
        })
      })
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `${provider} API error: ${response.status}`)
    }

    const data = await response.json()

    // Normalize response
    let content = ''
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    if (provider === 'gemini') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      usage = {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      }
    } else {
      content = data.choices?.[0]?.message?.content || ''
      usage = data.usage || usage
    }

    // Log generation
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'chat',
      provider,
      model,
      input: JSON.stringify({ messages }),
      output: content,
      tokens_used: usage.total_tokens,
      cost_estimate: calculateCost(provider, model, usage),
    })

    return new Response(JSON.stringify({
      content,
      usage,
      provider,
      model,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Chat Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateCost(provider: string, model: string, usage: { prompt_tokens: number, completion_tokens: number }): number {
  // Rough cost estimates per 1K tokens
  const costs: Record<string, { input: number, output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    // OpenRouter free models
    'google/gemma-2-9b-it:free': { input: 0, output: 0 },
    'meta-llama/llama-3.2-3b-instruct:free': { input: 0, output: 0 },
    'mistralai/mistral-7b-instruct:free': { input: 0, output: 0 },
    // Gemini (free tier)
    'gemini-2.0-flash-exp': { input: 0, output: 0 },
    'gemini-1.5-flash': { input: 0, output: 0 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  }

  const modelCost = costs[model] || { input: 0.001, output: 0.002 }
  return (usage.prompt_tokens * modelCost.input + usage.completion_tokens * modelCost.output) / 1000
}
