# Realtime Voice & Vision Assistant

![Gemini Live API](https://img.shields.io/badge/Gemini-Live%20API-blue?style=for-the-badge&logo=google)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

A production-ready, real-time, bidirectional audio and video streaming assistant powered by the Gemini Live API (`google-genai` SDK), FastAPI, and WebSockets. Built for low-latency, conversational AI interactions with a sleek, modern interface.

## ✨ Features

- **Real-time Multimodal Interaction**: Send continuous camera frames and microphone audio over WebSockets to Gemini, and receive live audio responses back.
- **Modern UI/UX**: Built with Tailwind CSS, featuring audio visualizers, connection state management, and real-time logs.
- **Robust Architecture**: Modular FastAPI backend with dependency injection, connection lifecycle management, and typed configurations using `pydantic-settings`.
- **Docker Ready**: Easy deployment with `docker-compose`.

---

## 🏗️ Architecture

```mermaid
graph LR
    A[Browser / Client] -->|WebSocket <br> Video (Base64 JPEG) <br> Audio (PCM)| B(FastAPI Server)
    B <-->|google-genai <br> Live API connection| C{Gemini 3.8 Live}
    C -->|Audio Responses (PCM)| B
    B -->|WebSocket Audio| A
```

## 🚀 Quickstart

### Prerequisites
- Python 3.9+
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Er-Kalpesh/realtime-voice-vision-assistant.git
   cd realtime-voice-vision-assistant
   ```

2. **Environment Setup**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   cp .env.example .env
   ```
   Edit `.env` and add your `GEMINI_API_KEY`.

3. **Run the Server**:
   ```bash
   uvicorn main:app --reload
   ```
   Navigate to `http://localhost:8000` to interact.

### 2. Docker Deployment

If you prefer to run it using Docker:
```bash
docker build -t gemini-live-assistant .
docker run -p 8000:8000 --env-file .env gemini-live-assistant
```

## 📁 Project Structure

```text
├── app/
│   ├── api/
│   │   └── websockets.py    # WebSocket routing
│   ├── core/
│   │   └── config.py        # Pydantic environment configurations
│   ├── services/
│   │   └── gemini_service.py # Gemini Live API integration
│   └── main.py              # FastAPI application factory
├── static/                  # CSS & JS assets
├── templates/               # HTML templates
├── main.py                  # Uvicorn entry point
├── requirements.txt
└── Dockerfile
```

## 📜 License
MIT License
