import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, camera, renderer } from './scene.js';
import { chessPieces } from './chessPieces.js';

export let activeInteractions = new Map();
export let selectedPiece = null;
export const raycaster = new THREE.Raycaster();

let lastInteractionPoint = null;
let interactionDirection = new THREE.Vector2();

export function initInteractions() {
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mouseup', onMouseUp, false);
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);
}

function onMouseDown(event) {
    event.preventDefault();
    const interactionPoint = getInteractionPoint(event.clientX, event.clientY);
    activeInteractions.set('mouse', interactionPoint);
    lastInteractionPoint = interactionPoint;
    checkPieceSelection(interactionPoint);
}

function onMouseMove(event) {
    event.preventDefault();
    if (activeInteractions.has('mouse')) {
        const interactionPoint = getInteractionPoint(event.clientX, event.clientY);
        if (lastInteractionPoint) {
            interactionDirection.subVectors(interactionPoint, lastInteractionPoint).normalize();
        }
        activeInteractions.set('mouse', interactionPoint);
        movePiece(interactionPoint);
        lastInteractionPoint = interactionPoint;
    }
}

function onMouseUp(event) {
    event.preventDefault();
    activeInteractions.delete('mouse');
    selectedPiece = null;
    lastInteractionPoint = null;
}

function onTouchStart(event) {
    event.preventDefault();
    for (let touch of event.changedTouches) {
        const interactionPoint = getInteractionPoint(touch.clientX, touch.clientY);
        activeInteractions.set(touch.identifier, interactionPoint);
        lastInteractionPoint = interactionPoint;
        checkPieceSelection(interactionPoint);
    }
}

function onTouchMove(event) {
    event.preventDefault();
    for (let touch of event.changedTouches) {
        if (activeInteractions.has(touch.identifier)) {
            const interactionPoint = getInteractionPoint(touch.clientX, touch.clientY);
            if (lastInteractionPoint) {
                interactionDirection.subVectors(interactionPoint, lastInteractionPoint).normalize();
            }
            activeInteractions.set(touch.identifier, interactionPoint);
            movePiece(interactionPoint);
            lastInteractionPoint = interactionPoint;
        }
    }
}

function onTouchEnd(event) {
    event.preventDefault();
    for (let touch of event.changedTouches) {
        activeInteractions.delete(touch.identifier);
    }
    selectedPiece = null;
    lastInteractionPoint = null;
}

function getInteractionPoint(clientX, clientY) {
    return new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
    );
}

function checkPieceSelection(interactionPoint) {
    raycaster.setFromCamera(interactionPoint, camera);
    const intersects = raycaster.intersectObjects(chessPieces);
    if (intersects.length > 0) {
        selectedPiece = intersects[0].object;
    }
}

function movePiece(interactionPoint) {
    if (selectedPiece) {
        raycaster.setFromCamera(interactionPoint, camera);
        const intersects = raycaster.intersectObject(scene.children[2]); // Ground plane
        if (intersects.length > 0) {
            const targetPosition = intersects[0].point;
            targetPosition.y = selectedPiece.position.y;
            const direction = new THREE.Vector3().subVectors(targetPosition, selectedPiece.position);
            selectedPiece.userData.velocity.copy(direction.normalize().multiplyScalar(0.1));
        }
    }
}

export function getInteractionInfo() {
    if (activeInteractions.size > 0) {
        const interactionPoint = activeInteractions.values().next().value;
        raycaster.setFromCamera(interactionPoint, camera);
        const intersect = raycaster.intersectObject(scene.children[2])[0];
        if (intersect) {
            // 修正这里：将 y 分量取反
            return {
                point: intersect.point,
                direction: new THREE.Vector3(interactionDirection.x, 0, -interactionDirection.y).normalize()
            };
        }
    }
    return null;
}
