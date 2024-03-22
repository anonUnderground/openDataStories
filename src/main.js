// main.js
// Three.js script to animate points and arrows

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

var scene, camera, renderer, controls;
var isFixedCamera = false; // True for fixed camera, false for orbit controls
const scaleX = 1000, scaleZ = 1000;
const centerLat = 30.267487662162164, centerLong = -97.74193387837838;
const shortCutoffDistanceKm = 0.9069817439015526, highCutoffDistanceKm = 3.61510003190158;
const degreesPerKm = 1 / 111;
const shortCutoffDistanceDegrees = shortCutoffDistanceKm * degreesPerKm;
const shortCutoffDistanceSceneScale = shortCutoffDistanceDegrees * scaleX;
const highCutoffDistanceDegrees = highCutoffDistanceKm * degreesPerKm;
const highCutoffDistanceSceneScale = highCutoffDistanceDegrees * scaleX;
let kioskPathsData = [], kioskCoordinatesMap = {}, particlesMap = new Map(), angle = 0;
let globalMaxParticles = 250; // Default value matching the slider
let tripData = []; // Holds data about trips between kiosks
let maxTraffic = 22621; // Holds the maximum traffic value calculated from tripData
let globalMaxTraffic = 22621; // Initial value, adjust as necessary based on your data/logic
let globalMinTripCount = 200;

function safeInit() {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // Directly call init if the DOM is already loaded
        init();
    } else {
        // Otherwise, wait for the DOMContentLoaded event
        document.addEventListener('DOMContentLoaded', init);
    }
}

safeInit();

function init() {
    console.log("Init started");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000); // Set initial background color to black
    const animationBox = document.getElementById('animationBox');
    if (animationBox) {
        animationBox.appendChild(renderer.domElement);
    } else {
        console.error('The animation box was not found.');
        return;
    }

    // Now it's safe to add event listeners directly, assuming init is called after DOMContentLoaded
    const maxParticlesElement = document.getElementById('maxParticles');
    if (maxParticlesElement) {
        maxParticlesElement.addEventListener('input', function() {
            if (!tripData || tripData.length === 0) {
                console.error("tripData is not yet loaded.");
                return;
            }
            globalMaxParticles = parseInt(this.value, 10);
            console.log("Max particles set to:", globalMaxParticles);

            // Clear the scene and redraw with updated maxParticles value
            clearScene();
            createParticlesForPaths(kioskPathsData, tripData, globalMaxTraffic, globalMinTripCount);
        });
    } else {
        console.error('Element with ID "maxParticles" was not found.');
    }

    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    addLighting();
    // loadData function call moved here with promise handling for better flow control
    loadData().then(() => {
        console.log("Data successfully loaded");
        // You can call any setup functions that depend on loaded data here
    }).catch(error => {
        console.error("Error loading data:", error);
    });
    animate();
}

function clearScene() {
    // Example function to clear particles
    particlesMap.forEach((value, particle) => {
        scene.remove(particle);
    });
    particlesMap.clear();
}

function addLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

async function loadData() {
    try {
        const [kioskResponse, tripResponse] = await Promise.all([
            fetch('data/processed/kiosk_vis_paths.json'),
            fetch('data/processed/trips_between_kiosks.json')
        ]);

        const kioskData = await kioskResponse.json();
        tripData = await tripResponse.json(); // Now updating the global variable directly

        kioskPathsData = kioskData;
        mapKioskCoordinates(kioskPathsData);

        // Recalculate MaxTraffic based on the newly loaded tripData
        maxTraffic = tripData.reduce((max, trip) => Math.max(max, trip.Count), 0);

        globalMaxTraffic = maxTraffic;

        // With tripData and maxTraffic updated, proceed to use them as needed
        createParticlesForPaths(kioskPathsData, tripData, globalMaxTraffic, );
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function latLongToScene(lat, long, offsetX, offsetZ) {
    const x = (long - centerLong) * scaleX - offsetX;
    const z = (lat - centerLat) * scaleZ - offsetZ;
    return { x, z };
}

const centerOffset = latLongToScene(centerLat, centerLong, 0, 0);

function animatePointAndArrow(startLat, startLong, endLat, endLong) {
    const startCoords = latLongToScene(startLat, startLong, centerOffset.x, centerOffset.z);
    const endCoords = latLongToScene(endLat, endLong, centerOffset.x, centerOffset.z);
    const distance = Math.sqrt(Math.pow(endCoords.x - startCoords.x, 2) + Math.pow(endCoords.z - startCoords.z, 2));

    // Flat line for short distances
    if (distance < shortCutoffDistanceSceneScale) {
        return new THREE.LineCurve3(new THREE.Vector3(startCoords.x, 0, startCoords.z), new THREE.Vector3(endCoords.x, 0, endCoords.z));
    }
    // Medium archs for distances between the short and high cutoff
    else if (distance >= shortCutoffDistanceSceneScale && distance < highCutoffDistanceSceneScale) {
        const midHeight = Math.min(Math.pow(distance, 1.5) * 0.1, 30); // Adjusted for medium archs
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(startCoords.x, 0, startCoords.z),
            new THREE.Vector3((startCoords.x + endCoords.x) / 2, midHeight, (startCoords.z + endCoords.z) / 2),
            new THREE.Vector3(endCoords.x, 0, endCoords.z)
        );
    }
    // Long archs for longer distances
    else {
        const highMidHeight = Math.min(Math.pow(distance, 1.5) * 0.1, 40); // Higher curve for longer distances
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(startCoords.x, 0, startCoords.z),
            new THREE.Vector3((startCoords.x + endCoords.x) / 2, highMidHeight, (startCoords.z + endCoords.z) / 2),
            new THREE.Vector3(endCoords.x, 0, endCoords.z)
        );
    }
}

function mapKioskCoordinates(kioskPathsData) {
    kioskPathsData.forEach(path => {
        kioskCoordinatesMap[path.Start_Kiosk_ID] = { lat: path.Start_Lat, long: path.Start_Long };
        kioskCoordinatesMap[path.End_Kiosk_ID] = { lat: path.End_Lat, long: path.End_Long };
    });
}

function createParticlesForPaths(kioskPathsData, tripData, maxTraffic, minTripCount) {
    // Remove the conflicting declaration
    // const minTripCount = document.getElementById('minTripCount').value; // This line is removed

    kioskPathsData.forEach(path => {
        const count = findTripCount(path.Start_Kiosk_ID, path.End_Kiosk_ID, tripData);
        // Only create particles if the trip count meets or exceeds the threshold
        if (count >= minTripCount) {
            createParticles(path, count, maxTraffic);
        }
    });
}

function findTripCount(startKioskID, endKioskID, tripData) {
    const trip = tripData.find(trip => trip['Checkout Kiosk ID'] === startKioskID && trip['Return Kiosk ID'] === endKioskID);
    return trip ? trip.Count : 0;
}

function interpolateColor(trafficCount, maxTraffic) {
    // Normalize the traffic count to a 0-1 range directly without logarithmic scaling
    const normalizedTraffic = Math.min(Math.max(trafficCount / maxTraffic, 0), 1);

    // Define three key color points
    const green = new THREE.Color(0x00ff00); // Green at 0
    const yellow = new THREE.Color(0xffff00); // Yellow at 0.5
    const red = new THREE.Color(0xff0000);   // Red at 1

    let color = new THREE.Color();

    // Interpolate between green and yellow for [0, 0.3], and between yellow and red for (0.3, 1]
    if (normalizedTraffic <= 0.3) {
        // Scaling normalizedTraffic to [0,1] for the green to yellow transition
        const greenToYellowScale = normalizedTraffic / 0.1;
        color.lerpColors(green, yellow, greenToYellowScale);
    } else {
        // Scaling normalizedTraffic from [0.3,1] to [0,1] for the yellow to red transition
        const yellowToRedScale = (normalizedTraffic - 0.1) / 0.9;
        color.lerpColors(yellow, red, yellowToRedScale);
    }

    return color;
}



function createParticles(path, count, maxTraffic) {
    const startCoords = kioskCoordinatesMap[path.Start_Kiosk_ID];
    const endCoords = kioskCoordinatesMap[path.End_Kiosk_ID];
    const curve = animatePointAndArrow(startCoords.lat, startCoords.long, endCoords.lat, endCoords.long);
    
    const scaleFactor = 75; 
    // Use globalMaxParticles instead of a hardcoded maximum
    const numParticles = Math.min(Math.ceil(count / scaleFactor), globalMaxParticles);
    const particleColor = interpolateColor(count, maxTraffic);

    for (let i = 0; i < numParticles; i++) {
        const pointsGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3); // Single point initially
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.05, color: particleColor.getHex() });
        const particle = new THREE.Points(pointsGeometry, particlesMaterial);
        scene.add(particle);

        const radiusOffset = Math.random() * 0.1;
        particlesMap.set(particle, { curve: curve, t: i / numParticles, radiusOffset: radiusOffset });
    }
}

function animate() {
    requestAnimationFrame(animate);
    particlesMap.forEach((data, particle) => {
        data.t = (data.t + 0.1) % 1;
        const pointOnCurve = data.curve.getPoint(data.t);
        
        // Displace particle position with the random radius offset
        const angle = Math.random() * Math.PI * 2; // Random angle for displacement
        particle.geometry.attributes.position.setXYZ(
            0, 
            pointOnCurve.x + data.radiusOffset * Math.cos(angle), 
            pointOnCurve.y, 
            pointOnCurve.z + data.radiusOffset * Math.sin(angle)
        );
        particle.geometry.attributes.position.needsUpdate = true;
    });
    controls.update();
    renderer.render(scene, camera);
}