from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Patient Models ───────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    language: Optional[str] = "en"


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    language: str
    created_at: str
    appointment_count: Optional[int] = 0
    last_visit: Optional[str] = None


# ─── Appointment Models ──────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_name: str
    date_time: str
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    call_status: Optional[str] = None
    notes: Optional[str] = None
    date_time: Optional[str] = None
    doctor_name: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_name: str
    date_time: str
    status: str
    call_status: str
    bolna_execution_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


# ─── Call Models ─────────────────────────────────────────────

class TriggerCallRequest(BaseModel):
    appointment_id: int
    agent_type: str = Field(..., pattern="^(confirm|followup|feedback)$")


class RescheduleRequest(BaseModel):
    appointment_id: str
    new_date: str
    new_time: str


class AvailableSlotsResponse(BaseModel):
    available_slots: List[str]
    doctor_name: str
    date: str


# ─── Webhook Models ──────────────────────────────────────────

class FeedbackWebhookRequest(BaseModel):
    appointment_id: str
    rating: str
    comments: Optional[str] = ""


# ─── Call Log Models ─────────────────────────────────────────

class CallLogResponse(BaseModel):
    id: int
    appointment_id: Optional[int] = None
    agent_type: str
    bolna_execution_id: Optional[str] = None
    status: str
    duration: Optional[int] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    extracted_data: Optional[str] = None
    recording_url: Optional[str] = None
    created_at: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None


# ─── Analytics Models ────────────────────────────────────────

class FeedbackDistribution(BaseModel):
    rating: int
    count: int


class WeeklyTrend(BaseModel):
    date: str
    confirmed: int
    no_show: int
    cancelled: int


class RecentFeedback(BaseModel):
    patient_name: str
    rating: int
    comments: str
    date: str


class AnalyticsResponse(BaseModel):
    total_appointments: int
    confirmed_count: int
    no_show_count: int
    cancelled_count: int
    completed_count: int
    scheduled_count: int
    confirmation_rate: float
    no_show_rate: float
    average_rating: float
    total_calls_made: int
    calls_today: int
    feedback_distribution: List[FeedbackDistribution]
    weekly_trend: List[WeeklyTrend]
    recent_feedback: List[RecentFeedback]
