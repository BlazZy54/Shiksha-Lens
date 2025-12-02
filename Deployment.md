========================================================
 HOW TO DEPLOY Siksha-Lens USING VS CODE PORT FORWARDING 
========================================================

We have 4 services running locally:

Frontend (React) → 3000
Backend (Node.js) → 5000
Python AI Service (DeepFace) → 8000
PostgreSQL DB → 5432

IMPORTANT:
Only FRONTEND and BACKEND should be forwarded publicly.
Python and Database MUST stay private (LAN/localhost only).


1) START EVERYTHING IN CORRECT ORDER
------------------------------------

(1) Start PostgreSQL
(2) Run Python microservice  → uvicorn app:app --reload --port 8000
(3) Run Backend             →  npm run dev
(4) Run Frontend            →  npm start

Check ports:
  http://localhost:3000 → frontend
  http://localhost:5000 → backend
  (postgres:5432 internal)
  (Fastapi microservices:8000 internal)


2) FRONTEND .env (NECESSARY)
------------------------------------
Create (if not exists):

  frontend/.env

Add the following:

  REACT_APP_API_URL=https://<BACKEND_PUBLIC_TUNNEL>/api

After editing .env:
  → STOP frontend
  → Run again: npm start


3) BACKEND .env (NECESSARY)
------------------------------------

  backend/.env

Add:

PORT=5000
JWT_SECRET=your api key 
DATABASE_URL=postgres://<dbuser>:<dbpass>@localhost:5432/<dbname>
ML_SERVICE_URL=http://localhost:5000
BACKEND_API_KEY=<random 64 chars>

Restart backend after changes.

4) VS CODE PORT FORWARDING PROCESS
------------------------------------

IMPORTANT: forward backend FIRST.
Steps:

  1) Forward backend (port 5000)
  2) Copy the tunnel URL VS Code gives you
  3) Put that into frontend .env as REACT_APP_API_URL + "/api"
  4) Restart frontend
  5) Forward frontend (port 3000)

DO NOT forward 8000 (python)
DO NOT forward 5432 (postgres)


5) HOW REQUEST FLOW WILL FINALLY WORK
------------------------------------

User  → public frontend URL
Frontend → backend (public tunnel)
Backend → python (localhost)
Backend → database (localhost)

So only the frontend/backed need to be public.
Python + DB should remain private.

