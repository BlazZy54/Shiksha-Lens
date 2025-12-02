# Quick Start Guide - Shiksha-Lens

## Prerequisites
- Node.js 16+
- Python 3.8+
- PostgreSQL 12+
- npm/yarn

## Setup Steps

### 1. Database Setup
```bash
# Create database
createdb schooldata

# Run schema
psql schooldata < sih-backend/schema.sql
```

### 2. Python ML Service
```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**Verify:** `curl http://localhost:8000/health`

### 3. Node.js Backend
```bash
cd backend
cp .env.example .env
# Edit .env:
#   - Set database credentials
#   - Set ML_SERVICE_URL=http://localhost:8000
#   - Set JWT_SECRET
npm install
npm run dev
```

**Verify:** `curl http://localhost:3000/api/auth/login` (should return 400 - missing body)

### 4. React Frontend
```bash
cd SIH
npm install
npm start
```

**Verify:** Open http://localhost:3000

## Testing the Integration

### 1. Register a Student (Admin)
```bash
curl -X POST http://localhost:3000/api/admin/student \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "name=John Doe" \
  -F "roll=2024001" \
  -F "class_id=1" \
  -F "image=@/path/to/student_photo.jpg"
```

### 2. Take Attendance (Teacher)
```bash
curl -X POST http://localhost:3000/api/teacher/classes/1/attendance/upload \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -F "image=@/path/to/class_photo.jpg"
```

### 3. Confirm Attendance (Teacher)
```bash
curl -X POST http://localhost:3000/api/teacher/attendance/1/confirm \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmations": [
      {"student_id": 1, "status": "present", "confidence": 0.92},
      {"student_id": 2, "status": "present", "confidence": 0.85}
    ]
  }'
```

## Troubleshooting

### Python Service Not Responding
- Check if service is running: `curl http://localhost:8000/health`
- Check logs for errors
- Verify DeepFace model downloaded (first run takes time)

### Backend Can't Connect to Python Service
- Verify `ML_SERVICE_URL` in `.env` is correct
- Check firewall/network settings
- Verify Python service CORS allows backend origin

### Embeddings Not Stored
- Check database schema has `embedding` column
- Verify Python service `/register` returns embedding
- Check backend logs for ML service errors

### Recognition Returns No Candidates
- Verify students have embeddings registered
- Check class has students assigned
- Verify photo quality (clear faces visible)
- Check Python service logs for face detection errors

## Environment Variables

### Backend (.env)
```env
ML_SERVICE_URL=http://localhost:8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=schooldata
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d
PORT=5000
```

## Ports
- Frontend: 3000
- Backend: 5000
- Python ML Service: 8000
- PostgreSQL: 5432


