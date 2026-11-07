import os
from dotenv import load_dotenv
BASE = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE, ".env"))
class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///" + os.path.join(BASE, "hierly.db"))
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    JUDGE0_URL = os.getenv("JUDGE0_URL", "")
    JUDGE0_KEY = os.getenv("JUDGE0_KEY", "")
