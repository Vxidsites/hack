/**
 * SINGULARITY: OMEGA CORE - Celestial Gravitational Physics & Tidal Disruption Engine
 * Includes relativistic orbital mechanics, Roche limit spaghettification, and projectile simulation.
 */

class PhysicsEngine {
  constructor(scene, audioEngine) {
    this.scene = scene;
    this.audio = audioEngine;
    this.celestialBodies = [];
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.drones = [];

    // Black hole parameters
    this.G = 2800; // Gravitational constant scaled for real-time visual excitement
    this.blackHoleMass = 1000;
    this.eventHorizonRadius = 9.0;
    this.iscoRadius = 27.0; // Innermost Stable Circular Orbit
    this.timeScale = 1.0;

    // Particle pool for spaghettification & explosions
    this.initParticleSystem();
  }

  setMass(mass) {
    this.blackHoleMass = mass;
    this.eventHorizonRadius = 9.0 * (mass / 1000);
    this.iscoRadius = 27.0 * (mass / 1000);
  }

  initParticleSystem() {
    this.maxParticles = 6000;
    this.particleGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.particleData = [];

    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -99999;
      this.positions[i * 3 + 2] = 0;
      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 0.5;
      this.colors[i * 3 + 2] = 0.2;
      this.sizes[i] = 0;
      this.particleData.push({
        active: false,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        color: new THREE.Color(1, 0.5, 0.2),
        size: 2
      });
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Custom point shader / additive material for brilliant glowing embers
    const pMat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    });

    this.particleMesh = new THREE.Points(this.particleGeo, pMat);
    this.scene.add(this.particleMesh);
  }

  spawnParticle(pos, vel, color, size = 3, life = 2.0) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particleData[i];
      if (!p.active) {
        p.active = true;
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.color.copy(color);
        p.vel.copy(vel);

        this.positions[i * 3] = pos.x;
        this.positions[i * 3 + 1] = pos.y;
        this.positions[i * 3 + 2] = pos.z;

        this.colors[i * 3] = color.r;
        this.colors[i * 3 + 1] = color.g;
        this.colors[i * 3 + 2] = color.b;

        this.sizes[i] = size;
        break;
      }
    }
  }

  // Spawn celestial body with procedural styling
  spawnPlanet(type, pos, vel) {
    let radius = 2.4;
    let mass = 15;
    let meshGroup = new THREE.Group();

    if (type === 'terra') {
      radius = 2.8;
      mass = 20;
      const baseGeo = new THREE.SphereGeometry(radius, 32, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1a75ff,
        roughness: 0.4,
        metalness: 0.1,
        emissive: 0x002244
      });
      const planetMesh = new THREE.Mesh(baseGeo, baseMat);
      meshGroup.add(planetMesh);

      // Cloud atmosphere shell
      const cloudGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const clouds = new THREE.Mesh(cloudGeo, cloudMat);
      meshGroup.add(clouds);
      meshGroup.clouds = clouds;

    } else if (type === 'molten') {
      radius = 3.2;
      mass = 35;
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x220500,
        emissive: 0xff3300,
        emissiveIntensity: 0.9,
        roughness: 0.7
      });
      const planetMesh = new THREE.Mesh(geo, mat);
      meshGroup.add(planetMesh);

    } else if (type === 'cyber') {
      radius = 3.0;
      mass = 25;
      const geo = new THREE.IcosahedronGeometry(radius, 3);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x050510,
        wireframe: true,
        emissive: 0x00ffee,
        emissiveIntensity: 1.5
      });
      const innerMat = new THREE.MeshBasicMaterial({ color: 0x110033 });
      meshGroup.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.95, 24, 24), innerMat));
      meshGroup.add(new THREE.Mesh(geo, mat));

      // Neon cyber orbital ring
      const ringGeo = new THREE.TorusGeometry(radius * 1.8, 0.12, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 3;
      meshGroup.add(ring);
      meshGroup.ring = ring;

    } else if (type === 'crystal') {
      radius = 1.6;
      mass = 8;
      const geo = new THREE.DodecahedronGeometry(radius, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xaa00ff,
        emissive: 0xbb33ff,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.8
      });
      meshGroup.add(new THREE.Mesh(geo, mat));

    } else if (type === 'antimatter') {
      radius = 1.4;
      mass = 45;
      const geo = new THREE.SphereGeometry(radius, 24, 24);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      meshGroup.add(new THREE.Mesh(geo, mat));

      // Surrounding containment hazard cage
      const cageGeo = new THREE.BoxGeometry(radius * 2.2, radius * 2.2, radius * 2.2);
      const cageMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
      const cage = new THREE.Mesh(cageGeo, cageMat);
      meshGroup.add(cage);
      meshGroup.cage = cage;
    }

    meshGroup.position.copy(pos);
    this.scene.add(meshGroup);

    // Orbital trail ribbon
    const maxTrailPoints = 120;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    for (let i = 0; i < maxTrailPoints * 3; i += 3) {
      trailPositions[i] = pos.x;
      trailPositions[i + 1] = pos.y;
      trailPositions[i + 2] = pos.z;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: type === 'cyber' ? 0x00ffee : (type === 'molten' ? 0xff4400 : 0x44aaff),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    this.scene.add(trailLine);

    const body = {
      type,
      mesh: meshGroup,
      trail: trailLine,
      trailHistory: [],
      maxTrail: maxTrailPoints,
      radius,
      mass,
      pos: pos.clone(),
      vel: vel.clone(),
      alive: true,
      spaghettified: false,
      stretchFactor: 1.0
    };

    this.celestialBodies.push(body);
    return body;
  }

  // Create expanding gravitational shockwave ring
  triggerShockwave(pos, color = 0x00e5ff, maxRadius = 140) {
    const geo = new THREE.RingGeometry(0.5, 4.0, 64);
    const mat = new THREE.ShaderMaterial({
      vertexShader: Shaders.shockwave.vertexShader,
      fragmentShader: Shaders.shockwave.fragmentShader,
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(color) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      progress: 0.0,
      speed: 0.65,
      maxRadius
    });
  }

  // Spawn player or AI projectile (lasers or torpedoes)
  spawnProjectile(origin, dir, speed, isTorpedo = false, isHostile = false) {
    const velocity = dir.clone().multiplyScalar(speed);
    const pos = origin.clone();

    let mesh;
    if (isTorpedo) {
      const geo = new THREE.SphereGeometry(0.8, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: isHostile ? 0xff0044 : 0x00ffff
      });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: isHostile ? 0xff2222 : 0x00ffcc
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    }

    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      pos,
      vel: velocity,
      isTorpedo,
      isHostile,
      life: isTorpedo ? 10.0 : 4.0,
      maxLife: isTorpedo ? 10.0 : 4.0
    });
  }

  update(dt) {
    const effectiveDt = Math.min(dt, 0.05) * this.timeScale;
    const center = new THREE.Vector3(0, 0, 0);

    // 1. Update Celestial Bodies (Gravity + Spaghettification)
    for (let i = this.celestialBodies.length - 1; i >= 0; i--) {
      const b = this.celestialBodies[i];
      if (!b.alive) continue;

      const rVec = center.clone().sub(b.pos);
      const r = rVec.length();

      // Check Event Horizon crossing -> Absorbed into Singularity!
      if (r <= this.eventHorizonRadius) {
        b.alive = false;
        this.scene.remove(b.mesh);
        this.scene.remove(b.trail);

        this.triggerShockwave(center, 0xffaa00, 110);
        this.audio.playExplosion(1.5);
        this.celestialBodies.splice(i, 1);
        continue;
      }

      // Roche Limit (Tidal Spaghettification Zone)
      const rocheLimit = this.eventHorizonRadius * 2.8;
      if (r < rocheLimit) {
        b.spaghettified = true;
        const tidalStrength = Math.min((rocheLimit - r) / (rocheLimit - this.eventHorizonRadius), 1.0);

        // Visually stretch the planet along the black hole gravitational vector
        const stretch = 1.0 + tidalStrength * 3.5;
        b.mesh.scale.set(1.0 / Math.sqrt(stretch), stretch, 1.0 / Math.sqrt(stretch));
        b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rVec.clone().normalize());

        // Stream of glowing plasma shred particles
        const shredCount = Math.floor(tidalStrength * 6) + 1;
        for (let s = 0; s < shredCount; s++) {
          const shredPos = b.pos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * b.radius,
            (Math.random() - 0.5) * b.radius,
            (Math.random() - 0.5) * b.radius
          ));
          const tangent = new THREE.Vector3(-rVec.z, 0, rVec.x).normalize().multiplyScalar(45 + Math.random() * 30);
          const inward = rVec.clone().normalize().multiplyScalar(35);
          const shredVel = b.vel.clone().multiplyScalar(0.7).add(tangent).add(inward);

          const col = b.type === 'molten' ? new THREE.Color(1, 0.3, 0.05) :
                     (b.type === 'cyber' ? new THREE.Color(0, 1, 0.9) : new THREE.Color(1, 0.8, 0.2));
          this.spawnParticle(shredPos, shredVel, col, 3.5, 1.8);
        }

        if (Math.random() < 0.05) {
          this.audio.playSpaghettification();
        }
      }

      // Relativistic Gravitational acceleration with Schwarzschild correction:
      // a = G * M / r^2 * (1 + 3*G*M / (c^2 * r))
      const cSq = 35000;
      const relCorrection = 1.0 + (3.0 * this.G * this.blackHoleMass) / (cSq * (r + 0.1));
      const accelMag = (this.G * this.blackHoleMass / (r * r + 15.0)) * relCorrection;
      const accel = rVec.normalize().multiplyScalar(accelMag);

      b.vel.addScaledVector(accel, effectiveDt);
      b.pos.addScaledVector(b.vel, effectiveDt);
      b.mesh.position.copy(b.pos);

      // Minor planet rotational animation
      if (b.mesh.clouds) b.mesh.clouds.rotation.y += 0.015 * effectiveDt;
      if (b.mesh.ring) b.mesh.ring.rotation.z += 0.02 * effectiveDt;
      if (b.mesh.cage) b.mesh.cage.rotation.x += 0.05 * effectiveDt;

      // Update orbital trail
      b.trailHistory.push(b.pos.clone());
      if (b.trailHistory.length > b.maxTrail) {
        b.trailHistory.shift();
      }

      const trailAttr = b.trail.geometry.attributes.position;
      for (let t = 0; t < b.maxTrail; t++) {
        const histPoint = b.trailHistory[t] || b.pos;
        trailAttr.setXYZ(t, histPoint.x, histPoint.y, histPoint.z);
      }
      trailAttr.needsUpdate = true;
    }

    // 2. Update Projectiles & Gravitational Bending
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= effectiveDt;

      const rVec = center.clone().sub(p.pos);
      const r = rVec.length();

      // Gravity pulls projectiles too!
      const gravFactor = p.isTorpedo ? 1.0 : 0.35;
      const accelMag = (this.G * this.blackHoleMass / (r * r + 20.0)) * gravFactor;
      p.vel.addScaledVector(rVec.normalize(), accelMag * effectiveDt);

      p.pos.addScaledVector(p.vel, effectiveDt);
      p.mesh.position.copy(p.pos);

      // Particle sparks behind torpedo
      if (p.isTorpedo && Math.random() < 0.6) {
        this.spawnParticle(p.pos, p.vel.clone().multiplyScalar(-0.15), new THREE.Color(0, 0.9, 1.0), 3.0, 0.6);
      }

      // Check collision with Black Hole
      if (r <= this.eventHorizonRadius) {
        this.scene.remove(p.mesh);
        this.triggerShockwave(p.pos, 0x00ffcc, 40);
        this.audio.playExplosion(0.8);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with Celestial Bodies
      let hit = false;
      for (let j = 0; j < this.celestialBodies.length; j++) {
        const body = this.celestialBodies[j];
        if (p.pos.distanceTo(body.pos) < body.radius + 1.0) {
          hit = true;
          this.triggerShockwave(p.pos, 0xff7700, 60);
          this.audio.playExplosion(1.2);

          // Shatter fragments
          for (let k = 0; k < 45; k++) {
            const sparkVel = new THREE.Vector3(
              (Math.random() - 0.5) * 60,
              (Math.random() - 0.5) * 60,
              (Math.random() - 0.5) * 60
            );
            this.spawnParticle(p.pos, sparkVel, new THREE.Color(1.0, 0.6, 0.1), 4.0, 1.5);
          }
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Update Particles
    let activeParticlesCount = 0;
    const posAttr = this.particleGeo.attributes.position;
    const sizeAttr = this.particleGeo.attributes.size;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particleData[i];
      if (!p.active) continue;

      p.life -= effectiveDt;
      if (p.life <= 0) {
        p.active = false;
        posAttr.setY(i, -99999);
        sizeAttr.setX(i, 0);
        continue;
      }

      // Particle gravitational pull towards Singularity
      const pPos = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      const pDist = pPos.length();
      if (pDist < this.eventHorizonRadius) {
        p.active = false;
        posAttr.setY(i, -99999);
        sizeAttr.setX(i, 0);
        continue;
      }

      const pAccel = pPos.clone().negate().normalize().multiplyScalar(this.G * this.blackHoleMass / (pDist * pDist + 10.0));
      p.vel.addScaledVector(pAccel, effectiveDt);
      pPos.addScaledVector(p.vel, effectiveDt);

      posAttr.setXYZ(i, pPos.x, pPos.y, pPos.z);
      sizeAttr.setX(i, p.size * (p.life / p.maxLife));
      activeParticlesCount++;
    }

    if (activeParticlesCount > 0) {
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    // 4. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.progress += sw.speed * effectiveDt;
      sw.mesh.material.uniforms.uProgress.value = sw.progress;
      const s = sw.progress * sw.maxRadius;
      sw.mesh.scale.set(s, s, s);

      if (sw.progress >= 1.0) {
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // Clear all orbital bodies
  clearAll() {
    for (let b of this.celestialBodies) {
      this.scene.remove(b.mesh);
      this.scene.remove(b.trail);
    }
    this.celestialBodies = [];
  }
}
