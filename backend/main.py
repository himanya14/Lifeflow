
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from math import radians, sin, cos, sqrt, atan2
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

DATABASE_URL = "sqlite:///./lifeflow.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

WHOLE_BLOOD_INTERVAL = 56
DOUBLE_RED_INTERVAL = 112

class Donor(Base):
    __tablename__ = "donors"
    id = Column(Integer, primary_key=True)
    donor_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    blood_group = Column(String, nullable=False)
    phone = Column(String, default="")
    city = Column(String, default="")
    latitude = Column(Float, default=17.4435)
    longitude = Column(Float, default=78.3772)
    dob = Column(String, default="2004-04-18")
    gender = Column(String, default="Prefer not to say")
    emergency_available = Column(Boolean, default=True)
    alert_radius_km = Column(Integer, default=10)
    notifications_enabled = Column(Boolean, default=True)
    last_donation = Column(Date, nullable=True)
    last_donation_type = Column(String, default="Whole Blood")
    created_at = Column(DateTime, default=datetime.utcnow)

class Screening(Base):
    __tablename__ = "screenings"
    id = Column(Integer, primary_key=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    fever = Column(Boolean, default=False)
    infection = Column(Boolean, default=False)
    hepatitis = Column(Boolean, default=False)
    malaria = Column(Boolean, default=False)
    anemia = Column(Boolean, default=False)
    antibiotics = Column(Boolean, default=False)
    chronic_condition = Column(Boolean, default=False)
    surgery = Column(Boolean, default=False)
    recent_travel = Column(Boolean, default=False)
    pregnancy_related = Column(Boolean, default=False)
    hemoglobin = Column(Float, default=13.5)
    notes = Column(Text, default="")
    eligible = Column(Boolean, default=True)
    reason = Column(Text, default="")
    rule_code = Column(String, default="CLEAR")
    recheck_date = Column(Date, nullable=True)
    score = Column(Integer, default=100)

class Donation(Base):
    __tablename__ = "donations"
    id = Column(Integer, primary_key=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    donation_date = Column(Date, nullable=False)
    donation_type = Column(String, default="Whole Blood")
    blood_bank = Column(String, default="")
    units = Column(Float, default=1.0)
    verified = Column(Boolean, default=True)
    donation_code = Column(String, unique=True, nullable=False)

class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"
    id = Column(Integer, primary_key=True)
    request_code = Column(String, unique=True, nullable=False)
    hospital = Column(String, nullable=False)
    blood_group = Column(String, nullable=False)
    units_required = Column(Integer, default=1)
    urgency = Column(String, default="HIGH")
    city = Column(String, default="Hyderabad")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class EmergencyResponse(Base):
    __tablename__ = "emergency_responses"
    id = Column(Integer, primary_key=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("emergency_requests.id"), nullable=False)
    response = Column(String, default="PENDING")   # ACCEPTED / DECLINED
    responded_at = Column(DateTime, default=datetime.utcnow)
    journey_status = Column(String, default="NOT_STARTED")  # EN_ROUTE / ARRIVED / COMPLETED / CANCELLED

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    kind = Column(String, default="SYSTEM")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    action = Column(String, nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class HospitalAccount(Base):
    __tablename__ = "hospital_accounts"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    city = Column(String, default="Hyderabad")
    address = Column(String, default="")
    latitude = Column(Float, default=17.4142)
    longitude = Column(Float, default=78.4080)
    phone = Column(String, default="")

class BloodInventory(Base):
    __tablename__ = "blood_inventory"
    id = Column(Integer, primary_key=True)
    hospital_id = Column(Integer, ForeignKey("hospital_accounts.id"), nullable=False)
    blood_group = Column(String, nullable=False)
    units_available = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LifeFlow Donor API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return sha256(password.encode()).hexdigest()

def utc_now():
    """Single backend time source for API sync."""
    return datetime.now(timezone.utc)

def iso_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()

def make_token(donor_id: int) -> str:
    return f"lifeflow.demo.{donor_id}"

def donor_from_token(db: Session, authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing authentication token")
    token = authorization.split(" ", 1)[1]
    try:
        donor_id = int(token.split(".")[-1])
    except Exception:
        raise HTTPException(401, "Invalid token")
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(401, "Donor not found")
    return donor

def auth_donor(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return donor_from_token(db, authorization)

def add_activity(db: Session, donor_id: int, action: str, detail: str = ""):
    db.add(Activity(donor_id=donor_id, action=action, detail=detail))

def add_notification(db: Session, donor_id: int, title: str, body: str, kind: str = "SYSTEM"):
    db.add(Notification(donor_id=donor_id, title=title, body=body, kind=kind))

def interval_days(donation_type: str) -> int:
    return DOUBLE_RED_INTERVAL if donation_type == "Double Red Cells" else WHOLE_BLOOD_INTERVAL

def interval_state(donor: Donor):
    if not donor.last_donation:
        return {
            "required_days": WHOLE_BLOOD_INTERVAL,
            "days_since": None,
            "days_remaining": 0,
            "passed": True,
            "next_eligible_date": None,
            "progress": 100
        }
    required = interval_days(donor.last_donation_type)
    days_since = (date.today() - donor.last_donation).days
    remaining = max(0, required - days_since)
    next_date = donor.last_donation + timedelta(days=required)
    progress = min(100, round(days_since / required * 100))
    return {
        "required_days": required,
        "days_since": days_since,
        "days_remaining": remaining,
        "passed": remaining == 0,
        "next_eligible_date": next_date.isoformat(),
        "progress": progress
    }

def latest_screening(db: Session, donor_id: int):
    return db.query(Screening).filter(Screening.donor_id == donor_id).order_by(Screening.submitted_at.desc()).first()

def screening_state(db: Session, donor_id: int):
    s = latest_screening(db, donor_id)
    if not s:
        return {"exists": False, "valid": False, "eligible": False, "reason": "Complete health screening", "score": 0}
    age_days = (datetime.utcnow() - s.submitted_at).days
    valid = age_days <= 7
    return {
        "exists": True,
        "valid": valid,
        "eligible": bool(s.eligible and valid),
        "reason": s.reason if s.reason else ("Screening valid" if valid else "Screening expired"),
        "rule_code": s.rule_code,
        "score": s.score,
        "submitted_at": iso_utc(s.submitted_at),
        "valid_days_remaining": max(0, 7 - age_days),
        "recheck_date": s.recheck_date.isoformat() if s.recheck_date else None
    }

def eligibility_state(db: Session, donor: Donor):
    interval = interval_state(donor)
    screening = screening_state(db, donor.id)
    reasons = []
    if not interval["passed"]:
        reasons.append(f"Recovery interval incomplete: {interval['days_remaining']} days remaining")
    if not screening["exists"]:
        reasons.append("No health screening on record")
    elif not screening["valid"]:
        reasons.append("Health screening expired")
    elif not screening["eligible"]:
        reasons.append(screening["reason"])
    if not donor.emergency_available:
        reasons.append("Emergency availability is off")

    safety_eligible = interval["passed"] and screening["eligible"]
    score = 0
    if interval["passed"]: score += 35
    if screening["eligible"]: score += 45
    if donor.emergency_available: score += 10
    if donor.notifications_enabled: score += 5
    if donor.alert_radius_km >= 10: score += 5

    return {
        "eligible": safety_eligible,
        "status": "READY TO DONATE" if safety_eligible else "TEMPORARILY DEFERRED",
        "readiness_score": min(100, score),
        "reasons": reasons,
        "interval": interval,
        "screening": screening,
        "emergency_available": donor.emergency_available,
    }

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = radians(lat1), radians(lat2)
    dphi = radians(lat2-lat1)
    dl = radians(lon2-lon1)
    a = sin(dphi/2)**2 + cos(p1)*cos(p2)*sin(dl/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def compatible(donor_group: str, recipient_group: str) -> bool:
    mapping = {
        "O-": {"O-","O+","A-","A+","B-","B+","AB-","AB+"},
        "O+": {"O+","A+","B+","AB+"},
        "A-": {"A-","A+","AB-","AB+"},
        "A+": {"A+","AB+"},
        "B-": {"B-","B+","AB-","AB+"},
        "B+": {"B+","AB+"},
        "AB-": {"AB-","AB+"},
        "AB+": {"AB+"},
    }
    return recipient_group in mapping.get(donor_group, set())

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    blood_group: str
    phone: str = ""
    city: str = "Hyderabad"

class ProfileIn(BaseModel):
    name: str
    phone: str
    city: str
    emergency_available: bool
    alert_radius_km: int
    notifications_enabled: bool

class ScreeningIn(BaseModel):
    fever: bool = False
    infection: bool = False
    hepatitis: bool = False
    malaria: bool = False
    anemia: bool = False
    antibiotics: bool = False
    chronic_condition: bool = False
    surgery: bool = False
    recent_travel: bool = False
    pregnancy_related: bool = False
    hemoglobin: float = 13.5
    notes: str = ""

class ResponseIn(BaseModel):
    action: str

class JourneyIn(BaseModel):
    status: str

class HospitalRequestIn(BaseModel):
    blood_group: str
    units_required: int = Field(ge=1, le=20)
    urgency: str = "HIGH"
    city: str = "Hyderabad"
    latitude: float
    longitude: float
    required_in_minutes: int = Field(default=120, ge=5, le=10080)

class InventoryIn(BaseModel):
    blood_group: str
    units_available: int = Field(ge=0, le=10000)

class HospitalProfileIn(BaseModel):
    phone: str = ""
    address: str = ""

class DispatchSimulationIn(BaseModel):
    declines_before_accept: int = Field(default=1, ge=0, le=20)


def serialize_donor(d: Donor):
    return {
        "id": d.id, "donor_code": d.donor_code, "name": d.name, "email": d.email,
        "blood_group": d.blood_group, "phone": d.phone, "city": d.city,
        "latitude": d.latitude, "longitude": d.longitude, "dob": d.dob, "gender": d.gender,
        "emergency_available": d.emergency_available, "alert_radius_km": d.alert_radius_km,
        "notifications_enabled": d.notifications_enabled,
        "last_donation": d.last_donation.isoformat() if d.last_donation else None,
        "last_donation_type": d.last_donation_type
    }


def hospital_token(hospital_id: int) -> str:
    return f"lifeflow.hospital.{hospital_id}"

def hospital_from_token(db: Session, authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing hospital authentication token")
    token = authorization.split(" ", 1)[1]
    if not token.startswith("lifeflow.hospital."):
        raise HTTPException(403, "Hospital portal access required")
    try:
        hospital_id = int(token.rsplit(".", 1)[1])
    except Exception:
        raise HTTPException(401, "Invalid hospital token")
    hospital = db.query(HospitalAccount).filter(HospitalAccount.id == hospital_id).first()
    if not hospital:
        raise HTTPException(401, "Hospital account not found")
    return hospital

def auth_hospital(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return hospital_from_token(db, authorization)

@app.get("/health")
def health():
    return {"status": "ok", "service": "LifeFlow Donor API", "version": "2.1"}

@app.get("/time")
def server_time():
    now = utc_now()
    return {
        "utc": now.isoformat(),
        "timestamp": int(now.timestamp()),
        "source": "backend"
    }

@app.post("/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    donor = db.query(Donor).filter(Donor.email == payload.email.lower()).first()
    if not donor or donor.password_hash != hash_password(payload.password):
        raise HTTPException(401, "Invalid email or password")
    add_activity(db, donor.id, "Signed in", "Donor portal access")
    db.commit()
    return {"token": make_token(donor.id), "donor": serialize_donor(donor)}

@app.post("/auth/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(Donor).filter(Donor.email == payload.email.lower()).first():
        raise HTTPException(409, "Email already registered")
    next_code = f"LF-DN-{2400 + db.query(Donor).count() + 1:05d}"
    donor = Donor(
        donor_code=next_code, name=payload.name, email=payload.email.lower(),
        password_hash=hash_password(payload.password), blood_group=payload.blood_group,
        phone=payload.phone, city=payload.city
    )
    db.add(donor); db.flush()
    add_activity(db, donor.id, "Account created", "Donor registration completed")
    add_notification(db, donor.id, "Welcome to LifeFlow", "Complete your first health screening to activate donation readiness.", "WELCOME")
    db.commit()
    return {"token": make_token(donor.id), "donor": serialize_donor(donor)}

@app.get("/me")
def me(donor: Donor = Depends(auth_donor)):
    return serialize_donor(donor)

@app.put("/me")
def update_me(payload: ProfileIn, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    donor.name = payload.name
    donor.phone = payload.phone
    donor.city = payload.city
    donor.emergency_available = payload.emergency_available
    donor.alert_radius_km = max(1, min(50, payload.alert_radius_km))
    donor.notifications_enabled = payload.notifications_enabled
    add_activity(db, donor.id, "Profile updated", f"Alert radius set to {donor.alert_radius_km} km")
    db.commit()
    return serialize_donor(donor)

@app.get("/dashboard")
def dashboard(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    elig = eligibility_state(db, donor)
    all_requests = db.query(EmergencyRequest).filter(EmergencyRequest.status == "ACTIVE").all()
    detected, relevant = 0, []
    for r in all_requests:
        dist = haversine(donor.latitude, donor.longitude, r.latitude, r.longitude)
        if dist <= 25:
            detected += 1
        if dist <= donor.alert_radius_km and compatible(donor.blood_group, r.blood_group):
            relevant.append((r, dist))
    relevant.sort(key=lambda x: x[1])
    next_req = None
    if relevant:
        r, dist = relevant[0]
        next_req = {
            "id": r.id, "request_code": r.request_code, "hospital": r.hospital,
            "blood_group": r.blood_group, "units_required": r.units_required,
            "urgency": r.urgency, "distance_km": round(dist,1),
            "eta_minutes": max(5, round(dist*3.2))
        }
    recent = db.query(Activity).filter(Activity.donor_id == donor.id).order_by(Activity.created_at.desc()).limit(5).all()
    return {
        "donor": serialize_donor(donor),
        "eligibility": elig,
        "request_summary": {"detected": detected, "filtered": max(0, detected-len(relevant)), "relevant": len(relevant)},
        "nearest_request": next_req,
        "recent_activity": [{"action": a.action, "detail": a.detail, "created_at": iso_utc(a.created_at)} for a in recent]
    }

@app.get("/eligibility")
def eligibility(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    return eligibility_state(db, donor)

@app.post("/screenings")
def create_screening(payload: ScreeningIn, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    risks = []
    code = "CLEAR"
    recheck = None

    rule_map = [
        ("fever", payload.fever, "Recent fever", "H-01", 7),
        ("infection", payload.infection, "Active or recent infection", "H-02", 14),
        ("hepatitis", payload.hepatitis, "Hepatitis history requires clinical review", "H-03", 30),
        ("malaria", payload.malaria, "Recent malaria history requires deferral", "H-04", 30),
        ("anemia", payload.anemia, "Anemia / low iron reported", "H-05", 14),
        ("antibiotics", payload.antibiotics, "Active antibiotic medication", "M-04", 7),
        ("chronic_condition", payload.chronic_condition, "Chronic condition needs clinician review", "C-02", 14),
        ("surgery", payload.surgery, "Recent surgery or procedure", "P-03", 28),
        ("recent_travel", payload.recent_travel, "Recent travel requires risk review", "T-01", 14),
        ("pregnancy_related", payload.pregnancy_related, "Pregnancy-related temporary deferral", "P-07", 90),
    ]
    defer_days = 0
    for _, active, reason, c, days in rule_map:
        if active:
            risks.append(reason)
            if code == "CLEAR": code = c
            defer_days = max(defer_days, days)

    if payload.hemoglobin < 12.5:
        risks.append("Hemoglobin below prototype threshold (12.5 g/dL)")
        code = "HB-01"
        defer_days = max(defer_days, 14)

    eligible = len(risks) == 0
    if not eligible:
        recheck = date.today() + timedelta(days=defer_days)

    score = max(20, 100 - len(risks)*12 - (15 if payload.hemoglobin < 12.5 else 0))
    screening = Screening(
        donor_id=donor.id, **payload.model_dump(), eligible=eligible,
        reason="; ".join(risks) if risks else "No temporary risk flags detected",
        rule_code=code, recheck_date=recheck, score=score
    )
    db.add(screening)
    add_activity(db, donor.id, "Health screening submitted", "Eligible" if eligible else f"Deferred under {code}")
    add_notification(
        db, donor.id,
        "Screening result: " + ("Eligible" if eligible else "Temporarily deferred"),
        "Your latest health screening has been evaluated.",
        "SCREENING"
    )
    db.commit()
    return {
        "eligible": eligible, "reason": screening.reason, "rule_code": code,
        "recheck_date": recheck.isoformat() if recheck else None, "score": score
    }

@app.get("/screenings")
def screenings(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    rows = db.query(Screening).filter(Screening.donor_id == donor.id).order_by(Screening.submitted_at.desc()).all()
    return [{
        "id": s.id, "submitted_at": iso_utc(s.submitted_at), "eligible": s.eligible,
        "reason": s.reason, "rule_code": s.rule_code, "score": s.score,
        "hemoglobin": s.hemoglobin, "recheck_date": s.recheck_date.isoformat() if s.recheck_date else None
    } for s in rows]

@app.get("/donations")
def donations(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    rows = db.query(Donation).filter(Donation.donor_id == donor.id).order_by(Donation.donation_date.desc()).all()
    return [{
        "id": d.id, "donation_code": d.donation_code, "donation_date": d.donation_date.isoformat(),
        "donation_type": d.donation_type, "blood_bank": d.blood_bank, "units": d.units, "verified": d.verified
    } for d in rows]

@app.get("/donations/{donation_id}/certificate")
def donation_certificate(donation_id: int, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    d = db.query(Donation).filter(Donation.id == donation_id, Donation.donor_id == donor.id).first()
    if not d:
        raise HTTPException(404, "Donation record not found")
    text = f"""LIFEFLOW VERIFIED DONATION RECORD

Donation ID: {d.donation_code}
Donor: {donor.name}
Donor Code: {donor.donor_code}
Blood Group: {donor.blood_group}
Donation Type: {d.donation_type}
Blood Bank: {d.blood_bank}
Donation Date: {d.donation_date.isoformat()}
Units: {d.units}
Verification: {'Verified' if d.verified else 'Pending'}

Prototype record generated by LifeFlow.
"""
    return Response(
        content=text,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{d.donation_code}.txt"'}
    )

@app.get("/emergencies")
def emergencies(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    elig = eligibility_state(db, donor)
    rows = db.query(EmergencyRequest).filter(EmergencyRequest.status == "ACTIVE").all()
    out = []
    for r in rows:
        dist = haversine(donor.latitude, donor.longitude, r.latitude, r.longitude)
        is_compat = compatible(donor.blood_group, r.blood_group)
        in_radius = dist <= donor.alert_radius_km
        matched = is_compat and in_radius
        reasons = [
            {"label": "Blood compatibility", "value": f"{donor.blood_group} → {r.blood_group}", "passed": is_compat},
            {"label": "Medical eligibility", "value": "Current screening", "passed": elig["screening"]["eligible"] if elig["screening"]["exists"] else False},
            {"label": "Donation interval", "value": f"{elig['interval']['days_since'] or 0} / {elig['interval']['required_days']} days", "passed": elig["interval"]["passed"]},
            {"label": "Distance", "value": f"{dist:.1f} km", "passed": in_radius},
            {"label": "Availability", "value": "Emergency alerts enabled" if donor.emergency_available else "Unavailable", "passed": donor.emergency_available},
        ]
        resp = db.query(EmergencyResponse).filter(EmergencyResponse.donor_id == donor.id, EmergencyResponse.request_id == r.id).first()
        out.append({
            "id": r.id, "request_code": r.request_code, "hospital": r.hospital,
            "blood_group": r.blood_group, "units_required": r.units_required,
            "urgency": r.urgency, "city": r.city, "distance_km": round(dist,1),
            "eta_minutes": max(5, round(dist*3.2)), "compatible": is_compat,
            "in_radius": in_radius, "matched": matched, "can_accept": matched and elig["eligible"] and donor.emergency_available,
            "match_reasons": reasons,
            "latitude": r.latitude, "longitude": r.longitude,
            "response": resp.response if resp else None,
            "journey_status": resp.journey_status if resp else None,
            "created_at": iso_utc(r.created_at)
        })
    return sorted(out, key=lambda x: x["distance_km"])

@app.post("/emergencies/{request_id}/respond")
def respond_emergency(request_id: int, payload: ResponseIn, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    r = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, "Emergency request not found")
    action = payload.action.upper()
    if action not in {"ACCEPTED", "DECLINED"}:
        raise HTTPException(400, "Action must be ACCEPTED or DECLINED")
    if action == "ACCEPTED":
        elig = eligibility_state(db, donor)
        dist = haversine(donor.latitude, donor.longitude, r.latitude, r.longitude)
        if not elig["eligible"]:
            raise HTTPException(409, "Safety lock: donor is not currently eligible")
        if not compatible(donor.blood_group, r.blood_group):
            raise HTTPException(409, "Blood group is not compatible with this request")
        if dist > donor.alert_radius_km:
            raise HTTPException(409, "Request is outside your selected alert radius")
    response = db.query(EmergencyResponse).filter(EmergencyResponse.donor_id == donor.id, EmergencyResponse.request_id == request_id).first()
    if not response:
        response = EmergencyResponse(donor_id=donor.id, request_id=request_id)
        db.add(response)
    response.response = action
    response.responded_at = datetime.utcnow()
    response.journey_status = "EN_ROUTE" if action == "ACCEPTED" else "NOT_STARTED"
    add_activity(db, donor.id, f"Emergency request {action.lower()}", r.request_code)
    add_notification(
        db, donor.id,
        "Emergency response recorded",
        f"{r.request_code}: {action.title()} for {r.hospital}",
        "EMERGENCY"
    )
    db.commit()
    return {"ok": True, "response": action, "journey_status": response.journey_status}

@app.put("/emergencies/{request_id}/journey")
def update_journey(request_id: int, payload: JourneyIn, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    allowed = {"EN_ROUTE", "ARRIVED", "COMPLETED", "CANCELLED"}
    status = payload.status.upper()
    if status not in allowed:
        raise HTTPException(400, "Invalid journey status")
    resp = db.query(EmergencyResponse).filter(EmergencyResponse.donor_id == donor.id, EmergencyResponse.request_id == request_id).first()
    if not resp or resp.response != "ACCEPTED":
        raise HTTPException(409, "Accept the request before updating journey status")
    resp.journey_status = status
    req = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id).first()
    add_activity(db, donor.id, f"Emergency journey: {status.replace('_',' ').title()}", req.request_code if req else "")
    if status == "COMPLETED" and req:
        code = f"DON-{date.today().year}-{1000 + db.query(Donation).count() + 1:05d}"
        donation = Donation(
            donor_id=donor.id, donation_date=date.today(), donation_type="Whole Blood",
            blood_bank=req.hospital, units=1, verified=True, donation_code=code
        )
        db.add(donation)
        donor.last_donation = date.today()
        donor.last_donation_type = "Whole Blood"
        req.status = "FULFILLED"
        add_notification(db, donor.id, "Donation recorded", f"{code} has been added to your verified donation history.", "DONATION")
    db.commit()
    return {"ok": True, "journey_status": status}

@app.get("/notifications")
def notifications(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter(Notification.donor_id == donor.id).order_by(Notification.created_at.desc()).all()
    return [{
        "id": n.id, "title": n.title, "body": n.body, "kind": n.kind,
        "read": n.read, "created_at": iso_utc(n.created_at)
    } for n in rows]

@app.post("/notifications/{notification_id}/read")
def mark_read(notification_id: int, donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.donor_id == donor.id).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.read = True
    db.commit()
    return {"ok": True}

@app.get("/activity")
def activity(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    rows = db.query(Activity).filter(Activity.donor_id == donor.id).order_by(Activity.created_at.desc()).all()
    return [{"id": a.id, "action": a.action, "detail": a.detail, "created_at": iso_utc(a.created_at)} for a in rows]

@app.get("/compatibility")
def compatibility(donor: Donor = Depends(auth_donor)):
    groups = ["O-","O+","A-","A+","B-","B+","AB-","AB+"]
    donate_to = [g for g in groups if compatible(donor.blood_group, g)]
    receive_from = [g for g in groups if compatible(g, donor.blood_group)]
    return {"blood_group": donor.blood_group, "donate_to": donate_to, "receive_from": receive_from}

@app.get("/health-passport")
def health_passport(donor: Donor = Depends(auth_donor), db: Session = Depends(get_db)):
    elig = eligibility_state(db, donor)
    return {
        "donor_code": donor.donor_code,
        "blood_group": donor.blood_group,
        "screening": "Valid" if elig["screening"]["eligible"] else ("Expired" if elig["screening"].get("exists") else "Required"),
        "recovery_interval": "Passed" if elig["interval"]["passed"] else "Waiting",
        "emergency_status": "Available" if donor.emergency_available else "Unavailable",
        "passport_status": "READY TO DONATE" if elig["eligible"] else "NOT READY",
        "readiness_score": elig["readiness_score"]
    }


@app.post("/hospital/auth/login")
def hospital_login(payload: LoginIn, db: Session = Depends(get_db)):
    hospital = db.query(HospitalAccount).filter(HospitalAccount.email == payload.email.lower()).first()
    if not hospital or hospital.password_hash != hash_password(payload.password):
        raise HTTPException(401, "Invalid hospital email or password")
    return {"token": hospital_token(hospital.id), "hospital": serialize_hospital(hospital)}

def serialize_hospital(h):
    return {"id": h.id, "name": h.name, "email": h.email, "city": h.city, "address": h.address, "phone": h.phone, "latitude": h.latitude, "longitude": h.longitude}

@app.get("/hospital/me")
def hospital_me(hospital: HospitalAccount = Depends(auth_hospital)):
    return serialize_hospital(hospital)

@app.put("/hospital/me")
def hospital_update_me(payload: HospitalProfileIn, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    hospital.phone = payload.phone
    hospital.address = payload.address
    db.commit(); db.refresh(hospital)
    return serialize_hospital(hospital)

@app.get("/hospital/overview")
def hospital_overview(hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    requests = db.query(EmergencyRequest).filter(EmergencyRequest.hospital == hospital.name).order_by(EmergencyRequest.created_at.desc()).all()
    inventory = db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital.id).order_by(BloodInventory.blood_group).all()
    active = [r for r in requests if r.status == "ACTIVE"]
    responses = []
    for r in requests:
        rows = db.query(EmergencyResponse).filter(EmergencyResponse.request_id == r.id).all()
        responses.extend(rows)
    return {"hospital": serialize_hospital(hospital), "active_requests": len(active), "total_requests": len(requests), "responses": len(responses), "accepted": sum(1 for x in responses if x.response == "ACCEPTED"), "inventory_units": sum(x.units_available for x in inventory), "requests": [serialize_hospital_request(db, r) for r in requests[:10]], "inventory": [{"id": x.id, "blood_group": x.blood_group, "units_available": x.units_available, "updated_at": iso_utc(x.updated_at)} for x in inventory]}

def serialize_hospital_request(db, r):
    rows = db.query(EmergencyResponse).filter(EmergencyResponse.request_id == r.id).all()
    donor_rows = []
    for resp in rows:
        d = db.query(Donor).filter(Donor.id == resp.donor_id).first()
        donor_rows.append({"donor_id": d.id if d else None, "donor_name": d.name if d else "Unknown donor", "donor_code": d.donor_code if d else "", "blood_group": d.blood_group if d else "", "response": resp.response, "journey_status": resp.journey_status, "responded_at": iso_utc(resp.responded_at)})
    return {"id": r.id, "request_code": r.request_code, "hospital": r.hospital, "blood_group": r.blood_group, "units_required": r.units_required, "urgency": r.urgency, "city": r.city, "latitude": r.latitude, "longitude": r.longitude, "status": r.status, "created_at": iso_utc(r.created_at), "expires_at": iso_utc(r.expires_at), "responses": donor_rows}

@app.get("/hospital/requests")
def hospital_requests(hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    rows = db.query(EmergencyRequest).filter(EmergencyRequest.hospital == hospital.name).order_by(EmergencyRequest.created_at.desc()).all()
    return [serialize_hospital_request(db, r) for r in rows]

@app.post("/hospital/requests")
def hospital_create_request(payload: HospitalRequestIn, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    urgency = payload.urgency.upper()
    if urgency not in {"CRITICAL", "HIGH", "MODERATE", "LOW"}:
        raise HTTPException(400, "Invalid urgency")
    code = f"EMR-{date.today().year}-{1000 + db.query(EmergencyRequest).count() + 1:05d}"
    now = datetime.utcnow()
    r = EmergencyRequest(request_code=code, hospital=hospital.name, blood_group=payload.blood_group, units_required=payload.units_required, urgency=urgency, city=payload.city or hospital.city, latitude=payload.latitude, longitude=payload.longitude, status="ACTIVE", created_at=now, expires_at=now+timedelta(minutes=payload.required_in_minutes))
    db.add(r); db.flush()
    # Create notifications only for donors who pass the initial match filters; acceptance rechecks every rule.
    donors = db.query(Donor).filter(Donor.emergency_available == True, Donor.notifications_enabled == True).all()
    notified = 0
    for donor in donors:
        dist = haversine(donor.latitude, donor.longitude, r.latitude, r.longitude)
        if dist <= donor.alert_radius_km and compatible(donor.blood_group, r.blood_group) and eligibility_state(db, donor)["eligible"]:
            add_notification(db, donor.id, "New compatible emergency request", f"{code} · {hospital.name} · {payload.blood_group} · {dist:.1f} km", "EMERGENCY")
            add_activity(db, donor.id, "Emergency request matched", code)
            notified += 1
    db.commit()
    return {**serialize_hospital_request(db, r), "eligible_donors_notified": notified}

@app.patch("/hospital/requests/{request_id}")
def hospital_update_request(request_id: int, payload: dict, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    r = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id, EmergencyRequest.hospital == hospital.name).first()
    if not r: raise HTTPException(404, "Request not found for this hospital")
    status = str(payload.get("status", r.status)).upper()
    if status not in {"ACTIVE", "CANCELLED", "FULFILLED"}: raise HTTPException(400, "Invalid request status")
    r.status = status
    db.commit()
    return serialize_hospital_request(db, r)

@app.get("/hospital/requests/{request_id}/responses")
def hospital_request_responses(request_id: int, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    r = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id, EmergencyRequest.hospital == hospital.name).first()
    if not r: raise HTTPException(404, "Request not found for this hospital")
    return serialize_hospital_request(db, r)["responses"]

@app.post("/hospital/inventory")
def hospital_set_inventory(payload: InventoryIn, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    group = payload.blood_group.upper()
    if group not in {"O-","O+","A-","A+","B-","B+","AB-","AB+"}: raise HTTPException(400, "Invalid blood group")
    item = db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital.id, BloodInventory.blood_group == group).first()
    if not item:
        item = BloodInventory(hospital_id=hospital.id, blood_group=group, units_available=payload.units_available); db.add(item)
    else: item.units_available = payload.units_available
    item.updated_at = datetime.utcnow(); db.commit(); db.refresh(item)
    return {"id": item.id, "blood_group": item.blood_group, "units_available": item.units_available, "updated_at": iso_utc(item.updated_at)}

@app.get("/hospital/inventory")
def hospital_inventory(hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    rows = db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital.id).order_by(BloodInventory.blood_group).all()
    return [{"id": x.id, "blood_group": x.blood_group, "units_available": x.units_available, "updated_at": iso_utc(x.updated_at)} for x in rows]



BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

def ranked_matches(db: Session, request: EmergencyRequest, hospital: HospitalAccount):
    rows = []
    donors = db.query(Donor).all()
    for donor in donors:
        dist = haversine(donor.latitude, donor.longitude, request.latitude, request.longitude)
        compatible_group = compatible(donor.blood_group, request.blood_group)
        elig = eligibility_state(db, donor)
        available = bool(donor.emergency_available and donor.notifications_enabled)
        in_radius = dist <= donor.alert_radius_km
        reasons = []
        if not compatible_group: reasons.append("Blood group incompatible")
        if not elig["eligible"]: reasons.extend(elig["reasons"] or ["Eligibility not confirmed"])
        if not donor.emergency_available: reasons.append("Donor paused emergency availability")
        if not donor.notifications_enabled: reasons.append("Notifications disabled")
        if not in_radius: reasons.append(f"Outside donor alert radius ({donor.alert_radius_km} km)")
        is_match = compatible_group and elig["eligible"] and available and in_radius
        eta = max(5, round(dist * 3.2))
        # Transparent operational ranking: compatibility and eligibility are gates; distance/ETA rank candidates.
        score = max(0, round(100 - min(dist, 100) * 1.25)) if is_match else 0
        rows.append({"donor_id": donor.id, "donor_code": donor.donor_code, "name": donor.name, "blood_group": donor.blood_group, "city": donor.city, "distance_km": round(dist, 1), "eta_minutes_estimate": eta, "eligible": bool(elig["eligible"]), "eligibility_status": elig["status"], "compatible": compatible_group, "available": available, "within_alert_radius": in_radius, "match": is_match, "match_score": score, "reasons": reasons if reasons else ["Compatible, screening and recovery checks passed; available within alert radius"], "ranking_basis": "Eligibility + compatibility gates, then approximate distance"})
    rows.sort(key=lambda x: (not x["match"], x["distance_km"]))
    return rows

@app.get("/hospital/command-center")
def hospital_command_center(hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    requests = db.query(EmergencyRequest).order_by(EmergencyRequest.created_at.desc()).all()
    inventory = db.query(BloodInventory).filter(BloodInventory.hospital_id == hospital.id).all()
    donors = db.query(Donor).all()
    group_counts = {g: sum(1 for d in donors if d.blood_group == g) for g in BLOOD_GROUPS}
    stock_map = {g: 0 for g in BLOOD_GROUPS}
    for item in inventory: stock_map[item.blood_group] = item.units_available
    active = [r for r in requests if r.status == "ACTIVE"]
    critical = [r for r in active if r.urgency.upper() == "CRITICAL"]
    low_stock = [{"blood_group": g, "units_available": units, "threshold": 3, "status": "LOW" if units < 3 else "OK"} for g, units in stock_map.items()]
    return {"hospital": serialize_hospital(hospital), "active_requests": len(active), "critical_requests": len(critical), "donor_count": len(donors), "donors_by_group": group_counts, "inventory_by_group": low_stock, "requests": [serialize_hospital_request(db, r) for r in requests[:20]], "generated_at": iso_utc(datetime.utcnow())}

@app.get("/hospital/donors")
def hospital_donor_directory(blood_group: Optional[str] = None, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    group = blood_group.upper() if blood_group else None
    if group and group not in BLOOD_GROUPS:
        raise HTTPException(400, "Unknown blood group")
    donors = db.query(Donor).all()
    result = []
    for donor in donors:
        if group and donor.blood_group != group: continue
        elig = eligibility_state(db, donor)
        dist = haversine(donor.latitude, donor.longitude, hospital.latitude, hospital.longitude)
        result.append({"id": donor.id, "donor_code": donor.donor_code, "name": donor.name, "blood_group": donor.blood_group, "city": donor.city, "emergency_available": donor.emergency_available, "notifications_enabled": donor.notifications_enabled, "eligible": bool(elig["eligible"]), "eligibility_status": elig["status"], "distance_km": round(dist, 1), "alert_radius_km": donor.alert_radius_km})
    result.sort(key=lambda x: (x["blood_group"], x["distance_km"]))
    return {"total": len(result), "blood_groups": BLOOD_GROUPS, "counts": {g: sum(1 for d in result if d["blood_group"] == g) for g in BLOOD_GROUPS}, "donors": result}

@app.get("/hospital/requests/{request_id}/matches")
def hospital_request_matches(request_id: int, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id, EmergencyRequest.hospital == hospital.name).first()
    if not request: raise HTTPException(404, "Emergency request not found")
    rows = ranked_matches(db, request, hospital)
    return {"request": serialize_hospital_request(db, request), "candidate_count": len(rows), "match_count": sum(1 for x in rows if x["match"]), "ranking_explanation": "Compatibility and current prototype eligibility are hard gates. Eligible candidates inside their alert radius are ranked by straight-line distance; ETA is an estimate, not live traffic routing.", "candidates": rows}

@app.post("/hospital/requests/{request_id}/simulate")
def simulate_dispatch(request_id: int, payload: DispatchSimulationIn, hospital: HospitalAccount = Depends(auth_hospital), db: Session = Depends(get_db)):
    request = db.query(EmergencyRequest).filter(EmergencyRequest.id == request_id, EmergencyRequest.hospital == hospital.name).first()
    if not request: raise HTTPException(404, "Emergency request not found")
    candidates = [x for x in ranked_matches(db, request, hospital) if x["match"]]
    events = [{"step": 1, "event": "Request created", "status": "ACTIVE", "detail": f"{request.request_code} · {request.blood_group} · {request.urgency}"}]
    selected = None
    for index, candidate in enumerate(candidates):
        step = len(events) + 1
        events.append({"step": step, "event": "Candidate contacted", "status": "SIMULATED", "detail": f"{candidate['name']} ({candidate['blood_group']}) · {candidate['distance_km']} km · estimated {candidate['eta_minutes_estimate']} min"})
        if index < payload.declines_before_accept:
            events.append({"step": len(events) + 1, "event": "No acceptance / simulated decline", "status": "ESCALATE", "detail": "Prototype scenario advances to the next ranked candidate"})
        else:
            selected = candidate
            events.append({"step": len(events) + 1, "event": "Simulated acceptance", "status": "MATCHED", "detail": f"{candidate['name']} selected for follow-up verification"})
            break
    if selected is None:
        events.append({"step": len(events) + 1, "event": "No eligible candidate available", "status": "NEEDS_ACTION", "detail": "Expand outreach radius, contact partner hospitals, or review inventory"})
    return {"request_code": request.request_code, "mode": "SIMULATION_ONLY", "real_records_changed": False, "candidates_considered": min(len(candidates), payload.declines_before_accept + (1 if selected else 0)), "selected_donor": selected, "events": events, "note": "This is a demonstration simulation. It does not contact donors or change request/response records."}

def seed():
    db = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.email == "aarav@lifeflow.com").first()
        if not donor:
            donor = Donor(
                donor_code="LF-DN-02481", name="Aarav Mehta", email="aarav@lifeflow.com",
                password_hash=hash_password("lifeflow123"), blood_group="B+",
                phone="+91 98XXXXXX21", city="Hyderabad", latitude=17.4435, longitude=78.3772,
                emergency_available=True, alert_radius_km=10, notifications_enabled=True,
                last_donation=date.today()-timedelta(days=75), last_donation_type="Whole Blood"
            )
            db.add(donor); db.flush()

        if not db.query(Screening).filter(Screening.donor_id == donor.id).first():
            db.add(Screening(
                donor_id=donor.id, submitted_at=datetime.utcnow()-timedelta(days=2),
                hemoglobin=13.8, eligible=True, reason="No temporary risk flags detected",
                rule_code="CLEAR", score=98
            ))

        if not db.query(Donation).filter(Donation.donor_id == donor.id).first():
            db.add_all([
                Donation(donor_id=donor.id, donation_date=date.today()-timedelta(days=75), donation_type="Whole Blood",
                         blood_bank="Apollo Blood Centre, Jubilee Hills", units=1, verified=True, donation_code="DON-2026-00831"),
                Donation(donor_id=donor.id, donation_date=date.today()-timedelta(days=210), donation_type="Whole Blood",
                         blood_bank="Continental Hospitals Blood Centre", units=1, verified=True, donation_code="DON-2026-00410"),
                Donation(donor_id=donor.id, donation_date=date.today()-timedelta(days=360), donation_type="Whole Blood",
                         blood_bank="Red Cross Blood Bank", units=1, verified=True, donation_code="DON-2025-01742"),
            ])

        # Demo directory: guarantee that every standard ABO/Rh blood group is represented.
        demo_donors = [
            ("LF-DN-02482", "Nisha Rao", "nisha.o.neg@lifeflow.com", "O-", 17.4310, 78.4010),
            ("LF-DN-02483", "Kabir Shah", "kabir.o.pos@lifeflow.com", "O+", 17.4550, 78.3720),
            ("LF-DN-02484", "Meera Iyer", "meera.a.neg@lifeflow.com", "A-", 17.4250, 78.3890),
            ("LF-DN-02485", "Arjun Reddy", "arjun.a.pos@lifeflow.com", "A+", 17.4480, 78.3600),
            ("LF-DN-02486", "Zoya Khan", "zoya.b.neg@lifeflow.com", "B-", 17.4380, 78.4200),
            ("LF-DN-02487", "Ishaan Verma", "ishaan.ab.neg@lifeflow.com", "AB-", 17.4620, 78.4000),
            ("LF-DN-02488", "Tara Menon", "tara.ab.pos@lifeflow.com", "AB+", 17.4170, 78.3850),
        ]
        for code, name, email, group, lat, lon in demo_donors:
            demo = db.query(Donor).filter(Donor.email == email).first()
            if not demo:
                demo = Donor(donor_code=code, name=name, email=email, password_hash=hash_password("donor123"), blood_group=group, phone="+91 90000 00000", city="Hyderabad", latitude=lat, longitude=lon, emergency_available=True, alert_radius_km=25, notifications_enabled=True, last_donation=date.today()-timedelta(days=90), last_donation_type="Whole Blood")
                db.add(demo); db.flush()
            if not db.query(Screening).filter(Screening.donor_id == demo.id).first():
                db.add(Screening(donor_id=demo.id, submitted_at=datetime.utcnow()-timedelta(days=1), hemoglobin=13.4, eligible=True, reason="Demo screening clear; clinician verification required", rule_code="CLEAR", score=96))
            if not db.query(Notification).filter(Notification.donor_id == demo.id).first():
                add_notification(db, demo.id, "Welcome to LifeFlow demo", "This is a seeded demo donor record for prototype testing. This is not a verified real-world donor.", "WELCOME")

        if db.query(EmergencyRequest).count() == 0:
            now = datetime.utcnow()
            db.add_all([
                EmergencyRequest(request_code="EMR-2026-0418", hospital="Apollo Hospitals, Jubilee Hills", blood_group="B+",
                                 units_required=2, urgency="CRITICAL", latitude=17.4142, longitude=78.4080,
                                 created_at=now-timedelta(minutes=9), expires_at=now+timedelta(hours=2)),
                EmergencyRequest(request_code="EMR-2026-0421", hospital="CARE Hospitals, HITEC City", blood_group="AB+",
                                 units_required=1, urgency="HIGH", latitude=17.4504, longitude=78.3809,
                                 created_at=now-timedelta(minutes=21), expires_at=now+timedelta(hours=3)),
                EmergencyRequest(request_code="EMR-2026-0407", hospital="AIG Hospitals, Gachibowli", blood_group="A+",
                                 units_required=2, urgency="HIGH", latitude=17.4428, longitude=78.3489,
                                 created_at=now-timedelta(minutes=33), expires_at=now+timedelta(hours=4)),
                EmergencyRequest(request_code="EMR-2026-0396", hospital="Yashoda Hospitals, Somajiguda", blood_group="B+",
                                 units_required=1, urgency="MODERATE", latitude=17.4239, longitude=78.4581,
                                 created_at=now-timedelta(minutes=47), expires_at=now+timedelta(hours=5)),
            ])

        if not db.query(Notification).filter(Notification.donor_id == donor.id).first():
            db.add_all([
                Notification(donor_id=donor.id, title="You are ready to donate", body="Your recovery interval and current health screening are both clear.", kind="ELIGIBILITY"),
                Notification(donor_id=donor.id, title="Compatible emergency nearby", body="A B+ emergency request is active within your selected alert radius.", kind="EMERGENCY"),
                Notification(donor_id=donor.id, title="Screening valid for 5 more days", body="Complete a fresh pre-screen before it expires to keep emergency matching active.", kind="SCREENING"),
            ])
        if not db.query(Activity).filter(Activity.donor_id == donor.id).first():
            db.add_all([
                Activity(donor_id=donor.id, action="Eligibility verified", detail="Recovery interval and health screening passed"),
                Activity(donor_id=donor.id, action="Health screening submitted", detail="CLEAR · Score 98"),
                Activity(donor_id=donor.id, action="Donation verified", detail="DON-2026-00831"),
            ])
        # Seed independent hospital portal accounts and initial stock, idempotently.
        hospital_specs = [
            ("Apollo Hospitals, Jubilee Hills", "apollo@lifeflow.com", "apollo123", "Jubilee Hills", 17.4142, 78.4080),
            ("CARE Hospitals, HITEC City", "care@lifeflow.com", "care123", "HITEC City", 17.4504, 78.3809),
            ("AIG Hospitals, Gachibowli", "aig@lifeflow.com", "aig123", "Gachibowli", 17.4428, 78.3489),
        ]
        for hname, hemail, hpassword, haddress, hlat, hlon in hospital_specs:
            h = db.query(HospitalAccount).filter(HospitalAccount.email == hemail).first()
            if not h:
                h = HospitalAccount(name=hname, email=hemail, password_hash=hash_password(hpassword), city="Hyderabad", address=haddress, latitude=hlat, longitude=hlon, phone="040-0000-0000")
                db.add(h); db.flush()
            initial_stock = [("O-",2),("O+",8),("A-",1),("A+",5),("B-",1),("B+",4),("AB-",0),("AB+",2)]
            for group, units in initial_stock:
                item = db.query(BloodInventory).filter(BloodInventory.hospital_id == h.id, BloodInventory.blood_group == group).first()
                if not item:
                    db.add(BloodInventory(hospital_id=h.id, blood_group=group, units_available=units))
        db.commit()
    finally:
        db.close()

seed()
