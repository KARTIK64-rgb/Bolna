

**AI-Powered Patient Appointment & Follow-Up System for Clinics**

MedCall AI integrates with [Bolna Voice AI](https://bolna.ai) to automate patient confirmation calls, no-show follow-ups, and post-visit feedback collection — all from a single dashboard.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (HTML/CSS/JS)                    │
│                   http://localhost:8000                    │
└─────────────────────────┬────────────────────────────────┘
                          │  REST API (fetch)
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Python)                 │
│                   http://localhost:8000/api                │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Routes   │  │ Bolna Service│  │  SQLite Database   │  │
│  │  /api/*   │──│ (httpx)      │  │  (medcall.db)      │  │
│  └──────────┘  └──────┬───────┘  └────────────────────┘  │
└─────────────────────────┼────────────────────────────────┘
                          │  HTTPS
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Bolna Voice AI Platform                  │
│  ┌────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ ConfirmBot │ │ FollowUpBot  │ │   FeedbackBot      │  │
│  └────────────┘ └──────────────┘ └────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🤖 Voice AI Agents

| Agent | Purpose | Trigger |
|-------|---------|---------|
| **ConfirmBot** | Calls patient to confirm/reschedule appointment | 24 hrs before appointment |
| **FollowUpBot** | Calls no-show patients to reschedule | After missed appointment |
| **FeedbackBot** | Calls patient to collect rating & feedback | After completed visit |

## 🛠️ Tech Stack

- **Backend:** Python 3.10+ / FastAPI / SQLite
- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Voice AI:** Bolna Platform (with Twilio telephony)
- **Charts:** Chart.js
- **Icons:** Lucide Icons

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Bolna account with API key
- Twilio account (connected to Bolna)

### Setup

```bash
# Clone the repository
cd medcall-ai

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Bolna API keys and agent IDs

# Run the server
python main.py
```

The app is available at **http://localhost:8000**

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 8000) |
| `BOLNA_API_KEY` | Your Bolna API key |
| `CONFIRMBOT_AGENT_ID` | Bolna ConfirmBot agent ID |
| `FOLLOWUPBOT_AGENT_ID` | Bolna FollowUpBot agent ID |
| `FEEDBACKBOT_AGENT_ID` | Bolna FeedbackBot agent ID |
| `CLINIC_NAME` | Your clinic name |
| `BACKEND_API_KEY` | API key for webhook auth |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/patients` | List patients |
| POST | `/api/patients` | Create patient |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| POST | `/api/trigger-call` | Trigger Bolna call |
| GET | `/api/available-slots` | Check doctor availability |
| POST | `/api/reschedule` | Reschedule appointment |
| POST | `/api/webhook/bolna` | Bolna webhook receiver |
| POST | `/api/webhook/feedback` | Feedback webhook |
| GET | `/api/analytics` | Dashboard analytics |
| GET | `/api/call-logs` | Call history |

## 📋 End-to-End Flow

1. **Receptionist** opens MedCall AI dashboard
2. Sees today's appointments with patient details
3. Clicks "📞 Confirm Call" button on an appointment
4. App triggers Bolna API → ConfirmBot calls the patient
5. Patient confirms, reschedules, or cancels via voice
6. Bolna sends webhook → backend updates appointment status
7. Dashboard auto-reflects the new status

## 📄 License

MIT

