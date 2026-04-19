"""
Test Admin Activity Logs Feature
Tests for:
- GET /api/admin/activity endpoint (admin-only)
- Activity log insertion on upload/process/download
- Filters: event_type, user_email, pagination
- LUFS measurement accuracy (Fire preset target -9 LUFS)
"""
import pytest
import requests
import os
import time
import subprocess
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "jolor69@gmail.com"
ADMIN_PASSWORD = "AdminJolor2026!"
DEMO_EMAIL = "demo@sonically.io"
DEMO_PASSWORD = "DemoUser123!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def demo_token(api_client):
    """Get demo user (non-admin) authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Demo user authentication failed: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def demo_client():
    """Session with demo user auth header"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    pytest.skip(f"Demo user authentication failed: {response.status_code}")


def generate_test_tone():
    """Generate a 5-second 440Hz test tone WAV file"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        out_path = f.name
    try:
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
            "-ar", "44100", "-ac", "2", out_path
        ], capture_output=True, timeout=30, check=True)
        with open(out_path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(out_path)
        except OSError:
            pass


class TestAdminActivityEndpoint:
    """Tests for GET /api/admin/activity endpoint"""
    
    def test_admin_activity_returns_200_for_admin(self, admin_client):
        """Admin user can access activity logs"""
        response = admin_client.get(f"{BASE_URL}/api/admin/activity")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' field"
        assert "total" in data, "Response should have 'total' field"
        assert "offset" in data, "Response should have 'offset' field"
        assert "limit" in data, "Response should have 'limit' field"
        assert "summary" in data, "Response should have 'summary' field"
        
        # Verify summary structure
        summary = data["summary"]
        assert "upload" in summary, "Summary should have 'upload' count"
        assert "process" in summary, "Summary should have 'process' count"
        assert "download" in summary, "Summary should have 'download' count"
        print(f"✓ Admin activity endpoint returns correct structure: {len(data['items'])} items, total={data['total']}")
    
    def test_admin_activity_returns_403_for_non_admin(self, demo_client):
        """Non-admin user gets 403 Forbidden"""
        response = demo_client.get(f"{BASE_URL}/api/admin/activity")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Non-admin user correctly gets 403 Forbidden")
    
    def test_filter_by_event_type_upload(self, admin_client):
        """Filter by event_type=upload works"""
        response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "upload"})
        assert response.status_code == 200
        
        data = response.json()
        # All items should be upload events
        for item in data["items"]:
            assert item["event_type"] == "upload", f"Expected upload event, got {item['event_type']}"
        print(f"✓ Filter event_type=upload works: {len(data['items'])} upload events")
    
    def test_filter_by_event_type_process(self, admin_client):
        """Filter by event_type=process works"""
        response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "process"})
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["event_type"] == "process", f"Expected process event, got {item['event_type']}"
        print(f"✓ Filter event_type=process works: {len(data['items'])} process events")
    
    def test_filter_by_event_type_download(self, admin_client):
        """Filter by event_type=download works"""
        response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "download"})
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["event_type"] == "download", f"Expected download event, got {item['event_type']}"
        print(f"✓ Filter event_type=download works: {len(data['items'])} download events")
    
    def test_filter_by_user_email_case_insensitive(self, admin_client):
        """Filter by user_email is case-insensitive"""
        # Search with uppercase
        response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"user_email": "JOLOR"})
        assert response.status_code == 200
        
        data = response.json()
        # Should find admin user's activities
        for item in data["items"]:
            assert "jolor" in item["user_email"].lower() or "jolor" in (item.get("user_name") or "").lower(), \
                f"Email filter should match: {item['user_email']}"
        print(f"✓ Case-insensitive email filter works: {len(data['items'])} items for 'JOLOR'")
    
    def test_pagination_limit_offset(self, admin_client):
        """Pagination with limit and offset works"""
        # Get first page
        response1 = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"limit": 10, "offset": 0})
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"limit": 10, "offset": 10})
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Total should be stable
        assert data1["total"] == data2["total"], "Total should be stable across pages"
        assert data1["offset"] == 0
        assert data2["offset"] == 10
        assert data1["limit"] == 10
        assert data2["limit"] == 10
        
        # Items should be different (if there are enough)
        if data1["total"] > 10 and len(data2["items"]) > 0:
            first_page_ids = {item["log_id"] for item in data1["items"]}
            second_page_ids = {item["log_id"] for item in data2["items"]}
            assert first_page_ids.isdisjoint(second_page_ids), "Pages should have different items"
        
        print(f"✓ Pagination works: total={data1['total']}, page1={len(data1['items'])}, page2={len(data2['items'])}")


class TestActivityLogInsertion:
    """Tests for activity log insertion on upload/process/download"""
    
    def test_upload_creates_activity_log(self, admin_client):
        """POST /api/tracks/upload inserts activity_logs doc with event_type=upload"""
        # Generate test audio
        audio_data = generate_test_tone()
        
        # Get initial activity count
        initial_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "upload"})
        initial_count = initial_response.json()["total"]
        
        # Upload track
        files = {"file": ("test_activity_upload.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        track_data = upload_response.json()
        track_id = track_data["track_id"]
        
        # Check activity log was created
        time.sleep(0.5)  # Brief wait for async log insertion
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "upload"})
        new_count = activity_response.json()["total"]
        
        assert new_count > initial_count, f"Upload should create activity log: {initial_count} -> {new_count}"
        
        # Verify the log entry has correct fields
        items = activity_response.json()["items"]
        upload_log = next((item for item in items if item.get("track_id") == track_id), None)
        assert upload_log is not None, f"Should find upload log for track {track_id}"
        
        # Verify required fields
        assert upload_log["event_type"] == "upload"
        assert "file_ext" in upload_log, "Upload log should have file_ext"
        assert "file_size_mb" in upload_log, "Upload log should have file_size_mb"
        assert "duration_sec" in upload_log, "Upload log should have duration_sec"
        assert "auto_input_gain_db" in upload_log, "Upload log should have auto_input_gain_db"
        assert "track_filename" in upload_log, "Upload log should have track_filename"
        
        print(f"✓ Upload creates activity log with correct fields: {upload_log['log_id']}")
        return track_id
    
    def test_process_creates_activity_log_with_lufs(self, admin_client):
        """POST /api/tracks/process inserts activity_logs doc with LUFS measurements"""
        # First upload a track
        audio_data = generate_test_tone()
        files = {"file": ("test_activity_process.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        assert upload_response.status_code == 200
        track_id = upload_response.json()["track_id"]
        
        # Get initial process count
        initial_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "process"})
        initial_count = initial_response.json()["total"]
        
        # Process with Fire preset (target -9 LUFS)
        process_response = admin_client.post(f"{BASE_URL}/api/tracks/process", json={
            "track_id": track_id,
            "preset_id": "fire"
        })
        assert process_response.status_code == 200, f"Process failed: {process_response.text}"
        
        # Check activity log was created
        time.sleep(0.5)
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "process"})
        new_count = activity_response.json()["total"]
        
        assert new_count > initial_count, f"Process should create activity log: {initial_count} -> {new_count}"
        
        # Find the process log
        items = activity_response.json()["items"]
        process_log = next((item for item in items if item.get("track_id") == track_id), None)
        assert process_log is not None, f"Should find process log for track {track_id}"
        
        # Verify required fields
        assert process_log["event_type"] == "process"
        assert process_log["preset_id"] == "fire"
        assert process_log["preset_name"] == "Fire"
        assert process_log["preset_target_lufs"] == -9, "Fire preset target should be -9 LUFS"
        assert "measured_lufs" in process_log, "Process log should have measured_lufs"
        assert "measured_true_peak_db" in process_log, "Process log should have measured_true_peak_db"
        assert "measured_lra" in process_log, "Process log should have measured_lra"
        assert "lufs_delta" in process_log, "Process log should have lufs_delta"
        assert "params" in process_log, "Process log should have params"
        
        print(f"✓ Process creates activity log with LUFS data: measured={process_log['measured_lufs']}, target={process_log['preset_target_lufs']}, delta={process_log['lufs_delta']}")
        return track_id
    
    def test_download_creates_activity_log(self, admin_client):
        """GET /api/tracks/{id}/download inserts activity_logs doc with event_type=download"""
        # First upload and process a track
        audio_data = generate_test_tone()
        files = {"file": ("test_activity_download.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        assert upload_response.status_code == 200
        track_id = upload_response.json()["track_id"]
        
        # Process the track
        process_response = admin_client.post(f"{BASE_URL}/api/tracks/process", json={
            "track_id": track_id,
            "preset_id": "universal"
        })
        assert process_response.status_code == 200
        
        # Get initial download count
        initial_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "download"})
        initial_count = initial_response.json()["total"]
        
        # Download in mp3 format
        download_response = admin_client.get(f"{BASE_URL}/api/tracks/{track_id}/download", params={"format": "mp3"})
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        
        # Check activity log was created
        time.sleep(0.5)
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "download"})
        new_count = activity_response.json()["total"]
        
        assert new_count > initial_count, f"Download should create activity log: {initial_count} -> {new_count}"
        
        # Find the download log
        items = activity_response.json()["items"]
        download_log = next((item for item in items if item.get("track_id") == track_id and item.get("event_type") == "download"), None)
        assert download_log is not None, f"Should find download log for track {track_id}"
        
        # Verify required fields
        assert download_log["event_type"] == "download"
        assert download_log["download_format"] == "mp3"
        assert download_log["download_format_label"] == "MP3 320 kbps"
        assert download_log["download_ext"] == "mp3"
        assert "file_size_mb" in download_log, "Download log should have file_size_mb"
        assert "preset_id" in download_log, "Download log should have preset_id"
        assert "preset_name" in download_log, "Download log should have preset_name"
        assert "preset_target_lufs" in download_log, "Download log should have preset_target_lufs"
        assert "measured_lufs" in download_log, "Download log should have measured_lufs"
        assert "lufs_delta" in download_log, "Download log should have lufs_delta"
        
        print(f"✓ Download creates activity log with correct fields: format={download_log['download_format']}, size={download_log['file_size_mb']}MB")


class TestLufsMeasurementAccuracy:
    """Test that LUFS measurement is accurate for Fire preset"""
    
    def test_fire_preset_lufs_within_tolerance(self, admin_client):
        """Fire preset (target -9 LUFS) should measure within ±2 LUFS of target"""
        # Generate test tone
        audio_data = generate_test_tone()
        
        # Upload
        files = {"file": ("test_lufs_accuracy.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        assert upload_response.status_code == 200
        track_id = upload_response.json()["track_id"]
        
        # Process with Fire preset
        process_response = admin_client.post(f"{BASE_URL}/api/tracks/process", json={
            "track_id": track_id,
            "preset_id": "fire"
        })
        assert process_response.status_code == 200
        
        # Get the activity log to check measured LUFS
        time.sleep(0.5)
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "process"})
        items = activity_response.json()["items"]
        process_log = next((item for item in items if item.get("track_id") == track_id), None)
        
        assert process_log is not None, "Should find process log"
        
        target_lufs = process_log["preset_target_lufs"]
        measured_lufs = process_log["measured_lufs"]
        lufs_delta = process_log["lufs_delta"]
        
        assert target_lufs == -9, f"Fire preset target should be -9 LUFS, got {target_lufs}"
        assert measured_lufs is not None, "Measured LUFS should not be None"
        
        # Check within ±2 LUFS tolerance
        tolerance = 2.0
        assert abs(measured_lufs - target_lufs) <= tolerance, \
            f"Measured LUFS ({measured_lufs}) should be within ±{tolerance} of target ({target_lufs}). Delta: {lufs_delta}"
        
        print(f"✓ Fire preset LUFS accuracy: target={target_lufs}, measured={measured_lufs}, delta={lufs_delta} (within ±{tolerance} tolerance)")


class TestDownloadFormats:
    """Test download activity logs for different formats"""
    
    def test_download_wav16_format(self, admin_client):
        """Download wav16 format creates correct activity log"""
        # Upload and process
        audio_data = generate_test_tone()
        files = {"file": ("test_wav16.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        track_id = upload_response.json()["track_id"]
        
        admin_client.post(f"{BASE_URL}/api/tracks/process", json={
            "track_id": track_id,
            "preset_id": "universal"
        })
        
        # Download wav16
        download_response = admin_client.get(f"{BASE_URL}/api/tracks/{track_id}/download", params={"format": "wav16"})
        assert download_response.status_code == 200
        
        time.sleep(0.5)
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "download"})
        items = activity_response.json()["items"]
        download_log = next((item for item in items if item.get("track_id") == track_id and item.get("download_format") == "wav16"), None)
        
        assert download_log is not None
        assert download_log["download_format_label"] == "WAV 16-bit · 44.1kHz"
        assert download_log["download_ext"] == "wav"
        print(f"✓ WAV16 download log correct: {download_log['download_format_label']}")
    
    def test_download_flac_format(self, admin_client):
        """Download flac format creates correct activity log"""
        # Upload and process
        audio_data = generate_test_tone()
        files = {"file": ("test_flac.wav", audio_data, "audio/wav")}
        upload_response = requests.post(
            f"{BASE_URL}/api/tracks/upload",
            files=files,
            headers={"Authorization": admin_client.headers["Authorization"]}
        )
        track_id = upload_response.json()["track_id"]
        
        admin_client.post(f"{BASE_URL}/api/tracks/process", json={
            "track_id": track_id,
            "preset_id": "clarity"
        })
        
        # Download flac
        download_response = admin_client.get(f"{BASE_URL}/api/tracks/{track_id}/download", params={"format": "flac"})
        assert download_response.status_code == 200
        
        time.sleep(0.5)
        activity_response = admin_client.get(f"{BASE_URL}/api/admin/activity", params={"event_type": "download"})
        items = activity_response.json()["items"]
        download_log = next((item for item in items if item.get("track_id") == track_id and item.get("download_format") == "flac"), None)
        
        assert download_log is not None
        assert download_log["download_format_label"] == "FLAC · lossless"
        assert download_log["download_ext"] == "flac"
        print(f"✓ FLAC download log correct: {download_log['download_format_label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
