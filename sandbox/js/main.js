import { initScene, animate } from './scene.js';
import { initInteractions } from './interactions.js';

function init() {
    try {
        initScene();
        initInteractions();
        animate();
    } catch (error) {
        console.error("Initialization failed:", error);
        document.body.innerHTML = `<div style="color: white; background: black; padding: 20px;">
            <h1>WebGL Initialization Failed</h1>
            <p>Your browser might not support WebGL or WebGL2. Please try using a modern browser.</p>
            <p>Error details: ${error.message}</p>
        </div>`;
    }
}

init();
