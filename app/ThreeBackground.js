// **Refined Uniforms (Using more typical Stripe colors)**
    const uniforms = {
        u_time: { value: 0.0 },
        u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
        u_mouse: { value: { x: 0.5, y: 0.5 } },
        // Two dominant, sophisticated colors
        colorA: { value: new THREE.Vector3(0.35, 0.40, 1.00) }, // Deep Indigo Blue
        colorB: { value: new THREE.Vector3(1.00, 0.45, 0.70) }, // Soft Raspberry Pink
    }

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `

    // **Stripe-Style Fragment Shader: Clean, Soft, and Fluid**
    const fragmentShader = `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;

        // Custom, simplified pseudo-random noise function (Stripe style avoids complex noise)
        float rand(vec2 n) {
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        // Simplex/Perlin-like noise for organic flow (2D implementation)
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            // Smooth interpolation
            vec2 u = f*f*(3.0-2.0*f);

            // Mix four corners
            return mix(mix(rand(i + vec2(0.0,0.0)),
                           rand(i + vec2(1.0,0.0)), u.x),
                       mix(rand(i + vec2(0.0,1.0)),
                           rand(i + vec2(1.0,1.0)), u.x), u.y);
        }
        
        // Multi-octave Perlin-like noise (Fractal Brownian Motion)
        float fbm(vec2 p) {
            float total = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            for (int i = 0; i < 4; ++i) { // 4 octaves for softness
                total += noise(p * frequency) * amplitude;
                p *= 2.0;           // Increase frequency
                amplitude *= 0.5;   // Decrease amplitude (less detail)
            }
            return total;
        }

        void main() {
            vec2 uv = vUv;
            
            // 1. Aspect Ratio Correction
            float aspect = u_resolution.x / u_resolution.y;
            uv.x *= aspect;

            // 2. Slow Time Control
            float time = u_time * 0.00007; // Very slow, graceful movement

            // 3. Organic Flow Field (The core of the liquid look)
            // Use FBM for a soft, cloudy, natural texture
            vec2 p = uv * 3.0; // Scale the coordinates
            
            // Offset the pattern over time and space to create motion
            vec2 flowOffset = vec2(
                fbm(p * 0.5 + time), 
                fbm(p * 0.5 - time)
            ) * 0.5;
            
            // Apply the flow field to the UVs
            vec2 distortedUV = uv + flowOffset;
            
            // 4. Final Pattern Generation
            // Use a simple, large-scale sine wave across the distorted space
            float pattern = sin(distortedUV.x * 2.0 + distortedUV.y * 3.0 + time * 0.5);
            
            // Combine with a secondary, soft FBM layer for added complexity
            pattern += fbm(distortedUV * 5.0) * 0.5;
            
            // Normalize the pattern to (0, 1)
            pattern = pattern * 0.3 + 0.5; 
            
            // 5. Soft Color Mixing
            // Use pow() to bias the gradient towards the center or edges for a nicer transition
            float t = pow(pattern, 1.5); // Bias the mix factor
            vec3 finalColor = mix(colorA, colorB, t);
            
            // 6. Subtle Vignette (Focus and Depth)
            vec2 center = vec2(0.5 * aspect, 0.5);
            float dist = distance(uv, center);
            float vignette = smoothstep(0.9, 0.3, dist * 1.5);
            finalColor *= vignette; // Darkens the edges gently

            // 7. Final Output
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
