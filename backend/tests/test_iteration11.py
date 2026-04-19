"""
Iteration 11 Backend Tests
Tests for:
1. Tier limits: free=5min/50MB, pro/studio=10min/200MB
2. Upload validation for duration and file size limits
3. Auto input gain computation (auto_input_gain_db field)
4. Track response includes auto_input_gain_db
"""
import pytest
import requests
import os
import wave
import struct
import math
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_EMAIL = "demo@sonically.io"
DEMO_PASSWORD = "DemoUser123!"
ADMIN_EMAIL = "jolor69@gmail.com"
ADMIN_PASSWORD = "AdminJolor2026!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def demo_token(api_client):
    """Get demo user (free tier) token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Demo user authentication failed")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


def generate_sine_wav(duration_sec=5, sample_rate=44100, amplitude=0.3, frequency=440):
    """
    Generate a WAV file with a sine wave.
    amplitude=0.3 gives peak around -10.5 dB, so auto_gain should be ~+9.5 dB
    """
    num_samples = int(duration_sec * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        sample = amplitude * math.sin(2 * math.pi * frequency * t)
        samples.append(int(sample * 32767))
    
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(struct.pack(f'<{len(samples)}h', *samples))
    
    buffer.seek(0)
    return buffer.read()


class TestTierLimits:
    """Test tier limits from /api/plans endpoint"""
    
    def test_free_tier_limits(self, api_client):
        """Free tier: max_duration_sec=300 (5min), max_file_mb=50"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        data = response.json()
        free_limits = data["tier_limits"]["free"]
        
        assert free_limits["max_duration_sec"] == 300, f"Expected 300 (5min), got {free_limits['max_duration_sec']}"
        assert free_limits["max_file_mb"] == 50, f"Expected 50MB, got {free_limits['max_file_mb']}"
        print(f"✓ Free tier limits: {free_limits['max_duration_sec']}s ({free_limits['max_duration_sec']//60}min), {free_limits['max_file_mb']}MB")
    
    def test_pro_tier_limits(self, api_client):
        """Pro tier: max_duration_sec=600 (10min), max_file_mb=200"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        data = response.json()
        pro_limits = data["tier_limits"]["pro"]
        
        assert pro_limits["max_duration_sec"] == 600, f"Expected 600 (10min), got {pro_limits['max_duration_sec']}"
        assert pro_limits["max_file_mb"] == 200, f"Expected 200MB, got {pro_limits['max_file_mb']}"
        print(f"✓ Pro tier limits: {pro_limits['max_duration_sec']}s ({pro_limits['max_duration_sec']//60}min), {pro_limits['max_file_mb']}MB")
    
    def test_studio_tier_limits(self, api_client):
        """Studio tier: max_duration_sec=600 (10min), max_file_mb=200"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        data = response.json()
        studio_limits = data["tier_limits"]["studio"]
        
        assert studio_limits["max_duration_sec"] == 600, f"Expected 600 (10min), got {studio_limits['max_duration_sec']}"
        assert studio_limits["max_file_mb"] == 200, f"Expected 200MB, got {studio_limits['max_file_mb']}"
        print(f"✓ Studio tier limits: {studio_limits['max_duration_sec']}s ({studio_limits['max_duration_sec']//60}min), {studio_limits['max_file_mb']}MB")


class TestAutoInputGain:
    """Test auto input gain computation on upload"""
    
    def test_upload_returns_auto_input_gain_db(self, api_client, demo_token):
        """Upload response should include auto_input_gain_db numeric field"""
        # Generate a 5-second sine wave with amplitude 0.3 (peak ~-10.5 dB)
        wav_data = generate_sine_wav(duration_sec=5, amplitude=0.3)
        
        files = {'file': ('test_sine.wav', wav_data, 'audio/wav')}
        headers = {"Authorization": f"Bearer {demo_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Check auto_input_gain_db is present and numeric
        assert "auto_input_gain_db" in data, "Response missing auto_input_gain_db field"
        assert isinstance(data["auto_input_gain_db"], (int, float)), "auto_input_gain_db should be numeric"
        
        auto_gain = data["auto_input_gain_db"]
        print(f"✓ Upload returned auto_input_gain_db: {auto_gain} dB")
        
        # For amplitude 0.3 (peak ~-10.5 dB), auto gain should be positive (around +9.5 dB ± 2)
        # Target peak is -1.0 dB, so adjustment = -1.0 - (-10.5) = +9.5 dB
        assert auto_gain > 0, f"Expected positive auto gain for quiet audio, got {auto_gain}"
        assert 7.0 <= auto_gain <= 12.0, f"Expected auto gain ~9.5 dB (±2), got {auto_gain}"
        print(f"✓ Auto gain {auto_gain} dB is in expected range [7, 12] for quiet audio")
        
        # Store track_id for cleanup
        return data["track_id"]
    
    def test_get_track_returns_auto_input_gain_db(self, api_client, demo_token):
        """GET /api/tracks/{id} should return auto_input_gain_db"""
        # First upload a track
        wav_data = generate_sine_wav(duration_sec=3, amplitude=0.5)
        
        files = {'file': ('test_get_gain.wav', wav_data, 'audio/wav')}
        headers = {"Authorization": f"Bearer {demo_token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        track_id = upload_response.json()["track_id"]
        
        # Now GET the track
        get_response = api_client.get(
            f"{BASE_URL}/api/tracks/{track_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert "auto_input_gain_db" in data, "GET track response missing auto_input_gain_db"
        assert isinstance(data["auto_input_gain_db"], (int, float)), "auto_input_gain_db should be numeric"
        print(f"✓ GET /api/tracks/{track_id} returned auto_input_gain_db: {data['auto_input_gain_db']} dB")


class TestUploadValidation:
    """Test upload validation for tier limits"""
    
    def test_free_tier_upload_short_track_succeeds(self, api_client, demo_token):
        """Free tier user can upload a track under 5 minutes"""
        # Generate a 3-second track (well under 5 min limit)
        wav_data = generate_sine_wav(duration_sec=3, amplitude=0.5)
        
        files = {'file': ('short_track.wav', wav_data, 'audio/wav')}
        headers = {"Authorization": f"Bearer {demo_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Short track upload should succeed: {response.text}"
        data = response.json()
        assert "track_id" in data
        print(f"✓ Free tier upload of {data.get('duration_sec', 3)}s track succeeded")
    
    def test_admin_bypasses_limits(self, api_client, admin_token):
        """Admin can upload without tier restrictions"""
        wav_data = generate_sine_wav(duration_sec=5, amplitude=0.4)
        
        files = {'file': ('admin_track.wav', wav_data, 'audio/wav')}
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Admin upload should succeed: {response.text}"
        data = response.json()
        assert "track_id" in data
        assert "auto_input_gain_db" in data
        print(f"✓ Admin upload succeeded with auto_input_gain_db: {data['auto_input_gain_db']} dB")


class TestProcessWithInputGain:
    """Test that process endpoint accepts input_gain parameter"""
    
    def test_process_accepts_input_gain(self, api_client, admin_token):
        """POST /api/tracks/process accepts input_gain param"""
        # First upload a track
        wav_data = generate_sine_wav(duration_sec=3, amplitude=0.3)
        
        files = {'file': ('process_test.wav', wav_data, 'audio/wav')}
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        track_id = upload_response.json()["track_id"]
        auto_gain = upload_response.json()["auto_input_gain_db"]
        
        # Process with custom input_gain
        process_response = api_client.post(
            f"{BASE_URL}/api/tracks/process",
            json={
                "track_id": track_id,
                "preset_id": "universal",
                "input_gain": auto_gain  # Use the auto-computed value
            },
            headers=headers
        )
        
        assert process_response.status_code == 200, f"Process failed: {process_response.text}"
        data = process_response.json()
        assert data["status"] == "mastered"
        print(f"✓ Process with input_gain={auto_gain} succeeded")


class TestHealthAndBasics:
    """Basic health and API checks"""
    
    def test_health_endpoint(self, api_client):
        """Health endpoint returns ok"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "up"
        print("✓ Health check passed")
    
    def test_presets_endpoint(self, api_client):
        """Presets endpoint returns 8 presets"""
        response = api_client.get(f"{BASE_URL}/api/presets")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) == 8
        print(f"✓ Presets endpoint returned {len(data['presets'])} presets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
