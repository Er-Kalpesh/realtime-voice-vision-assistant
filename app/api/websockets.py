from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from app.services.gemini_service import GeminiLiveService

router = APIRouter()
logger = logging.getLogger(__name__)
gemini_service = GeminiLiveService()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("New WebSocket connection accepted.")
    
    try:
        await gemini_service.handle_connection(websocket)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally.")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket connection: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
