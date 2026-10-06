import os
import asyncio
import json
import base64
import traceback
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set in the environment.")
client = genai.Client(api_key=GEMINI_API_KEY)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part.from_text("You are a helpful and concise voice and vision assistant. Keep your responses relatively short as this is a real-time conversation.")]
            )
        )
        
        async with client.aio.live.connect(model="gemini-3.8-live", config=config) as session:
            print("Connected to Gemini Live API.")
            
            # Task to receive messages from the browser and send to Gemini
            async def receive_from_browser():
                try:
                    while True:
                        data = await websocket.receive_text()
                        payload = json.loads(data)
                        
                        if "realtimeInput" in payload:
                            msg = payload["realtimeInput"]
                            
                            # Handle audio
                            if "audio" in msg:
                                audio_bytes = base64.b64decode(msg["audio"]["data"])
                                await session.send_realtime_input(
                                    audio=types.Blob(data=audio_bytes, mime_type=msg["audio"]["mimeType"])
                                )
                                
                            # Handle video
                            if "video" in msg:
                                video_bytes = base64.b64decode(msg["video"]["data"])
                                await session.send_realtime_input(
                                    video=types.Blob(data=video_bytes, mime_type=msg["video"]["mimeType"])
                                )
                                
                            # Handle text
                            if "text" in msg:
                                await session.send_realtime_input(text=msg["text"])
                
                except WebSocketDisconnect:
                    print("Browser disconnected.")
                except Exception as e:
                    print(f"Error receiving from browser: {e}")
                    traceback.print_exc()

            # Task to receive messages from Gemini and send to the browser
            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        server_content = response.server_content
                        if server_content is not None:
                            # Send audio back to the browser
                            model_turn = server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.inline_data:
                                        # send base64 to frontend
                                        b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        await websocket.send_json({
                                            "type": "audio",
                                            "data": b64_audio
                                        })
                                        
                            # Handle interruptions (stop playback)
                            if server_content.interrupted:
                                await websocket.send_json({
                                    "type": "interrupted"
                                })
                                
                except Exception as e:
                    print(f"Error receiving from Gemini: {e}")
                    traceback.print_exc()

            # Run both tasks concurrently
            await asyncio.gather(
                receive_from_browser(),
                receive_from_gemini()
            )

    except Exception as e:
        print(f"Connection error: {e}")
        traceback.print_exc()
        try:
            await websocket.close()
        except:
            pass
