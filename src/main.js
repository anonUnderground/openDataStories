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
camera.position.set(15, 15, 15);
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

// Define a variable for the rotation angle
let angle = 0;

// Helpers
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Function to create a point on the X-Z plane
function createPoint(x, z, color = 0xff0000) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, 0, z);
    return sphere;
}

// Function to create a curved path for the arrow with arch height based on distance
function createArchPath(startX, startZ, endX, endZ) {
    // Calculate the distance between the start and end points
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));
    
    // Set the height of the arch proportional to the distance (you can adjust the factor)
    const archHeight = Math.min(distance * 0.5, 10); // Limits the height to a maximum value

    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3((startX + endX) / 2, archHeight, (startZ + endZ) / 2), // Control point with dynamic Y value
        new THREE.Vector3(endX, 0, endZ)
    );
    return curve;
}

// Function to create an arrow with a 3D arching effect
function createArrow(startX, startZ, endX, endZ, color = 0x0000ff) {
    const path = createArchPath(startX, startZ, endX, endZ);
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
function animatePointAndArrow(startX, startZ, endX, endZ) {
    const startPoint = createPoint(startX, startZ);
    const endPoint = createPoint(endX, endZ); // Create a point at the end coordinates
    const arrow = createArrow(startX, startZ, endX, endZ);

    scene.add(startPoint);
    scene.add(endPoint); // Add the end point to the scene
    scene.add(arrow);

    console.log(`Added points and arrow: start (${startX}, ${startZ}), end (${endX}, ${endZ})`);

    // Fade out after 5 seconds
    setTimeout(() => {
        fadeOutObject(startPoint);
        fadeOutObject(endPoint);
        fadeOutObject(arrow);
    }, 5000);
}

// Function to load points from the JSON file and animate them
function loadAndAnimatePoints() {
    fetch('data/points.json')
        .then(response => response.json())
        .then(points => {
            console.log("Loaded Points:", points); // Print the JSON data to the console

            points.forEach((point, index) => {
                setTimeout(() => {
                    animatePointAndArrow(point.start_x, point.start_z, point.end_x, point.end_z);
                }, index * 500); // Half-second interval between animations
            });
        })
        .catch(error => {
            console.error("Error loading points:", error);
        });
}

// Starting the animation sequence
loadAndAnimatePoints();

// Updated animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update the rotation angle
    angle += 0.005; // Adjust the speed of rotation by changing this value

    // Calculate the new camera position
    const radius = 15; // Distance from the origin
    camera.position.x = radius * Math.cos(angle);
    camera.position.z = radius * Math.sin(angle);
    camera.lookAt(scene.position); // Ensure the camera always looks at the origin

    controls.update();
    renderer.render(scene, camera);
}
animate();