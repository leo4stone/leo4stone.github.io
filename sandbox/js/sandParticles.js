import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SAND_DEPTH, GROUND_SIZE } from './constants.js';
import { getInteractionInfo } from './interactions.js';
import { scene } from './scene.js';

let sandParticles;
const PARTICLE_COUNT = 1500000;
const PARTICLE_SIZE = 0.02;
const INTERACTION_WIDTH = 1.0;
const INTERACTION_LENGTH = 2.0;
const MOUSE_FORCE_FACTOR = 0.03;
const GRAVITY = 0.004;
const MAX_VELOCITY = 0.05;
const DAMPING = 0.99;
const PHYSICS_UPDATE_INTERVAL = 2;

const GRID_SIZE = 1;
const GRID_DIVISIONS = Math.ceil(GROUND_SIZE / GRID_SIZE);
let grid = [];

let physicsUpdateCounter = 0;

const vertexShader = `
    attribute vec3 velocity;
    varying vec3 vColor;
    void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = ${PARTICLE_SIZE} * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 0.9);
    }
`;

function initGrid() {
    grid = new Array(GRID_DIVISIONS * GRID_DIVISIONS);
    for (let i = 0; i < grid.length; i++) {
        grid[i] = [];
    }
}

function updateGrid(positions) {
    for (let i = 0; i < grid.length; i++) {
        grid[i].length = 0;
    }

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const gridX = Math.floor((x + GROUND_SIZE / 2) / GRID_SIZE);
        const gridZ = Math.floor((z + GROUND_SIZE / 2) / GRID_SIZE);
        const gridIndex = gridZ * GRID_DIVISIONS + gridX;
        if (gridIndex >= 0 && gridIndex < grid.length) {
            grid[gridIndex].push(i);
        }
    }
}

export function createSandParticles(scene) {
    initGrid();

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        positions[i] = Math.random() * GROUND_SIZE - GROUND_SIZE / 2;
        positions[i + 1] = Math.random() * SAND_DEPTH;
        positions[i + 2] = Math.random() * GROUND_SIZE - GROUND_SIZE / 2;

        colors[i] = 0.94 + Math.random() * 0.06;
        colors[i + 1] = 0.9 + Math.random() * 0.1;
        colors[i + 2] = 0.55 + Math.random() * 0.05;

        velocities[i] = 0;
        velocities[i + 1] = 0;
        velocities[i + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        vertexColors: true,
        transparent: true
    });

    sandParticles = new THREE.Points(geometry, material);
    scene.add(sandParticles);
}

export function updateSandParticles(scene) {
    if (!sandParticles || !sandParticles.geometry) {
        console.error('Sand particles or its geometry is not initialized');
        return;
    }

    const positions = sandParticles.geometry.attributes.position.array;
    const velocities = sandParticles.geometry.attributes.velocity.array;

    physicsUpdateCounter++;

    if (physicsUpdateCounter >= PHYSICS_UPDATE_INTERVAL) {
        physicsUpdateCounter = 0;

        updateGrid(positions);

        // User interaction
        const interactionInfo = getInteractionInfo();
        if (interactionInfo) {
            const { point, direction } = interactionInfo;
            const perpDirection = new THREE.Vector3(-direction.z, 0, direction.x);

            const gridX = Math.floor((point.x + GROUND_SIZE / 2) / GRID_SIZE);
            const gridZ = Math.floor((point.z + GROUND_SIZE / 2) / GRID_SIZE);

            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const checkGridX = gridX + dx;
                    const checkGridZ = gridZ + dz;
                    if (checkGridX >= 0 && checkGridX < GRID_DIVISIONS && checkGridZ >= 0 && checkGridZ < GRID_DIVISIONS) {
                        const gridIndex = checkGridZ * GRID_DIVISIONS + checkGridX;
                        const cellParticles = grid[gridIndex];
                        for (let particleIndex of cellParticles) {
                            const x = positions[particleIndex] - point.x;
                            const z = positions[particleIndex + 2] - point.z;
                            const distanceSq = x * x + z * z;

                            if (distanceSq < INTERACTION_WIDTH * INTERACTION_WIDTH) {
                                const force = MOUSE_FORCE_FACTOR * (1 - Math.sqrt(distanceSq) / INTERACTION_WIDTH);
                                velocities[particleIndex] += direction.x * force;
                                velocities[particleIndex + 1] -= force * 0.5;
                                velocities[particleIndex + 2] += direction.z * force;
                            }
                        }
                    }
                }
            }
        }

        // Update positions and apply physics
        for (let i = 0; i < positions.length; i += 3) {
            // Simplified velocity update
            velocities[i] *= DAMPING;
            velocities[i + 1] *= DAMPING;
            velocities[i + 2] *= DAMPING;

            velocities[i + 1] -= GRAVITY;

            // Apply velocity limits
            const speed = Math.sqrt(velocities[i] * velocities[i] + velocities[i + 1] * velocities[i + 1] + velocities[i + 2] * velocities[i + 2]);
            if (speed > MAX_VELOCITY) {
                const scale = MAX_VELOCITY / speed;
                velocities[i] *= scale;
                velocities[i + 1] *= scale;
                velocities[i + 2] *= scale;
            }

            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            // Simplified boundary check
            const bound = GROUND_SIZE / 2;
            if (positions[i + 1] < 0) positions[i + 1] = 0;
            if (Math.abs(positions[i]) > bound) positions[i] = Math.sign(positions[i]) * bound;
            if (Math.abs(positions[i + 2]) > bound) positions[i + 2] = Math.sign(positions[i + 2]) * bound;
        }

        sandParticles.geometry.attributes.position.needsUpdate = true;
        sandParticles.geometry.attributes.velocity.needsUpdate = true;
    }
}
