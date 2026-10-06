// DOM Elements
const videoPreview = document.getElementById('videoPreview');
const videoOverlay = document.getElementById('videoOverlay');
const liveIndicator = document.getElementById('liveIndicator');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const logContainer = document.getElementById('logContainer');
const aiVisualizer = document.getElementById('aiVisualizer');
const aiSpeakingState = document.getElementById('aiSpeakingState');
const userVisualizerCanvas = document.getElementById('userVisualizerCanvas');

// State
let ws = null;
let stream = null;
let audioContext = null;
let scriptNode = null;
let captureInterval = null;
let audioQueue = [];
let isPlaying = false;
let nextPlayTime = 0;
let isVideoMuted = false;
let isAudioMuted = false;

// Audio Visualizer Setup
const userCanvasCtx = userVisualizerCanvas.getContext('2d');
let analyser = null;
let animationId = null;

// Initialize AI visualizer bars
const numBars = 16;
for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    aiVisualizer.appendChild(bar);
}
const aiBars = document.querySelectorAll('.bar');

function logEvent(msg, type = 'info') {
    const el = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    
    let colorClass = 'text-gray-300';
    if (type === 'error') colorClass = 'text-red-400';
    if (type === 'success') colorClass = 'text-green-400';
    if (type === 'warning') colorClass = 'text-yellow-400';

    el.className = colorClass;
    el.innerHTML = `<span class="text-gray-500">[${time}]</span> ${msg}`;
    logContainer.appendChild(el);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function updateStatus(state) {
    if (state === 'connected') {
        statusText.innerText = 'Connected to Gemini';
        statusText.className = 'text-green-400';
        statusDot.className = 'w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_#22c55e]';
    } else if (state === 'disconnected') {
        statusText.innerText = 'Disconnected';
        statusText.className = 'text-gray-400';
        statusDot.className = 'w-2 h-2 rounded-full bg-gray-500 mr-2';
    } else if (state === 'connecting') {
        statusText.innerText = 'Connecting...';
        statusText.className = 'text-yellow-400';
        statusDot.className = 'w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse';
    }
}

async function initMedia() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } }, 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        videoPreview.srcObject = stream;
        
        // Setup User Visualizer
        const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = tempAudioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = tempAudioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        drawUserVisualizer();

        logEvent("Camera and microphone initialized.", "success");
    } catch (err) {
        logEvent(`Error accessing media devices: ${err.message}`, "error");
        console.error(err);
    }
}

function drawUserVisualizer() {
    if (!analyser) return;
    
    // Resize canvas internal buffer to match display size
    if (userVisualizerCanvas.width !== userVisualizerCanvas.clientWidth) {
        userVisualizerCanvas.width = userVisualizerCanvas.clientWidth;
        userVisualizerCanvas.height = userVisualizerCanvas.clientHeight;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    userCanvasCtx.clearRect(0, 0, userVisualizerCanvas.width, userVisualizerCanvas.height);
    
    // Draw
    const barWidth = (userVisualizerCanvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Green color gradient
        userCanvasCtx.fillStyle = `rgb(34, 197, 94, ${barHeight/100 + 0.1})`;
        userCanvasCtx.fillRect(x, userVisualizerCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
    
    animationId = requestAnimationFrame(drawUserVisualizer);
}

function simulateAIVisualizer(isActive) {
    if (!isActive) {
        aiBars.forEach(bar => {
            bar.style.height = '4px';
            bar.classList.remove('active');
        });
        return;
    }
    
    aiBars.forEach(bar => {
        bar.classList.add('active');
        const height = Math.random() * 80 + 10;
        bar.style.height = `${height}px`;
    });
}

function playNextAudio() {
    if (audioQueue.length === 0) {
        if (isPlaying) {
            isPlaying = false;
            aiSpeakingState.innerText = "Listening...";
            simulateAIVisualizer(false);
        }
        return;
    }
    
    if (isPlaying && nextPlayTime > audioContext.currentTime + 0.1) {
        // Still playing something else
        return;
    }

    isPlaying = true;
    aiSpeakingState.innerText = "AI is speaking...";
    
    const base64Data = audioQueue.shift();
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioData = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, audioData.length, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
        playNextAudio();
    };
    
    if (nextPlayTime < audioContext.currentTime) {
        nextPlayTime = audioContext.currentTime;
    }
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;
    
    // Simulate visualizer while this chunk plays
    let visualizerInterval = setInterval(() => {
        if (!isPlaying) {
            clearInterval(visualizerInterval);
            simulateAIVisualizer(false);
        } else {
            simulateAIVisualizer(true);
        }
    }, 100);
    
    // Clear interval when source ends
    source.onended = () => {
        clearInterval(visualizerInterval);
        playNextAudio();
    };
}

async function startAssistant() {
    if (!stream) await initMedia();
    if (!stream) return; // if init failed

    updateStatus('connecting');
    logEvent("Connecting to server...");
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    nextPlayTime = audioContext.currentTime;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
        updateStatus('connected');
        logEvent("WebSocket connected. Starting stream.", "success");
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        toggleVideoBtn.disabled = false;
        toggleAudioBtn.disabled = false;
        
        videoOverlay.classList.add('opacity-0');
        setTimeout(() => videoOverlay.classList.add('hidden'), 300);
        liveIndicator.classList.remove('hidden');
        
        // Start sending audio
        const source = audioContext.createMediaStreamSource(stream);
        scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(scriptNode);
        scriptNode.connect(audioContext.destination);
        
        scriptNode.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN && !isAudioMuted) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                
                ws.send(JSON.stringify({
                    realtimeInput: {
                        audio: {
                            mimeType: `audio/pcm;rate=${audioContext.sampleRate}`, 
                            data: base64Data
                        }
                    }
                }));
            }
        };

        // Start sending video frames (1 fps)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        captureInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && videoPreview.videoWidth > 0 && !isVideoMuted) {
                canvas.width = 640;
                canvas.height = 480;
                ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                const base64Data = dataUrl.split(',')[1];
                
                ws.send(JSON.stringify({
                    realtimeInput: {
                        video: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    }
                }));
            }
        }, 1000);
        
        aiSpeakingState.innerText = "Listening...";
    };
    
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "audio") {
            audioQueue.push(msg.data);
            if (!isPlaying) {
                playNextAudio();
            }
        } else if (msg.type === "interrupted") {
            audioQueue = [];
            isPlaying = false;
            nextPlayTime = audioContext.currentTime;
            logEvent("AI response interrupted.", "warning");
        } else if (msg.type === "error") {
            logEvent(`Server error: ${msg.message}`, "error");
        }
    };
    
    ws.onerror = (error) => {
        logEvent("WebSocket error occurred.", "error");
    };
    
    ws.onclose = () => {
        stopAssistant();
    };
}

function stopAssistant() {
    if (ws) {
        ws.close();
        ws = null;
    }
    if (scriptNode) {
        scriptNode.disconnect();
        scriptNode = null;
    }
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    toggleVideoBtn.disabled = true;
    toggleAudioBtn.disabled = true;
    
    videoOverlay.classList.remove('hidden');
    // slight delay to allow display:block to apply before opacity changes
    setTimeout(() => videoOverlay.classList.remove('opacity-0'), 10);
    liveIndicator.classList.add('hidden');
    
    updateStatus('disconnected');
    logEvent("Session ended.");
    
    audioQueue = [];
    isPlaying = false;
    aiSpeakingState.innerText = "Waiting for connection...";
    simulateAIVisualizer(false);
}

// Toggle logic
toggleVideoBtn.addEventListener('click', () => {
    isVideoMuted = !isVideoMuted;
    if (stream) {
        stream.getVideoTracks().forEach(track => track.enabled = !isVideoMuted);
    }
    toggleVideoBtn.innerHTML = isVideoMuted ? '<i class="fas fa-video-slash text-red-400"></i>' : '<i class="fas fa-video"></i>';
    logEvent(isVideoMuted ? "Camera muted." : "Camera unmuted.");
});

toggleAudioBtn.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    if (stream) {
        stream.getAudioTracks().forEach(track => track.enabled = !isAudioMuted);
    }
    toggleAudioBtn.innerHTML = isAudioMuted ? '<i class="fas fa-microphone-slash text-red-400"></i>' : '<i class="fas fa-microphone"></i>';
    logEvent(isAudioMuted ? "Microphone muted." : "Microphone unmuted.");
});

startBtn.addEventListener('click', startAssistant);
stopBtn.addEventListener('click', stopAssistant);

// Request permissions on load nicely (optional)
// initMedia();
