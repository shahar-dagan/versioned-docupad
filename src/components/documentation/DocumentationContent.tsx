
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
      <div className="text-center text-muted-foreground">
        Select a feature from the sidebar to view its documentation
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold m-0">{feature.name}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'user' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setViewMode('user')}
          >
            <User className="h-4 w-4" />
            User Guide
          </Button>
          <Button
            variant={viewMode === 'technical' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setViewMode('technical')}
          >
            <Code className="h-4 w-4" />
            Technical Docs
          </Button>
        </div>
      </div>
      
      <p className="text-lg text-muted-foreground mb-8">
        {feature.description}
      </p>

      <DocumentationSuggestions 
        suggestions={feature.suggestions?.filter(s => s.type === viewMode)}
        currentView={viewMode}
      />

      {viewMode === 'technical' ? (
        <TechnicalDocumentation technicalDocs={feature.technical_docs} />
      ) : (
        <UserDocumentation userDocs={feature.user_docs} />
      )}

      <div className="mt-12 p-6 border rounded-lg bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Book className="h-4 w-4" />
          Documentation Tips
        </div>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>• Review both technical and user documentation for completeness</li>
          <li>• Keep documentation up to date with feature changes</li>
          <li>• Include relevant screenshots and videos for clarity</li>
          <li>• Ensure code snippets are tested and working</li>
        </ul>
      </div>
    </div>
  );
}
