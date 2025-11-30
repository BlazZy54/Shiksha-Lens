"""
ML pipeline for face recognition: embeddings, detection, and matching.
"""
import logging
import numpy as np
from typing import List, Tuple, Optional, Dict
from deepface import DeepFace
import cv2

logger = logging.getLogger(__name__)

# Global model cache to avoid reloading models
_model_cache: Dict[str, any] = {}


def load_model(model_name: str = "Facenet512") -> bool:
    """
    Preload a DeepFace model into cache.
    
    Args:
        model_name: Name of the model to load
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if model_name in _model_cache:
            logger.info(f"Model {model_name} already loaded")
            return True
            
        logger.info(f"Loading model: {model_name}")
        # Trigger model loading by doing a dummy representation
        # This will cache the model internally in DeepFace
        dummy_img = np.zeros((96, 96, 3), dtype=np.uint8)
        try:
            DeepFace.represent(
                dummy_img,
                model_name=model_name,
                detector_backend="skip",  # Skip detection for dummy
                enforce_detection=False
            )
        except Exception:
            # Expected to fail, but model will be loaded
            pass
            
        _model_cache[model_name] = True
        logger.info(f"Model {model_name} loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model {model_name}: {e}")
        return False


def get_embedding_from_image(img: np.ndarray, model_name: str = "Facenet512") -> Optional[np.ndarray]:
    """
    Extract face embedding from an image.
    
    Args:
        img: Image as numpy array (BGR format)
        model_name: DeepFace model name
        
    Returns:
        Embedding vector as numpy array or None if failed
    """
    try:
        if not isinstance(img, np.ndarray) or img.size == 0:
            logger.error("Invalid image provided")
            return None
            
        logger.debug(f"Extracting embedding using {model_name}")
        
        # Use opencv detector for face detection, then extract embedding
        result = DeepFace.represent(
            img,
            model_name=model_name,
            detector_backend="opencv",
            enforce_detection=True
        )
        
        if not result or len(result) == 0:
            logger.error("No face detected in image")
            return None
            
        # Get the first face embedding
        embedding = np.array(result[0]["embedding"])
        logger.debug(f"Extracted embedding of shape: {embedding.shape}")
        return embedding
        
    except Exception as e:
        logger.error(f"Failed to extract embedding: {e}")
        return None


def detect_and_embed_faces(img: np.ndarray, model_name: str = "Facenet512") -> List[np.ndarray]:
    """
    Detect all faces in an image and extract embeddings for each.
    
    Args:
        img: Image as numpy array (BGR format)
        model_name: DeepFace model name
        
    Returns:
        List of embedding vectors (one per detected face)
    """
    try:
        if not isinstance(img, np.ndarray) or img.size == 0:
            logger.error("Invalid image provided")
            return []
            
        logger.debug(f"Detecting faces and extracting embeddings using {model_name}")
        
        # First, detect faces using opencv
        faces = DeepFace.extract_faces(
            img,
            detector_backend="opencv",
            enforce_detection=True
        )
        
        if not faces or len(faces) == 0:
            logger.warning("No faces detected in image")
            return []
        
        embeddings = []
        for face_info in faces:
            # Extract embedding for each face (skip detection since we already have the face)
            try:
                face_img = face_info["face"]
                result = DeepFace.represent(
                    face_img,
                    model_name=model_name,
                    detector_backend="skip",  # Skip detection, we already have the face
                    enforce_detection=False
                )
                if result and len(result) > 0:
                    embedding = np.array(result[0]["embedding"])
                    embeddings.append(embedding)
            except Exception as e:
                logger.warning(f"Failed to extract embedding for one face: {e}")
                continue
        
        logger.info(f"Detected {len(embeddings)} faces and extracted embeddings")
        return embeddings
        
    except Exception as e:
        logger.error(f"Failed to detect and embed faces: {e}")
        return []


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Calculate cosine similarity between two vectors.
    
    Args:
        vec_a: First vector
        vec_b: Second vector
        
    Returns:
        Cosine similarity score (range: -1 to 1, typically 0 to 1 for normalized embeddings)
    """
    try:
        # Normalize vectors
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        # Cosine similarity = dot product / (norm_a * norm_b)
        similarity = np.dot(vec_a, vec_b) / (norm_a * norm_b)
        return float(similarity)
        
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

"""
def match_embeddings(
    detected_embeddings: List[np.ndarray],
    known_embeddings: List[Dict[str, any]],
    threshold: float = 0.60
) -> List[Dict[str, any]]:
    
    
    Match detected face embeddings against known student embeddings.
    Each student can have multiple embeddings - we match against all and pick the best.
    
    Args:
        detected_embeddings: List of embeddings from detected faces
        known_embeddings: List of dicts with 'student_id' and 'embeddings' (array of embeddings)
        threshold: Distance threshold (lower = stricter matching)
        
    Returns:
        List of candidates with student_id and confidence, sorted by confidence (desc)
    
    candidates = []
    
    if not detected_embeddings or not known_embeddings:
        return candidates
    
    try:
        for detected_emb in detected_embeddings:
            best_match = None
            best_confidence = 0.0
            
            for known in known_embeddings:
                student_id = known["student_id"]
                student_embeddings = known["embeddings"]  # Array of embeddings
                
                if not student_embeddings or len(student_embeddings) == 0:
                    continue
                
                # Calculate distances to all embeddings for this student
                distances = []
                for emb_list in student_embeddings:
                    known_emb = np.array(emb_list)
                    
                    # Calculate cosine similarity
                    similarity = cosine_similarity(detected_emb, known_emb)
                    
                    # Convert similarity to distance (distance = 1 - similarity)
                    distance = 1.0 - similarity
                    distances.append(distance)
                
                # Pick the best (minimum) distance
                best_distance = min(distances)
                
                # Check if within threshold
                if best_distance <= threshold:
                    # Convert distance to confidence score (0-1)
                    # confidence = 1 - best_distance
                    confidence = max(0.0, min(1.0, 1.0 - best_distance))
                    
                    # Keep track of best match for this detected face
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = {
                            "student_id": student_id,
                            "confidence": confidence
                        }
            
            # Add best match if found
            if best_match:
                candidates.append(best_match)
        
        # Sort by confidence (descending)
        candidates.sort(key=lambda x: x["confidence"], reverse=True)
        
        logger.info(f"Matched {len(candidates)} faces out of {len(detected_embeddings)} detected")
        return candidates
        
    except Exception as e:
        logger.error(f"Error matching embeddings: {e}")
        return []
"""
def match_embeddings(
    detected_embeddings: List[np.ndarray],
    known_embeddings: List[Dict[str, any]],
    similarity_threshold: float = 0.65  # much better threshold for cosine similarity
) -> List[Dict[str, any]]:

    candidates = []

    if not detected_embeddings or not known_embeddings:
        return candidates

    try:
        for detected_emb in detected_embeddings:
            best_match = None
            best_similarity = -1.0

            for known in known_embeddings:
                student_id = known["student_id"]
                student_embeds = known["embeddings"]

                if not student_embeds:
                    continue

                # compute cosine similarity to EACH student embedding
                similarities = [
                    cosine_similarity(detected_emb, np.array(emb))
                    for emb in student_embeds
                ]

                # take the maximum similarity (closest match)
                student_best = max(similarities)

                # matches must exceed similarity threshold
                if student_best >= similarity_threshold:
                    if student_best > best_similarity:
                        best_similarity = student_best
                        best_match = {
                            "student_id": student_id,
                            "confidence": float(student_best)   # similarity IS confidence
                        }

            if best_match:
                candidates.append(best_match)

        candidates.sort(key=lambda x: x["confidence"], reverse=True)
        return candidates

    except Exception as e:
        logger.error(f"Error matching embeddings: {e}")
        return []

