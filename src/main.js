// main.js
// Three.js script to animate points and arrows

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Initial setup of scene, camera, and renderer
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(document.getElementById('animationBox').clientWidth, document.getElementById('animationBox').clientHeight);
document.getElementById('animationBox').appendChild(renderer.domElement);

// Set the camera position
camera.position.set(5, 5, 5);
camera.lookAt(scene.position);

// Adding OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Adding Lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Helpers
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Function to create a point
function createPoint(x, y, color = 0xff0000) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, 0);
    return sphere;
}

// Function to create a curved path for the arrow
function createArchPath(startX, startY, endX, endY) {
    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, startY, 0),
        new THREE.Vector3((startX + endX) / 2, (startY + endY) / 2, Math.random() * 2 + 1),
        new THREE.Vector3(endX, endY, 0)
    );
    return curve;
}

// Function to create an arrow with a 3D arching effect
function createArrow(startX, startY, endX, endY, color = 0x0000ff) {
    const path = createArchPath(startX, startY, endX, endY);
    const geometry = new THREE.TubeGeometry(path, 20, 0.05, 8, false);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.material.transparent = true;
    return mesh;
}

// Function to handle the fade out animation
function fadeOutObject(object, callback) {
    let opacity = 1, step = 0.01;
    const fade = () => {
        if (opacity <= 0) {
            scene.remove(object);
            if (callback) callback();
        } else {
            requestAnimationFrame(fade);
            object.material.opacity = opacity;
            opacity -= step;
        }
    };
    fade();
}

// Function to animate a point and an arrow
function animatePointAndArrow(startX, startY, endX, endY) {
    const point = createPoint(startX, startY);
    const arrow = createArrow(startX, startY, endX, endY);

    scene.add(point);
    scene.add(arrow);

    // Fade out after 5 seconds
    setTimeout(() => {
        fadeOutObject(point);
        fadeOutObject(arrow);
    }, 5000);
}

// Function to load points from the JSON file and animate them
function loadAndAnimatePoints() {
    fetch('data/points.json')
        .then(response => response.json())
        .then(points => {
            points.forEach((point, index) => {
                setTimeout(() => {
                    animatePointAndArrow(point.start_x, point.start_y, point.end_x, point.end_y);
                }, index * 500); // Half-second interval between animations
            });
        });
}

// Starting the animation sequence
loadAndAnimatePoints();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
