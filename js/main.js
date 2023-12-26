// main.js
// Three.js script to animate points and arrows

// Initial setup of scene, camera, and renderer
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(document.getElementById('animationBox').clientWidth, document.getElementById('animationBox').clientHeight);
document.getElementById('animationBox').appendChild(renderer.domElement);
camera.position.z = 5;

// Function to create a point
function createPoint(x, y, color = 0xff0000) {
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, 0);
    return sphere;
}

// Function to create an arrow
function createArrow(startX, startY, endX, endY, color = 0x0000ff) {
    const dir = new THREE.Vector3(endX - startX, endY - startY, 0).normalize();
    const origin = new THREE.Vector3(startX, startY, 0);
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
    return arrowHelper;
}

// Function to handle the fade out animation
function fadeOutObject(object, callback) {
    let opacity = 1, step = 0.01;
    const fade = () => {
        if (opacity <= 0) {
            scene.remove(object);
            if(callback) callback();
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

    // Set transparent property for point's material
    if (point.material) {
        point.material.transparent = true;
    }

    // For ArrowHelper, handle transparency differently
    if (arrow instanceof THREE.ArrowHelper) {
        arrow.line.material.transparent = true;
        arrow.cone.material.transparent = true;
    }

    scene.add(point);
    scene.add(arrow);

    // Fade out after 5 seconds
    setTimeout(() => {
        fadeOutObject(point);
        fadeOutObject(arrow.line); // Fade out line of the arrow
        fadeOutObject(arrow.cone); // Fade out cone of the arrow
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
    renderer.render(scene, camera);
}
animate();
