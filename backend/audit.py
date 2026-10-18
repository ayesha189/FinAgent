import json
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditLog

GENESIS = "0" * 64


def _hash(prev, user_id, entity_type, entity_id, action, details, ts):
    body = json.dumps([user_id, entity_type, entity_id, action, details, ts], sort_keys=True)
    return hashlib.sha256((prev + body).encode()).hexdigest()


def log(db: Session, user_id, action, entity_type, entity_id=None, details=""):
    """Append one row to the hash-chained audit log (never edited or deleted)."""
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev = last.current_hash if last else GENESIS
    ts = datetime.utcnow().isoformat()
    entity_id = None if entity_id is None else str(entity_id)
    h = _hash(prev, user_id, entity_type, entity_id, action, details, ts)
    db.add(AuditLog(user_id=user_id, entity_type=entity_type, entity_id=entity_id,
                    action=action, details=details, timestamp=ts,
                    previous_hash=prev, current_hash=h))
    db.commit()


def verify(db: Session):
    prev = GENESIS
    for row in db.query(AuditLog).order_by(AuditLog.id).all():
        expected = _hash(prev, row.user_id, row.entity_type, row.entity_id,
                         row.action, row.details, row.timestamp)
        if row.previous_hash != prev or row.current_hash != expected:
            return {"valid": False, "first_broken_entry": row.id}
        prev = row.current_hash
    return {"valid": True, "first_broken_entry": None}