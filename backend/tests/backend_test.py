import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bakery-inventory-pro-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@daddysbakery.com"
ADMIN_PWD = "admin123"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(client):
    r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    assert data["email"] == ADMIN_EMAIL
    token = data["access_token"]
    return {"token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ---------- Auth ----------
class TestAuth:
    def test_login_invalid(self, client):
        r = client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, client, auth):
        r = client.get(f"{API}/auth/me", headers=auth["headers"])
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauth(self, client):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, client, auth):
        r = client.post(f"{API}/auth/logout", headers=auth["headers"])
        assert r.status_code == 200


# ---------- Products ----------
class TestProducts:
    def test_list_seeded(self, client):
        r = client.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 15

    def test_create_requires_auth(self, client):
        r = requests.post(f"{API}/products", json={"name": "X", "category": "cakes", "price": 10})
        assert r.status_code == 401

    def test_crud(self, client, auth):
        r = client.post(f"{API}/products", headers=auth["headers"],
                        json={"name": "TEST_Prod", "category": "cakes", "price": 99, "stock": 10})
        assert r.status_code == 200
        pid = r.json()["id"]
        # update
        r2 = client.put(f"{API}/products/{pid}", headers=auth["headers"], json={"price": 120})
        assert r2.status_code == 200 and r2.json()["price"] == 120
        # GET verify
        items = client.get(f"{API}/products").json()
        found = next((p for p in items if p["id"] == pid), None)
        assert found and found["price"] == 120
        # delete
        rd = client.delete(f"{API}/products/{pid}", headers=auth["headers"])
        assert rd.status_code == 200


# ---------- Sales ----------
class TestSales:
    def test_create_sale_and_stock_decrement(self, client, auth):
        prods = client.get(f"{API}/products").json()
        p = next(x for x in prods if x.get("stock", 0) > 5)
        before = p["stock"]
        body = {
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": 2}],
            "payment_method": "cash", "discount": 0,
        }
        r = client.post(f"{API}/sales", headers=auth["headers"], json=body)
        assert r.status_code == 200
        sale = r.json()
        # subtotal = price*2, gst = subtotal*0.05
        expected_subtotal = round(p["price"] * 2, 2)
        expected_gst = round(expected_subtotal * 0.05, 2)
        expected_total = round(expected_subtotal + expected_gst, 2)
        assert abs(sale["subtotal"] - expected_subtotal) < 0.01
        assert abs(sale["gst"] - expected_gst) < 0.01
        assert abs(sale["total"] - expected_total) < 0.01
        # stock decrement
        prods2 = client.get(f"{API}/products").json()
        p2 = next(x for x in prods2 if x["id"] == p["id"])
        assert p2["stock"] == before - 2

    def test_analytics(self, client, auth):
        r = client.get(f"{API}/sales/analytics", headers=auth["headers"])
        assert r.status_code == 200
        d = r.json()
        for key in ["today_revenue", "monthly", "daily", "category_mix", "top_items", "low_stock_count"]:
            assert key in d, f"missing {key}"
        assert len(d["monthly"]) == 12
        assert len(d["daily"]) == 31


# ---------- Employees / Payroll ----------
class TestEmployees:
    def test_list(self, client, auth):
        r = client.get(f"{API}/employees", headers=auth["headers"])
        assert r.status_code == 200 and len(r.json()) >= 5

    def test_crud_and_pay(self, client, auth):
        r = client.post(f"{API}/employees", headers=auth["headers"],
                        json={"name": "TEST_Emp", "role": "Helper", "phone": "9", "monthly_salary": 10000})
        assert r.status_code == 200
        eid = r.json()["id"]
        r2 = client.put(f"{API}/employees/{eid}", headers=auth["headers"], json={"monthly_salary": 12000})
        assert r2.status_code == 200 and r2.json()["monthly_salary"] == 12000
        rp = client.post(f"{API}/employees/{eid}/pay", headers=auth["headers"], json={"period": "2026-01"})
        assert rp.status_code == 200
        assert rp.json()["amount"] == 12000
        rl = client.get(f"{API}/payroll", headers=auth["headers"])
        assert rl.status_code == 200
        assert any(e["employee_id"] == eid for e in rl.json())
        rd = client.delete(f"{API}/employees/{eid}", headers=auth["headers"])
        assert rd.status_code == 200


# ---------- Suppliers ----------
class TestSuppliers:
    def test_crud_and_pay(self, client, auth):
        r = client.post(f"{API}/suppliers", headers=auth["headers"],
                        json={"name": "TEST_Sup", "category": "flour", "contact": "9", "amount_owed": 1000})
        assert r.status_code == 200
        sid = r.json()["id"]
        rp = client.post(f"{API}/suppliers/{sid}/pay", headers=auth["headers"], json={"amount": 400})
        assert rp.status_code == 200
        # verify amount_owed reduced
        sups = client.get(f"{API}/suppliers", headers=auth["headers"]).json()
        s = next(x for x in sups if x["id"] == sid)
        assert s["amount_owed"] == 600
        # supplier-payments
        pays = client.get(f"{API}/supplier-payments", headers=auth["headers"]).json()
        assert any(p["supplier_id"] == sid for p in pays)
        client.delete(f"{API}/suppliers/{sid}", headers=auth["headers"])


# ---------- Online Orders ----------
class TestOnlineOrders:
    def test_public_create(self, client):
        body = {
            "customer_name": "TEST_Customer",
            "phone": "9999",
            "items": [{"name": "Red Velvet Cake", "price": 420, "qty": 1}],
            "order_type": "delivery", "address": "Virar", "payment": "cod",
        }
        r = requests.post(f"{API}/online-orders", json=body)  # no auth
        assert r.status_code == 200
        d = r.json()
        assert d["subtotal"] == 420
        assert d["gst"] == 21.0
        assert d["total"] == 441.0

    def test_list_requires_auth(self, client):
        r = requests.get(f"{API}/online-orders")
        assert r.status_code == 401

    def test_status_and_push(self, client, auth):
        # Create one
        body = {
            "customer_name": "TEST_PushCust", "phone": "9",
            "items": [{"name": "Cappuccino", "price": 90, "qty": 2}],
            "order_type": "takeaway", "payment": "upi",
        }
        cr = requests.post(f"{API}/online-orders", json=body)
        oid = cr.json()["id"]
        # status update
        rs = client.put(f"{API}/online-orders/{oid}/status",
                        headers=auth["headers"], json={"status": "preparing"})
        assert rs.status_code == 200 and rs.json()["status"] == "preparing"
        # push to pos
        rp = client.post(f"{API}/online-orders/{oid}/push-to-pos", headers=auth["headers"])
        assert rp.status_code == 200
        assert "sale" in rp.json()
        # check pushed flag
        orders = client.get(f"{API}/online-orders", headers=auth["headers"]).json()
        o = next(x for x in orders if x["id"] == oid)
        assert o["pushed_to_pos"] is True
        assert o["status"] == "completed"


# ---------- Iteration 3: Bakery Settings ----------
class TestBakerySettings:
    def test_get_settings_public(self, client):
        r = requests.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        # spec values from seeded settings
        assert "Mirzahadipura" in d.get("address", "")
        assert d.get("whatsapp", "").replace(" ", "") == "+919919520765"
        assert d.get("established_year") == 2014
        # required keys present
        for k in ["full_name", "tagline", "phone", "email", "instagram", "maps_url", "hours"]:
            assert k in d

    def test_put_settings_requires_auth(self, client):
        r = requests.put(f"{API}/settings", json={"tagline": "X"})
        assert r.status_code == 401

    def test_put_settings_persists(self, client, auth):
        new_tag = "TEST_Baked Fresh Daily"
        r = client.put(f"{API}/settings", headers=auth["headers"], json={"tagline": new_tag})
        assert r.status_code == 200
        assert r.json()["tagline"] == new_tag
        # GET to verify persistence
        g = requests.get(f"{API}/settings").json()
        assert g["tagline"] == new_tag
        # Restore original tagline
        client.put(f"{API}/settings", headers=auth["headers"],
                   json={"tagline": "Baked with Love, Made for You"})


# ---------- Iteration 3: Public menu and show_on_website ----------
class TestPublicMenu:
    def test_menu_public_default_15(self, client):
        r = requests.get(f"{API}/menu")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 15
        # each item has the documented fields
        sample = items[0]
        for k in ["id", "name", "category", "price", "description", "emoji", "image"]:
            assert k in sample

    def test_show_on_website_toggle_filters_menu(self, client, auth):
        before = requests.get(f"{API}/menu").json()
        before_ids = {p["id"] for p in before}
        # pick a product to hide
        prods = client.get(f"{API}/products").json()
        target = next(p for p in prods if p.get("show_on_website", True) and p["id"] in before_ids)
        # Toggle hidden
        r1 = client.put(f"{API}/products/{target['id']}", headers=auth["headers"],
                        json={"show_on_website": False})
        assert r1.status_code == 200
        assert r1.json()["show_on_website"] is False
        after_hidden = requests.get(f"{API}/menu").json()
        assert len(after_hidden) == len(before) - 1
        assert target["id"] not in {p["id"] for p in after_hidden}
        # Toggle back
        r2 = client.put(f"{API}/products/{target['id']}", headers=auth["headers"],
                        json={"show_on_website": True})
        assert r2.status_code == 200
        after_restore = requests.get(f"{API}/menu").json()
        assert len(after_restore) == len(before)
        assert target["id"] in {p["id"] for p in after_restore}

    def test_website_price_overrides_in_menu(self, client, auth):
        prods = client.get(f"{API}/products").json()
        target = next(p for p in prods if p.get("show_on_website", True))
        original_price = target["price"]
        wp = round(original_price + 10, 2)
        # set website_price
        r = client.put(f"{API}/products/{target['id']}", headers=auth["headers"],
                       json={"website_price": wp})
        assert r.status_code == 200
        assert r.json().get("website_price") == wp
        # menu reflects override
        menu = requests.get(f"{API}/menu").json()
        m = next(p for p in menu if p["id"] == target["id"])
        assert m["price"] == wp
        # Reset website_price by sending None: API ignores None — set to 0 instead
        client.put(f"{API}/products/{target['id']}", headers=auth["headers"],
                   json={"website_price": 0})
        menu2 = requests.get(f"{API}/menu").json()
        m2 = next(p for p in menu2 if p["id"] == target["id"])
        assert m2["price"] == original_price

    def test_product_list_includes_new_fields(self, client):
        prods = client.get(f"{API}/products").json()
        sample = prods[0]
        for k in ["show_on_website", "website_price", "description"]:
            assert k in sample

