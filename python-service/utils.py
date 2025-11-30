"""
Utility functions for image handling and data conversion.
"""
import logging
import requests
import numpy as np
import cv2
from typing import Optional, Tuple
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


def download_image(url: str, timeout: int = 30) -> Optional[np.ndarray]:
    """
    Download an image from a URL and return as numpy array.
    
    Args:
        url: Image URL
        timeout: Request timeout in seconds
        
    Returns:
        numpy array (BGR format for OpenCV) or None if failed
    """
    try:
        logger.info(f"Downloading image from: {url}")
        response = requests.get(str(url), timeout=timeout, stream=True)
        response.raise_for_status()
        
        # Read image data
        image_data = BytesIO(response.content)
        image = Image.open(image_data)
        
        # Convert PIL to numpy array (RGB)
        img_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(img_array.shape) == 3:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        # Validate image
        if img_array.size == 0:
            logger.error("Downloaded image is empty")
            return None
            
        logger.info(f"Successfully downloaded image: {img_array.shape}")
        return img_array
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download image: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing downloaded image: {e}")
        return None


def resize_image(img: np.ndarray, max_size: Tuple[int, int] = (256, 256)) -> np.ndarray:
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        img: Input image as numpy array
        max_size: Maximum (width, height)
        
    Returns:
        Resized image
    """
    if img is None or img.size == 0:
        return img
        
    height, width = img.shape[:2]
    max_width, max_height = max_size
    
    # Calculate scaling factor
    scale = min(max_width / width, max_height / height)
    
    if scale < 1.0:
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return img


def numpy_to_list(arr: np.ndarray) -> list:
    """
    Convert numpy array to Python list.
    
    Args:
        arr: Numpy array
        
    Returns:
        Python list
    """
    if arr is None:
        return []
    return arr.tolist() if isinstance(arr, np.ndarray) else list(arr)


def validate_image(img: np.ndarray) -> bool:
    """
    Validate that an image is valid and can be processed.
    
    Args:
        img: Image as numpy array
        
    Returns:
        True if valid, False otherwise
    """
    if img is None:
        return False
    if not isinstance(img, np.ndarray):
        return False
    if img.size == 0:
        return False
    if len(img.shape) < 2:
        return False
    return True

