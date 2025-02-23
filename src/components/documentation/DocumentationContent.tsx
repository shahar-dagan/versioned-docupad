
import { Book, Code, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentationSuggestions } from './DocumentationSuggestions';
import { TechnicalDocumentation } from './TechnicalDocumentation';
import { UserDocumentation } from './UserDocumentation';
import { useState, useEffect } from 'react';
import { analyzeUserActions } from './utils/userActionAnalysis';
import { VoiceInterface } from './VoiceInterface';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [actionableFeatures, setActionableFeatures] = useState<any[]>([]);
  const { authData } = useAuth();

  useEffect(() => {
    if (feature) {
      analyzeUserActions(feature as any).then(features => {
        console.log('Analyzed features:', features);
        setActionableFeatures(features);
      });
    }
  }, [feature]);

  useEffect(() => {
    if (feature?.user_docs) {
      setEditedContent(feature.user_docs.overview || '');
      setEditedTitle(feature.name);
    }
  }, [feature]);

  const handleSave = async () => {
    if (!feature || !authData?.user) return;

    try {
      const { error } = await supabase
        .from('documentation')
        .update({
          content: editedContent,
          title: editedTitle,
          author_id: authData.user.id,
        })
        .eq('feature_id', feature.id);

      if (error) throw error;

      toast.success('Documentation updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save documentation');
    }
  };

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

  const getDocumentationText = () => {
    const sections = [];
    if (viewMode === 'technical' && feature.technical_docs) {
      if (feature.technical_docs.architecture) sections.push(feature.technical_docs.architecture);
      if (feature.technical_docs.setup) sections.push(feature.technical_docs.setup);
      if (feature.technical_docs.api_details) sections.push(feature.technical_docs.api_details);
    } else if (viewMode === 'user' && feature.user_docs) {
      if (feature.user_docs.overview) sections.push(feature.user_docs.overview);
      if (feature.user_docs.steps) sections.push(feature.user_docs.steps.join('. '));
      if (feature.user_docs.use_cases) sections.push(`Use cases: ${feature.user_docs.use_cases.join('. ')}`);
    }
    return sections.join('. ');
  };

  return (
    <div className="prose prose-slate max-w-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-4xl font-bold mb-2"
            />
          ) : (
            <h1 className="text-4xl font-bold m-0">{feature.name}</h1>
          )}
          {!isEditing && (
            <p className="text-lg text-muted-foreground mt-2 mb-0">
              {feature.description}
            </p>
          )}
          <VoiceInterface text={getDocumentationText()} />
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Docs
              </Button>
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
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[400px] font-mono"
            placeholder="Enter documentation content..."
          />
        </div>
      ) : (
        <>
          {actionableFeatures.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold">Available Actions</h2>
              <div className="grid gap-4 mt-4">
                {actionableFeatures.map((feature, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium">{feature.name}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                    <div className="mt-2 space-y-2">
                      {feature.actions.map((action: any, actionIndex: number) => (
                        <div key={actionIndex} className="flex items-start gap-2 text-sm">
                          <span className="font-medium">{action.type}:</span>
                          <span className="text-muted-foreground">{action.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'technical' ? (
            <TechnicalDocumentation technicalDocs={feature.technical_docs} />
          ) : (
            <UserDocumentation userDocs={feature.user_docs} />
          )}
        </>
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
