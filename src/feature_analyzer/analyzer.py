import openai
from typing import Dict, List
import os
from dotenv import load_dotenv

load_dotenv()


class FeatureExtractor:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_key

    async def analyze_codebase(self, code_content: List[Dict]) -> Dict:
        """Analyze codebase and extract user-facing features."""

        system_prompt = """You are a feature analysis expert. Follow these exact steps:

Step 1: READ & UNDERSTAND
- Read through the provided code carefully
- Make notes about each component's purpose
- Identify how components interact with each other
- Break down the functionality into clear parts

Step 2: LIST ALL FUNCTIONALITY
Create a comprehensive list of everything the code does, including:
- UI components and their functions
- Data operations and processing
- User interactions and workflows
- System processes and automations

Step 3: IDENTIFY USER FEATURES
From the complete list, extract only features that users directly interact with:
- Focus on UI elements and user actions
- Include user workflows and processes
- Consider user settings and preferences
- Look for data input/output points

Step 4: CATEGORIZE FEATURES
Group features into categories like:
- Product Management
- Feature Tracking
- Documentation
- Authentication & User Management
- Repository Integration
- Team Collaboration

Step 5: DOCUMENT USER INTERACTIONS
For each feature, provide:
- Clear, user-friendly title
- Simple explanation of what it does
- Step-by-step usage instructions
- Common use cases

Format the response as a JSON with this exact structure:
{
    "categories": [
        {
            "name": "Category Name",
            "features": [
                {
                    "title": "Feature Name",
                    "description": "User-friendly description",
                    "user_interactions": [
                        "Step 1: ...",
                        "Step 2: ...",
                    ],
                    "use_cases": [
                        "Example 1: ...",
                        "Example 2: ...",
                    ]
                }
            ]
        }
    ]
}

Focus ONLY on features that users can directly interact with. Ignore internal implementations, configurations, and technical details."""

        # Prepare the code content for analysis
        codebase_context = self._prepare_analysis_context(code_content)

        # Get analysis from GPT-4
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Analyze this codebase and identify all user-facing features:\n\n{codebase_context}",
                },
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        return response.choices[0].message.content

    def _prepare_analysis_context(self, code_content: List[Dict]) -> str:
        """Prepare code content for analysis."""
        context_sections = []

        # Prioritize files that are likely to contain user-facing features
        priority_patterns = {
            "high": ["component", "page", "view", "screen", "form"],
            "medium": ["route", "controller", "handler"],
            "low": ["util", "helper", "service"],
        }

        # Group files by priority
        priority_files = {"high": [], "medium": [], "low": []}

        for file in code_content:
            path = file["path"].lower()
            content = file["content"]

            # Determine priority
            assigned = False
            for priority, patterns in priority_patterns.items():
                if any(pattern in path for pattern in patterns):
                    priority_files[priority].append(file)
                    assigned = True
                    break

            if not assigned:
                priority_files["low"].append(file)

        # Build context starting with highest priority files
        for priority in ["high", "medium", "low"]:
            if priority_files[priority]:
                context_sections.append(
                    f"\n=== {priority.upper()} PRIORITY FILES ===\n"
                )
                for file in priority_files[priority]:
                    context_sections.append(
                        f"\nFile: {file['path']}\n```\n{file['content']}\n```\n"
                    )

        return "\n".join(context_sections)
