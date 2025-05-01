import * as THREE from 'three';
import vertexShader from '../../shaders/vertex.glsl';
import fragmentShader from '../../shaders/fragment.glsl';
import ParticleEffect from '../effects/ParticleEffect';

/**
 * Manages the core Three.js scene setup, including the scene graph,
 * camera, renderer, and the primary visualizer mesh.
 */
export default class SceneManager {
    /**
     * Initializes the scene, camera, renderer, and visualizer mesh.
     */
    constructor() {
        /** @type {THREE.Scene} */
        this.scene = new THREE.Scene();
        
        /** @type {THREE.PerspectiveCamera} */
        this.camera = new THREE.PerspectiveCamera(
            45, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        
        /** @type {THREE.WebGLRenderer} */
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        /** 
         * Uniforms for the shader material. These are updated externally 
         * (e.g., by the main loop or GUI callbacks).
         * @type {Object.<string, {type: string, value: any}>}
         */
        this.uniforms = {
            u_time: { type: 'f', value: 0.0 },
            u_frequency: { type: 'f', value: 0.0 },
            u_red: { type: 'f', value: 1.0 }, // Initial value
            u_green: { type: 'f', value: 1.0 }, // Initial value
            u_blue: { type: 'f', value: 1.0 }  // Initial value
        };

        /** @type {THREE.Mesh | null} The main visualizer mesh (Icosahedron) */
        this.mesh = null; 
        /** @type {ParticleEffect | null} The particle effect instance */
        this.particleEffect = null;
        /** @type {string} Name of the currently active visual effect */
        this.activeEffectName = ''; // Will be set by setActiveEffect
        
        this._setupRenderer();
        this._setupCamera();
        this._createVisualizerMesh();
        this._createParticleEffect();
    }

    /**
     * Configures the WebGL renderer and appends its canvas to the DOM.
     * @private
     */
    _setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Ensure correct color output, matching the bloom pass
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        // this.renderer.setClearColor(0x222222); // Optional: set a background color
        document.body.appendChild(this.renderer.domElement);
    }

    /**
     * Sets the initial camera position and orientation.
     * @private
     */
    _setupCamera() {
        this.camera.position.set(0, -2, 14); // Position the camera
        this.camera.lookAt(0, 0, 0); // Point the camera at the scene center
        // Note: The AudioListener is added in AudioManager, passing this camera.
    }

    /**
     * Creates the Icosahedron mesh with the custom shader material.
     * @private
     */
    _createVisualizerMesh() {
        // Define the material using the imported shader code and uniforms
        const mat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,   // Imported GLSL code
            fragmentShader: fragmentShader, // Imported GLSL code
            wireframe: true // Render as wireframe
        });

        // Create the geometry (Icosahedron with more detail)
        const geo = new THREE.IcosahedronGeometry(3, 30); // Radius 4, detail level 30
        this.mesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.mesh);
    }

    /**
     * Creates the particle effect instance.
     * @private
     */
    _createParticleEffect() {
        this.particleEffect = new ParticleEffect(this.scene, { particleCount: 15000 }); // Pass the scene and options
    }

    /**
     * Sets the active visual effect by controlling visibility.
     * @param {string} effectName - The name of the effect to activate ('icosahedron' or 'particles').
     */
    setActiveEffect(effectName) {
        this.activeEffectName = effectName;
        console.log(`SceneManager: Activating effect ${effectName}`);

        if (this.mesh) {
            this.mesh.visible = (effectName === 'icosahedron');
        }
        if (this.particleEffect && this.particleEffect.particles) {
            this.particleEffect.particles.visible = (effectName === 'particles');
        }
    }

    /**
     * Updates scene elements based on time and interaction data.
     * Called in the main animation loop.
     * @param {number} deltaTime Time since the last frame.
     * @param {number} elapsedTime Total time elapsed since start.
     * @param {{mouseX: number, mouseY: number}} interactionData Data from user interactions (e.g., mouse position).
     */
    update(deltaTime, elapsedTime, interactionData) {
        // Example: Smoothly move camera based on normalized mouse coordinates
        if (interactionData) {
            const targetX = interactionData.mouseX;
            const targetY = -interactionData.mouseY -2; // Offset Y slightly
            // Use lerp for smoother camera movement
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.05);
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.05);
            this.camera.lookAt(this.scene.position); // Keep looking at the center
        }
        
        // Update the time uniform for shader animations
        // Frequency and color uniforms are updated via updateShaderUniforms
        // this.uniforms.u_time.value = elapsedTime;

        // Update the active visual effect
        const audioFrequency = this.uniforms.u_frequency.value;
        if (this.activeEffectName === 'icosahedron' && this.mesh) {
            // The mesh update is handled by the shader uniforms automatically (u_time, u_frequency)
            // No specific update call needed here for the mesh itself, unless you add more logic
        } else if (this.activeEffectName === 'particles' && this.particleEffect) {
            this.particleEffect.update(deltaTime, elapsedTime, audioFrequency);
        }
    }

    /**
     * Updates specific shader uniforms.
     * Called from main.js with data from AudioManager or GuiManager.
     * @param {Object.<string, number>} newUniforms An object containing uniform values to update.
     */
    updateShaderUniforms(newUniforms) {
        if (newUniforms.u_time !== undefined) {
             this.uniforms.u_time.value = newUniforms.u_time;
        }
        if (newUniforms.u_frequency !== undefined) {
             // Add safety check for NaN or invalid values from audio analysis
            this.uniforms.u_frequency.value = Number.isFinite(newUniforms.u_frequency) ? newUniforms.u_frequency : 0.0;

            // Also update the particle effect when frequency changes (if needed immediately)
            // Note: The main update loop already handles passing frequency to particleEffect.update
            // This line might be redundant depending on desired responsiveness vs performance.
            // if (this.particleEffect) {
            //     this.particleEffect.update(0, this.uniforms.u_time.value, this.uniforms.u_frequency.value); 
            // }
        }
        if (newUniforms.u_red !== undefined) {
            this.uniforms.u_red.value = newUniforms.u_red;
        }
        if (newUniforms.u_green !== undefined) {
            this.uniforms.u_green.value = newUniforms.u_green;
        }
        if (newUniforms.u_blue !== undefined) {
            this.uniforms.u_blue.value = newUniforms.u_blue;
        }
    }

    /**
     * Handles window resize events by updating camera aspect ratio and renderer size.
     */
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Removed render() method - rendering is handled by PostProcessor
    
    /**
     * Gets the THREE.Camera instance.
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Gets the THREE.WebGLRenderer instance.
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }
    
    /**
     * Gets the THREE.Scene instance.
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Cleans up resources, including the particle effect.
     */
    dispose() {
        // Dispose existing mesh geometry and material if they exist
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                // If ShaderMaterial, dispose uniforms if necessary (textures, etc.)
                if (this.mesh.material instanceof THREE.ShaderMaterial) {
                    // Assuming no complex uniforms like textures for now
                }
                this.mesh.material.dispose();
            }
            this.scene.remove(this.mesh);
        }
        
        // Dispose particle effect
        if (this.particleEffect) {
            this.particleEffect.dispose();
        }
        
        // Dispose renderer if needed (though typically managed elsewhere)
        // if (this.renderer) {
        //     this.renderer.dispose();
        // }
        
        console.log("SceneManager disposed.");
    }
} 