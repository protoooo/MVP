'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SCENE SETUP ---
        const scene = new THREE.Scene();
        
        // Match your CSS 'matte-background' #f8fafc
        const BG_COLOR = 0xf8fafc;
        const BRAND_COLOR = 0x4F759B; // Steel Blue
        
        scene.background = new THREE.Color(BG_COLOR);
        // Thick fog to make the "infinite" world fade out smoothly
        scene.fog = new THREE.Fog(BG_COLOR, 30, 90);

        // ISO-Style Camera
        const aspect = window.innerWidth / window.innerHeight;
        const d = 40;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        camera.position.set(40, 40, 40); // Isometric angle
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const currentMount = mountRef.current;
        currentMount.appendChild(renderer.domElement);

        // --- 1. THE GRID (The Foundation) ---
        // A large, subtle grid representing the "floor plan"
        const gridHelper = new THREE.GridHelper(200, 100, 0xcbd5e1, 0xe2e8f0);
        scene.add(gridHelper);

        // --- 2. THE STRUCTURES (Kitchen/Facility Units) ---
        // Procedurally generate "equipment" (wireframe boxes)
        const structuresGroup = new THREE.Group();
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Material: Clean Steel Blue Lines
        const lineMaterial = new THREE.LineBasicMaterial({
            color: BRAND_COLOR,
            transparent: true,
            opacity: 0.3 // Subtle, not distracting
        });

        // Generate 50 random "Units" (Prep tables, fridges, etc.)
        for (let i = 0; i < 50; i++) {
            // Random dimensions (snapped to grid units)
            const w = Math.floor(Math.random() * 3 + 1) * 2; // Width 2, 4, or 6
            const h = Math.floor(Math.random() * 2 + 1) * 2; // Height 2 or 4
            const d = Math.floor(Math.random() * 3 + 1) * 2; // Depth 2, 4, or 6

            // Create invisible box to get edges
            const tempGeo = new THREE.BoxGeometry(w, h, d);
            // EdgesGeometry removes the diagonal triangulation lines for a clean CAD look
            const edges = new THREE.EdgesGeometry(tempGeo); 
            const line = new THREE.LineSegments(edges, lineMaterial);

            // Position: Snap to grid
            const x = (Math.floor((Math.random() - 0.5) * 40) * 2); 
            const z = (Math.floor((Math.random() - 0.5) * 40) * 2);
            
            line.position.set(x, h / 2, z);
            
            structuresGroup.add(line);
        }
        scene.add(structuresGroup);

        // --- 3. THE DATA RUNNERS (GPU Tracing Effect) ---
        // Small points of light that zip along the grid lines
        const dataParticles = [];
        const particleGeo = new THREE.PlaneGeometry(0.8, 0.8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0x54a0ff, // Brighter blue accent
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 20; i++) {
            const mesh = new THREE.Mesh(particleGeo, particleMat);
            
            // Start at a random grid intersection
            mesh.position.x = (Math.floor((Math.random() - 0.5) * 40) * 2);
            mesh.position.z = (Math.floor((Math.random() - 0.5) * 40) * 2);
            mesh.position.y = 0.1; // Just above floor
            mesh.rotation.x = -Math.PI / 2; // Flat on floor

            // Assign a random axis (X or Z) and speed
            mesh.userData = {
                axis: Math.random() > 0.5 ? 'x' : 'z',
                speed: (Math.random() * 0.2 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
                limit: 40 // Boundary
            };

            scene.add(mesh);
            dataParticles.push(mesh);
        }

        // --- ANIMATION ---
        let animationId;
        const clock = new THREE.Clock();

        function animate() {
            animationId = requestAnimationFrame(animate);
            
            // 1. Slow Rotate the entire Facility (Scanning feel)
            structuresGroup.rotation.y += 0.0005;
            gridHelper.rotation.y += 0.0005;

            // 2. Animate Data Runners
            dataParticles.forEach(p => {
                // Move along assigned axis
                if (p.userData.axis === 'x') {
                    p.position.x += p.userData.speed;
                } else {
                    p.position.z += p.userData.speed;
                }
                
                // Rotate particle with the world so it stays aligned to grid
                // Actually, we need to manually orbit them or just reset them if they go too far
                
                // Simple boundary reset logic
                if (Math.abs(p.position.x) > 50 || Math.abs(p.position.z) > 50) {
                    p.position.x = (Math.floor((Math.random() - 0.5) * 40) * 2);
                    p.position.z = (Math.floor((Math.random() - 0.5) * 40) * 2);
                    // Flip axis occasionally
                    p.userData.axis = Math.random() > 0.5 ? 'x' : 'z';
                }
            });

            renderer.render(scene, camera);
        }

        animate();

        // --- RESIZE ---
        const handleResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.top = d;
            camera.bottom = -d;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (currentMount) currentMount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return (
        <div 
            ref={mountRef} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: -1,
                pointerEvents: 'none'
            }} 
        />
    );
}
