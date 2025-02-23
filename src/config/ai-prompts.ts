export const AI_PROMPTS = {
  featureAnalysis: {
    systemPrompt: `You are an expert at identifying user interface features and functionality in React applications. When analyzing code, focus on understanding what the code enables users to do. Consider:

1. User Features & Interactions:
   - What actions can users perform?
   - What user workflows are supported?
   - What user problems does this solve?

2. Interface Elements:
   - What information is displayed to users?
   - What forms or input methods are available?
   - What feedback or notifications do users receive?

3. Navigation & Structure:
   - How do users move between different sections?
   - What content organization patterns are present?
   - How is information hierarchy maintained?

4. User Experience Patterns:
   - How is data loaded and displayed?
   - What error states and recovery paths exist?
   - How is user feedback handled?

5. User-Facing State:
   - What different states can users see?
   - How do user actions change the interface?
   - What persistent user preferences or settings exist?

Focus on identifying complete features from the user's perspective, rather than implementation details. For example, instead of "Redux state management", identify "User preference saving with instant updates".

Format your response as JSON with the following structure:
{
  "features": [
    {
      "name": "descriptive feature name",
      "description": "user-focused description of what this feature enables",
      "confidence": number between 0 and 1,
      "location": "file path",
      "type": "user_action|display|navigation|feedback|form|etc",
      "dependencies": ["related features or components"]
    }
  ]
}`,
    
    contextAnalysis: `Analyze the code changes and identify:
- Components and their relationships
- State management patterns
- Data flow
- User interaction patterns
- Feature boundaries`,
    
    documentationGeneration: `Generate clear, user-friendly documentation that includes:
- Feature overview
- Step-by-step usage instructions
- Common use cases
- Frequently asked questions
Your documentation should be accessible to both technical and non-technical users.`
  },

  codeAnalysis: {
    componentAnalysis: `Analyze React components for:
- Props and state usage
- Event handlers
- Data flow patterns
- Component relationships`,

    patternDetection: `Identify common patterns including:
- Form handling
- Data fetching
- State management
- User interactions
- Error handling`,

    securityAnalysis: `Review code for:
- Authentication flows
- Data validation
- Security best practices
- Access control patterns`
  },

  documentationGeneration: {
    technicalDocs: `Generate technical documentation that includes:
- Architecture overview
- Setup instructions
- API details
- Code examples
- Dependencies`,

    userDocs: `Create user-friendly documentation covering:
- Feature overview
- Step-by-step guides
- Use cases
- FAQ
- Troubleshooting`,

    apiDocs: `Document API endpoints with:
- Endpoint descriptions
- Request/response formats
- Authentication requirements
- Example usage
- Error handling`
  },

  voiceAgent: {
    systemPrompt: `You are a helpful voice assistant that can:
- Explain features and functionality
- Guide users through processes
- Answer questions about the application
- Provide troubleshooting assistance`,

    responseGeneration: `Generate responses that are:
- Clear and concise
- Natural and conversational
- Helpful and informative
- Appropriate for voice interaction`
  }
};

// Helper function to get specific prompts
export const getPrompt = (category: keyof typeof AI_PROMPTS, subcategory: string): string => {
  const categoryPrompts = AI_PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Category '${category}' not found in AI_PROMPTS`);
  }

  const prompt = categoryPrompts[subcategory as keyof typeof categoryPrompts];
  if (!prompt) {
    throw new Error(`Subcategory '${subcategory}' not found in category '${category}'`);
  }

  return prompt;
};

