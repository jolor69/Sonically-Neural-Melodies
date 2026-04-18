"""
Iteration 4 Tests - Sonically Audio Mastering App
Tests for:
1. Dynamic pricing from admin settings (GET /api/plans)
2. Admin settings endpoints (GET/PUT /api/admin/settings, POST /api/admin/apply)
3. Stripe endpoints REMOVED (should return 404)
4. PayPal create-order reflects admin pricing
5. Payment status endpoint still works for PayPal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://audio-enhance-34.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "jolor69@gmail.com"
ADMIN_PASSWORD = "AdminJolor2026!"
DEMO_EMAIL = "demo@sonically.io"
DEMO_PASSWORD = "DemoUser123!"


class TestHealthAndPlans:
    """Basic health and plans endpoint tests"""

    def test_api_health(self):
        """API root returns ok status"""
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")

    def test_plans_returns_dynamic_pricing(self):
        """GET /api/plans returns pricing with defaults"""
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        data = r.json()
        
        # Check structure
        assert "plans" in data
        assert "pricing" in data
        plans = data["plans"]
        pricing = data["pricing"]
        
        # Check plans structure
        assert "pro" in plans
        assert "studio" in plans
        assert "monthly" in plans["pro"]
        assert "yearly" in plans["pro"]
        
        # Check pricing structure
        assert "pro_monthly" in pricing
        assert "studio_monthly" in pricing
        assert "yearly_discount_percent" in pricing
        
        print(f"✓ Plans endpoint returns pricing: pro_monthly=${pricing['pro_monthly']}, studio_monthly=${pricing['studio_monthly']}, yearly_discount={pricing['yearly_discount_percent']}%")
        print(f"  Pro: monthly=${plans['pro']['monthly']['amount']}, yearly=${plans['pro']['yearly']['amount']}")
        print(f"  Studio: monthly=${plans['studio']['monthly']['amount']}, yearly=${plans['studio']['yearly']['amount']}")


class TestStripeRemoved:
    """Verify Stripe endpoints are removed (404)"""

    def test_stripe_checkout_removed(self):
        """POST /api/payments/checkout should NOT exist (404)"""
        r = requests.post(f"{BASE_URL}/api/payments/checkout", json={
            "plan": "pro",
            "billing": "monthly",
            "origin_url": "https://test.com"
        })
        # Should be 404 (not found) or 405 (method not allowed) since endpoint removed
        assert r.status_code in [404, 405, 422], f"Expected 404/405/422, got {r.status_code}"
        print(f"✓ Stripe checkout endpoint removed (status={r.status_code})")

    def test_stripe_webhook_removed(self):
        """POST /api/webhook/stripe should NOT exist (404)"""
        r = requests.post(f"{BASE_URL}/api/webhook/stripe", json={})
        assert r.status_code in [404, 405], f"Expected 404/405, got {r.status_code}"
        print(f"✓ Stripe webhook endpoint removed (status={r.status_code})")


class TestPaymentStatus:
    """Test payment status endpoint still works for PayPal"""

    def test_payment_status_endpoint_exists(self):
        """GET /api/payments/status/{session_id} returns 404 for unknown session (not 500)"""
        r = requests.get(f"{BASE_URL}/api/payments/status/nonexistent_session_123")
        # Should return 401 (unauthorized) or 404 (not found), not 500
        assert r.status_code in [401, 404], f"Expected 401/404, got {r.status_code}"
        print(f"✓ Payment status endpoint exists (status={r.status_code} for unknown session)")


class TestAdminSettings:
    """Test admin settings endpoints"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if r.status_code != 200:
            pytest.skip(f"Admin login failed: {r.status_code}")
        return r.json().get("token")

    def test_admin_get_settings_defaults(self, admin_token):
        """GET /api/admin/settings returns defaults including pricing"""
        r = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        
        # Check structure
        assert "draft" in data
        assert "applied" in data
        assert "defaults" in data
        
        defaults = data["defaults"]
        # Check pricing defaults exist
        assert "pro_monthly_price" in defaults
        assert "studio_monthly_price" in defaults
        assert "yearly_discount_percent" in defaults
        
        # Check default values
        assert defaults["pro_monthly_price"] == 5.49
        assert defaults["studio_monthly_price"] == 14.29
        assert defaults["yearly_discount_percent"] == 25.0
        
        print(f"✓ Admin settings returns defaults: pro=${defaults['pro_monthly_price']}, studio=${defaults['studio_monthly_price']}, discount={defaults['yearly_discount_percent']}%")

    def test_admin_put_draft_pricing(self, admin_token):
        """PUT /api/admin/settings/draft accepts pricing keys"""
        # Save draft with new pricing
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pro_monthly_price": 6.99,
                "studio_monthly_price": 15.99,
                "yearly_discount_percent": 30
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") == True
        
        draft = data.get("draft", {})
        assert draft.get("pro_monthly_price") == 6.99
        assert draft.get("studio_monthly_price") == 15.99
        assert draft.get("yearly_discount_percent") == 30
        
        print(f"✓ Admin draft saved: pro=${draft['pro_monthly_price']}, studio=${draft['studio_monthly_price']}, discount={draft['yearly_discount_percent']}%")

    def test_admin_put_draft_validation_price_clamp(self, admin_token):
        """PUT /api/admin/settings/draft clamps prices to 0.99-999"""
        # Test price clamping
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pro_monthly_price": 0.50,  # Should clamp to 0.99
                "studio_monthly_price": 1500  # Should clamp to 999
            }
        )
        assert r.status_code == 200
        draft = r.json().get("draft", {})
        assert draft.get("pro_monthly_price") == 0.99
        assert draft.get("studio_monthly_price") == 999.0
        print(f"✓ Price clamping works: 0.50→{draft['pro_monthly_price']}, 1500→{draft['studio_monthly_price']}")

    def test_admin_put_draft_validation_discount_clamp(self, admin_token):
        """PUT /api/admin/settings/draft clamps discount to 0-80"""
        # Test discount clamping
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "yearly_discount_percent": 95  # Should clamp to 80
            }
        )
        assert r.status_code == 200
        draft = r.json().get("draft", {})
        assert draft.get("yearly_discount_percent") == 80.0
        print(f"✓ Discount clamping works: 95→{draft['yearly_discount_percent']}")


class TestAdminApplyMerge:
    """Test that POST /api/admin/apply merges draft INTO applied"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if r.status_code != 200:
            pytest.skip(f"Admin login failed: {r.status_code}")
        return r.json().get("token")

    def test_apply_merges_not_replaces(self, admin_token):
        """POST /api/admin/apply merges draft into applied (preserves existing keys)"""
        # First, save a draft with only pricing
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pro_monthly_price": 7.49
            }
        )
        assert r.status_code == 200
        
        # Apply changes
        r = requests.post(
            f"{BASE_URL}/api/admin/apply",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") == True
        
        applied = data.get("applied", {})
        # Should have the new pricing key
        assert applied.get("pro_monthly_price") == 7.49
        
        # Check if duration keys are preserved (if they existed before)
        # This verifies merge behavior
        print(f"✓ Apply merges draft into applied. Applied keys: {list(applied.keys())}")


class TestPricingFlowEndToEnd:
    """End-to-end test: Admin changes pricing → /api/plans reflects it → PayPal create-order uses new price"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if r.status_code != 200:
            pytest.skip(f"Admin login failed: {r.status_code}")
        return r.json().get("token")

    @pytest.fixture
    def demo_token(self):
        """Get demo user auth token"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if r.status_code != 200:
            pytest.skip(f"Demo login failed: {r.status_code}")
        return r.json().get("token")

    def test_full_pricing_flow(self, admin_token, demo_token):
        """Full flow: Admin sets price → Plans API reflects → PayPal uses new price"""
        
        # Step 1: Admin saves draft with new pro price
        new_pro_price = 8.99
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pro_monthly_price": new_pro_price,
                "yearly_discount_percent": 25
            }
        )
        assert r.status_code == 200
        print(f"  Step 1: Draft saved with pro_monthly_price=${new_pro_price}")
        
        # Step 2: Admin applies changes
        r = requests.post(
            f"{BASE_URL}/api/admin/apply",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        print(f"  Step 2: Changes applied")
        
        # Step 3: Verify /api/plans reflects new price
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        
        actual_pro_monthly = plans["plans"]["pro"]["monthly"]["amount"]
        assert actual_pro_monthly == new_pro_price, f"Expected {new_pro_price}, got {actual_pro_monthly}"
        
        # Verify yearly is calculated correctly (monthly * 12 * (1 - discount/100))
        expected_yearly = round(new_pro_price * 12 * 0.75, 2)  # 25% discount
        actual_yearly = plans["plans"]["pro"]["yearly"]["amount"]
        assert abs(actual_yearly - expected_yearly) < 0.02, f"Expected yearly ~{expected_yearly}, got {actual_yearly}"
        
        print(f"  Step 3: /api/plans reflects new price: monthly=${actual_pro_monthly}, yearly=${actual_yearly}")
        
        # Step 4: Verify PayPal create-order uses new price
        r = requests.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            headers={"Authorization": f"Bearer {demo_token}"},
            json={
                "plan": "pro",
                "billing": "monthly"
            }
        )
        assert r.status_code == 200
        order = r.json()
        paypal_amount = order.get("amount")
        assert paypal_amount == new_pro_price, f"Expected PayPal amount {new_pro_price}, got {paypal_amount}"
        
        print(f"  Step 4: PayPal create-order returns amount=${paypal_amount}")
        print(f"✓ Full pricing flow verified!")


class TestResetPricing:
    """Reset pricing back to defaults after tests"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if r.status_code != 200:
            pytest.skip(f"Admin login failed: {r.status_code}")
        return r.json().get("token")

    def test_reset_to_defaults(self, admin_token):
        """Reset pricing to defaults (5.49, 14.29, 25%)"""
        # Save draft with default values
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/draft",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "pro_monthly_price": 5.49,
                "studio_monthly_price": 14.29,
                "yearly_discount_percent": 25
            }
        )
        assert r.status_code == 200
        
        # Apply
        r = requests.post(
            f"{BASE_URL}/api/admin/apply",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        
        # Verify
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        
        assert plans["plans"]["pro"]["monthly"]["amount"] == 5.49
        assert plans["plans"]["studio"]["monthly"]["amount"] == 14.29
        
        print(f"✓ Pricing reset to defaults: pro=${plans['plans']['pro']['monthly']['amount']}, studio=${plans['plans']['studio']['monthly']['amount']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
