/**
 * SINGULARITY: OMEGA CORE - Custom GLSL Shaders
 * Real-time relativistic accretion disk, gravitational lensing, polar jets & hyperspace warp
 */

const Shaders = {
  // Accretion Disk Shader: Volumetric plasma rotation, relativistic Doppler beaming & temperature gradient
  accretionDisk: {
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorInner;
      uniform vec3 uColorMid;
      uniform vec3 uColorOuter;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      uniform float uSpinSpeed;
      uniform vec3 uCameraPos;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;

      // 2D Simplex-style procedural noise for plasma turbulence
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
              + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Fractal Brownian Motion for rich plasma filaments
      float fbm(vec2 p) {
        float total = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          total += snoise(p) * amp;
          p *= 2.02;
          amp *= 0.5;
        }
        return total;
      }

      void main() {
        // Polar coordinates in disk plane
        vec2 centeredUv = vUv * 2.0 - 1.0;
        float dist = length(centeredUv);
        float angle = atan(centeredUv.y, centeredUv.x);

        if (dist < 0.22 || dist > 0.98) {
          discard;
        }

        // Keplerian differential rotation: inner disk rotates faster than outer
        float rotSpeed = uSpinSpeed * (1.2 / (dist * dist + 0.1));
        float animatedAngle = angle + uTime * rotSpeed;

        // Plasma flame turbulence coordinates
        vec2 noiseCoord = vec2(cos(animatedAngle), sin(animatedAngle)) * (dist * 4.5);
        float noise = fbm(noiseCoord + vec2(uTime * 0.4, dist * 2.0));
        float noise2 = fbm(noiseCoord * 2.2 - vec2(dist * 3.0, uTime * 0.6));
        float plasma = clamp((noise * 0.65 + noise2 * 0.35 + 0.5), 0.0, 1.5);

        // Normalized radial position [0.0 inner, 1.0 outer]
        float r = (dist - 0.22) / (0.98 - 0.22);

        // Relativistic Doppler Beaming Effect:
        // Disk moving towards the camera observer is brighter and blue-shifted!
        vec3 toCamera = normalize(uCameraPos - vWorldPosition);
        vec3 tangentVel = normalize(vec3(-sin(angle), 0.0, cos(angle)));
        float dopplerFactor = dot(tangentVel, toCamera);
        float beaming = 1.0 + dopplerFactor * 0.65; // Boost brightness on approaching side

        // Multi-stage color temperature gradient
        vec3 color;
        if (r < 0.25) {
          color = mix(uColorInner * 1.5, uColorMid, r / 0.25);
        } else if (r < 0.7) {
          color = mix(uColorMid, uColorOuter, (r - 0.25) / 0.45);
        } else {
          color = mix(uColorOuter, uColorOuter * 0.2, (r - 0.7) / 0.3);
        }

        // Apply plasma turbulence intensity
        color *= (plasma * 1.35 + 0.25) * beaming;

        // Smooth boundary fade (inner event horizon cliff & outer soft edge)
        float innerFade = smoothstep(0.22, 0.28, dist);
        float outerFade = smoothstep(0.98, 0.75, dist);
        float alpha = innerFade * outerFade * (0.85 + plasma * 0.35);

        // Extra hot glowing photon ring edge
        float photonRing = exp(-pow((dist - 0.235) * 45.0, 2.0)) * 2.5;
        color += uColorInner * photonRing;

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `
  },

  // Gravitational Lensing Photon Sphere Shader
  photonSphere: {
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uGlowColor;
      uniform vec3 uRimColor;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        
        // Intense Einstein ring glow at grazing angles
        float ringIntensity = pow(fresnel, 3.8) * 3.2;
        float innerGlow = pow(fresnel, 7.0) * 5.0;

        // Chromatic dispersion shimmer
        vec3 color = mix(uGlowColor, uRimColor, pow(fresnel, 2.0));
        color += vec3(0.3, 0.6, 1.0) * innerGlow;

        // Subtle micro-distortion pulses
        float pulse = sin(uTime * 3.0 + vWorldPosition.y * 0.5) * 0.15 + 0.85;
        color *= pulse;

        float alpha = clamp(ringIntensity, 0.0, 0.95);
        gl_FragColor = vec4(color, alpha);
      }
    `
  },

  // Relativistic Polar Jet Shader
  polarJet: {
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uJetColor;
      uniform float uIntensity;

      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        // High speed longitudinal stream
        float stream = fract(vUv.y * 8.0 - uTime * 4.5);
        
        // Periodic relativistic shock diamonds
        float shockDiamond = abs(sin(vUv.y * 30.0 - uTime * 6.0));
        shockDiamond = pow(shockDiamond, 5.0) * 1.5;

        // Beam core glow (highest at center axis)
        float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
        radial = pow(clamp(radial, 0.0, 1.0), 2.5);

        // Axial taper: strong near singularity, dissipating far out
        float lengthFade = (1.0 - vUv.y) * smoothstep(0.0, 0.1, vUv.y);

        vec3 color = uJetColor * (radial * 2.5 + shockDiamond + stream * 0.5) * uIntensity;
        // Super-hot white core
        color += vec3(1.0, 1.0, 1.0) * pow(radial, 6.0) * uIntensity;

        float alpha = radial * lengthFade * clamp(uIntensity, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
      }
    `
  },

  // Gravitational Wave Shockwave Ring
  shockwave: {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p);
        
        // Expanding ring profile
        float ringWidth = 0.06;
        float ring = smoothstep(ringWidth, 0.0, abs(d - uProgress));
        
        float fade = (1.0 - uProgress);
        vec3 col = uColor * (ring * 3.0) * fade;
        gl_FragColor = vec4(col, ring * fade);
      }
    `
  },

  // Hyperspace / Warp Tunnel Shader
  warpTunnel: {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);

        if (r < 0.01) discard;

        // Tunnel coordinate mapping
        vec2 uv = vec2(a / 3.14159265, 1.0 / r + uTime * uSpeed);
        
        // Streaking warp lines
        float streak = sin(uv.x * 24.0) * 0.5 + 0.5;
        streak = pow(streak, 6.0) * 2.0;

        float grid = abs(sin(uv.y * 12.0));
        grid = pow(grid, 8.0);

        vec3 color = mix(uColorA, uColorB, sin(uv.y * 3.0 + uTime) * 0.5 + 0.5);
        color += vec3(1.0) * (streak * grid * 2.0);

        float alpha = clamp(streak * 0.8 + grid * 0.4, 0.0, 1.0) * smoothstep(0.0, 0.2, r);
        gl_FragColor = vec4(color, alpha);
      }
    `
  }
};
