const DRAGGABLE = 'draggable'
const PLAY_PAUSE = 'play-pause'
const SPEED_BTN = 'speed-btn'

const _states = new Map();

const useState = (value,context) => {
    const dispatch = v => {
            const currentState = _states.get(context.callee);
            currentState[0] = typeof v === 'function' ? v(currentState[0]) : v        
            // we re-call the function with the same arguments it was originally called with - "re-rendering it" of sorts...
            context.callee.call(context);    
    }
    const current = _states.get(context.callee) || [value,dispatch];
    _states.set(context.callee,current);
    return current;
}

// TODO: use this to update UI and know when to play or pause to avoid repeat.
const [isPlaying, setIsPlaying] = useState(false) 

function getCurrentSpeed() {
    return Number(document.querySelector(`.${SPEED_BTN}`).textContent.replace('x', ''))
}


// AUDIO PLAYER JS

const SERVER_BASE_URL = 'http://localhost:5005'

// chrome.storage.session.get('selectionText', (keys) => {
//     onSelectedTextUpdate(keys.selectionText)
// });

// chrome.storage.session.onChanged.addListener((changes) => {
//     const selectedTextChange = changes['selectionText'];
    
//     if (!selectedTextChange) {
//         return;
//     }
    
//     onSelectedTextUpdate(selectedTextChange.newValue);
// });

function onSelectedTextUpdate(selectedText) {
    if (!selectedText) return;    
    document.getElementById('selected-text').innerHTML = selectedText
    
    let chunks = splitTextIntoChunks(selectedText)
    // playNaturalVoice(chunks)
    playTTS(chunks, () => {setIsPlaying(false)})
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
  const playTTS = (chunks, callback) => {
    let currentChunkIndex = 0
  
    const speakNextChunk = () => {
      if (currentChunkIndex < chunks.length) {
        const utterThis = new SpeechSynthesisUtterance(chunks[currentChunkIndex].text)
        utterThis.rate = getCurrentSpeed()

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
        callback()
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

// END AUDIO PLAYER JS



function newDiv(className, innerHTML) {
    const div = document.createElement('div')
    div.className = className
    div.innerHTML = innerHTML || ""
    return div
}

function createDraggableDiv() {
    console.log("creating draggable div.")
    // Create the div
    const div = newDiv(DRAGGABLE)
    div.style.top = '44vh';
    div.style.right = '20px';
    
    div.appendChild(newDiv(PLAY_PAUSE, `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="play-icon">
            <polygon points="6 3 21 12 6 21"></polygon>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pause-icon">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
    `))
    div.appendChild(newDiv(`${SPEED_BTN} unselectable`, "1x"))

    // Add event listeners for dragging
    let isDragging = false;
    let offsetX, offsetY;

    div.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - div.offsetLeft;
      offsetY = e.clientY - div.offsetTop;
      div.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        div.style.left = `${e.clientX - offsetX}px`;
        div.style.top = `${e.clientY - offsetY}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      div.style.cursor = 'grab';
    });

    // Append the div to the body
    document.body.appendChild(div);
}
createDraggableDiv();

document.querySelector(`.${SPEED_BTN}`).addEventListener('click', changeSpeed);
function changeSpeed(e) {
    const speedBtn = e.srcElement
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentSpeed = Number(speedBtn.textContent.replaceAll(/x/g, ''))
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    speedBtn.textContent = `${newSpeed}x`;
}

document.querySelector(`.${PLAY_PAUSE}`).addEventListener('click', playPause);
function playPause(e) {
    if (!isPlaying) {
        setIsPlaying(true)
        playTTS(splitTextIntoChunks("Hello there. I'm Aesop."))
    } else {
    }
}



