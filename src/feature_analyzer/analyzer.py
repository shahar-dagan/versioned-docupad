from typing import Dict, List, Optional
import aiohttp
import base64
import os
from dotenv import load_dotenv
import openai
from urllib.parse import urlparse

load_dotenv()


class GitHubAnalyzer:
    def __init__(self):
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_key
        self.headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def analyze_repository(self, repo_url: str) -> Dict:
        """Main function to analyze a GitHub repository."""
        repo_info = self._parse_repo_url(repo_url)

        async with aiohttp.ClientSession() as session:
            # Get repository structure
            files = await self._get_repository_files(session, repo_info)

            # Filter relevant files and get their contents
            relevant_files = await self._get_relevant_files(
                session, files, repo_info
            )

            # Analyze with GPT-4
            return await self._analyze_with_gpt(relevant_files)

    async def _get_repository_files(
        self, session: aiohttp.ClientSession, repo_info: Dict
    ) -> List:
        """Recursively get all files in the repository."""

        async def fetch_contents(path=""):
            url = f'https://api.github.com/repos/{repo_info["owner"]}/{repo_info["repo"]}/contents/{path}'
            async with session.get(url, headers=self.headers) as response:
                if response.status == 200:
                    return await response.json()
                return []

        async def traverse_directory(path=""):
            contents = await fetch_contents(path)
            files = []

            for item in contents:
                if item["type"] == "file":
                    files.append(item)
                elif item["type"] == "dir":
                    subfiles = await traverse_directory(item["path"])
                    files.extend(subfiles)

            return files

        return await traverse_directory()

    async def _get_relevant_files(
        self, session: aiohttp.ClientSession, files: List, repo_info: Dict
    ) -> List[Dict]:
        """Get contents of relevant files."""
        relevant_extensions = {
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".vue",
            ".py",
            ".rb",
            ".php",
        }
        exclude_patterns = {
            "test",
            "spec",
            "mock",
            "stub",
            "fixture",
            "config",
            "dist",
            "build",
        }

        relevant_files = []

        for file in files:
            file_ext = os.path.splitext(file["name"])[1]
            if file_ext in relevant_extensions and not any(
                pattern in file["path"].lower() for pattern in exclude_patterns
            ):

                url = f'https://api.github.com/repos/{repo_info["owner"]}/{repo_info["repo"]}/contents/{file["path"]}'
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        content = await response.json()
                        if content.get("content"):
                            decoded_content = base64.b64decode(
                                content["content"]
                            ).decode("utf-8")
                            relevant_files.append(
                                {
                                    "path": file["path"],
                                    "content": decoded_content,
                                    "type": file_ext,
                                }
                            )

        return relevant_files

    async def _analyze_with_gpt(self, files: List[Dict]) -> Dict:
        """Analyze code files with GPT-4."""
        system_prompt = """You are an expert code analyzer. Follow these steps:

1. READ & UNDERSTAND:
- Carefully read through all provided code
- Make notes about functionality and purpose
- Identify key components and their relationships

2. LIST ALL FUNCTIONALITY:
- Document all features and capabilities
- Include both frontend and backend functionality
- Note system processes and user interactions

3. IDENTIFY USER FEATURES:
- Focus on user-facing features only
- Look for UI components, forms, and interactive elements
- Identify user workflows and actions

4. CATEGORIZE & DESCRIBE:
- Group features into logical categories
- Write clear, user-friendly feature titles
- Provide simple explanations for each feature

5. CREATE USER DOCUMENTATION:
- Focus on how users interact with each feature
- Provide step-by-step usage instructions
- Include practical examples and use cases

Format the response as a JSON with:
{
    "categories": [
        {
            "name": "Category Name",
            "features": [
                {
                    "title": "User-Friendly Feature Title",
                    "description": "Clear explanation for users",
                    "user_interactions": ["Step 1", "Step 2", ...],
                    "use_cases": ["Example 1", "Example 2", ...],
                    "documentation": {
                        "overview": "Brief overview",
                        "steps": ["Detailed step 1", "Detailed step 2", ...],
                        "tips": ["Helpful tip 1", "Helpful tip 2", ...]
                    }
                }
            ]
        }
    ]
}"""

        # Prepare the codebase context
        codebase_context = self._prepare_codebase_context(files)

        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Analyze this codebase and identify user-facing features:\n\n{codebase_context}",
                },
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        return response.choices[0].message.content

    def _prepare_codebase_context(self, files: List[Dict]) -> str:
        """Prepare a structured context from the codebase."""
        context_parts = []

        # Group files by type
        file_groups = {"components": [], "pages": [], "api": [], "other": []}

        for file in files:
            if "component" in file["path"].lower():
                file_groups["components"].append(file)
            elif (
                "page" in file["path"].lower() or "view" in file["path"].lower()
            ):
                file_groups["pages"].append(file)
            elif "api" in file["path"].lower():
                file_groups["api"].append(file)
            else:
                file_groups["other"].append(file)

        # Build context with structure
        for group_name, group_files in file_groups.items():
            if group_files:
                context_parts.append(f"\n=== {group_name.upper()} ===\n")
                for file in group_files:
                    context_parts.append(
                        f"\nFile: {file['path']}\n```{file['type'][1:]}\n{file['content']}\n```\n"
                    )

        return "\n".join(context_parts)

    @staticmethod
    def _parse_repo_url(repo_url: str) -> Dict:
        """Parse GitHub repository URL."""
        parsed = urlparse(repo_url)
        path_parts = parsed.path.strip("/").split("/")

        return {"owner": path_parts[0], "repo": path_parts[1]}
