
export const AI_PROMPTS = {
  featureAnalysis: {
    systemPrompt: `You are an AI code analyzer that identifies and categorizes features within a codebase.
Focus on identifying:
- Main functionality and purpose
- User interactions and flows
- Data operations
- UI components and their relationships`,
    
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

