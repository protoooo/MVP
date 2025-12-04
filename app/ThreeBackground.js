'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- CONFIGURATION ---
        const COLORS = {
            floor: 0xf5f6fa,
            wall: 0xdcdde1,
            accentOrange: 0xff9f43,
            accentBlue: 0x54a0ff,
            chefWhite: 0xffffff,
            staffBlue: 0x2e86de,
            metal: 0xa4b0be,
            table: 0xffffff,
        };

        // --- SCENE SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f2f5);

        // CAMERA
        const aspect = window.innerWidth / window.innerHeight;
        const d = 35;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        camera.position.set(40, 40, 40);
        camera.lookAt(scene.position);

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        
        // --- FIX IS HERE: Use PCFSoftShadowMap instead of SoftShadowMap ---
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const currentMount = mountRef.current;
        currentMount.appendChild(renderer.domElement);

        // --- LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(50, 80, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -60;
        dirLight.shadow.camera.right = 60;
        dirLight.shadow.camera.top = 60;
        dirLight.shadow.camera.bottom = -60;
        scene.add(dirLight);

        // --- HELPERS ---
        function createBox(w, h, d, color, x, y, z) {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshStandardMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + h/2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        }

        function createCylinder(r, h, color, x, y, z) {
            const geo = new THREE.CylinderGeometry(r, r, h, 32);
            const mat = new THREE.MeshStandardMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + h/2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
        }

        // --- LEVEL GENERATION ---
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: COLORS.floor })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Kitchen
        createBox(2, 8, 40, COLORS.wall, -20, 0, -10);
        createBox(40, 8, 2, COLORS.wall, 0, 0, -30);
        createBox(15, 3, 4, COLORS.metal, -10, 0, -25);
        createBox(4, 3, 15, COLORS.metal, -18, 0, -15);
        createBox(15, 3, 4, COLORS.metal, -5, 0, -10);
        createCylinder(2, 4, COLORS.metal, -10, 8, -25);
        createCylinder(2, 4, COLORS.metal, -5, 8, -10);

        // Pipes
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-15, 12, -25),
            new THREE.Vector3(-5, 10, -10),
            new THREE.Vector3(5, 8, 0),
            new THREE.Vector3(15, 6, 15),
            new THREE.Vector3(25, 4, 15)
        ]);
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(path, 20, 1, 8, false),
            new THREE.MeshStandardMaterial({ color: COLORS.accentOrange })
        );
        tube.castShadow = true;
        scene.add(tube);

        // Dining
        const tables = [];
        function createDiningSet(x, z) {
            tables.push({x, z});
            createCylinder(3, 2.5, COLORS.table, x, 0, z);
            createBox(1.5, 1.5, 1.5, COLORS.accentBlue, x - 2.5, 0, z);
            createBox(1.5, 1.5, 1.5, COLORS.accentBlue, x + 2.5, 0, z);
            createBox(1.5, 1.5, 1.5, COLORS.accentBlue, x, 0, z - 2.5);
            createBox(1.5, 1.5, 1.5, COLORS.accentBlue, x, 0, z + 2.5);
        }
        createDiningSet(10, 0);
        createDiningSet(20, 10);
        createDiningSet(10, 20);
        createDiningSet(25, -5);
        createBox(1, 4, 20, COLORS.accentOrange, 0, 0, 10);

        // --- AGENTS ---
        const agents = [];
        function createPerson(role, x, z) {
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const color = role === 'chef' ? COLORS.chefWhite : COLORS.staffBlue;
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.8, 2, 4, 8),
                new THREE.MeshStandardMaterial({ color: color })
            );
            body.position.y = 2;
            body.castShadow = true;
            group.add(body);

            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.7, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xffccaa })
            );
            head.position.y = 4;
            head.castShadow = true;
            group.add(head);

            if (role === 'chef') {
                const hat = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.8, 0.8, 1, 32),
                    new THREE.MeshStandardMaterial({ color: COLORS.chefWhite })
                );
                hat.position.set(0, 4.8, 0);
                hat.castShadow = true;
                group.add(hat);
            }

            scene.add(group);
            return { mesh: group, role, target: new THREE.Vector3(x, 0, z), timer: 0 };
        }

        agents.push(createPerson('chef', -10, -22));
        agents.push(createPerson('chef', -5, -12));
        agents.push(createPerson('waiter', 5, 5));
        agents.push(createPerson('waiter', 15, 15));
        agents.push(createPerson('waiter', 10, -5));

        // --- ANIMATION ---
        const clock = new THREE.Clock();
        let animationId;

        function assignNewTarget(agent) {
            if (agent.role === 'chef') {
                agent.target.set(Math.random() * 15 - 15, 0, Math.random() * 15 - 25);
            } else {
                if (Math.random() > 0.5) agent.target.set(-2, 0, -5);
                else {
                    const table = tables[Math.floor(Math.random() * tables.length)];
                    agent.target.set(table.x + (Math.random()*2-1), 0, table.z + (Math.random()*2-1));
                }
            }
        }

        function animate() {
            animationId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            agents.forEach(agent => {
                const dist = agent.mesh.position.distanceTo(agent.target);
                if (dist > 0.5) {
                    const dir = new THREE.Vector3().subVectors(agent.target, agent.mesh.position).normalize();
                    agent.mesh.position.add(dir.multiplyScalar(4 * delta));
                    agent.mesh.lookAt(agent.target);
                    // Bobbing
                    agent.mesh.position.y = Math.sin(clock.elapsedTime * 10) * 0.1; 
                } else {
                    agent.timer -= delta;
                    if (agent.timer <= 0) {
                        assignNewTarget(agent);
                        agent.timer = Math.random() * 2 + 1;
                    }
                }
            });

            renderer.render(scene, camera);
        }

        animate();

        // --- RESIZE HANDLER ---
        const handleResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // --- CLEANUP ---
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
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
                zIndex: -1 
            }} 
        />
    );
}
