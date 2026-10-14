/**
 * SINGULARITY: OMEGA CORE - Main Simulation & Starfighter Controller
 * Orchestrates WebGL scene, Kerr Black Hole, AI Drones, Starship Flight & Interactive Controls
 */

class SingularitySimulation {
  constructor() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    // Core engines
    this.audio = new CosmicAudioEngine();
    this.physics = null;

    // Camera modes: 'orbit', 'starship', 'cockpit', 'cinematic', 'fall'
    this.cameraMode = 'orbit';
    this.activePreset = 'gargantua';

    // Player starfighter state
    this.starship = null;
    this.shipVelocity = new THREE.Vector3();
    this.shipSpeed = 0;
    this.maxSpeed = 95;
    this.boostSpeed = 210;
    this.isBoosting = false;
    this.shipHealth = 100;
    this.shipShield = 100;

    // Controls input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false, button: 0 };

    // AI Drones
    this.aiDrones = [];
    this.warZoneActive = false;

    // Settings
    this.spinSpeed = 1.2;
    this.warpActive = false;
    this.cinematicAngle = 0;

    this.initScene();
    this.initBlackHole();
    this.initSpaceBackground();
    this.initStarfighter();
    this.initHyperspaceTunnel();
    this.initControls();
    this.initUI();

    // Start simulation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020108, 0.0006);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.5, 8000);
    this.camera.position.set(0, 45, 135);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.canvasContainer.appendChild(this.renderer.domElement);

    // Orbit Controls for God-Cam
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.05;
      this.orbitControls.maxDistance = 1500;
      this.orbitControls.minDistance = 12;
    }

    // Initialize Physics Engine
    this.physics = new PhysicsEngine(this.scene, this.audio);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x221133, 1.2);
    this.scene.add(ambientLight);

    // Dynamic Point Light at the Singularity / Accretion Core
    this.coreLight = new THREE.PointLight(0xffa500, 3.5, 750, 1.2);
    this.scene.add(this.coreLight);

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Build the relativistic Kerr Black Hole with accretion disk & polar jets
  initBlackHole() {
    this.blackHoleGroup = new THREE.Group();
    this.scene.add(this.blackHoleGroup);

    // 1. Event Horizon (Pitch-black sphere)
    const ehRadius = 9.0;
    const ehGeo = new THREE.SphereGeometry(ehRadius, 64, 64);
    const ehMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.eventHorizon = new THREE.Mesh(ehGeo, ehMat);
    this.blackHoleGroup.add(this.eventHorizon);

    // 2. Photon Sphere / Einstein Ring Rim Glow
    const psGeo = new THREE.SphereGeometry(ehRadius * 1.06, 64, 64);
    this.psMaterial = new THREE.ShaderMaterial({
      vertexShader: Shaders.photonSphere.vertexShader,
      fragmentShader: Shaders.photonSphere.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGlowColor: { value: new THREE.Color(0xffbb44) },
        uRimColor: { value: new THREE.Color(0x3388ff) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.photonSphere = new THREE.Mesh(psGeo, this.psMaterial);
    this.blackHoleGroup.add(this.photonSphere);

    // 3. Volumetric Accretion Disk (Primary horizontal plane)
    const diskInner = ehRadius * 1.4;
    const diskOuter = ehRadius * 7.5;
    const diskGeo = new THREE.RingGeometry(diskInner, diskOuter, 128, 64);
    diskGeo.rotateX(-Math.PI / 2);

    this.diskMaterial = new THREE.ShaderMaterial({
      vertexShader: Shaders.accretionDisk.vertexShader,
      fragmentShader: Shaders.accretionDisk.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorInner: { value: new THREE.Color(0xffffff) },
        uColorMid: { value: new THREE.Color(0xff8811) },
        uColorOuter: { value: new THREE.Color(0xdd1100) },
        uInnerRadius: { value: diskInner },
        uOuterRadius: { value: diskOuter },
        uSpinSpeed: { value: this.spinSpeed },
        uCameraPos: { value: this.camera.position }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.accretionDisk = new THREE.Mesh(diskGeo, this.diskMaterial);
    this.blackHoleGroup.add(this.accretionDisk);

    // 4. Secondary Lensed Arch (Gravitational bending creates the iconic double-halo)
    const haloGeo = new THREE.RingGeometry(diskInner * 0.95, diskOuter * 0.72, 128, 48);
    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader: Shaders.accretionDisk.vertexShader,
      fragmentShader: Shaders.accretionDisk.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorInner: { value: new THREE.Color(0xffffff) },
        uColorMid: { value: new THREE.Color(0xffaa22) },
        uColorOuter: { value: new THREE.Color(0xbb2200) },
        uInnerRadius: { value: diskInner * 0.95 },
        uOuterRadius: { value: diskOuter * 0.72 },
        uSpinSpeed: { value: this.spinSpeed * 0.8 },
        uCameraPos: { value: this.camera.position }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.haloDisk = new THREE.Mesh(haloGeo, this.haloMaterial);
    this.blackHoleGroup.add(this.haloDisk);

    // 5. Relativistic Polar Jets
    const jetGeo = new THREE.CylinderGeometry(0.8, 18, 160, 32, 1, true);
    jetGeo.translate(0, 80, 0);

    this.jetMaterial = new THREE.ShaderMaterial({
      vertexShader: Shaders.polarJet.vertexShader,
      fragmentShader: Shaders.polarJet.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uJetColor: { value: new THREE.Color(0x00e5ff) },
        uIntensity: { value: 1.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.northJet = new THREE.Mesh(jetGeo, this.jetMaterial);
    this.blackHoleGroup.add(this.northJet);

    this.southJet = new THREE.Mesh(jetGeo, this.jetMaterial);
    this.southJet.rotation.x = Math.PI;
    this.blackHoleGroup.add(this.southJet);
  }

  // Deep space multi-layer procedural starfield & cosmic nebulae
  initSpaceBackground() {
    const starCount = 8000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x99ccff),
      new THREE.Color(0xffeedd),
      new THREE.Color(0xff88ee),
      new THREE.Color(0x00ffee)
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 900 + Math.random() * 2200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  // Starfighter "VOID RAVEN" model
  initStarfighter() {
    this.starship = new THREE.Group();

    // Fuselage (stealth cockpit body)
    const bodyGeo = new THREE.ConeGeometry(1.6, 6.5, 5);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x181a24,
      metalness: 0.85,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.starship.add(body);

    // Glowing cockpit canopy glass
    const canopyGeo = new THREE.SphereGeometry(0.85, 16, 16);
    canopyGeo.scale(0.8, 0.7, 1.8);
    canopyGeo.translate(0, 0.65, 0.4);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffee,
      emissive: 0x00ffee,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    this.starship.add(new THREE.Mesh(canopyGeo, canopyMat));

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.5, -2.8);
    wingShape.lineTo(4.2, -3.5);
    wingShape.lineTo(0, -2.0);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(-Math.PI / 2);

    const rightWing = new THREE.Mesh(wingGeo, bodyMat);
    const leftWing = new THREE.Mesh(wingGeo, bodyMat);
    leftWing.scale.x = -1;
    this.starship.add(rightWing);
    this.starship.add(leftWing);

    // Plasma Cannon Pods
    const cannonGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.8, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.9 });
    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(2.4, -0.2, 0.5);
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-2.4, -0.2, 0.5);
    this.starship.add(rightCannon);
    this.starship.add(leftCannon);

    // Glowing Vector Thrusters
    const thrusterGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.0, 16);
    thrusterGeo.rotateX(Math.PI / 2);
    this.thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const thrusterR = new THREE.Mesh(thrusterGeo, this.thrusterMat);
    thrusterR.position.set(0.9, -0.1, -3.2);
    const thrusterL = new THREE.Mesh(thrusterGeo, this.thrusterMat);
    thrusterL.position.set(-0.9, -0.1, -3.2);
    this.starship.add(thrusterR);
    this.starship.add(thrusterL);

    // Energy Shield Bubble (visible when hit)
    const shieldGeo = new THREE.SphereGeometry(4.2, 24, 24);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.starship.add(this.shieldMesh);

    // Starting position in safe orbit
    this.starship.position.set(0, 12, 110);
    this.starship.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    this.scene.add(this.starship);
  }

  // Hyperspace Slipstream Tunnel
  initHyperspaceTunnel() {
    const tunnelGeo = new THREE.CylinderGeometry(40, 40, 450, 32, 32, true);
    tunnelGeo.rotateX(Math.PI / 2);
    this.tunnelMat = new THREE.ShaderMaterial({
      vertexShader: Shaders.warpTunnel.vertexShader,
      fragmentShader: Shaders.warpTunnel.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 3.5 },
        uColorA: { value: new THREE.Color(0x00ffee) },
        uColorB: { value: new THREE.Color(0xff00aa) }
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.warpTunnelMesh = new THREE.Mesh(tunnelGeo, this.tunnelMat);
    this.warpTunnelMesh.visible = false;
    this.scene.add(this.warpTunnelMesh);
  }

  // Spawn hostile AI Hunter-Killer drone
  spawnDrone() {
    const drone = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(2.0, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x220505,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xff0033,
      emissiveIntensity: 1.2
    });
    drone.add(new THREE.Mesh(geo, mat));

    // Orbital ring shield
    const ringGeo = new THREE.TorusGeometry(3.0, 0.1, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    drone.add(ring);
    drone.ring = ring;

    // Spawn randomly in orbit
    const angle = Math.random() * Math.PI * 2;
    const dist = 75 + Math.random() * 60;
    drone.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 30, Math.sin(angle) * dist);

    this.scene.add(drone);
    this.aiDrones.push({
      mesh: drone,
      health: 40,
      fireTimer: Math.random() * 2,
      speed: 35 + Math.random() * 20
    });
  }

  // Input Handling
  initControls() {
    window.addEventListener('keydown', (e) => {
      this.audio.resume();
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      // Camera toggle shortcut
      if (e.key === 'c' || e.key === 'C') {
        const modes = ['orbit', 'starship', 'cockpit', 'cinematic', 'fall'];
        const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
        this.setCameraMode(modes[nextIdx]);
      }

      // Boost shortcut
      if (e.key === 'Shift') {
        this.isBoosting = true;
      }

      // Quick Cataclysm
      if (e.key === 'x' || e.key === 'X') {
        this.triggerSupernova();
      }

      // Quick Hyperspace
      if (e.key === 'h' || e.key === 'H') {
        this.toggleHyperspace();
      }

      // Toggle Audio Mute
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.audio.toggleMute();
        this.updateAudioIndicator(isMuted);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;

      if (e.key === 'Shift') {
        this.isBoosting = false;
      }
    });

    // Mouse aiming & firing
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      this.audio.resume();
      if (e.button === 0) { // Left click: Primary plasma lasers
        this.firePrimaryLaser();
      } else if (e.button === 2) { // Right click: Singularity Torpedo
        e.preventDefault();
        this.fireTorpedo();
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  firePrimaryLaser() {
    if (this.cameraMode === 'orbit') return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.starship.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.starship.quaternion).normalize();

    // Twin cannon firing positions
    const posL = this.starship.position.clone().add(right.clone().multiplyScalar(-2.4)).add(forward.clone().multiplyScalar(2.0));
    const posR = this.starship.position.clone().add(right.clone().multiplyScalar(2.4)).add(forward.clone().multiplyScalar(2.0));

    this.physics.spawnProjectile(posL, forward, 220);
    this.physics.spawnProjectile(posR, forward, 220);
    this.audio.playLaser();
  }

  fireTorpedo() {
    if (this.cameraMode === 'orbit') return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.starship.quaternion).normalize();
    const spawnPos = this.starship.position.clone().add(forward.clone().multiplyScalar(4.0));

    this.physics.spawnProjectile(spawnPos, forward, 120, true);
    this.audio.playTorpedoLaunch();
  }

  // Camera mode switcher
  setCameraMode(mode) {
    this.cameraMode = mode;
    const label = document.getElementById('cam-mode-indicator');
    if (label) {
      label.textContent = mode.toUpperCase();
    }

    if (mode === 'orbit') {
      if (this.orbitControls) this.orbitControls.enabled = true;
    } else {
      if (this.orbitControls) this.orbitControls.enabled = false;
    }
  }

  // Apply Presets
  setPreset(name) {
    this.activePreset = name;
    if (name === 'gargantua') {
      this.diskMaterial.uniforms.uColorInner.value.setHex(0xffffff);
      this.diskMaterial.uniforms.uColorMid.value.setHex(0xffaa22);
      this.diskMaterial.uniforms.uColorOuter.value.setHex(0xdd2200);
      this.psMaterial.uniforms.uGlowColor.value.setHex(0xffbb44);
      this.psMaterial.uniforms.uRimColor.value.setHex(0x3388ff);
      this.jetMaterial.uniforms.uJetColor.value.setHex(0x00e5ff);
      this.coreLight.color.setHex(0xffa500);

    } else if (name === 'cyberpunk') {
      this.diskMaterial.uniforms.uColorInner.value.setHex(0x00ffff);
      this.diskMaterial.uniforms.uColorMid.value.setHex(0xff00aa);
      this.diskMaterial.uniforms.uColorOuter.value.setHex(0x7700ff);
      this.psMaterial.uniforms.uGlowColor.value.setHex(0x00ffff);
      this.psMaterial.uniforms.uRimColor.value.setHex(0xff0077);
      this.jetMaterial.uniforms.uJetColor.value.setHex(0xff00bb);
      this.coreLight.color.setHex(0xff00bb);

    } else if (name === 'abyssal') {
      this.diskMaterial.uniforms.uColorInner.value.setHex(0x88ffff);
      this.diskMaterial.uniforms.uColorMid.value.setHex(0x00ff88);
      this.diskMaterial.uniforms.uColorOuter.value.setHex(0x004422);
      this.psMaterial.uniforms.uGlowColor.value.setHex(0x00ffaa);
      this.psMaterial.uniforms.uRimColor.value.setHex(0x0055ff);
      this.jetMaterial.uniforms.uJetColor.value.setHex(0x00ff66);
      this.coreLight.color.setHex(0x00ff88);

    } else if (name === 'solar') {
      this.diskMaterial.uniforms.uColorInner.value.setHex(0xffffff);
      this.diskMaterial.uniforms.uColorMid.value.setHex(0xffdd00);
      this.diskMaterial.uniforms.uColorOuter.value.setHex(0xff1100);
      this.psMaterial.uniforms.uGlowColor.value.setHex(0xffaa00);
      this.psMaterial.uniforms.uRimColor.value.setHex(0xff4400);
      this.jetMaterial.uniforms.uJetColor.value.setHex(0xffcc00);
      this.coreLight.color.setHex(0xff4400);

    } else if (name === 'matrix') {
      this.diskMaterial.uniforms.uColorInner.value.setHex(0xeeffee);
      this.diskMaterial.uniforms.uColorMid.value.setHex(0x00ff44);
      this.diskMaterial.uniforms.uColorOuter.value.setHex(0x003311);
      this.psMaterial.uniforms.uGlowColor.value.setHex(0x00ff33);
      this.psMaterial.uniforms.uRimColor.value.setHex(0x008822);
      this.jetMaterial.uniforms.uJetColor.value.setHex(0x00ff22);
      this.coreLight.color.setHex(0x00ff44);
    }
  }

  // Supernova Cataclysm Detonation
  triggerSupernova() {
    this.audio.playSupernova();
    this.physics.triggerShockwave(new THREE.Vector3(0, 0, 0), 0xffffff, 380);
    this.physics.triggerShockwave(new THREE.Vector3(0, 0, 0), 0xff3300, 290);
    this.physics.triggerShockwave(new THREE.Vector3(0, 0, 0), 0x00e5ff, 200);

    // Blast all celestial bodies into fragments
    for (let body of this.physics.celestialBodies) {
      for (let k = 0; k < 60; k++) {
        const sparkVel = new THREE.Vector3(
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120
        );
        this.physics.spawnParticle(body.pos, sparkVel, new THREE.Color(1.0, 0.4, 0.1), 5.0, 2.5);
      }
    }
    this.physics.clearAll();

    // Camera flash effect
    const flashEl = document.getElementById('flash-overlay');
    if (flashEl) {
      flashEl.style.opacity = '1.0';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 120);
    }
  }

  // Hyperspace Warp Drive Jump
  toggleHyperspace() {
    this.warpActive = !this.warpActive;
    this.warpTunnelMesh.visible = this.warpActive;
    if (this.warpActive) {
      this.warpTunnelMesh.position.copy(this.camera.position);
      this.warpTunnelMesh.quaternion.copy(this.camera.quaternion);
      this.audio.playTorpedoLaunch();
    }
  }

  // Toggle War Zone AI Drones
  toggleWarZone() {
    this.warZoneActive = !this.warZoneActive;
    if (this.warZoneActive) {
      for (let i = 0; i < 4; i++) {
        this.spawnDrone();
      }
    } else {
      for (let drone of this.aiDrones) {
        this.scene.remove(drone.mesh);
      }
      this.aiDrones = [];
    }
  }

  // Main UI event bindings
  initUI() {
    // Planet Spawner Buttons
    document.querySelectorAll('[data-spawn]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.audio.resume();
        const type = btn.getAttribute('data-spawn');
        // Spawn in stable circular orbit with random angle
        const orbitRadius = 45 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(angle) * orbitRadius, (Math.random() - 0.5) * 8, Math.sin(angle) * orbitRadius);

        // Circular orbital velocity: v = sqrt(G*M / r)
        const vMag = Math.sqrt((this.physics.G * this.physics.blackHoleMass) / orbitRadius) * 0.95;
        const vel = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(vMag);

        this.physics.spawnPlanet(type, pos, vel);
      });
    });

    // Preset Buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setPreset(btn.getAttribute('data-preset'));
      });
    });

    // Camera Mode Buttons
    document.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setCameraMode(btn.getAttribute('data-cam'));
      });
    });

    // Sliders
    const massSlider = document.getElementById('slider-mass');
    if (massSlider) {
      massSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.physics.setMass(val);
        document.getElementById('mass-readout').textContent = `${val} M☉`;
        const scale = val / 1000;
        this.eventHorizon.scale.set(scale, scale, scale);
        this.photonSphere.scale.set(scale, scale, scale);
      });
    }

    const timeSlider = document.getElementById('slider-time');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.physics.timeScale = val;
        document.getElementById('time-readout').textContent = `${val.toFixed(1)}x`;
      });
    }

    // Cataclysm Buttons
    const btnSupernova = document.getElementById('btn-supernova');
    if (btnSupernova) {
      btnSupernova.addEventListener('click', () => this.triggerSupernova());
    }

    const btnWarp = document.getElementById('btn-warp');
    if (btnWarp) {
      btnWarp.addEventListener('click', () => this.toggleHyperspace());
    }

    const btnWarzone = document.getElementById('btn-warzone');
    if (btnWarzone) {
      btnWarzone.addEventListener('click', () => {
        this.toggleWarZone();
        btnWarzone.classList.toggle('active-mode', this.warZoneActive);
      });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => this.physics.clearAll());
    }

    // Audio Button
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        this.audio.resume();
        const isMuted = this.audio.toggleMute();
        this.updateAudioIndicator(isMuted);
      });
    }

    // Overlay Start click to initialize AudioContext
    const overlay = document.getElementById('click-to-start');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.audio.resume();
        overlay.classList.add('hidden');
      });
    }
  }

  updateAudioIndicator(isMuted) {
    const audioIcon = document.getElementById('audio-icon');
    if (audioIcon) {
      audioIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  // Starfighter flight controller
  updateStarfighter(dt) {
    if (!this.starship) return;

    const rotationSpeed = 2.4;
    const accel = 60;
    const targetMax = this.isBoosting ? this.boostSpeed : this.maxSpeed;

    // Pitch & Yaw & Roll
    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    if (this.keys['w'] || this.keys['arrowup']) pitch += 1;
    if (this.keys['s'] || this.keys['arrowdown']) pitch -= 1;
    if (this.keys['a'] || this.keys['arrowleft']) yaw += 1;
    if (this.keys['d'] || this.keys['arrowright']) yaw -= 1;
    if (this.keys['q']) roll += 1;
    if (this.keys['e']) roll -= 1;

    // Banking auto-roll during yaw
    roll -= yaw * 0.45;

    this.starship.rotateX(pitch * rotationSpeed * dt);
    this.starship.rotateY(yaw * rotationSpeed * dt);
    this.starship.rotateZ(roll * rotationSpeed * dt);

    // Thrust forward / reverse
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.starship.quaternion);
    let throttle = 0;
    if (this.keys[' '] || this.isBoosting) throttle = 1;
    else if (this.keys['s'] && this.cameraMode !== 'orbit') throttle = -0.3;
    else throttle = 0.4; // Cruise forward

    const targetVelocity = forward.clone().multiplyScalar(targetMax * throttle);
    this.shipVelocity.lerp(targetVelocity, 3.5 * dt);

    // Starship gravitational attraction towards black hole!
    const rVec = new THREE.Vector3(0, 0, 0).sub(this.starship.position);
    const distToHole = rVec.length();
    const gravPull = (this.physics.G * this.physics.blackHoleMass) / (distToHole * distToHole + 50.0);
    this.shipVelocity.addScaledVector(rVec.normalize(), gravPull * dt * 0.35);

    this.starship.position.addScaledVector(this.shipVelocity, dt);
    this.shipSpeed = this.shipVelocity.length();

    // Thruster engine visual intensity
    if (this.thrusterMat) {
      const heat = Math.min(this.shipSpeed / this.boostSpeed, 1.0);
      this.thrusterMat.color.setRGB(0.1 + heat * 0.9, 0.8 + (1 - heat) * 0.2, 1.0);
    }

    // Audio Engine modulation
    this.audio.updateStarshipSound(this.shipSpeed / this.maxSpeed, this.isBoosting);

    // HUD Telemetry readouts
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) speedEl.textContent = `${Math.floor(this.shipSpeed * 18)} km/s`;

    const distEl = document.getElementById('hud-distance');
    if (distEl) {
      distEl.textContent = `${Math.floor(distToHole)} AU`;
      distEl.style.color = distToHole < 30 ? '#ff0055' : (distToHole < 60 ? '#ffaa00' : '#00ffff');
    }

    const warningEl = document.getElementById('hud-warning');
    if (warningEl) {
      if (distToHole < 22) {
        warningEl.classList.remove('hidden');
        warningEl.textContent = '⚠️ CRITICAL: EVENT HORIZON PROXIMITY';
      } else {
        warningEl.classList.add('hidden');
      }
    }

    // If starship falls into black hole -> slingshot / respawn
    if (distToHole < this.physics.eventHorizonRadius + 1.0) {
      this.audio.playExplosion(2.0);
      this.physics.triggerShockwave(new THREE.Vector3(0, 0, 0), 0xff0044, 150);
      this.starship.position.set(0, 15, 115);
      this.shipVelocity.set(0, 0, 0);
    }
  }

  // Update AI Hunter Drones
  updateDrones(dt) {
    for (let i = this.aiDrones.length - 1; i >= 0; i--) {
      const drone = this.aiDrones[i];
      drone.mesh.ring.rotation.z += 3.0 * dt;

      // Circle around black hole or target player
      const toPlayer = this.starship.position.clone().sub(drone.mesh.position);
      const distToPlayer = toPlayer.length();

      // Drone movement
      drone.mesh.position.addScaledVector(toPlayer.normalize(), drone.speed * dt * 0.4);

      // Drone firing
      drone.fireTimer -= dt;
      if (drone.fireTimer <= 0 && distToPlayer < 120) {
        drone.fireTimer = 1.8 + Math.random() * 1.5;
        this.physics.spawnProjectile(drone.mesh.position, toPlayer.normalize(), 150, false, true);
        this.audio.playLaser(true);
      }

      // Check collision with player projectiles
      for (let j = this.physics.projectiles.length - 1; j >= 0; j--) {
        const proj = this.physics.projectiles[j];
        if (proj.isHostile) continue;

        if (proj.pos.distanceTo(drone.mesh.position) < 3.2) {
          drone.health -= 25;
          this.scene.remove(proj.mesh);
          this.physics.projectiles.splice(j, 1);

          if (drone.health <= 0) {
            this.scene.remove(drone.mesh);
            this.physics.triggerShockwave(drone.mesh.position, 0xff0033, 45);
            this.audio.playExplosion(1.1);

            for (let k = 0; k < 25; k++) {
              const sparkVel = new THREE.Vector3(
                (Math.random() - 0.5) * 45,
                (Math.random() - 0.5) * 45,
                (Math.random() - 0.5) * 45
              );
              this.physics.spawnParticle(drone.mesh.position, sparkVel, new THREE.Color(1, 0.1, 0.2), 3.5, 1.2);
            }

            this.aiDrones.splice(i, 1);
            setTimeout(() => { if (this.warZoneActive) this.spawnDrone(); }, 3500);
            break;
          }
        }
      }
    }
  }

  // Camera tracking logic
  updateCamera(dt) {
    if (this.cameraMode === 'orbit') {
      if (this.orbitControls) this.orbitControls.update();

    } else if (this.cameraMode === 'starship') {
      // 3rd Person Follow Camera behind the starship
      const offset = new THREE.Vector3(0, 4.2, 14.5).applyQuaternion(this.starship.quaternion);
      const targetCamPos = this.starship.position.clone().add(offset);
      this.camera.position.lerp(targetCamPos, 8.0 * dt);

      const lookTarget = this.starship.position.clone().add(new THREE.Vector3(0, 1.2, -10).applyQuaternion(this.starship.quaternion));
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'cockpit') {
      // First Person Cockpit POV
      const cockpitOffset = new THREE.Vector3(0, 0.85, 0.4).applyQuaternion(this.starship.quaternion);
      this.camera.position.copy(this.starship.position).add(cockpitOffset);

      const lookTarget = this.starship.position.clone().add(new THREE.Vector3(0, 0.5, -30).applyQuaternion(this.starship.quaternion));
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'cinematic') {
      // Slow majestic sweeping orbit
      this.cinematicAngle += 0.22 * dt;
      const camDist = 95 + Math.sin(this.cinematicAngle * 0.5) * 25;
      this.camera.position.set(
        Math.cos(this.cinematicAngle) * camDist,
        18 + Math.cos(this.cinematicAngle * 0.8) * 12,
        Math.sin(this.cinematicAngle) * camDist
      );
      this.camera.lookAt(0, 0, 0);

    } else if (this.cameraMode === 'fall') {
      // Event Horizon plunge POV
      this.camera.lookAt(0, 0, 0);
      const toCore = new THREE.Vector3(0, 0, 0).sub(this.camera.position);
      if (toCore.length() > this.physics.eventHorizonRadius + 1.5) {
        this.camera.position.addScaledVector(toCore.normalize(), 18.0 * dt);
      } else {
        this.camera.position.set(0, 35, 120);
      }
    }
  }

  // Animation Loop
  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Black Hole Shaders
    this.diskMaterial.uniforms.uTime.value = elapsedTime;
    this.diskMaterial.uniforms.uCameraPos.value.copy(this.camera.position);

    this.haloMaterial.uniforms.uTime.value = elapsedTime;
    this.haloMaterial.uniforms.uCameraPos.value.copy(this.camera.position);

    this.psMaterial.uniforms.uTime.value = elapsedTime;
    this.jetMaterial.uniforms.uTime.value = elapsedTime;

    if (this.warpActive) {
      this.tunnelMat.uniforms.uTime.value = elapsedTime;
      this.warpTunnelMesh.position.copy(this.camera.position);
    }

    // Orient the secondary lensed halo towards camera for Gargantua effect
    this.haloDisk.lookAt(this.camera.position);

    // 2. Update Physics & Celestial Bodies
    this.physics.update(dt);

    // 3. Update Player Starfighter
    this.updateStarfighter(dt);

    // 4. Update Hostile AI Drones
    if (this.warZoneActive) {
      this.updateDrones(dt);
    }

    // 5. Update Camera
    this.updateCamera(dt);

    // 6. Update Audio Hum
    const shipDist = this.starship.position.length();
    this.audio.updateDrone(shipDist / 120, this.physics.blackHoleMass / 1000);

    // 7. Update Cosmic Background rotation
    this.stars.rotation.y += 0.00015;

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate Simulation upon page load
window.addEventListener('DOMContentLoaded', () => {
  window.sim = new SingularitySimulation();
});
