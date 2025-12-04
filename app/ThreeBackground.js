'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SETUP ---
        const scene = new THREE.Scene();
        
        // "Clinical White" Fog to fade the infinite grid into the background smoothly
        const FOG_COLOR = 0xffffff; 
        scene.background = new THREE.Color(FOG_COLOR);
        scene.fog = new THREE.Fog(FOG_COLOR, 20, 90); // Starts at 20 units, opaque at 90

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 15, 40); // High angle looking down
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Sharpness
        
        const currentMount = mountRef.current;
        currentMount.appendChild(renderer.domElement);

        // --- THE INFINITE COMPLIANCE GRID ---
        // Represents structure, standards, and blueprints
        const gridHelper = new THREE.GridHelper(200, 80, 0xe2e8f0, 0xf1f5f9);
        // (Size, Divisions, CenterLineColor, GridColor)
        // Colors are Tailwind Slate-200 and Slate-100 (Very subtle)
        scene.add(gridHelper);

        // --- FLOATING "HEALTH" PARTICLES ---
        const geometryGroup = new THREE.Group();
        
        // 1. Plus Signs (+) representing Health/Safety
        const plusGeo = new THREE.BoxGeometry(1.5, 0.4, 0.4);
        const plusMat = new THREE.MeshBasicMaterial({ 
            color: 0x22d3ee, // Cyan-400
            transparent: true, 
            opacity: 0.6 
        });

        // 2. Data Nodes (Spheres) representing Compliance Points
        const sphereGeo = new THREE.IcosahedronGeometry(0.6, 0);
        const sphereMat = new THREE.MeshBasicMaterial({ 
            color: 0x34d399, // Emerald-400
            transparent: true, 
            opacity: 0.5 
        });

        const particles = [];

        // Generate 60 Random Floating Elements
        for (let i = 0; i < 60; i++) {
            const isPlus = Math.random() > 0.5;
            let mesh;

            if (isPlus) {
                // Construct a Plus sign from two boxes
                mesh = new THREE.Group();
                const hBar = new THREE.Mesh(plusGeo, plusMat);
                const vBar = new THREE.Mesh(plusGeo, plusMat);
                vBar.rotation.z = Math.PI / 2;
                mesh.add(hBar);
                mesh.add(vBar);
            } else {
                mesh = new THREE.Mesh(sphereGeo, sphereMat);
            }

            // Random positioning across the grid
            mesh.position.x = (Math.random() - 0.5) * 120;
            mesh.position.y = Math.random() * 20 + 2; // Float above floor
            mesh.position.z = (Math.random() - 0.5) * 80; // Depth

            // Store animation data
            mesh.userData = {
                speedY: Math.random() * 0.02 + 0.01,
                speedRot: Math.random() * 0.02,
                initialY: mesh.position.y,
                offset: Math.random() * Math.PI * 2 // Random starting phase
            };

            geometryGroup.add(mesh);
            particles.push(mesh);
        }

        scene.add(geometryGroup);

        // --- ANIMATION ---
        const clock = new THREE.Clock();
        let animationId;

        // Mouse Interaction
        let mouseX = 0;
        let mouseY = 0;
        const handleMouseMove = (event) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', handleMouseMove);

        function animate() {
            animationId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // 1. Gently float the particles
            particles.forEach((p) => {
                // Bobbing up and down
                p.position.y = p.userData.initialY + Math.sin(time + p.userData.offset) * 2;
                
                // Slow rotation
                p.rotation.x += p.userData.speedRot;
                p.rotation.y += p.userData.speedRot;
            });

            // 2. Move the Grid/Camera slightly based on mouse (Parallax)
            // This gives a "premium" feel
            camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
            camera.position.y += ((15 + mouseY * 2) - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }

        animate();

        // --- RESIZE HANDLER ---
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
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
                pointerEvents: 'none',
                opacity: 0.7 // Subtle blend with CSS background
            }} 
        />
    );
}
