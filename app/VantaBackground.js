'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// We import Vanta dynamically in useEffect to avoid SSR errors with Next.js

export default function VantaBackground() {
    const vantaRef = useRef(null);
    const [vantaEffect, setVantaEffect] = useState(null);

    useEffect(() => {
        if (!vantaEffect) {
            // Load the Vanta Rings effect specifically
            import('vanta/dist/vanta.rings.min').then((vanta) => {
                const effect = vanta.default({
                    el: vantaRef.current,
                    THREE: THREE, // Pass your local THREE instance to Vanta
                    
                    // --- YOUR CONFIGURATION ---
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: 1.00,

                    // --- THEME COLORS (Matches your Global CSS) ---
                    // Background: #f8fafc (Your matte-background)
                    backgroundColor: 0xf8fafc, 
                    // Rings Color: #4F759B (Your steel-blue)
                    color: 0x4F759B 
                });
                setVantaEffect(effect);
            });
        }

        // Cleanup on unmount
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <div 
            ref={vantaRef} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: -1, // Sits behind content
                pointerEvents: 'none' // Allows clicking on buttons on top
            }} 
        />
    );
}
