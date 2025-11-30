# Smart Attendance ML Service

A stateless FastAPI microservice for face recognition and attendance tracking. This service integrates with a Node.js/Express backend and provides face embedding extraction and recognition capabilities using DeepFace.

## Features

- **Stateless Architecture**: No persistent storage - Node.js is the single source of truth
- **Fast Face Detection**: Uses OpenCV detector backend for optimal performance
- **Model Preloading**: Models are preloaded at startup to minimize request latency
- **RESTful API**: Clean JSON-based API with comprehensive error handling

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. Navigate to the service directory:
```bash
cd python-service
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

**Note**: The first time you run the service, DeepFace will automatically download the Facenet512 model (~90MB). This happens automatically on first use.

## Running the Service

### Development Mode

```bash
uvicorn app:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

### Production Mode

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### 1. Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "ok"
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

### 2. Register Student

**POST** `/register`

Extract face embedding from a student photo.

**Request Body:**
```json
{
  "student_id": 123,
  "imageUrl": "http://server/uploads/student_123.jpg",
  "model_name": "Facenet512"
}
```

**Parameters:**
- `student_id` (required): Unique student identifier
- `imageUrl` (required): URL to the student photo
- `model_name` (optional): DeepFace model name (default: "Facenet512")

**Success Response (200):**
```json
{
  "success": true,
  "student_id": 123,
  "embedding": [0.123, -0.456, 0.789, ...]
}
```

**Error Response (400/503):**
```json
{
  "success": false,
  "error": "Failed to extract face embedding. Ensure image contains a clear face."
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 123,
    "imageUrl": "http://example.com/student.jpg"
  }'
```

---

### 3. Recognize Students

**POST** `/recognize`

Recognize faces in a classroom image by matching against known student embeddings.

**Request Body:**
```json
{
  "imageUrl": "http://server/uploads/classroom.jpg",
  "known_embeddings": [
    {
      "student_id": 1,
      "embedding": [0.123, -0.456, 0.789, ...]
    },
    {
      "student_id": 2,
      "embedding": [0.234, -0.567, 0.890, ...]
    }
  ],
  "model_name": "Facenet512",
  "distance_threshold": 0.35
}
```

**Parameters:**
- `imageUrl` (required): URL to the classroom image
- `known_embeddings` (required): Array of known student embeddings
- `model_name` (optional): DeepFace model name (default: "Facenet512")
- `distance_threshold` (optional): Distance threshold for matching (default: 0.35)

**Success Response (200):**
```json
{
  "success": true,
  "candidates": [
    {
      "student_id": 1,
      "confidence": 0.92
    },
    {
      "student_id": 4,
      "confidence": 0.81
    }
  ],
  "total_faces_detected": 3
}
```

**Error Response (400/503):**
```json
{
  "success": false,
  "error": "Failed to download or process image"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "http://example.com/classroom.jpg",
    "known_embeddings": [
      {
        "student_id": 1,
        "embedding": [0.123, -0.456, 0.789]
      }
    ],
    "distance_threshold": 0.35
  }'
```

## Understanding the Output

### Confidence Score

The `confidence` score in recognition results represents how similar a detected face is to a known student embedding:

- **Range**: 0.0 to 1.0
- **Higher values** (e.g., 0.9+) indicate a strong match
- **Lower values** (e.g., 0.5-0.7) indicate a weaker match
- The confidence is derived from cosine similarity between embeddings

### Distance Threshold

The `distance_threshold` parameter controls how strict the matching is:

- **Default**: 0.35 (for Facenet512)
- **Lower values** (e.g., 0.25): Stricter matching, fewer false positives
- **Higher values** (e.g., 0.45): More lenient matching, may include false positives
- **Distance** = 1 - similarity, so a threshold of 0.35 means similarity must be ≥ 0.65

**Recommendation**: Start with the default 0.35 and adjust based on your use case:
- For high-security scenarios, use 0.25-0.30
- For general attendance, 0.35 works well
- For lenient matching, use 0.40-0.45

### Detector Backend

The service uses **OpenCV** (`detector_backend="opencv"`) for face detection because:

- **Fastest performance**: Optimized C++ implementation
- **Minimal dependencies**: Already included with opencv-python
- **Reliable**: Well-tested and widely used
- **Good accuracy**: Suitable for most attendance scenarios

## Architecture

### Stateless Design

- **No storage**: The service never stores embeddings or images
- **Node.js integration**: Node.js backend sends embeddings when needed
- **Request-based**: Each request is independent

### Model Management

- **Preloading**: Models are loaded at startup to minimize latency
- **Caching**: Models are cached in memory for reuse
- **Lazy loading**: Additional models load on first use

## Error Handling

All endpoints return consistent JSON responses:

**Success:**
```json
{
  "success": true,
  ...
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (invalid input)
- `503`: Service unavailable (ML processing failed)

## Performance Considerations

1. **First Request**: May be slower due to model initialization
2. **Image Size**: Larger images take longer to process
3. **Number of Faces**: More faces = longer processing time
4. **Network**: Image download speed affects response time

## Troubleshooting

### "No face detected" errors

- Ensure images contain clear, front-facing faces
- Check image quality and lighting
- Verify image URL is accessible

### Model loading failures

- Check internet connection (first-time model download)
- Verify sufficient disk space (~90MB for Facenet512)
- Check Python version compatibility

### Slow performance

- Use smaller images (service auto-resizes, but smaller is faster)
- Reduce number of known embeddings in recognition requests
- Consider using a GPU for production deployments

## License

This service is part of the Smart Attendance system.

