import * as THREE from 'three';

/**
 * Manages audio data received from Lively Wallpaper for visualization.
 * It no longer handles audio loading or playback, as that is managed by Lively.
 */
export default class AudioManager {
    /**
     * Creates an AudioManager instance.
     * @param {THREE.Camera} camera - The main scene camera (still needed for THREE.AudioListener, even if not playing audio).
     */
    constructor(camera) {
        if (!camera) {
            throw new Error('AudioManager requires a THREE.Camera instance.');
        }
        /** @type {THREE.AudioListener} Listens to audio events, needs to be attached to the camera */
        this.listener = new THREE.AudioListener();
        camera.add(this.listener); // Attach listener to the camera provided by SceneManager

        /** @type {Float32Array} Stores the latest audio frequency data from Lively. */
        this.livelyAudioData = new Float32Array();
    }

    /**
     * Receives and stores audio data from Lively Wallpaper.
     * This data will be used for visualization.
     * @param {Float32Array} audioArray - An array of audio frequency data (0-1 range).
     */
    setLivelyAudioData(audioArray) {
        this.livelyAudioData = audioArray;
    }

    /**
     * Gets the average frequency value from the Lively audio data.
     * @returns {number} The average frequency value (typically 0-1), or 0 if no data is available.
     */
    getAverageFrequencyFromLively() {
        if (this.livelyAudioData.length === 0) {
            return 0;
        }
        let sum = 0;
        for (let i = 0; i < this.livelyAudioData.length; i++) {
            sum += this.livelyAudioData[i];
        }
        return sum / this.livelyAudioData.length;
    }

    /**
     * Gets the raw Lively audio data array.
     * @returns {Float32Array} The array of audio frequency data.
     */
    getLivelyAudioData() {
        return this.livelyAudioData;
    }
}
