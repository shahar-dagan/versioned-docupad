
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          No user documentation available yet. Check the suggestions above to start documenting this feature.
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
          className="rounded-lg border shadow-sm w-full"
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
    <div className="space-y-8">
      {userDocs.overview && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{userDocs.overview}</p>
          </CardContent>
        </Card>
      )}

      {userDocs.steps && userDocs.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {userDocs.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                    {index + 1}
                  </span>
                  <p className="text-muted-foreground leading-6">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {userDocs.visuals && userDocs.visuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Visual Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {userDocs.visuals.map((visual, index) => (
              <div key={index}>{renderVisualAid(visual)}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {userDocs.use_cases && userDocs.use_cases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Use Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {userDocs.use_cases.map((useCase, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-muted-foreground">{useCase}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {userDocs.faq && userDocs.faq.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {userDocs.faq.map((item, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-medium">{item.question}</h3>
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
