
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    
    console.log('Processing file:', file.name, 'of type:', fileType);

    // Process different file types
    switch (fileType) {
      case 'md':
      case 'txt':
      case 'docx': // For now, we'll treat DOCX as text
        content = await file.text()
        break
      
      case 'pdf':
        const pdfText = await file.text()
        content = pdfText
        break
      
      default:
        throw new Error('Unsupported file format')
    }

    // Clean up the content
    content = content.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
    content = content.trim()

    if (!content) {
      throw new Error('No content could be extracted from the file')
    }

    console.log('Content extracted, length:', content.length);

    // Create a new feature for the imported documentation
    const featureName = file.name.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '-')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Split content into overview and full content
    const overview = content.substring(0, 500) // First 500 chars as overview
    
    const { data, error } = await supabase
      .from('features')
      .insert({
        name: featureName,
        description: 'Imported documentation',
        product_id: productId,
        user_docs: {
          overview: overview,
          content: content
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error);
      throw error
    }

    console.log('Feature created successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, feature: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-documentation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
