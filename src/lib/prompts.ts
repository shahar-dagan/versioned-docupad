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

  GENERATE_DOCUMENTATION: `You are writing clear documentation to help users understand and use features effectively. 

For each feature you document:

1. Start with a Simple Overview
- Explain what the feature does in one sentence
- Describe the main benefit to users
- Show a quick example of when to use it

2. Provide Clear Instructions
- Break down usage into clear steps
- Start each step with an action verb
- Include what users should see after each step
- Example: "Click 'New Project' → Enter project name → Click 'Create'"

3. Show Real-World Examples
- Include 2-3 common scenarios users will encounter
- Write examples as "When you want to... you can..."
- Add expected outcomes for each example

4. Answer Common Questions
- Address frequent user concerns
- Focus on task completion
- Include troubleshooting tips

Writing Guidelines:
✓ Use: "Create a new project" 
✗ Avoid: "Initialize a new project instance"

✓ Use: "Choose your team members"
✗ Avoid: "Configure user permissions"

Remember: Write as if you're explaining to a friend, not writing technical specs.`,

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
} as const;
