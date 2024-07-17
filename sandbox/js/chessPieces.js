import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { CHESS_PIECE_RADIUS, CHESS_PIECE_HEIGHT, MIN_PIECE_HEIGHT } from './constants.js';

export let chessPieces = [];

export function createChessPieces(scene) {
    const pieceGeometry = new THREE.CylinderGeometry(CHESS_PIECE_RADIUS, CHESS_PIECE_RADIUS, CHESS_PIECE_HEIGHT, 32);
    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const blackMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

    for (let i = 0; i < 6; i++) {
        const x = (i % 3) * 2 - 2;
        const z = Math.floor(i / 3) * 2 - 1;
        const color = i < 3 ? whiteMaterial : blackMaterial;
        const piece = new THREE.Mesh(pieceGeometry, color);
        piece.position.set(x, CHESS_PIECE_HEIGHT / 2, z);
        piece.castShadow = true;
        piece.receiveShadow = true;
        piece.userData.velocity = new THREE.Vector3();
        scene.add(piece);
        chessPieces.push(piece);
    }
}

export function updateChessPieces() {
    const damping = 0.95;
    const minVelocity = 0.001;

    chessPieces.forEach(piece => {
        piece.position.add(piece.userData.velocity);
        piece.position.y = Math.max(piece.position.y, MIN_PIECE_HEIGHT);
        piece.userData.velocity.multiplyScalar(damping);

        if (piece.userData.velocity.length() < minVelocity) {
            piece.userData.velocity.set(0, 0, 0);
        }

        const bound = 9.7;
        if (Math.abs(piece.position.x) > bound) {
            piece.position.x = Math.sign(piece.position.x) * bound;
            piece.userData.velocity.x *= -0.5;
        }
        if (Math.abs(piece.position.z) > bound) {
            piece.position.z = Math.sign(piece.position.z) * bound;
            piece.userData.velocity.z *= -0.5;
        }
    });

    // Chess piece collision detection
    for (let i = 0; i < chessPieces.length; i++) {
        for (let j = i + 1; j < chessPieces.length; j++) {
            const pieceA = chessPieces[i];
            const pieceB = chessPieces[j];
            const distance = pieceA.position.distanceTo(pieceB.position);
            if (distance < CHESS_PIECE_RADIUS * 2) {
                const normal = new THREE.Vector3().subVectors(pieceB.position, pieceA.position).normalize();
                const relativeVelocity = new THREE.Vector3().subVectors(pieceB.userData.velocity, pieceA.userData.velocity);
                const impulse = normal.dot(relativeVelocity) * 0.5;
                pieceA.userData.velocity.add(normal.clone().multiplyScalar(impulse));
                pieceB.userData.velocity.sub(normal.clone().multiplyScalar(impulse));

                const overlap = CHESS_PIECE_RADIUS * 2 - distance;
                const separationVector = normal.clone().multiplyScalar(overlap * 0.5);
                pieceA.position.sub(separationVector);
                pieceB.position.add(separationVector);
            }
        }
    }
}
