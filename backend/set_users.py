"""Run ONCE:  python set_users.py
Changes the 3 demo accounts to real emails and one strong password.
Uses the DATABASE_URL from your .env (works for local DB and, later, the online DB)."""
import getpass
from database import SessionLocal
from models import User
from security import hash_password, FO, ADMIN, AUDITOR

# (old demo email, new email, name, role)  -> edit here if you want a different split
PLAN = [
    ("admin@finagent.local",   "ayesharauf189@gmail.com", "Ayesha Rauf", ADMIN),
    ("officer@finagent.local", "aqsaishaq573@gmail.com",  "Aqsa Ishaq",  FO),
    ("auditor@finagent.local", "auditor@finagent.local",  "Auditor",     AUDITOR),
]

pw = getpass.getpass("New password (same for all, min 12 chars): ")
if len(pw) < 12:
    raise SystemExit("Too short. Use at least 12 characters.")
if pw != getpass.getpass("Repeat password: "):
    raise SystemExit("Passwords do not match.")

with SessionLocal() as db:
    for old, new, name, role in PLAN:
        u = (db.query(User).filter(User.email == old).first()
             or db.query(User).filter(User.email == new).first())
        if u is None:
            u = User(email=new)
            db.add(u)
        u.email, u.name, u.role, u.status = new, name, role, "active"
        u.password_hash = hash_password(pw)
        print(f"OK  {new:28} {role}")
    db.commit()
print("Done. Old demo passwords no longer work.")