import logging
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from app.api.websockets import router as websocket_router

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="Gemini Voice & Vision Assistant",
    description="Realtime Bidirectional Voice and Vision Assistant using Gemini Live API",
    version="1.0.0"
)

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Include Routers
app.include_router(websocket_router)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main frontend application."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
