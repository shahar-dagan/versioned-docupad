from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import os
from dotenv import load_dotenv
from analyzer import CodebaseAnalyzer

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    repository_path: str


class Feature(BaseModel):
    name: str
    description: str
    category: str
    user_interactions: List[str]


class AnalysisResponse(BaseModel):
    features: List[Feature]
    categories: List[str]


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_codebase(request: AnalysisRequest):
    try:
        analyzer = CodebaseAnalyzer(os.getenv("OPENAI_API_KEY"))
        analysis_result = await analyzer.analyze_codebase(
            request.repository_path
        )

        return AnalysisResponse(**analysis_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
