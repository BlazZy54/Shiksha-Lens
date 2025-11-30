"""
ML pipeline for face recognition: embeddings, detection, and matching.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
from deepface import DeepFace
import cv2

logger = logging.getLogger(__name__)

# Global model cache to avoid reloading models
_model_cache: Dict[str, Any] = {}


# ------------------------------
# Utility: L2 normalization
# ------------------------------

def l2_normalize(vec: np.ndarray) -> np.ndarray:
    """
    L2-normalize a vector. If norm is zero, returns the original vector.
    """
    vec = np.asarray(vec, dtype=np.float32)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


# ------------------------------
# Model loading
# ------------------------------

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

        # DeepFace will internally cache the model; we just force a load.
        try:
            dummy_img = np.zeros((96, 96, 3), dtype=np.uint8)
            DeepFace.represent(
                dummy_img,
                model_name=model_name,
                detector_backend="skip",
                enforce_detection=False
            )
        except Exception:
            # We don't care about dummy failure; model is still cached.
            pass

        _model_cache[model_name] = True
        logger.info(f"Model {model_name} loaded successfully")
        return True

    except Exception as e:
        logger.error(f"Failed to load model {model_name}: {e}")
        return False


# ------------------------------
# Embedding extraction
# ------------------------------

def get_embedding_from_image(
    img: np.ndarray,
    model_name: str = "Facenet512",
    detector_backend: str = "retinaface"
) -> Optional[np.ndarray]:
    """
    Extract a single face embedding from an image and L2-normalize it.

    Args:
        img: Image as numpy array (BGR format)
        model_name: DeepFace model name
        detector_backend: Face detector backend ("retinaface" recommended)

    Returns:
        Normalized embedding vector as numpy array or None if failed
    """
    try:
        if not isinstance(img, np.ndarray) or img.size == 0:
            logger.error("Invalid image provided")
            return None

        logger.debug(f"Extracting embedding using {model_name} with {detector_backend}")

        result = DeepFace.represent(
            img,
            model_name=model_name,
            detector_backend=detector_backend,
            enforce_detection=True
        )

        if not result or len(result) == 0:
            logger.error("No face detected in image")
            return None

        embedding = np.array(result[0]["embedding"], dtype=np.float32)
        embedding = l2_normalize(embedding)

        logger.debug(f"Extracted normalized embedding of shape: {embedding.shape}")
        return embedding

    except Exception as e:
        logger.error(f"Failed to extract embedding: {e}")
        return None


def detect_and_embed_faces(
    img: np.ndarray,
    model_name: str = "Facenet512",
    detector_backend: str = "retinaface"
) -> List[np.ndarray]:
    """
    Detect all faces in an image and extract normalized embeddings for each.

    Args:
        img: Image as numpy array (BGR format)
        model_name: DeepFace model name
        detector_backend: Face detector backend ("retinaface" recommended)

    Returns:
        List of normalized embedding vectors (one per detected face)
    """
    try:
        if not isinstance(img, np.ndarray) or img.size == 0:
            logger.error("Invalid image provided")
            return []

        logger.debug(f"Detecting faces and extracting embeddings using {model_name} with {detector_backend}")

        faces = DeepFace.extract_faces(
            img,
            detector_backend=detector_backend,
            enforce_detection=True
        )

        if not faces or len(faces) == 0:
            logger.warning("No faces detected in image")
            return []

        embeddings: List[np.ndarray] = []
        for face_info in faces:
            try:
                face_img = face_info["face"]  # already cropped RGB face
                result = DeepFace.represent(
                    face_img,
                    model_name=model_name,
                    detector_backend="skip",  # detection already done
                    enforce_detection=False
                )
                if result and len(result) > 0:
                    emb = np.array(result[0]["embedding"], dtype=np.float32)
                    emb = l2_normalize(emb)
                    embeddings.append(emb)
            except Exception as e:
                logger.warning(f"Failed to extract embedding for one face: {e}")
                continue

        logger.info(f"Detected {len(embeddings)} faces and extracted embeddings")
        return embeddings

    except Exception as e:
        logger.error(f"Failed to detect and embed faces: {e}")
        return []


# ------------------------------
# Aggregation (multi-image → one embedding)
# ------------------------------

def aggregate_embeddings(embeddings: List[np.ndarray]) -> Optional[np.ndarray]:
    """
    Aggregate multiple embeddings (e.g., from 4–5 registration images)
    into a single stable representation by averaging and re-normalizing.

    Args:
        embeddings: List of embedding vectors (already normalized)

    Returns:
        Single normalized embedding or None if list is empty
    """
    if not embeddings:
        return None

    try:
        stacked = np.stack(embeddings, axis=0)  # shape: (N, D)
        mean_vec = np.mean(stacked, axis=0)
        mean_vec = l2_normalize(mean_vec)
        return mean_vec
    except Exception as e:
        logger.error(f"Failed to aggregate embeddings: {e}")
        return None


# ------------------------------
# Similarity and matching
# ------------------------------

def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Calculate cosine similarity between two vectors (assumed roughly normalized).

    Returns:
        Cosine similarity score in [-1, 1] (for our use: typically 0-1)
    """
    try:
        vec_a = np.asarray(vec_a, dtype=np.float32)
        vec_b = np.asarray(vec_b, dtype=np.float32)

        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        similarity = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
        return similarity

    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0


def match_embeddings(
    detected_embeddings: List[np.ndarray],
    known_embeddings: List[Dict[str, Any]],
    similarity_threshold: float = 0.70
) -> List[Dict[str, Any]]:
    """
    Match detected face embeddings against known student embeddings.

    IMPORTANT DESIGN:
    - For BEST accuracy, each student should have ONE aggregated embedding
      (computed via aggregate_embeddings() at REGISTRATION).
    - However, this function also supports the old format where you store
      multiple embeddings per student.

    Args:
        detected_embeddings:
            List of embeddings from detected faces (each already normalized).
        known_embeddings:
            List of dicts with either:
                {"student_id": ..., "embedding": [...]}           # preferred
            or:
                {"student_id": ..., "embeddings": [[...], ...]}   # legacy
        similarity_threshold:
            Cosine similarity threshold. Matches below this are discarded.

    Returns:
        List of dicts: { "student_id": str/int, "confidence": float }
        Sorted by confidence (desc). One best candidate per detected face.
    """
    candidates: List[Dict[str, Any]] = []

    if not detected_embeddings or not known_embeddings:
        return candidates

    try:
        for detected_emb in detected_embeddings:
            detected_emb = l2_normalize(detected_emb)

            best_match = None
            best_similarity = -1.0

            for known in known_embeddings:
                student_id = known.get("student_id")

                # Preferred: single clean embedding already aggregated
                if "embedding" in known:
                    stored_emb = np.array(known["embedding"], dtype=np.float32)
                    stored_emb = l2_normalize(stored_emb)
                    similarities = [cosine_similarity(detected_emb, stored_emb)]

                # Legacy: multiple embeddings, aggregate on the fly
                elif "embeddings" in known:
                    embeds_list = [
                        l2_normalize(np.array(e, dtype=np.float32))
                        for e in (known.get("embeddings") or [])
                    ]
                    if not embeds_list:
                        continue
                    agg = aggregate_embeddings(embeds_list)
                    if agg is None:
                        continue
                    similarities = [cosine_similarity(detected_emb, agg)]

                else:
                    # Bad data format, skip
                    continue

                student_best = max(similarities)

                if student_best >= similarity_threshold and student_best > best_similarity:
                    best_similarity = student_best
                    best_match = {
                        "student_id": student_id,
                        "confidence": float(student_best)
                    }

            if best_match:
                candidates.append(best_match)

        candidates.sort(key=lambda x: x["confidence"], reverse=True)
        logger.info(f"Matched {len(candidates)} faces out of {len(detected_embeddings)} detected")
        return candidates

    except Exception as e:
        logger.error(f"Error matching embeddings: {e}")
        return []