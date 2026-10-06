# Realtime Voice & Vision Assistant

A real-time, bidirectional audio and video streaming assistant powered by the Gemini Live API (via the `google-genai` SDK), FastAPI, and WebSockets. Built for low-latency, conversational AI interactions.

## Features
- **Real-time Audio & Video Streaming**: Send camera frames and microphone audio over WebSockets to Gemini.
- **FastAPI Backend**: Manages WebSocket connections and proxies the Live API connection securely.
- **Vanilla JS Frontend**: Simple, lightweight, and easy to extend interface for capturing media and playing audio responses.

## Prerequisites
- Python 3.10+
- A Gemini API Key from Google AI Studio

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Er-Kalpesh/realtime-voice-vision-assistant.git
   cd realtime-voice-vision-assistant
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy the example environment file and add your API key.
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `GEMINI_API_KEY=your_actual_api_key`.

5. **Run the Server**:
   ```bash
   uvicorn main:app --reload
   ```

6. **Open in Browser**:
   Navigate to `http://localhost:8000` to interact with the assistant.

## Architecture
The application uses FastAPI to serve the frontend template and handle WebSocket connections from the browser. The browser sends base64-encoded audio and video frames. The FastAPI backend securely connects to the Gemini Live API (`gemini-3.8-live` model), forwards the media streams, and routes the AI's audio responses back to the browser for playback.

## License
MIT
