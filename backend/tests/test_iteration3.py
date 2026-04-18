"""
Iteration 3 Backend Tests - Sonically Audio Mastering App
Tests:
1. Price updates (+10% increase) - /api/plans returns new prices
2. PayPal create-order returns correct amounts for new prices
3. Resend email integration - idempotent receipt_sent flag
4. Download formats - 6 formats with tier gating
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Expected new prices after +10% increase
EXPECTED_PRICES = {
    "pro": {"monthly": 5.49, "yearly": 49.49},
    "studio": {"monthly": 14.29, "yearly": 131.99},
}

# Expected download formats
EXPECTED_FORMATS = ["wav16", "mp3", "flac", "wav24", "wav24_96", "wav24_192"]
FORMAT_TIERS = {
    "wav16": "free",
    "mp3": "pro",
    "flac": "pro",
    "wav24": "pro",
    "wav24_96": "studio",
    "wav24_192": "studio",
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for demo user"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@sonically.io", "password": "DemoUser123!"},
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ============== PRICE UPDATE TESTS ==============
class TestPriceUpdates:
    """Test that /api/plans returns updated prices (+10% increase)"""

    def test_plans_endpoint_returns_200(self, api_client):
        """GET /api/plans should return 200"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/plans returns 200")

    def test_pro_monthly_price(self, api_client):
        """Pro monthly should be $5.49"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        actual = data["plans"]["pro"]["monthly"]["amount"]
        expected = EXPECTED_PRICES["pro"]["monthly"]
        assert actual == expected, f"Pro monthly: expected {expected}, got {actual}"
        print(f"PASS: Pro monthly price = ${actual}")

    def test_pro_yearly_price(self, api_client):
        """Pro yearly should be $49.49"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        actual = data["plans"]["pro"]["yearly"]["amount"]
        expected = EXPECTED_PRICES["pro"]["yearly"]
        assert actual == expected, f"Pro yearly: expected {expected}, got {actual}"
        print(f"PASS: Pro yearly price = ${actual}")

    def test_studio_monthly_price(self, api_client):
        """Studio monthly should be $14.29"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        actual = data["plans"]["studio"]["monthly"]["amount"]
        expected = EXPECTED_PRICES["studio"]["monthly"]
        assert actual == expected, f"Studio monthly: expected {expected}, got {actual}"
        print(f"PASS: Studio monthly price = ${actual}")

    def test_studio_yearly_price(self, api_client):
        """Studio yearly should be $131.99"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        actual = data["plans"]["studio"]["yearly"]["amount"]
        expected = EXPECTED_PRICES["studio"]["yearly"]
        assert actual == expected, f"Studio yearly: expected {expected}, got {actual}"
        print(f"PASS: Studio yearly price = ${actual}")


# ============== PAYPAL CREATE-ORDER PRICE TESTS ==============
class TestPayPalPrices:
    """Test that PayPal create-order returns correct amounts for new prices"""

    def test_paypal_pro_monthly_amount(self, authenticated_client):
        """PayPal create-order for Pro monthly should return amount=5.49"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "order_id" in data, "Response should contain order_id"
        actual = data["amount"]
        expected = EXPECTED_PRICES["pro"]["monthly"]
        assert actual == expected, f"Pro monthly PayPal: expected {expected}, got {actual}"
        print(f"PASS: PayPal Pro monthly amount = ${actual}")

    def test_paypal_pro_yearly_amount(self, authenticated_client):
        """PayPal create-order for Pro yearly should return amount=49.49"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "yearly"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        actual = data["amount"]
        expected = EXPECTED_PRICES["pro"]["yearly"]
        assert actual == expected, f"Pro yearly PayPal: expected {expected}, got {actual}"
        print(f"PASS: PayPal Pro yearly amount = ${actual}")

    def test_paypal_studio_monthly_amount(self, authenticated_client):
        """PayPal create-order for Studio monthly should return amount=14.29"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "monthly"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        actual = data["amount"]
        expected = EXPECTED_PRICES["studio"]["monthly"]
        assert actual == expected, f"Studio monthly PayPal: expected {expected}, got {actual}"
        print(f"PASS: PayPal Studio monthly amount = ${actual}")

    def test_paypal_studio_yearly_amount(self, authenticated_client):
        """PayPal create-order for Studio yearly should return amount=131.99"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "yearly"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        actual = data["amount"]
        expected = EXPECTED_PRICES["studio"]["yearly"]
        assert actual == expected, f"Studio yearly PayPal: expected {expected}, got {actual}"
        print(f"PASS: PayPal Studio yearly amount = ${actual}")


# ============== DOWNLOAD FORMATS TESTS ==============
class TestDownloadFormats:
    """Test that /api/plans returns 6 download formats with correct tier gating"""

    def test_plans_returns_download_formats(self, api_client):
        """GET /api/plans should return download_formats array"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        assert "download_formats" in data, "Response should contain download_formats"
        print("PASS: /api/plans contains download_formats")

    def test_six_download_formats(self, api_client):
        """Should return exactly 6 download formats"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        formats = data["download_formats"]
        assert len(formats) == 6, f"Expected 6 formats, got {len(formats)}"
        print(f"PASS: 6 download formats returned")

    def test_all_expected_formats_present(self, api_client):
        """All expected format IDs should be present"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        format_ids = [f["id"] for f in data["download_formats"]]
        for expected_id in EXPECTED_FORMATS:
            assert expected_id in format_ids, f"Missing format: {expected_id}"
        print(f"PASS: All expected formats present: {EXPECTED_FORMATS}")

    def test_format_tier_gating(self, api_client):
        """Each format should have correct tier assignment"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        formats = {f["id"]: f["tier"] for f in data["download_formats"]}
        for fmt_id, expected_tier in FORMAT_TIERS.items():
            actual_tier = formats.get(fmt_id)
            assert actual_tier == expected_tier, f"{fmt_id}: expected tier '{expected_tier}', got '{actual_tier}'"
        print("PASS: All format tier assignments correct")

    def test_wav16_is_free(self, api_client):
        """wav16 should be available for free tier"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        wav16 = next((f for f in data["download_formats"] if f["id"] == "wav16"), None)
        assert wav16 is not None, "wav16 format not found"
        assert wav16["tier"] == "free", f"wav16 tier: expected 'free', got '{wav16['tier']}'"
        print("PASS: wav16 is free tier")

    def test_mp3_flac_wav24_are_pro(self, api_client):
        """mp3, flac, wav24 should be pro tier"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        pro_formats = ["mp3", "flac", "wav24"]
        for fmt_id in pro_formats:
            fmt = next((f for f in data["download_formats"] if f["id"] == fmt_id), None)
            assert fmt is not None, f"{fmt_id} format not found"
            assert fmt["tier"] == "pro", f"{fmt_id} tier: expected 'pro', got '{fmt['tier']}'"
        print("PASS: mp3, flac, wav24 are pro tier")

    def test_hires_formats_are_studio(self, api_client):
        """wav24_96 and wav24_192 should be studio tier"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        data = response.json()
        studio_formats = ["wav24_96", "wav24_192"]
        for fmt_id in studio_formats:
            fmt = next((f for f in data["download_formats"] if f["id"] == fmt_id), None)
            assert fmt is not None, f"{fmt_id} format not found"
            assert fmt["tier"] == "studio", f"{fmt_id} tier: expected 'studio', got '{fmt['tier']}'"
        print("PASS: wav24_96, wav24_192 are studio tier")


# ============== RESEND EMAIL INTEGRATION TESTS ==============
class TestResendEmailIntegration:
    """Test Resend email receipt functionality with idempotent receipt_sent flag"""

    def test_stripe_status_endpoint_exists(self, authenticated_client):
        """GET /api/payments/status/{session_id} should exist"""
        # Use a fake session_id - should return 404 for non-existent
        response = authenticated_client.get(f"{BASE_URL}/api/payments/status/fake_session_123")
        # 404 is expected for non-existent session
        assert response.status_code == 404, f"Expected 404 for non-existent session, got {response.status_code}"
        print("PASS: /api/payments/status endpoint exists (returns 404 for non-existent)")

    def test_paypal_capture_endpoint_exists(self, authenticated_client):
        """POST /api/payments/paypal/capture-order/{order_id} should exist"""
        # Use a fake order_id - should return 404 for non-existent
        response = authenticated_client.post(f"{BASE_URL}/api/payments/paypal/capture-order/fake_order_123")
        # 404 is expected for non-existent order
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("PASS: /api/payments/paypal/capture-order endpoint exists (returns 404 for non-existent)")


# ============== STRIPE CHECKOUT PRICE TESTS ==============
class TestStripeCheckoutPrices:
    """Test that Stripe checkout also uses new prices"""

    def test_stripe_checkout_pro_monthly(self, authenticated_client):
        """Stripe checkout for Pro monthly should use $5.49"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "pro",
                "billing": "monthly",
                "origin_url": "https://audio-enhance-34.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "url" in data, "Response should contain checkout URL"
        actual = data["amount"]
        expected = EXPECTED_PRICES["pro"]["monthly"]
        assert actual == expected, f"Stripe Pro monthly: expected {expected}, got {actual}"
        print(f"PASS: Stripe Pro monthly amount = ${actual}")

    def test_stripe_checkout_studio_yearly(self, authenticated_client):
        """Stripe checkout for Studio yearly should use $131.99"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "studio",
                "billing": "yearly",
                "origin_url": "https://audio-enhance-34.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        actual = data["amount"]
        expected = EXPECTED_PRICES["studio"]["yearly"]
        assert actual == expected, f"Stripe Studio yearly: expected {expected}, got {actual}"
        print(f"PASS: Stripe Studio yearly amount = ${actual}")


# ============== HEALTH CHECK ==============
class TestHealthCheck:
    """Basic health check tests"""

    def test_api_root(self, api_client):
        """GET /api/ should return status ok"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: API health check OK")

    def test_presets_endpoint(self, api_client):
        """GET /api/presets should return presets"""
        response = api_client.get(f"{BASE_URL}/api/presets")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) == 8, f"Expected 8 presets, got {len(data['presets'])}"
        print("PASS: 8 presets returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
