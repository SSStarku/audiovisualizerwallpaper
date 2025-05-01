import * as THREE from 'three';

/**
 * Manages audio loading, playback, and analysis using the Web Audio API
 * integrated with Three.js (THREE.AudioListener, THREE.Audio, THREE.AudioAnalyser).
 * Also handles the file input element for loading audio.
 */
export default class AudioManager {
    /**
     * Creates an AudioManager instance.
     * @param {THREE.Camera} camera - The main scene camera to attach the AudioListener to.
     */
    constructor(camera) {
        if (!camera) {
            throw new Error('AudioManager requires a THREE.Camera instance.');
        }
        /** @type {THREE.AudioListener} Listens to audio events, needs to be attached to the camera */
        this.listener = new THREE.AudioListener();
        camera.add(this.listener); // Attach listener to the camera provided by SceneManager

        /** @type {THREE.Audio} Represents the audio source being played */
        this.sound = new THREE.Audio(this.listener);
        /** @type {THREE.AudioAnalyser | null} Analyzes the audio frequency data */
        this.audioAnalyser = null;
        /** @type {AudioContext | null} The underlying Web Audio API context */
        this.audioContext = null; 

        // Create and manage the file input element
        this._createFileInput();
    }

    /**
     * Creates the HTML file input element for audio files and adds it to the DOM.
     * @private
     */
    _createFileInput() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*'; // Accept all audio formats
        // Basic styling to position the input element
        fileInput.style.position = 'absolute'; 
        fileInput.style.top = '20px';
        fileInput.style.left = '50%';
        fileInput.style.transform = 'translateX(-50%)'; // Center horizontally
        fileInput.style.zIndex = '10'; // Ensure it's above the Three.js canvas
        fileInput.addEventListener('change', this._handleFileUpload.bind(this)); // Bind 'this' for the callback

        // Append the input to the body. Consider a dedicated UI container later.
        document.body.appendChild(fileInput); 
    }

    /**
     * Handles the 'change' event of the file input.
     * Reads the selected audio file, decodes it, and starts playback.
     * @param {Event} event - The file input change event.
     * @private
     */
    _handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return; // Exit if no file was selected

        // Basic validation
        if (!file.type.startsWith('audio/')) {
            console.warn('Invalid file type. Please upload an audio file.');
            alert('请上传音频文件！'); // User feedback in Chinese
            event.target.value = null; // Reset input
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const audioData = e.target.result; // Audio data as ArrayBuffer

            // --- Cleanup existing audio --- 
            if (this.sound.isPlaying) {
                this.sound.stop(); // Stop previous audio if playing
            }
             if (this.audioAnalyser) {
                 if (this.audioAnalyser.analyser) {
                    try {
                        // Disconnect the analyser node to prevent memory leaks
                        this.audioAnalyser.analyser.disconnect();
                    } catch (error) {
                        console.warn("Error disconnecting previous analyser:", error);
                    }
                 }
                 this.audioAnalyser = null; // Clear reference
             }

            // --- Setup Audio Context --- 
            // Reuse or create the AudioContext. Crucial for browser compatibility and resource management.
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.listener.context = this.audioContext; // Link listener to this context
            } else if (this.audioContext.state === 'suspended') {
                 // Attempt to resume the context if it was suspended (e.g., by browser autoplay policies)
                this.audioContext.resume().catch(err => console.error("Error resuming AudioContext:", err));
            }

            // --- Decode and Play --- 
            this.audioContext.decodeAudioData(audioData)
                .then(buffer => {
                    // Double-check context state before proceeding
                    if (this.audioContext.state !== 'running') {
                         console.warn('AudioContext is not running after decode. Attempting resume again...');
                         // Attempt to resume and then play
                         return this.audioContext.resume().then(() => this._setupAndPlay(buffer))
                                                    .catch(err => console.error("Error resuming context before playback:", err));
                     } else {
                         this._setupAndPlay(buffer); // Context is running, proceed directly
                     }
                })
                .catch(error => {
                    console.error('Error decoding audio data:', error);
                    alert('音频文件解码失败！'); // User feedback
                    event.target.value = null; // Reset input on error
                });
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('文件读取失败！'); // User feedback
            event.target.value = null; // Reset input on error
        };

        // Read the file contents as an ArrayBuffer
        reader.readAsArrayBuffer(file);
        event.target.value = null; // Reset input after starting read
    }
    
    /**
     * Sets up the THREE.Audio object with the decoded buffer, configures
     * the AudioAnalyser, and starts playback.
     * @param {AudioBuffer} buffer - The decoded audio data.
     * @private
     */
    _setupAndPlay(buffer) {
        this.sound.setBuffer(buffer); // Assign the decoded buffer to the sound source
        this.sound.setLoop(true); // Loop the audio
        this.sound.setVolume(0.5); // Set a default volume
        this.sound.play(); // Start playback

        // Create a new analyser for the currently playing sound
        // fftSize must be a power of 2 (e.g., 32, 64, 128, ...). Higher values give more frequency bins.
        const fftSize = 64; 
        this.audioAnalyser = new THREE.AudioAnalyser(this.sound, fftSize); 
        console.log(`Audio loaded and playing. Analyser FFT size: ${fftSize}.`);
    }

    /**
     * Gets the average frequency value from the AudioAnalyser.
     * @returns {number} The average frequency value (typically 0-255), or 0 if unavailable.
     */
    getAverageFrequency() {
        if (this.audioAnalyser) {
            // This method computes the average of the frequency data array
            return this.audioAnalyser.getAverageFrequency();
        }
        return 0; // Return 0 if analyser isn't ready or audio isn't playing
    }

    // --- Optional Playback Controls --- 
    // play() { 
    //     if (this.sound && !this.sound.isPlaying && this.sound.buffer) { 
    //          // Resume context if needed before playing
    //         if (this.audioContext && this.audioContext.state === 'suspended') {
    //             this.audioContext.resume().then(() => this.sound.play());
    //         } else {
    //              this.sound.play(); 
    //         }
    //     }
    // }
    // stop() { if (this.sound && this.sound.isPlaying) this.sound.stop(); }
    // setVolume(value) { if(this.sound) this.sound.setVolume(value); }
} 