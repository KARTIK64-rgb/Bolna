from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_db, dict_from_row
from models import AppointmentCreate, AppointmentUpdate

router = APIRouter()


@router.get("/appointments")
def list_appointments(
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    upcoming: Optional[bool] = Query(None),
):
    """List appointments with optional filters. Joins patient name."""
    db = get_db()
    try:
        query = """
            SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND a.status = ?"
            params.append(status)

        if date:
            query += " AND DATE(a.date_time) = ?"
            params.append(date)

        if upcoming:
            query += " AND a.date_time >= datetime('now', 'localtime')"

        query += " ORDER BY a.date_time ASC"

        appointments = db.execute(query, params).fetchall()
        return [dict_from_row(a) for a in appointments]
    finally:
        db.close()


@router.post("/appointments")
def create_appointment(appointment: AppointmentCreate):
    """Create a new appointment."""
    db = get_db()
    try:
        # Verify patient exists
        patient = db.execute(
            "SELECT id FROM patients WHERE id = ?", (appointment.patient_id,)
        ).fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        cursor = db.execute(
            """INSERT INTO appointments (patient_id, doctor_name, date_time, notes)
            VALUES (?, ?, ?, ?)""",
            (
                appointment.patient_id,
                appointment.doctor_name,
                appointment.date_time,
                appointment.notes,
            ),
        )
        db.commit()

        new_apt = db.execute(
            """SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
        return dict_from_row(new_apt)
    finally:
        db.close()


@router.patch("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, appointment: AppointmentUpdate):
    """Update appointment status or details."""
    db = get_db()
    try:
        existing = db.execute(
            "SELECT * FROM appointments WHERE id = ?", (appointment_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Appointment not found")

        updates = appointment.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [appointment_id]

        db.execute(f"UPDATE appointments SET {set_clause} WHERE id = ?", values)
        db.commit()

        updated = db.execute(
            """SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = ?""",
            (appointment_id,),
        ).fetchone()
        return dict_from_row(updated)
    finally:
        db.close()


@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int):
    """Delete an appointment."""
    db = get_db()
    try:
        existing = db.execute(
            "SELECT * FROM appointments WHERE id = ?", (appointment_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Appointment not found")

        db.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
        db.commit()
        return {"message": "Appointment deleted successfully"}
    finally:
        db.close()


@router.get("/call-logs")
def list_call_logs():
    """List all call logs with patient and appointment details."""
    db = get_db()
    try:
        logs = db.execute(
            """SELECT cl.*, a.doctor_name, p.name as patient_name
            FROM call_logs cl
            LEFT JOIN appointments a ON cl.appointment_id = a.id
            LEFT JOIN patients p ON a.patient_id = p.id
            ORDER BY cl.created_at DESC"""
        ).fetchall()
        return [dict_from_row(l) for l in logs]
    finally:
        db.close()
