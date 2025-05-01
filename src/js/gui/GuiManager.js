import { GUI } from 'dat.gui';

/**
 * Manages the dat.gui interface for controlling visual parameters.
 * It takes initial parameters and callbacks to notify other modules of changes.
 */
export default class GuiManager {
    /**
     * Creates a GuiManager instance and sets up the GUI controls.
     * @param {object} params - An object containing the initial values for the GUI controls.
     * @param {object} callbacks - An object containing callback functions to execute when GUI values change.
     * @param {function(object): void} callbacks.onColorChange - Called when color parameters change.
     * @param {function(object): void} callbacks.onBloomChange - Called when bloom parameters change.
     */
    constructor(params, callbacks) {
        /** @type {GUI} The dat.gui instance */
        this.gui = new GUI();
        /** @type {object} Local copy or reference to the parameters controlled by the GUI */
        this.params = params; // Store initial parameters
        /** @type {object} Callbacks to invoke on parameter changes */
        this.callbacks = callbacks; // Store callbacks for updates

        this._setupColorControls();
        this._setupBloomControls();
    }

    /**
     * Sets up the dat.gui controls for color parameters.
     * @private
     */
    _setupColorControls() {
        const colorsFolder = this.gui.addFolder('Colors');
        // Link GUI control for 'red' to params.red
        colorsFolder.add(this.params, 'red', 0, 1).name('Red').onChange((value) => {
            // When the slider changes, call the registered callback
            if (this.callbacks.onColorChange) {
                this.callbacks.onColorChange({ u_red: Number(value) }); // Pass updated value
            }
        });
         // Link GUI control for 'green' to params.green
        colorsFolder.add(this.params, 'green', 0, 1).name('Green').onChange((value) => {
            if (this.callbacks.onColorChange) {
                this.callbacks.onColorChange({ u_green: Number(value) });
            }
        });
         // Link GUI control for 'blue' to params.blue
        colorsFolder.add(this.params, 'blue', 0, 1).name('Blue').onChange((value) => {
            if (this.callbacks.onColorChange) {
                this.callbacks.onColorChange({ u_blue: Number(value) });
            }
        });
        // colorsFolder.open(); // Optional: Keep the folder open by default
    }

    /**
     * Sets up the dat.gui controls for bloom effect parameters.
     * @private
     */
    _setupBloomControls() {
        const bloomFolder = this.gui.addFolder('Bloom');
         // Link GUI control for 'threshold' to params.threshold
        bloomFolder.add(this.params, 'threshold', 0, 1).name('Threshold').onChange((value) => {
            if (this.callbacks.onBloomChange) {
                this.callbacks.onBloomChange({ threshold: Number(value) });
            }
        });
         // Link GUI control for 'strength' to params.strength
        bloomFolder.add(this.params, 'strength', 0, 3).name('Strength').onChange((value) => {
            if (this.callbacks.onBloomChange) {
                this.callbacks.onBloomChange({ strength: Number(value) });
            }
        });
         // Link GUI control for 'radius' to params.radius
        bloomFolder.add(this.params, 'radius', 0, 1).name('Radius').onChange((value) => {
            if (this.callbacks.onBloomChange) {
                this.callbacks.onBloomChange({ radius: Number(value) });
            }
        });
        // bloomFolder.open(); // Optional: Keep the folder open by default
    }

    // Optional: Method to hide/show GUI
    // toggleVisibility() { ... }
} 