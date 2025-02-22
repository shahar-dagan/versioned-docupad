
import { LightbulbIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DocumentationSuggestion {
  type: 'technical' | 'user';
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface DocumentationSuggestionsProps {
  suggestions?: DocumentationSuggestion[];
  currentView: 'technical' | 'user';
}

export function DocumentationSuggestions({ suggestions, currentView }: DocumentationSuggestionsProps) {
  if (!suggestions?.length) return null;

  const filteredSuggestions = suggestions.filter(
    (suggestion) => suggestion.type === currentView
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
}
