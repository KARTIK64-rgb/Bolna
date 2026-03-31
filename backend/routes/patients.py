from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db, dict_from_row
from models import PatientCreate, PatientUpdate

router = APIRouter()


@router.get("/patients")
def list_patients(search: Optional[str] = Query(None)):
    """List all patients, optionally filtered by name or phone."""
    db = get_db()
    try:
        if search:
            patients = db.execute(
                """SELECT p.*,
                    (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id) as appointment_count,
                    (SELECT MAX(date_time) FROM appointments WHERE patient_id = p.id AND status = 'completed') as last_visit
                FROM patients p
                WHERE p.name LIKE ? OR p.phone LIKE ?
                ORDER BY p.created_at DESC""",
                (f"%{search}%", f"%{search}%"),
            ).fetchall()
        else:
            patients = db.execute(
                """SELECT p.*,
                    (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id) as appointment_count,
                    (SELECT MAX(date_time) FROM appointments WHERE patient_id = p.id AND status = 'completed') as last_visit
                FROM patients p
                ORDER BY p.created_at DESC"""
            ).fetchall()

        return [dict_from_row(p) for p in patients]
    finally:
        db.close()


@router.post("/patients")
def create_patient(patient: PatientCreate):
    """Create a new patient."""
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO patients (name, phone, email, language) VALUES (?, ?, ?, ?)",
            (patient.name, patient.phone, patient.email, patient.language),
        )
        db.commit()
        new_patient = db.execute(
            "SELECT * FROM patients WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict_from_row(new_patient)
    finally:
        db.close()


@router.get("/patients/{patient_id}")
def get_patient(patient_id: int):
    """Get a single patient with their appointment history."""
    db = get_db()
    try:
        patient = db.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()

        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        patient_dict = dict_from_row(patient)

        appointments = db.execute(
            """SELECT * FROM appointments
            WHERE patient_id = ?
            ORDER BY date_time DESC""",
            (patient_id,),
        ).fetchall()

        patient_dict["appointments"] = [dict_from_row(a) for a in appointments]
        return patient_dict
    finally:
        db.close()


@router.put("/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientUpdate):
    """Update a patient's details."""
    db = get_db()
    try:
        existing = db.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Patient not found")

        updates = patient.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [patient_id]

        db.execute(f"UPDATE patients SET {set_clause} WHERE id = ?", values)
        db.commit()

        updated = db.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()
        return dict_from_row(updated)
    finally:
        db.close()


@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: int):
    """Delete a patient."""
    db = get_db()
    try:
        existing = db.execute(
            "SELECT * FROM patients WHERE id = ?", (patient_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Patient not found")

        db.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        db.commit()
        return {"message": "Patient deleted successfully"}
    finally:
        db.close()
