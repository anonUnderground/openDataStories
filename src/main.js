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
        createParticlesForPaths(kioskPathsData, tripData, globalMaxTraffic);
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

function createParticlesForPaths(kioskPathsData, tripData, maxTraffic, minTripCount = 200) {
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

// function interpolateColor(trafficCount, maxTraffic) {
//     // Apply a logarithmic transformation to both the trafficCount and maxTraffic
//     // Adding 1 before taking the log to avoid log(0) which is undefined
//     const logTrafficCount = Math.log(trafficCount + 1);
//     const logMaxTraffic = Math.log(maxTraffic + 1);

//     // Normalize the log-transformed traffic count to a 0-1 range
//     const normalizedLogTraffic = Math.min(Math.max(logTrafficCount / logMaxTraffic, 0), 1);

//     // Define color stops
//     const green = new THREE.Color(0x00ff00);
//     const yellow = new THREE.Color(0xffff00);
//     const red = new THREE.Color(0xff0000);

//     let color = new THREE.Color();
//     if (normalizedLogTraffic >= 0.75) {
//         // Interpolate between green and yellow
//         color.lerpColors(green, yellow, normalizedLogTraffic * 2);
//     } else {
//         // Interpolate between yellow and red
//         color.lerpColors(yellow, red, (normalizedLogTraffic - 0.5) * 2);
//     }

//     return color;
// }

// function interpolateColor(trafficCount, maxTraffic) {
//     const logTrafficCount = Math.log(trafficCount + 1);
//     const logMaxTraffic = Math.log(maxTraffic + 1);
//     const normalizedLogTraffic = Math.min(Math.max(logTrafficCount / logMaxTraffic, 0), 1);

//     const colors = [
//         new THREE.Color(0x00ff00), // green
//         new THREE.Color(0x80ff00), // light green
//         new THREE.Color(0xbfff00), // lime
//         new THREE.Color(0xffff00), // yellow-green
//         new THREE.Color(0xffbf00), // yellow
//         new THREE.Color(0xff8000), // orange
//         new THREE.Color(0xff4000), // light red
//         new THREE.Color(0xff0000)  // red
//     ];

//     let color = new THREE.Color();
//     const segment = 1 / (colors.length - 1); // Divide the range [0,1] into equal segments for each color transition

//     for (let i = 0; i < colors.length - 1; i++) {
//         if (normalizedLogTraffic >= i * segment && normalizedLogTraffic < (i + 1) * segment) {
//             const mix = (normalizedLogTraffic - i * segment) / segment; // Determine how far along the segment the value is
//             color.lerpColors(colors[i], colors[i + 1], mix);
//             break;
//         }
//     }

//     // Handle the edge case where normalizedLogTraffic is exactly 1
//     if (normalizedLogTraffic === 1) {
//         color = colors[colors.length - 1];
//     }

//     return color;
// }

// function interpolateColor(trafficCount, maxTraffic) {
//     // Normalize the traffic count to a 0-1 range based on maxTraffic
//     const normalizedTraffic = Math.min(Math.max(trafficCount / maxTraffic, 0), 1);

//     const colors = [
//         new THREE.Color(0x00ff00), // green
//         new THREE.Color(0x80ff00), // light green
//         new THREE.Color(0xbfff00), // lime
//         new THREE.Color(0xffff00), // yellow-green
//         new THREE.Color(0xffbf00), // yellow
//         new THREE.Color(0xff8000), // orange
//         new THREE.Color(0xff4000), // light red
//         new THREE.Color(0xff0000)  // red
//     ];

//     let color = new THREE.Color();
//     const segment = 1 / (colors.length - 1); // Divide the range [0,1] into equal segments for each color transition

//     for (let i = 0; i < colors.length - 1; i++) {
//         if (normalizedTraffic >= i * segment && normalizedTraffic < (i + 1) * segment) {
//             const mix = (normalizedTraffic - i * segment) / segment; // Determine how far along the segment the value is
//             color.lerpColors(colors[i], colors[i + 1], mix);
//             break;
//         }
//     }

//     // Handle the edge case where normalizedTraffic is exactly 1
//     if (normalizedTraffic === 1) {
//         color = colors[colors.length - 1];
//     }

//     return color;
// }

// function interpolateColor(trafficCount, maxTraffic) {
//     // Apply logarithmic scale transformation
//     const logTraffic = Math.log(trafficCount);
//     const logMaxTraffic = Math.log(maxTraffic); // Assuming maxTraffic is the maximum observed value, e.g., 20000

//     // Normalize the log-transformed traffic count to a 0-1 range
//     const normalizedTraffic = (logTraffic - Math.log(1)) / (logMaxTraffic - Math.log(1));

//     // Define color gradient from green to red
//     const colorEnd = new THREE.Color(0x00ff00); // Green
//     const colorStart = new THREE.Color(0xff0000);   // Red

//     let color = new THREE.Color();
//     // Interpolate between green and red based on normalized log-transformed traffic count
//     color.lerpColors(colorStart, colorEnd, normalizedTraffic);

//     return color;
// }

// function interpolateColor(trafficCount, maxTraffic) {
//     // Ensure trafficCount is at least 1 to avoid negative infinity in logarithm
//     trafficCount = Math.max(1, trafficCount);
    
//     // Apply logarithmic scale transformation
//     const logTraffic = Math.log(trafficCount);
//     const logMaxTraffic = Math.log(maxTraffic);

//     // Normalize the log-transformed traffic count to a 0-1 range
//     // Since log(1) = 0, the formula simplifies to logTraffic / logMaxTraffic
//     const normalizedTraffic = logTraffic / logMaxTraffic;

//     // Define a gradient of 10 colors, transitioning from red to green
//     const gradient = [
//         new THREE.Color(0xff0000), // Red
//         new THREE.Color(0xff4000),
//         new THREE.Color(0xff8000),
//         new THREE.Color(0xffbf00),
//         new THREE.Color(0xffff00), // Yellow
//         new THREE.Color(0xbfff00),
//         new THREE.Color(0x80ff00),
//         new THREE.Color(0x40ff00),
//         new THREE.Color(0x00ff40),
//         new THREE.Color(0x00ff00)  // Green
//     ];

//     // Calculate the appropriate indices for the two closest colors in the gradient
//     const index = Math.floor(normalizedTraffic * (gradient.length - 1));
//     const nextIndex = index + 1 < gradient.length ? index + 1 : index; // Ensure not exceeding bounds
//     const remainder = normalizedTraffic * (gradient.length - 1) - index;

//     // Create a new color to store the interpolated result
//     let color = new THREE.Color();

//     // Perform the interpolation between the two closest colors
//     color.lerpColors(gradient[index], gradient[nextIndex], remainder);

//     return color;
// }

function interpolateColor(trafficCount, maxTraffic) {
    // Ensure trafficCount is at least 1 to avoid negative infinity in logarithm
    trafficCount = Math.max(1, trafficCount);
    
    // Apply logarithmic scale transformation
    const logTraffic = Math.log(trafficCount);
    const logMaxTraffic = Math.log(maxTraffic); // maxTraffic should be the max observed traffic count

    // Normalize the log-transformed traffic count to a 0-1 range
    const normalizedTraffic = logTraffic / logMaxTraffic;

    // Define a simplified gradient of 5 colors
    const gradient = [
        new THREE.Color(0xff0000), // Red
        new THREE.Color(0xff8000), // Orange-Red
        new THREE.Color(0xffff00), // Yellow
        new THREE.Color(0x80ff00), // Light Green
        new THREE.Color(0x00ff00)  // Green
    ];

    // Determine the color based on normalizedTraffic
    let color = new THREE.Color();
    if (normalizedTraffic <= 0.2) {
        // Linear interpolation within the green range
        color.lerpColors(gradient[4], gradient[3], normalizedTraffic / 0.2);
    } else if (normalizedTraffic >= 0.8) {
        // Linear interpolation within the red range
        color.lerpColors(gradient[0], gradient[1], (normalizedTraffic - 0.8) / 0.2);
    } else {
        // Intermediate values - calculate which two colors to interpolate between
        const scale = (normalizedTraffic - 0.2) / 0.6; // Scale 0-1 within the intermediate range
        const intermediateIndex = Math.floor(scale * 2); // 0 or 1 for selecting intermediate colors
        color.lerpColors(gradient[intermediateIndex + 1], gradient[intermediateIndex + 2], (scale % 0.5) * 2);
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