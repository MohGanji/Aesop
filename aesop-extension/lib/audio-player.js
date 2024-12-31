var audioPlayer = null

class AudioPlayer {
    constructor(container) {
        this.container = container;
        this.audio = container.querySelector('audio');
        this.audio.src = audioSrc;
        this.playPauseBtn = container.querySelector('#playPauseBtn');
        this.progressBar = container.querySelector('#progressBar');
        this.progress = container.querySelector('#progress');
        this.currentTimeEl = container.querySelector('#currentTime');
        this.durationEl = container.querySelector('#duration');
        this.speedBtn = container.querySelector('#speedBtn');

        this.playIcon = this.playPauseBtn.querySelector('.play-icon');
        this.pauseIcon = this.playPauseBtn.querySelector('.pause-icon');

        this.bindEvents();
        this.audio.addEventListener('loadedmetadata', () => this.setTotalTime());
    }

    bindEvents() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.audioEnded());
        this.speedBtn.addEventListener('click', () => this.changeSpeed());
    }

    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
            this.playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            this.audio.pause();
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
            this.playPauseBtn.setAttribute('aria-label', 'Play');
        }
    }

    updateSrc(src) { 
        this.audio.src = audioSrc;
    }

    audioEnded() {
        this.playIcon.style.display = 'block';
        this.pauseIcon.style.display = 'none';
        this.playPauseBtn.setAttribute('aria-label', 'Play');
        this.progress.style.width = '0%';
        this.audio.currentTime = 0;
    }

    changeSpeed() {
        const speeds = [1, 1.25, 1.5, 1.75, 2];
        const currentSpeed = this.audio.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];
        
        this.audio.playbackRate = newSpeed;
        this.speedBtn.textContent = `${newSpeed}x`;
    }
}

