import { Book, Code, User, Image, PlayCircle, LightbulbIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CodeSnippet {
  language: string;
  code: string;
  description: string;
}

interface VisualAid {
  type: 'screenshot' | 'video';
  url: string;
  caption: string;
}

interface DocumentationSuggestion {
  type: 'technical' | 'user';
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface Feature {
  id: string;
  name: string;
  description: string;
  technical_docs?: {
    architecture?: string;
    setup?: string;
    api_details?: string;
    code_snippets?: CodeSnippet[];
    dependencies?: string[];
  };
  user_docs?: {
    overview?: string;
    steps?: string[];
    use_cases?: string[];
    visuals?: VisualAid[];
    faq?: Array<{ question: string; answer: string }>;
  };
  suggestions?: DocumentationSuggestion[];
}

interface DocumentationContentProps {
  feature: Feature | undefined;
  viewMode?: 'technical' | 'user';
}

export function DocumentationContent({ feature, viewMode = 'user' }: DocumentationContentProps) {
  if (!feature) {
    return (
      <div className="text-center text-muted-foreground">
        Select a feature from the sidebar to view its documentation
      </div>
    );
  }

  const renderSuggestions = () => {
    if (!feature.suggestions?.length) return null;

    const filteredSuggestions = feature.suggestions.filter(
      (suggestion) => suggestion.type === viewMode
    );

    if (!filteredSuggestions.length) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <LightbulbIcon className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Documentation Suggestions</h2>
        </div>
        <div className="grid gap-4">
          {filteredSuggestions.map((suggestion, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="font-medium mb-1">{suggestion.category}</div>
                    <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                  </div>
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${suggestion.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                    ${suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${suggestion.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                  `}>
                    {suggestion.priority}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderCodeSnippet = (snippet: CodeSnippet) => (
    <div className="my-4 rounded-lg bg-slate-950 p-4">
      <div className="text-sm text-slate-400 mb-2">{snippet.description}</div>
      <pre className="text-sm">
        <code className={`language-${snippet.language}`}>
          {snippet.code}
        </code>
      </pre>
    </div>
  );

  const renderVisualAid = (visual: VisualAid) => (
    <div className="my-4">
      {visual.type === 'screenshot' ? (
        <img 
          src={visual.url} 
          alt={visual.caption}
          className="rounded-lg border shadow-sm"
        />
      ) : (
        <video 
          controls 
          className="w-full rounded-lg border shadow-sm"
        >
          <source src={visual.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      <p className="text-sm text-muted-foreground mt-2">{visual.caption}</p>
    </div>
  );

  const renderTechnicalDocs = () => {
    const tech = feature.technical_docs;
    if (!tech) {
      return (
        <Alert>
          <AlertDescription>
            No technical documentation available yet. Use the suggestions above to start documenting this feature.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        {tech.architecture && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Architecture Overview</h2>
            <p className="text-muted-foreground">{tech.architecture}</p>
          </section>
        )}

        {tech.setup && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Setup Instructions</h2>
            <p className="text-muted-foreground">{tech.setup}</p>
          </section>
        )}

        {tech.api_details && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">API Documentation</h2>
            <p className="text-muted-foreground">{tech.api_details}</p>
          </section>
        )}

        {tech.code_snippets && tech.code_snippets.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Code Examples</h2>
            {tech.code_snippets.map((snippet, index) => (
              <div key={index}>
                {renderCodeSnippet(snippet)}
              </div>
            ))}
          </section>
        )}

        {tech.dependencies && tech.dependencies.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Dependencies</h2>
            <ul className="list-disc list-inside space-y-2">
              {tech.dependencies.map((dep, index) => (
                <li key={index} className="text-muted-foreground">{dep}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  const renderUserDocs = () => {
    const user = feature.user_docs;
    if (!user) {
      return (
        <Alert>
          <AlertDescription>
            No user documentation available yet. Use the suggestions above to start documenting this feature.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        {user.overview && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <p className="text-muted-foreground">{user.overview}</p>
          </section>
        )}

        {user.steps && user.steps.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">How to Use</h2>
            <ol className="space-y-4">
              {user.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
                    {index + 1}
                  </span>
                  <p className="text-muted-foreground leading-6">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {user.visuals && user.visuals.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Visual Guide</h2>
            {user.visuals.map((visual, index) => (
              <div key={index}>
                {renderVisualAid(visual)}
              </div>
            ))}
          </section>
        )}

        {user.use_cases && user.use_cases.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Common Use Cases</h2>
            <ul className="space-y-3">
              {user.use_cases.map((useCase, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-muted-foreground">{useCase}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user.faq && user.faq.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
            <div className="space-y-4">
              {user.faq.map((item, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-medium">{item.question}</h3>
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="prose prose-slate max-w-none">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold m-0">{feature.name}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'user' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <User className="h-4 w-4" />
            User Guide
          </Button>
          <Button
            variant={viewMode === 'technical' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Technical Docs
          </Button>
        </div>
      </div>
      
      <p className="text-lg text-muted-foreground mb-8">
        {feature.description}
      </p>

      {renderSuggestions()}
      {viewMode === 'technical' ? renderTechnicalDocs() : renderUserDocs()}

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
