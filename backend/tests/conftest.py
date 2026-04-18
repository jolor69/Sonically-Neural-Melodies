"""Shared test fixtures and credentials sourced from env."""
import os
from dotenv import load_dotenv

# Load .env from project root and backend
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Credentials (override via env for CI/CD; defaults mirror /app/memory/test_credentials.md)
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "jolor69@gmail.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "AdminJolor2026!")
DEMO_EMAIL = os.environ.get("TEST_DEMO_EMAIL", "demo@sonically.io")
DEMO_PASSWORD = os.environ.get("TEST_DEMO_PASSWORD", "DemoUser123!")
