
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { extract } from "https://deno.land/x/mammoth@v1.4.21/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const productId = formData.get('productId') as string

    if (!file || !productId) {
      throw new Error('Missing file or product ID')
    }

    let content = ''
    const fileType = file.name.split('.').pop()?.toLowerCase()

    // Process different file types
    switch (fileType) {
      case 'md':
      case 'txt':
        content = await file.text()
        break
      
      case 'docx':
        const arrayBuffer = await file.arrayBuffer()
        const result = await extract(new Uint8Array(arrayBuffer))
        content = result.value
        break
      
      case 'pdf':
        // For PDF files, we'll use a simple text extraction
        // In a production environment, you might want to use a more robust PDF parser
        const pdfText = await file.text()
        content = pdfText
        break
      
      default:
        throw new Error('Unsupported file format')
    }

    // Create a new feature for the imported documentation
    const featureName = file.name.split('.')[0]
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('features')
      .insert({
        name: featureName,
        description: 'Imported documentation',
        product_id: productId,
        user_docs: {
          overview: content.substring(0, 500), // First 500 chars as overview
          content: content
        }
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, feature: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
