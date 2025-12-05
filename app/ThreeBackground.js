// threebackground.js - Subtle Low-Poly Cleanliness Field

// --- Setup Variables ---
let scene, camera, renderer, geometry, material, mesh, container;
let startTime = Date.now();
const SHAPE_COUNT = 15; // Number of floating shapes
const FOG_COLOR = 0xf0f0f0; // Very light grey/white for a sterile look
const LIGHT_COLOR = 0xffffff; // Pure white light

// --- Initialization Function ---
function init() {
    // 1. Scene Setup
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '-1'; // Ensure it's behind the main content
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.005);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(FOG_COLOR, 1); // Set clear color to match fog
    container.appendChild(renderer.domElement);

    // 4. Lighting - Soft, even lighting for a sterile feel
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft overall light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(LIGHT_COLOR, 1.5);
    directionalLight.position.set(0, 50, 50);
    scene.add(directionalLight);

    // 5. Create Shapes (Low-Poly and Geometric)
    for (let i = 0; i < SHAPE_COUNT; i++) {
        createCleanShape();
    }

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

// --- Shape Creation Function ---
function createCleanShape() {
    // Choose a subtle geometric shape
    const geometries = [
        new THREE.TetrahedronGeometry(Math.random() * 5 + 3, 0), // Low-poly tetrahedron
        new THREE.DodecahedronGeometry(Math.random() * 5 + 3, 0), // Low-poly dodecahedron
        new THREE.BoxGeometry(Math.random() * 8 + 5, Math.random() * 8 + 5, Math.random() * 8 + 5) // Simple box
    ];

    const currentGeometry = geometries[Math.floor(Math.random() * geometries.length)];

    // Material: Subtle, shiny, and slightly transparent
    const shapeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcccccc, // Light grey/silver
        metalness: 0.1,
        roughness: 0.8, // Slightly rough to avoid distracting reflections
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        flatShading: true, // Key for the low-poly look
        transparent: true,
        opacity: 0.7 + Math.random() * 0.2 // Subtle transparency
    });

    const shapeMesh = new THREE.Mesh(currentGeometry, shapeMaterial);

    // Position randomly within a large space
    shapeMesh.position.set(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400
    );

    // Give it a unique rotation speed for subtle variation
    shapeMesh.userData.rotationSpeedX = (Math.random() - 0.5) * 0.002;
    shapeMesh.userData.rotationSpeedY = (Math.random() - 0.5) * 0.002;
    shapeMesh.userData.rotationSpeedZ = (Math.random() - 0.5) * 0.002;

    scene.add(shapeMesh);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = (Date.now() - startTime) * 0.0001; // Slower time factor

    scene.children.forEach(object => {
        if (object.isMesh) {
            // Slow, perpetual rotation
            object.rotation.x += object.userData.rotationSpeedX || 0;
            object.rotation.y += object.userData.rotationSpeedY || 0;
            object.rotation.z += object.userData.rotationSpeedZ || 0;

            // Subtle, wave-like movement using sine/cosine for an organic drift
            object.position.x += Math.cos(elapsedTime * 2 + object.position.y * 0.01) * 0.01;
            object.position.y += Math.sin(elapsedTime * 3 + object.position.z * 0.01) * 0.01;
        }
    });

    renderer.render(scene, camera);
}

// --- Handle Window Resize ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Execute the initialization
init();
