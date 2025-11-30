"""
FastAPI application for Smart Attendance ML Service.
Stateless microservice for face recognition and embedding extraction.
"""
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from schemas import (
    RegisterRequest,
    RegisterResponse,
    RecognizeRequest,
    RecognizeResponse,
    HealthResponse
)
from recognition import load_model, get_embedding_from_image, detect_and_embed_faces, match_embeddings
from utils import download_image, validate_image, numpy_to_list

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events.
    Preload models at startup.
    """
    # Startup
    logger.info("Starting Smart Attendance ML Service...")
    logger.info("Preloading Facenet512 model...")
    if load_model("Facenet512"):
        logger.info("Model preloaded successfully")
    else:
        logger.warning("Failed to preload model, will load on first request")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Smart Attendance ML Service...")


# Create FastAPI app
app = FastAPI(
    title="Smart Attendance ML Service",
    description="Stateless face recognition microservice for attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Status of the service
    """
    return HealthResponse(status="ok")


@app.post("/register", response_model=RegisterResponse)
async def register_student(request: RegisterRequest):
    """
    Extract face embedding from a student photo.
    
    Args:
        request: RegisterRequest with student_id, imageUrl, and optional model_name
        
    Returns:
        RegisterResponse with embedding vector
    """
    try:
        logger.info(f"Register request for student_id: {request.student_id}")
        
        # Download image
        img = download_image(str(request.imageUrl))
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to download or process image"
            )
        
        # Validate image
        if not validate_image(img):
            raise HTTPException(
                status_code=400,
                detail="Invalid image format"
            )
        
        # Ensure model is loaded
        if not load_model(request.model_name):
            raise HTTPException(
                status_code=503,
                detail=f"Failed to load model: {request.model_name}"
            )
        
        # Extract embedding
        embedding = get_embedding_from_image(img, request.model_name)
        if embedding is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to extract face embedding. Ensure image contains a clear face."
            )
        
        # Convert to list
        embedding_list = numpy_to_list(embedding)
        
        logger.info(f"Successfully extracted embedding for student_id: {request.student_id}")
        
        return RegisterResponse(
            success=True,
            student_id=request.student_id,
            embedding=embedding_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /register: {e}", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": f"Internal server error: {str(e)}"
            }
        )


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize_students(request: RecognizeRequest):
    """
    Recognize faces in a classroom image.
    
    Args:
        request: RecognizeRequest with imageUrl, known_embeddings, and optional parameters
        
    Returns:
        RecognizeResponse with matched candidates
    """
    try:
        logger.info(f"Recognize request with {len(request.known_embeddings)} known embeddings")
        
        # Validate request
        if not request.known_embeddings:
            raise HTTPException(
                status_code=400,
                detail="known_embeddings cannot be empty"
            )
        
        # Download image
        img = download_image(str(request.imageUrl))
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to download or process image"
            )
        
        # Validate image
        if not validate_image(img):
            raise HTTPException(
                status_code=400,
                detail="Invalid image format"
            )
        
        # Ensure model is loaded
        if not load_model(request.model_name):
            raise HTTPException(
                status_code=503,
                detail=f"Failed to load model: {request.model_name}"
            )
        
        # Detect faces and extract embeddings
        detected_embeddings = detect_and_embed_faces(img, request.model_name)
        
        if not detected_embeddings:
            logger.warning("No faces detected in classroom image")
            return RecognizeResponse(
                success=True,
                candidates=[],
                total_faces_detected=0
            )
        
        # Prepare known embeddings for matching
        known_emb_list = [
            {
                "student_id": ke.student_id,
                "embeddings": ke.embeddings  # Array of embeddings per student
            }
            for ke in request.known_embeddings
        ]
        
        # Match embeddings
        candidates = match_embeddings(
            detected_embeddings,
            known_emb_list,
            similarity_threshold=request.distance_threshold
        )
        
        logger.info(f"Recognition complete: {len(candidates)} matches from {len(detected_embeddings)} faces")
        
        return RecognizeResponse(
            success=True,
            candidates=candidates,
            total_faces_detected=len(detected_embeddings)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /recognize: {e}", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": f"Internal server error: {str(e)}"
            }
        )


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

