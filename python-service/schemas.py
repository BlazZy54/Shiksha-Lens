"""
Pydantic schemas for request and response models.
"""
from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field


class RegisterRequest(BaseModel):
    """Request model for /register endpoint."""
    student_id: int = Field(..., description="Unique student identifier")
    imageUrl: HttpUrl = Field(..., description="URL to student photo")
    model_name: Optional[str] = Field(default="Facenet512", description="DeepFace model name")


class RegisterResponse(BaseModel):
    """Response model for /register endpoint."""
    success: bool
    student_id: Optional[int] = None
    embedding: Optional[List[float]] = None
    error: Optional[str] = None


class KnownEmbedding(BaseModel):
    """Model for a known student with multiple embeddings."""
    student_id: int = Field(..., description="Student identifier")
    embeddings: List[List[float]] = Field(..., description="Array of face embedding vectors")


class RecognizeRequest(BaseModel):
    """Request model for /recognize endpoint."""
    imageUrl: HttpUrl = Field(..., description="URL to classroom image")
    known_embeddings: List[KnownEmbedding] = Field(..., description="List of known student embeddings")
    model_name: Optional[str] = Field(default="Facenet512", description="DeepFace model name")
    distance_threshold: Optional[float] = Field(default=0.35, description="Distance threshold for matching")


class Candidate(BaseModel):
    """Model for a recognition candidate."""
    student_id: int = Field(..., description="Matched student identifier")
    confidence: float = Field(..., description="Confidence score (0-1)")


class RecognizeResponse(BaseModel):
    """Response model for /recognize endpoint."""
    success: bool
    candidates: Optional[List[Candidate]] = None
    total_faces_detected: Optional[int] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for /health endpoint."""
    status: str

