from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import random
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# -------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("daddys-pos")

app = FastAPI(title="DADDY's Bakery POS")
api = APIRouter(prefix="/api")


# ---------- Auth helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str):
    # secure=True enforces HTTPS-only cookies in production
    is_production = os.environ.get("ENV", "dev").lower() == "production"
    response.set_cookie(
        "access_token", token, httponly=True, secure=is_production, samesite="lax",
        max_age=8 * 3600, path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "):
            token = ah[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # cakes, pastries, breads, chocolates, beverages
    price: float
    stock: int = 0
    low_stock_threshold: int = 5
    image: str = ""
    emoji: str = ""
    barcode: str = ""
    description: str = ""
    show_on_website: bool = True
    website_price: Optional[float] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    stock: int = 0
    low_stock_threshold: int = 5
    image: str = ""
    emoji: str = ""
    barcode: str = ""
    description: str = ""
    show_on_website: bool = True
    website_price: Optional[float] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    image: Optional[str] = None
    emoji: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    show_on_website: Optional[bool] = None
    website_price: Optional[float] = None
    active: Optional[bool] = None


class BakerySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = "DADDY's"
    full_name: str = "DADDY's Bakery"
    tagline: str = "Baked with Love, Made for You"
    address: str = ""
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    instagram: str = ""
    facebook: str = ""
    maps_url: str = ""
    hours: str = ""
    established_year: int = 2014


class BakerySettingsUpdate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    maps_url: Optional[str] = None
    hours: Optional[str] = None
    established_year: Optional[int] = None


class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int


class SaleCreate(BaseModel):
    items: List[CartItem]
    payment_method: Literal["cash", "card", "upi"] = "cash"
    discount: float = 0
    customer_name: Optional[str] = None
    source: Literal["pos", "online"] = "pos"


class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[CartItem]
    subtotal: float
    gst: float
    discount: float
    total: float
    payment_method: str
    customer_name: Optional[str] = None
    source: str = "pos"
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    phone: str = ""
    monthly_salary: float
    join_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    active: bool = True


class EmployeeCreate(BaseModel):
    name: str
    role: str
    phone: str = ""
    monthly_salary: float


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    monthly_salary: Optional[float] = None
    active: Optional[bool] = None


class PayrollEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    amount: float
    period: str  # YYYY-MM
    note: str = ""
    paid_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PayIn(BaseModel):
    period: str
    amount: Optional[float] = None
    note: str = ""


class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = ""  # flour, dairy, packaging, etc.
    contact: str = ""
    amount_owed: float = 0
    last_paid_at: Optional[str] = None


class SupplierCreate(BaseModel):
    name: str
    category: str = ""
    contact: str = ""
    amount_owed: float = 0


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    contact: Optional[str] = None
    amount_owed: Optional[float] = None


class SupplierPayIn(BaseModel):
    amount: float
    note: str = ""


class SupplierPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    amount: float
    note: str = ""
    paid_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OnlineOrderItem(BaseModel):
    name: str
    price: float
    qty: int


class OnlineOrderCreate(BaseModel):
    customer_name: str
    phone: str = ""
    items: List[OnlineOrderItem]
    order_type: Literal["delivery", "takeaway", "dine-in"] = "delivery"
    address: str = ""
    instructions: str = ""
    payment: Literal["cod", "upi", "card"] = "cod"


class OnlineOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: str = ""
    items: List[OnlineOrderItem]
    subtotal: float
    gst: float
    total: float
    order_type: str
    address: str = ""
    instructions: str = ""
    payment: str = "cod"
    status: Literal["new", "preparing", "ready", "dispatched", "completed", "rejected"] = "new"
    pushed_to_pos: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OnlineOrderStatusUpdate(BaseModel):
    status: Literal["new", "preparing", "ready", "dispatched", "completed", "rejected"]


class CustomCakeOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: str = ""
    occasion: str = ""
    date_needed: str = ""
    flavour: str = ""
    tiers: str = ""
    weight: str = ""
    budget: str = ""
    description: str = ""
    status: Literal["new", "in-discussion", "confirmed", "completed", "rejected"] = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CustomCakeOrderCreate(BaseModel):
    customer_name: str
    phone: str = ""
    occasion: str = ""
    date_needed: str = ""
    flavour: str = ""
    tiers: str = ""
    weight: str = ""
    budget: str = ""
    description: str = ""


class CustomCakeOrderStatusUpdate(BaseModel):
    status: Literal["new", "in-discussion", "confirmed", "completed", "rejected"]


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    set_auth_cookie(response, token)
    return {
        "id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"],
        "access_token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}


class ChangeCredentialsIn(BaseModel):
    current_password: str
    new_email: Optional[str] = None
    new_password: Optional[str] = None


@api.post("/auth/change-credentials")
async def change_credentials(body: ChangeCredentialsIn, user: dict = Depends(get_current_user)):
    """Allow the logged-in admin to change their email and/or password.""""
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not db_user or not verify_password(body.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    updates = {}
    if body.new_email:
        new_email = body.new_email.lower().strip()
        if new_email != db_user["email"]:
            existing = await db.users.find_one({"email": new_email})
            if existing:
                raise HTTPException(status_code=409, detail="Email already in use")
            updates["email"] = new_email
    if body.new_password:
        if len(body.new_password) < 8:
            raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
        updates["password_hash"] = hash_password(body.new_password)
    if not updates:
        raise HTTPException(status_code=422, detail="No changes provided")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    log.info("Credentials updated for user %s", user["id"])
    return {"ok": True, "message": "Credentials updated. Please log in again."}


# ---------- Products ----------
@api.get("/products")
async def list_products():
    items = await db.products.find({}, {"_id": 0}).sort("name", 1).to_list(2000)
    return items


@api.post("/products")
async def create_product(body: ProductCreate, user: dict = Depends(get_current_user)):
    p = Product(**body.model_dump())
    await db.products.insert_one(p.model_dump())
    return p.model_dump()


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields to update")
    res = await db.products.update_one({"id": pid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Product not found")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    return p


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"ok": True}


@api.get("/products/by-barcode/{code}")
async def product_by_barcode(code: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"barcode": code}, {"_id": 0})
    if not p:
        raise HTTPException(404, "No product with that barcode")
    return p


# ---------- Public menu (for website) ----------
@api.get("/menu")
async def public_menu():
    """PUBLIC — used by the bakery website to fetch the live menu."""
    items = await db.products.find(
        {"show_on_website": {"$ne": False}, "active": {"$ne": False}}, {"_id": 0}
    ).sort("category", 1).to_list(2000)
    out = []
    for p in items:
        out.append({
            "id": p["id"],
            "name": p["name"],
            "category": p.get("category", ""),
            "description": p.get("description", ""),
            "emoji": p.get("emoji", ""),
            "image": p.get("image", ""),
            "price": p.get("website_price") if p.get("website_price") not in (None, 0) else p["price"],
            "stock": p.get("stock", 0),
        })
    return out


# ---------- Bakery settings ----------
@api.get("/settings")
async def get_settings():
    """PUBLIC — used by both the POS and website."""
    s = await db.bakery_settings.find_one({}, {"_id": 0})
    if not s:
        s = BakerySettings().model_dump()
    return s


@api.put("/settings")
async def update_settings(body: BakerySettingsUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields")
    existing = await db.bakery_settings.find_one({})
    if not existing:
        merged = {**BakerySettings().model_dump(), **upd}
        await db.bakery_settings.insert_one(merged)
    else:
        await db.bakery_settings.update_one({}, {"$set": upd})
    s = await db.bakery_settings.find_one({}, {"_id": 0})
    return s


# ---------- Sales ----------
def _calc_totals(items: List[CartItem], discount: float):
    subtotal = sum(i.price * i.qty for i in items)
    after_disc = max(0.0, subtotal - discount)
    gst = round(after_disc * 0.05, 2)
    total = round(after_disc + gst, 2)
    return round(subtotal, 2), gst, total


@api.post("/sales")
async def create_sale(body: SaleCreate, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(400, "Cart is empty")
    subtotal, gst, total = _calc_totals(body.items, body.discount)
    sale = Sale(
        items=body.items,
        subtotal=subtotal, gst=gst, discount=body.discount, total=total,
        payment_method=body.payment_method,
        customer_name=body.customer_name,
        source=body.source,
        cashier_id=user["id"], cashier_name=user["name"],
    )
    doc = sale.model_dump()
    await db.sales.insert_one(doc)
    # decrement stock
    for it in body.items:
        await db.products.update_one({"id": it.product_id}, {"$inc": {"stock": -it.qty}})
    doc.pop("_id", None)
    return doc


@api.get("/sales")
async def list_sales(limit: int = 50, user: dict = Depends(get_current_user)):
    items = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


@api.get("/sales/analytics")
async def sales_analytics(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    start_30 = (now - timedelta(days=30)).isoformat()
    sales = await db.sales.find({"created_at": {"$gte": start_30}}, {"_id": 0}).to_list(5000)

    # daily buckets
    daily = {}
    for i in range(30, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        daily[d] = {"date": d, "revenue": 0, "orders": 0}
    cat_mix = {}
    item_count = {}
    for s in sales:
        d = s["created_at"][:10]
        if d in daily:
            daily[d]["revenue"] += s["total"]
            daily[d]["orders"] += 1
        for it in s.get("items", []):
            item_count[it["name"]] = item_count.get(it["name"], 0) + it["qty"]

    # category mix from products
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    pmap = {p["id"]: p for p in products}
    for s in sales:
        for it in s.get("items", []):
            p = pmap.get(it["product_id"])
            cat = (p or {}).get("category", "other")
            cat_mix[cat] = cat_mix.get(cat, 0) + it["price"] * it["qty"]

    # monthly buckets (last 12 months)
    monthly = {}
    for i in range(11, -1, -1):
        m = now.month - i
        y = now.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        key = f"{y:04d}-{m:02d}"
        monthly[key] = {"month": key, "revenue": 0, "orders": 0}
    all_sales = await db.sales.find({}, {"_id": 0}).to_list(20000)
    for s in all_sales:
        key = s["created_at"][:7]
        if key in monthly:
            monthly[key]["revenue"] += s["total"]
            monthly[key]["orders"] += 1

    today = now.date().isoformat()
    today_revenue = daily.get(today, {}).get("revenue", 0)
    today_orders = daily.get(today, {}).get("orders", 0)

    top_items = sorted(item_count.items(), key=lambda x: -x[1])[:5]

    low_stock = [p for p in products if p.get("stock", 0) <= p.get("low_stock_threshold", 5)]

    return {
        "today_revenue": round(today_revenue, 2),
        "today_orders": today_orders,
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock[:10],
        "top_items": [{"name": k, "qty": v} for k, v in top_items],
        "daily": list(daily.values()),
        "monthly": list(monthly.values()),
        "category_mix": [{"category": k, "value": round(v, 2)} for k, v in cat_mix.items()],
    }


# ---------- Employees / Payroll ----------
@api.get("/employees")
async def list_employees(user: dict = Depends(get_current_user)):
    return await db.employees.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/employees")
async def create_employee(body: EmployeeCreate, user: dict = Depends(get_current_user)):
    e = Employee(**body.model_dump())
    await db.employees.insert_one(e.model_dump())
    return e.model_dump()


@api.put("/employees/{eid}")
async def update_employee(eid: str, body: EmployeeUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields")
    r = await db.employees.update_one({"id": eid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Employee not found")
    return await db.employees.find_one({"id": eid}, {"_id": 0})


@api.delete("/employees/{eid}")
async def delete_employee(eid: str, user: dict = Depends(get_current_user)):
    r = await db.employees.delete_one({"id": eid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Employee not found")
    return {"ok": True}


@api.post("/employees/{eid}/pay")
async def pay_employee(eid: str, body: PayIn, user: dict = Depends(get_current_user)):
    emp = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Employee not found")
    amount = body.amount if body.amount is not None else emp["monthly_salary"]
    entry = PayrollEntry(
        employee_id=eid, employee_name=emp["name"],
        amount=amount, period=body.period, note=body.note,
    )
    await db.payroll.insert_one(entry.model_dump())
    return entry.model_dump()


@api.get("/payroll")
async def list_payroll(user: dict = Depends(get_current_user)):
    items = await db.payroll.find({}, {"_id": 0}).sort("paid_at", -1).to_list(500)
    return items


# ---------- Suppliers ----------
@api.get("/suppliers")
async def list_suppliers(user: dict = Depends(get_current_user)):
    return await db.suppliers.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/suppliers")
async def create_supplier(body: SupplierCreate, user: dict = Depends(get_current_user)):
    s = Supplier(**body.model_dump())
    await db.suppliers.insert_one(s.model_dump())
    return s.model_dump()


@api.put("/suppliers/{sid}")
async def update_supplier(sid: str, body: SupplierUpdate, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "No fields")
    r = await db.suppliers.update_one({"id": sid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Supplier not found")
    return await db.suppliers.find_one({"id": sid}, {"_id": 0})


@api.delete("/suppliers/{sid}")
async def delete_supplier(sid: str, user: dict = Depends(get_current_user)):
    r = await db.suppliers.delete_one({"id": sid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Supplier not found")
    return {"ok": True}


@api.post("/suppliers/{sid}/pay")
async def pay_supplier(sid: str, body: SupplierPayIn, user: dict = Depends(get_current_user)):
    sup = await db.suppliers.find_one({"id": sid}, {"_id": 0})
    if not sup:
        raise HTTPException(404, "Supplier not found")
    pay = SupplierPayment(
        supplier_id=sid, supplier_name=sup["name"], amount=body.amount, note=body.note
    )
    await db.supplier_payments.insert_one(pay.model_dump())
    new_owed = max(0.0, sup.get("amount_owed", 0) - body.amount)
    await db.suppliers.update_one(
        {"id": sid},
        {"$set": {"amount_owed": new_owed, "last_paid_at": pay.paid_at}},
    )
    return pay.model_dump()


@api.get("/supplier-payments")
async def list_supplier_payments(user: dict = Depends(get_current_user)):
    return await db.supplier_payments.find({}, {"_id": 0}).sort("paid_at", -1).to_list(500)


# ---------- Online orders ----------
@api.post("/online-orders")
async def create_online_order(body: OnlineOrderCreate):
    """PUBLIC endpoint — the bakery website POSTs orders here."""
    if not body.items:
        raise HTTPException(400, "No items")
    subtotal = sum(i.price * i.qty for i in body.items)
    gst = round(subtotal * 0.05, 2)
    total = round(subtotal + gst, 2)
    order = OnlineOrder(
        customer_name=body.customer_name, phone=body.phone, items=body.items,
        subtotal=round(subtotal, 2), gst=gst, total=total,
        order_type=body.order_type, address=body.address,
        instructions=body.instructions, payment=body.payment, status="new",
    )
    await db.online_orders.insert_one(order.model_dump())
    # Fire WhatsApp staff notification (non-blocking)
    import asyncio
    asyncio.create_task(send_whatsapp_notification(order.model_dump()))
    return order.model_dump()


@api.get("/online-orders")
async def list_online_orders(user: dict = Depends(get_current_user)):
    return await db.online_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/online-orders/{oid}/status")
async def update_online_order_status(oid: str, body: OnlineOrderStatusUpdate, user: dict = Depends(get_current_user)):
    r = await db.online_orders.update_one({"id": oid}, {"$set": {"status": body.status}})
    if r.matched_count == 0:
        raise HTTPException(404, "Order not found")
    return await db.online_orders.find_one({"id": oid}, {"_id": 0})


@api.post("/online-orders/{oid}/push-to-pos")
async def push_online_to_pos(oid: str, user: dict = Depends(get_current_user)):
    order = await db.online_orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("pushed_to_pos"):
        raise HTTPException(400, "Already pushed to POS")
    # match items to products
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    pmap = {p["name"].lower(): p for p in products}
    cart_items = []
    for it in order["items"]:
        p = pmap.get(it["name"].lower())
        pid = p["id"] if p else str(uuid.uuid4())
        cart_items.append(CartItem(product_id=pid, name=it["name"], price=it["price"], qty=it["qty"]))
    subtotal, gst, total = _calc_totals(cart_items, 0)
    sale = Sale(
        items=cart_items, subtotal=subtotal, gst=gst, discount=0, total=total,
        payment_method="upi" if order["payment"] == "upi" else "cash",
        customer_name=order["customer_name"], source="online",
        cashier_id=user["id"], cashier_name=user["name"],
    )
    await db.sales.insert_one(sale.model_dump())
    await db.online_orders.update_one(
        {"id": oid}, {"$set": {"pushed_to_pos": True, "status": "completed"}}
    )
    return {"sale": sale.model_dump()}


# ---------- Custom Cake Orders ----------
@api.post("/custom-cake-orders")
async def create_custom_cake_order(body: CustomCakeOrderCreate):
    """PUBLIC — website submits custom cake enquiry here."""
    order = CustomCakeOrder(**body.model_dump())
    await db.custom_cake_orders.insert_one(order.model_dump())
    log.info(f"Custom cake order {order.id} from {order.customer_name}")
    return order.model_dump()


@api.get("/custom-cake-orders")
async def list_custom_cake_orders(user: dict = Depends(get_current_user)):
    """POS staff — list all custom cake enquiries, newest first."""
    orders = await db.custom_cake_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.put("/custom-cake-orders/{oid}/status")
async def update_custom_cake_status(oid: str, body: CustomCakeOrderStatusUpdate, user: dict = Depends(get_current_user)):
    result = await db.custom_cake_orders.update_one({"id": oid}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(404, "Order not found")
    return {"ok": True}


@api.delete("/custom-cake-orders/{oid}")
async def delete_custom_cake_order(oid: str, user: dict = Depends(get_current_user)):
    result = await db.custom_cake_orders.delete_one({"id": oid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Order not found")
    return {"ok": True}


# ---------- Wire up ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Seed ----------
async def seed():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.sales.create_index("created_at")
    await db.employees.create_index("id", unique=True)
    await db.suppliers.create_index("id", unique=True)
    await db.online_orders.create_index("created_at")

    # Admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pwd = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pwd),
            "name": "Owner",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded admin user")
    elif not verify_password(admin_pwd, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_pwd)}},
        )

    # Products
    if await db.products.count_documents({}) == 0:
        seed_products = [
            ("Red Velvet Cake", "cakes", 420, "🎂", "https://images.unsplash.com/photo-1763316727676-3f3b96188def?ixlib=rb-4.1.0&auto=format&fit=crop&w=600&q=80"),
            ("Dark Choco Truffle", "cakes", 380, "🍫", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80"),
            ("Opera Cake", "cakes", 460, "🍰", "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80"),
            ("Mango Pastry", "pastries", 120, "🥭", "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80"),
            ("Butter Croissant", "pastries", 80, "🥐", "https://images.pexels.com/photos/30884565/pexels-photo-30884565.jpeg?auto=compress&cs=tinysrgb&w=600"),
            ("Strawberry Tart", "pastries", 140, "🍓", "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80"),
            ("Cinnamon Roll", "pastries", 95, "🌀", "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=600&q=80"),
            ("Sourdough Loaf", "breads", 180, "🍞", "https://images.unsplash.com/photo-1763026337559-f1c5e980c539?ixlib=rb-4.1.0&auto=format&fit=crop&w=600&q=80"),
            ("Garlic Focaccia", "breads", 150, "🫓", "https://images.unsplash.com/photo-1767065886275-2a8ff2eaa13a?ixlib=rb-4.1.0&auto=format&fit=crop&w=600&q=80"),
            ("Multigrain Bread", "breads", 160, "🌾", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80"),
            ("Truffle Box (6pc)", "chocolates", 350, "🍬", "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=600&q=80"),
            ("Praline Bar", "chocolates", 220, "🍫", "https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=600&q=80"),
            ("Cappuccino", "beverages", 90, "☕", "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80"),
            ("Cold Brew", "beverages", 110, "🧊", "https://images.unsplash.com/photo-1517663154410-bcdd6c7f15c1?auto=format&fit=crop&w=600&q=80"),
            ("Hot Chocolate", "beverages", 100, "🍵", "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=600&q=80"),
        ]
        docs = []
        for idx, (name, cat, price, emoji, img) in enumerate(seed_products):
            stock = random.randint(8, 60)
            if name in {"Opera Cake", "Truffle Box (6pc)"}:
                stock = random.randint(2, 5)
            barcode = f"890{1001 + idx:07d}"  # EAN-13-style 13-digit codes
            p = Product(name=name, category=cat, price=price, stock=stock,
                        low_stock_threshold=5, image=img, emoji=emoji,
                        barcode=barcode)
            docs.append(p.model_dump())
        await db.products.insert_many(docs)
        log.info("Seeded %d products", len(docs))

    # Employees
    if await db.employees.count_documents({}) == 0:
        emps = [
            ("Aarav Sharma", "Head Baker", "9876543210", 35000),
            ("Priya Iyer", "Cashier", "9876512340", 22000),
            ("Rahul Patil", "Pastry Chef", "9876545671", 28000),
            ("Meera Joshi", "Manager", "9876511122", 45000),
            ("Karan Singh", "Helper", "9876544478", 15000),
        ]
        await db.employees.insert_many([
            Employee(name=n, role=r, phone=p, monthly_salary=s).model_dump()
            for n, r, p, s in emps
        ])
        log.info("Seeded employees")

    # Suppliers
    if await db.suppliers.count_documents({}) == 0:
        sups = [
            ("Mumbai Flour Mills", "flour", "9123456780", 12500.0),
            ("Belgian Cocoa Co.", "chocolate", "9123456781", 28400.0),
            ("FreshDairy Pvt Ltd", "dairy", "9123456782", 8900.0),
            ("Sunrise Packaging", "packaging", "9123456783", 4200.0),
            ("Royal Spices", "spices", "9123456784", 0.0),
        ]
        await db.suppliers.insert_many([
            Supplier(name=n, category=c, contact=ph, amount_owed=a).model_dump()
            for n, c, ph, a in sups
        ])
        log.info("Seeded suppliers")

    # Bakery settings
    if await db.bakery_settings.count_documents({}) == 0:
        defaults = BakerySettings(
            name="DADDY's",
            full_name="DADDY's Bakery",
            tagline="Baked with Love, Made for You",
            address="Mirzahadipura Chowk, Mau, Uttar Pradesh 275101",
            phone="+91 9919520765",
            whatsapp="+91 9919520765",
            email="admin@daddyss.org",
            instagram="https://www.instagram.com/_daddys_bakery",
            facebook="",
            maps_url="https://maps.app.goo.gl/pUSTvU5X81DvmLpt7",
            hours="10:00 AM – 10:00 PM (Mon – Sun)",
            established_year=2014,
        ).model_dump()
        await db.bakery_settings.insert_one(defaults)
        log.info("Seeded bakery settings")
    if await db.sales.count_documents({}) == 0:
        products = await db.products.find({}, {"_id": 0}).to_list(2000)
        if products:
            now = datetime.now(timezone.utc)
            sample_sales = []
            for d in range(30, -1, -1):
                day = now - timedelta(days=d)
                # 4-12 sales per day
                for _ in range(random.randint(4, 12)):
                    n_items = random.randint(1, 4)
                    chosen = random.sample(products, k=min(n_items, len(products)))
                    cart = []
                    for p in chosen:
                        qty = random.randint(1, 3)
                        cart.append({"product_id": p["id"], "name": p["name"],
                                     "price": p["price"], "qty": qty})
                    subtotal = sum(c["price"] * c["qty"] for c in cart)
                    gst = round(subtotal * 0.05, 2)
                    total = round(subtotal + gst, 2)
                    ts = day.replace(
                        hour=random.randint(9, 21), minute=random.randint(0, 59),
                        second=random.randint(0, 59), microsecond=0,
                    )
                    sample_sales.append({
                        "id": str(uuid.uuid4()),
                        "items": cart,
                        "subtotal": round(subtotal, 2),
                        "gst": gst, "discount": 0, "total": total,
                        "payment_method": random.choice(["cash", "card", "upi"]),
                        "customer_name": None, "source": "pos",
                        "cashier_id": None, "cashier_name": "Priya Iyer",
                        "created_at": ts.isoformat(),
                    })
            if sample_sales:
                await db.sales.insert_many(sample_sales)
                log.info("Seeded %d sample sales", len(sample_sales))

    # Sample online orders
    if await db.online_orders.count_documents({}) == 0:
        samples = [
            ("Sneha R.", "9876000001", [{"name": "Red Velvet Cake", "price": 420, "qty": 1},
                                         {"name": "Cappuccino", "price": 90, "qty": 2}], "delivery", "new"),
            ("Ramesh K.", "9876000002", [{"name": "Opera Cake", "price": 460, "qty": 1}], "takeaway", "preparing"),
            ("Meera P.", "9876000003", [{"name": "Sourdough Loaf", "price": 180, "qty": 2},
                                         {"name": "Butter Croissant", "price": 80, "qty": 4}], "delivery", "ready"),
            ("Anil G.", "9876000004", [{"name": "Truffle Box (6pc)", "price": 350, "qty": 1}], "delivery", "new"),
        ]
        for name, ph, items, otype, status in samples:
            subtotal = sum(i["price"] * i["qty"] for i in items)
            gst = round(subtotal * 0.05, 2)
            total = round(subtotal + gst, 2)
            o = OnlineOrder(
                customer_name=name, phone=ph,
                items=[OnlineOrderItem(**i) for i in items],
                subtotal=round(subtotal, 2), gst=gst, total=total,
                order_type=otype, address="Virar West, Maharashtra",
                instructions="", payment="cod", status=status,
            )
            await db.online_orders.insert_one(o.model_dump())
        log.info("Seeded online orders")


@app.on_event("startup")
async def on_start():
    await seed()
    # Backfill barcodes on existing products if missing
    no_bc = await db.products.find({"$or": [{"barcode": {"$exists": False}}, {"barcode": ""}]}, {"_id": 0}).to_list(2000)
    for idx, p in enumerate(no_bc):
        await db.products.update_one(
            {"id": p["id"]},
            {"$set": {"barcode": f"890{2001 + idx:07d}"}},
        )
    if no_bc:
        log.info("Backfilled barcodes on %d products", len(no_bc))
    # Backfill description and show_on_website for legacy products (added in iter3)
    res_desc = await db.products.update_many(
        {"description": {"$exists": False}}, {"$set": {"description": ""}}
    )
    res_show = await db.products.update_many(
        {"show_on_website": {"$exists": False}}, {"$set": {"show_on_website": True}}
    )
    if res_desc.modified_count or res_show.modified_count:
        log.info(
            "Backfilled description on %d, show_on_website on %d",
            res_desc.modified_count, res_show.modified_count,
        )
    # Index barcode for fast lookup
    try:
        await db.products.create_index("barcode")
    except Exception:
        pass


@app.on_event("shutdown")
async def on_stop():
    client.close()


@api.get("/")
async def root():
    return {"app": "DADDY's Bakery POS", "ok": True}
