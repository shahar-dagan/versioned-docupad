
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CodeSnippet {
  language: string;
  code: string;
  description: string;
}

interface TechnicalDocs {
  architecture?: string;
  setup?: string;
  api_details?: string;
  code_snippets?: CodeSnippet[];
  dependencies?: string[];
}

interface TechnicalDocumentationProps {
  technicalDocs?: TechnicalDocs;
}

export function TechnicalDocumentation({ technicalDocs }: TechnicalDocumentationProps) {
  if (!technicalDocs) {
    return (
      <Alert>
        <AlertDescription>
          No technical documentation available yet. Use the suggestions above to start documenting this feature.
        </AlertDescription>
      </Alert>
    );
  }

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

  return (
    <div className="space-y-6">
      {technicalDocs.architecture && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Architecture Overview</h2>
          <p className="text-muted-foreground">{technicalDocs.architecture}</p>
        </section>
      )}

      {technicalDocs.setup && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Setup Instructions</h2>
          <p className="text-muted-foreground">{technicalDocs.setup}</p>
        </section>
      )}

      {technicalDocs.api_details && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">API Documentation</h2>
          <p className="text-muted-foreground">{technicalDocs.api_details}</p>
        </section>
      )}

      {technicalDocs.code_snippets && technicalDocs.code_snippets.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Code Examples</h2>
          {technicalDocs.code_snippets.map((snippet, index) => (
            <div key={index}>{renderCodeSnippet(snippet)}</div>
          ))}
        </section>
      )}

      {technicalDocs.dependencies && technicalDocs.dependencies.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Dependencies</h2>
          <ul className="list-disc list-inside space-y-2">
            {technicalDocs.dependencies.map((dep, index) => (
              <li key={index} className="text-muted-foreground">{dep}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
