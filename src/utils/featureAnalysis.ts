
import { supabase } from '@/lib/supabase';

export async function analyzeFeatures(codeContent: string) {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-code', {
      body: { codeContent },
    });

    if (error) throw error;

    return {
      ...data.features,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
  } catch (error) {
    console.error('Error analyzing features:', error);
    throw error;
  }
}
