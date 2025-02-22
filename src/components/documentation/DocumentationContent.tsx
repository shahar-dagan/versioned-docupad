
import { Book } from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  description: string;
  suggestions?: string[];
}

interface DocumentationContentProps {
  feature: Feature | undefined;
}

export function DocumentationContent({ feature }: DocumentationContentProps) {
  if (!feature) {
    return (
      <div className="text-center text-muted-foreground">
        Select a feature from the sidebar to view its documentation
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <h1 className="text-4xl font-bold mb-6">{feature.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">
        {feature.description}
      </p>
      
      {feature.suggestions && feature.suggestions.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mt-12 mb-4">Implementation Guidelines</h2>
          <ul className="space-y-3">
            {feature.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                {suggestion}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-12 p-6 border rounded-lg bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Book className="h-4 w-4" />
          Quick Tips
        </div>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>• Review the implementation guidelines for best practices</li>
          <li>• Test the feature thoroughly before deployment</li>
          <li>• Consider edge cases in your implementation</li>
          <li>• Document any dependencies or requirements</li>
        </ul>
      </div>
    </div>
  );
}
