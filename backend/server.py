from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
import random
import string
import asyncio
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Monican Recharge API")
api_router = APIRouter(prefix="/api")

# ---------- Reloadly mock data (mirrors /app/frontend/lib/reloadly/mock.ts) ----------

OPERATORS = [
    {"id": 173, "name": "Digicel Haiti", "countryCode": "HT", "countryName": "Haiti",
     "flag": "🇭🇹", "logoUrl": "https://logo.clearbit.com/digicelgroup.com",
     "fxRate": 132, "currency": "HTG", "prefixes": ["3", "4"], "type": "both"},
    {"id": 528, "name": "Natcom Haiti", "countryCode": "HT", "countryName": "Haiti",
     "flag": "🇭🇹", "logoUrl": "https://logo.clearbit.com/natcom.com.ht",
     "fxRate": 132, "currency": "HTG", "prefixes": ["32", "33", "36"], "type": "both"},
    {"id": 24, "name": "AT&T USA", "countryCode": "US", "countryName": "United States",
     "flag": "🇺🇸", "logoUrl": "https://logo.clearbit.com/att.com",
     "fxRate": 1, "currency": "USD", "prefixes": [], "type": "airtime"},
    {"id": 91, "name": "T-Mobile USA", "countryCode": "US", "countryName": "United States",
     "flag": "🇺🇸", "logoUrl": "https://logo.clearbit.com/t-mobile.com",
     "fxRate": 1, "currency": "USD", "prefixes": [], "type": "airtime"},
]

DATA_PLANS = [
    {"id": "dgc-1", "operatorId": 173, "name": "Digi Daily", "data": "1 GB", "validity": "24h", "priceUsd": 1.5, "popular": False},
    {"id": "dgc-2", "operatorId": 173, "name": "Digi Weekly", "data": "5 GB", "validity": "7d", "priceUsd": 5, "popular": True},
    {"id": "dgc-3", "operatorId": 173, "name": "Digi Monthly", "data": "20 GB", "validity": "30d", "priceUsd": 18, "popular": False},
    {"id": "dgc-4", "operatorId": 173, "name": "Digi Mega", "data": "60 GB", "validity": "30d", "priceUsd": 35, "popular": False},
    {"id": "ntc-1", "operatorId": 528, "name": "Natcom Mini", "data": "500 MB", "validity": "24h", "priceUsd": 1, "popular": False},
    {"id": "ntc-2", "operatorId": 528, "name": "Natcom Plus", "data": "3 GB", "validity": "7d", "priceUsd": 4, "popular": True},
    {"id": "ntc-3", "operatorId": 528, "name": "Natcom Max", "data": "15 GB", "validity": "30d", "priceUsd": 15, "popular": False},
]


def detect_operator(phone: str, country_code: str) -> Optional[dict]:
    cleaned = ''.join(filter(str.isdigit, phone or ""))
    if cleaned.startswith("509"):
        cleaned = cleaned[3:]
    if country_code == "HT" and cleaned:
        d = cleaned[0]
        d2 = cleaned[:2]
        natcom = next((o for o in OPERATORS if o["id"] == 528), None)
        digicel = next((o for o in OPERATORS if o["id"] == 173), None)
        if natcom and any(d2.startswith(p) for p in natcom["prefixes"]):
            return natcom
        if digicel and d in digicel["prefixes"]:
            return digicel
        return digicel
    return next((o for o in OPERATORS if o["countryCode"] == country_code), None)


# ---------- Schemas ----------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class DetectIn(BaseModel):
    phone: str
    countryCode: str


class RecipientPhone(BaseModel):
    countryCode: str
    number: str


class RechargeIn(BaseModel):
    operatorId: int
    recipientPhone: RecipientPhone
    amount: Optional[float] = None
    type: Literal["airtime", "data_plan"] = "airtime"
    planId: Optional[str] = None
    paymentMethod: Literal["stripe", "moncash"] = "stripe"
    userEmail: Optional[str] = None


# ---------- Routes ----------

@api_router.get("/")
async def root():
    return {"service": "monican-recharge", "status": "ok"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


# ---- Reloadly mock ----

@api_router.get("/reloadly/operators")
async def list_operators():
    return {"operators": OPERATORS}


@api_router.post("/reloadly/auto-detect")
async def auto_detect(payload: DetectIn):
    op = detect_operator(payload.phone, payload.countryCode)
    return {"operator": op}


@api_router.get("/reloadly/data-bundles")
async def data_bundles(operatorId: Optional[int] = None):
    if operatorId is None:
        return {"plans": DATA_PLANS}
    plans = [p for p in DATA_PLANS if p["operatorId"] == operatorId]
    return {"plans": plans}


@api_router.post("/recharge/send")
async def send_recharge(payload: RechargeIn):
    op = next((o for o in OPERATORS if o["id"] == payload.operatorId), None)
    if not op:
        raise HTTPException(status_code=400, detail="Operator not found")
    if not payload.recipientPhone.number or not payload.recipientPhone.countryCode:
        raise HTTPException(status_code=400, detail="Missing recipient")

    final_amount = payload.amount or 0
    if payload.type == "data_plan" and payload.planId:
        plan = next((p for p in DATA_PLANS if p["id"] == payload.planId), None)
        if not plan:
            raise HTTPException(status_code=400, detail="Plan not found")
        final_amount = plan["priceUsd"]

    if not final_amount or final_amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Simulate Reloadly latency
    await asyncio.sleep(0.6)

    tx_id = str(uuid.uuid4())
    reference = "MR-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    dial = "+509" if payload.recipientPhone.countryCode == "HT" else "+1"

    record = {
        "id": tx_id,
        "reference": reference,
        "operator_id": op["id"],
        "operator": op["name"],
        "country_code": payload.recipientPhone.countryCode,
        "recipient": f"{dial} {payload.recipientPhone.number}",
        "amount_usd": float(final_amount),
        "amount_local": round(float(final_amount) * op["fxRate"]),
        "currency": op["currency"],
        "type": payload.type,
        "plan_id": payload.planId,
        "payment_method": payload.paymentMethod,
        "user_email": payload.userEmail,
        "status": "siksè",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mock": True,
    }

    # Also persist to Mongo for analytics (best-effort)
    try:
        await db.tranzaksyon.insert_one({**record})
    except Exception as e:
        logging.warning("Mongo insert failed: %s", e)

    return {
        "success": True,
        **record,
    }


@api_router.get("/recharge/transactions")
async def list_transactions(limit: int = 50, user_email: Optional[str] = None):
    q = {}
    if user_email:
        q["user_email"] = user_email
    rows = await db.tranzaksyon.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"transactions": rows}


# ---- Mount router & middleware ----

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
