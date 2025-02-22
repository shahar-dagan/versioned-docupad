
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VisualAid {
  type: 'screenshot' | 'video';
  url: string;
  caption: string;
}

interface UserDocs {
  overview?: string;
  steps?: string[];
  use_cases?: string[];
  visuals?: VisualAid[];
  faq?: Array<{ question: string; answer: string }>;
}

interface UserDocumentationProps {
  userDocs?: UserDocs;
}

export function UserDocumentation({ userDocs }: UserDocumentationProps) {
  if (!userDocs) {
    return (
      <Alert>
        <AlertDescription>
          No user documentation available yet. Use the suggestions above to start documenting this feature.
        </AlertDescription>
      </Alert>
    );
  }

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

  return (
    <div className="space-y-6">
      {userDocs.overview && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-muted-foreground">{userDocs.overview}</p>
        </section>
      )}

      {userDocs.steps && userDocs.steps.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">How to Use</h2>
          <ol className="space-y-4">
            {userDocs.steps.map((step, index) => (
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

      {userDocs.visuals && userDocs.visuals.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Visual Guide</h2>
          {userDocs.visuals.map((visual, index) => (
            <div key={index}>{renderVisualAid(visual)}</div>
          ))}
        </section>
      )}

      {userDocs.use_cases && userDocs.use_cases.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Common Use Cases</h2>
          <ul className="space-y-3">
            {userDocs.use_cases.map((useCase, index) => (
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

      {userDocs.faq && userDocs.faq.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
          <div className="space-y-4">
            {userDocs.faq.map((item, index) => (
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
}
