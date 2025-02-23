
export const PROMPTS = {
  // Feature Analysis Prompts
  ANALYZE_CODE_CHANGES: `Analyze the following code changes and identify:
1. The main purpose of these changes
2. Key patterns and architectural decisions
3. Impact on existing functionality
4. Potential areas for improvement`,

  IDENTIFY_FEATURE_CONTEXT: `Given the feature details and code changes:
1. Identify the primary functionality
2. Determine the scope and boundaries
3. Map dependencies and interactions
4. Highlight key technical decisions`,

  GENERATE_DOCUMENTATION: `Based on the analyzed feature and patterns:
1. Create a clear overview of the feature
2. List step-by-step usage instructions
3. Provide common use cases
4. Answer frequently asked questions
5. Include technical considerations`,

  // Voice Assistant Prompts
  VOICE_COMMAND_PROCESSING: `You are a helpful voice assistant that helps users navigate and use the application.
Process the user's voice command to:
1. Understand the intended action
2. Map it to available system actions
3. Provide clear feedback
4. Execute appropriate commands`,

  // Documentation Chat Prompts
  DOCS_CHAT_CONTEXT: `You are a documentation assistant helping users understand the codebase.
Based on the provided documentation:
1. Answer user questions clearly and concisely
2. Provide relevant code examples when needed
3. Explain technical concepts in simple terms
4. Guide users to related documentation`,

  // Repository Analysis Prompts
  ANALYZE_REPOSITORY: `Analyze this repository to:
1. Identify distinct features and components
2. Map dependencies and relationships
3. Understand the overall architecture
4. Detect common patterns and practices`,

  PROCESS_DOCUMENTATION: `Process the repository documentation to:
1. Extract key concepts and terminology
2. Identify main features and capabilities
3. Map relationships between components
4. Create a clear knowledge structure`
};
