from fastapi import APIRouter, Request
from database import get_db, dict_from_row
from models import FeedbackWebhookRequest
import json

router = APIRouter()


@router.post("/webhook/bolna")
async def bolna_webhook(request: Request):
    """
    Receive execution data from Bolna after calls complete.
    Handles various event types gracefully.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    print(f"📞 Bolna Webhook received: {json.dumps(payload, indent=2)[:500]}")

    # Try to extract execution ID from various payload formats
    execution_id = (
        payload.get("execution_id")
        or payload.get("id")
        or payload.get("data", {}).get("execution_id")
    )

    if not execution_id:
        print("⚠️ No execution_id in webhook payload")
        return {"status": "received", "message": "No execution_id found"}

    db = get_db()
    try:
        # Find matching call_log
        call_log = db.execute(
            "SELECT * FROM call_logs WHERE bolna_execution_id = ?",
            (execution_id,),
        ).fetchone()

        if not call_log:
            print(f"⚠️ No call_log found for execution_id: {execution_id}")
            return {"status": "received", "message": "No matching call log"}

        call_log_dict = dict_from_row(call_log)

        # Extract data from payload
        status = payload.get("status", "completed")
        duration = payload.get("duration") or payload.get("call_duration")
        transcript = payload.get("transcript", "")
        summary = payload.get("summary", "")
        extracted_data = payload.get("extracted_data") or payload.get("extraction", {})
        recording_url = payload.get("recording_url", "")

        # Convert extracted_data to JSON string if it's a dict
        if isinstance(extracted_data, dict):
            extracted_data_str = json.dumps(extracted_data)
        else:
            extracted_data_str = str(extracted_data) if extracted_data else ""

        # Update call_log
        db.execute(
            """UPDATE call_logs SET
                status = ?,
                duration = ?,
                transcript = ?,
                summary = ?,
                extracted_data = ?,
                recording_url = ?
            WHERE bolna_execution_id = ?""",
            (
                status,
                duration,
                transcript,
                summary,
                extracted_data_str,
                recording_url,
                execution_id,
            ),
        )

        # Update appointment status based on extracted data
        if call_log_dict["appointment_id"] and extracted_data:
            confirmation_status = None
            if isinstance(extracted_data, dict):
                confirmation_status = extracted_data.get("confirmation_status")
            elif isinstance(extracted_data, str):
                try:
                    parsed = json.loads(extracted_data)
                    confirmation_status = parsed.get("confirmation_status")
                except (json.JSONDecodeError, AttributeError):
                    pass

            if confirmation_status:
                status_map = {
                    "confirmed": "confirmed",
                    "cancelled": "cancelled",
                    "rescheduled": "rescheduled",
                }
                new_status = status_map.get(confirmation_status)
                if new_status:
                    db.execute(
                        "UPDATE appointments SET status = ?, call_status = 'completed' WHERE id = ?",
                        (new_status, call_log_dict["appointment_id"]),
                    )
            else:
                db.execute(
                    "UPDATE appointments SET call_status = 'completed' WHERE id = ?",
                    (call_log_dict["appointment_id"],),
                )
        elif call_log_dict["appointment_id"]:
            db.execute(
                "UPDATE appointments SET call_status = 'completed' WHERE id = ?",
                (call_log_dict["appointment_id"],),
            )

        db.commit()

        return {"status": "processed", "execution_id": execution_id}
    except Exception as e:
        print(f"❌ Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@router.post("/webhook/feedback")
async def feedback_webhook(request: Request):
    """
    Receive feedback from FeedbackBot's custom function.
    Inserts into feedback table.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    print(f"⭐ Feedback Webhook received: {json.dumps(payload, indent=2)}")

    appointment_id_raw = payload.get("appointment_id", "")
    rating_raw = payload.get("rating", "0")
    comments = payload.get("comments", "")

    # Parse appointment ID (handle "APT-5" format)
    apt_id_str = str(appointment_id_raw).replace("APT-", "")
    try:
        apt_id = int(apt_id_str)
    except ValueError:
        return {"status": "error", "message": f"Invalid appointment_id: {appointment_id_raw}"}

    try:
        rating = int(rating_raw)
    except ValueError:
        rating = 0

    db = get_db()
    try:
        # Get patient_id from appointment
        apt = db.execute(
            "SELECT patient_id FROM appointments WHERE id = ?", (apt_id,)
        ).fetchone()

        patient_id = apt["patient_id"] if apt else None

        # Determine improvement area
        improvement_area = "none"
        comments_lower = comments.lower()
        if any(w in comments_lower for w in ["wait", "waiting", "slow"]):
            improvement_area = "long wait time"
        elif any(w in comments_lower for w in ["bill", "payment", "receipt", "charge"]):
            improvement_area = "unclear billing"
        elif any(w in comments_lower for w in ["rude", "unfriendly", "staff"]):
            improvement_area = "staff behavior"
        elif any(w in comments_lower for w in ["park", "parking"]):
            improvement_area = "parking"
        elif any(w in comments_lower for w in ["clean", "hygiene", "dirty"]):
            improvement_area = "cleanliness"

        db.execute(
            """INSERT INTO feedback (appointment_id, patient_id, rating, comments, improvement_area)
            VALUES (?, ?, ?, ?, ?)""",
            (apt_id, patient_id, rating, comments, improvement_area),
        )
        db.commit()

        return {
            "status": "success",
            "message": "Feedback saved successfully",
            "appointment_id": appointment_id_raw,
            "rating": rating,
        }
    finally:
        db.close()
