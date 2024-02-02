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

// Initialize the scene
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000); // Set initial background color to black
    document.getElementById('animationBox').appendChild(renderer.domElement);

    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    addLighting();
    loadData();
    animate();
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
        const tripData = await tripResponse.json();

        kioskPathsData = kioskData;
        mapKioskCoordinates(kioskPathsData);
        populateKioskSelector();
        createParticlesForPaths(kioskPathsData, tripData);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function populateKioskSelector() {
    const selector = document.getElementById('kioskSelect');
    kioskPathsData.forEach(path => {
        const optionStart = document.createElement('option');
        optionStart.value = path.Start_Kiosk_ID;
        optionStart.textContent = `Start Kiosk ${path.Start_Kiosk_ID}`;
        selector.appendChild(optionStart);

        const optionEnd = document.createElement('option');
        optionEnd.value = path.End_Kiosk_ID;
        optionEnd.textContent = `End Kiosk ${path.End_Kiosk_ID}`;
        selector.appendChild(optionEnd);
    });
}

// Event listener for selection changes
document.getElementById('kioskSelect').addEventListener('change', (event) => {
    const selectedKiosks = Array.from(event.target.selectedOptions).map(option => option.value);
    updateSelectedPaths(selectedKiosks);
});

function updateSelectedPaths(selectedKiosks) {
    // Logic to update particle animations based on selected kiosks
    // This function needs to be implemented according to your application's logic
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
    return distance < shortCutoffDistanceSceneScale ?
        new THREE.LineCurve3(new THREE.Vector3(startCoords.x, 0, startCoords.z), new THREE.Vector3(endCoords.x, 0, endCoords.z)) :
        new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(startCoords.x, 0, startCoords.z),
            new THREE.Vector3((startCoords.x + endCoords.x) / 2, Math.min(Math.pow(distance, 1.5) * 0.1, 30), (startCoords.z + endCoords.z) / 2),
            new THREE.Vector3(endCoords.x, 0, endCoords.z)
        );
}

function mapKioskCoordinates(kioskPathsData) {
    kioskPathsData.forEach(path => {
        kioskCoordinatesMap[path.Start_Kiosk_ID] = { lat: path.Start_Lat, long: path.Start_Long };
        kioskCoordinatesMap[path.End_Kiosk_ID] = { lat: path.End_Lat, long: path.End_Long };
    });
}

function createParticlesForPaths(kioskPathsData, tripData) {
    kioskPathsData.forEach(path => {
        const count = findTripCount(path.Start_Kiosk_ID, path.End_Kiosk_ID, tripData);
        if (count > 0) {
            createParticles(path, count);
        }
    });
}

function findTripCount(startKioskID, endKioskID, tripData) {
    const trip = tripData.find(trip => trip['Checkout Kiosk ID'] === startKioskID && trip['Return Kiosk ID'] === endKioskID);
    return trip ? trip.Count : 0;
}

function createParticles(path, count) {
    const startCoords = kioskCoordinatesMap[path.Start_Kiosk_ID];
    const endCoords = kioskCoordinatesMap[path.End_Kiosk_ID];
    const curve = animatePointAndArrow(startCoords.lat, startCoords.long, endCoords.lat, endCoords.long);
    
    // Scaling factor for particle count, e.g., 1 particle per 10 trips
    const scaleFactor = 100; 
    const maxParticles = 100; // Maximum number of particles
    const numParticles = Math.min(Math.ceil(count / scaleFactor), maxParticles);

    for (let i = 0; i < numParticles; i++) {
        const pointsGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3); // Single point initially
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff });
        const particle = new THREE.Points(pointsGeometry, particlesMaterial);
        scene.add(particle);

        // Random radius offset for each particle
        const radiusOffset = Math.random() * 0.5;
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

document.addEventListener('DOMContentLoaded', init);