// Edge Function: AI Voice Generation
// Suporta: ElevenLabs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceRequest {
  provider: 'elevenlabs'
  text: string
  voice_id: string
  model_id?: string
  stability?: number
  similarity_boost?: number
  style?: number
}

// Default ElevenLabs voices
const DEFAULT_VOICES = {
  'daniel': 'onwK4e9ZLuTAKqWW03F9',
  'rachel': '21m00Tcm4TlvDq8ikWAM',
  'adam': 'pNInz6obpgDQGcFmaJgB',
  'antoni': 'ErXwobaYiN019PkySvjV',
  'bella': 'EXAVITQu4vr4xnSDxMaL',
  'elli': 'MF3mGyEYCl7XYWbV9V6O',
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

    const body: VoiceRequest = await req.json()
    const {
      provider,
      text,
      voice_id,
      model_id = 'eleven_multilingual_v2',
      stability = 0.5,
      similarity_boost = 0.75,
      style = 0
    } = body

    // Get API key
    const { data: userKeys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const apiKey = userKeys?.elevenlabs_key || Deno.env.get('ELEVENLABS_API_KEY') || ''
    if (!apiKey) throw new Error('ElevenLabs API key not configured')

    // Resolve voice name to ID if needed
    const resolvedVoiceId = DEFAULT_VOICES[voice_id.toLowerCase() as keyof typeof DEFAULT_VOICES] || voice_id

    // Generate speech
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: {
          stability,
          similarity_boost,
          style,
          use_speaker_boost: true,
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail?.message || 'ElevenLabs API error')
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    // Upload to Supabase Storage
    const fileName = `voice_${user.id}_${Date.now()}.mp3`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Return base64 as fallback
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

      // Log generation
      await supabase.from('generations').insert({
        user_id: user.id,
        type: 'voice',
        provider,
        model: model_id,
        input: JSON.stringify({ text, voice_id }),
        output: 'base64_audio',
        cost_estimate: text.length * 0.00003, // ~$0.30 per 1K chars
      })

      return new Response(JSON.stringify({
        audio_base64: base64Audio,
        content_type: 'audio/mpeg',
        provider,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName)

    const audioUrl = urlData?.publicUrl || ''

    // Estimate cost (~$0.30 per 1K characters)
    const cost = text.length * 0.00003

    // Log generation
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'voice',
      provider,
      model: model_id,
      input: JSON.stringify({ text, voice_id }),
      output: audioUrl,
      cost_estimate: cost,
    })

    return new Response(JSON.stringify({
      audio_url: audioUrl,
      provider,
      cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI Voice Error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
