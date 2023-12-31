// main.js
// Three.js script to animate points and arrows

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Initial setup of scene, camera, and renderer
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(document.getElementById('animationBox').clientWidth, document.getElementById('animationBox').clientHeight);
renderer.setClearColor(0x000000); // Initial background color (black for night)
document.getElementById('animationBox').appendChild(renderer.domElement);

// Global variable to toggle camera mode
var isFixedCamera = true; // Set to true for fixed camera, false for free cam

// Constants for scaling
const scaleX = 1000; // Adjust these based on your scene
const scaleZ = 1000;

// Center coordinates (latitude and longitude)
const centerLat = 30.267487662162164;
const centerLong = -97.74193387837838;

// Define cutoff distances
const shortCutoffDistanceKm = 0.9069817439015526; // Short distance cutoff in kilometers
const highCutoffDistanceKm = 3.61510003190158; // High distance cutoff in kilometers

const degreesPerKm = 1 / 111; // Roughly 111 km per degree of latitude
const shortCutoffDistanceDegrees = shortCutoffDistanceKm * degreesPerKm;
const shortCutoffDistanceSceneScale = shortCutoffDistanceDegrees * scaleX; // Apply the same scaling used for latitude/longitude to scene conversion
const highCutoffDistanceDegrees = highCutoffDistanceKm * degreesPerKm;
const highCutoffDistanceSceneScale = highCutoffDistanceDegrees * scaleX; // Apply the same scaling used for latitude/longitude to scene conversion

// Function to convert lat/long to scene coordinates with an offset
function latLongToScene(lat, long, offsetX, offsetZ) {
    const x = (long - centerLong) * scaleX - offsetX;
    const z = (lat - centerLat) * scaleZ - offsetZ;
    return { x, z };
}

// Calculate the offset based on the center coordinates
const centerOffset = latLongToScene(centerLat, centerLong, 0, 0);

// Set the camera position
camera.position.set(30, 30, 30);
camera.lookAt(0, 0, 0); // Look at the origin

// Setup OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // Set the target to the origin
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
// const gridHelper = new THREE.GridHelper(10, 10);
// scene.add(gridHelper);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

// Function to handle the fade out animation
function fadeOutObject(object, callback) {
    let opacity = 1;
    const step = 0.03; // Increase this value for faster fading

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
    
    // Use an exponential function to calculate the arch height
    // Adjust the exponent and coefficient as needed for desired effect
    const archHeight = Math.min(Math.pow(distance, 1.5) * 0.1, 30); // Limits the height to a maximum value

    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3((startX + endX) / 2, archHeight, (startZ + endZ) / 2), // Control point with dynamic Y value
        new THREE.Vector3(endX, 0, endZ)
    );
    return curve;
}

// Function to create a straight line
function createStraightLine(startX, startZ, endX, endZ, color = 0x6495ED) {
    const path = new THREE.LineCurve3(
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3(endX, 0, endZ)
    );
    const geometry = new THREE.TubeGeometry(path, 20, 0.05, 8, false); // Adjust the 0.05 thickness as needed
    const material = new THREE.MeshBasicMaterial({ color });
    const line = new THREE.Mesh(geometry, material);
    return line;
}

// Function to create an arrow with a 3D arching effect
function createArrow(startX, startZ, endX, endZ, color = 0xFFFACD) {
    const path = createArchPath(startX, startZ, endX, endZ);
    const geometry = new THREE.TubeGeometry(path, 20, 0.05, 8, false);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.material.transparent = true;
    return mesh;
}


function createHighArchArrow(startX, startZ, endX, endZ, color = 0xDC143C) {
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));

    // Reduced arch height for the high arch arrow
    const archHeight = Math.min(Math.pow(distance, 1.8) * 0.03, 40); // Adjust this for the desired effect

    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3((startX + endX) / 2, archHeight, (startZ + endZ) / 2),
        new THREE.Vector3(endX, 0, endZ)
    );

    const geometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.material.transparent = true;
    return mesh;
}

// Function to animate a point and an arrow using lat/long
function animatePointAndArrow(startLat, startLong, endLat, endLong) {
    const startCoords = latLongToScene(startLat, startLong, centerOffset.x, centerOffset.z);
    const endCoords = latLongToScene(endLat, endLong, centerOffset.x, centerOffset.z);

    const startPoint = createPoint(startCoords.x, startCoords.z);
    const endPoint = createPoint(endCoords.x, endCoords.z);
    
    const distance = Math.sqrt(Math.pow(endCoords.x - startCoords.x, 2) + Math.pow(endCoords.z - startCoords.z, 2));
    
    let arrow;
    if (distance < shortCutoffDistanceSceneScale) {
        console.log(`Creating a straight line for short distance: ${distance}`);
        arrow = createStraightLine(startCoords.x, startCoords.z, endCoords.x, endCoords.z);
    } else if (distance < highCutoffDistanceSceneScale) {
        console.log(`Creating a medium arch for medium distance: ${distance}`);
        arrow = createArrow(startCoords.x, startCoords.z, endCoords.x, endCoords.z);
    } else {
        console.log(`Creating a high arch for long distance: ${distance}`);
        arrow = createHighArchArrow(startCoords.x, startCoords.z, endCoords.x, endCoords.z);
    }

    scene.add(startPoint);
    scene.add(endPoint);
    scene.add(arrow);

    setTimeout(() => {
        fadeOutObject(startPoint);
        fadeOutObject(endPoint);
        fadeOutObject(arrow);
    }, 500);
}

// Function to load kiosk paths from the JSON file and animate them in batches
function loadAndAnimateKioskPaths() {
    fetch('data/processed/kiosk_vis_paths.json')
        .then(response => response.json())
        .then(paths => {
            console.log("Loaded Kiosk Paths:", paths);

            // Define the size of each batch and initialize variables
            const batchSize = 73;
            let batchIndex = 0;

            // Function to process each batch
            const processBatch = () => {
                const start = batchIndex * batchSize;
                const end = start + batchSize;
                const batchPaths = paths.slice(start, end);

                batchPaths.forEach(path => {
                    animatePointAndArrow(path.Start_Lat, path.Start_Long, path.End_Lat, path.End_Long);
                });

                batchIndex++;

                // Check if there are more batches to process
                if (batchIndex * batchSize < paths.length) {
                    // Set timeout for the next batch
                    setTimeout(processBatch, 1000); // Adjust the timeout as needed
                }
            };

            // Start processing the first batch
            processBatch();
        })
        .catch(error => {
            console.error("Error loading kiosk paths:", error);
        });
}

// Function to create and add a kiosk object to the scene
function addKiosk(lat, long, color = 0x00ff00) {
    lat = parseFloat(lat);
    long = parseFloat(long);
    const { x, z } = latLongToScene(lat, long, centerOffset.x, centerOffset.z);

    // Define the geometry for the kiosk
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshLambertMaterial({ color });
    const kiosk = new THREE.Mesh(geometry, material);

    // Set the position of the kiosk with the offset
    kiosk.position.set(x, 0, z);

    // Add the kiosk to the scene
    scene.add(kiosk);
}

// Function to load kiosk points from a JSON file and add them to the scene
function loadAndAddKiosks() {
    fetch('data/processed/kiosk_coords.json')
        .then(response => response.json())
        .then(kiosks => {
            console.log("Loaded Kiosks:", kiosks);

            kiosks.forEach(kiosk => {
                // Convert latitude and longitude to x and z coordinates
                addKiosk(kiosk.latitude, kiosk.longitude);
            });
        })
        .catch(error => {
            console.error("Error loading kiosks:", error);
        });
}

// Call the loadAndAddKiosks function to add kiosks to the scene
loadAndAddKiosks();

// Starting the animation sequence with a 5-second delay
setTimeout(() => {
    loadAndAnimateKioskPaths();
}, 5000);

// Updated animation loop with day/night cycle
function animate() {
    requestAnimationFrame(animate);

    // Update camera for fixed camera mode
    if (isFixedCamera) {
        angle += 0.0025;
        const radius = 35;
        camera.position.x = radius * Math.cos(angle);
        camera.position.z = radius * Math.sin(angle);
    }

    camera.lookAt(0, 0, 0); // Keep camera focused on center

    controls.update(); // Update controls

    renderer.render(scene, camera);
}

animate();