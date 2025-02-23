
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question } = await req.json()

    // Here we'll process the question and return appropriate animations
    // This is a simple example - you can expand this based on your needs
    const response = {
      text: "Let me show you how to create a new product. First, click the 'New Product' button at the top right.",
      animations: [
        {
          element: "button:contains('New Product')",
          action: "highlight",
          duration: 2000
        },
        {
          element: "button:contains('New Product')",
          action: "click",
          duration: 1000
        }
      ]
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
