import asyncio
import base64
import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiLiveService:
    def __init__(self):
        self.model = settings.MODEL_NAME
        self._client = None

    @property
    def client(self):
        if not self._client:
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not set. Please check your .env file.")
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def handle_connection(self, websocket: WebSocket):
        """
        Manages the bidirectional WebSocket connection between the client and Gemini.
        """
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part.from_text(settings.SYSTEM_INSTRUCTION)]
            )
        )
        
        try:
            async with self.client.aio.live.connect(model=self.model, config=config) as session:
                logger.info("Connected to Gemini Live API.")
                
                # Run send and receive loops concurrently
                await asyncio.gather(
                    self._receive_from_browser(websocket, session),
                    self._receive_from_gemini(websocket, session)
                )
        except Exception as e:
            logger.error(f"Error in Gemini connection: {e}")
            try:
                await websocket.send_json({"type": "error", "message": "Failed to connect to Gemini API."})
            except:
                pass

    async def _receive_from_browser(self, websocket: WebSocket, session):
        try:
            while True:
                data = await websocket.receive_text()
                payload = json.loads(data)
                
                if "realtimeInput" in payload:
                    msg = payload["realtimeInput"]
                    
                    if "audio" in msg:
                        audio_bytes = base64.b64decode(msg["audio"]["data"])
                        await session.send_realtime_input(
                            audio=types.Blob(data=audio_bytes, mime_type=msg["audio"]["mimeType"])
                        )
                        
                    if "video" in msg:
                        video_bytes = base64.b64decode(msg["video"]["data"])
                        await session.send_realtime_input(
                            video=types.Blob(data=video_bytes, mime_type=msg["video"]["mimeType"])
                        )
                        
                    if "text" in msg:
                        await session.send_realtime_input(text=msg["text"])
                        
        except WebSocketDisconnect:
            logger.info("Browser disconnected.")
        except Exception as e:
            logger.error(f"Error receiving from browser: {e}")

    async def _receive_from_gemini(self, websocket: WebSocket, session):
        try:
            async for response in session.receive():
                server_content = response.server_content
                if server_content is not None:
                    model_turn = server_content.model_turn
                    if model_turn:
                        for part in model_turn.parts:
                            if part.inline_data:
                                b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": b64_audio
                                })
                                
                    if server_content.interrupted:
                        await websocket.send_json({
                            "type": "interrupted"
                        })
        except Exception as e:
            logger.error(f"Error receiving from Gemini: {e}")
