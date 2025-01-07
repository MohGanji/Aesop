const DRAGGABLE = 'draggable'
const PLAY_PAUSE = 'play-pause'
const DRABBALE_ICON = 'draggable-icon'
const ID_PLAY_ICON = 'play-icon'
const ID_PAUSE_ICON = 'pause-icon'
const SPEED_BTN = 'speed-btn'

// AUDIO PLAYER JS

const SERVER_BASE_URL = 'http://localhost:5005'

class AudioPlayer {
    constructor() {
        /**
         * @private
         * @type {string}
         */
        this._text = ""
        /**
         * @private
         * @type {{ text: string; start: number; end: number }[]}
         */
        this._chunks = []
        /**
         * @private
         * @type {number}
         */
        this._currentChunk = 0
        /**
         * @public
         * @type {boolean}
         */
        this.isPlaying = false
        /**
         * @private
         * @type {'TTS' | 'NATURAL'}
         */
        this._mode = "TTS" 

        /**
         * @private
         * @type {0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2}
         */
        this._speed = 1

        /**
         * @private
         * @type {string}
         */
        this._naturalVoiceId = "JBFqnCBsd6RMkjVDRZzb"

        /**
         * this indicates if we have a tts utterance currently being played
         * @private
         * @type {SpeechSynthesisUtterance | null}
         */
        this._currentTTSUtterance = null

        /**
         * this indicates if we have a tts utterance currently being played
         * @private
         * @type {{ctx: AudioContext, src: AudioBufferSourceNode} | null}
         */
        this._currentNaturalSource = null
    }

    /**
     * @public
     * @param {string} text 
     * @returns {{ text: string; start: number; end: number }[]}
     */
    setText(text) {
        this._text = text
        this._chunks = this._splitTextIntoChunks(text)
        this._currentChunk = 0
    }

    /**
     * @public
     * @param {0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2} speed 
     */
    setSpeed(speed) {
        this._speed = speed
        if(this._currentTTSUtterance) {
            this._currentTTSUtterance.rate = this._speed
        }
        if(this._currentNaturalSource) {
            this._currentNaturalSource.src.playbackRate.value = this._speed
        }
        playPause()
        playPause()
    }

    /**
     * @public
     * @param {'TTS' | 'NATURAL'} mode 
     */
    setMode(mode) {
        this._mode = mode
    }

    /**
     * play if not playing, pause if playing.
     * @public
     * @returns {boolean}
     */
    playPause() {
        console.log(this.isPlaying, this._currentChunk, this._text, this._chunks)
        if (this.isPlaying) {
            this.isPlaying = false
            if(this._mode === "TTS" && this._currentTTSUtterance) {
                window.speechSynthesis.pause()
            } else if (this._mode === 'NATURAL' && this._currentNaturalSource) {
                this._currentNaturalSource.ctx.suspend()
            }
        } else {
            this.isPlaying = true
            this._playCurrentChunk()
        }
        return this.isPlaying
    }

    /**
     * @private
     * @param {string} text 
     * @returns {{ text: string; start: number; end: number }[]}
     */
    _splitTextIntoChunks (text) {
        const matches = text.matchAll(/[^.!?;:\n]+([.!?;:\n]+|$)/g)
        return Array.from(matches).map((match) => ({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
        }))
    }

    /**
     * @private
     * @param {{ text: string; start: number; end: number }} chunk 
     * @returns {void}
     */
    _playCurrentChunk() {
        if(!this.isPlaying) {
            console.log('isPlaying == false')
            return
        }
        if(this._currentChunk >= this._chunks.length) {
            console.log('reached last chunk.')
            this.onEnd()
            return
        }
        const chunk = this._chunks[this._currentChunk]
        if(this._mode == 'TTS') {
            this._playTTS(chunk)
        } else {
            this._playNatural(chunk)
        }
    }

    /**
     * @private
     * @param {{ text: string; start: number; end: number }} chunk 
     * @returns {void}
     */
    _playTTS(chunk) {
        console.log('starting to play tts', this._currentChunk, this._currentTTSUtterance, chunk)
        if(this._currentTTSUtterance) {
            window.speechSynthesis.resume()
            return
        }
        this._currentTTSUtterance = new SpeechSynthesisUtterance(chunk.text)
        this._currentTTSUtterance.rate = this._speed

        this._currentTTSUtterance.onstart = () => {
            console.log(`Started speaking chunk ${this._currentChunk + 1} of ${this._chunks.length}`)
            // You can add any UI updates or event triggers here
        }
        this._currentTTSUtterance.onend = () => {
            console.log(`Finished speaking chunk ${this._currentChunk + 1} of ${this._chunks.length}`)
            this._currentTTSUtterance = null
            this._currentChunk++
            this._playCurrentChunk()
        }
        this._currentTTSUtterance.onerror = (event) => {
            this._currentTTSUtterance = null
            console.error('TTS Error:', event)
            this.onError(event)
            alert("Failed to generate speech. Something's gone wrong, please try again.")
        }

        window.speechSynthesis.speak(this._currentTTSUtterance)
    }

    /**
     * @private
     * @param {{ text: string; start: number; end: number }} chunk 
     * @returns {void}
     */
    async _playNatural (chunk) {
        if(this._currentNaturalSource) {
            this._currentNaturalSource.ctx.resume()
            console.log(this._currentNaturalSource)
            return
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        let source = null

        try {
            const response = await fetch(`${SERVER_BASE_URL}/tts`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    text: chunk.text,
                    voice_id: this._naturalVoiceId, // Default voice ID (George)
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate speech')
            }

            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

            source = audioContext.createBufferSource()
            source.buffer = audioBuffer
            source.connect(audioContext.destination)
            // source.playbackRate.value = this._speed
            this._currentNaturalSource = {ctx: audioContext, src: source}
            source.start()

            source.onended = () => {
                console.log(`Finished speaking chunk ${this._currentChunk + 1} of ${this._chunks.length}`)
                this._currentNaturalSource = null
                this._currentChunk++
                this._playCurrentChunk()
            }
            source.onerror = (event) => {
                this._currentNaturalSource = null
                console.error('Natural Voice Player Error:', event)
                this.onError(event)
                alert("Failed to play voice. Something's gone wrong, please try again.")
            }

            if(!this.isPlaying) {
                // console.log('is paused but in here', this.isPlaying, this._currentNaturalSource.ctx.state, this._currentNaturalSource)
                this._currentNaturalSource.ctx.suspend()
                return
            }
            
        } catch (error) {
            this._currentNaturalSource = null
            console.error('Natural Voice Server Error:', error)
            this.onError(error)
            alert("Failed to generate speech. Something's gone wrong, please try again.")
        }
    }

    /**
     * handle cases when error happens. 
     * Ideally this should dispatch an event and UI element should subscribe to it. But for now since we only have once instance, we handle everything here.
     * @param {string} error 
     * @returns {{error: string, isPlaying: boolean}}
     */
    onError(error) {
        this.isPlaying = false
        
        // Handle any consequences here.
        updatePlayPauseIcon(this.isPlaying)
        
        return {error, isPlaying: this.isPlaying}
    }

    /**
     * handle cases when voice ends. 
     * Ideally this should dispatch an event and UI element should subscribe to it. But for now since we only have once instance, we handle everything here.
     * @returns {{isPlaying: boolean}}
     */
    onEnd() {
        this.isPlaying = false
        this._text = ""
        this._chunks = []
        this._currentChunk = 0
        this._currentNaturalSource = null
        this._currentTTSUtterance = null
        
        // Handle any consequences here.
        updatePlayPauseIcon(this.isPlaying)
        
    }
}

var audioPlayer = new AudioPlayer()

audioPlayer.setMode("NATURAL")
// audioPlayer.setText("Explora las SUVs, roadsters y autos en venta que Mazda México tiene para ti. Elige tu vehículo ideal, configúralo, cotízalo y ¡estrénalo ya!")
audioPlayer.setText("Hello beautiful people of vancouver in this rainy night. I'm Aesop, your helpful voice assistant with the ability to read to you in a natural voice. Let me know how I can help you.")

function updatePlayPauseIcon(isPlaying) {
    document.getElementById(ID_PAUSE_ICON).setAttribute('class', isPlaying ? '' : 'hidden')
    document.getElementById(ID_PLAY_ICON).setAttribute('class', isPlaying ? 'hidden' : '')
}

function getCurrentSpeed() {
    return Number(document.querySelector(`.${SPEED_BTN}`).textContent.replace('x', ''))
}

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
    audioPlayer.setText(selectedText)    
}

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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="play-icon" class="">
            <polygon points="6 3 21 12 6 21"></polygon>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="pause-icon" class="hidden">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
    `))
    div.appendChild(newDiv(`${SPEED_BTN} unselectable`, "1x"))
    div.appendChild(newDiv(DRABBALE_ICON, `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="draggable-icon" class="">
                <circle cx="8" cy="5" r="1" fill=var(--color-text-grey) />
                <circle cx="8" cy="12" r="1" fill=var(--color-text-grey) />
                <circle cx="8" cy="19" r="1" fill=var(--color-text-grey) />
                <circle cx="16" cy="5" r="1" fill=var(--color-text-grey) />
                <circle cx="16" cy="12" r="1" fill=var(--color-text-grey) />
                <circle cx="16" cy="19" r="1" fill=var(--color-text-grey) />
        </svg>
    `))

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
    audioPlayer.setSpeed(newSpeed)
    
    speedBtn.textContent = `${newSpeed}x`;
}

document.querySelector(`.${PLAY_PAUSE}`).addEventListener('click', playPause);
function playPause(e) {
    
    updatePlayPauseIcon(audioPlayer.playPause())
}



