import os
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
import requests
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv() 

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

@lru_cache(maxsize=1024)
def elevenlabs_tts(voice_id, text):
    headers = {
        "Accept": "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    response = requests.post(ELEVENLABS_API_URL.format(voice_id=voice_id), json=payload, headers=headers, stream=True)
    response.raise_for_status()
    return b"".join(response.iter_content(chunk_size=8192))

@app.route('/tts', methods=['POST'])
def text_to_speech():
    if not ELEVENLABS_API_KEY:
        return {"error": "ElevenLabs API key not configured"}, 500

    data = request.json
    voice_id = data.get('voice_id', '21m00Tcm4TlvDq8ikWAM')  # Default to "Rachel" voice
    text = data.get('text')

    if not text:
        return {"error": "No text provided"}, 400

    def generate():
        cached_audio = elevenlabs_tts(voice_id, text)
        print(elevenlabs_tts.cache_info())
        for i in range(0, len(cached_audio), 8192):
            yield cached_audio[i:i + 8192]

    return Response(stream_with_context(generate()), content_type="audio/mpeg")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port='5005', debug=True)
