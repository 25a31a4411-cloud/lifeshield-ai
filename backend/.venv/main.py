from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timezone
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=True)

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = Any


APP_ENV = os.getenv("APP_ENV", "development").lower()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY", ""
).strip()

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
CLAUDE_MODEL = os.getenv(
    "CLAUDE_MODEL", "claude-3-7-sonnet-latest"
)

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://localhost:5174,"
        "http://localhost:5175,http://localhost:5176",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="LifeShield AI API",
    description="Insurance needs assessment and education-first support",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

supabase_admin = None
supabase_auth = None

if create_client and SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase_auth = create_client(
        SUPABASE_URL, SUPABASE_ANON_KEY
    )

if create_client and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(
        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    )


# This in-memory storage is for local demonstrations only.
# It is not durable and must not be used for real customer data.
DEMO: dict[str, dict[str, list[dict[str, Any]]]] = {}
DEMO_ASSESSMENTS: dict[str, dict[str, Any]] = {}


# ---------------------------
# Request validation
# ---------------------------

class NeedsInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    age: int = Field(default=32, ge=18, le=100)
    annual_income: float = Field(default=1200000, ge=0)
    annual_expenses: float = Field(default=480000, ge=0)
    monthly_budget: float = Field(default=18000, ge=0)
    dependents: int = Field(default=3, ge=0, le=30)
    years: int = Field(default=20, ge=1, le=60)
    loans: float = Field(default=2500000, ge=0)
    future_goals: float = Field(default=1500000, ge=0)
    existing_assets: float = Field(default=500000, ge=0)
    existing_cover: float = Field(default=1000000, ge=0)
    inflation: float = Field(default=6, ge=0, le=20)
    discount_rate: float = Field(default=6, ge=0, le=20)


class PolicyInput(BaseModel):
    insurer: str = Field(min_length=1, max_length=120)
    policy_name: str = Field(min_length=1, max_length=160)
    policy_number: str = Field(default="", max_length=100)
    sum_assured: float = Field(ge=0)
    premium: float = Field(ge=0)
    renewal_date: Optional[str] = None


class ReminderInput(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    due_date: Optional[str] = None


class FraudInput(BaseModel):
    text: str = Field(min_length=5, max_length=12000)


class AssistantInput(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    context: dict[str, Any] = Field(default_factory=dict)


class AdvisorInput(BaseModel):
    preferred_date: Optional[str] = None
    topic: str = Field(default="Coverage review", max_length=120)
    notes: str = Field(default="", max_length=3000)


# ---------------------------
# Authentication
# ---------------------------

async def get_user(
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """
    Validate Supabase access tokens server-side.

    Without Supabase, development mode uses a demo identity.
    Production mode fails closed when authentication is missing.
    """

    if APP_ENV == "development" and not authorization:
        return {
            "id": "demo-user",
            "email": "demo@lifeshield.local",
            "role": "demo",
            "demo": True,
        }
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        if APP_ENV == "production":
            raise HTTPException(
                503, "Authentication is not configured"
            )

        return {
            "id": "demo-user",
            "email": "demo@lifeshield.local",
            "role": "demo",
            "demo": True,
        }

    if (
        not authorization
        or not authorization.lower().startswith("bearer ")
    ):
        raise HTTPException(401, "Sign in to continue")

    token = authorization.split(" ", 1)[1].strip()

    if not token or not supabase_auth:
        raise HTTPException(401, "Invalid session")

    try:
        response = supabase_auth.auth.get_user(token)
        user = getattr(response, "user", None)

        if not user and isinstance(response, dict):
            user = response.get("user")

        if not user:
            raise ValueError("No authenticated user")

        if isinstance(user, dict):
            return {
                "id": user.get("id"),
                "email": user.get("email"),
                "role": "customer",
                "demo": False,
            }

        return {
            "id": user.id,
            "email": getattr(user, "email", None),
            "role": "customer",
            "demo": False,
        }

    except Exception:
        raise HTTPException(
            401, "Session expired or invalid. Sign in again."
        )


# ---------------------------
# Database helpers
# ---------------------------

def table_for(user: dict, table: str):
    if not user.get("demo") and not supabase_admin:
        raise HTTPException(
            503,
            "Supabase service-role configuration is missing. "
            "Data cannot be persisted securely.",
        )

    if supabase_admin and not user.get("demo"):
        return supabase_admin.table(table)

    return None


def demo_bucket(
    user_id: str, table: str
) -> list[dict[str, Any]]:
    DEMO.setdefault(user_id, {}).setdefault(table, [])
    return DEMO[user_id][table]


def list_records(
    user: dict, table: str
) -> list[dict[str, Any]]:
    db = table_for(user, table)

    if db:
        try:
            result = (
                db.select("*")
                .eq("user_id", user["id"])
                .order("created_at", desc=True)
                .execute()
            )
            return result.data or []
        except Exception as exc:
            raise HTTPException(
                503,
                f"Database read failed for {table}. "
                "Check the schema and permissions.",
            ) from exc

    return list(demo_bucket(user["id"], table))


def insert_record(
    user: dict, table: str, values: dict[str, Any]
) -> dict[str, Any]:
    payload = {**values, "user_id": user["id"]}
    db = table_for(user, table)

    if db:
        try:
            result = db.insert(payload).execute()

            if not result.data:
                raise ValueError("No inserted row returned")

            return result.data[0]

        except Exception as exc:
            raise HTTPException(
                503,
                f"Database write failed for {table}. "
                "Run the supplied Supabase SQL schema.",
            ) from exc

    record = {
        "id": str(uuid.uuid4()),
        **payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    demo_bucket(user["id"], table).insert(0, record)
    return record


def delete_record(
    user: dict, table: str, record_id: str
) -> None:
    db = table_for(user, table)

    if db:
        try:
            db.delete().eq("id", record_id).eq(
                "user_id", user["id"]
            ).execute()
        except Exception as exc:
            raise HTTPException(
                503, "Could not delete record"
            ) from exc
        return

    bucket = demo_bucket(user["id"], table)
    bucket[:] = [
        row for row in bucket
        if str(row.get("id")) != record_id
    ]


# ---------------------------
# Insurance needs calculator
# ---------------------------

def calculate_needs(p: NeedsInput) -> dict[str, Any]:
    """
    Illustrative net-needs estimate.

    Income replacement is the present value of annual surplus.
    Future goals are adjusted for inflation.
    Existing assets and existing life cover are deducted separately.
    """

    annual_surplus = max(
        0.0, p.annual_income - p.annual_expenses
    )

    rate = p.discount_rate / 100
    years = p.years

    if rate == 0:
        income_replacement = annual_surplus * years
    else:
        income_replacement = (
            annual_surplus
            * (1 - (1 + rate) ** (-years))
            / rate
        )

    future_goals = (
        p.future_goals
        * (1 + p.inflation / 100) ** years
    )

    before_assets = (
        income_replacement + p.loans + future_goals
    )

    total_needs = max(
        0.0, before_assets - p.existing_assets
    )

    coverage_gap = max(
        0.0, total_needs - p.existing_cover
    )

    return {
        "income_replacement": round(income_replacement, 2),
        "loans_and_liabilities": round(p.loans, 2),
        "future_goals_adjusted": round(future_goals, 2),
        "assets_deducted": round(p.existing_assets, 2),
        "total_needs": round(total_needs, 2),
        "existing_cover": round(p.existing_cover, 2),
        "coverage_gap": round(coverage_gap, 2),
        "annual_surplus": round(annual_surplus, 2),
        "method": (
            "Present-value income surplus + inflation-adjusted goals "
            "+ liabilities - liquid assets - existing life cover"
        ),
        "assumptions": {
            "years": years,
            "inflation_percent": p.inflation,
            "discount_rate_percent": p.discount_rate,
        },
        "disclaimer": (
            "Illustrative educational estimate only. This is not "
            "regulated financial advice or a product recommendation. "
            "Review assumptions with a qualified professional."
        ),
    }


# ---------------------------
# Health and assessment
# ---------------------------

@app.get("/")
def home():
    return {
        "message": "LifeShield AI API is running",
        "status": "success",
        "environment": APP_ENV,
    }


@app.get("/api/health")
def health():
    ai_configured = (
        AI_PROVIDER == "gemini" and bool(GEMINI_API_KEY)
    ) or (
        AI_PROVIDER == "claude" and bool(ANTHROPIC_API_KEY)
    )

    return {
        "status": "healthy",
        "application": "LifeShield AI",
        "database_configured": bool(supabase_admin),
        "auth_configured": bool(
            SUPABASE_URL and SUPABASE_ANON_KEY
        ),
        "ai_provider": AI_PROVIDER,
        "ai_configured": ai_configured,
    }


@app.get("/api/assessment")
def get_assessment(user: dict = Depends(get_user)):
    if not user.get("demo") and not supabase_admin:
        raise HTTPException(
            503, "Supabase database configuration is incomplete"
        )

    if supabase_admin and not user.get("demo"):
        try:
            result = (
                supabase_admin.table("assessments")
                .select("profile,result")
                .eq("user_id", user["id"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                return result.data[0]

        except Exception:
            raise HTTPException(
                503, "Could not load your saved assessment"
            )

    return DEMO_ASSESSMENTS.get(user["id"], {})


@app.post("/api/calculate-needs")
def post_assessment(
    payload: NeedsInput,
    user: dict = Depends(get_user),
):
    if not user.get("demo") and not supabase_admin:
        raise HTTPException(
            503, "Supabase database configuration is incomplete"
        )

    result = calculate_needs(payload)

    saved = {
        "profile": payload.model_dump(),
        "result": result,
    }

    DEMO_ASSESSMENTS[user["id"]] = saved

    if supabase_admin and not user.get("demo"):
        try:
            supabase_admin.table("assessments").insert({
                "user_id": user["id"],
                "profile": payload.model_dump(),
                "result": result,
            }).execute()
        except Exception as exc:
            raise HTTPException(
                503,
                "Calculated successfully but could not save "
                "the assessment. Verify the Supabase schema.",
            ) from exc

    return result


# ---------------------------
# Product catalogue
# ---------------------------

@app.get("/api/products")
def products():
    """
    Demonstration entries only.
    Replace these with authorized, current insurer catalogue data.
    """

    return {
        "items": [
            {
                "id": "sample-term",
                "name": "Term protection (sample)",
                "insurer": "Illustrative catalogue",
                "type": "Term life",
                "source": "DEMO DATA",
                "verified": False,
                "description": (
                    "Pure protection concept. Confirm exclusions, "
                    "policy term, claim requirements and current "
                    "policy wording with the insurer."
                ),
            },
            {
                "id": "sample-savings",
                "name": "Savings-linked life plan (sample)",
                "insurer": "Illustrative catalogue",
                "type": "Savings + life cover",
                "source": "DEMO DATA",
                "verified": False,
                "description": (
                    "Example comparison row. Review charges, "
                    "guaranteed versus non-guaranteed benefits, "
                    "liquidity and surrender terms."
                ),
            },
            {
                "id": "sample-review",
                "name": "Family protection review (sample)",
                "insurer": "Illustrative catalogue",
                "type": "Needs review",
                "source": "DEMO DATA",
                "verified": False,
                "description": (
                    "Illustrative placeholder, not a real offer, "
                    "quote or recommendation."
                ),
            },
        ]
    }


# ---------------------------
# Policy vault
# ---------------------------

@app.get("/api/policies")
def get_policies(user: dict = Depends(get_user)):
    return {"items": list_records(user, "policies")}


@app.post("/api/policies")
def add_policy(
    payload: PolicyInput,
    user: dict = Depends(get_user),
):
    if payload.renewal_date:
        try:
            date.fromisoformat(payload.renewal_date)
        except ValueError:
            raise HTTPException(
                422, "Renewal date must be YYYY-MM-DD"
            )

    return {
        "item": insert_record(
            user, "policies", payload.model_dump()
        )
    }


@app.delete("/api/policies/{record_id}")
def remove_policy(
    record_id: str,
    user: dict = Depends(get_user),
):
    delete_record(user, "policies", record_id)
    return {"ok": True}


# ---------------------------
# Reminders
# ---------------------------

@app.get("/api/reminders")
def get_reminders(user: dict = Depends(get_user)):
    return {"items": list_records(user, "reminders")}


@app.post("/api/reminders")
def add_reminder(
    payload: ReminderInput,
    user: dict = Depends(get_user),
):
    if payload.due_date:
        try:
            date.fromisoformat(payload.due_date)
        except ValueError:
            raise HTTPException(
                422, "Due date must be YYYY-MM-DD"
            )

    return {
        "item": insert_record(
            user, "reminders", payload.model_dump()
        )
    }


# ---------------------------
# Fraud and scam screening
# ---------------------------

@app.post("/api/fraud-check")
def fraud_check(
    payload: FraudInput,
    user: dict = Depends(get_user),
):
    message = payload.text.lower()

    rules = [
        (
            "Urgency or threat language",
            [
                "immediately", "urgent", "today only",
                "last chance", "policy will be cancelled",
                "within 24 hours",
            ],
        ),
        (
            "Unrealistic return promise",
            [
                "guaranteed 30%", "double your money",
                "100% guaranteed", "risk free high return",
                "assured huge profit",
            ],
        ),
        (
            "OTP, PIN or password request",
            [
                "otp", "one time password", "pin number",
                "share your password", "verification code",
            ],
        ),
        (
            "Suspicious payment request",
            [
                "personal account", "pay agent", "upi to",
                "send money to my", "processing fee to release",
            ],
        ),
        (
            "Suspicious link or contact method",
            [
                "bit.ly/", "tinyurl.com/", "whatsapp only",
                "telegram me", "click this link",
            ],
        ),
        (
            "Impersonation or fake authority language",
            [
                "irda approved agent", "claim release officer",
                "policy activation officer", "regulator fee",
            ],
        ),
    ]

    signals = [
        label
        for label, terms in rules
        if any(term in message for term in terms)
    ]

    severe = any(
        label in (
            "OTP, PIN or password request",
            "Suspicious payment request",
        )
        for label in signals
    )

    if len(signals) >= 3 or severe:
        level = "high"
    elif signals:
        level = "medium"
    else:
        level = "low"

    summaries = {
        "high": (
            "Several serious warning signs were detected. "
            "Do not click, pay, or share credentials until "
            "you independently verify the message."
        ),
        "medium": (
            "One or more warning signs were detected. Verify "
            "the sender and offer through official channels."
        ),
        "low": (
            "No configured warning phrases were detected. "
            "This does not prove the message is genuine."
        ),
    }

    return {
        "risk_level": level,
        "summary": summaries[level],
        "signals": signals or [
            "No configured keyword signals detected; "
            "automated screening can miss scams."
        ],
        "next_steps": (
            "Contact the insurer using its official website "
            "or a phone number found independently. Never "
            "share OTPs, PINs or passwords. Do not pay a "
            "personal account. Report suspected fraud through "
            "the appropriate official channel."
        ),
    }


# ---------------------------
# Gemini / Claude AI assistant
# ---------------------------

async def ai_answer(
    message: str, context: dict[str, Any]
) -> str:
    system = (
        "You are LifeShield AI, an Indian life-insurance "
        "education assistant. Explain concepts simply and "
        "state uncertainty. Never invent current premiums, "
        "eligibility or policy terms. Never guarantee returns "
        "or claim outcomes. Do not give a definitive policy "
        "recommendation. Encourage checking official insurer "
        "and IRDAI sources. Do not ask for Aadhaar, PAN, OTPs, "
        "passwords, health records or bank details. State that "
        "needs estimates are illustrative and not regulated "
        "financial advice."
    )

    prompt = (
        f"{system}\n\n"
        f"Context (may be incomplete): {str(context)[:5000]}\n\n"
        f"User question: {message}"
    )

    async with httpx.AsyncClient(timeout=35) as client:
        if AI_PROVIDER == "gemini" and GEMINI_API_KEY:
            url = (
                "https://generativelanguage.googleapis.com/"
                f"v1beta/models/{GEMINI_MODEL}:generateContent"
                f"?key={GEMINI_API_KEY}"
            )

            response = await client.post(
                url,
                json={
                    "contents": [
                        {"parts": [{"text": prompt}]}
                    ],
                    "generationConfig": {
                        "temperature": 0.25,
                        "maxOutputTokens": 800,
                    },
                },
            )

            
            if response.status_code >= 400:
                print(
                    "Gemini HTTP status:",
                    response.status_code,
                    flush=True,
                )
                print(
                    "Gemini error response:",
                    response.text[:1000],
                    flush=True,
                )
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Gemini request failed. "
                        "Check the backend terminal for details."
                    ),
                )

            data = response.json()
            parts = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )

            answer = "\n".join(
                part.get("text", "")
                for part in parts
                if part.get("text")
            )

            if answer:
                return answer

        elif AI_PROVIDER == "claude" and ANTHROPIC_API_KEY:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 800,
                    "temperature": 0.25,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                },
            )

            if response.status_code >= 400:
                raise HTTPException(
                    502,
                    "Claude request failed. Check your API key "
                    "and configured model.",
                )

            data = response.json()
            answer = "\n".join(
                block.get("text", "")
                for block in data.get("content", [])
                if block.get("type") == "text"
            )

            if answer:
                return answer

    raise HTTPException(
        503,
        "AI provider is not configured. Set AI_PROVIDER and "
        "the matching backend API key in backend/.env.",
    )


@app.post("/api/assistant")
async def assistant(
    payload: AssistantInput,
    user: dict = Depends(get_user),
):
    return {
        "answer": await ai_answer(
            payload.message, payload.context
        ),
        "provider": AI_PROVIDER,
        "disclaimer": (
            "Educational information only. Verify important "
            "details with official sources."
        ),
    }


# ---------------------------
# Advisor requests
# ---------------------------

@app.post("/api/advisor-requests")
def advisor_request(
    payload: AdvisorInput,
    user: dict = Depends(get_user),
):
    if payload.preferred_date:
        try:
            date.fromisoformat(payload.preferred_date)
        except ValueError:
            raise HTTPException(
                422, "Preferred date must be YYYY-MM-DD"
            )

    item = insert_record(
        user,
        "advisor_requests",
        {
            **payload.model_dump(),
            "status": "requested",
        },
    )

    return {
        "item": item,
        "message": (
            "Request recorded. This does not confirm an "
            "advisor booking."
        ),
    }


# ---------------------------
# Insurer analytics
# ---------------------------

@app.get("/api/company/analytics")
def company_analytics(
    user: dict = Depends(get_user),
):
    """
    Production analytics require an authorized staff role.
    Set the role through trusted Supabase admin tooling,
    never through a public client-side form.
    """

    if APP_ENV == "production":
        if user.get("demo") or not supabase_admin:
            raise HTTPException(
                403, "Authorized insurer staff only"
            )

        try:
            response = (
                supabase_admin.auth.admin.get_user_by_id(
                    user["id"]
                )
            )

            raw_user = getattr(response, "user", None)
            metadata = (
                getattr(raw_user, "app_metadata", {})
                if raw_user else {}
            )

            if metadata.get("role") not in (
                "insurer_admin", "insurer_analyst"
            ):
                raise HTTPException(
                    403, "Authorized insurer staff only"
                )

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                403, "Could not verify insurer role"
            )

    if supabase_admin and not user.get("demo"):
        try:
            counts = {}

            for table in (
                "assessments",
                "policies",
                "advisor_requests",
            ):
                result = (
                    supabase_admin.table(table)
                    .select("id", count="exact")
                    .execute()
                )
                counts[table] = result.count or 0

            return {
                "assessments": counts["assessments"],
                "policies": counts["policies"],
                "advisor_requests": counts["advisor_requests"],
            }

        except Exception:
            raise HTTPException(
                503, "Analytics query failed"
            )

    return {
        "assessments": len(DEMO_ASSESSMENTS),
        "policies": sum(
            len(value.get("policies", []))
            for value in DEMO.values()
        ),
        "advisor_requests": sum(
            len(value.get("advisor_requests", []))
            for value in DEMO.values()
        ),
        "mode": "demo",
    }