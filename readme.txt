Hierly Interview Preparation Platform
=====================================

Project layout
--------------

- hierly_backend/ contains the Flask backend, server-rendered pages, API, and SQLite database.
- frontend_heily/ contains the standalone browser frontend that calls the Flask API.
- hierly/ is an older demo app and is not required to run the current frontend/backend.

Run the backend
---------------

Open a terminal in the project folder, then run:

    cd hierly_backend
    python -m pip install -r requirements.txt
    python run.py

The backend runs at:

    http://127.0.0.1:5000

The SQLite database is created automatically. The app includes these demo accounts:

    Student: demo@hierly.com / demo123
    Admin:   admin@hierly.com / admin123

Optional integrations:

- Resume analysis and interview feedback need GEMINI_API_KEY.
- Running coding submissions needs a Judge0 service configured with JUDGE0_URL.
- Copy hierly_backend/.env.example to hierly_backend/.env to configure these values.
- The frontend and core practice pages can still be opened without these integrations,
  but the corresponding AI/code execution features will report that the service is not configured.

Run the standalone frontend
---------------------------

Keep the backend running. Open a second terminal in the project folder, then run:

    cd frontend_heily
    python -m http.server 3000

Open this URL in your browser:

    http://127.0.0.1:3000

The frontend is configured to call the backend at http://127.0.0.1:5000. Keep both
servers running while using it. The backend allows the frontend origins on port 3000.

Stop either server with Ctrl+C in its terminal.

Alternative: use the backend's built-in frontend
------------------------------------------------

The backend also serves its own Flask/Jinja pages. Instead of starting the standalone
frontend, open http://127.0.0.1:5000 after starting the backend.