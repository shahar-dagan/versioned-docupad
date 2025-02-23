import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DocumentationExportProps {
  documentationText: string;
  featureName: string;
  isAdmin: boolean;
}

export function DocumentationExport({ documentationText, featureName, isAdmin }: DocumentationExportProps) {
  if (!isAdmin) return null;

  const exportAsTxt = () => {
    const blob = new Blob([documentationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${featureName}-documentation.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Documentation exported as TXT');
  };

  const exportAsMarkdown = () => {
    const markdownContent = `# ${featureName}\n\n${documentationText}`;
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${featureName}-documentation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Documentation exported as Markdown');
  };

  const exportAsHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${featureName} Documentation</title>
          <style>
            body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
            h1 { color: #333; }
            p { margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <h1>${featureName}</h1>
          ${documentationText.split('\n').map(line => `<p>${line}</p>`).join('')}
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${featureName}-documentation.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Documentation exported as HTML');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsTxt}>
          Export as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsMarkdown}>
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsHTML}>
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
