
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio } = await req.json()

    if (!audio) {
      throw new Error('No audio data provided')
    }

    // Convert base64 to blob
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });

    // Create form data for Gladia API
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language_behaviour', 'automatic single language');
    formData.append('toggle_diarization', 'true');

    // Send to Gladia API
    const response = await fetch('https://api.gladia.io/audio/text/audio-transcription/', {
      method: 'POST',
      headers: {
        'x-gladia-key': Deno.env.get('GLADIA_API_KEY') || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Gladia API error: ${await response.text()}`);
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ text: result.prediction }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
