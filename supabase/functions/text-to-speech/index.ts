
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voiceId = "EXAVITQu4vr4xnSDxMaL" } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVEN_LABS_API_KEY')!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate speech')
    }

    // Get the audio data as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer()
    
    // Process the audio data in chunks to prevent stack overflow
    const chunkSize = 32768 // 32KB chunks
    const chunks = []
    const view = new Uint8Array(audioBuffer)
    
    for (let i = 0; i < view.length; i += chunkSize) {
      const chunk = view.slice(i, i + chunkSize)
      const binary = String.fromCharCode(...chunk)
      chunks.push(binary)
    }
    
    // Join all chunks and convert to base64
    const base64Audio = btoa(chunks.join(''))

    return new Response(
      JSON.stringify({ audio: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Text to speech error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
