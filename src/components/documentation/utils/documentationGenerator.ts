
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  const codeAnalysis = {
    components: feature.code_changes?.map(change => change.file_path) || [],
    changeTypes: feature.code_changes?.map(change => change.change_type) || [],
    descriptions: feature.code_changes?.map(change => change.change_description) || []
  };

  const functionalityPatterns = new Set<string>();
  const userInteractions = new Set<string>();

  // Extract user interactions from code
  feature.code_changes?.forEach(change => {
    if (!change.content) return;

    // Look for event handlers
    const eventMatches = change.content.match(/on[A-Z]\w+={[^}]+}/g) || [];
    eventMatches.forEach(match => {
      const eventType = match.match(/on([A-Z]\w+)/) || [];
      if (eventType[1]) {
        userInteractions.add(`${eventType[1].toLowerCase()} interaction`);
      }
    });

    // Look for form submissions
    if (change.content.includes('handleSubmit') || change.content.includes('onSubmit')) {
      userInteractions.add('Form submission');
    }

    // Look for navigation
    if (change.content.includes('useNavigate') || change.content.includes('<Link')) {
      userInteractions.add('Navigation');
    }

    // Look for data operations
    if (change.content.includes('useQuery') || change.content.includes('useMutation')) {
      userInteractions.add('Data management');
    }
  });

  return Array.from(new Set([
    ...Array.from(functionalityPatterns),
    ...Array.from(userInteractions)
  ]));
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  const guides: Record<string, {
    title: string;
    explanation: string;
    steps: string[];
  }> = {};

  feature.code_changes?.forEach(change => {
    if (!change.content) return;

    // Extract form interactions
    const formMatches = change.content.match(/<form[^>]*>[\s\S]*?<\/form>/g) || [];
    formMatches.forEach(form => {
      const formTitle = `Using ${feature.name} Form`;
      guides[formTitle] = {
        title: formTitle,
        explanation: "How to submit information",
        steps: [
          "Fill in all required fields",
          "Validate your input",
          "Submit the form",
          "Check for confirmation message"
        ]
      };
    });

    // Extract button interactions
    const buttonMatches = change.content.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
    buttonMatches.forEach(button => {
      const actionText = button.match(/>([^<]+)</)?.[1] || 'action';
      const buttonTitle = `Performing ${actionText}`;
      guides[buttonTitle] = {
        title: buttonTitle,
        explanation: `How to ${actionText.toLowerCase()}`,
        steps: [
          `Locate the ${actionText} button`,
          "Click the button",
          "Wait for the action to complete",
          "Verify the result"
        ]
      };
    });

    // Extract navigation patterns
    const linkMatches = change.content.match(/<Link[^>]*>[\s\S]*?<\/Link>/g) || [];
    linkMatches.forEach(link => {
      const navTitle = "Navigation Guide";
      guides[navTitle] = {
        title: navTitle,
        explanation: "How to navigate through the application",
        steps: [
          "Find the navigation menu",
          "Click on your desired destination",
          "Wait for the page to load",
          "Verify you're in the right place"
        ]
      };
    });
  });

  return guides;
};

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  const guides = createUserFriendlyGuides(feature);
  const mainFeatures = analyzeFeature(feature);

  const steps = Object.values(guides).flatMap(guide => guide.steps);
  const useCases = mainFeatures.map(feature => `When you need to ${feature.toLowerCase()}`);

  const faq = mainFeatures.map(feature => ({
    question: `How do I ${feature.toLowerCase()}?`,
    answer: guides[feature]?.steps.join(' Then ') || `Use the ${feature.toLowerCase()} functionality in the interface.`
  }));

  return {
    overview: `${feature.name} allows you to ${mainFeatures.join(', ')}. Here's how to use it effectively.`,
    steps,
    use_cases: useCases,
    faq
  };
};
