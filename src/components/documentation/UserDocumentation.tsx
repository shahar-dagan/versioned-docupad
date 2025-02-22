
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, HelpCircle, Lightbulb } from 'lucide-react';

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
        <AlertDescription className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Documentation is being developed. In the meantime, try exploring the feature directly or check back soon.
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
            <CardTitle className="flex items-center gap-2">
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{userDocs.overview}</p>
          </CardContent>
        </Card>
      )}

      {userDocs.steps && userDocs.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Step-by-Step Guide
            </CardTitle>
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
            <CardTitle>See It in Action</CardTitle>
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
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Common Use Cases
            </CardTitle>
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
            <CardTitle className="flex items-center gap-2">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {userDocs.faq.map((item, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground pl-6">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
