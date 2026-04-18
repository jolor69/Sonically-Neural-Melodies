"""
Sonically API Backend Tests
Tests: Health, Presets, Plans, Auth, Tracks, Payments
"""
import pytest
import requests
import os
import time
import subprocess
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials (env-overridable)
DEMO_EMAIL = os.environ.get("TEST_DEMO_EMAIL", "demo@sonically.io")
DEMO_PASSWORD = os.environ.get("TEST_DEMO_PASSWORD", "DemoUser123!")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for demo user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_wav_file():
    """Create a test WAV file using ffmpeg"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_path = f.name
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
        "-ar", "44100", wav_path
    ], capture_output=True, timeout=30)
    yield wav_path
    try:
        os.unlink(wav_path)
    except:
        pass


# ============ HEALTH TESTS ============
class TestHealth:
    """Health endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/ returns ok status"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "Sonically"
        assert data["status"] == "ok"


# ============ PRESETS TESTS ============
class TestPresets:
    """Presets endpoint tests"""
    
    def test_list_presets_returns_8(self, api_client):
        """GET /api/presets returns exactly 8 presets"""
        response = api_client.get(f"{BASE_URL}/api/presets")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) == 8
        
    def test_presets_have_required_fields(self, api_client):
        """Each preset has id, name, color, icon, genres, description"""
        response = api_client.get(f"{BASE_URL}/api/presets")
        data = response.json()
        required_fields = ["id", "name", "color", "icon", "genres", "description"]
        for preset in data["presets"]:
            for field in required_fields:
                assert field in preset, f"Missing field {field} in preset {preset.get('id')}"
                
    def test_preset_ids_are_correct(self, api_client):
        """Verify all 8 preset IDs"""
        response = api_client.get(f"{BASE_URL}/api/presets")
        data = response.json()
        expected_ids = ["universal", "fire", "clarity", "tape", "natural", "spatial", "cinematic", "punch"]
        actual_ids = [p["id"] for p in data["presets"]]
        assert sorted(actual_ids) == sorted(expected_ids)


# ============ PLANS TESTS ============
class TestPlans:
    """Plans/pricing endpoint tests"""
    
    def test_list_plans(self, api_client):
        """GET /api/plans returns pricing info"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert "tier_limits" in data
        
    def test_plans_pricing_correct(self, api_client):
        """Verify Pro and Studio pricing"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        plans = data["plans"]
        
        # Pro pricing
        assert plans["pro"]["monthly"]["amount"] == 4.99
        assert plans["pro"]["yearly"]["amount"] == 44.99
        
        # Studio pricing
        assert plans["studio"]["monthly"]["amount"] == 12.99
        assert plans["studio"]["yearly"]["amount"] == 119.99
        
    def test_tier_limits(self, api_client):
        """Verify tier limits"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        limits = data["tier_limits"]
        
        assert limits["free"]["max_tracks_per_month"] == 5
        assert limits["free"]["max_file_mb"] == 50
        assert limits["pro"]["max_tracks_per_month"] == 30
        assert limits["studio"]["max_tracks_per_month"] == 10000


# ============ AUTH TESTS ============
class TestAuth:
    """Authentication endpoint tests"""
    
    def test_signup_new_user(self, api_client):
        """POST /api/auth/signup creates new user"""
        unique_email = f"test_signup_{int(time.time())}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Signup User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["subscription_tier"] == "free"
        
    def test_signup_duplicate_email_fails(self, api_client):
        """POST /api/auth/signup with existing email returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": DEMO_EMAIL,
            "password": "TestPass123!",
            "name": "Duplicate User"
        })
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower()
        
    def test_login_success(self, api_client):
        """POST /api/auth/login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        
    def test_login_invalid_password(self, api_client):
        """POST /api/auth/login with wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        
    def test_login_invalid_email(self, api_client):
        """POST /api/auth/login with non-existent email returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 401
        
    def test_auth_me_with_token(self, authenticated_client, auth_token):
        """GET /api/auth/me with valid token returns user"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DEMO_EMAIL
        assert "user_id" in data
        assert "subscription_tier" in data
        
    def test_auth_me_without_token(self, api_client):
        """GET /api/auth/me without token returns 401"""
        # Use fresh session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        
    def test_logout(self, api_client, auth_token):
        """POST /api/auth/logout returns ok"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.json().get("ok") == True


# ============ ACCESS CONTROL TESTS ============
class TestAccessControl:
    """Unauthenticated access tests"""
    
    def test_tracks_requires_auth(self):
        """GET /api/tracks without auth returns 401"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/tracks")
        assert response.status_code == 401
        
    def test_upload_requires_auth(self):
        """POST /api/tracks/upload without auth returns 401"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/tracks/upload")
        assert response.status_code in [401, 422]  # 422 if validation runs first


# ============ TRACKS TESTS ============
class TestTracks:
    """Track CRUD and processing tests"""
    
    def test_upload_track(self, auth_token, test_wav_file):
        """POST /api/tracks/upload uploads a WAV file"""
        with open(test_wav_file, "rb") as f:
            response = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        assert response.status_code == 200
        data = response.json()
        assert "track_id" in data
        assert data["status"] == "uploaded"
        assert data["original_filename"] == "test.wav"
        assert "peaks_original" in data
        return data["track_id"]
        
    def test_list_tracks(self, authenticated_client):
        """GET /api/tracks returns user's tracks"""
        response = authenticated_client.get(f"{BASE_URL}/api/tracks")
        assert response.status_code == 200
        data = response.json()
        assert "tracks" in data
        assert isinstance(data["tracks"], list)
        
    def test_get_single_track(self, authenticated_client, auth_token, test_wav_file):
        """GET /api/tracks/{id} returns track details"""
        # First upload a track
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_single.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        # Get the track
        response = authenticated_client.get(f"{BASE_URL}/api/tracks/{track_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["track_id"] == track_id
        
    def test_process_track_with_preset(self, authenticated_client, auth_token, test_wav_file):
        """POST /api/tracks/process applies preset and returns mastered track"""
        # Upload
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_process.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        original_peaks = upload_resp.json()["peaks_original"]
        
        # Process with fire preset
        response = authenticated_client.post(
            f"{BASE_URL}/api/tracks/process",
            json={"track_id": track_id, "preset_id": "fire"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "mastered"
        assert data["preset_id"] == "fire"
        assert "peaks_mastered" in data
        assert len(data["peaks_mastered"]) > 0
        # Verify processing actually changed the audio (peaks should be different)
        assert data["peaks_mastered"] != original_peaks
        
    def test_process_invalid_preset(self, authenticated_client, auth_token, test_wav_file):
        """POST /api/tracks/process with invalid preset returns 400"""
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_invalid.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/tracks/process",
            json={"track_id": track_id, "preset_id": "nonexistent"}
        )
        assert response.status_code == 400
        
    def test_stream_original(self, auth_token, test_wav_file):
        """GET /api/tracks/{id}/stream/original returns audio bytes"""
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_stream.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        # Stream using token query param (as audio tags would)
        response = requests.get(
            f"{BASE_URL}/api/tracks/{track_id}/stream/original?token={auth_token}"
        )
        assert response.status_code == 200
        assert len(response.content) > 1000  # Should have audio data
        
    def test_stream_mastered(self, authenticated_client, auth_token, test_wav_file):
        """GET /api/tracks/{id}/stream/mastered returns processed audio"""
        # Upload and process
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_stream_master.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        authenticated_client.post(
            f"{BASE_URL}/api/tracks/process",
            json={"track_id": track_id, "preset_id": "universal"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/tracks/{track_id}/stream/mastered?token={auth_token}"
        )
        assert response.status_code == 200
        assert len(response.content) > 1000
        
    def test_stream_mastered_not_processed(self, auth_token, test_wav_file):
        """GET /api/tracks/{id}/stream/mastered on unprocessed track returns 404"""
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_not_mastered.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/tracks/{track_id}/stream/mastered?token={auth_token}"
        )
        assert response.status_code == 404
        
    def test_delete_track(self, authenticated_client, auth_token, test_wav_file):
        """DELETE /api/tracks/{id} soft deletes track"""
        with open(test_wav_file, "rb") as f:
            upload_resp = requests.post(
                f"{BASE_URL}/api/tracks/upload",
                files={"file": ("test_delete.wav", f, "audio/wav")},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        track_id = upload_resp.json()["track_id"]
        
        # Delete
        response = authenticated_client.delete(f"{BASE_URL}/api/tracks/{track_id}")
        assert response.status_code == 200
        assert response.json().get("ok") == True
        
        # Verify deleted (should return 404)
        get_resp = authenticated_client.get(f"{BASE_URL}/api/tracks/{track_id}")
        assert get_resp.status_code == 404


# ============ PAYMENTS TESTS ============
class TestPayments:
    """Stripe checkout tests"""
    
    def test_checkout_pro_monthly(self, authenticated_client):
        """POST /api/payments/checkout creates Stripe session for Pro monthly"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "pro",
                "billing": "monthly",
                "origin_url": "https://audio-enhance-34.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert "checkout.stripe.com" in data["url"]
        
    def test_checkout_studio_yearly(self, authenticated_client):
        """POST /api/payments/checkout creates Stripe session for Studio yearly"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "studio",
                "billing": "yearly",
                "origin_url": "https://audio-enhance-34.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "checkout.stripe.com" in data["url"]
        
    def test_checkout_invalid_plan(self, authenticated_client):
        """POST /api/payments/checkout with invalid plan returns 400"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "invalid",
                "billing": "monthly",
                "origin_url": "https://test.com"
            }
        )
        assert response.status_code == 400
        
    def test_checkout_requires_auth(self):
        """POST /api/payments/checkout without auth returns 401"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "pro",
                "billing": "monthly",
                "origin_url": "https://test.com"
            }
        )
        assert response.status_code == 401
