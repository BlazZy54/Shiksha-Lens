# Shiksha-
Automated Attendance System Using Facial Recognition for Rural Schools

ShikshaLens: Automated Attendance System
A mobile-first web application designed to automate student attendance in rural and urban schools using facial recognition technology. This project was developed for the Smart India Hackathon 2025.

Team: Inn-Bit404 | Problem Statement: SIH25012

📖 About The Project
ShikshaLens addresses the challenge of manual attendance marking, which is often time-consuming and prone to errors. 
Our solution is a mobile-first web app that empowers teachers to record attendance swiftly and accurately.

The process is simple: a teacher takes a few photos of the classroom, uploads them to our secure server, and our AI model detects and recognizes the students' faces, marking them present
The teacher then receives an AI-generated attendance list and validates the suggestions for final accuracy. This human-in-the-loop approach ensures reliability while saving valuable classroom time.

Benefits
Saves Time: Eliminates the need for manual roll calls.
Prevents Malpractice: Drastically reduces instances of fake or proxy attendance.
Low Cost: Operates on existing standard smartphones, requiring no special hardware.
Data-Driven Insights: Provides analytics to help in policy-making and administration.

✨ Key Features
Privacy First: We prioritize student privacy. Instead of storing raw photos, the system generates and stores encrypted facial embeddings, ensuring that personal data is secure.
Human-in-the-Loop: To guarantee 100% accuracy and maintain teacher accountability, all AI-generated attendance suggestions are presented to the teacher for final validation before submission.
Secure & Validated: The system employs geo-tagging and timestamping on all image uploads. This ensures that attendance is marked from the correct location and at the right time, preventing any misuse.
Admin Dashboard: A central dashboard provides administrators and officers with real-time analytics, attendance trends, and overall control of the system.

🛠️ Tech Stack
Frontend: A responsive and teacher-friendly UI built with React and styled with Tailwind CSS.
Backend: A robust API built with Django REST Framework to handle authentication, data management, and the core logic.
Machine Learning: Utilizes MTCNN for accurate face detection and FaceNet for generating powerful facial embeddings.
Database: PostgreSQL is used for reliable and scalable data storage.

👨‍💻 Workflow & Usage =>
The system is designed with distinct roles for different users:

🧑‍💼 Administrator:
Manages student and teacher data.
Uploads initial student photographs to the database, which are used to train the AI model.

👩‍🏫 Teacher:
Logs into the mobile-friendly web app.
Captures and uploads classroom images for a specific session.
Receives a confirmation page with the AI-processed attendance list to verify and confirm.

📊 Officer/Higher Authority:
Logs into the system to view analytics, trends, and generated attendance sheets for administrative oversight.

🚀 Impact
Boosts Efficiency: Automating attendance frees up valuable classroom time for teaching and learning.
Enhances Data Integrity: Reduces human errors and eliminates fraudulent practices like proxy attendance.
Drives Digitization: Encourages the adoption of modern, data-driven practices within educational institutions.
Informs Policy: The collected attendance data provides valuable trends and insights that can assist in making informed administrative and policy decisions.
