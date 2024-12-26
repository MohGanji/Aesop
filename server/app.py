import os
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

@app.route('/tts', methods=['POST'])
def text_to_speech():
    if not ELEVENLABS_API_KEY:
        return {"error": "ElevenLabs API key not configured"}, 500

    data = request.json
    voice_id = data.get('voice_id', '21m00Tcm4TlvDq8ikWAM')  # Default to "Rachel" voice
    text = data.get('text')

    if not text:
        return {"error": "No text provided"}, 400

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

    def generate():
        with requests.post(ELEVENLABS_API_URL.format(voice_id=voice_id), json=payload, headers=headers, stream=True) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                yield chunk

    return Response(stream_with_context(generate()), content_type="audio/mpeg")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port='5005', debug=True)

