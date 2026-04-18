"""
PayPal Integration Tests for Sonically
Tests: PayPal config, create-order, capture-order, status, idempotent tier upgrade
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Create unique test user for clean state
TEST_USER_EMAIL = f"test_paypal_{int(time.time())}@test.com"
TEST_USER_PASSWORD = "TestPayPal123!"
TEST_USER_NAME = "PayPal Test User"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_user_token(api_client):
    """Create a new test user and get auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "name": TEST_USER_NAME
    })
    if response.status_code == 200:
        return response.json().get("token")
    # If user already exists, try login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Could not create/login test user")


@pytest.fixture(scope="module")
def authenticated_client(api_client, test_user_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {test_user_token}"})
    return api_client


# ============ PAYPAL CONFIG TESTS ============
class TestPayPalConfig:
    """PayPal config endpoint tests - no auth required"""
    
    def test_paypal_config_returns_client_id(self, api_client):
        """GET /api/payments/paypal/config returns client_id, mode, currency"""
        response = api_client.get(f"{BASE_URL}/api/payments/paypal/config")
        assert response.status_code == 200
        data = response.json()
        assert "client_id" in data
        assert data["client_id"] is not None
        assert len(data["client_id"]) > 10  # Should be a real client ID
        
    def test_paypal_config_returns_sandbox_mode(self, api_client):
        """GET /api/payments/paypal/config returns mode='sandbox'"""
        response = api_client.get(f"{BASE_URL}/api/payments/paypal/config")
        data = response.json()
        assert data["mode"] == "sandbox"
        
    def test_paypal_config_returns_usd_currency(self, api_client):
        """GET /api/payments/paypal/config returns currency='USD'"""
        response = api_client.get(f"{BASE_URL}/api/payments/paypal/config")
        data = response.json()
        assert data["currency"] == "USD"
        
    def test_paypal_config_no_auth_required(self):
        """GET /api/payments/paypal/config works without auth"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/payments/paypal/config")
        assert response.status_code == 200


# ============ PAYPAL CREATE ORDER TESTS ============
class TestPayPalCreateOrder:
    """PayPal create-order endpoint tests"""
    
    def test_create_order_pro_monthly(self, authenticated_client):
        """POST /api/payments/paypal/create-order for Pro monthly returns order_id and amount"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["order_id"] is not None
        assert len(data["order_id"]) > 5
        assert data["amount"] == 4.99
        assert data["discount"] is None
        
    def test_create_order_pro_yearly(self, authenticated_client):
        """POST /api/payments/paypal/create-order for Pro yearly returns correct amount"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "yearly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["amount"] == 44.99
        
    def test_create_order_studio_monthly(self, authenticated_client):
        """POST /api/payments/paypal/create-order for Studio monthly returns correct amount"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "monthly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["amount"] == 12.99
        
    def test_create_order_studio_yearly(self, authenticated_client):
        """POST /api/payments/paypal/create-order for Studio yearly returns correct amount"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "yearly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["amount"] == 119.99
        
    def test_create_order_invalid_plan(self, authenticated_client):
        """POST /api/payments/paypal/create-order with invalid plan returns 400"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "invalid", "billing": "monthly"}
        )
        assert response.status_code == 400
        assert "Invalid plan" in response.json().get("detail", "")
        
    def test_create_order_invalid_billing(self, authenticated_client):
        """POST /api/payments/paypal/create-order with invalid billing returns 400"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "invalid"}
        )
        assert response.status_code == 400
        
    def test_create_order_requires_auth(self):
        """POST /api/payments/paypal/create-order without auth returns 401"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        assert response.status_code == 401
        
    def test_create_order_accepts_discount_code_field(self, authenticated_client):
        """POST /api/payments/paypal/create-order accepts discount_code field"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly", "discount_code": "LAUNCH20"}
        )
        # Should succeed even if code doesn't exist (just won't apply discount)
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data


# ============ PAYPAL PAYMENT STATUS TESTS ============
class TestPayPalPaymentStatus:
    """PayPal payment status endpoint tests"""
    
    def test_status_for_paypal_order(self, authenticated_client):
        """GET /api/payments/status/{order_id} for PayPal tx returns provider='paypal'"""
        # First create an order
        create_resp = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        order_id = create_resp.json()["order_id"]
        
        # Check status
        response = authenticated_client.get(f"{BASE_URL}/api/payments/status/{order_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "paypal"
        assert data["status"] == "open"
        assert data["payment_status"] == "pending"
        assert data["plan"] == "pro"
        assert data["billing"] == "monthly"
        
    def test_status_returns_db_stored_values(self, authenticated_client):
        """GET /api/payments/status/{order_id} returns DB-stored status/payment_status"""
        create_resp = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "yearly"}
        )
        order_id = create_resp.json()["order_id"]
        
        response = authenticated_client.get(f"{BASE_URL}/api/payments/status/{order_id}")
        data = response.json()
        # Verify it returns the stored values
        assert "status" in data
        assert "payment_status" in data
        assert data["amount_total"] == int(119.99 * 100)  # Cents
        assert data["currency"] == "usd"
        
    def test_status_nonexistent_order(self, authenticated_client):
        """GET /api/payments/status/{order_id} for non-existent order returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/payments/status/NONEXISTENT123")
        assert response.status_code == 404


# ============ PAYPAL CAPTURE ORDER TESTS ============
class TestPayPalCaptureOrder:
    """PayPal capture-order endpoint tests"""
    
    def test_capture_unapproved_order_returns_502(self, authenticated_client):
        """POST /api/payments/paypal/capture-order/{order_id} on unapproved order returns 502"""
        # Create an order (not approved by buyer)
        create_resp = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        order_id = create_resp.json()["order_id"]
        
        # Try to capture without buyer approval
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/capture-order/{order_id}"
        )
        # Should fail because order not approved
        assert response.status_code == 502
        assert "capture failed" in response.json().get("detail", "").lower()
        
    def test_capture_nonexistent_order(self, authenticated_client):
        """POST /api/payments/paypal/capture-order/{order_id} for non-existent order returns 404"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/payments/paypal/capture-order/NONEXISTENT123"
        )
        assert response.status_code == 404
        
    def test_capture_requires_auth(self):
        """POST /api/payments/paypal/capture-order/{order_id} without auth returns 401"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/payments/paypal/capture-order/SOMEORDER123"
        )
        assert response.status_code == 401


# ============ STRIPE STILL WORKS TESTS ============
class TestStripeStillWorks:
    """Verify existing Stripe checkout flow still works"""
    
    def test_stripe_checkout_pro(self, authenticated_client):
        """POST /api/payments/checkout creates Stripe session"""
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
        
    def test_stripe_status_endpoint(self, authenticated_client):
        """GET /api/payments/status/{session_id} works for Stripe sessions"""
        # Create a Stripe session
        create_resp = authenticated_client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "plan": "studio",
                "billing": "yearly",
                "origin_url": "https://audio-enhance-34.preview.emergentagent.com"
            }
        )
        session_id = create_resp.json()["session_id"]
        
        # Check status (may return 502 if Stripe proxy doesn't have session yet, but shouldn't crash)
        response = authenticated_client.get(f"{BASE_URL}/api/payments/status/{session_id}")
        # Should be 200 (with fallback to DB state) or 502 (Stripe proxy issue)
        assert response.status_code in [200, 502]


# ============ IDEMPOTENT TIER UPGRADE TESTS ============
class TestIdempotentTierUpgrade:
    """Test idempotent tier upgrade when payment_status is 'paid'"""
    
    def test_capture_with_paid_status_upgrades_tier(self):
        """
        Simulate: payment_transactions.payment_status='paid' in DB
        Then call capture-order -> should upgrade user's subscription_tier
        """
        import pymongo
        
        # Create a fresh test user for this test
        unique_email = f"test_tier_upgrade_{int(time.time())}@test.com"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Signup
        signup_resp = session.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "TierUpgrade123!",
            "name": "Tier Upgrade Test"
        })
        assert signup_resp.status_code == 200
        token = signup_resp.json()["token"]
        user_id = signup_resp.json()["user"]["user_id"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Verify user starts on free tier
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.json()["subscription_tier"] == "free"
        
        # Create a PayPal order
        create_resp = session.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        assert create_resp.status_code == 200
        order_id = create_resp.json()["order_id"]
        
        # Directly update DB to simulate paid status (as if PayPal webhook/capture succeeded)
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        # Set payment_status to 'paid' in DB
        result = db.payment_transactions.update_one(
            {"session_id": order_id},
            {"$set": {"payment_status": "paid", "status": "complete"}}
        )
        assert result.modified_count == 1
        
        # Now call capture-order - should trigger idempotent tier upgrade
        capture_resp = session.post(
            f"{BASE_URL}/api/payments/paypal/capture-order/{order_id}"
        )
        assert capture_resp.status_code == 200
        data = capture_resp.json()
        assert data["status"] == "complete"
        assert data["payment_status"] == "paid"
        assert data["plan"] == "pro"
        
        # Verify user's tier was upgraded
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.json()["subscription_tier"] == "pro"
        assert me_resp.json()["subscription_status"] == "active"
        
        # Cleanup
        client.close()
        
    def test_capture_with_paid_status_upgrades_to_studio(self):
        """Test idempotent upgrade to studio tier"""
        import pymongo
        
        unique_email = f"test_studio_upgrade_{int(time.time())}@test.com"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Signup
        signup_resp = session.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "StudioUpgrade123!",
            "name": "Studio Upgrade Test"
        })
        assert signup_resp.status_code == 200
        token = signup_resp.json()["token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create a PayPal order for studio
        create_resp = session.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "studio", "billing": "yearly"}
        )
        order_id = create_resp.json()["order_id"]
        
        # Update DB to paid
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        db.payment_transactions.update_one(
            {"session_id": order_id},
            {"$set": {"payment_status": "paid", "status": "complete"}}
        )
        
        # Call capture
        capture_resp = session.post(
            f"{BASE_URL}/api/payments/paypal/capture-order/{order_id}"
        )
        assert capture_resp.status_code == 200
        
        # Verify studio tier
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.json()["subscription_tier"] == "studio"
        
        client.close()


# ============ PAYMENT TRANSACTION DB VERIFICATION ============
class TestPaymentTransactionDB:
    """Verify payment_transactions collection is populated correctly"""
    
    def test_create_order_inserts_transaction(self):
        """POST /api/payments/paypal/create-order inserts row with provider='paypal'"""
        import pymongo
        
        unique_email = f"test_tx_insert_{int(time.time())}@test.com"
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Signup
        signup_resp = session.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "TxInsert123!",
            "name": "TX Insert Test"
        })
        token = signup_resp.json()["token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create order
        create_resp = session.post(
            f"{BASE_URL}/api/payments/paypal/create-order",
            json={"plan": "pro", "billing": "monthly"}
        )
        order_id = create_resp.json()["order_id"]
        
        # Check DB
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        tx = db.payment_transactions.find_one({"session_id": order_id})
        assert tx is not None
        assert tx["provider"] == "paypal"
        assert tx["payment_status"] == "pending"
        assert tx["plan"] == "pro"
        assert tx["billing"] == "monthly"
        assert tx["amount"] == 4.99
        
        client.close()
