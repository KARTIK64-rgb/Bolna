import os
import sys
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import settings
from database import init_db

# Import route modules
from routes.patients import router as patients_router
from routes.appointments import router as appointments_router
from routes.calls import router as calls_router
from routes.webhooks import router as webhooks_router
from routes.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    print("🚀 Starting MedCall AI Backend...")
    init_db()
    print(f"🏥 Clinic: {settings.CLINIC_NAME}")
    print(f"📡 Bolna API Key configured: {'✅' if settings.BOLNA_API_KEY else '❌'}")
    print(f"🤖 ConfirmBot ID: {settings.CONFIRMBOT_AGENT_ID or 'Not set'}")
    print(f"🤖 FollowUpBot ID: {settings.FOLLOWUPBOT_AGENT_ID or 'Not set'}")
    print(f"🤖 FeedbackBot ID: {settings.FEEDBACKBOT_AGENT_ID or 'Not set'}")
    yield
    print("👋 Shutting down MedCall AI Backend")


app = FastAPI(
    title="MedCall AI",
    description="AI-Powered Patient Appointment & Follow-Up System",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Logging Middleware ───────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {request.method} {request.url.path}")
    response = await call_next(request)
    return response


# ─── API Routes ───────────────────────────────────────────────
app.include_router(patients_router, prefix="/api", tags=["Patients"])
app.include_router(appointments_router, prefix="/api", tags=["Appointments"])
app.include_router(calls_router, prefix="/api", tags=["Calls"])
app.include_router(webhooks_router, prefix="/api", tags=["Webhooks"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])


# ─── Health Check ─────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "clinic": settings.CLINIC_NAME,
    }


# ─── Serve Frontend Static Files ─────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

if os.path.exists(FRONTEND_DIR):
    # Serve static assets (css, js, images)
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    # Catch-all for SPA — serve index.html for non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


# ─── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.environ.get("RENDER") is None,  # reload only in local dev
    )

