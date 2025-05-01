import * as THREE from 'three';

/**
 * Manages a particle system visual effect based on audio input.
 * Simulates particles dancing on a surface, like sand on a speaker.
 */
export default class ParticleEffect {
    /**
     * @param {THREE.Scene} scene - The main Three.js scene to add particles to.
     * @param {object} options - Configuration options for the particle effect.
     * @param {number} [options.particleCount=10000] - The number of particles to create.
     * @param {number} [options.radius=5] - The radius of the circular area for particles.
     * @param {number} [options.particleSize=0.05] - The size of each particle.
     * @param {number} [options.maxKickForce=10] - Maximum upward force applied based on audio frequency.
     * @param {number} [options.gravity=-9.8] - Gravity force applied to particles.
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        // Apply defaults if options are not provided
        this.particleCount = options.particleCount || 10000;
        this.radius = options.radius || 5; 
        this.particleSize = options.particleSize || 0.05;
        this.maxKickForce = options.maxKickForce || 10; // Controls jump height sensitivity
        this.gravity = options.gravity || -9.8;        // Controls how fast particles fall

        this.particles = null; 
        this.geometry = null; 
        this.material = null; 

        // Array to store particle velocities (only Y-velocity needed for simple vertical jump)
        this.velocities = new Float32Array(this.particleCount); 

        this._createParticles();
    }

    /**
     * Creates the particle system geometry, material, and THREE.Points object.
     * Particles are distributed randomly within a circle on the XZ plane.
     * @private
     */
    _createParticles() {
        console.log('Creating particle effect with', this.particleCount, 'particles...');

        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3); // x, y, z

        // Initialize positions within a circle on the XZ plane (y=0)
        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Distribute points more evenly within the circle using sqrt(random)
            const r = this.radius * Math.sqrt(Math.random()); 
            
            positions[i * 3] = Math.cos(angle) * r;       // x
            positions[i * 3 + 1] = 0;                      // y (start on the plane)
            positions[i * 3 + 2] = Math.sin(angle) * r;       // z

            // Initialize Y velocity to 0
            this.velocities[i] = 0; 
        }
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Add velocities as a custom attribute if we move to ShaderMaterial later
        // this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 1)); 

        this.material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: this.particleSize,
            transparent: true,
            opacity: 0.8,
            // sizeAttenuation: true // Make particles smaller further away (optional)
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        console.log('Particle effect created and added to scene.');
    }

    /**
     * Updates the particle positions based on simulated physics (gravity) 
     * and audio frequency (upward kicks).
     * Called in the main animation loop.
     * @param {number} deltaTime Time since the last frame.
     * @param {number} elapsedTime Total time elapsed since start.
     * @param {number} audioFrequency Current average audio frequency (typically 0-255).
     */
    update(deltaTime, elapsedTime, audioFrequency) {
        if (!this.geometry || !this.geometry.attributes.position) {
            return; // Exit if geometry is not ready
        }

        const positions = this.geometry.attributes.position.array;
        
        // Normalize frequency influence (0 to 1) - Adjust divisor (e.g., 80) based on testing
        // Lower divisor = more sensitive to lower frequencies
        const freqInfluence = Math.min(Math.max(audioFrequency / 80.0, 0), 1.0); 
        const currentKickStrength = this.maxKickForce * freqInfluence;
        
        // Threshold to trigger a kick - only kick if frequency is somewhat significant
        const kickThreshold = 0.1; // Corresponds to audioFrequency > 8 in this case

        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3; // Base index for this particle's position (x, y, z)
            const yIdx = idx + 1; // Index for the y-coordinate
            const velIdx = i;     // Index for the y-velocity

            // 1. Apply Gravity to velocity
            this.velocities[velIdx] += this.gravity * deltaTime;

            // 2. Update position based on velocity
            positions[yIdx] += this.velocities[velIdx] * deltaTime;

            // 3. Check for collision with the "floor" (y=0)
            if (positions[yIdx] <= 0) {
                positions[yIdx] = 0; // Reset position to floor

                // If there's enough audio frequency, apply an upward kick
                if (freqInfluence > kickThreshold) {
                    // Apply kick - add some randomness to make it look more natural
                    this.velocities[velIdx] = currentKickStrength * (0.5 + Math.random() * 0.5);
                } else {
                    // Otherwise, stop the particle on the floor
                    this.velocities[velIdx] = 0; 
                }
            }
        }

        // Important: Mark the position attribute as needing update for Three.js
        this.geometry.attributes.position.needsUpdate = true; 
    }

    /**
     * Cleans up resources when the effect is no longer needed.
     */
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
        }
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        // Clear the velocities array
        this.velocities = new Float32Array(0); 
        console.log('Particle effect disposed.');
    }
} 