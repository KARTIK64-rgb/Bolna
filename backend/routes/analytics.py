from fastapi import APIRouter
from database import get_db, dict_from_row
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/analytics")
def get_analytics():
    """Return comprehensive dashboard metrics."""
    db = get_db()
    try:
        today = datetime.now().strftime("%Y-%m-%d")

        # ─── Appointment Counts ───────────────────────────────
        total = db.execute("SELECT COUNT(*) as c FROM appointments").fetchone()["c"]
        confirmed = db.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE status = 'confirmed'"
        ).fetchone()["c"]
        no_show = db.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE status = 'no_show'"
        ).fetchone()["c"]
        cancelled = db.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE status = 'cancelled'"
        ).fetchone()["c"]
        completed = db.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'"
        ).fetchone()["c"]
        scheduled = db.execute(
            "SELECT COUNT(*) as c FROM appointments WHERE status = 'scheduled'"
        ).fetchone()["c"]

        confirmation_rate = round((confirmed + completed) / total * 100, 1) if total > 0 else 0
        no_show_rate = round(no_show / total * 100, 1) if total > 0 else 0

        # ─── Feedback Metrics ─────────────────────────────────
        avg_rating_row = db.execute(
            "SELECT AVG(rating) as avg_rating FROM feedback WHERE rating > 0"
        ).fetchone()
        average_rating = round(avg_rating_row["avg_rating"], 1) if avg_rating_row["avg_rating"] else 0

        # ─── Call Metrics ─────────────────────────────────────
        total_calls = db.execute("SELECT COUNT(*) as c FROM call_logs").fetchone()["c"]
        calls_today = db.execute(
            "SELECT COUNT(*) as c FROM call_logs WHERE DATE(created_at) = ?",
            (today,),
        ).fetchone()["c"]

        # ─── Feedback Distribution ────────────────────────────
        feedback_dist = []
        for rating in range(1, 6):
            count = db.execute(
                "SELECT COUNT(*) as c FROM feedback WHERE rating = ?", (rating,)
            ).fetchone()["c"]
            feedback_dist.append({"rating": rating, "count": count})

        # ─── Weekly Trend (past 7 days) ───────────────────────
        weekly_trend = []
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i in range(6, -1, -1):
            day = datetime.now() - timedelta(days=i)
            day_str = day.strftime("%Y-%m-%d")
            day_label = day_names[day.weekday()]

            conf = db.execute(
                "SELECT COUNT(*) as c FROM appointments WHERE DATE(date_time) = ? AND status IN ('confirmed', 'completed')",
                (day_str,),
            ).fetchone()["c"]
            ns = db.execute(
                "SELECT COUNT(*) as c FROM appointments WHERE DATE(date_time) = ? AND status = 'no_show'",
                (day_str,),
            ).fetchone()["c"]
            canc = db.execute(
                "SELECT COUNT(*) as c FROM appointments WHERE DATE(date_time) = ? AND status = 'cancelled'",
                (day_str,),
            ).fetchone()["c"]

            weekly_trend.append({
                "date": day_label,
                "full_date": day_str,
                "confirmed": conf,
                "no_show": ns,
                "cancelled": canc,
            })

        # ─── Recent Feedback ──────────────────────────────────
        recent_fb = db.execute(
            """SELECT f.*, p.name as patient_name
            FROM feedback f
            LEFT JOIN patients p ON f.patient_id = p.id
            ORDER BY f.created_at DESC
            LIMIT 5"""
        ).fetchall()

        recent_feedback = [
            {
                "patient_name": fb["patient_name"] or "Unknown",
                "rating": fb["rating"],
                "comments": fb["comments"] or "",
                "date": fb["created_at"],
                "improvement_area": fb["improvement_area"] or "none",
            }
            for fb in recent_fb
        ]

        # ─── Today's Appointments ─────────────────────────────
        today_appointments = db.execute(
            """SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE DATE(a.date_time) = ?
            ORDER BY a.date_time ASC""",
            (today,),
        ).fetchall()

        return {
            "total_appointments": total,
            "confirmed_count": confirmed,
            "no_show_count": no_show,
            "cancelled_count": cancelled,
            "completed_count": completed,
            "scheduled_count": scheduled,
            "confirmation_rate": confirmation_rate,
            "no_show_rate": no_show_rate,
            "average_rating": average_rating,
            "total_calls_made": total_calls,
            "calls_today": calls_today,
            "feedback_distribution": feedback_dist,
            "weekly_trend": weekly_trend,
            "recent_feedback": recent_feedback,
            "today_appointments": [dict_from_row(a) for a in today_appointments],
        }
    finally:
        db.close()
