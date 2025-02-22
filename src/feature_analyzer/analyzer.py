from typing import Dict, List, Optional
import openai
import ast
import os
from pathlib import Path


class CodebaseAnalyzer:
    def __init__(self, api_key: str):
        self.openai = openai
        self.openai.api_key = api_key

    async def analyze_codebase(self, root_dir: str) -> Dict:
        # Collect relevant files
        code_files = self._collect_code_files(root_dir)

        # Prepare the context for GPT
        codebase_context = self._prepare_codebase_context(code_files)

        # Create the analysis prompt
        system_prompt = """You are an expert code analyzer. Analyze the provided codebase to:
1. Identify all user-facing features
2. Group features into logical categories
3. Focus only on functionality that users directly interact with
4. Ignore infrastructure, configuration, and internal implementation details

For each feature identified, provide:
- Feature name
- Category
- User interaction points
- Purpose from user perspective"""

        user_prompt = f"""Analyze this codebase and identify all user-facing features.
Focus on elements like:
- UI components and forms
- User actions and workflows
- Data manipulation features
- Navigation elements
- User settings and preferences

Codebase context:
{codebase_context}

Format the response as a JSON with categories and features."""

        # Get analysis from GPT-4
        response = await self.openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        return self._process_gpt_response(response)

    def _collect_code_files(self, root_dir: str) -> List[Dict]:
        """Collect relevant code files while filtering out non-essential ones."""
        relevant_files = []
        exclude_patterns = {
            "test",
            "spec",
            "config",
            "utils",
            "types",
            ".git",
            "node_modules",
            "dist",
            "build",
        }

        for path in Path(root_dir).rglob("*"):
            if path.is_file() and self._is_relevant_file(
                path, exclude_patterns
            ):
                try:
                    content = path.read_text()
                    relevant_files.append(
                        {
                            "path": str(path),
                            "content": content,
                            "type": path.suffix,
                        }
                    )
                except Exception as e:
                    print(f"Error reading {path}: {e}")

        return relevant_files

    def _prepare_codebase_context(self, files: List[Dict]) -> str:
        """Prepare a condensed, relevant context from the codebase."""
        context = []

        for file in files:
            # Focus on files likely to contain user-facing features
            if self._is_feature_relevant_file(file):
                summary = self._summarize_file_content(file)
                context.append(f"File: {file['path']}\n{summary}\n")

        return "\n".join(context)

    def _summarize_file_content(self, file: Dict) -> str:
        """Extract relevant information from file content."""
        try:
            # For React/Vue components
            if "component" in file["path"].lower():
                return self._extract_component_info(file["content"])
            # For route definitions
            elif "route" in file["path"].lower():
                return self._extract_route_info(file["content"])
            # For API endpoints
            elif "api" in file["path"].lower():
                return self._extract_api_info(file["content"])
            else:
                return self._extract_general_info(file["content"])
        except Exception as e:
            return f"Error summarizing file: {e}"

    def _process_gpt_response(self, response) -> Dict:
        """Process and validate GPT's analysis."""
        try:
            features = response.choices[0].message.content
            # Additional validation and processing
            return self._validate_features(features)
        except Exception as e:
            raise Exception(f"Error processing GPT response: {e}")

    @staticmethod
    def _is_feature_relevant_file(file: Dict) -> bool:
        """Determine if a file is likely to contain user-facing features."""
        relevant_patterns = {
            "component",
            "page",
            "view",
            "screen",
            "form",
            "modal",
            "dialog",
            "container",
        }
        return any(
            pattern in file["path"].lower() for pattern in relevant_patterns
        )

    @staticmethod
    def _is_relevant_file(path: Path, exclude_patterns: set) -> bool:
        """Check if a file should be included in the analysis."""
        return path.suffix in {
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".vue",
            ".py",
            ".rb",
        } and not any(pattern in str(path) for pattern in exclude_patterns)
