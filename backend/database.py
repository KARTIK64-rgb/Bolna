import sqlite3
import os
from datetime import datetime, timedelta
import random
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "medcall.db")


def get_db():
    """Get a database connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def dict_from_row(row):
    """Convert sqlite3.Row to dict."""
    if row is None:
        return None
    return dict(row)


def init_db():
    """Initialize database schema and seed data."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            language TEXT DEFAULT 'en',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_name TEXT NOT NULL,
            date_time DATETIME NOT NULL,
            status TEXT DEFAULT 'scheduled',
            call_status TEXT DEFAULT 'pending',
            bolna_execution_id TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER,
            agent_type TEXT NOT NULL,
            bolna_execution_id TEXT,
            status TEXT DEFAULT 'initiated',
            duration INTEGER,
            transcript TEXT,
            summary TEXT,
            extracted_data TEXT,
            recording_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER,
            patient_id INTEGER,
            rating INTEGER,
            comments TEXT,
            improvement_area TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id),
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
    """)

    count = cursor.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    if count == 0:
        seed_data(cursor)

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")


def seed_data(cursor):
    """Insert realistic seed data for demo purposes."""
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ─── Seed Patients ────────────────────────────────────────
    patients = [
        ("Rahul Sharma", "+919876543210", "rahul.sharma@email.com", "en"),
        ("Priya Patel", "+919876543211", "priya.patel@email.com", "hi"),
        ("Amit Kumar", "+919876543212", "amit.kumar@email.com", "en"),
        ("Sneha Reddy", "+919876543213", "sneha.reddy@email.com", "en"),
        ("Vikram Singh", "+919876543214", "vikram.singh@email.com", "hi"),
        ("Ananya Gupta", "+919876543215", "ananya.gupta@email.com", "en"),
        ("Rajesh Nair", "+919876543216", "rajesh.nair@email.com", "en"),
        ("Meera Joshi", "+919876543217", "meera.joshi@email.com", "hi"),
        ("Arjun Malhotra", "+919876543218", "arjun.malhotra@email.com", "en"),
        ("Kavitha Iyer", "+919876543219", "kavitha.iyer@email.com", "en"),
    ]

    cursor.executemany(
        "INSERT INTO patients (name, phone, email, language) VALUES (?, ?, ?, ?)",
        patients,
    )

    # ─── Seed Appointments ────────────────────────────────────
    doctors = ["Dr. Sharma", "Dr. Patel", "Dr. Gupta", "Dr. Reddy"]

    appointments = [
        # Past — completed
        (1, doctors[0], (today - timedelta(days=6)).replace(hour=10, minute=0).isoformat(), "completed", "completed"),
        (2, doctors[1], (today - timedelta(days=5)).replace(hour=11, minute=30).isoformat(), "completed", "completed"),
        (3, doctors[2], (today - timedelta(days=4)).replace(hour=9, minute=30).isoformat(), "completed", "completed"),
        (7, doctors[0], (today - timedelta(days=3)).replace(hour=14, minute=0).isoformat(), "completed", "completed"),
        (8, doctors[3], (today - timedelta(days=3)).replace(hour=15, minute=30).isoformat(), "completed", "completed"),
        # Past — no_show
        (4, doctors[0], (today - timedelta(days=5)).replace(hour=14, minute=0).isoformat(), "no_show", "completed"),
        (5, doctors[1], (today - timedelta(days=2)).replace(hour=10, minute=30).isoformat(), "no_show", "completed"),
        # Today — scheduled & confirmed
        (6, doctors[2], today.replace(hour=10, minute=0).isoformat(), "confirmed", "completed"),
        (9, doctors[0], today.replace(hour=11, minute=30).isoformat(), "scheduled", "pending"),
        (10, doctors[3], today.replace(hour=14, minute=0).isoformat(), "scheduled", "pending"),
        (1, doctors[1], today.replace(hour=15, minute=30).isoformat(), "confirmed", "completed"),
        # Upcoming
        (2, doctors[0], (today + timedelta(days=1)).replace(hour=9, minute=0).isoformat(), "scheduled", "pending"),
        (3, doctors[2], (today + timedelta(days=1)).replace(hour=11, minute=0).isoformat(), "scheduled", "pending"),
        (4, doctors[3], (today + timedelta(days=2)).replace(hour=10, minute=30).isoformat(), "scheduled", "pending"),
        (5, doctors[0], (today + timedelta(days=3)).replace(hour=14, minute=0).isoformat(), "scheduled", "pending"),
    ]

    cursor.executemany(
        "INSERT INTO appointments (patient_id, doctor_name, date_time, status, call_status) VALUES (?, ?, ?, ?, ?)",
        appointments,
    )

    # ─── Seed Call Logs ───────────────────────────────────────
    call_logs = [
        # Confirmation calls for completed/confirmed appointments
        (1, "confirm", "exec_001", "completed", 45,
         "Agent: Hello Rahul, this is Priya from HealthFirst Clinic.\nRahul: Hi, yes.\nAgent: You have an appointment with Dr. Sharma tomorrow at 10 AM. Can you confirm?\nRahul: Yes, I'll be there.\nAgent: Great, please bring your reports. Thank you!",
         "Patient Rahul confirmed his appointment with Dr. Sharma. He was cooperative and agreed to bring medical reports.",
         json.dumps({"confirmation_status": "confirmed", "patient_sentiment": "positive"}),
         (today - timedelta(days=7)).isoformat()),
        (2, "confirm", "exec_002", "completed", 38,
         "Agent: Hi Priya, this is calling from HealthFirst Clinic.\nPriya: Haan boliye.\nAgent: Aapka appointment hai Dr. Patel ke saath. Confirm karein?\nPriya: Haan, aa jaungi.\nAgent: Dhanyavaad!",
         "Patient Priya confirmed appointment in Hindi. Positive interaction.",
         json.dumps({"confirmation_status": "confirmed", "patient_sentiment": "positive"}),
         (today - timedelta(days=6)).isoformat()),
        (6, "confirm", "exec_003", "completed", 52,
         "Agent: Hello Ananya, this is Priya from HealthFirst Clinic.\nAnanya: Yes, hi.\nAgent: Your appointment with Dr. Gupta is scheduled for today at 10 AM.\nAnanya: Yes, confirmed. I'll be there.\nAgent: Wonderful!",
         "Patient Ananya confirmed today's appointment with Dr. Gupta.",
         json.dumps({"confirmation_status": "confirmed", "patient_sentiment": "positive"}),
         (today - timedelta(hours=2)).isoformat()),
        # Follow-up call for no-show
        (4, "followup", "exec_004", "completed", 65,
         "Agent: Hi Sneha, this is Priya from HealthFirst Clinic. We noticed you missed your appointment.\nSneha: Yes, I had an emergency. Can I reschedule?\nAgent: Of course! How about next Tuesday at 2 PM?\nSneha: That works.\nAgent: Done! See you then.",
         "Patient Sneha had an emergency. Rescheduled to next week.",
         json.dumps({"confirmation_status": "rescheduled", "patient_sentiment": "neutral", "reschedule_reason": "emergency"}),
         (today - timedelta(days=4)).isoformat()),
        (5, "followup", "exec_005", "completed", 40,
         "Agent: Hi Vikram, calling from HealthFirst Clinic about your missed appointment.\nVikram: I was out of town. I'll call back to reschedule.\nAgent: No problem. We're here whenever you need us.",
         "Patient Vikram was out of town. Will call back to reschedule.",
         json.dumps({"confirmation_status": "unknown", "patient_sentiment": "neutral"}),
         (today - timedelta(days=1)).isoformat()),
        # Feedback calls
        (1, "feedback", "exec_006", "completed", 55,
         "Agent: Hi Rahul, thank you for visiting HealthFirst Clinic!\nRahul: It was great.\nAgent: On a scale of 1-5, how was your visit?\nRahul: I'd say 5. Dr. Sharma was very thorough.\nAgent: Thank you!",
         "Patient Rahul rated visit 5/5. Praised Dr. Sharma's thoroughness.",
         json.dumps({"feedback_rating": "5", "patient_sentiment": "positive", "feedback_summary": "Excellent experience, praised doctor"}),
         (today - timedelta(days=5)).isoformat()),
    ]

    for log in call_logs:
        cursor.execute(
            """INSERT INTO call_logs
            (appointment_id, agent_type, bolna_execution_id, status, duration, transcript, summary, extracted_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            log,
        )

    # ─── Seed Feedback ────────────────────────────────────────
    feedback_entries = [
        (1, 1, 5, "Dr. Sharma was very thorough and took time to explain everything. The clinic was clean and well-maintained.", "none"),
        (2, 2, 4, "Good experience overall. The wait time was a bit long but the doctor was excellent.", "long wait time"),
        (3, 3, 5, "Very professional staff. Dr. Gupta is amazing. Will definitely come back.", "none"),
        (4, 7, 4, "Nice experience. Parking could be better though.", "parking"),
        (5, 8, 3, "The billing process was confusing. Had to wait 20 minutes for the receipt.", "unclear billing"),
    ]

    cursor.executemany(
        "INSERT INTO feedback (appointment_id, patient_id, rating, comments, improvement_area) VALUES (?, ?, ?, ?, ?)",
        feedback_entries,
    )

    print("🌱 Seed data inserted successfully")
