// 2. THE SHADER (Stripe-inspired Liquid Gradient)
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
      u_mouse: { value: { x: 0.5, y: 0.5 } },
      // Refined brand colors for premium feel
      colorA: { value: new THREE.Vector3(0.98, 0.50, 0.15) }, // Warmer Orange
      colorB: { value: new THREE.Vector3(0.65, 0.25, 0.95) }, // Rich Purple
      colorC: { value: new THREE.Vector3(0.15, 0.50, 1.00) }, // Vibrant Blue
      colorD: { value: new THREE.Vector3(0.98, 0.75, 0.85) }, // Soft Pink accent
    }

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `

    // Enhanced fluid gradient with depth and sophistication
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform vec3 colorC;
      uniform vec3 colorD;
      varying vec2 vUv;

      // Improved noise function for organic movement
      float noise(vec2 p) {
        return sin(p.x * 10.0) * sin(p.y * 10.0);
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);
        
        // Create aspect ratio correction
        float aspect = u_resolution.x / u_resolution.y;
        vec2 correctedUV = uv;
        correctedUV.x *= aspect;
        
        // Distance from center for radial effects
        float dist = distance(correctedUV, center * vec2(aspect, 1.0));
        
        // Multiple layered waves for complex movement
        float time = u_time * 0.0003;
        
        // Primary wave system
        float wave1 = sin(correctedUV.x * 2.5 + time * 2.0 + dist * 3.0) * 0.5;
        float wave2 = cos(correctedUV.y * 3.0 - time * 1.5 + dist * 2.0) * 0.5;
        float wave3 = sin((correctedUV.x + correctedUV.y) * 2.0 + time * 1.8) * 0.3;
        
        // Secondary detail waves for texture
        float detail1 = sin(correctedUV.x * 8.0 + time * 3.0) * 0.1;
        float detail2 = cos(correctedUV.y * 10.0 - time * 2.5) * 0.1;
        
        // Combine all waves
        float pattern = (wave1 + wave2 + wave3 + detail1 + detail2) / 2.5;
        pattern = pattern * 0.5 + 0.5; // Normalize to 0-1
        
        // Create depth with distance-based fading
        float depthFactor = smoothstep(0.0, 0.8, dist);
        
        // Multi-color mixing for rich gradients
        vec3 color1 = mix(colorA, colorB, pattern);
        vec3 color2 = mix(colorC, colorD, pattern * 0.8);
        vec3 finalColor = mix(color1, color2, sin(time + dist * 5.0) * 0.3 + 0.5);
        
        // Add subtle radial gradient overlay
        finalColor = mix(finalColor, colorB, depthFactor * 0.2);
        
        // Enhance with highlights
        float highlight = smoothstep(0.6, 1.0, pattern) * 0.15;
        finalColor += vec3(highlight);
        
        // Gentle vignette for depth
        float vignette = smoothstep(1.0, 0.3, dist * 1.2);
        finalColor *= 0.85 + vignette * 0.15;
        
        // Subtle color grading for premium look
        finalColor = pow(finalColor, vec3(0.95)); // Slight gamma adjustment
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
