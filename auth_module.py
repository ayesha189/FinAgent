# auth_module.py
# pip install fastapi uvicorn sqlalchemy psycopg2-binary "passlib[bcrypt]" python-jose email-validator pydantic
# Run: uvicorn auth_module:app --reload
import os
import hashlib
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Literal, Optional
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import DateTime, ForeignKey, String, Text, create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

# ---------------------------------------------------------------- config
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Set DATABASE_URL to your PostgreSQL connection URL before starting the API.")
try:
    database_backend = make_url(DATABASE_URL).get_backend_name()
except Exception as error:
    raise RuntimeError("DATABASE_URL must be a valid PostgreSQL connection URL.") from error
if database_backend != "postgresql":
    raise RuntimeError("FinAgent requires PostgreSQL; SQLite and other database backends are not supported.")
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE-ME-in-env-file")         # long random string, never commit it
JWT_MINUTES = 60
PASSWORD_RESET_MINUTES = 20
PASSWORD_RESET_RESPONSE = "If that account exists, a reset link has been sent"
logger = logging.getLogger(__name__)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")             # FR-UM-01 bcrypt
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
bearer = HTTPBearer()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(30))        # finance_officer | auditor | administrator
    status: Mapped[str] = mapped_column(String(20))      # pending | active | rejected | blocked
    must_change_password: Mapped[bool] = mapped_column(default=False)
    is_primary: Mapped[bool] = mapped_column(default=False)   # the one main administrator
    token_version: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Complaint(Base):
    __tablename__ = "complaints"
    complaint_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200))
    recipient: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordReset(Base):
    __tablename__ = "password_resets"
    reset_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SecurityAuditEvent(Base):
    __tablename__ = "security_audit_events"
    event_id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    entity: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


Base.metadata.create_all(engine)
with engine.begin() as connection:
    connection.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"
    ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def write_audit(db: Session, actor_id: Optional[int], action: str, entity: str):
    """Hook: call your hash-chained audit-log writer here (FR-AT-02)."""
    pass


# ---------------------------------------------------------------- schemas
class PublicRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")            # client cannot send status, is_admin, etc.
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Administrator requests are allowed but stay "pending" until the PRIMARY admin approves them.
    role: Literal["finance_officer", "auditor", "administrator"]


class PublicComplaint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    recipient: Literal["admin", "ayesha", "both"]
    message: str = Field(min_length=5, max_length=5000)


class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class PasswordResetCompletion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=32, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminCreateUser(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: Literal["finance_officer", "auditor", "administrator"]
    temp_password: str = Field(min_length=8, max_length=128)


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approve", "reject"]
    role: Optional[Literal["finance_officer", "auditor"]] = None   # may correct a role, never promote to admin


# ---------------------------------------------------------------- auth helpers
def make_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_MINUTES)
    return jwt.encode({
        "sub": str(user.user_id),
        "role": user.role,
        "ver": user.token_version,
        "exp": exp,
    }, JWT_SECRET, algorithm="HS256")


def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=["HS256"])
        uid = int(payload["sub"])
        token_version = int(payload.get("ver", 0))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, uid)
    # Re-check the DB every request: a blocked or demoted user loses access immediately.
    if not user or user.status != "active" or user.token_version != token_version:
        raise HTTPException(401, "Account not active")
    return user


def require_role(*roles: str):
    def checker(user: User = Depends(current_user)) -> User:
        if user.role not in roles:                       # role comes from DB, never from the request body
            raise HTTPException(403, "You do not have permission for this action")
        return user
    return checker


# ---------------------------------------------------------------- public routes
auth = APIRouter(prefix="/auth", tags=["auth"])


def send_password_reset_email(recipient: str, token: str):
    smtp_host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM_EMAIL")
    if not smtp_host or not sender:
        raise RuntimeError("SMTP_HOST and SMTP_FROM_EMAIL must be configured")

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    public_url = (os.getenv("APP_PUBLIC_URL") or os.getenv("APP_URL") or "http://localhost:3000").rstrip("/")
    reset_url = f"{public_url}/reset-password?token={quote(token, safe='')}"

    message = EmailMessage()
    message["Subject"] = "Reset your FinAgent password"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        "We received a request to reset your FinAgent password.\n\n"
        f"Use this one-time link within {PASSWORD_RESET_MINUTES} minutes:\n{reset_url}\n\n"
        "If you did not request this change, you can ignore this email."
    )

    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            if username:
                server.login(username, password or "")
            server.send_message(message)
        return

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        if os.getenv("SMTP_USE_STARTTLS", "true").lower() in {"1", "true", "yes"}:
            server.starttls()
        if username:
            server.login(username, password or "")
        server.send_message(message)


def issue_password_reset(email: str):
    db = SessionLocal()
    reset_record: Optional[PasswordReset] = None
    try:
        user = db.scalar(select(User).where(User.email == email, User.status == "active"))
        if not user:
            return

        raw_token = secrets.token_urlsafe(32)
        reset_record = PasswordReset(
            user_id=user.user_id,
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_MINUTES),
        )
        db.add(reset_record)
        db.commit()
        send_password_reset_email(user.email, raw_token)
    except Exception:
        db.rollback()
        if reset_record is not None and reset_record.reset_id is not None:
            db.delete(reset_record)
            db.commit()
        logger.warning("Password reset processing failed")
    finally:
        db.close()


@auth.post("/password-reset/request")
def request_password_reset(data: PasswordResetRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(issue_password_reset, data.email.lower())
    return {"message": PASSWORD_RESET_RESPONSE}


@auth.post("/password-reset/complete")
def complete_password_reset(data: PasswordResetCompletion, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(data.token.encode("utf-8")).hexdigest()
    reset_record = db.scalar(
        select(PasswordReset)
        .where(PasswordReset.token_hash == token_hash)
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if not reset_record or reset_record.used_at is not None or reset_record.expires_at <= now:
        raise HTTPException(400, "This password reset link is invalid or expired.")

    user = db.get(User, reset_record.user_id)
    if not user or user.status != "active":
        raise HTTPException(400, "This password reset link is invalid or expired.")

    user.password_hash = pwd.hash(data.password)
    user.must_change_password = False
    user.token_version += 1
    reset_record.used_at = now
    for other_reset in db.scalars(
        select(PasswordReset).where(
            PasswordReset.user_id == user.user_id,
            PasswordReset.used_at.is_(None),
            PasswordReset.reset_id != reset_record.reset_id,
        )
    ):
        other_reset.used_at = now

    db.add(SecurityAuditEvent(
        actor_user_id=user.user_id,
        action="password_reset_completed",
        entity=f"user:{user.user_id}",
    ))
    db.commit()
    return {"message": "Password reset successful. Sign in with your new password."}


@auth.post("/register", status_code=201)
def register(data: PublicRegister, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "An account with this email already exists")
    user = User(name=data.name, email=data.email.lower(), password_hash=pwd.hash(data.password),
                role=data.role, status="pending")        # server decides status, always
    db.add(user)
    db.commit()
    write_audit(db, user.user_id, "register_request", f"user:{user.user_id}")
    return {"message": "Registration submitted. An administrator must approve it before you can sign in."}


@auth.post("/complaints", status_code=201)
def submit_complaint(data: PublicComplaint, db: Session = Depends(get_db)):
    complaint = Complaint(
        name=data.name.strip(),
        email=data.email.lower(),
        recipient=data.recipient,
        message=data.message.strip(),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    write_audit(db, None, "complaint_submitted", f"complaint:{complaint.complaint_id}")
    return {
        "complaint_id": complaint.complaint_id,
        "name": complaint.name,
        "email": complaint.email,
        "recipient": complaint.recipient,
        "message": complaint.message,
        "created_at": complaint.created_at,
    }


@auth.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not pwd.verify(data.password, user.password_hash):
        raise HTTPException(401, {"code": "invalid"})
    # Only reveal account state after the password is correct.
    if user.status != "active":
        raise HTTPException(403, {"code": user.status})  # pending | rejected | blocked
    write_audit(db, user.user_id, "login", f"user:{user.user_id}")
    return {"access_token": token_for(user), "role": user.role, "name": user.name,
            "is_primary": user.is_primary, "must_change_password": user.must_change_password}


def token_for(user: User) -> str:
    return make_token(user)


# ---------------------------------------------------------------- admin routes
admin = APIRouter(prefix="/admin", tags=["admin"])
only_admin = require_role("administrator")


@admin.get("/complaints")
def list_complaints(db: Session = Depends(get_db), _: User = Depends(only_admin)):
    rows = db.scalars(select(Complaint).order_by(Complaint.created_at.desc(), Complaint.complaint_id.desc())).all()
    return [
        {
            "complaint_id": row.complaint_id,
            "name": row.name,
            "email": row.email,
            "recipient": row.recipient,
            "message": row.message,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@admin.get("/registrations")
def pending_registrations(db: Session = Depends(get_db), _: User = Depends(only_admin)):
    q = select(User).where(User.status == "pending").order_by(User.created_at)
    if not _.is_primary:                                  # only the primary admin sees administrator requests
        q = q.where(User.role != "administrator")
    rows = db.scalars(q).all()
    return [{"user_id": u.user_id, "name": u.name, "email": u.email, "role": u.role,
             "created_at": u.created_at} for u in rows]


@admin.patch("/registrations/{user_id}")
def decide(user_id: int, body: Decision, db: Session = Depends(get_db), me: User = Depends(only_admin)):
    user = db.get(User, user_id)
    if not user or user.status != "pending":
        raise HTTPException(404, "No pending registration with this id")
    if user.role == "administrator" and not me.is_primary:
        raise HTTPException(403, "Only the primary administrator can decide administrator requests")
    if body.decision == "approve":
        user.status = "active"
        if body.role:
            user.role = body.role
    else:
        user.status = "rejected"
    db.commit()
    write_audit(db, me.user_id, f"registration_{body.decision}", f"user:{user.user_id}")
    return {"user_id": user.user_id, "status": user.status, "role": user.role}


@admin.post("/users", status_code=201)
def create_user(data: AdminCreateUser, db: Session = Depends(get_db), me: User = Depends(only_admin)):
    """The ONLY way to create another administrator."""
    if data.role == "administrator" and not me.is_primary:
        raise HTTPException(403, "Only the primary administrator can create administrators")
    if db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "An account with this email already exists")
    user = User(name=data.name, email=data.email.lower(), password_hash=pwd.hash(data.temp_password),
                role=data.role, status="active", must_change_password=True)
    db.add(user)
    db.commit()
    write_audit(db, me.user_id, f"create_user_{data.role}", f"user:{user.user_id}")
    return {"user_id": user.user_id, "role": user.role}


@admin.patch("/users/{user_id}/status")
def set_status(user_id: int, status: Literal["active", "blocked"],
               db: Session = Depends(get_db), me: User = Depends(only_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.is_primary:
        raise HTTPException(403, "The primary administrator cannot be blocked")
    if user.role == "administrator" and not me.is_primary:
        raise HTTPException(403, "Only the primary administrator can change another administrator")
    if status == "blocked" and user.role == "administrator":
        active_admins = db.scalar(select(func.count()).select_from(User)
                                  .where(User.role == "administrator", User.status == "active"))
        if active_admins <= 1:
            raise HTTPException(409, "Cannot block the last active administrator")
    user.status = status
    db.commit()
    write_audit(db, me.user_id, f"user_{status}", f"user:{user.user_id}")
    return {"user_id": user.user_id, "status": user.status}


# ---------------------------------------------------------------- app
app = FastAPI(title="FinAgent API")
app.add_middleware(CORSMiddleware, allow_origins=[
                       "http://localhost:5173", "http://localhost:3000", "http://localhost:3001",
                       "http://127.0.0.1:3000", "http://127.0.0.1:3001",
                   ],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth)
app.include_router(admin)


# ---------------------------------------------------------------- primary admin (run once)
# Credentials come from environment variables so they are not hardcoded in git.
#   PRIMARY_ADMIN_EMAIL, PRIMARY_ADMIN_PASSWORD, PRIMARY_ADMIN_NAME
# Run:  python auth_module.py
if __name__ == "__main__":
    email = os.getenv("PRIMARY_ADMIN_EMAIL", "finagent@finagent.local").lower()
    password = os.getenv("PRIMARY_ADMIN_PASSWORD", "12341234")      # dev default only: change before real use
    name = os.getenv("PRIMARY_ADMIN_NAME", "finagent")
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.is_primary == True)):   # noqa: E712
            raise SystemExit("Primary administrator already exists.")
        db.add(User(name=name, email=email, password_hash=pwd.hash(password),
                    role="administrator", status="active", is_primary=True))
        db.commit()
        print(f"Primary administrator created. Sign in with: {email}")
