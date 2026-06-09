import * as THREE from 'three';
import SceneManager from './core/SceneManager';
import AudioManager from './audio/AudioManager';
// import GuiManager from './gui/GuiManager';
import PostProcessor from './effects/PostProcessor';

/**
 * Main application entry point.
 * Initializes all modules (Scene, Audio, GUI, PostProcessing)
 * and runs the main animation loop.
 */

console.log('main.js loaded');

// --- Global Variables & Parameters ---

/** @type {number} Normalized mouse X position (-1 to 1, approx) */
let mouseX = 0;
/** @type {number} Normalized mouse Y position (-1 to 1, approx) */
let mouseY = 0;
/** @type {Float32Array} Array to hold audio data from Lively API */
let livelyAudioData = new Float32Array();


const effectParams = {
	red: 1.0,       // Initial red color component for the shader
	green: 1.0,     // Initial green color component
	blue: 1.0,      // Initial blue color component
	threshold: 0.3, // Adjusted bloom effect threshold
	strength: 0.25,  // Adjusted bloom effect strength
	radius: 0.8,    // Initial bloom effect radius
	visualEffect: 'icosahedron', // Change default to icosahedron
    zoom: 0.0,      // Initial zoom value
    intensity: 25  //Intial sound intensity
};


const visualEffectItems = ["icosahedron", "particles"];

// --- Module Instances ---
// Declare module variables in the outer scope
/** @type {SceneManager | null} */
let sceneManager = null;
/** @type {AudioManager | null} */
let audioManager = null;
/** @type {PostProcessor | null} */
let postProcessor = null;
/** @type {THREE.Clock} Used for getting delta time and elapsed time */
const clock = new THREE.Clock();


/**
 * Initializes all application modules and starts the animation loop.
 */
function init() {

    sceneManager = new SceneManager(); 
    

    audioManager = new AudioManager(sceneManager.getCamera()); 

    postProcessor = new PostProcessor(
        sceneManager.getRenderer(), 
        sceneManager.getScene(), 
        sceneManager.getCamera(),
        {
            threshold: effectParams.threshold,
            strength: effectParams.strength,
            radius: effectParams.radius
        } // Pass initial bloom params
    );


    if (sceneManager) {
        sceneManager.setActiveEffect(effectParams.visualEffect);
    }


    setupEventListeners();
    

    startAnimationLoop(); 
    console.log('Initialization complete.');
}


/**
 * Sets up global event listeners (window resize, mouse move).
 */
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    // Add touch event listener for mobile compatibility
    document.addEventListener('touchmove', onTouchMove, { passive: false }); 
    // Note: File input is now triggered via GuiManager and handled in init()
}

/**
 * Handles window resize events.
 * Notifies relevant modules (SceneManager, PostProcessor) to update their sizes.
 */
function onWindowResize() {
    console.log('Window resized');
    if (sceneManager) {
        sceneManager.onResize(); // Updates camera aspect, renderer size
    }
    if (postProcessor) {
        postProcessor.onResize(); // Updates composer size
    }
}

/**
 * Handles mouse movement events.
 * Updates normalized mouse coordinates (mouseX, mouseY).
 * @param {MouseEvent} event
 */
function onMouseMove(event) {

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    mouseX = (event.clientX - windowHalfX) / windowHalfX; // Normalize X
    mouseY = (event.clientY - windowHalfY) / windowHalfY; // Normalize Y (inverted for typical 3D coordinate systems)

}

/**
 * Handles touch movement events on mobile devices.
 * Updates normalized mouse coordinates (mouseX, mouseY) based on the first touch point.
 * Prevents default scroll behavior.
 * @param {TouchEvent} event
 */
function onTouchMove(event) {
    // Prevent the default touch action (like scrolling)
    event.preventDefault(); 

    if (event.touches.length > 0) {
        const touch = event.touches[0]; // Get the first touch point
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
        mouseX = (touch.clientX - windowHalfX) / windowHalfX; // Normalize X
        mouseY = (touch.clientY - windowHalfY) / windowHalfY; // Normalize Y 
    }
}


/**
 * Receives audio data from Lively Wallpaper.
 * @param {Float32Array} audioArray - An array of audio frequency data.
 */
function livelyAudioListener(audioArray) {
    livelyAudioData = audioArray;
    if (audioManager) {
        audioManager.setLivelyAudioData(audioArray);
    }
}
window.livelyAudioListener = livelyAudioListener; // Expose to global scope

/**
 * Receives property changes from Lively Wallpaper.
 * @param {string} name - The name of the property that changed.
 * @param {*} val - The new value of the property.
 */
function livelyPropertyListener(name, val) {
    console.log(`Lively property changed: ${name} = ${val}`);
    switch (name) {
        case "lineColor":
            // Assuming lineColor is a hex string like "#RRGGBB"
            // Convert hex to RGB and update effectParams or sceneManager directly
            const color = new THREE.Color(val);
            effectParams.red = color.r;
            effectParams.green = color.g;
            effectParams.blue = color.b;
            if (sceneManager) {
                sceneManager.updateShaderUniforms({ u_red: color.r, u_green: color.g, u_blue: color.b });
                break;
            }
            break;


        case "bloomThreshold":
            if (postProcessor) {
                postProcessor.updateParams({ threshold: parseFloat(val) });
            }
            break;
        case "bloomStrength":
            if (postProcessor) {
                postProcessor.updateParams({ strength: parseFloat(val) });
            }
            break;
        case "bloomRadius":
            if (postProcessor) {
                postProcessor.updateParams({ radius: parseFloat(val) });
            }
            break;
        case "visualEffect":
            if (sceneManager) {

                const selectedEffect = visualEffectItems[val];
                if (selectedEffect) {
                    sceneManager.setActiveEffect(selectedEffect);
                }
            }
            break;
        case "zoom":
            if (sceneManager) {
                sceneManager.setCameraZoom(parseFloat(val));
            }
            break;
        case "intensity":
            effectParams.intensity = parseFloat(val);

            if (audioManager) {
                audioManager.setLivelyIntensity(effectParams.intensity);
            }
            break;

    }
}
window.livelyPropertyListener = livelyPropertyListener; // Expose to global scope

// --- Animation Loop ---
/**
 * Starts the main animation loop using requestAnimationFrame.
 */
function startAnimationLoop() {
    /**
     * The main animation loop function.
     * Called recursively via requestAnimationFrame.
     */
    function animate() {
        requestAnimationFrame(animate); // Schedule the next frame


        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // --- Get Input Data ---
        // Fetch the latest average audio frequency from the AudioManager
        // const audioFrequency = audioManager ? audioManager.getAverageFrequency() : 0;
        // Use Lively audio data directly
        const audioFrequency = audioManager ? audioManager.getAverageFrequencyFromLively() : 0;

        // --- Update Modules ---
        if (sceneManager) {
            // Update scene elements (e.g., camera position based on mouse)
            sceneManager.update(deltaTime, elapsedTime, { mouseX, mouseY });
            // Pass time and audio data to update shader uniforms
            sceneManager.updateShaderUniforms({ u_time: elapsedTime, u_frequency: audioFrequency });
        }
        // AudioManager might have internal updates if needed (e.g., smoothing audio data)
        // if (audioManager) audioManager.update(deltaTime);
        // GuiManager typically doesn't need updates within the loop

        // --- Render --- 
        // Render the scene through the post-processing pipeline
        if (postProcessor) {
            postProcessor.render(); 
        } else if (sceneManager) {
            // Fallback: Render directly if post-processor failed to initialize
            sceneManager.getRenderer().render(sceneManager.getScene(), sceneManager.getCamera());
        }
    }
    animate(); // Start the loop
}

// --- Start the application --- 
// Ensure DOM is ready or run after DOMContentLoaded if necessary, though modules handle DOM appending.
init();
