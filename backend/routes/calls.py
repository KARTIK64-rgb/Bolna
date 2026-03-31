from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional
from database import get_db, dict_from_row
from models import TriggerCallRequest, RescheduleRequest
from services.bolna import make_call
from config import settings

router = APIRouter()

# Map agent types to agent IDs
AGENT_MAP = {
    "confirm": lambda: settings.CONFIRMBOT_AGENT_ID,
    "followup": lambda: settings.FOLLOWUPBOT_AGENT_ID,
    "feedback": lambda: settings.FEEDBACKBOT_AGENT_ID,
}


@router.post("/trigger-call")
async def trigger_call(request: TriggerCallRequest):
    """
    Trigger a Bolna voice call for an appointment.
    Selects the right agent based on agent_type.
    """
    db = get_db()
    try:
        # Look up appointment + patient
        row = db.execute(
            """SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.language
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = ?""",
            (request.appointment_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Appointment not found")

        apt = dict_from_row(row)

        # Select agent ID
        agent_id_getter = AGENT_MAP.get(request.agent_type)
        if not agent_id_getter:
            raise HTTPException(status_code=400, detail=f"Invalid agent_type: {request.agent_type}")

        agent_id = agent_id_getter()
        if not agent_id:
            raise HTTPException(
                status_code=500, detail=f"Agent ID not configured for {request.agent_type}"
            )

        # Parse appointment datetime
        apt_dt = datetime.fromisoformat(apt["date_time"])

        # Build user_data for Bolna
        user_data = {
            "patient_name": apt["patient_name"],
            "doctor_name": apt["doctor_name"],
            "appointment_date": apt_dt.strftime("%B %d, %Y"),
            "appointment_time": apt_dt.strftime("%I:%M %p"),
            "appointment_id": f"APT-{apt['id']}",
            "clinic_name": settings.CLINIC_NAME,
        }

        # Call Bolna API
        try:
            result = await make_call(agent_id, apt["patient_phone"], user_data)
            execution_id = result.get("id") or result.get("execution_id", "")
        except Exception as e:
            print(f"❌ Bolna API error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to trigger call: {str(e)}")

        # Update appointment with execution_id
        db.execute(
            "UPDATE appointments SET bolna_execution_id = ?, call_status = 'calling' WHERE id = ?",
            (execution_id, request.appointment_id),
        )

        # Create call_log
        db.execute(
            """INSERT INTO call_logs (appointment_id, agent_type, bolna_execution_id, status)
            VALUES (?, ?, ?, 'initiated')""",
            (request.appointment_id, request.agent_type, execution_id),
        )

        db.commit()

        return {
            "message": "Call triggered successfully",
            "execution_id": execution_id,
            "agent_type": request.agent_type,
            "patient_name": apt["patient_name"],
            "phone": apt["patient_phone"],
        }
    finally:
        db.close()


@router.get("/available-slots")
def get_available_slots(
    doctor_name: Optional[str] = Query(None),
    preferred_date: Optional[str] = Query(None),
):
    """
    Check available appointment slots for a doctor on a given date.
    Called BY Bolna during live calls.
    """
    if not doctor_name or not preferred_date:
        return {"error": "Both doctor_name and preferred_date are required"}

    db = get_db()
    try:
        # Get existing appointments for that doctor + date
        existing = db.execute(
            """SELECT date_time FROM appointments
            WHERE doctor_name LIKE ? AND DATE(date_time) = ?
            AND status NOT IN ('cancelled')""",
            (f"%{doctor_name}%", preferred_date),
        ).fetchall()

        booked_hours = set()
        for apt in existing:
            dt = datetime.fromisoformat(apt["date_time"])
            booked_hours.add(dt.strftime("%H:%M"))

        # Generate all 30-min slots from 9AM to 5PM
        all_slots = []
        for hour in range(9, 17):
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                if slot_time not in booked_hours:
                    # Format nicely
                    dt = datetime.strptime(slot_time, "%H:%M")
                    all_slots.append(dt.strftime("%I:%M %p"))

        # Return up to 5 available slots
        available = all_slots[:5]

        return {
            "available_slots": available,
            "doctor_name": doctor_name,
            "date": preferred_date,
        }
    finally:
        db.close()


@router.post("/reschedule")
def reschedule_appointment(request: RescheduleRequest):
    """
    Reschedule an appointment to a new date/time.
    Called BY Bolna during live calls.
    """
    db = get_db()
    try:
        # Parse appointment ID (handle "APT-5" format)
        apt_id_str = request.appointment_id.replace("APT-", "")
        try:
            apt_id = int(apt_id_str)
        except ValueError:
            return {"error": f"Invalid appointment ID: {request.appointment_id}"}

        existing = db.execute(
            "SELECT * FROM appointments WHERE id = ?", (apt_id,)
        ).fetchone()

        if not existing:
            return {"error": "Appointment not found"}

        # Build new datetime
        new_datetime = f"{request.new_date}T{request.new_time}:00"

        db.execute(
            "UPDATE appointments SET date_time = ?, status = 'rescheduled' WHERE id = ?",
            (new_datetime, apt_id),
        )
        db.commit()

        return {
            "message": "Appointment rescheduled successfully",
            "appointment_id": request.appointment_id,
            "new_date": request.new_date,
            "new_time": request.new_time,
        }
    finally:
        db.close()
