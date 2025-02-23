
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ImportDocumentationProps {
  productId: string;
  onImportComplete: () => void;
}

export function ImportDocumentation({ productId, onImportComplete }: ImportDocumentationProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);

    try {
      const { data, error } = await supabase.functions.invoke('process-documentation', {
        body: formData,
      });

      if (error) throw error;

      toast.success('Documentation imported successfully');
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import documentation');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Docs
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Documentation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".md,.docx,.txt,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
              <span className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-muted-foreground">
                Supported formats: MD, DOCX, TXT, PDF
              </span>
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
