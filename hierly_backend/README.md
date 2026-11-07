# Hierly backend (Flask + SQLite)

## Run
1. `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` (Windows: `copy .env.example .env`) and fill in:
   - `GEMINI_API_KEY` (free key from Google AI Studio) -> resume analysis + AI interview feedback
   - `JUDGE0_URL` (a Judge0 server) -> coding test execution. Code is never run inside Flask.
3. `python run.py` then open http://127.0.0.1:5000

The database file `hierly.db` is created automatically with demo data.
Logins: student demo@hierly.com / demo123, admin admin@hierly.com / admin123 (change these!).

## API (all need login, session cookie)
| Method | URL | Purpose |
|---|---|---|
| GET/PUT | /api/auth/profile | view / update name, password |
| POST | /api/resume | form-data `resume` (PDF), optional `jd` |
| POST | /api/aptitude | `{cat, answers:[index,...]}` |
| POST | /api/code | `{id, lang, code}` |
| POST | /api/interview | `{type, role, questions, answers}` |
| GET | /api/history/<resume\|aptitude\|coding\|interview> | past attempts |
| GET | /api/dashboard | scores, activity, weekly trend |
| GET | /reports/download | text report |
Pages: /login /register /dashboard /resume /aptitude /coding /interview /reports /admin
Without a key or runner, these endpoints return a clear error (503) instead of fake results.
