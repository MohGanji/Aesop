SERVER_BASE_URL = 'http://localhost:5005'

// audioPlayer = null

chrome.storage.session.get('selectionText', (keys) => {
    onSelectedTextUpdate(keys.selectionText)
});

chrome.storage.session.onChanged.addListener((changes) => {
    const selectedTextChange = changes['selectionText'];
    
    if (!selectedTextChange) {
        return;
    }
    
    onSelectedTextUpdate(selectedTextChange.newValue);
});

function onSelectedTextUpdate(selectedText) {
    if (!selectedText) return;    
    document.getElementById('selected-text').innerHTML = selectedText
    
    let chunks = splitTextIntoChunks(selectedText)
    playNaturalVoice(chunks)
}


/**
 * 
 * @param {string} text 
 * @returns {{ text: string; start: number; end: number }[]}
 */
  const splitTextIntoChunks = (text) => {
    const matches = text.matchAll(/[^.!?;:\n]+([.!?;:\n]+|$)/g)
    return Array.from(matches).map(match => ({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    }))
  }

  /**
   * @param {{ text: string; start: number; end: number }[]} chunks 
   */
  const playTTS = (chunks) => {
    let currentChunkIndex = 0
  
    const speakNextChunk = () => {
      if (currentChunkIndex < chunks.length) {
        const utterThis = new SpeechSynthesisUtterance(chunks[currentChunkIndex].text)
  
        utterThis.onstart = () => {
          console.log(`Started speaking chunk ${currentChunkIndex + 1} of ${chunks.length}`)
          // You can add any UI updates or event triggers here
        }
  
        utterThis.onend = () => {
          console.log(`Finished speaking chunk ${currentChunkIndex + 1} of ${chunks.length}`)
          currentChunkIndex++
          speakNextChunk()
        }
  
        utterThis.onerror = (event) => {
          console.error('TTS Error:', event)
          currentChunkIndex++
        // speakNextChunk()
        }
  
        window.speechSynthesis.speak(utterThis)
      } else {
        console.log('Finished speaking all chunks')
        // You can add any completion logic here
      }
    }
    speakNextChunk()
  }
  
    /**
   * @param {{ text: string; start: number; end: number }[]} chunks 
   */
  const playNaturalVoice = async (chunks) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    let source = null

    for (let i = 0; i < chunks.length; i++) {
      try {
        const response = await fetch(`${SERVER_BASE_URL}/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunks[i].text,
            voice_id: "JBFqnCBsd6RMkjVDRZzb", // Default voice ID (George)
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate speech')
        }

        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.playbackRate = Number(document.getElementById('speedBtn').innerHTML.replaceAll(/x/g, ''))
        source.start()

        await new Promise((resolve) => {
          source.onended = resolve
        })

      } catch (error) {
        console.error('Server Error:', error)
        alert("Failed to generate speech. Something's gone wrong, please try again.")
        break
      }
    }

  }

//   document.addEventListener('DOMContentLoaded', () => {
//     audioPlayer = new AudioPlayer(document.querySelector('.audio-player'))
// });

document.getElementById('speedBtn').addEventListener('click', changeSpeed);
function changeSpeed(e) {
    const speedBtn = document.getElementById('speedBtn')
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const currentSpeed = Number(speedBtn.textContent.replaceAll(/x/g, ''))
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    speedBtn.textContent = `${newSpeed}x`;
}