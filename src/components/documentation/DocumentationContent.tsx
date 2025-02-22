
import { Book, Code, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentationSuggestions } from './DocumentationSuggestions';
import { TechnicalDocumentation } from './TechnicalDocumentation';
import { UserDocumentation } from './UserDocumentation';
import { useState } from 'react';

interface Feature {
  id: string;
  name: string;
  description: string;
  technical_docs?: {
    architecture?: string;
    setup?: string;
    api_details?: string;
    code_snippets?: Array<{
      language: string;
      code: string;
      description: string;
    }>;
    dependencies?: string[];
  };
  user_docs?: {
    overview?: string;
    steps?: string[];
    use_cases?: string[];
    visuals?: Array<{
      type: 'screenshot' | 'video';
      url: string;
      caption: string;
    }>;
    faq?: Array<{ question: string; answer: string }>;
  };
  suggestions?: Array<{
    type: 'technical' | 'user';
    category: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface DocumentationContentProps {
  feature: Feature | undefined;
}

export function DocumentationContent({ feature }: DocumentationContentProps) {
  const [viewMode, setViewMode] = useState<'technical' | 'user'>('user');

  if (!feature) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-2">Welcome to the Documentation</h2>
        <p className="text-muted-foreground">
          Select a feature from the sidebar to learn how to use it. Each feature includes:
        </p>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>• Step-by-step guides</li>
          <li>• Visual examples</li>
          <li>• Common use cases</li>
          <li>• Frequently asked questions</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold m-0">{feature.name}</h1>
          <p className="text-lg text-muted-foreground mt-2 mb-0">
            {feature.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'user' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setViewMode('user')}
          >
            <User className="h-4 w-4" />
            How to Use
          </Button>
          <Button
            variant={viewMode === 'technical' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setViewMode('technical')}
          >
            <Code className="h-4 w-4" />
            Technical Details
          </Button>
        </div>
      </div>

      {viewMode === 'technical' ? (
        <TechnicalDocumentation technicalDocs={feature.technical_docs} />
      ) : (
        <UserDocumentation userDocs={feature.user_docs} />
      )}

      <div className="mt-12 p-6 border rounded-lg bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Book className="h-4 w-4" />
          Need Help?
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Can't find what you're looking for? Here are some tips:
        </p>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>• Check the FAQ section for common questions</li>
          <li>• Look at the visual examples for step-by-step guidance</li>
          <li>• Try out the suggested use cases</li>
          <li>• Switch to Technical Details if you need more in-depth information</li>
        </ul>
      </div>
    </div>
  );
}
