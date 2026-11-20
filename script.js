    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ================= 1. GALAXY BACKGROUND =================
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07030d, 0.0085);
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    function updateCamera() {
      const aspect = window.innerWidth / window.innerHeight;
      camera.aspect = aspect;
      if (aspect < 0.85) camera.position.set(0, 0.2, Math.min(34, 18.5 / Math.max(aspect, 0.46)));
      else camera.position.set(0, 1.5, 22);
      camera.updateProjectionMatrix();
    }
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    function updateRendererSize() {
      const maxDpr = window.innerWidth < 768 ? 1.25 : 1.75;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    updateRendererSize();
    container.appendChild(renderer.domElement);

    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    // 3D Cosmic Lighting for sculpted asteroids
    scene.add(new THREE.HemisphereLight(0x9ec5ff, 0x26122c, 0.72));
    const sunKeyLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    sunKeyLight.position.set(18, 12, 22);
    scene.add(sunKeyLight);
    const starRimLight = new THREE.DirectionalLight(0x68b5ff, 0.68);
    starRimLight.position.set(-20, -10, -14);
    scene.add(starRimLight);
    const roseBounceLight = new THREE.PointLight(0xff5c8a, 0.75, 85);
    roseBounceLight.position.set(0, 0, 12);
    scene.add(roseBounceLight);

    function createCanvasTexture(size, drawFn) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      drawFn(c.getContext('2d'), size);
      return new THREE.CanvasTexture(c);
    }

    function createStarGlowTexture() {
      return createCanvasTexture(64, (ctx, s) => {
        const half = s * 0.5;
        const g = ctx.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.28, 'rgba(255, 245, 252, 0.85)');
        g.addColorStop(0.62, 'rgba(255, 210, 230, 0.22)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      });
    }

    function createAsteroidRockTextures() {
      const size = 256;
      const colorC = document.createElement('canvas');
      const bumpC = document.createElement('canvas');
      colorC.width = bumpC.width = size;
      colorC.height = bumpC.height = size;
      const cCtx = colorC.getContext('2d');
      const bCtx = bumpC.getContext('2d');

      cCtx.fillStyle = '#736d78';
      cCtx.fillRect(0, 0, size, size);
      bCtx.fillStyle = '#808080';
      bCtx.fillRect(0, 0, size, size);

      // Seeded mineral speckles & fine regolith texture
      let s = 1337;
      const nextRand = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };

      for (let i = 0; i < 950; i++) {
        const px = nextRand() * size;
        const py = nextRand() * size;
        const r = 0.8 + nextRand() * 3.4;
        const shade = Math.floor(80 + nextRand() * 115);
        cCtx.fillStyle = `rgba(${shade}, ${Math.floor(shade * 0.94)}, ${Math.floor(shade * 1.02)}, 0.35)`;
        bCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.35)`;
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            if (px + ox < -r || px + ox > size + r || py + oy < -r || py + oy > size + r) continue;
            cCtx.beginPath(); cCtx.arc(px + ox, py + oy, r, 0, Math.PI * 2); cCtx.fill();
            bCtx.beginPath(); bCtx.arc(px + ox, py + oy, r, 0, Math.PI * 2); bCtx.fill();
          }
        }
      }

      // Impact craters with recessed bowls and raised rims (wrapped seamlessly)
      for (let i = 0; i < 26; i++) {
        const cx = nextRand() * size;
        const cy = nextRand() * size;
        const cr = 6 + nextRand() * 18;
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            const x = cx + ox;
            const y = cy + oy;
            if (x < -cr || x > size + cr || y < -cr || y > size + cr) continue;

            const cg = cCtx.createRadialGradient(x, y, cr * 0.1, x, y, cr);
            cg.addColorStop(0, 'rgba(34, 30, 42, 0.72)');
            cg.addColorStop(0.68, 'rgba(56, 50, 66, 0.45)');
            cg.addColorStop(0.86, 'rgba(182, 174, 194, 0.48)');
            cg.addColorStop(1, 'rgba(115, 109, 120, 0)');
            cCtx.fillStyle = cg;
            cCtx.beginPath(); cCtx.arc(x, y, cr, 0, Math.PI * 2); cCtx.fill();

            const bg = bCtx.createRadialGradient(x, y, cr * 0.1, x, y, cr);
            bg.addColorStop(0, 'rgba(28, 28, 28, 0.85)');
            bg.addColorStop(0.68, 'rgba(72, 72, 72, 0.5)');
            bg.addColorStop(0.86, 'rgba(232, 232, 232, 0.75)');
            bg.addColorStop(1, 'rgba(128, 128, 128, 0)');
            bCtx.fillStyle = bg;
            bCtx.beginPath(); bCtx.arc(x, y, cr, 0, Math.PI * 2); bCtx.fill();
          }
        }
      }

      const map = new THREE.CanvasTexture(colorC);
      const bumpMap = new THREE.CanvasTexture(bumpC);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
      return { map, bumpMap };
    }

    function createDistantGalaxyTextures() {
      const variants = [
        { core: '#fff7e6', inner: '#a5d8ff', outer: '#6366f1', arms: 2, twist: 3.1, bar: 0.0, edge: false },
        { core: '#ffe8f0', inner: '#ff85b3', outer: '#a855f7', arms: 2, twist: 2.6, bar: 0.35, edge: false },
        { core: '#fff5d6', inner: '#ffd166', outer: '#f97316', arms: 0, twist: 0.0, bar: 0.0, edge: false },
        { core: '#fff9ec', inner: '#e2e8f0', outer: '#93c5fd', arms: 2, twist: 1.8, bar: 0.0, edge: true },
        { core: '#ecfeff', inner: '#67e8f9', outer: '#4f46e5', arms: 3, twist: 3.8, bar: 0.0, edge: false }
      ];

      return variants.map((v, idx) => createCanvasTexture(256, (ctx, size) => {
        const half = size * 0.5;
        let s = 9001 + idx * 791;
        const rand = () => {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };

        ctx.save();
        ctx.translate(half, half);
        if (v.edge) ctx.scale(1.0, 0.24);

        // Glowing galactic bulge & outer halo
        const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, half * 0.9);
        halo.addColorStop(0, v.core);
        halo.addColorStop(0.18, v.inner);
        halo.addColorStop(0.45, v.outer);
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = v.arms === 0 ? 0.85 : 0.45;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.9, 0, Math.PI * 2);
        ctx.fill();

        if (v.bar > 0) {
          ctx.fillStyle = v.inner;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.ellipse(0, 0, half * 0.28, half * 0.07, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Spiral arms & distant star dust
        if (v.arms > 0) {
          const dustCount = 460;
          for (let i = 0; i < dustCount; i++) {
            const t = Math.pow(rand(), 0.72);
            const armIdx = i % v.arms;
            const armAngle = (armIdx / v.arms) * Math.PI * 2;
            const theta = armAngle + t * v.twist + (rand() - 0.5) * (0.28 + t * 0.55);
            const rad = (0.06 + t * 0.78) * half;
            const px = Math.cos(theta) * rad;
            const py = Math.sin(theta) * rad;
            const dotR = (0.8 + rand() * 3.4) * (1 - t * 0.45);
            ctx.globalAlpha = (0.14 + rand() * 0.48) * (1 - t * 0.55);
            ctx.fillStyle = t < 0.35 ? v.inner : v.outer;
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Bright galactic nucleus
        ctx.globalAlpha = 0.95;
        const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.24);
        coreG.addColorStop(0, '#ffffff');
        coreG.addColorStop(0.45, v.core);
        coreG.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreG;
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.24, 0, Math.PI * 2);
        ctx.fill();

        if (v.edge) {
          // Subtle central dark dust lane across edge-on Sombrero-style galaxy
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = 'rgba(7, 3, 13, 0.75)';
          ctx.fillRect(-half * 0.82, -2, half * 1.64, 4);
        }
        ctx.restore();

        // Smooth circular edge alpha fade so planes never show square bounds
        ctx.globalCompositeOperation = 'destination-in';
        const mask = ctx.createRadialGradient(half, half, half * 0.45, half, half, half * 0.96);
        mask.addColorStop(0, 'rgba(255, 255, 255, 1)');
        mask.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = mask;
        ctx.fillRect(0, 0, size, size);
      }));
    }

    function createNebulaCloudTexture(innerRgba, midRgba) {
      return createCanvasTexture(256, (ctx, size) => {
        const half = size * 0.5;
        const puffs = [
          [half, half, half * 0.85],
          [half * 0.76, half * 0.9, half * 0.55],
          [half * 1.24, half * 1.08, half * 0.52]
        ];
        for (const [px, py, r] of puffs) {
          const g = ctx.createRadialGradient(px, py, 2, px, py, r);
          g.addColorStop(0, innerRgba);
          g.addColorStop(0.45, midRgba);
          g.addColorStop(1, 'rgba(7, 3, 13, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    function createAsteroidGeometry(seed, detail) {
      const geo = new THREE.IcosahedronGeometry(1, detail);
      const pos = geo.attributes.position;

      let s = seed;
      const nextRand = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };

      const p1 = nextRand() * 6.28, p2 = nextRand() * 6.28, p3 = nextRand() * 6.28;
      const sx = 0.78 + nextRand() * 0.44;
      const sy = 0.68 + nextRand() * 0.36;
      const sz = 0.76 + nextRand() * 0.44;

      // 4 deterministic impact craters on the unit sphere
      const craters = [];
      for (let c = 0; c < 4; c++) {
        const th = nextRand() * Math.PI * 2;
        const ph = Math.acos(2 * nextRand() - 1);
        craters.push({
          x: Math.sin(ph) * Math.cos(th),
          y: Math.sin(ph) * Math.sin(th),
          z: Math.cos(ph),
          r: 0.32 + nextRand() * 0.28,
          depth: 0.14 + nextRand() * 0.12
        });
      }

      // Displace purely from unit direction (nx, ny, nz) so shared vertices have zero seams
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const len = Math.hypot(vx, vy, vz) || 1;
        const nx = vx / len;
        const ny = vy / len;
        const nz = vz / len;

        const n1 = Math.sin(nx * 3.1 + p1) * Math.cos(ny * 2.9 + p2) * Math.sin(nz * 3.3 + p3);
        const n2 = Math.sin(nx * 6.3 + nz * 5.1 + p2) * Math.cos(ny * 6.1 + p3) * 0.45;
        const n3 = Math.cos(nx * 11.4 - ny * 9.7 + nz * 10.2 + p1) * 0.16;
        let disp = 1.0 + n1 * 0.24 + n2 * 0.13 + n3 * 0.08;

        for (let c = 0; c < craters.length; c++) {
          const cr = craters[c];
          const d = Math.hypot(nx - cr.x, ny - cr.y, nz - cr.z);
          if (d < cr.r) {
            const q = d / cr.r;
            if (q < 0.78) {
              const bowl = 1 - (q / 0.78) * (q / 0.78);
              disp -= bowl * cr.depth;
            } else {
              const rim = Math.sin(((q - 0.78) / 0.22) * Math.PI);
              disp += rim * cr.depth * 0.36;
            }
          }
        }

        pos.setXYZ(i, nx * disp * sx, ny * disp * sy, nz * disp * sz);
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    const starGlowTex = createStarGlowTexture();

    // 1) Near / Mid Glowing Starfield
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xffb3c6), new THREE.Color(0xffd166), new THREE.Color(0xff4d79)];
    for (let i = 0; i < starCount; i++) {
      const r = 12 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[i % palette.length];
      starColors[i * 3] = c.r; starColors[i * 3 + 1] = c.g; starColors[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    universeGroup.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.36,
      map: starGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })));

    // 2) Deep-Field Pinpoint Starfield (fog-immune for cosmic depth)
    const deepStarCount = 1800;
    const deepStarGeo = new THREE.BufferGeometry();
    const deepStarPos = new Float32Array(deepStarCount * 3);
    const deepStarCol = new Float32Array(deepStarCount * 3);
    const deepPalette = [new THREE.Color(0xffffff), new THREE.Color(0xc4dcff), new THREE.Color(0xffe9b5), new THREE.Color(0xffcadb)];
    for (let i = 0; i < deepStarCount; i++) {
      const r = 95 + Math.random() * 130;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      deepStarPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      deepStarPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      deepStarPos[i * 3 + 2] = r * Math.cos(phi);
      const c = deepPalette[i % deepPalette.length];
      const bright = 0.55 + Math.random() * 0.45;
      deepStarCol[i * 3] = c.r * bright;
      deepStarCol[i * 3 + 1] = c.g * bright;
      deepStarCol[i * 3 + 2] = c.b * bright;
    }
    deepStarGeo.setAttribute('position', new THREE.BufferAttribute(deepStarPos, 3));
    deepStarGeo.setAttribute('color', new THREE.BufferAttribute(deepStarCol, 3));
    universeGroup.add(new THREE.Points(deepStarGeo, new THREE.PointsMaterial({
      size: 0.62,
      map: starGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      fog: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })));

    // 3) Vast Faint Deep-Space Nebula Clouds
    const nebulaSpecs = [
      { inner: 'rgba(130, 82, 220, 0.24)', mid: 'rgba(65, 36, 130, 0.10)', op: 0.08, x: -72, y: 38, z: -165, s: 110 },
      { inner: 'rgba(56, 140, 235, 0.22)', mid: 'rgba(32, 65, 150, 0.10)', op: 0.07, x: 86, y: -32, z: -175, s: 120 },
      { inner: 'rgba(220, 75, 145, 0.20)', mid: 'rgba(110, 32, 90, 0.08)', op: 0.06, x: 45, y: 58, z: -155, s: 95 },
      { inner: 'rgba(110, 90, 210, 0.22)', mid: 'rgba(48, 30, 115, 0.08)', op: 0.07, x: -95, y: -55, z: 120, s: 115 },
      { inner: 'rgba(72, 130, 210, 0.20)', mid: 'rgba(36, 52, 120, 0.08)', op: 0.06, x: 115, y: 24, z: 110, s: 105 }
    ];
    nebulaSpecs.forEach((n) => {
      const nMat = new THREE.MeshBasicMaterial({
        map: createNebulaCloudTexture(n.inner, n.mid),
        transparent: true,
        opacity: n.op,
        fog: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const nMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), nMat);
      nMesh.position.set(n.x, n.y, n.z);
      nMesh.scale.set(n.s, n.s, 1);
      nMesh.lookAt(0, 0, 0);
      nMesh.rotateZ(Math.random() * Math.PI * 2);
      universeGroup.add(nMesh);
    });

    // 4) 32 Tiny Ultra-Distant Galaxies across deep space (fog-immune)
    const galaxyTexPool = createDistantGalaxyTextures();
    const distantGalaxies = [];
    const galaxyPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const forwardGalaxySlots = [
      [-68, 38, -142], [-44, -34, -158], [-86, 8, -172], [-26, 48, -184],
      [64, 42, -148], [46, -38, -162], [88, -10, -178], [28, -50, -188],
      [-58, -56, -134], [60, 56, -138], [-98, -24, -196], [96, 26, -194],
      [-18, -46, -124], [22, 46, -126]
    ];

    for (let i = 0; i < 32; i++) {
      const tex = galaxyTexPool[i % galaxyTexPool.length];
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.38 + Math.random() * 0.40,
        fog: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const gMesh = new THREE.Mesh(galaxyPlaneGeo, mat);

      if (i < forwardGalaxySlots.length) {
        const [gx, gy, gz] = forwardGalaxySlots[i];
        gMesh.position.set(
          gx + (Math.random() - 0.5) * 10,
          gy + (Math.random() - 0.5) * 8,
          gz + (Math.random() - 0.5) * 16
        );
      } else {
        const r = 108 + Math.random() * 104;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        gMesh.position.set(
          r * Math.sin(ph) * Math.cos(th),
          r * Math.sin(ph) * Math.sin(th),
          r * Math.cos(ph)
        );
      }

      const gScale = 2.2 + Math.random() * 4.6;
      gMesh.scale.set(gScale, gScale, 1);
      gMesh.lookAt(0, 0, 0);
      gMesh.rotateX((Math.random() - 0.5) * 2.3);
      gMesh.rotateY((Math.random() - 0.5) * 1.3);
      gMesh.rotateZ(Math.random() * Math.PI * 2);
      universeGroup.add(gMesh);

      distantGalaxies.push({
        mesh: gMesh,
        spinSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.0003 + Math.random() * 0.0009)
      });
    }

    // 5) 36 Sculpted 3D Tumbling Asteroids (placed strictly in camera-safe shells r<=16.8 or r>=38.5)
    const rockTex = createAsteroidRockTextures();
    const rockGeomPool = Array.from({ length: 6 }, (_, i) => createAsteroidGeometry(101 + i * 37, i < 4 ? 2 : 1));
    const rockTintColors = [0x9e95a3, 0xb8a398, 0x8994ab, 0xa892a4];
    const rockMats = rockTintColors.map((hex) => new THREE.MeshStandardMaterial({
      color: hex,
      map: rockTex.map,
      bumpMap: rockTex.bumpMap,
      bumpScale: 0.14,
      roughness: 0.92,
      metalness: 0.12
    }));
    window.ldThreeRock = {
      rockTex,
      rockGeomPool,
      rockMats
    };

    const asteroids = [];
    const forwardInnerSlots = [
      [-8.8, 4.8, 10.2], [8.9, -4.4, 9.8], [-9.4, -4.2, 8.6], [8.5, 5.1, 8.2],
      [-5.6, -5.8, 10.6], [5.8, 5.7, 10.4], [-11.5, 0.8, 7.2], [11.6, -0.7, 7.4]
    ];
    const forwardOuterSlots = [
      [-23, 12, -33], [24, -11, -34], [-26, -13, -36], [25, 13, -35],
      [-15, 16, -42], [16, -15, -40], [-30, 2, -32], [31, -2, -31],
      [-12, -17, -38], [13, 17, -39]
    ];

    function clampShellRadius(x, y, z, minR, maxR) {
      const rNow = Math.hypot(x, y, z) || 1;
      const targetR = Math.max(minR, Math.min(maxR, rNow));
      const s = targetR / rNow;
      return [x * s, y * s, z * s];
    }

    for (let i = 0; i < 36; i++) {
      const geo = rockGeomPool[i % rockGeomPool.length];
      const mat = rockMats[i % rockMats.length];
      const mesh = new THREE.Mesh(geo, mat);
      const isInner = i < 12;
      let ax, ay, az;

      if (isInner && i < forwardInnerSlots.length) {
        const [fx, fy, fz] = forwardInnerSlots[i];
        ax = fx + (Math.random() - 0.5) * 1.4;
        ay = fy + (Math.random() - 0.5) * 1.2;
        az = fz + (Math.random() - 0.5) * 1.2;
      } else if (!isInner && (i - 12) < forwardOuterSlots.length) {
        const [ox, oy, oz] = forwardOuterSlots[i - 12];
        ax = ox + (Math.random() - 0.5) * 4.0;
        ay = oy + (Math.random() - 0.5) * 3.5;
        az = oz + (Math.random() - 0.5) * 4.0;
      } else {
        const r = isInner ? (11.8 + Math.random() * 4.6) : (39.0 + Math.random() * 24.5);
        const th = Math.random() * Math.PI * 2;
        const beltTilt = isInner ? (Math.random() - 0.5) * 1.3 : (Math.random() - 0.5) * 0.95;
        ax = Math.cos(th) * Math.cos(beltTilt) * r;
        ay = Math.sin(beltTilt) * r + Math.sin(th) * r * 0.18;
        az = Math.sin(th) * Math.cos(beltTilt) * r;
      }
      [ax, ay, az] = clampShellRadius(ax, ay, az, isInner ? 11.8 : 39.0, isInner ? 16.6 : 64.0);

      const scale = isInner ? (0.24 + Math.random() * 0.28) : (0.85 + Math.random() * 1.0);
      mesh.position.set(ax, ay, az);
      mesh.scale.setScalar(scale);
      mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      universeGroup.add(mesh);

      asteroids.push({
        mesh,
        basePos: new THREE.Vector3(ax, ay, az),
        baseScale: scale,
        rotVel: {
          x: (Math.random() - 0.5) * 0.008,
          y: (Math.random() - 0.5) * 0.010,
          z: (Math.random() - 0.5) * 0.007
        },
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.4 + Math.random() * 0.65,
        bobAmp: isInner ? 0.14 : 0.35
      });
    }

    // 6) 55 Tiny Asteroid Belt Pebbles in a single InstancedMesh
    const pebbleCount = 55;
    const pebbleGeo = createAsteroidGeometry(777, 0);
    const pebbleMesh = new THREE.InstancedMesh(pebbleGeo, rockMats[0], pebbleCount);
    const dummyObj = new THREE.Object3D();
    for (let i = 0; i < pebbleCount; i++) {
      const inInner = i < 16;
      const r = inInner ? (12.5 + Math.random() * 3.8) : (38.5 + Math.random() * 21.5);
      const th = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.85;
      const [px, py, pz] = clampShellRadius(
        Math.cos(th) * Math.cos(tilt) * r,
        Math.sin(tilt) * r + Math.sin(th) * r * 0.14,
        Math.sin(th) * Math.cos(tilt) * r,
        inInner ? 12.2 : 38.5,
        inInner ? 16.6 : 62.0
      );
      dummyObj.position.set(px, py, pz);
      dummyObj.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      dummyObj.scale.setScalar(0.10 + Math.random() * 0.16);
      dummyObj.updateMatrix();
      pebbleMesh.setMatrixAt(i, dummyObj.matrix);
    }
    pebbleMesh.instanceMatrix.needsUpdate = true;
    universeGroup.add(pebbleMesh);


    const _tmpWorldPos = new THREE.Vector3();
    let isDragging = false, moved = false, prevX = 0, prevY = 0, targetRotY = 0, targetRotX = 0;
    window.addEventListener('pointerdown', (e) => { if (e.target.closest('button, #gameOverlay')) return; isDragging = true; moved = false; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      targetRotY += dx * 0.006;
      targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX + dy * 0.004));
      prevX = e.clientX; prevY = e.clientY;
    });
    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointercancel', () => { isDragging = false; });

    let bgFrameCount = 0;
    const _galaxyCanvasRef = document.getElementById('galaxyCanvas');
    const _gameOverlayRef = document.getElementById('gameOverlay');
    let threeBgRaf = 0;

    function animateThreeBackground(now) {
      if (document.hidden) {
        threeBgRaf = requestAnimationFrame(animateThreeBackground);
        return;
      }
      // Free 100% of WebGL GPU when Galaxy Finale (videos + 2D galaxy canvas) is active
      if (_galaxyCanvasRef && _galaxyCanvasRef.style.display !== 'none') {
        threeBgRaf = 0;
        return;
      }
      bgFrameCount++;
      // Throttle background 3D to 30fps when Shooter Mini-Game is active to guarantee smooth foreground 60fps
      if (_gameOverlayRef && _gameOverlayRef.style.display === 'block' && (bgFrameCount & 1)) {
        threeBgRaf = requestAnimationFrame(animateThreeBackground);
        return;
      }

      const rm = reducedMotionQuery.matches;
      const timeSec = (now || performance.now()) * 0.001;

      if (!isDragging) targetRotY += rm ? 0.00025 : 0.0011;
      universeGroup.rotation.y += (targetRotY - universeGroup.rotation.y) * 0.08;
      universeGroup.rotation.x += (targetRotX - universeGroup.rotation.x) * 0.08;
      universeGroup.updateMatrixWorld();

      if (!rm) {
        for (let i = 0; i < distantGalaxies.length; i++) {
          distantGalaxies[i].mesh.rotateZ(distantGalaxies[i].spinSpeed);
        }
      }

      const rotMult = rm ? 0.2 : 1.0;
      for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        a.mesh.rotation.x += a.rotVel.x * rotMult;
        a.mesh.rotation.y += a.rotVel.y * rotMult;
        a.mesh.rotation.z += a.rotVel.z * rotMult;
        a.mesh.position.y = a.basePos.y + (rm ? 0 : Math.sin(timeSec * a.bobSpeed + a.bobPhase) * a.bobAmp);

        // Defensive lens-clearance guard so asteroids never clip into camera on drag or resize
        a.mesh.getWorldPosition(_tmpWorldPos);
        const camDist = _tmpWorldPos.distanceTo(camera.position);
        const clearance = camDist < 6.0 ? Math.max(0.05, Math.min(1.0, (camDist - 2.0) / 4.0)) : 1.0;
        a.mesh.scale.setScalar(a.baseScale * clearance);
      }

      renderer.render(scene, camera);
      threeBgRaf = requestAnimationFrame(animateThreeBackground);
    }
    threeBgRaf = requestAnimationFrame(animateThreeBackground);
    window.addEventListener('resize', () => { updateCamera(); updateRendererSize(); });

    // ================= 2. PICTURE LETTERS =================
    const TITLE = "HAPPY 3RD MONTHSARY";
    const images = (window.LOVE_IMAGES && window.LOVE_IMAGES.length) ? window.LOVE_IMAGES : [];
    const photoTitle = document.getElementById('photoTitle');
    const letterEls = [];
    let imgIdx = 0;

    TITLE.split(' ').forEach((word) => {
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'pl';
        s.textContent = ch;
        if (images.length) {
          s.style.backgroundImage = `url("${encodeURI(images[imgIdx % images.length])}")`;
          s.dataset.img = images[imgIdx % images.length];
          imgIdx++;
        } else {
          s.style.backgroundImage = 'linear-gradient(135deg,#fff,#ff7597)';
        }
        w.appendChild(s);
        letterEls.push(s);
      });
      photoTitle.appendChild(w);
    });

    // Galaxy Top Title: I LOVE YOU SO MUCH GA (using fabon1 (1)..(9).jpg)
    const GALAXY_TITLE = "I LOVE YOU SO MUCH GA";
    const galaxyImages = (window.GALAXY_IMAGES && window.GALAXY_IMAGES.length)
      ? window.GALAXY_IMAGES
      : Array.from({ length: 9 }, (_, i) => `fabon1 (${i + 1}).jpg`);
    const galaxyTitle = document.getElementById('galaxyTitle');
    const galaxySubtitle = document.getElementById('galaxySubtitle');
    const gLetterEls = [];
    let gImgIdx = 0;

    GALAXY_TITLE.split(' ').forEach((word) => {
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'gpl';
        s.textContent = ch;
        if (galaxyImages.length) {
          s.style.backgroundImage = `url("${encodeURI(galaxyImages[gImgIdx % galaxyImages.length])}")`;
          s.dataset.img = galaxyImages[gImgIdx % galaxyImages.length];
          gImgIdx++;
        } else {
          s.style.backgroundImage = 'linear-gradient(135deg,#fff,#ff7597)';
        }
        const idx = gLetterEls.length;
        s.style.setProperty('--pop-delay', `${idx * 55}ms`);
        s.style.setProperty('--wave-delay', `${850 + idx * 110}ms`);
        w.appendChild(s);
        gLetterEls.push(s);
      });
      galaxyTitle.appendChild(w);
    });

    // Preload images so letters appear with photos right away with online network fallback
    const preload = Promise.race([
      Promise.all([...images, ...galaxyImages].map((src) => new Promise((res) => {
        const im = new Image();
        im.onload = im.onerror = res;
        im.src = encodeURI(src);
      }))),
      new Promise((res) => setTimeout(res, 2500))
    ]);

    // ================= 3. HEART + TEXT ANIMATION =================
    const heartSvg = document.getElementById('heartSvg');
    const heartFill = document.getElementById('heartFill');
    const leftHalf = document.getElementById('leftHalf');
    const rightHalf = document.getElementById('rightHalf');
    const penL = document.getElementById('penL');
    const penR = document.getElementById('penR');
    const loveText = document.getElementById('loveText');
    const nameText = document.getElementById('nameText');
    const underline = document.getElementById('underline');
    const hint = document.getElementById('hint');
    const heartWrap = document.getElementById('heartWrap');
    const heartShade = document.getElementById('heartShade');
    const heartNumber = document.getElementById('heartNumber');
    const heartVideo = document.getElementById('heartVideo');
    const soundBtn = document.getElementById('soundBtn');
    const heartMedia = document.getElementById('heartMedia');
    const heartBg = document.getElementById('heartBg');
    const bgCtx = heartBg.getContext('2d');
    const stage = document.querySelector('.stage');
    const tapBtn = document.getElementById('tapBtn');
    const againBtn = document.getElementById('againBtn');
    const gameOverlay = document.getElementById('gameOverlay');
    const gameCanvas = document.getElementById('gameCanvas');
    const gameCtx = gameCanvas.getContext('2d');
    const gameWinBanner = document.getElementById('gameWinBanner');
    const gameOverDialog = document.getElementById('gameOverDialog');
    let programmaticDialogClose = false;
    let supportsDisplayTransition;

    function canTransitionDisplay() {
      if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
      if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
        return false;
      }
      const probe = document.createElement('div');
      probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
      document.body.appendChild(probe);
      getComputedStyle(probe).display;
      probe.style.display = 'none';
      supportsDisplayTransition = getComputedStyle(probe).display === 'block';
      probe.remove();
      return supportsDisplayTransition;
    }

    function supportsTopLayerExit() {
      return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
    }

    async function closeGameOverDialog(returnValue = '') {
      if (!gameOverDialog || !gameOverDialog.open) return;
      if (!supportsTopLayerExit()) {
        if (gameOverDialog.hasAttribute('data-closing')) return;
        gameOverDialog.setAttribute('data-closing', '');
        const animations = gameOverDialog.getAnimations({ subtree: true });
        if (animations.length > 0) {
          await Promise.race([
            Promise.allSettled(animations.map((a) => a.finished)),
            new Promise((r) => setTimeout(r, 600)),
          ]);
        }
        if (!gameOverDialog.hasAttribute('data-closing')) return;
        gameOverDialog.removeAttribute('data-closing');
      }
      if (gameOverDialog.open) gameOverDialog.close(returnValue);
    }

    function forceCloseGameOverDialog() {
      if (!gameOverDialog) return;
      gameOverDialog.removeAttribute('data-closing');
      if (gameOverDialog.open) {
        programmaticDialogClose = true;
        gameOverDialog.close('');
      }
    }

    if (gameOverDialog) {
      const gameOverForm = gameOverDialog.querySelector('form');
      if (gameOverForm) {
        gameOverForm.addEventListener('submit', (e) => {
          if (!supportsTopLayerExit()) {
            e.preventDefault();
            const val = e.submitter ? e.submitter.value : 'retry';
            closeGameOverDialog(val);
          }
        });
      }
      gameOverDialog.addEventListener('cancel', (e) => {
        if (!supportsTopLayerExit()) {
          e.preventDefault();
          closeGameOverDialog('');
        }
      });
      gameOverDialog.addEventListener('close', () => {
        const choice = gameOverDialog.returnValue;
        gameOverDialog.returnValue = '';
        if (programmaticDialogClose) {
          programmaticDialogClose = false;
          return;
        }
        if (choice === 'home') playAll();
        else if (gameState && (gameState.phase === 'spaceship' || gameState.phase === 'spaceship_intro')) retrySpaceshipStage();
        else startShooterGame(gameState && gameState.onShooterComplete ? gameState.onShooterComplete : null);
      });
    }

    const galaxyCanvas = document.getElementById('galaxyCanvas');
    const gCtx = galaxyCanvas.getContext('2d');
    const galaxyAudio = document.getElementById('galaxyAudio');
    let galaxyAudioUnlocked = false;
    let galaxyAudioAllowed = false;

    function unlockGalaxyAudio() {
      if (galaxyAudioUnlocked || !galaxyAudio) return;
      galaxyAudioUnlocked = true;
      galaxyAudio.muted = true;
      const p = galaxyAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!galaxyAudioAllowed || galaxyCanvas.style.display === 'none') {
            galaxyAudio.pause();
            try { galaxyAudio.currentTime = 0; } catch (e) { }
            galaxyAudio.muted = false;
          }
        }).catch(() => {
          galaxyAudioUnlocked = false;
          galaxyAudio.muted = false;
        });
      }
    }

    // ================= 3.1. GALAXY BACKGROUND (PURE CANVAS — ZERO VIDEO LAG) =================
    const JASMINE_VIDEO_FILES = [];
    const MEM_FASTSTART_PRIORITY = [];

    const galaxyMemories = document.getElementById('galaxyMemories');
    const memRow = document.getElementById('memRow');
    let memRunning = false;
    let memSessionId = 0;
    let memTiles = [];
    let memTileW = 0;
    let memVisibleCols = 0;
    let memLastViewW = 0;
    let memOrder = [];
    let memOrderCursor = 0;
    let memPrimed = false;
    let memTimers = [];
    let memResumeTimes = {};
    let memMobileMode = false;
    let memActiveSlot = 0;
    let memMobileElapsed = 0;
    let memMobilePreloading = false;
    let memMobileSwapping = false;

    function isMobileMemoriesMode() {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      return window.innerWidth < 768 || coarse;
    }

    function buildMemoryOrder() {
      const total = JASMINE_VIDEO_FILES.length;
      if (!total) return [];
      const used = new Set();
      const order = [];
      for (const target of MEM_FASTSTART_PRIORITY) {
        const idx = JASMINE_VIDEO_FILES.findIndex(
          (f, i) => !used.has(i) && String(f).toLowerCase().endsWith(target)
        );
        if (idx !== -1) {
          used.add(idx);
          order.push(idx);
        }
      }
      for (let i = 0; i < total; i++) {
        if (!used.has(i)) order.push(i);
      }
      return order;
    }

    function getMemLayout() {
      const vw = window.innerWidth;
      const mobile = isMobileMemoriesMode();
      const visibleCols = mobile ? 1 : (vw < 1100 ? 2 : 3);
      const tileW = Math.ceil(vw / visibleCols);
      return { vw, visibleCols, tileW, mobile };
    }

    function clearTileStallTimer(tile) {
      if (tile && tile.stallTimer) {
        clearTimeout(tile.stallTimer);
        tile.stallTimer = 0;
      }
    }

    function clearAllMemoryTimers() {
      memTimers.forEach(clearTimeout);
      memTimers = [];
      for (const tile of memTiles) clearTileStallTimer(tile);
    }

    function pickNextMemoryVidIdx(avoidIdx) {
      if (!memOrder.length) memOrder = buildMemoryOrder();
      const len = memOrder.length;
      if (!len) return 0;
      for (let k = 0; k < len; k++) {
        const pos = (memOrderCursor + k) % len;
        const cand = memOrder[pos];
        if (cand !== avoidIdx || len <= 1) {
          memOrderCursor = (pos + 1) % len;
          return cand;
        }
      }
      const fallback = memOrder[memOrderCursor % len];
      memOrderCursor = (memOrderCursor + 1) % len;
      return fallback;
    }

    function loadTileVideo(tile, vidIdx, preloadMode = 'auto') {
      if (!tile || !JASMINE_VIDEO_FILES.length) return;
      const total = JASMINE_VIDEO_FILES.length;
      const normIdx = ((vidIdx % total) + total) % total;
      const file = JASMINE_VIDEO_FILES[normIdx];
      const seekSec = memResumeTimes[normIdx] || 0;
      tile.vidIdx = normIdx;
      tile.needsLoad = false;
      tile.pendingSeek = seekSec;
      tile.stuckSec = 0;
      tile.recoverAttempts = 0;
      tile.lastTime = -1;
      if (tile.video.getAttribute('data-file') !== file) {
        tile.video.setAttribute('data-file', file);
        tile.video.preload = preloadMode;
        tile.video.src = encodeURI(file);
        tile.video.load();
      } else {
        if (tile.video.preload !== 'auto' && preloadMode === 'auto') {
          tile.video.preload = 'auto';
        }
        if (tile.video.readyState >= 1) {
          if (seekSec > 0 && Number.isFinite(tile.video.duration) && tile.video.duration > 6
            && Math.abs(tile.video.currentTime - seekSec) > 0.3) {
            try { tile.video.currentTime = Math.min(seekSec, tile.video.duration - 4); } catch (e) { }
          }
          tile.pendingSeek = 0;
        }
      }
    }

    function playTileVideo(tile) {
      if (!memRunning || !tile || !tile.shouldPlay || document.hidden) return;
      const v = tile.video;
      v.muted = true;
      v.defaultMuted = true;
      if (v.preload !== 'auto') v.preload = 'auto';
      const sid = memSessionId;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!memRunning || sid !== memSessionId || !tile.shouldPlay) {
            if (!v.paused) v.pause();
            v.classList.remove('active');
            return;
          }
          v.classList.add('active');
        }).catch(() => { });
      } else if (v.readyState >= 2) {
        v.classList.add('active');
      }
    }

    function releaseIdleTile(tile) {
      if (!tile) return;
      tile.shouldPlay = false;
      clearTileStallTimer(tile);
      tile.stuckSec = 0;
      tile.recoverAttempts = 0;
      tile.video.classList.remove('active');
      if (!tile.video.paused) tile.video.pause();
      if (memMobileMode) {
        tile.video.preload = 'none';
        if (tile.video.getAttribute('src')) {
          tile.video.removeAttribute('src');
          tile.video.removeAttribute('data-file');
          tile.video.load();
        }
      }
    }

    function makeMemoryTile(tileW, mobile) {
      const colEl = document.createElement('div');
      colEl.className = 'mem-col';
      if (mobile) {
        colEl.style.width = '100%';
        colEl.style.borderRight = 'none';
      } else {
        colEl.style.width = `${tileW + 1}px`;
      }

      const v = document.createElement('video');
      v.className = 'mem-video';
      v.width = 720;
      v.height = 1280;
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.disableRemotePlayback = true;
      v.preload = 'none';
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('muted', '');
      v.setAttribute('autoplay', '');

      colEl.appendChild(v);
      const tile = {
        el: colEl,
        video: v,
        x: 0,
        vidIdx: -1,
        shouldPlay: false,
        needsLoad: false,
        pendingSeek: 0,
        stallTimer: 0,
        lastTime: -1,
        stuckSec: 0,
        recoverAttempts: 0
      };

      v.addEventListener('loadedmetadata', () => {
        if (tile.pendingSeek > 0 && Number.isFinite(v.duration) && v.duration > 6) {
          try { v.currentTime = Math.min(tile.pendingSeek, v.duration - 4); } catch (e) { }
          tile.pendingSeek = 0;
        }
      });

      const handleReady = () => {
        if (!memRunning || !tile.shouldPlay || document.hidden) return;
        if (v.paused) playTileVideo(tile);
        else if (v.readyState >= 2) v.classList.add('active');
      };
      v.addEventListener('loadeddata', handleReady);
      v.addEventListener('canplay', handleReady);
      v.addEventListener('canplaythrough', handleReady);

      v.addEventListener('playing', () => {
        clearTileStallTimer(tile);
        tile.stuckSec = 0;
        tile.recoverAttempts = 0;
        if (memRunning && tile.shouldPlay) v.classList.add('active');
      });

      v.addEventListener('ended', () => {
        try { v.currentTime = 0; } catch (e) { }
        if (memRunning && tile.shouldPlay && !document.hidden) {
          v.play().catch(() => { });
        }
      });

      const handleStall = () => {
        if (!memRunning || !tile.shouldPlay || document.hidden || tile.stallTimer) return;
        const sid = memSessionId;
        tile.stallTimer = setTimeout(() => {
          tile.stallTimer = 0;
          if (!memRunning || sid !== memSessionId || !tile.shouldPlay || document.hidden) return;
          if (v.readyState >= 2 && Number.isFinite(v.currentTime)) {
            try { v.currentTime = v.currentTime + 0.04; } catch (e) { }
          }
          playTileVideo(tile);
        }, memMobileMode ? 1800 : 2500);
      };
      v.addEventListener('waiting', handleStall);
      v.addEventListener('stalled', handleStall);

      v.addEventListener('error', () => {
        if (memRunning && tile.shouldPlay) {
          v.classList.remove('active');
          if (memMobileMode) advanceMobileMemory(true);
        }
      });

      return tile;
    }

    function buildMemoryTiles() {
      if (!memRow || !JASMINE_VIDEO_FILES.length) return;
      clearAllMemoryTimers();
      for (const old of memTiles) releaseIdleTile(old);
      memTiles = [];
      memRow.innerHTML = '';

      const { vw, visibleCols, tileW, mobile } = getMemLayout();
      memMobileMode = mobile;
      memVisibleCols = visibleCols;
      memTileW = tileW;
      memLastViewW = vw;
      memOrder = buildMemoryOrder();
      memOrderCursor = 0;
      memActiveSlot = 0;
      memMobileElapsed = 0;
      memMobilePreloading = false;
      memMobileSwapping = false;

      if (mobile) {
        // Mobile single-decoder crossfade: only 2 stacked slots, 1 actively playing at a time
        for (let i = 0; i < 2; i++) {
          const tile = makeMemoryTile(tileW, true);
          tile.x = 0;
          tile.el.style.zIndex = i === 0 ? '2' : '1';
          tile.needsLoad = true;
          memRow.appendChild(tile.el);
          memTiles.push(tile);
        }
        memTiles[0].vidIdx = pickNextMemoryVidIdx(-1);
        memTiles[1].vidIdx = -1;
        return;
      }

      const totalTiles = visibleCols + 2;
      for (let i = 0; i < totalTiles; i++) {
        const tile = makeMemoryTile(tileW, false);
        tile.x = (i - 2) * tileW;
        tile.el.style.transform = `translate3d(${tile.x.toFixed(2)}px, 0, 0)`;
        tile.needsLoad = true;
        memRow.appendChild(tile.el);
        memTiles.push(tile);
      }

      // Give on-screen tiles the faststart videos first, then left staging tiles
      for (let i = 2; i < totalTiles; i++) {
        memTiles[i].vidIdx = pickNextMemoryVidIdx(-1);
      }
      if (memTiles[1]) memTiles[1].vidIdx = pickNextMemoryVidIdx(memTiles[2] ? memTiles[2].vidIdx : -1);
      if (memTiles[0]) memTiles[0].vidIdx = pickNextMemoryVidIdx(memTiles[1] ? memTiles[1].vidIdx : -1);
    }

    function primeGalaxyMemories() {
      if (!memRow || !JASMINE_VIDEO_FILES.length || memRunning) return;
      const { visibleCols, mobile } = getMemLayout();
      if (!memPrimed || !memTiles.length || visibleCols !== memVisibleCols || mobile !== memMobileMode) {
        buildMemoryTiles();
      }
      memPrimed = true;
      const sid = memSessionId;

      if (memMobileMode) {
        // On mobile, preload ONLY the first lightweight video (0.88 MB) to avoid decoder contention
        const firstTile = memTiles[0];
        if (firstTile && (firstTile.needsLoad || !firstTile.video.getAttribute('data-file'))) {
          loadTileVideo(firstTile, firstTile.vidIdx, 'auto');
        }
        return;
      }

      const queue = [...memTiles.slice(2), memTiles[1]].filter(Boolean);
      function loadNext(idx) {
        if (memRunning || sid !== memSessionId || idx >= queue.length) return;
        const tile = queue[idx];
        if (!tile.needsLoad && tile.video.getAttribute('data-file')) {
          loadNext(idx + 1);
          return;
        }
        let advanced = false;
        const advance = () => {
          if (advanced) return;
          advanced = true;
          tile.video.removeEventListener('loadeddata', advance);
          tile.video.removeEventListener('canplay', advance);
          clearTimeout(fallbackId);
          const gapId = setTimeout(() => loadNext(idx + 1), 150);
          memTimers.push(gapId);
        };
        const fallbackId = setTimeout(advance, 1200);
        memTimers.push(fallbackId);
        tile.video.addEventListener('loadeddata', advance, { once: true });
        tile.video.addEventListener('canplay', advance, { once: true });
        loadTileVideo(tile, tile.vidIdx, idx < memVisibleCols ? 'auto' : 'metadata');
      }

      loadNext(0);
    }

    function advanceMobileMemory(forceImmediate = false) {
      if (!memRunning || !memMobileMode || memTiles.length < 2 || memMobileSwapping) return;
      const sid = memSessionId;
      const curSlot = memActiveSlot;
      const nextSlot = 1 - curSlot;
      const curTile = memTiles[curSlot];
      const nextTile = memTiles[nextSlot];

      memMobileSwapping = true;
      memMobileElapsed = 0;
      memMobilePreloading = false;

      if (curTile && curTile.vidIdx >= 0) {
        const dur = curTile.video.duration;
        memResumeTimes[curTile.vidIdx] = (Number.isFinite(dur) && curTile.video.currentTime < dur - 4)
          ? curTile.video.currentTime
          : 0;
      }

      if (nextTile.needsLoad || !nextTile.video.getAttribute('data-file')) {
        nextTile.vidIdx = pickNextMemoryVidIdx(curTile ? curTile.vidIdx : -1);
        loadTileVideo(nextTile, nextTile.vidIdx, 'auto');
      }

      const completeSwap = () => {
        if (!memRunning || sid !== memSessionId) return;
        nextTile.el.style.zIndex = '2';
        if (curTile) curTile.el.style.zIndex = '1';
        nextTile.shouldPlay = true;
        playTileVideo(nextTile);
        memActiveSlot = nextSlot;

        const stopOldId = setTimeout(() => {
          if (sid !== memSessionId) return;
          if (curTile) {
            releaseIdleTile(curTile);
            curTile.needsLoad = true;
          }
          memMobileSwapping = false;
        }, forceImmediate ? 260 : 760);
        memTimers.push(stopOldId);
      };

      if (forceImmediate || nextTile.video.readyState >= 2) {
        completeSwap();
      } else {
        let done = false;
        const onReady = () => {
          if (done) return;
          done = true;
          nextTile.video.removeEventListener('canplay', onReady);
          nextTile.video.removeEventListener('loadeddata', onReady);
          clearTimeout(waitId);
          completeSwap();
        };
        const waitId = setTimeout(onReady, 2200);
        memTimers.push(waitId);
        nextTile.video.addEventListener('canplay', onReady, { once: true });
        nextTile.video.addEventListener('loadeddata', onReady, { once: true });
      }
    }

    function unlockGalaxyMemoriesOnGesture() {
      if (galaxyAudioAllowed && galaxyAudio && galaxyCanvas.style.display !== 'none' && galaxyAudio.paused) {
        galaxyAudio.muted = false;
        galaxyAudio.play().catch(() => { });
      }
      if (!memRunning || !memTiles.length || document.hidden) return;
      for (const tile of memTiles) {
        if (tile.shouldPlay && tile.video.paused) {
          playTileVideo(tile);
        }
      }
    }

    window.addEventListener('pointerdown', unlockGalaxyMemoriesOnGesture, { passive: true });
    window.addEventListener('touchstart', unlockGalaxyMemoriesOnGesture, { passive: true });
    window.addEventListener('click', unlockGalaxyMemoriesOnGesture, { passive: true });

    function startGalaxyMemories() {
      if (!galaxyMemories || !memRow || !JASMINE_VIDEO_FILES.length) return;
      clearAllMemoryTimers();
      memSessionId++;
      const sid = memSessionId;
      memRunning = true;

      const { visibleCols, mobile } = getMemLayout();
      if (!memPrimed || !memTiles.length || visibleCols !== memVisibleCols || mobile !== memMobileMode) {
        buildMemoryTiles();
      }
      memPrimed = true;
      galaxyMemories.classList.add('show');

      if (memMobileMode) {
        memActiveSlot = 0;
        memMobileElapsed = 0;
        memMobilePreloading = false;
        memMobileSwapping = false;
        const activeTile = memTiles[0];
        const idleTile = memTiles[1];
        if (idleTile) {
          releaseIdleTile(idleTile);
          idleTile.needsLoad = true;
          idleTile.el.style.zIndex = '1';
        }
        if (activeTile) {
          activeTile.el.style.zIndex = '2';
          activeTile.shouldPlay = true;
          if (activeTile.needsLoad || !activeTile.video.getAttribute('data-file')) {
            loadTileVideo(activeTile, activeTile.vidIdx, 'auto');
          }
          playTileVideo(activeTile);
        }
        return;
      }

      const viewW = window.innerWidth;
      for (const tile of memTiles) {
        const onScreen = (tile.x + memTileW > -36) && (tile.x < viewW);
        if (onScreen) {
          tile.shouldPlay = true;
          if (tile.needsLoad || !tile.video.getAttribute('data-file')) {
            loadTileVideo(tile, tile.vidIdx, 'auto');
          }
          playTileVideo(tile);
        } else if (tile.x >= -1.6 * memTileW) {
          releaseIdleTile(tile);
          if (tile.needsLoad || !tile.video.getAttribute('data-file')) {
            const stId = setTimeout(() => {
              if (!memRunning || sid !== memSessionId) return;
              if (tile.needsLoad) loadTileVideo(tile, tile.vidIdx, 'metadata');
            }, 900);
            memTimers.push(stId);
          }
        } else {
          releaseIdleTile(tile);
        }
      }
    }

    function checkTileStallWatchdog(tile, dt) {
      if (!tile || !tile.shouldPlay || document.hidden) return;
      const v = tile.video;
      const t = Number.isFinite(v.currentTime) ? v.currentTime : 0;
      if (tile.lastTime >= 0 && Math.abs(t - tile.lastTime) >= 0.04) {
        tile.lastTime = t;
        tile.stuckSec = 0;
        tile.recoverAttempts = 0;
        return;
      }
      if (tile.lastTime < 0) tile.lastTime = t;
      tile.stuckSec += dt;
      const stallLimit = memMobileMode ? 1.8 : 3.0;
      if (tile.stuckSec < stallLimit) return;

      tile.stuckSec = 0;
      tile.recoverAttempts++;
      if (tile.recoverAttempts === 1) {
        if (v.readyState >= 2 && Number.isFinite(v.currentTime)) {
          try {
            v.currentTime = v.currentTime + 0.05;
            tile.lastTime = v.currentTime;
          } catch (e) { }
        }
        playTileVideo(tile);
      } else if (memMobileMode) {
        advanceMobileMemory(true);
      } else {
        tile.recoverAttempts = 0;
        const curFile = v.getAttribute('data-file');
        if (curFile) {
          v.load();
          playTileVideo(tile);
        }
      }
    }

    function updateMemoriesSlide(dt) {
      if (!memRunning || !memTiles.length) return;

      if (memMobileMode) {
        const curTile = memTiles[memActiveSlot];
        checkTileStallWatchdog(curTile, dt);

        if (!memMobileSwapping && JASMINE_VIDEO_FILES.length > 1) {
          const swapInterval = reducedMotionQuery.matches ? 10.5 : 7.5;
          memMobileElapsed += dt;
          if (memMobileElapsed >= swapInterval) {
            advanceMobileMemory(false);
          }
        }
        return;
      }

      const viewW = window.innerWidth;
      const speed = reducedMotionQuery.matches ? 12 : 38;

      for (let i = 0; i < memTiles.length; i++) {
        memTiles[i].x += speed * dt;
      }

      for (let i = 0; i < memTiles.length; i++) {
        const tile = memTiles[i];
        if (tile.x >= viewW) {
          releaseIdleTile(tile);

          const dur = tile.video.duration;
          if (tile.vidIdx >= 0) {
            memResumeTimes[tile.vidIdx] = (Number.isFinite(dur) && tile.video.currentTime < dur - 4)
              ? tile.video.currentTime
              : 0;
          }

          let leftmost = memTiles[0];
          for (let j = 1; j < memTiles.length; j++) {
            if (memTiles[j].x < leftmost.x) leftmost = memTiles[j];
          }
          tile.x = leftmost.x - memTileW;
          tile.vidIdx = pickNextMemoryVidIdx(leftmost.vidIdx);
          tile.needsLoad = true;
        }
      }

      for (let i = 0; i < memTiles.length; i++) {
        const tile = memTiles[i];
        if (tile.needsLoad && tile.x >= -1.2 * memTileW) {
          loadTileVideo(tile, tile.vidIdx, tile.x >= -0.45 * memTileW ? 'auto' : 'metadata');
        }
        const onScreen = (tile.x + memTileW > -36) && (tile.x < viewW);
        if (onScreen && !tile.shouldPlay) {
          tile.shouldPlay = true;
          if (tile.needsLoad) loadTileVideo(tile, tile.vidIdx, 'auto');
          playTileVideo(tile);
        } else if (!onScreen && tile.shouldPlay) {
          releaseIdleTile(tile);
        } else if (onScreen && tile.shouldPlay) {
          checkTileStallWatchdog(tile, dt);
        }
        tile.el.style.transform = `translate3d(${tile.x.toFixed(2)}px, 0, 0)`;
      }
    }

    function handleMemoryResize() {
      if (!memRunning) return;
      if (Math.abs(window.innerWidth - memLastViewW) <= 60) return;
      const { vw, visibleCols, tileW, mobile } = getMemLayout();
      memLastViewW = vw;
      if (!mobile && !memMobileMode && visibleCols === memVisibleCols && memTiles.length) {
        const oldW = memTileW || tileW;
        memTileW = tileW;
        for (const tile of memTiles) {
          tile.el.style.width = `${tileW + 1}px`;
          tile.x = (tile.x / oldW) * tileW;
          tile.el.style.transform = `translate3d(${tile.x.toFixed(2)}px, 0, 0)`;
        }
      } else if (mobile !== memMobileMode || visibleCols !== memVisibleCols) {
        memPrimed = false;
        startGalaxyMemories();
      }
    }

    function stopGalaxyMemories() {
      memRunning = false;
      memSessionId++;
      memMobileSwapping = false;
      memMobilePreloading = false;
      clearAllMemoryTimers();
      for (const tile of memTiles) releaseIdleTile(tile);
      if (galaxyMemories) galaxyMemories.classList.remove('show');
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && galaxyCanvas.style.display !== 'none') {
        lastFrameTime = performance.now();
      }
      if (!memRunning || !memTiles.length) return;
      if (document.hidden) {
        for (const tile of memTiles) {
          clearTileStallTimer(tile);
          if (!tile.video.paused) tile.video.pause();
        }
      } else {
        for (const tile of memTiles) {
          if (tile.shouldPlay && tile.video.paused) playTileVideo(tile);
        }
      }
    });

    let galaxyBubbles = [];
    let galaxyBubbleTimer = 0;
    let galaxyBubbleIdx = 0;

    function traceHeartBalloonPath(ctx, cx, cy, r) {
      const w = r * 1.12;
      const h = r * 1.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.36);
      ctx.bezierCurveTo(cx - w * 0.18, cy - h * 0.88, cx - w * 0.98, cy - h * 0.92, cx - w * 1.0, cy - h * 0.16);
      ctx.bezierCurveTo(cx - w * 1.0, cy + h * 0.38, cx - w * 0.42, cy + h * 0.72, cx, cy + h * 1.02);
      ctx.bezierCurveTo(cx + w * 0.42, cy + h * 0.72, cx + w * 1.0, cy + h * 0.38, cx + w * 1.0, cy - h * 0.16);
      ctx.bezierCurveTo(cx + w * 0.98, cy - h * 0.92, cx + w * 0.18, cy - h * 0.88, cx, cy - h * 0.36);
      ctx.closePath();
    }

    function drawRedHeartBalloon(ctx, bx, by, r, alpha, sway = 0) {
      if (alpha <= 0.01 || r <= 1) return;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Delicate curved ribbon string dangling from the bottom tip
      const tipY = by + r * 1.05 * 1.02;
      ctx.strokeStyle = 'rgba(255, 195, 208, 0.65)';
      ctx.lineWidth = Math.max(1.2, r * 0.032);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, tipY);
      ctx.quadraticCurveTo(bx - sway * 0.45, tipY + r * 0.44, bx + sway * 0.25, tipY + r * 0.86);
      ctx.stroke();

      // Small red balloon knot at the base
      ctx.fillStyle = '#c9082a';
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.09, tipY + r * 0.08);
      ctx.lineTo(bx + r * 0.09, tipY + r * 0.08);
      ctx.lineTo(bx, tipY - r * 0.02);
      ctx.closePath();
      ctx.fill();

      // Glossy 3D crimson/red heart fill + soft glow
      const redGrad = ctx.createRadialGradient(
        bx - r * 0.34, by - r * 0.28, r * 0.08,
        bx + r * 0.08, by + r * 0.12, r * 1.32
      );
      redGrad.addColorStop(0, '#ffb3c1');
      redGrad.addColorStop(0.22, '#ff2e55');
      redGrad.addColorStop(0.62, '#d90429');
      redGrad.addColorStop(1, '#780016');

      ctx.save();
      if (gWidth >= 768) {
        ctx.shadowColor = 'rgba(255, 25, 65, 0.55)';
        ctx.shadowBlur = Math.max(8, r * 0.22);
      }
      ctx.fillStyle = redGrad;
      traceHeartBalloonPath(ctx, bx, by, r);
      ctx.fill();
      ctx.restore();

      // Soft translucent rim highlight
      ctx.strokeStyle = 'rgba(255, 210, 220, 0.72)';
      ctx.lineWidth = Math.max(1.4, r * 0.045);
      traceHeartBalloonPath(ctx, bx, by, r);
      ctx.stroke();

      // Upper-left lobe glossy specular arc + dot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.lineWidth = Math.max(1.6, r * 0.062);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(bx - r * 0.44, by - r * 0.30, r * 0.28, Math.PI * 1.1, Math.PI * 1.64);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.arc(bx - r * 0.58, by - r * 0.14, Math.max(1.4, r * 0.055), 0, Math.PI * 2);
      ctx.fill();

      // Subtle lower-right bounce sheen
      ctx.strokeStyle = 'rgba(255, 175, 190, 0.35)';
      ctx.lineWidth = Math.max(1.2, r * 0.038);
      ctx.beginPath();
      ctx.arc(bx + r * 0.25, by + r * 0.18, r * 0.42, Math.PI * 0.08, Math.PI * 0.35);
      ctx.stroke();

      ctx.restore();
    }

    function spawnGalaxyBubble() {
      const idx = galaxyBubbleIdx++;
      const side = (idx % 2 === 0) ? -1 : 1;
      const laneFracs = [0.12, 0.88, 0.17, 0.83, 0.11, 0.89, 0.15];
      const minDim = Math.min(gWidth, gHeight);
      galaxyBubbles.push({
        side,
        baseX: laneFracs[idx % laneFracs.length] * gWidth,
        startY: gHeight * 0.94,
        endY: gHeight * 0.24,
        r: Math.max(48, Math.min(115, minDim * (0.125 + Math.random() * 0.025))),
        age: 0,
        duration: 7.4 + Math.random() * 1.2,
        swayAmp: Math.min(24, minDim * 0.035),
        swayFreq: 1.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2
      });
    }

    function updateAndDrawGalaxyBubbles(ctx, dt, elapsed, cx, cy, galaxyRadius) {
      return;
    }

    let hasVideo = false;

    soundBtn.addEventListener('click', () => {
      heartVideo.muted = !heartVideo.muted;
      if (!heartVideo.muted) heartVideo.play().catch(() => { });
      soundBtn.textContent = heartVideo.muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-label', heartVideo.muted ? 'Turn sound on' : 'Turn sound off');
    });

    const LETTER_STAGGER = 110;   // ms between each picture letter
    const HEART_DELAY = 900;      // heart starts while letters are popping
    const DRAW_MS = 3600;         // heart + "I Love You" duration (same time)
    const NAME_MS = 3400;         // name writing duration

    loveText.style.setProperty('--write-ms', DRAW_MS + 'ms');
    nameText.style.setProperty('--write-ms', NAME_MS + 'ms');

    const lenL = leftHalf.getTotalLength();
    const lenR = rightHalf.getTotalLength();
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let finished = false;
    let timers = [];
    let rafId = 0;
    let gameRaf = 0;
    let galaxyRaf = 0;
    let gameState = null;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    function resetAll() {
      timers.forEach(clearTimeout); timers = [];
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(gameRaf);
      cancelAnimationFrame(galaxyRaf);
      if (!threeBgRaf) {
        threeBgRaf = requestAnimationFrame(animateThreeBackground);
      }
      finished = false;
      forceCloseGameOverDialog();
      if (typeof closeGalaxyQuiz === 'function') closeGalaxyQuiz();
      if (typeof window.stopLevelDevilGame === 'function') window.stopLevelDevilGame(false);
      if (window.ldOrientation) window.ldOrientation.exit();
      gameOverlay.style.display = 'none';
      gameWinBanner.classList.remove('show');
      if (gameState) {
        gameState.active = false;
        gameState.gameOver = false;
        gameState.tapTarget = null;
        gameState.keys = {};
      }
      clearGameDrag();
      galaxyCanvas.style.display = 'none';
      galaxyTitle.classList.remove('show');
      if (galaxySubtitle) galaxySubtitle.classList.remove('show');
      gLetterEls.forEach((el) => el.classList.remove('show'));
      stage.classList.remove('vanish');
      againBtn.classList.remove('show');
      soundBtn.classList.remove('show');
      letterEls.forEach((el) => el.classList.remove('show'));
      heartWrap.classList.remove('beating');
      heartFill.classList.remove('show');
      heartShade.classList.remove('show');
      heartNumber.classList.remove('show');
      heartMedia.classList.remove('show');
      galaxyBubbles = [];
      galaxyBubbleIdx = 0;
      trailParticles = [];
      miniHearts2D = [];
      catchRings = [];
      catchSparkles = [];
      galaxyCouple = null;
      galaxyShip = null;
      memResumeTimes = {};
      memPrimed = false;
      stopGalaxyMemories();
      heartVideo.pause();
      galaxyAudioAllowed = false;
      if (galaxyAudio) {
        galaxyAudio.pause();
        try { galaxyAudio.currentTime = 0; } catch (e) { }
      }
      loveText.classList.remove('write');
      nameText.classList.remove('write');
      underline.classList.remove('show');
      hint.classList.remove('show');
      tapBtn.classList.remove('show');
      penL.style.opacity = penR.style.opacity = 0;
      [[leftHalf, lenL], [rightHalf, lenR]].forEach(([p, l]) => {
        p.style.strokeDasharray = l;
        p.style.strokeDashoffset = l;
      });
      void document.body.offsetWidth; // restart CSS animations
    }

    function drawHeart() {
      // "I Love You" writes at the SAME time as the heart
      loveText.classList.add('write');
      penL.style.opacity = penR.style.opacity = 1;
      const start = performance.now();

      function step(now) {
        const t = Math.min(1, (now - start) / DRAW_MS);
        const k = ease(t);
        leftHalf.style.strokeDashoffset = lenL * (1 - k);
        rightHalf.style.strokeDashoffset = lenR * (1 - k);
        const pl = leftHalf.getPointAtLength(lenL * k);
        const pr = rightHalf.getPointAtLength(lenR * k);
        penL.setAttribute('cx', pl.x); penL.setAttribute('cy', pl.y);
        penR.setAttribute('cx', pr.x); penR.setAttribute('cy', pr.y);
        if (t < 1) { rafId = requestAnimationFrame(step); return; }

        penL.style.opacity = penR.style.opacity = 0;
        if (hasVideo) {
          // Reveal the video inside the heart (starts from the beginning)
          try { heartVideo.currentTime = 0; } catch (e) { }
          heartVideo.play().catch(() => { });
          heartMedia.classList.add('show');
          heartShade.classList.add('show');
          soundBtn.classList.add('show');
        } else {
          heartFill.classList.add('show');
          heartShade.classList.add('show');
          heartNumber.classList.add('show');
        }
        later(() => heartWrap.classList.add('beating'), 1400);
        // Name writes after the heart is done
        later(() => nameText.classList.add('write'), 500);
        later(() => underline.classList.add('show'), 500 + NAME_MS - 800);
        later(() => { finished = true; tapBtn.classList.add('show'); }, 500 + NAME_MS + 300);
      }
      rafId = requestAnimationFrame(step);
    }

    function playAll() {
      resetAll();
      letterEls.forEach((el, i) => later(() => el.classList.add('show'), i * LETTER_STAGGER));
      later(drawHeart, HEART_DELAY);
    }

    // ================= 4. SHATTER TO GALAXY + TINY RUNNING COUPLE =================
    const COSMIC_ACCENTS = ['#70d6ff', '#a3bffa', '#d8b4fe'];
    const GALAXY_CATCH_INTERVAL = 5.0;
    const GALAXY_CAUGHT_DURATION = 2.10;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    let gWidth = window.innerWidth;
    let gHeight = window.innerHeight;
    let galaxyParticles = [];
    let trailParticles = [];
    let miniHearts2D = [];
    let catchRings = [];
    let catchSparkles = [];
    let galaxyCouple = null;
    let galaxyShip = null;
    let galaxyStart = 0;
    let lastFrameTime = 0;
    let lastTrailAt = 0;
    let lastHeartAt = 0;
    let againShown = false;

    function resizeGalaxyCanvas() {
      const maxDpr = window.innerWidth < 768 ? 1.25 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      gWidth = window.innerWidth;
      gHeight = window.innerHeight;
      galaxyCanvas.width = Math.floor(gWidth * dpr);
      galaxyCanvas.height = Math.floor(gHeight * dpr);
      gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', () => {
      if (galaxyCanvas.style.display !== 'none') resizeGalaxyCanvas();
      handleMemoryResize();
    });

    function makeGalaxyParticle(x, y, burstCx, burstCy, baseColor) {
      const dx = x - burstCx;
      const dy = y - burstCy;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 2.2 + Math.random() * 5.2;
      const roll = Math.random();
      const isBulge = roll < 0.22;
      const isHalo = !isBulge && roll < 0.34;
      let rNorm, baseAngle, yOffset, galaxyColor;

      if (isBulge) {
        rNorm = Math.pow(Math.random(), 2.1) * 0.30;
        baseAngle = Math.random() * Math.PI * 2;
        yOffset = (Math.random() - 0.5) * 0.34 * (1 - rNorm * 1.5);
        const bulgePalette = ['#fff4d6', '#ffd166', '#ff9ebb', '#ffe5ec'];
        galaxyColor = bulgePalette[Math.floor(Math.random() * bulgePalette.length)];
      } else if (isHalo) {
        rNorm = 0.24 + Math.random() * 0.80;
        baseAngle = Math.random() * Math.PI * 2;
        yOffset = (Math.random() - 0.5) * 0.42;
        galaxyColor = Math.random() < 0.45 ? COSMIC_ACCENTS[Math.floor(Math.random() * COSMIC_ACCENTS.length)] : baseColor;
      } else {
        // 2 primary + 2 secondary 3D logarithmic spiral arms
        const arm = Math.floor(Math.random() * 4);
        const isPrimary = arm % 2 === 0;
        rNorm = 0.08 + Math.pow(Math.random(), 1.15) * 0.92;
        const spread = (isPrimary ? 0.30 : 0.48) + rNorm * 0.34;
        baseAngle = arm * (Math.PI * 0.5) + rNorm * 5.2 + (Math.random() - 0.5) * spread;
        yOffset = (Math.random() - 0.5) * (0.11 - rNorm * 0.05);
        if (rNorm > 0.58 && Math.random() < 0.42) {
          galaxyColor = COSMIC_ACCENTS[Math.floor(Math.random() * COSMIC_ACCENTS.length)];
        } else if (rNorm < 0.36 && Math.random() < 0.45) {
          galaxyColor = '#ffd166';
        } else {
          galaxyColor = Math.random() < 0.22 ? COSMIC_ACCENTS[Math.floor(Math.random() * COSMIC_ACCENTS.length)] : baseColor;
        }
      }

      return {
        sx: x,
        sy: y,
        vx: (dx / dist) * speed + (Math.random() - 0.5) * 3.8,
        vy: (dy / dist) * speed + (Math.random() - 0.5) * 3.8,
        rNorm,
        baseAngle,
        yOffset,
        size: (isBulge ? 1.3 : 1.05) + Math.random() * 2.4,
        color: baseColor,
        galaxyColor,
        twinklePhase: Math.random() * Math.PI * 2,
        _px: x,
        _py: y,
        _ps: 1.5,
        _pa: 1,
        _fg: false
      };
    }

    let galaxyNebulaCanvas = null;

    function ensureGalaxyNebulaSprite() {
      if (galaxyNebulaCanvas) return;
      const size = 512;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      const half = size * 0.5;
      const maxR = half * 0.92;

      // Galactic core glow
      const coreG = ctx.createRadialGradient(half, half, 0, half, half, maxR);
      coreG.addColorStop(0, 'rgba(255, 242, 210, 0.46)');
      coreG.addColorStop(0.18, 'rgba(255, 130, 175, 0.28)');
      coreG.addColorStop(0.45, 'rgba(130, 62, 210, 0.16)');
      coreG.addColorStop(0.75, 'rgba(56, 182, 255, 0.08)');
      coreG.addColorStop(1, 'rgba(7, 3, 13, 0)');
      ctx.fillStyle = coreG;
      ctx.beginPath();
      ctx.arc(half, half, maxR, 0, Math.PI * 2);
      ctx.fill();

      // 4 glowing logarithmic spiral nebula arms matching particle twist (5.2 rad)
      for (let arm = 0; arm < 4; arm++) {
        const isPrimary = arm % 2 === 0;
        const steps = isPrimary ? 30 : 20;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const ang = arm * (Math.PI * 0.5) + t * 5.2;
          const rad = (0.09 + t * 0.86) * maxR;
          const px = half + Math.cos(ang) * rad;
          const py = half + Math.sin(ang) * rad;
          const puffR = (16 + t * 34) * (isPrimary ? 1.12 : 0.82);
          const puffA = (1 - t * 0.55) * (isPrimary ? 0.14 : 0.08);
          const g = ctx.createRadialGradient(px, py, 0, px, py, puffR);
          const col = t < 0.35
            ? `rgba(255, 120, 175, ${puffA})`
            : (t < 0.68 ? `rgba(147, 51, 234, ${puffA})` : `rgba(56, 182, 255, ${puffA})`);
          g.addColorStop(0, col);
          g.addColorStop(1, 'rgba(7, 3, 13, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, puffR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      galaxyNebulaCanvas = c;
    }

    function sampleRectParticles(rect, count, colors, burstCx, burstCy, out, yPad = 0.08) {
      if (!rect.width || !rect.height) return;
      const top = rect.top + rect.height * yPad;
      const h = rect.height * (1 - yPad * 2);
      for (let i = 0; i < count; i++) {
        const px = rect.left + Math.random() * rect.width;
        const py = top + Math.random() * h;
        const c = colors[Math.floor(Math.random() * colors.length)];
        out.push(makeGalaxyParticle(px, py, burstCx, burstCy, c));
      }
    }

    function sampleHeartParticles(rect, count, colors, burstCx, burstCy, out) {
      if (!rect.width || !rect.height) return;
      const hCx = rect.left + rect.width * 0.5;
      const hCy = rect.top + rect.height * 0.44;
      const scaleX = rect.width * 0.46;
      const scaleY = rect.height * 0.45;
      for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const radial = Math.random() < 0.3 ? 0.85 + Math.random() * 0.15 : Math.sqrt(Math.random());
        const hx = (16 * Math.pow(Math.sin(t), 3)) / 16;
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 15;
        const px = hCx + hx * scaleX * radial;
        const py = hCy + hy * scaleY * radial;
        const c = colors[Math.floor(Math.random() * colors.length)];
        out.push(makeGalaxyParticle(px, py, burstCx, burstCy, c));
      }
    }

    let earthMapCanvas = null;
    let earthCloudCanvas = null;

    function ensureEarthTextures() {
      if (earthMapCanvas && earthCloudCanvas) return;

      // 1024x256 (two seamless 512px equirectangular wraps side-by-side)
      const mapC = document.createElement('canvas');
      mapC.width = 1024;
      mapC.height = 256;
      const mCtx = mapC.getContext('2d');

      const ocean = mCtx.createLinearGradient(0, 0, 0, 256);
      ocean.addColorStop(0, '#0b3870');
      ocean.addColorStop(0.25, '#0d5394');
      ocean.addColorStop(0.5, '#116cb8');
      ocean.addColorStop(0.75, '#0c4f8d');
      ocean.addColorStop(1, '#093163');
      mCtx.fillStyle = ocean;
      mCtx.fillRect(0, 0, 1024, 256);

      const continents = [
        // North & Central America
        { color: '#3b9656', pts: [[55, 44], [102, 38], [144, 44], [164, 62], [150, 82], [132, 92], [120, 108], [108, 118], [96, 105], [82, 92], [66, 76]] },
        // Greenland
        { color: '#d8ebf8', pts: [[168, 20], [206, 18], [214, 34], [190, 48], [172, 38]] },
        // South America
        { color: '#42a35d', pts: [[134, 126], [162, 126], [184, 144], [180, 174], [160, 204], [144, 224], [138, 198], [132, 162]] },
        // Europe + UK
        { color: '#459e5a', pts: [[242, 46], [274, 40], [302, 48], [296, 68], [274, 76], [252, 78], [238, 66]] },
        // Africa + Madagascar
        { color: '#58a655', pts: [[242, 88], [278, 86], [312, 102], [320, 126], [304, 158], [286, 192], [270, 188], [260, 152], [242, 122]] },
        { color: '#459a55', pts: [[322, 158], [330, 158], [328, 176], [320, 176]] },
        // Asia (Eurasia + India + SE Asia)
        { color: '#3c9455', pts: [[296, 42], [360, 34], [426, 38], [468, 52], [456, 74], [430, 90], [410, 114], [396, 104], [374, 116], [358, 128], [344, 102], [318, 98], [298, 78]] },
        // Philippines & Maritime SE Asia + Japan
        { color: '#54b468', pts: [[422, 108], [430, 108], [432, 122], [422, 122]] },
        { color: '#4aab5f', pts: [[402, 128], [436, 130], [442, 142], [408, 142]] },
        { color: '#4ca660', pts: [[454, 68], [464, 66], [466, 86], [454, 88]] },
        // Australia + New Zealand
        { color: '#c4a15e', pts: [[416, 158], [456, 154], [468, 174], [458, 196], [426, 198], [410, 178]] },
        { color: '#4ca660', pts: [[478, 194], [488, 190], [486, 210], [476, 208]] }
      ];

      function drawContinentSet(offsetX) {
        // Soft shallow turquoise coastal glow
        mCtx.save();
        mCtx.lineJoin = 'round';
        mCtx.lineCap = 'round';
        mCtx.lineWidth = 8;
        mCtx.strokeStyle = 'rgba(46, 188, 224, 0.34)';
        for (const c of continents) {
          mCtx.beginPath();
          c.pts.forEach(([x, y], idx) => {
            if (idx === 0) mCtx.moveTo(x + offsetX, y);
            else mCtx.lineTo(x + offsetX, y);
          });
          mCtx.closePath();
          mCtx.stroke();
        }
        mCtx.restore();

        for (const c of continents) {
          mCtx.fillStyle = c.color;
          mCtx.beginPath();
          c.pts.forEach(([x, y], idx) => {
            if (idx === 0) mCtx.moveTo(x + offsetX, y);
            else mCtx.lineTo(x + offsetX, y);
          });
          mCtx.closePath();
          mCtx.fill();
        }

        // Warm desert highlights (Sahara/Arabia & Central Asia)
        mCtx.fillStyle = 'rgba(210, 178, 110, 0.62)';
        mCtx.beginPath();
        mCtx.ellipse(274 + offsetX, 102, 24, 11, 0.1, 0, Math.PI * 2);
        mCtx.ellipse(362 + offsetX, 76, 26, 10, -0.1, 0, Math.PI * 2);
        mCtx.fill();
      }

      drawContinentSet(0);
      drawContinentSet(512);

      // Polar ice caps
      const northIce = mCtx.createLinearGradient(0, 0, 0, 26);
      northIce.addColorStop(0, '#eef7ff');
      northIce.addColorStop(0.7, '#cfe4fa');
      northIce.addColorStop(1, 'rgba(207, 228, 250, 0)');
      mCtx.fillStyle = northIce;
      mCtx.fillRect(0, 0, 1024, 26);

      const southIce = mCtx.createLinearGradient(0, 228, 0, 256);
      southIce.addColorStop(0, 'rgba(207, 228, 250, 0)');
      southIce.addColorStop(0.35, '#d7ebfc');
      southIce.addColorStop(1, '#f2f8ff');
      mCtx.fillStyle = southIce;
      mCtx.fillRect(0, 228, 1024, 28);

      // Soft cloud layer (1024x256 seamless)
      const cloudC = document.createElement('canvas');
      cloudC.width = 1024;
      cloudC.height = 256;
      const cCtx = cloudC.getContext('2d');
      const puffs = [
        [45, 58, 42, 9], [130, 86, 52, 11], [210, 48, 38, 8], [295, 118, 56, 10],
        [375, 64, 46, 9], [460, 146, 54, 12], [85, 172, 48, 10], [185, 198, 44, 8],
        [265, 165, 36, 8], [345, 192, 50, 11], [435, 92, 40, 8], [495, 54, 34, 9]
      ];
      for (const [px, py, rx, ry] of puffs) {
        for (const ox of [0, 512, -512]) {
          const g = cCtx.createRadialGradient(px + ox, py, 2, px + ox, py, rx);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.56)');
          g.addColorStop(0.6, 'rgba(240, 248, 255, 0.25)');
          g.addColorStop(1, 'rgba(240, 248, 255, 0)');
          cCtx.fillStyle = g;
          cCtx.save();
          cCtx.translate(px + ox, py);
          cCtx.scale(1, ry / rx);
          cCtx.beginPath();
          cCtx.arc(0, 0, rx, 0, Math.PI * 2);
          cCtx.fill();
          cCtx.restore();
        }
      }

      earthMapCanvas = mapC;
      earthCloudCanvas = cloudC;
    }

    function drawRotatingEarth(ctx, cx, cy, r, elapsed, alpha) {
      if (alpha <= 0.01 || r <= 2) return;
      ensureEarthTextures();

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer blue-cyan atmospheric halo
      const halo = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.48);
      halo.addColorStop(0, 'rgba(64, 188, 255, 0.42)');
      halo.addColorStop(0.55, 'rgba(30, 120, 255, 0.16)');
      halo.addColorStop(1, 'rgba(10, 40, 120, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.48, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.32); // gentle axial tilt
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = '#082b5c';
      ctx.fillRect(-r, -r, r * 2, r * 2);

      const slices = gWidth < 768 ? 14 : 28;
      const lonOffset = (elapsed * 0.032) % 1;
      const cloudOffset = (elapsed * 0.042) % 1;
      for (let s = 0; s < slices; s++) {
        const u0 = -1 + (2 * s) / slices;
        const u1 = -1 + (2 * (s + 1)) / slices;
        const dx0 = u0 * r;
        const dx1 = u1 * r;
        const dw = (dx1 - dx0) + 0.8;
        const a0 = Math.asin(u0);
        const a1 = Math.asin(u1);
        const sw = ((a1 - a0) / (Math.PI * 2)) * 512;

        const sxMap = ((((a0 / (Math.PI * 2)) + lonOffset) % 1 + 1) % 1) * 512;
        ctx.drawImage(earthMapCanvas, sxMap, 0, sw, 256, dx0, -r, dw, r * 2);

        const sxCloud = ((((a0 / (Math.PI * 2)) + cloudOffset) % 1 + 1) % 1) * 512;
        ctx.drawImage(earthCloudCanvas, sxCloud, 0, sw, 256, dx0, -r, dw, r * 2);
      }

      // 3D spherical day/night terminator & sun glint
      const shade = ctx.createRadialGradient(-r * 0.34, -r * 0.32, r * 0.08, r * 0.14, r * 0.12, r * 1.28);
      shade.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      shade.addColorStop(0.52, 'rgba(10, 35, 75, 0)');
      shade.addColorStop(0.82, 'rgba(4, 12, 32, 0.45)');
      shade.addColorStop(1, 'rgba(2, 5, 16, 0.85)');
      ctx.fillStyle = shade;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      // Atmospheric limb rim glow inside sphere
      const limb = ctx.createRadialGradient(0, 0, r * 0.68, 0, 0, r);
      limb.addColorStop(0, 'rgba(80, 200, 255, 0)');
      limb.addColorStop(0.86, 'rgba(80, 200, 255, 0.22)');
      limb.addColorStop(1, 'rgba(160, 232, 255, 0.68)');
      ctx.fillStyle = limb;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();

      // Subtle outer rim highlight
      ctx.strokeStyle = 'rgba(150, 228, 255, 0.55)';
      ctx.lineWidth = Math.max(1.2, r * 0.025);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    function wrapAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    function galaxyLocalToScreen(u, v, cx, cy, galaxyRadius, tiltY, cosT, sinT) {
      const lx = u * galaxyRadius;
      const ly = v * galaxyRadius * tiltY;
      return {
        x: cx + (lx * cosT - ly * sinT),
        y: cy + (lx * sinT + ly * cosT)
      };
    }

    function pickRandomGalaxyWaypoint(curU, curV, avoidU, avoidV) {
      const curAng = Math.atan2(curV, curU);
      let bestU = 0;
      let bestV = 0;
      let bestScore = -1;

      for (let i = 0; i < 8; i++) {
        const mode = Math.random();
        let ang;
        let r;
        if (mode < 0.50) {
          const sign = Math.random() < 0.5 ? 1 : -1;
          ang = curAng + sign * (1.25 + Math.random() * 1.45);
          r = 0.66 + Math.random() * 0.25;
        } else if (mode < 0.80) {
          ang = curAng + Math.PI + (Math.random() - 0.5) * 1.3;
          r = 0.46 + Math.random() * 0.43;
        } else {
          const sign = Math.random() < 0.5 ? 1 : -1;
          ang = curAng + sign * (1.05 + Math.random() * 1.6);
          r = 0.22 + Math.random() * 0.36;
        }
        const candU = Math.cos(ang) * r;
        const candV = Math.sin(ang) * r;
        const distCur = Math.hypot(candU - curU, candV - curV);
        const distAvoid = avoidU != null ? Math.hypot(candU - avoidU, candV - avoidV) : 0;
        const spreadBonus = distCur >= 0.65 ? 0.45 : 0;
        const score = distCur + spreadBonus + distAvoid * 0.35;
        if (score > bestScore) {
          bestScore = score;
          bestU = candU;
          bestV = candV;
        }
      }
      return { u: bestU, v: bestV };
    }

    function createGalaxyCoupleState() {
      const ang0 = Math.random() * Math.PI * 2;
      const r0 = 0.54;
      const girlU = Math.cos(ang0) * r0;
      const girlV = Math.sin(ang0) * r0;
      const boyAng = ang0 - 0.52;
      const boyU = Math.cos(boyAng) * r0;
      const boyV = Math.sin(boyAng) * r0;
      const wp0 = pickRandomGalaxyWaypoint(girlU, girlV, boyU, boyV);
      const girlHeading = Math.atan2(wp0.v - girlV, wp0.u - girlU);
      const boyHeading = Math.atan2(girlV - boyV, girlU - boyU);

      return {
        phase: 'chase',
        clock: 0,
        phaseTime: 0,
        nextCatchClock: GALAXY_CATCH_INTERVAL,
        catchCount: 0,
        girl: {
          u: girlU,
          v: girlV,
          heading: girlHeading,
          speed: 0.78,
          vx: Math.cos(girlHeading) * 0.78,
          vy: Math.sin(girlHeading) * 0.78,
          dir: 1,
          stride: 0.6,
          targetU: wp0.u,
          targetV: wp0.v,
          waypointTimer: 1.8,
          weavePhase: Math.random() * Math.PI * 2,
          weaveFreq: 3.1,
          weaveAmp: 0.30,
          escapeBoost: 0
        },
        boy: {
          u: boyU,
          v: boyV,
          heading: boyHeading,
          speed: 0.76,
          vx: Math.cos(boyHeading) * 0.76,
          vy: Math.sin(boyHeading) * 0.76,
          dir: 1,
          stride: 0,
          pauseTimer: 0,
          reach: 0
        },
        catchInfo: {
          u: 0,
          v: 0,
          facing: 1,
          initialHalfSep: 7,
          midHeart1: false,
          midHeart2: false,
          nextWp: wp0,
          nextEscapeHeading: girlHeading
        }
      };
    }

    function drawMiniHeart(ctx, x, y, size, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.fillStyle = color;
      if (gWidth >= 768) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.moveTo(0, size * 0.35);
      ctx.bezierCurveTo(-size * 0.5, -size * 0.35, -size, size * 0.15, 0, size);
      ctx.bezierCurveTo(size, size * 0.15, size * 0.5, -size * 0.35, 0, size * 0.35);
      ctx.fill();
      ctx.restore();
    }

    function drawTinyStarSparkle(ctx, x, y, size, color, alpha, rot = 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      if (gWidth >= 768) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      const inner = size * 0.28;
      ctx.moveTo(0, -size);
      ctx.lineTo(inner, -inner);
      ctx.lineTo(size, 0);
      ctx.lineTo(inner, inner);
      ctx.lineTo(0, size);
      ctx.lineTo(-inner, inner);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-inner, -inner);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function spawnCatchCelebration(x, y, scale, reducedMotion) {
      catchRings.push({ x, y, scale, life: 1.0, maxLife: 0.65 });
      if (catchRings.length > 8) catchRings.shift();

      const heartCount = reducedMotion ? 3 : 6;
      for (let i = 0; i < heartCount; i++) {
        const spread = (i / Math.max(1, heartCount - 1) - 0.5) * 1.4;
        miniHearts2D.push({
          x: x + (Math.random() - 0.5) * 10 * scale,
          y: y - 10 * scale - Math.random() * 6 * scale,
          vx: spread * (0.35 + Math.random() * 0.35),
          vy: -0.58 - Math.random() * 0.34,
          swayPhase: Math.random() * Math.PI * 2,
          swayAmp: reducedMotion ? 0 : 0.22 + Math.random() * 0.18,
          size: (3.6 + Math.random() * 2.2) * Math.max(0.95, scale),
          color: i % 3 === 0 ? '#ffd166' : (i % 2 === 0 ? '#ff4da6' : '#38b6ff'),
          life: 1.0,
          decay: 0.72
        });
      }

      const sparkleCount = reducedMotion ? 5 : 11;
      for (let i = 0; i < sparkleCount; i++) {
        const ang = (i / sparkleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        const spd = (reducedMotion ? 0.65 : 1.15) + Math.random() * (reducedMotion ? 0.65 : 1.45);
        catchSparkles.push({
          x,
          y: y - 3 * scale,
          vx: Math.cos(ang) * spd * scale,
          vy: Math.sin(ang) * spd * 0.85 * scale - 0.25,
          size: (2.6 + Math.random() * 2.2) * Math.max(0.9, scale),
          color: i % 3 === 0 ? '#ffd166' : (i % 2 === 0 ? '#ff85c0' : '#70d6ff'),
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 3.0,
          life: 1.0,
          maxLife: 0.75
        });
      }
      if (catchSparkles.length > 48) catchSparkles.splice(0, catchSparkles.length - 48);
    }

    function spawnEscapePuff(x, y, escapeAngle, scale, reducedMotion) {
      const count = reducedMotion ? 4 : 8;
      for (let i = 0; i < count; i++) {
        const ang = escapeAngle + Math.PI + (Math.random() - 0.5) * 1.45;
        const spd = (0.7 + Math.random() * 1.05) * scale;
        catchSparkles.push({
          x,
          y: y + 5 * scale,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.75,
          size: (2.0 + Math.random() * 1.6) * Math.max(0.85, scale),
          color: i % 2 === 0 ? '#ff85c0' : '#ffd166',
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 2.6,
          life: 1.0,
          maxLife: 0.55
        });
      }
      if (catchSparkles.length > 48) catchSparkles.splice(0, catchSparkles.length - 48);
    }

    function spawnProposalRingGlint(x, y, scale, reducedMotion) {
      catchRings.push({ x, y, scale: scale * 0.72, life: 1.0, maxLife: 0.55 });
      if (catchRings.length > 8) catchRings.shift();

      const glintColors = ['#ffffff', '#ffd166', '#bae6fd'];
      const count = reducedMotion ? 4 : 9;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const spd = (reducedMotion ? 0.55 : 0.95) + Math.random() * (reducedMotion ? 0.5 : 1.05);
        catchSparkles.push({
          x,
          y,
          vx: Math.cos(ang) * spd * scale,
          vy: Math.sin(ang) * spd * 0.85 * scale - 0.2,
          size: (2.2 + Math.random() * 1.8) * Math.max(0.9, scale),
          color: glintColors[i % glintColors.length],
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 2.8,
          life: 1.0,
          maxLife: 0.65
        });
      }
      if (catchSparkles.length > 48) catchSparkles.splice(0, catchSparkles.length - 48);
    }

    function drawTinyRunner(ctx, x, y, dir, stride, isGirl, alpha, scale = 1, reach = 0, boost = 0) {
      const mainColor = isGirl ? '#ff4da6' : '#38b6ff';
      const hiColor = isGirl ? '#ffcce6' : '#bfeaff';
      const glowColor = isGirl ? '#ff4da6' : '#2bbcff';
      const bounce = Math.abs(Math.sin(stride)) * (2.2 + boost * 0.7);

      // Subtle dark contrast aura so tiny characters stand out clearly over bright stars
      const auraR = 14 * scale;
      const aura = ctx.createRadialGradient(x, y, 1 * scale, x, y, auraR);
      aura.addColorStop(0, `rgba(7, 3, 13, ${0.58 * alpha})`);
      aura.addColorStop(1, 'rgba(7, 3, 13, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y, auraR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y - bounce * scale);
      ctx.scale(dir * scale, scale);
      ctx.rotate(0.18 + reach * 0.14 + boost * 0.08);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = mainColor;
      ctx.fillStyle = mainColor;

      // Back arm
      const backArm = -Math.sin(stride) * 0.75;
      ctx.save();
      ctx.globalAlpha = alpha * 0.78;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -2.0);
      ctx.lineTo(Math.sin(backArm) * 4.4, -2.0 + Math.cos(backArm) * 4.2);
      ctx.stroke();
      ctx.restore();

      // Legs with knee bend
      const legPhases = [stride + Math.PI, stride];
      for (let i = 0; i < 2; i++) {
        const swing = Math.sin(legPhases[i]) * 0.85;
        const kneeX = Math.sin(swing) * 3.1;
        const kneeY = 2.4 + Math.cos(swing) * 3.0;
        const shinA = swing - (swing > 0 ? 0.35 : 0.75);
        const footX = kneeX + Math.sin(shinA) * 2.7;
        const footY = kneeY + Math.cos(shinA) * 2.7;
        ctx.save();
        ctx.globalAlpha = i === 0 ? alpha * 0.8 : alpha;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 2.4);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
        ctx.restore();
      }

      // Body (flared dress for girl, capsule torso for boy)
      if (isGirl) {
        ctx.beginPath();
        ctx.moveTo(-1.5, -2.5);
        ctx.lineTo(1.5, -2.5);
        ctx.lineTo(3.6, 2.8);
        ctx.lineTo(-3.6, 2.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hiColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-2.8, 2.5);
        ctx.lineTo(2.8, 2.5);
        ctx.stroke();
        ctx.strokeStyle = mainColor;
      } else {
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, -2.3);
        ctx.lineTo(0, 2.4);
        ctx.stroke();
        ctx.strokeStyle = hiColor;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(0.6, -1.7);
        ctx.lineTo(0.6, 1.4);
        ctx.stroke();
        ctx.strokeStyle = mainColor;
      }

      // Front arm (boy reaches forward smoothly right before catching her)
      const swingArm = Math.sin(stride) * 0.75;
      const frontArm = (!isGirl && reach > 0.05) ? swingArm * (1 - reach) + 1.38 * reach : swingArm;
      const armReachLen = (!isGirl && reach > 0.05) ? (4.5 + reach * 1.15) : 4.5;
      const handX = Math.sin(frontArm) * armReachLen;
      const handY = -2.0 + Math.cos(frontArm) * 4.2;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(0, -2.0);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      if (!isGirl && reach > 0.55) {
        ctx.save();
        ctx.fillStyle = hiColor;
        ctx.globalAlpha = alpha * clamp((reach - 0.55) * 2.0, 0, 0.85);
        ctx.beginPath();
        ctx.arc(handX, handY, 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Girl bouncing ponytail
      if (isGirl) {
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-2.3, -6.5);
        ctx.quadraticCurveTo(-4.4 - boost * 0.8, -7.2, -5.6 - boost * 1.4, -4.8 + Math.sin(stride) * 1.6);
        ctx.stroke();
      }

      // Head + inner highlight
      ctx.beginPath();
      ctx.arc(0, -6.2, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = hiColor;
      ctx.beginPath();
      ctx.arc(0.9, -7.0, 0.95, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawCaughtCouple(ctx, x, y, facing, hugProgress, alpha, scale = 1, initialHalfSep = 7, reducedMotion = false) {
      const p = clamp(hugProgress, 0, 1);
      const tSettle = easeInOut(clamp(p / 0.16, 0, 1));
      const kneelIn = easeInOut(clamp((p - 0.05) / 0.20, 0, 1));
      const standUp = p > 0.86 ? easeInOut((p - 0.86) / 0.14) : 0;
      const kneelT = kneelIn * (1 - standUp);
      const boxOpenT = easeInOut(clamp((p - 0.20) / 0.16, 0, 1)) * (1 - standUp);
      const sep = (initialHalfSep * (1 - tSettle) + 8.4 * tSettle) + standUp * 1.8;
      const heroZoom = 1 + (reducedMotion ? 0.14 : 0.28) * easeInOut(clamp(p / 0.22, 0, 1)) * (1 - standUp);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(facing * scale * heroZoom, scale * heroZoom);

      // Soft dark contrast backing + warm rose-gold proposal halo
      const darkBack = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      darkBack.addColorStop(0, 'rgba(7, 3, 13, 0.68)');
      darkBack.addColorStop(1, 'rgba(7, 3, 13, 0)');
      ctx.fillStyle = darkBack;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();

      const glowAlpha = (0.22 + 0.08 * Math.sin(p * Math.PI)) * (1 - standUp * 0.5);
      const halo = ctx.createRadialGradient(0, -2, 2, 0, -2, 30);
      halo.addColorStop(0, `rgba(255, 130, 185, ${glowAlpha})`);
      halo.addColorStop(0.55, `rgba(255, 209, 102, ${glowAlpha * 0.55})`);
      halo.addColorStop(1, 'rgba(255, 77, 166, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, -2, 30, 0, Math.PI * 2);
      ctx.fill();

      // Starlight ground glow under boy's kneeling knee and girl's feet
      if (kneelT > 0.05) {
        ctx.save();
        ctx.translate(0, 8.3);
        ctx.scale(1, 0.26);
        const floorGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 17.5);
        floorGlow.addColorStop(0, `rgba(255, 214, 130, ${0.34 * kneelT})`);
        floorGlow.addColorStop(0.55, `rgba(255, 110, 175, ${0.18 * kneelT})`);
        floorGlow.addColorStop(1, 'rgba(255, 77, 166, 0)');
        ctx.fillStyle = floorGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 17.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ===== 1. Blue Boy dropping down onto one knee =====
      ctx.save();
      ctx.translate(-sep, 0);
      ctx.shadowColor = '#2bbcff';
      ctx.shadowBlur = 10;

      const hipX = lerp(0, -0.8, kneelT);
      const hipY = lerp(2.4, 5.0, kneelT);
      const shX = hipX + 0.6 * kneelT;
      const shY = hipY - 4.7;

      // Back leg (kneeling on groundline y=8.1)
      const backKneeX = lerp(-0.7, -1.4, kneelT);
      const backKneeY = lerp(5.3, 8.1, kneelT);
      const backFootX = lerp(-1.4, -4.4, kneelT);
      const backFootY = lerp(8.2, 8.0, kneelT);
      ctx.save();
      ctx.globalAlpha = alpha * 0.82;
      ctx.strokeStyle = '#38b6ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(backKneeX, backKneeY);
      ctx.lineTo(backFootX, backFootY);
      ctx.stroke();
      ctx.restore();

      // Back arm supporting ring box
      const handX = lerp(2.8, 5.4, kneelT);
      const handY = lerp(0.2, -2.0, kneelT);
      const backElbowX = lerp(shX, handX, 0.5) - 0.1;
      const backElbowY = lerp(shY, handY, 0.5) + 0.5;
      ctx.save();
      ctx.globalAlpha = alpha * 0.80;
      ctx.strokeStyle = '#38b6ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(shX + 0.5, shY + 0.2);
      ctx.lineTo(backElbowX, backElbowY);
      ctx.lineTo(handX, handY - 0.3);
      ctx.stroke();
      ctx.restore();

      // Front leg (bent 90° proposal knee)
      const frontKneeX = lerp(0.8, 2.5, kneelT);
      const frontKneeY = lerp(5.3, 4.7, kneelT);
      const frontFootX = lerp(1.5, 2.6, kneelT);
      const frontFootY = 8.2;
      ctx.strokeStyle = '#38b6ff';
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(frontKneeX, frontKneeY);
      ctx.lineTo(frontFootX, frontFootY);
      ctx.stroke();

      // Capsule torso + highlight
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(shX, shY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();
      ctx.strokeStyle = '#bfeaff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(shX + 0.6, shY + 0.6);
      ctx.lineTo(hipX + 0.6, hipY - 0.8);
      ctx.stroke();

      // Head looking gently up toward the girl
      const headX = shX + 0.4 * kneelT;
      const headY = shY - 3.9;
      ctx.fillStyle = '#38b6ff';
      ctx.beginPath();
      ctx.arc(headX, headY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#bfeaff';
      ctx.beginPath();
      ctx.arc(headX + 1.0, headY - 1.0, 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Front arm holding up the velvet ring box
      const frontElbowX = lerp(shX, handX, 0.52) - 0.4;
      const frontElbowY = lerp(shY, handY, 0.52) + 0.9;
      ctx.shadowColor = '#2bbcff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#38b6ff';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(shX, shY + 0.3);
      ctx.lineTo(frontElbowX, frontElbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.restore();

      // ===== 2. Open Velvet Ring Box & Glowing Diamond Ring =====
      if (boxOpenT > 0.04) {
        const boxX = -sep + 5.7;
        const boxY = -2.3;
        const ringX = boxX + 0.2;
        const ringY = boxY - 2.4 * boxOpenT;

        ctx.save();
        ctx.globalAlpha = alpha * clamp(boxOpenT * 1.4, 0, 1);

        // Warm golden spotlight halo around the ring
        const ringGlow = ctx.createRadialGradient(ringX, ringY + 0.6, 0.5, ringX, ringY + 0.6, 9.5);
        ringGlow.addColorStop(0, `rgba(255, 232, 145, ${0.46 * boxOpenT})`);
        ringGlow.addColorStop(0.55, `rgba(255, 209, 102, ${0.20 * boxOpenT})`);
        ringGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
        ctx.fillStyle = ringGlow;
        ctx.beginPath();
        ctx.arc(ringX, ringY + 0.6, 9.5, 0, Math.PI * 2);
        ctx.fill();

        // Crimson velvet ring box base + gold trim
        ctx.fillStyle = '#be185d';
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 0.7;
        ctx.fillRect(boxX - 2.2, boxY - 0.8, 4.4, 2.5);
        ctx.strokeRect(boxX - 2.2, boxY - 0.8, 4.4, 2.5);

        // Gold front clasp dot
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(boxX + 2.2, boxY + 0.35, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Open hinged box lid tilted back (-55 deg)
        ctx.save();
        ctx.translate(boxX - 2.1, boxY - 0.8);
        ctx.rotate(-0.96 * boxOpenT);
        ctx.fillStyle = '#9d174d';
        ctx.fillRect(-0.1, -1.2, 4.4, 1.2);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 0.65;
        ctx.strokeRect(-0.1, -1.2, 4.4, 1.2);
        ctx.restore();

        // Golden ring band
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(ringX, ringY, 2.1, 0, Math.PI * 2);
        ctx.stroke();

        // Sparkling white-ice diamond crown
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ringX - 1.35, ringY - 2.1);
        ctx.lineTo(ringX - 0.75, ringY - 3.35);
        ctx.lineTo(ringX + 0.75, ringY - 3.35);
        ctx.lineTo(ringX + 1.35, ringY - 2.1);
        ctx.lineTo(ringX, ringY - 1.15);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(ringX - 0.7, ringY - 2.1);
        ctx.lineTo(ringX, ringY - 3.15);
        ctx.lineTo(ringX + 0.55, ringY - 2.1);
        ctx.closePath();
        ctx.fill();

        drawTinyStarSparkle(
          ctx,
          ringX + 0.4,
          ringY - 2.7,
          2.4 * boxOpenT,
          '#ffffff',
          0.92 * boxOpenT,
          reducedMotion ? 0 : p * 3.5
        );
        ctx.restore();
      }

      // ===== 3. Pink Girl Reacting with Surprised Joy =====
      const girlHop = reducedMotion ? 0 : Math.sin(clamp((p - 0.22) / 0.42, 0, 1) * Math.PI) * 1.8;
      ctx.save();
      ctx.translate(sep, -girlHop);
      ctx.scale(-1, 1);
      ctx.rotate(0.10 * kneelT - standUp * 0.34);
      ctx.shadowColor = '#ff4da6';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff4da6';
      ctx.fillStyle = '#ff4da6';

      // Legs resting neatly (slight joyful tip-toe tuck during hop)
      const hopTuck = girlHop * 0.45;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 2.4);
      ctx.lineTo(-1.3, 8.1 - hopTuck);
      ctx.moveTo(0, 2.4);
      ctx.lineTo(1.4, 8.1 - hopTuck * 0.6);
      ctx.stroke();

      // Girl flared dress
      ctx.beginPath();
      ctx.moveTo(-1.5, -2.5);
      ctx.lineTo(1.5, -2.5);
      ctx.lineTo(3.6, 2.8);
      ctx.lineTo(-3.6, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffcce6';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2.8, 2.5);
      ctx.lineTo(2.8, 2.5);
      ctx.stroke();

      // Expressive arms: surprise gasp -> tender admire -> shy release
      const acceptT = easeInOut(clamp((p - 0.56) / 0.14, 0, 1));
      const fElbowX = lerp(lerp(2.4, 2.3, acceptT), 1.7, standUp);
      const fElbowY = lerp(lerp(-1.6, -1.2, acceptT), -0.8, standUp);
      const fHandX = lerp(lerp(1.6, 4.1, acceptT), 2.8, standUp);
      const fHandY = lerp(lerp(-4.4, -1.6, acceptT), 0.6, standUp);

      const bElbowX = lerp(lerp(2.0, 2.1, acceptT), -1.4, standUp);
      const bElbowY = lerp(lerp(-1.6, -1.5, acceptT), -0.7, standUp);
      const bHandX = lerp(lerp(1.3, 1.4, acceptT), -2.2, standUp);
      const bHandY = lerp(lerp(-4.3, -2.2, acceptT), 0.8, standUp);

      ctx.save();
      ctx.globalAlpha = alpha * 0.82;
      ctx.strokeStyle = '#ff4da6';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -2.0);
      ctx.lineTo(bElbowX, bElbowY);
      ctx.lineTo(bHandX, bHandY);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#ff4da6';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(0, -2.0);
      ctx.lineTo(fElbowX, fElbowY);
      ctx.lineTo(fHandX, fHandY);
      ctx.stroke();

      // Bouncing ponytail
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-2.3, -6.5);
      ctx.quadraticCurveTo(-4.5, -7.2 - girlHop * 0.5, -5.7, -4.6 + Math.sin(p * Math.PI * 3) * 0.9);
      ctx.stroke();

      // Head + highlight + rosy cheek blush
      ctx.beginPath();
      ctx.arc(0, -6.2, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffcce6';
      ctx.beginPath();
      ctx.arc(0.9, -7.0, 0.95, 0, Math.PI * 2);
      ctx.fill();
      if (boxOpenT > 0.1) {
        ctx.fillStyle = `rgba(255, 130, 175, ${0.55 * boxOpenT})`;
        ctx.beginPath();
        ctx.arc(1.7, -5.5, 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ===== 4. Floating Glowing Pink-and-Gold Heart Emblem Above Them =====
      const heartIn = easeInOut(clamp((p - 0.14) / 0.22, 0, 1));
      const heartOut = 1 - standUp * 0.85;
      const heartScale = heartIn * heartOut * (1 + (reducedMotion ? 0 : Math.sin(p * Math.PI * 2) * 0.10));
      if (heartScale > 0.05) {
        const hy = -16.2 - heartIn * 1.8;
        drawMiniHeart(ctx, 0, hy, 6.2 * heartScale, '#ff4da6', 0.95 * heartOut);
        drawMiniHeart(ctx, 0, hy + 1.1 * heartScale, 3.0 * heartScale, '#ffd166', 0.92 * heartOut);
      }

      ctx.restore();
    }

    function updateGalaxyCouple(state, dt, cx, cy, galaxyRadius, tiltY, cosT, sinT, baseScale, now, reducedMotion) {
      state.clock += dt;
      state.phaseTime += dt;

      if (state.phase === 'chase') {
        const girl = state.girl;
        const boy = state.boy;
        const timeLeft = Math.max(0, state.nextCatchClock - state.clock);
        const speedMult = reducedMotion ? 0.64 : 1.0;

        const prevGirlU = girl.u;
        const prevGirlV = girl.v;
        const prevBoyU = boy.u;
        const prevBoyV = boy.v;
        const prevGirlPos = galaxyLocalToScreen(prevGirlU, prevGirlV, cx, cy, galaxyRadius, tiltY, cosT, sinT);
        const prevBoyPos = galaxyLocalToScreen(prevBoyU, prevBoyV, cx, cy, galaxyRadius, tiltY, cosT, sinT);

        // Girl random galaxy roaming + playful teasing weave
        girl.waypointTimer -= dt;
        girl.weavePhase += dt * girl.weaveFreq;
        if (Math.hypot(girl.targetU - girl.u, girl.targetV - girl.v) < 0.18 || girl.waypointTimer <= 0) {
          const wp = pickRandomGalaxyWaypoint(girl.u, girl.v, boy.u, boy.v);
          girl.targetU = wp.u;
          girl.targetV = wp.v;
          girl.waypointTimer = 1.35 + Math.random() * 1.15;
          girl.weaveFreq = 2.6 + Math.random() * 2.2;
          girl.weaveAmp = 0.22 + Math.random() * 0.22;
        }

        let dirU = girl.targetU - girl.u;
        let dirV = girl.targetV - girl.v;
        const targetDist = Math.hypot(dirU, dirV) || 1;
        dirU /= targetDist;
        dirV /= targetDist;

        const distBG = Math.hypot(girl.u - boy.u, girl.v - boy.v);
        if (timeLeft > 1.35 && distBG < 0.34 && distBG > 0.001) {
          const evadeW = ((0.34 - distBG) / 0.34) * 0.75;
          dirU = dirU * (1 - evadeW) + ((girl.u - boy.u) / distBG) * evadeW;
          dirV = dirV * (1 - evadeW) + ((girl.v - boy.v) / distBG) * evadeW;
        }

        const rG = Math.hypot(girl.u, girl.v);
        if (rG > 0.83) {
          const inW = clamp((rG - 0.83) / 0.12, 0, 1) * 0.85;
          dirU = dirU * (1 - inW) + (-girl.u / rG) * inW;
          dirV = dirV * (1 - inW) + (-girl.v / rG) * inW;
        }

        const desiredGirlHeading = Math.atan2(dirV, dirU) + Math.sin(girl.weavePhase) * girl.weaveAmp;
        girl.heading += clamp(wrapAngle(desiredGirlHeading - girl.heading), -4.4 * dt, 4.4 * dt);

        const escapeFactor = (state.catchCount > 0 && state.phaseTime < 0.55) ? (1 - state.phaseTime / 0.55) : 0;
        girl.escapeBoost = escapeFactor;
        let girlSpeed = 0.85 * speedMult * (1 + 0.42 * escapeFactor);
        if (timeLeft > 1.25 && distBG < 0.30) girlSpeed += 0.14 * speedMult;
        if (timeLeft < 0.55) girlSpeed *= 0.72 + 0.28 * (timeLeft / 0.55);
        girl.speed = girlSpeed;

        girl.u += Math.cos(girl.heading) * girl.speed * dt;
        girl.v += Math.sin(girl.heading) * girl.speed * dt;
        const rGAfter = Math.hypot(girl.u, girl.v);
        if (rGAfter > 0.92) {
          girl.u = (girl.u / rGAfter) * 0.92;
          girl.v = (girl.v / rGAfter) * 0.92;
          const inward = Math.atan2(-girl.v, -girl.u);
          girl.heading += clamp(wrapAngle(inward - girl.heading), -2.5 * dt, 2.5 * dt);
        }
        girl.vx = (girl.u - prevGirlU) / Math.max(dt, 0.0001);
        girl.vy = (girl.v - prevGirlV) / Math.max(dt, 0.0001);

        // Boy pursuit & smooth guaranteed 5-second catch
        if (boy.pauseTimer > 0) {
          boy.pauseTimer = Math.max(0, boy.pauseTimer - dt);
          boy.vx = 0;
          boy.vy = 0;
          boy.reach = 0;
          boy.heading = Math.atan2(girl.v - boy.v, girl.u - boy.u);
        } else {
          const du = girl.u - boy.u;
          const dv = girl.v - boy.v;
          const dist = Math.hypot(du, dv) || 0.0001;
          const sprintWindow = 1.25;

          if (timeLeft > sprintWindow) {
            const aimU = girl.u + girl.vx * 0.08;
            const aimV = girl.v + girl.vy * 0.08;
            const desiredBoyHeading = Math.atan2(aimV - boy.v, aimU - boy.u);
            boy.heading += clamp(wrapAngle(desiredBoyHeading - boy.heading), -5.0 * dt, 5.0 * dt);
            const desiredGap = (reducedMotion ? 0.22 : 0.31) + Math.sin(state.clock * 2.7) * 0.06;
            boy.speed = clamp(girl.speed + (dist - desiredGap) * 1.65, 0.48 * speedMult, 1.24 * speedMult);
            boy.reach = Math.max(0, boy.reach - dt * 3.5);
          } else {
            const sprintP = clamp(1 - timeLeft / sprintWindow, 0, 1);
            const leadT = Math.min(0.16, timeLeft * 0.35);
            const aimU = girl.u + girl.vx * leadT;
            const aimV = girl.v + girl.vy * leadT;
            const desiredBoyHeading = Math.atan2(aimV - boy.v, aimU - boy.u);
            boy.heading += clamp(wrapAngle(desiredBoyHeading - boy.heading), -(5.5 + sprintP * 9.5) * dt, (5.5 + sprintP * 9.5) * dt);

            const girlAway = (girl.vx * du + girl.vy * dv) / dist;
            const neededSpeed = Math.max(0, dist - 0.025) / Math.max(timeLeft - 0.04, 0.06) + Math.max(0, girlAway);
            const minBoySpeed = (dist < 0.10 && timeLeft > 0.20) ? girl.speed * 0.55 : girl.speed * 0.88;
            boy.speed = clamp(neededSpeed, minBoySpeed, reducedMotion ? 1.28 : 1.85);
            boy.reach = clamp((0.26 - dist) / 0.18, 0, 1) * clamp(sprintP * 1.4, 0, 1);
          }

          boy.u += Math.cos(boy.heading) * boy.speed * dt;
          boy.v += Math.sin(boy.heading) * boy.speed * dt;
          const rBAfter = Math.hypot(boy.u, boy.v);
          if (rBAfter > 0.93) {
            boy.u = (boy.u / rBAfter) * 0.93;
            boy.v = (boy.v / rBAfter) * 0.93;
          }
          boy.vx = (boy.u - prevBoyU) / Math.max(dt, 0.0001);
          boy.vy = (boy.v - prevBoyV) / Math.max(dt, 0.0001);
        }

        const girlPos = galaxyLocalToScreen(girl.u, girl.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
        const boyPos = galaxyLocalToScreen(boy.u, boy.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
        const girlScreenVx = (girlPos.x - prevGirlPos.x) / Math.max(dt, 0.001);
        const boyScreenVx = (boyPos.x - prevBoyPos.x) / Math.max(dt, 0.001);

        if (Math.abs(girlScreenVx) > 8) girl.dir = girlScreenVx >= 0 ? 1 : -1;
        if (boy.pauseTimer > 0) {
          boy.dir = girlPos.x >= boyPos.x ? 1 : -1;
        } else if (Math.abs(boyScreenVx) > 8) {
          boy.dir = boyScreenVx >= 0 ? 1 : -1;
        }

        girl.stride += Math.hypot(girl.u - prevGirlU, girl.v - prevGirlV) * 18;
        boy.stride += Math.hypot(boy.u - prevBoyU, boy.v - prevBoyV) * 18;

        const girlScale = baseScale * (0.92 + 0.14 * ((girl.v + 1) * 0.5));
        const boyScale = baseScale * (0.92 + 0.14 * ((boy.v + 1) * 0.5));

        if (now - lastTrailAt > 34) {
          lastTrailAt = now;
          trailParticles.push(
            { x: girlPos.x - girl.dir * 2 * girlScale, y: girlPos.y + 7 * girlScale, color: '#ff4da6', life: 1.0, r: 1.8 * girlScale },
            { x: boyPos.x - boy.dir * 2 * boyScale, y: boyPos.y + 7 * boyScale, color: '#38b6ff', life: 1.0, r: 1.8 * boyScale }
          );
          if (trailParticles.length > 140) trailParticles.splice(0, trailParticles.length - 140);
        }

        const newDist = Math.hypot(girl.u - boy.u, girl.v - boy.v);
        if (newDist < 0.24 && now - lastHeartAt > 560) {
          lastHeartAt = now;
          miniHearts2D.push({
            x: (girlPos.x + boyPos.x) * 0.5 + (Math.random() - 0.5) * 8,
            y: Math.min(girlPos.y, boyPos.y) - 10,
            vx: 0,
            vy: -0.45 - Math.random() * 0.25,
            swayPhase: 0,
            swayAmp: 0,
            size: (3.4 + Math.random() * 1.8) * baseScale,
            color: Math.random() < 0.5 ? '#ff4da6' : '#38b6ff',
            life: 1.0,
            decay: 0.9
          });
        }

        if ((timeLeft <= 0.18 && newDist <= 0.085) || timeLeft <= 0) {
          state.catchCount++;
          state.phase = 'caught';
          state.phaseTime = 0;

          let midU = (girl.u + boy.u) * 0.5;
          let midV = (girl.v + boy.v) * 0.5;
          const midR = Math.hypot(midU, midV);
          if (midR > 0.84) {
            midU = (midU / midR) * 0.84;
            midV = (midV / midR) * 0.84;
          }

          const facing = boyPos.x <= girlPos.x ? 1 : -1;
          const midPos = galaxyLocalToScreen(midU, midV, cx, cy, galaxyRadius, tiltY, cosT, sinT);
          const midScale = baseScale * (0.92 + 0.14 * ((midV + 1) * 0.5));
          const initialHalfSep = clamp(
            (Math.hypot(girlPos.x - boyPos.x, girlPos.y - boyPos.y) * 0.5) / Math.max(midScale, 0.5),
            3.4,
            14
          );
          const nextWp = pickRandomGalaxyWaypoint(midU, midV);
          const nextEscapeHeading = Math.atan2(nextWp.v - midV, nextWp.u - midU);

          state.nextCatchClock += GALAXY_CATCH_INTERVAL;
          state.catchInfo = {
            u: midU,
            v: midV,
            facing,
            initialHalfSep,
            midHeart1: false,
            midHeart2: false,
            ringBurstSpawned: false,
            nextWp,
            nextEscapeHeading
          };

          spawnCatchCelebration(midPos.x, midPos.y, midScale, reducedMotion);
        }
      } else if (state.phase === 'caught') {
        const ci = state.catchInfo;
        const hugP = clamp(state.phaseTime / GALAXY_CAUGHT_DURATION, 0, 1);
        const midPos = galaxyLocalToScreen(ci.u, ci.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
        const midScale = baseScale * (0.92 + 0.14 * ((ci.v + 1) * 0.5));

        if (!ci.ringBurstSpawned && hugP >= 0.24) {
          ci.ringBurstSpawned = true;
          const heroZoom = 1 + (reducedMotion ? 0.14 : 0.28) * easeInOut(clamp(hugP / 0.22, 0, 1));
          const ringScreenX = midPos.x + ci.facing * (-2.5) * midScale * heroZoom;
          const ringScreenY = midPos.y + (-3.2) * midScale * heroZoom;
          spawnProposalRingGlint(ringScreenX, ringScreenY, midScale, reducedMotion);
        }
        if (!ci.midHeart1 && hugP >= 0.38) {
          ci.midHeart1 = true;
          miniHearts2D.push({
            x: midPos.x + (Math.random() - 0.5) * 6 * midScale,
            y: midPos.y - 16 * midScale,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.62,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmp: reducedMotion ? 0 : 0.25,
            size: 4.5 * Math.max(0.95, midScale),
            color: '#ff4da6',
            life: 1.0,
            decay: 0.72
          });
        }
        if (!ci.midHeart2 && hugP >= 0.70) {
          ci.midHeart2 = true;
          miniHearts2D.push({
            x: midPos.x + (Math.random() - 0.5) * 6 * midScale,
            y: midPos.y - 15 * midScale,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.66,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmp: reducedMotion ? 0 : 0.25,
            size: 4.2 * Math.max(0.95, midScale),
            color: '#ffd166',
            life: 1.0,
            decay: 0.72
          });
        }

        if (state.phaseTime >= GALAXY_CAUGHT_DURATION) {
          state.phase = 'chase';
          state.phaseTime = 0;

          const ang = ci.nextEscapeHeading;
          const girl = state.girl;
          const boy = state.boy;

          girl.u = ci.u + Math.cos(ang) * 0.065;
          girl.v = ci.v + Math.sin(ang) * 0.065;
          const gR = Math.hypot(girl.u, girl.v);
          if (gR > 0.90) {
            girl.u = (girl.u / gR) * 0.90;
            girl.v = (girl.v / gR) * 0.90;
          }
          girl.heading = ang;
          girl.targetU = ci.nextWp.u;
          girl.targetV = ci.nextWp.v;
          girl.waypointTimer = 1.6 + Math.random() * 1.0;
          girl.weavePhase = Math.random() * Math.PI * 2;
          girl.escapeBoost = 1;

          boy.u = ci.u - Math.cos(ang) * 0.035;
          boy.v = ci.v - Math.sin(ang) * 0.035;
          boy.pauseTimer = reducedMotion ? 0.12 : 0.16;
          boy.reach = 0;
          boy.heading = ang;

          const escapePos = galaxyLocalToScreen(girl.u, girl.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
          const escapeScale = baseScale * (0.92 + 0.14 * ((girl.v + 1) * 0.5));
          const escapeScreenVx = Math.cos(ang) * cosT - Math.sin(ang) * tiltY * sinT;
          girl.dir = escapeScreenVx >= 0 ? 1 : -1;
          spawnEscapePuff(escapePos.x, escapePos.y, Math.atan2(escapePos.y - midPos.y, escapePos.x - midPos.x), escapeScale, reducedMotion);
        }
      }
    }

    // ================= 3.5. 21-POINT SHOOTER MINI-GAME =================
    const TARGET_SCORE = 21;
    const MAX_PLAYER_LIVES = 5;
    const SPACESHIP_DURATION = 30;
    const HEART_DRAW_DURATION = 1.35;
    const HEART_HOLD_DURATION = 0.45;
    const HEART_CHARGE_DURATION = 0.35;
    const HEART_TOTAL_DURATION = HEART_DRAW_DURATION + HEART_HOLD_DURATION + HEART_CHARGE_DURATION;

    const HEART_HALF_PTS = (() => {
      const segs = [
        [[100, 38], [92, 18], [75, 6], [55, 6]],
        [[55, 6], [28, 6], [6, 26], [6, 56]],
        [[6, 56], [6, 92], [42, 128], [100, 170]]
      ];
      const raw = [];
      const stepsPerSeg = 120;
      for (let s = 0; s < segs.length; s++) {
        const [p0, p1, p2, p3] = segs[s];
        const startI = s === 0 ? 0 : 1;
        for (let i = startI; i <= stepsPerSeg; i++) {
          const t = i / stepsPerSeg;
          const u = 1 - t;
          const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
          const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
          raw.push({ x: x - 100, y: y - 90 });
        }
      }
      const cum = [0];
      for (let i = 1; i < raw.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
      }
      const totalLen = cum[cum.length - 1] || 1;
      const sampleCount = 120;
      const resampled = [];
      let cursor = 0;
      for (let k = 0; k < sampleCount; k++) {
        const target = (k / (sampleCount - 1)) * totalLen;
        while (cursor < cum.length - 2 && cum[cursor + 1] < target) cursor++;
        const segLen = cum[cursor + 1] - cum[cursor];
        const f = segLen > 0 ? (target - cum[cursor]) / segLen : 0;
        resampled.push({
          x: raw[cursor].x + (raw[cursor + 1].x - raw[cursor].x) * f,
          y: raw[cursor].y + (raw[cursor + 1].y - raw[cursor].y) * f
        });
      }
      return resampled;
    })();

    function getHeartPointAt(progress, side, cx, cy, scale) {
      const p = clamp(progress, 0, 1);
      const exact = p * (HEART_HALF_PTS.length - 1);
      const i0 = Math.floor(exact);
      const i1 = Math.min(HEART_HALF_PTS.length - 1, i0 + 1);
      const f = exact - i0;
      const px = HEART_HALF_PTS[i0].x + (HEART_HALF_PTS[i1].x - HEART_HALF_PTS[i0].x) * f;
      const py = HEART_HALF_PTS[i0].y + (HEART_HALF_PTS[i1].y - HEART_HALF_PTS[i0].y) * f;
      return {
        x: cx + (side < 0 ? px : -px) * scale,
        y: cy + py * scale
      };
    }

    function getCoupleHeartFrame(p) {
      const scale = clamp(Math.min((gameW - 24) / 210, (gameH - p.y + 32) / 108), 0.76, 0.94);
      const cy = Math.min(p.y - 12, gameH - 80 * scale - 16);
      return { cx: p.x + 1, cy, scale };
    }

    function traceHeartHalfSubpath(ctx, progress, side, cx, cy, scale) {
      const p = clamp(progress, 0, 1);
      if (p <= 0) return;
      const maxExact = p * (HEART_HALF_PTS.length - 1);
      const lastIdx = Math.floor(maxExact);
      const sign = side < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx + HEART_HALF_PTS[0].x * sign * scale, cy + HEART_HALF_PTS[0].y * scale);
      for (let i = 1; i <= lastIdx; i++) {
        ctx.lineTo(cx + HEART_HALF_PTS[i].x * sign * scale, cy + HEART_HALF_PTS[i].y * scale);
      }
      const tip = getHeartPointAt(p, side, cx, cy, scale);
      ctx.lineTo(tip.x, tip.y);
    }

    function traceFullHeartPath(ctx, cx, cy, scale) {
      ctx.beginPath();
      ctx.moveTo(cx + HEART_HALF_PTS[0].x * scale, cy + HEART_HALF_PTS[0].y * scale);
      for (let i = 1; i < HEART_HALF_PTS.length; i++) {
        ctx.lineTo(cx + HEART_HALF_PTS[i].x * scale, cy + HEART_HALF_PTS[i].y * scale);
      }
      for (let i = HEART_HALF_PTS.length - 2; i >= 0; i--) {
        ctx.lineTo(cx - HEART_HALF_PTS[i].x * scale, cy + HEART_HALF_PTS[i].y * scale);
      }
      ctx.closePath();
    }

    function getCoupleHeartPhase(g) {
      const timer = g.phaseTimer;
      const drawT = clamp(timer / HEART_DRAW_DURATION, 0, 1);
      const holdT = clamp((timer - HEART_DRAW_DURATION) / HEART_HOLD_DURATION, 0, 1);
      const chargeT = clamp((timer - HEART_DRAW_DURATION - HEART_HOLD_DURATION) / HEART_CHARGE_DURATION, 0, 1);
      const pulse = 1 + (holdT > 0 && chargeT === 0 ? Math.sin(holdT * Math.PI) * 0.065 : 0) + chargeT * 0.05;
      return { drawT, holdT, chargeT, pulse };
    }

    function drawCoupleHeartAura(ctx, frame, g) {
      const { drawT, chargeT, pulse } = getCoupleHeartPhase(g);
      const sc = frame.scale * pulse;
      const auraAlpha = 0.08 + drawT * 0.18 + chargeT * 0.06;

      ctx.save();
      const radial = ctx.createRadialGradient(frame.cx, frame.cy, 8 * sc, frame.cx, frame.cy, 118 * sc);
      radial.addColorStop(0, `rgba(255, 77, 121, ${auraAlpha})`);
      radial.addColorStop(0.55, `rgba(255, 133, 162, ${auraAlpha * 0.52})`);
      radial.addColorStop(1, 'rgba(255, 77, 121, 0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(frame.cx, frame.cy, 118 * sc, 0, Math.PI * 2);
      ctx.fill();

      if (drawT > 0.75) {
        const fillAlpha = clamp((drawT - 0.75) / 0.25, 0, 1) * 0.19 + chargeT * 0.05;
        const fillGrad = ctx.createRadialGradient(frame.cx, frame.cy - 10 * sc, 6, frame.cx, frame.cy, 102 * sc);
        fillGrad.addColorStop(0, `rgba(255, 194, 212, ${fillAlpha * 0.75})`);
        fillGrad.addColorStop(0.6, `rgba(255, 77, 121, ${fillAlpha})`);
        fillGrad.addColorStop(1, `rgba(255, 42, 102, ${fillAlpha * 0.65})`);
        ctx.fillStyle = fillGrad;
        traceFullHeartPath(ctx, frame.cx, frame.cy, sc);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawCoupleHeartAnimation(ctx, frame, g, now) {
      const { drawT, holdT, chargeT, pulse } = getCoupleHeartPhase(g);
      const shake = (chargeT > 0 && !reducedMotionQuery.matches) ? chargeT * 1.1 : 0;
      const cx = frame.cx + (shake ? Math.sin(now * 0.085) * shake : 0);
      const cy = frame.cy + (shake ? Math.cos(now * 0.097) * shake : 0);
      const sc = frame.scale * pulse;
      const k = ease(drawT);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (k > 0.005) {
        const mainColor = chargeT > 0
          ? `rgb(255, ${Math.round(77 + 160 * chargeT)}, ${Math.round(121 + 110 * chargeT)})`
          : '#ff4d79';

        for (const side of [-1, 1]) {
          // 1) Outer bloom stroke
          ctx.strokeStyle = `rgba(255, 77, 121, ${0.35 + chargeT * 0.35})`;
          ctx.lineWidth = 9;
          traceHeartHalfSubpath(ctx, k, side, cx, cy, sc);
          ctx.stroke();

          // 2) Main glowing rose-to-gold stroke
          ctx.save();
          ctx.strokeStyle = mainColor;
          ctx.shadowColor = chargeT > 0.3 ? '#ffd166' : '#ff4d79';
          ctx.shadowBlur = 18 + chargeT * 10;
          ctx.lineWidth = 4;
          traceHeartHalfSubpath(ctx, k, side, cx, cy, sc);
          ctx.stroke();
          ctx.restore();

          // 3) Thin luminous core
          ctx.strokeStyle = '#ffe5ec';
          ctx.lineWidth = 1.6;
          traceHeartHalfSubpath(ctx, k, side, cx, cy, sc);
          ctx.stroke();
        }
      }

      // Glowing pen orbs while drawing both halves symmetrically
      if (drawT < 1) {
        for (const side of [-1, 1]) {
          const tip = getHeartPointAt(k, side, cx, cy, sc);
          const orb = ctx.createRadialGradient(tip.x, tip.y, 0.5, tip.x, tip.y, 13);
          orb.addColorStop(0, '#ffffff');
          orb.addColorStop(0.35, '#ffd166');
          orb.addColorStop(0.7, 'rgba(255, 77, 121, 0.55)');
          orb.addColorStop(1, 'rgba(255, 77, 121, 0)');
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Soft expanding golden-pink ring when both strokes meet at the bottom tip
      if (holdT > 0 && holdT < 1) {
        const tipY = cy + 80 * sc;
        ctx.save();
        ctx.globalAlpha = (1 - holdT) * 0.85;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(cx, tipY, 5 + holdT * 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Crystalline fracture lines along the contour right before shattering into the galaxy
      if (chargeT > 0) {
        const crackProgress = [0.2, 0.42, 0.64, 0.84];
        ctx.save();
        ctx.globalAlpha = chargeT * 0.95;
        ctx.strokeStyle = '#fff5d6';
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.6;
        for (const side of [-1, 1]) {
          for (let i = 0; i < crackProgress.length; i++) {
            const pt = getHeartPointAt(crackProgress[i], side, cx, cy, sc);
            const ang = Math.atan2(pt.y - cy, pt.x - cx) + (i % 2 === 0 ? 0.35 : -0.35);
            const len = (6 + chargeT * 10) * sc;
            ctx.beginPath();
            ctx.moveTo(pt.x - Math.cos(ang) * len * 0.45, pt.y - Math.sin(ang) * len * 0.45);
            ctx.lineTo(pt.x + Math.cos(ang) * len, pt.y + Math.sin(ang) * len);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      ctx.restore();
    }

    let gameW = window.innerWidth;
    let gameH = window.innerHeight;
    let audioCtx = null;

    function playGameTone(freqStart, freqEnd, duration, type = 'sine', volume = 0.06) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!audioCtx) audioCtx = new AC();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (e) { }
    }

    function getSafeAreaInsets() {
      const cs = getComputedStyle(document.documentElement);
      return {
        top: parseFloat(cs.getPropertyValue('--sat')) || 0,
        right: parseFloat(cs.getPropertyValue('--sar')) || 0,
        bottom: parseFloat(cs.getPropertyValue('--sab')) || 0,
        left: parseFloat(cs.getPropertyValue('--sal')) || 0
      };
    }

    function getGirlAnchorPos() {
      const insets = getSafeAreaInsets();
      return { x: gameW / 2, y: Math.max(78, gameH * 0.13) + insets.top };
    }

    function getDefaultPlayerY() {
      const insets = getSafeAreaInsets();
      return gameH - Math.max(76, gameH * 0.13) - insets.bottom;
    }

    function getPlayerBounds() {
      const insets = getSafeAreaInsets();
      const girlAnchor = getGirlAnchorPos();
      const minX = Math.max(30, insets.left + 26);
      const maxX = Math.max(minX, gameW - Math.max(30, insets.right + 26));
      const minY = Math.max(girlAnchor.y + 92, gameH * 0.36);
      const maxY = Math.max(minY, gameH - Math.max(66, insets.bottom + 48));
      return { minX, maxX, minY, maxY };
    }

    function getSpaceshipBounds() {
      const insets = getSafeAreaInsets();
      const minX = Math.max(32, insets.left + 28);
      const maxX = Math.max(minX, gameW - Math.max(32, insets.right + 28));
      const minY = Math.max(76 + insets.top, gameH * 0.14);
      const maxY = Math.max(minY, gameH - Math.max(58, insets.bottom + 44));
      return { minX, maxX, minY, maxY };
    }

    function clampPlayerPos(x, y) {
      const b = (gameState && (gameState.phase === 'spaceship' || gameState.phase === 'spaceship_intro' || gameState.phase === 'spaceship_warp'))
        ? getSpaceshipBounds()
        : getPlayerBounds();
      return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
    }

    function resizeGameCanvas() {
      const vp = window.ldOrientation ? window.ldOrientation.getViewportSize() : { w: window.innerWidth, h: window.innerHeight };
      const maxDpr = vp.w < 768 ? 1.25 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      gameW = vp.w;
      gameH = vp.h;
      gameCanvas.width = Math.floor(gameW * dpr);
      gameCanvas.height = Math.floor(gameH * dpr);
      gameCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gameState && gameState.player) {
        if (gameState.won) {
          gameState.player.x = clamp(gameState.player.x, 34, gameW - 34);
          gameState.player.y = getDefaultPlayerY();
        } else {
          const clamped = clampPlayerPos(gameState.player.x, gameState.player.y);
          gameState.player.x = clamped.x;
          gameState.player.y = clamped.y;
        }
      }
      if (gameState && gameState.girl) {
        const anchor = getGirlAnchorPos();
        gameState.girl.anchorX = anchor.x;
        gameState.girl.anchorY = anchor.y;
        if (gameState.girl.phase === 'chained' || gameState.girl.phase === 'move_center' || gameState.girl.phase === 'unchaining') {
          gameState.girl.x = gameState.girl.anchorX;
          gameState.girl.y = gameState.girl.anchorY;
        } else if ((gameState.girl.phase === 'caught' || gameState.girl.phase === 'heart_draw') && gameState.player) {
          gameState.girl.x = gameState.player.x;
          gameState.girl.y = gameState.player.y - 6;
        }
      }
    }

    window.addEventListener('resize', () => {
      if (gameOverlay.style.display !== 'none') resizeGameCanvas();
    });

    function spawnEnemy(initial = false, slotIdx = -1, totalSlots = 5) {
      if (!gameState || gameState.won || gameState.gameOver) return;
      const insets = getSafeAreaInsets();
      const hp = Math.random() < 0.34 ? 2 : 1;
      const radius = hp > 1 ? 22 : 18;
      const minX = Math.max(34, insets.left + 28);
      const maxX = Math.max(minX + 10, gameW - Math.max(34, insets.right + 28));
      const spanX = maxX - minX;
      let x, y;
      if (initial && slotIdx >= 0) {
        const laneW = spanX / Math.max(1, totalSlots);
        x = minX + laneW * (slotIdx + 0.2 + Math.random() * 0.6);
        y = -radius - 10 - slotIdx * 30;
      } else {
        x = minX + Math.random() * spanX;
        const prev = gameState.enemies[gameState.enemies.length - 1];
        if (prev && spanX > 70) {
          for (let attempt = 0; attempt < 5; attempt++) {
            const cand = minX + Math.random() * spanX;
            x = cand;
            if (Math.abs(cand - prev.x) >= 52) break;
          }
        }
        y = -radius - 12 - Math.random() * 28;
      }
      gameState.enemies.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 28,
        vy: hp > 1 ? (46 + Math.random() * 20) : (56 + Math.random() * 26),
        hp,
        maxHp: hp,
        radius,
        swayAmp: 22 + Math.random() * 34,
        swayFreq: 1.1 + Math.random() * 0.9,
        wobblePhase: Math.random() * Math.PI * 2,
        hitFlash: 0,
        shootTimer: (initial && slotIdx >= 0) ? (0.75 + slotIdx * 0.24) : (0.55 + Math.random() * 0.7),
        chargeDuration: hp > 1 ? 0.32 : 0.28,
        chargeTimer: 0
      });
    }

    function spawnEnemyBullet(e) {
      if (!gameState || !gameState.active || gameState.won || gameState.gameOver) return;
      const maxEB = (gameW < 520 ? 0 : 6) + Math.min(24, 14 + Math.floor(gameState.score / 2));
      if (gameState.enemyBullets.length >= maxEB) return;

      const p = gameState.player;
      const sx = e.x;
      const sy = e.y + e.radius * 0.65;
      const dx = p.x - sx;
      const dy = (p.y - 6) - sy;
      const baseAng = clamp(Math.atan2(dy, dx), Math.PI * 0.22, Math.PI * 0.78);
      const spd = clamp(gameH * 0.39, 225, 310) * (e.maxHp > 1 ? 1.08 : 1);
      let angles;
      if (e.maxHp > 1) {
        angles = gameState.score >= 10
          ? [baseAng - 0.26, baseAng, baseAng + 0.26]
          : [baseAng - 0.21, baseAng + 0.21];
      } else {
        angles = (gameState.score >= 12 && Math.random() < 0.4)
          ? [baseAng - 0.16, baseAng + 0.16]
          : [baseAng];
      }

      for (const ang of angles) {
        if (gameState.enemyBullets.length >= maxEB) break;
        gameState.enemyBullets.push({
          x: sx,
          y: sy,
          px: sx,
          py: sy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: 5.5,
          life: 0,
          maxLife: 6,
          isHeavy: e.maxHp > 1
        });
      }
      playGameTone(340, 190, 0.06, 'sine', 0.02);
    }

    function spawnBurstSparks(x, y, count = 14) {
      if (!gameState) return;
      const colors = ['#ff4d79', '#ffd166', '#ff85a2', '#38b6ff', '#ffffff'];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 65 + Math.random() * 165;
        gameState.sparks.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 2.2 + Math.random() * 2.8,
          color: colors[i % colors.length],
          heart: i % 3 === 0,
          life: 0,
          maxLife: 0.42 + Math.random() * 0.28
        });
      }
    }

    function addLovePopup(x, y, text = 'I Love You 💖', color = '#ffe5ec', glow = '#ff4d79', maxLife = 0.9) {
      if (!gameState) return;
      const padX = text.length <= 6 ? 60 : 82;
      const padY = text.length <= 6 ? 70 : 96;
      gameState.popups.push({
        x: clamp(x, padX, gameW - padX),
        y: clamp(y - 10, padY, gameH - padY),
        text,
        color,
        glow,
        life: 0,
        maxLife
      });
    }

    function addHurtPopup(x, y) {
      addLovePopup(x, y - 16, '-1 💔', '#ff85a2', '#ff1e56', 0.85);
    }

    function hudHeartSlotPos(idx) {
      const insets = getSafeAreaInsets();
      return { x: 16 + insets.left + 24 + idx * 26, y: 16 + insets.top + 19 };
    }

    function drawHudHeartIcon(ctx, x, y, r, filled, pulseScale = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulseScale, pulseScale);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.25);
      ctx.bezierCurveTo(-r * 0.35, -r * 0.85, -r * 1.05, -r * 0.35, 0, r * 0.88);
      ctx.bezierCurveTo(r * 1.05, -r * 0.35, r * 0.35, -r * 0.85, 0, -r * 0.25);
      ctx.closePath();

      if (filled) {
        const g = ctx.createRadialGradient(-r * 0.28, -r * 0.25, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#ff9ebb');
        g.addColorStop(0.45, '#ff3b6b');
        g.addColorStop(1, '#b80036');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255, 59, 107, 0.7)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 210, 224, 0.75)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.24, Math.max(1, r * 0.14), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 77, 121, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 182, 193, 0.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLifeHud(ctx, p, state, now) {
      const hudAlpha = state.won
        ? (state.girl && state.girl.phase === 'move_center' ? Math.max(0, 1 - state.girl.phaseTimer * 2.5) : 0)
        : 1;
      if (hudAlpha <= 0.01) return;

      const insets = getSafeAreaInsets();
      const pillX = 16 + insets.left;
      const pillY = 16 + insets.top;
      const pillW = 16 + p.maxLives * 26 + 8;
      const pillH = 38;

      ctx.save();
      ctx.globalAlpha = hudAlpha;

      // Top-left Life Hearts Pill
      ctx.fillStyle = 'rgba(18, 8, 30, 0.65)';
      ctx.strokeStyle = p.hurtTimer > 0 ? 'rgba(255, 59, 107, 0.9)' : 'rgba(255, 133, 162, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 19);
      else ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < p.maxLives; i++) {
        const slot = hudHeartSlotPos(i);
        const filled = i < p.lives;
        const pulseScale = (filled && p.lives === 1) ? 1 + 0.14 * Math.sin(now * 0.0094) : 1;
        drawHudHeartIcon(ctx, slot.x, slot.y, 9.2, filled, pulseScale);
      }

      // Top-right Score Pill
      const scoreW = 94;
      const scoreX = gameW - scoreW - 16 - insets.right;
      const scoreY = pillY;
      ctx.fillStyle = 'rgba(18, 8, 30, 0.65)';
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.48)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(scoreX, scoreY, scoreW, pillH, 19);
      else ctx.rect(scoreX, scoreY, scoreW, pillH);
      ctx.fill();
      ctx.stroke();

      ctx.font = "700 14px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffe5ec';
      ctx.fillText(`💖 ${state.score} / ${TARGET_SCORE}`, scoreX + scoreW / 2, scoreY + pillH / 2 + 0.5);

      // Breaking heart shards when a life slot drops
      for (const lh of state.lostHearts) {
        const t = lh.life / lh.maxLife;
        const a = Math.max(0, 1 - t) * hudAlpha;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(lh.x + side * (7 * t + 1.5), lh.y + 18 * t + 12 * t * t);
          ctx.rotate(side * 0.55 * t);
          ctx.fillStyle = '#ff3b6b';
          ctx.beginPath();
          ctx.arc(0, 0, 3.6 * (1 - t * 0.35), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Compact health bar under the boy's feet during active gameplay
      if (!state.won) {
        const barW = 38;
        const barH = 5;
        const bx = p.x - barW / 2;
        const by = p.y + 30;
        const ratio = clamp(p.lives / p.maxLives, 0, 1);

        ctx.fillStyle = 'rgba(15, 8, 28, 0.72)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, barW, barH, 2.5);
        else ctx.rect(bx, by, barW, barH);
        ctx.fill();

        if (ratio > 0) {
          ctx.fillStyle = p.lives <= 1 ? '#ff3b6b' : (p.lives <= 3 ? '#ffd166' : '#38b6ff');
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx, by, barW * ratio, barH, 2.5);
          else ctx.rect(bx, by, barW * ratio, barH);
          ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, barW, barH, 2.5);
        else ctx.rect(bx, by, barW, barH);
        ctx.stroke();

        // Brief auto-fading mobile drag hint pill
        if (!state.gameOver && state.hintTimer > 0) {
          const ha = clamp(state.hintTimer, 0, 1) * 0.88;
          const hintText = '👆 Drag the boy to dodge • Auto-fire ON';
          const hintW = Math.min(280, gameW - 32);
          const hintH = 28;
          const hx = (gameW - hintW) / 2;
          const hy = gameH - Math.max(24, insets.bottom + 14) - hintH / 2;
          ctx.save();
          ctx.globalAlpha = hudAlpha * ha;
          ctx.fillStyle = 'rgba(18, 8, 30, 0.72)';
          ctx.strokeStyle = 'rgba(56, 182, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(hx, hy, hintW, hintH, 14);
          else ctx.rect(hx, hy, hintW, hintH);
          ctx.fill();
          ctx.stroke();

          ctx.font = "600 12px system-ui, -apple-system, 'Segoe UI', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#e0f2fe';
          ctx.fillText(hintText, gameW / 2, hy + hintH / 2 + 0.5);
          ctx.restore();
        }
      }

      ctx.restore();
    }

    function damagePlayer(enemy) {
      if (!gameState || !gameState.active || gameState.won || gameState.gameOver) return;
      const p = gameState.player;
      if (p.invulnTimer > 0) return;

      p.lives = Math.max(0, p.lives - 1);
      p.invulnTimer = 1.4;
      p.hurtTimer = 0.45;
      gameState.damageFlash = 0.35;

      const slot = hudHeartSlotPos(p.lives);
      gameState.lostHearts.push({ x: slot.x, y: slot.y, life: 0, maxLife: 0.65 });

      gameState.shockwaves.push({
        x: p.x, y: p.y - 6, r: 16, maxR: 155, life: 0, maxLife: 0.42, color: '#ff3b6b'
      });
      for (const other of gameState.enemies) {
        const ox = other.x - p.x;
        const oy = other.y - p.y;
        const od = Math.hypot(ox, oy) || 1;
        if (od < 185) {
          other.vx = (ox / od) * 210;
          other.vy = -210;
          other.y -= 32;
        }
      }
      for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        const eb = gameState.enemyBullets[i];
        if (Math.hypot(eb.x - p.x, eb.y - p.y) < 145) {
          spawnBurstSparks(eb.x, eb.y, 3);
          gameState.enemyBullets.splice(i, 1);
        }
      }

      spawnBurstSparks(p.x, p.y - 8, 16);
      addHurtPopup(p.x, p.y - 12);
      playGameTone(260, 95, 0.24, 'sawtooth', 0.06);

      if (p.lives <= 0) {
        gameState.gameOver = true;
        gameState.gameOverTimer = 0;
        gameState.dialogShown = false;
        gameState.tapTarget = null;
        gameState.keys = {};
        clearGameDrag();
        spawnBurstSparks(p.x, p.y - 10, 22);
        playGameTone(320, 110, 0.45, 'triangle', 0.065);
      }
    }

    function triggerGameWin() {
      if (!gameState || gameState.won) return;
      gameState.won = true;
      gameState.tapTarget = null;
      clearGameDrag();
      for (const rem of gameState.enemies) {
        spawnBurstSparks(rem.x, rem.y, 12);
      }
      for (const eb of gameState.enemyBullets) {
        spawnBurstSparks(eb.x, eb.y, 4);
      }
      gameState.enemies.length = 0;
      gameState.enemyBullets.length = 0;
      gameState.bullets.length = 0;
      gameState.popups.length = 0;

      const g = gameState.girl;
      g.phase = 'move_center';
      g.phaseTimer = 0;
      g.vy = 0;
      g.chainShards = [];
      playGameTone(660, 880, 0.16, 'triangle', 0.06);
    }

    function killEnemy(e) {
      if (!gameState) return;
      spawnBurstSparks(e.x, e.y, 15);
      addLovePopup(e.x, e.y);
      playGameTone(580, 980, 0.12, 'triangle', 0.06);
      if (gameState.score < TARGET_SCORE) {
        gameState.score += 1;
        if (gameState.score >= TARGET_SCORE) triggerGameWin();
      }
    }

    function fireAutoBullet() {
      if (!gameState || !gameState.active || gameState.won || gameState.gameOver) return;
      const p = gameState.player;
      p.aimAngle = -Math.PI / 2;
      p.recoil = 5.5;
      p.muzzleFlash = 1;

      const muzzleX = p.x + p.facing * 10;
      const muzzleY = p.y - 34;
      const speed = 760;
      gameState.bullets.push({
        x: muzzleX,
        y: muzzleY,
        px: muzzleX,
        py: muzzleY,
        vx: 0,
        vy: -speed,
        life: 0,
        maxLife: 1.5
      });
      gameState.fireCooldown = 0.22;
      playGameTone(780, 420, 0.045, 'triangle', 0.015);
    }

    function drawPlayerGuy(ctx, p, now, state) {
      const won = !!(state && state.won);
      const isGameOver = !!(state && state.gameOver);
      const isHurt = p.hurtTimer > 0 || isGameOver;
      const girlPhase = state && state.girl ? state.girl.phase : 'chained';
      const isCaught = won && (girlPhase === 'caught' || girlPhase === 'heart_draw');
      const catchBounce = isCaught && state.girl ? state.girl.catchBounce : 0;
      const drawX = isCaught ? p.x - 8 : p.x;
      const drawY = isCaught ? p.y - catchBounce * 0.4 : p.y;

      ctx.save();
      if (p.invulnTimer > 0 && !won && !isGameOver) {
        // Gentle 1.5 Hz opacity wave (stays safely <= 3 flashes/sec per WCAG 2.3.1)
        ctx.globalAlpha = 0.58 + 0.42 * Math.cos(p.invulnTimer * Math.PI * 3);
      }
      ctx.translate(drawX, drawY);

      if (p.invulnTimer > 0 && !won && !isGameOver) {
        ctx.save();
        ctx.strokeStyle = isHurt ? 'rgba(255, 59, 107, 0.55)' : 'rgba(56, 182, 255, 0.48)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -6, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Soft ground glow under the guy (crimson tint when hurt/defeated)
      const shadow = ctx.createRadialGradient(0, 22, 2, 0, 22, 28);
      shadow.addColorStop(0, isHurt ? 'rgba(255, 59, 107, 0.52)' : 'rgba(56, 182, 255, 0.42)');
      shadow.addColorStop(1, isHurt ? 'rgba(255, 59, 107, 0)' : 'rgba(56, 182, 255, 0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(0, 22, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle interactive touch/drag ring beneath the boy
      if (!won && !isGameOver) {
        ctx.save();
        const draggingNow = !!(state && state.dragActive);
        const ringPulse = draggingNow ? 1 : (0.55 + 0.25 * Math.sin(now * 0.005));
        ctx.strokeStyle = draggingNow
          ? 'rgba(56, 182, 255, 0.78)'
          : `rgba(255, 133, 162, ${0.38 * ringPulse + 0.14})`;
        ctx.lineWidth = draggingNow ? 2.2 : 1.5;
        if (!draggingNow) ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.ellipse(0, 12, 28, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const stride = Math.sin(p.walkPhase) * 7;
      const bob = Math.abs(Math.sin(p.walkPhase)) * 1.8;

      // Legs + sneakers
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.moveTo(-5, 6 - bob);
      ctx.lineTo(-6 - stride * 0.6, 20);
      ctx.moveTo(5, 6 - bob);
      ctx.lineTo(6 + stride * 0.6, 20);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(-6 - stride * 0.6, 21, 5.2, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(6 + stride * 0.6, 21, 5.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Torso (blue/cyan male jacket)
      ctx.save();
      ctx.translate(0, -bob);
      const jacketGrad = ctx.createLinearGradient(-10, -10, 10, 9);
      jacketGrad.addColorStop(0, '#38b6ff');
      jacketGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = jacketGrad;
      ctx.shadowColor = '#38b6ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-10, -10, 20, 18, 6);
      else ctx.rect(-10, -10, 20, 18);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Jacket zipper & collar accent
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 7);
      ctx.stroke();

      // Head + guy hair + eyes
      ctx.fillStyle = '#ffd5b8';
      ctx.beginPath();
      ctx.arc(0, -19, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Styled dark messy hair
      ctx.fillStyle = '#171126';
      ctx.beginPath();
      ctx.arc(0, -21.5, 10.2, Math.PI * 0.92, Math.PI * 2.08);
      ctx.lineTo(9, -24);
      ctx.lineTo(4, -29);
      ctx.lineTo(0, -26);
      ctx.lineTo(-5, -30);
      ctx.lineTo(-9.5, -24);
      ctx.closePath();
      ctx.fill();

      // Eyes & expression
      const eyeOffset = isCaught ? 1.8 : (won ? 0 : p.facing * 2.2);
      const eyeY = won && !isCaught ? -20 : -18.5;
      if (isHurt && !won) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-4.1 + eyeOffset, eyeY - 1.4);
        ctx.lineTo(-1.5 + eyeOffset, eyeY);
        ctx.lineTo(-4.1 + eyeOffset, eyeY + 1.4);
        ctx.moveTo(4.5 + eyeOffset, eyeY - 1.4);
        ctx.lineTo(1.9 + eyeOffset, eyeY);
        ctx.lineTo(4.5 + eyeOffset, eyeY + 1.4);
        ctx.stroke();

        ctx.strokeStyle = '#9a4c3b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(eyeOffset * 0.8, -14.2, 2.2, Math.PI + 0.25, Math.PI * 2 - 0.25);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-2.6 + eyeOffset, eyeY, 1.4, 0, Math.PI * 2);
        ctx.arc(3.0 + eyeOffset, eyeY, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#9a4c3b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(eyeOffset * 0.8, won ? -15.8 : -15.3, won ? 3.1 : 2.6, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }

      if (isCaught) {
        // Warm embrace arm reaching around the girl
        ctx.strokeStyle = '#38b6ff';
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.quadraticCurveTo(13, -7, 15, -3);
        ctx.stroke();
        ctx.fillStyle = '#ffd5b8';
        ctx.beginPath();
        ctx.arc(15, -3, 2.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (won) {
        // Open arms raised up ready to catch her
        const reach = Math.sin(now * 0.012) * 1.5;
        ctx.strokeStyle = '#38b6ff';
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(-7, -6);
        ctx.lineTo(-14, -18 + reach);
        ctx.moveTo(7, -6);
        ctx.lineTo(14, -18 + reach);
        ctx.stroke();
        ctx.fillStyle = '#ffd5b8';
        ctx.beginPath();
        ctx.arc(-14, -18 + reach, 2.7, 0, Math.PI * 2);
        ctx.arc(14, -18 + reach, 2.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Shoulder-offset upward blaster arm (clears head while auto-firing up)
        ctx.save();
        ctx.translate(p.facing * 10, -6);
        ctx.rotate(p.aimAngle);
        if (p.facing < 0) ctx.scale(1, -1);
        const kick = p.recoil;

        // Arm holding gun
        ctx.strokeStyle = '#38b6ff';
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(13 - kick * 0.5, 1);
        ctx.stroke();

        // Hand
        ctx.fillStyle = '#ffd5b8';
        ctx.beginPath();
        ctx.arc(14 - kick * 0.5, 1, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Blaster body
        ctx.fillStyle = '#334155';
        ctx.fillRect(12 - kick, -3.5, 15, 5.5);
        ctx.fillStyle = '#ff4d79';
        ctx.fillRect(15 - kick, -2.2, 8, 2.2);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(26 - kick, -2.8, 3, 4);

        // Muzzle flash
        if (p.muzzleFlash > 0) {
          ctx.save();
          ctx.globalAlpha = p.muzzleFlash;
          ctx.fillStyle = '#fff5b8';
          ctx.shadowColor = '#ffd166';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(31 - kick, -0.8, 6 * p.muzzleFlash, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();
    }

    function drawChainLinkLine(ctx, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) return;
      const ang = Math.atan2(dy, dx);
      const step = 9;
      const count = Math.max(2, Math.floor(dist / step));

      ctx.save();
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const lx = x1 + dx * t;
        const ly = y1 + dy * t;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang);
        ctx.strokeStyle = i % 2 === 0 ? '#cbd5e1' : '#94a3b8';
        ctx.lineWidth = i % 2 === 0 ? 2.4 : 1.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.2, i % 2 === 0 ? 3.1 : 2.1, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawCaptiveGirl(ctx, g, p, now) {
      const isChained = g.phase === 'chained' || g.phase === 'move_center';
      const isUnchaining = g.phase === 'unchaining';
      const isFalling = g.phase === 'falling';
      const isCaught = g.phase === 'caught' || g.phase === 'heart_draw';

      const sway = isChained ? Math.sin(now * 0.0045) * 2.4 : 0;
      const bob = isChained ? Math.sin(now * 0.007) * 1.6 : 0;
      const gx = (isCaught ? p.x + 8 : g.x) + sway;
      const gy = (isCaught ? g.y - g.catchBounce : g.y) + bob;

      // Ceiling chains / recoiling chain stubs
      if (isChained) {
        drawChainLinkLine(ctx, g.anchorX - 34, -2, gx - 14, gy - 27);
        drawChainLinkLine(ctx, g.anchorX + 34, -2, gx + 14, gy - 27);
      } else if (isUnchaining) {
        const retract = clamp(1 - g.phaseTimer / 0.42, 0, 1);
        if (retract > 0.05) {
          drawChainLinkLine(
            ctx,
            g.anchorX - 34,
            -2,
            g.anchorX - 34 + (gx - 14 - (g.anchorX - 34)) * retract,
            (gy - 27) * retract
          );
          drawChainLinkLine(
            ctx,
            g.anchorX + 34,
            -2,
            g.anchorX + 34 + (gx + 14 - (g.anchorX + 34)) * retract,
            (gy - 27) * retract
          );
        }
        // Bright snap rings at both wrists as the chains break off
        if (g.phaseTimer < 0.35) {
          const st = g.phaseTimer / 0.35;
          ctx.save();
          ctx.globalAlpha = 1 - st;
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2.6;
          [-14, 14].forEach((wx) => {
            ctx.beginPath();
            ctx.arc(gx + wx, gy - 27, 6 + st * 18, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
        }
      }

      // Flying broken chain shards
      for (const sh of g.chainShards) {
        const alpha = Math.max(0, 1 - sh.life / sh.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.2, 2.9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(gx, gy);

      // Soft pink glow behind the girl
      const aura = ctx.createRadialGradient(0, -6, 4, 0, -6, 36);
      aura.addColorStop(0, 'rgba(255, 77, 166, 0.38)');
      aura.addColorStop(1, 'rgba(255, 77, 166, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, -6, 36, 0, Math.PI * 2);
      ctx.fill();

      // Legs + pink shoes
      const legKick = isChained ? Math.sin(now * 0.008) * 1.4 : (isFalling ? Math.sin(now * 0.018) * 2.8 : 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffd5b8';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(-4, 7);
      ctx.lineTo(-4.5 - legKick * 0.4, 18);
      ctx.moveTo(4, 7);
      ctx.lineTo(4.5 + legKick * 0.4, 18);
      ctx.stroke();

      ctx.fillStyle = '#ff4da6';
      ctx.beginPath();
      ctx.ellipse(-4.5 - legKick * 0.4, 19.5, 4.3, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(4.5 + legKick * 0.4, 19.5, 4.3, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pink flared dress
      const flutter = isFalling ? Math.sin(now * 0.024) * 2.2 : 0;
      const dressGrad = ctx.createLinearGradient(0, -10, 0, 10);
      dressGrad.addColorStop(0, '#ff69b4');
      dressGrad.addColorStop(1, '#db2777');
      ctx.fillStyle = dressGrad;
      ctx.shadowColor = '#ff4da6';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-6.5, -10);
      ctx.lineTo(6.5, -10);
      ctx.lineTo(12 + flutter, 9);
      ctx.quadraticCurveTo(0, 11.5, -12 - flutter, 9);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Dress hem & waist ribbon accent
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10.5 - flutter * 0.8, 7.5);
      ctx.quadraticCurveTo(0, 9.8, 10.5 + flutter * 0.8, 7.5);
      ctx.stroke();

      // Arms (raised in cuffs while chained, free when unchaining/falling, hugging when caught)
      let lx = -14, ly = -27, rx = 14, ry = -27;
      if (isUnchaining) {
        const drop = clamp(g.phaseTimer / 0.55, 0, 1);
        lx = -14 - drop * 2;
        ly = -27 + drop * 15;
        rx = 14 + drop * 2;
        ry = -27 + drop * 15;
      } else if (isFalling) {
        const wave = Math.sin(now * 0.02) * 3;
        lx = -14; ly = 2 + wave;
        rx = 14; ry = 2 - wave;
      } else if (isCaught) {
        lx = -13; ly = -4;
        rx = 10; ry = -1;
      }

      ctx.strokeStyle = '#ffd5b8';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.lineTo(lx, ly);
      ctx.moveTo(6, -7);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      ctx.fillStyle = '#ffd5b8';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Metal cuffs on both wrists only while chained
      if (isChained) {
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        [[lx, ly], [rx, ry]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      // Ponytail flowing behind head
      const tailWave = isFalling ? -5 : Math.sin(now * 0.008) * 1.6;
      ctx.strokeStyle = '#1f122b';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(6, -24);
      ctx.quadraticCurveTo(15, -24 + tailWave, 14, -12 + tailWave);
      ctx.stroke();

      // Pink hair bow
      ctx.fillStyle = '#ff4da6';
      ctx.beginPath();
      ctx.ellipse(6.5, -25.5, 3.6, 2.1, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Head + bangs + face
      ctx.fillStyle = '#ffd5b8';
      ctx.beginPath();
      ctx.arc(0, -19, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1f122b';
      ctx.beginPath();
      ctx.arc(0, -21, 9.6, Math.PI * 0.92, Math.PI * 2.08);
      ctx.quadraticCurveTo(0, -22, -9.2, -19);
      ctx.closePath();
      ctx.fill();

      // Eyes & expression
      const faceShift = isCaught ? -1.5 : 0;
      ctx.fillStyle = '#0f172a';
      if (isCaught) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2.6 + faceShift, -18.5, 1.8, Math.PI, Math.PI * 2);
        ctx.arc(2.6 + faceShift, -18.5, 1.8, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(-2.6, -18.5, 1.4, 0, Math.PI * 2);
        ctx.arc(2.6, -18.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rosy cheeks
      ctx.fillStyle = 'rgba(255, 77, 136, 0.42)';
      ctx.beginPath();
      ctx.arc(-4.8 + faceShift, -16.2, 1.8, 0, Math.PI * 2);
      ctx.arc(4.8 + faceShift, -16.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Mouth (worried oval when chained, big smile once freed/caught)
      ctx.strokeStyle = '#9a4c3b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (isChained) {
        ctx.arc(0, -14.2, 1.5, 0, Math.PI * 2);
      } else {
        ctx.arc(faceShift, -15.6, 2.6, 0.15, Math.PI - 0.15);
      }
      ctx.stroke();

      ctx.restore();

      // Glowing heart above the embracing couple (fades into the full surrounding heart once heart_draw starts)
      if (g.phase === 'caught') {
        const pulse = 8 + Math.sin(now * 0.01) * 1.4;
        drawMiniHeart(ctx, p.x, gy - 44, pulse, '#ff4da6', 1);
      }
    }

    function drawEnemy(ctx, e, now) {
      const bob = Math.sin(now * 0.006 + e.wobblePhase) * 3;
      const r = e.radius;
      ctx.save();
      ctx.translate(e.x, e.y + bob);

      // Menacing crimson shadow aura (responsive for mobile smoothness)
      if (window.innerWidth >= 768) {
        ctx.shadowColor = e.hitFlash > 0 ? '#ffffff' : '#ff2a66';
        ctx.shadowBlur = e.hitFlash > 0 ? 18 : 14;
      } else if (e.hitFlash > 0) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
      }

      // Horns
      ctx.fillStyle = e.hitFlash > 0 ? '#ffe5ec' : '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, -r * 0.45);
      ctx.lineTo(-r * 0.95, -r * 1.15);
      ctx.lineTo(-r * 0.25, -r * 0.72);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(r * 0.65, -r * 0.45);
      ctx.lineTo(r * 0.95, -r * 1.15);
      ctx.lineTo(r * 0.25, -r * 0.72);
      ctx.closePath();
      ctx.fill();

      // Main body
      const bodyGrad = ctx.createRadialGradient(0, -3, 2, 0, 0, r);
      if (e.hitFlash > 0) {
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(1, '#ff85a2');
      } else if (e.maxHp > 1) {
        bodyGrad.addColorStop(0, '#a855f7');
        bodyGrad.addColorStop(1, '#4c0519');
      } else {
        bodyGrad.addColorStop(0, '#ef4444');
        bodyGrad.addColorStop(1, '#450a0a');
      }
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Angry glowing eyes
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.25);
      ctx.lineTo(-r * 0.12, -r * 0.05);
      ctx.lineTo(-r * 0.46, r * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.25);
      ctx.lineTo(r * 0.12, -r * 0.05);
      ctx.lineTo(r * 0.46, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // Jagged mouth
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.36);
      ctx.lineTo(-r * 0.15, r * 0.26);
      ctx.lineTo(0, r * 0.38);
      ctx.lineTo(r * 0.15, r * 0.26);
      ctx.lineTo(r * 0.35, r * 0.36);
      ctx.stroke();

      // Small HP indicator for 2-HP enemies
      if (e.maxHp > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-12, -r - 9, 24, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-12, -r - 9, 24 * (e.hp / e.maxHp), 4);
      }

      // Glowing charge telegraph orb right before firing downward
      if (e.chargeTimer > 0 && e.chargeDuration > 0) {
        const ct = clamp(e.chargeTimer / e.chargeDuration, 0, 1);
        const orbR = 2 + ct * 5.5;
        ctx.save();
        ctx.shadowColor = '#ff2a66';
        ctx.shadowBlur = 12 + ct * 8;
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.arc(0, r * 0.82, orbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    function drawLovePopup(ctx, pop) {
      const t = pop.life / pop.maxLife;
      const popIn = t < 0.2 ? 0.5 + 0.65 * (1 - Math.pow(1 - t / 0.2, 3)) : 1.15 - (t - 0.2) * 0.2;
      const alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
      const yOffset = -t * 38;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pop.x, pop.y + yOffset);
      ctx.scale(popIn, popIn);
      ctx.font = "700 22px 'Dancing Script', cursive, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20, 4, 24, 0.85)';
      ctx.strokeText(pop.text, 0, 0);
      if (window.innerWidth >= 768) {
        ctx.shadowColor = pop.glow || '#ff4d79';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = pop.color || '#ffe5ec';
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }

    function drawSpaceship(ctx, x, y, tilt, now, invulnTimer = 0, hurtTimer = 0, scale = 1, thrustBoost = 1) {
      if (invulnTimer > 0 && Math.floor(now * 0.018) % 2 === 0 && hurtTimer <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.scale(scale, scale);

      // Invulnerability protective shield aura
      if (invulnTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28 + 0.14 * Math.sin(now * 0.02);
        ctx.strokeStyle = hurtTimer > 0 ? '#ff4d79' : '#70d6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 2, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Animated twin plasma thrusters
      const flicker = 0.8 + 0.25 * Math.sin(now * 0.045) + Math.random() * 0.18;
      const flameLen = (15 + 7 * flicker) * thrustBoost;
      for (const sx of [-9, 9]) {
        const flameGrad = ctx.createLinearGradient(sx, 14, sx, 14 + flameLen);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.35, '#70d6ff');
        flameGrad.addColorStop(0.75, '#ff4da6');
        flameGrad.addColorStop(1, 'rgba(255, 77, 166, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(sx - 3.6, 14);
        ctx.lineTo(sx, 14 + flameLen);
        ctx.lineTo(sx + 3.6, 14);
        ctx.closePath();
        ctx.fill();
      }

      // Swept-back starfighter wings
      if (window.innerWidth >= 768) {
        ctx.shadowColor = hurtTimer > 0 ? '#ff3b6b' : '#70d6ff';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = hurtTimer > 0 ? '#ffd6e0' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(10, -4);
      ctx.lineTo(25, 13);
      ctx.lineTo(22, 18);
      ctx.lineTo(9, 13);
      ctx.lineTo(6, 17);
      ctx.lineTo(-6, 17);
      ctx.lineTo(-9, 13);
      ctx.lineTo(-22, 18);
      ctx.lineTo(-25, 13);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pink neon wing trim
      ctx.strokeStyle = '#ff4da6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(-23, 13);
      ctx.moveTo(10, -2);
      ctx.lineTo(23, 13);
      ctx.stroke();

      // Wingtip cyan lights
      ctx.fillStyle = '#70d6ff';
      for (const wx of [-23, 23]) {
        ctx.beginPath();
        ctx.arc(wx, 14, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central fuselage body
      const hullGrad = ctx.createLinearGradient(-8, -22, 8, 16);
      hullGrad.addColorStop(0, '#ffffff');
      hullGrad.addColorStop(0.6, '#e2e8f0');
      hullGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.quadraticCurveTo(9, -8, 8, 15);
      ctx.lineTo(-8, 15);
      ctx.quadraticCurveTo(-9, -8, 0, -26);
      ctx.closePath();
      ctx.fill();

      // Glossy cockpit canopy with tiny glowing couple orb inside
      const canopyGrad = ctx.createLinearGradient(0, -14, 0, 4);
      canopyGrad.addColorStop(0, '#bae6fd');
      canopyGrad.addColorStop(0.5, '#38bdf8');
      canopyGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = canopyGrad;
      ctx.beginPath();
      ctx.ellipse(0, -5, 4.8, 9.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tiny blue & pink glow inside cockpit
      ctx.fillStyle = '#38b6ff';
      ctx.beginPath();
      ctx.arc(-1.4, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff69b4';
      ctx.beginPath();
      ctx.arc(1.5, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Canopy specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -8.5, 1.3, 3.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function initSpaceStars(count = 70) {
      const stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * gameW,
          y: Math.random() * gameH,
          len: 8 + Math.random() * 22,
          speed: 220 + Math.random() * 340,
          alpha: 0.25 + Math.random() * 0.65,
          color: i % 5 === 0 ? '#ff9ebb' : (i % 3 === 0 ? '#bae6fd' : '#ffffff')
        });
      }
      return stars;
    }

    function spawnAsteroid(progress = 0) {
      if (!gameState) return;
      const r = 19 + Math.random() * 19;
      const x = r + Math.random() * Math.max(40, gameW - r * 2);
      const y = -r - 18 - Math.random() * 36;
      const speedBoost = 1 + progress * 0.36;
      const vy = (125 + Math.random() * 110) * speedBoost;
      const vx = (Math.random() - 0.5) * 85;
      const numVerts = 8 + Math.floor(Math.random() * 4);
      const verts = [];
      for (let i = 0; i < numVerts; i++) {
        const ang = (i / numVerts) * Math.PI * 2;
        const rad = r * (0.76 + Math.random() * 0.32);
        verts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
      }
      const craters = [];
      const craterCount = r > 24 ? 3 : 2;
      for (let c = 0; c < craterCount; c++) {
        const ca = Math.random() * Math.PI * 2;
        const cd = r * (0.18 + Math.random() * 0.34);
        craters.push({
          x: Math.cos(ca) * cd,
          y: Math.sin(ca) * cd,
          r: r * (0.14 + Math.random() * 0.12)
        });
      }
      gameState.asteroids.push({
        x, y, vx, vy, r,
        hp: 5,
        maxHp: 5,
        hitFlash: 0,
        shootTimer: 0.75 + Math.random() * 1.45,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 3.0,
        verts,
        craters,
        tint: Math.random() < 0.35 ? 'warm' : 'cool'
      });
    }

    function drawAsteroid(ctx, ast) {
      ctx.save();
      ctx.translate(ast.x, ast.y);

      ctx.save();
      ctx.rotate(ast.rot);
      const grad = ctx.createRadialGradient(-ast.r * 0.3, -ast.r * 0.3, ast.r * 0.1, 0, 0, ast.r * 1.15);
      if (ast.hitFlash > 0) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, '#ffb3c6');
        grad.addColorStop(1, '#ff4d79');
      } else if (ast.tint === 'warm') {
        grad.addColorStop(0, '#9c7a7e');
        grad.addColorStop(0.55, '#594149');
        grad.addColorStop(1, '#2a1c24');
      } else {
        grad.addColorStop(0, '#94a3b8');
        grad.addColorStop(0.55, '#475569');
        grad.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = grad;
      ctx.strokeStyle = ast.hitFlash > 0
        ? '#ffffff'
        : (ast.tint === 'warm' ? 'rgba(255, 165, 185, 0.55)' : 'rgba(186, 230, 253, 0.55)');
      ctx.lineWidth = ast.hitFlash > 0 ? 2.2 : 1.6;
      ctx.beginPath();
      ast.verts.forEach((v, idx) => {
        if (idx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Surface craters
      ctx.fillStyle = 'rgba(15, 10, 24, 0.42)';
      for (const cr of ast.craters) {
        ctx.beginPath();
        ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5-hit segmented HP bar when damaged
      if (ast.hp < ast.maxHp) {
        const barW = Math.max(26, ast.r * 1.35);
        const barH = 4;
        const bx = -barW / 2;
        const by = -ast.r - 10;
        ctx.fillStyle = 'rgba(12, 6, 20, 0.78)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        const segW = (barW - (ast.maxHp - 1) * 1.5) / ast.maxHp;
        for (let s = 0; s < ast.maxHp; s++) {
          ctx.fillStyle = s < ast.hp ? '#ff7597' : 'rgba(255, 255, 255, 0.16)';
          ctx.fillRect(bx + s * (segW + 1.5), by, segW, barH);
        }
      }

      ctx.restore();
    }

    function drawAsteroidShot(ctx, shot) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(shot.rot);
      if (window.innerWidth >= 768) {
        ctx.shadowColor = '#ff7b54';
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = '#5c3c36';
      ctx.strokeStyle = '#ff9a62';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = shot.r * (i % 2 === 0 ? 1.08 : 0.78);
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function damageSpaceship(p) {
      p.lives = Math.max(0, p.lives - 1);
      p.invulnTimer = 1.25;
      p.hurtTimer = 0.45;
      gameState.damageFlash = 0.35;
      const slot = hudHeartSlotPos(p.lives);
      gameState.lostHearts.push({ x: slot.x, y: slot.y, life: 0, maxLife: 0.4 });
      gameState.shockwaves.push({ x: p.x, y: p.y, r: 10, maxR: 72, life: 0, maxLife: 0.35, color: '#ff3b6b' });
      spawnBurstSparks(p.x, p.y, 14);
      gameState.popups.push({ x: p.x, y: p.y - 34, text: '-1 💔', color: '#ff6b8b', glow: '#ff2a66', life: 0, maxLife: 0.75 });
      playGameTone(220, 95, 0.24, 'sawtooth', 0.06);
      if (p.lives <= 0) {
        gameState.gameOver = true;
        gameState.gameOverTimer = 0;
        gameState.dialogShown = false;
        clearGameDrag();
        playGameTone(300, 110, 0.45, 'sawtooth', 0.07);
      }
    }

    function drawSpaceshipHud(ctx, p, state, now) {
      const insets = getSafeAreaInsets();
      const pillX = 16 + insets.left;
      const pillY = 16 + insets.top;
      const pillW = 16 + p.maxLives * 26 + 8;
      const pillH = 38;

      ctx.save();

      // Top-left Life Hearts Pill
      ctx.fillStyle = 'rgba(18, 8, 30, 0.65)';
      ctx.strokeStyle = p.hurtTimer > 0 ? 'rgba(255, 59, 107, 0.9)' : 'rgba(112, 214, 255, 0.52)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 19);
      else ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < p.maxLives; i++) {
        const slot = hudHeartSlotPos(i);
        const filled = i < p.lives;
        const pulseScale = (filled && p.lives === 1) ? 1 + 0.14 * Math.sin(now * 0.0094) : 1;
        drawHudHeartIcon(ctx, slot.x, slot.y, 9.2, filled, pulseScale);
      }

      // Top-right 30s Countdown Pill
      const rem = Math.max(0, Math.ceil(SPACESHIP_DURATION - state.spaceTimer));
      const timerW = 114;
      const timerX = gameW - timerW - 16 - insets.right;
      const timerY = pillY;
      ctx.fillStyle = 'rgba(18, 8, 30, 0.65)';
      ctx.strokeStyle = rem <= 5 ? 'rgba(255, 209, 102, 0.85)' : 'rgba(112, 214, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(timerX, timerY, timerW, pillH, 19);
      else ctx.rect(timerX, timerY, timerW, pillH);
      ctx.fill();
      ctx.stroke();

      ctx.font = "700 14px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rem <= 5 ? '#ffd166' : '#e0f2fe';
      ctx.fillText(`🚀 ${rem}s`, timerX + timerW / 2, timerY + pillH / 2);

      // Intro prompt banner during spaceship arrival
      if (state.phase === 'spaceship_intro' || state.spaceTimer < 2.2) {
        const alpha = state.phase === 'spaceship_intro'
          ? clamp(state.spaceIntroTimer / 0.35, 0, 1)
          : clamp(1 - (state.spaceTimer - 1.2) / 1.0, 0, 1);
        if (alpha > 0.02) {
          ctx.globalAlpha = alpha;
          ctx.font = "700 clamp(16px, 4vw, 22px) system-ui, -apple-system, 'Segoe UI', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#70d6ff';
          ctx.shadowBlur = 12;
          ctx.fillText('Dodge the Asteroids for 30s!', gameW / 2, pillY + pillH + 34);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
    }

    function startSpaceshipStage(fromX, fromY, heartFrame = null) {
      if (!gameState) return;
      gameWinBanner.classList.remove('show');
      gameState.phase = 'spaceship_intro';
      gameState.won = false;
      gameState.gameOver = false;
      gameState.gameOverTimer = 0;
      gameState.dialogShown = false;
      gameState.spaceIntroTimer = 0;
      gameState.spaceTimer = 0;
      gameState.spaceWarpTimer = 0;
      gameState.asteroidSpawnTimer = 0.25;
      gameState.shipFireCooldown = 0.15;
      gameState.asteroids = [];
      gameState.shipBullets = [];
      gameState.asteroidShots = [];
      gameState.bullets = [];
      gameState.enemyBullets = [];
      gameState.enemies = [];
      gameState.spaceStars = initSpaceStars(75);
      gameState.heartBurstParticles = [];
      gameState.tapTarget = null;
      clearGameDrag();

      const p = gameState.player;
      p.x = clamp(fromX, 34, gameW - 34);
      p.y = clamp(fromY, gameH * 0.4, gameH - 72);
      p.targetShipY = p.y;
      p.fromHeartBurst = Boolean(heartFrame);
      p.shipEntryY = heartFrame ? p.y : gameH + 64;
      p.tilt = 0;
      p.lives = MAX_PLAYER_LIVES;
      p.maxLives = MAX_PLAYER_LIVES;
      p.invulnTimer = 1.6;
      p.hurtTimer = 0;
      p.speed = Math.min(410, Math.max(270, gameW * 0.65));

      if (heartFrame) {
        const burstColors = ['#ff4d79', '#ff85a2', '#ffd166', '#ffffff', '#70d6ff'];
        for (let i = 0; i < 110; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const prog = Math.random();
          const pt = getHeartPointAt(prog, side, heartFrame.cx, heartFrame.cy, heartFrame.scale);
          const ang = Math.atan2(pt.y - p.y, pt.x - p.x) + (Math.random() - 0.5) * 0.6;
          const spd = 95 + Math.random() * 190;
          gameState.heartBurstParticles.push({
            x: pt.x + (Math.random() - 0.5) * 8,
            y: pt.y + (Math.random() - 0.5) * 8,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 1.5 + Math.random() * 2.2,
            color: burstColors[i % burstColors.length],
            alpha: 0.75 + Math.random() * 0.25
          });
        }
      }

      playGameTone(440, 880, 0.35, 'triangle', 0.06);
    }

    function retrySpaceshipStage() {
      forceCloseGameOverDialog();
      cancelAnimationFrame(gameRaf);
      if (!gameState) {
        startShooterGame();
        return;
      }
      gameState.active = true;
      gameState.lastTime = performance.now();
      startSpaceshipStage(gameW / 2, getDefaultPlayerY());
      gameRaf = requestAnimationFrame(animateGame);
    }

    function animateGame(now) {
      if (!gameState || !gameState.active) return;
      const dt = Math.min(0.05, (now - gameState.lastTime) / 1000);
      gameState.lastTime = now;

      gameCtx.clearRect(0, 0, gameW, gameH);

      const p = gameState.player;
      p.recoil = Math.max(0, p.recoil - dt * 36);
      p.muzzleFlash = Math.max(0, p.muzzleFlash - dt * 11);
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      p.hurtTimer = Math.max(0, p.hurtTimer - dt);
      gameState.fireCooldown = Math.max(0, gameState.fireCooldown - dt);
      gameState.damageFlash = Math.max(0, gameState.damageFlash - dt);

      for (let i = gameState.lostHearts.length - 1; i >= 0; i--) {
        gameState.lostHearts[i].life += dt;
        if (gameState.lostHearts[i].life >= gameState.lostHearts[i].maxLife) {
          gameState.lostHearts.splice(i, 1);
        }
      }

      // ===== PHASE 2: SPACESHIP ASTEROID DODGE (30 SECONDS) =====
      if (gameState.phase === 'spaceship_intro' || gameState.phase === 'spaceship' || gameState.phase === 'spaceship_warp') {
        const isWarp = gameState.phase === 'spaceship_warp';
        const isIntro = gameState.phase === 'spaceship_intro';
        const starMult = isWarp ? 3.2 : 1.0;

        // Draw high-speed space starfield streaks
        for (let i = 0; i < gameState.spaceStars.length; i++) {
          const st = gameState.spaceStars[i];
          st.y += st.speed * starMult * dt;
          if (st.y > gameH + 30) {
            st.y = -30;
            st.x = Math.random() * gameW;
          }
          gameCtx.save();
          gameCtx.globalAlpha = st.alpha;
          gameCtx.strokeStyle = st.color;
          gameCtx.lineWidth = isWarp ? 2.2 : 1.3;
          gameCtx.beginPath();
          gameCtx.moveTo(st.x, st.y);
          gameCtx.lineTo(st.x, st.y - st.len * (isWarp ? 2.4 : 1));
          gameCtx.stroke();
          gameCtx.restore();
        }

        const prevX = p.x;

        if (gameState.gameOver) {
          gameState.gameOverTimer += dt;
          if (gameState.gameOverTimer >= 0.45 && !gameState.dialogShown) {
            gameState.dialogShown = true;
            if (gameOverDialog && !gameOverDialog.open) gameOverDialog.showModal();
          }
        } else if (isIntro) {
          gameState.spaceIntroTimer += dt;
          if (p.fromHeartBurst) {
            const t = gameState.spaceIntroTimer;
            const introDur = 1.45;
            const pullStart = 0.34;
            const pullStrength = t > pullStart ? clamp((t - pullStart) / (introDur - pullStart), 0, 1) : 0;
            for (let i = gameState.heartBurstParticles.length - 1; i >= 0; i--) {
              const bp = gameState.heartBurstParticles[i];
              if (t <= pullStart) {
                bp.x += bp.vx * dt;
                bp.y += bp.vy * dt;
                bp.vx *= 0.92;
                bp.vy *= 0.92;
              } else {
                const dx = p.x - bp.x;
                const dy = p.y - bp.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 10) {
                  gameState.heartBurstParticles.splice(i, 1);
                  continue;
                }
                const pullSpeed = 240 + pullStrength * 920;
                const nx = dx / dist;
                const ny = dy / dist;
                // Slight swirl into the spaceship
                bp.vx = lerp(bp.vx, (nx - ny * 0.35 * (1 - pullStrength)) * pullSpeed, Math.min(1, dt * 10));
                bp.vy = lerp(bp.vy, (ny + nx * 0.35 * (1 - pullStrength)) * pullSpeed, Math.min(1, dt * 10));
                bp.x += bp.vx * dt;
                bp.y += bp.vy * dt;
              }
              gameCtx.save();
              gameCtx.globalAlpha = bp.alpha;
              gameCtx.fillStyle = bp.color;
              gameCtx.beginPath();
              gameCtx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
              gameCtx.fill();
              gameCtx.restore();
            }
            p.y = p.targetShipY;
            p.tilt = 0;
            if (t >= introDur) {
              gameState.heartBurstParticles = [];
              gameState.phase = 'spaceship';
            }
          } else {
            const u = easeInOut(clamp(gameState.spaceIntroTimer / 1.0, 0, 1));
            p.y = lerp(p.shipEntryY, p.targetShipY, u);
            p.tilt = 0;
            if (gameState.spaceIntroTimer >= 1.05) {
              gameState.phase = 'spaceship';
              p.y = p.targetShipY;
            }
          }
        } else if (isWarp) {
          gameState.spaceWarpTimer += dt;
          p.tilt *= 0.88;
          if (gameState.spaceWarpTimer >= 0.45) {
            cancelAnimationFrame(gameRaf);
            gameState.active = false;
            const doneCb = gameState.onSpaceshipComplete;
            gameState.onSpaceshipComplete = null;
            if (window.ldOrientation) window.ldOrientation.exit();
            gameOverlay.style.display = 'none';
            if (typeof doneCb === 'function') {
              doneCb();
            } else {
              startGalaxyTransition({ fromSpaceship: true, x: p.x, y: p.y, tilt: p.tilt || 0 });
            }
            return;
          }
        } else {
          // Active 30s asteroid dodge
          gameState.spaceTimer += dt;
          const spaceProgress = clamp(gameState.spaceTimer / SPACESHIP_DURATION, 0, 1);

          // Keyboard & tap movement
          let moveX = 0;
          let moveY = 0;
          if (gameState.keys.ArrowLeft || gameState.keys.KeyA) moveX -= 1;
          if (gameState.keys.ArrowRight || gameState.keys.KeyD) moveX += 1;
          if (gameState.keys.ArrowUp || gameState.keys.KeyW) moveY -= 1;
          if (gameState.keys.ArrowDown || gameState.keys.KeyS) moveY += 1;

          if (moveX !== 0 || moveY !== 0) {
            const invLen = (moveX !== 0 && moveY !== 0) ? Math.SQRT1_2 : 1;
            const clamped = clampPlayerPos(
              p.x + moveX * invLen * p.speed * dt,
              p.y + moveY * invLen * p.speed * dt
            );
            p.x = clamped.x;
            p.y = clamped.y;
            gameState.tapTarget = null;
            gameState.hasMoved = true;
          } else if (!gameState.dragActive && gameState.tapTarget) {
            const clampedTarget = clampPlayerPos(gameState.tapTarget.x, gameState.tapTarget.y);
            const dx = clampedTarget.x - p.x;
            const dy = clampedTarget.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6) {
              const step = Math.min(dist, p.speed * 1.2 * dt);
              const nextPos = clampPlayerPos(p.x + (dx / dist) * step, p.y + (dy / dist) * step);
              p.x = nextPos.x;
              p.y = nextPos.y;
            } else {
              p.x = clampedTarget.x;
              p.y = clampedTarget.y;
              gameState.tapTarget = null;
            }
          }

          // Auto-fire single plasma laser bolt from the spaceship
          gameState.shipFireCooldown = Math.max(0, (gameState.shipFireCooldown || 0) - dt);
          if (gameState.shipFireCooldown <= 0) {
            gameState.shipFireCooldown = 0.145;
            gameState.shipBullets.push({
              x: p.x,
              y: p.y - 24,
              vx: 0,
              vy: -780
            });
          }

          // Spawn asteroids smoothly over 30 seconds
          gameState.asteroidSpawnTimer -= dt;
          const maxAst = gameW < 520 ? 12 : 17;
          if (gameState.asteroidSpawnTimer <= 0 && gameState.asteroids.length < maxAst) {
            spawnAsteroid(spaceProgress);
            if (Math.random() < 0.35 + spaceProgress * 0.35 && gameState.asteroids.length < maxAst - 1) {
              spawnAsteroid(spaceProgress);
            }
            gameState.asteroidSpawnTimer = Math.max(0.28, 0.54 - spaceProgress * 0.22) + Math.random() * 0.15;
          }

          // Check 30s survival completion
          if (gameState.spaceTimer >= SPACESHIP_DURATION) {
            gameState.phase = 'spaceship_warp';
            gameState.spaceWarpTimer = 0;
            clearGameDrag();
            gameState.shockwaves.push({ x: p.x, y: p.y, r: 12, maxR: 150, life: 0, maxLife: 0.55, color: '#70d6ff' });
            for (const ast of gameState.asteroids) {
              spawnBurstSparks(ast.x, ast.y, 6);
            }
            gameState.asteroids = [];
            gameState.shipBullets = [];
            gameState.asteroidShots = [];
            playGameTone(523, 1318, 0.45, 'triangle', 0.08);
          }
        }

        // Smooth banking tilt based on horizontal speed
        const vxShip = (p.x - prevX) / Math.max(0.001, dt);
        const targetTilt = clamp(vxShip * 0.0012, -0.34, 0.34);
        p.tilt = lerp(p.tilt || 0, targetTilt, Math.min(1, dt * 12));

        // Update & draw spaceship laser bolts + hit asteroids (5 hits to explode)
        for (let i = gameState.shipBullets.length - 1; i >= 0; i--) {
          const b = gameState.shipBullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.y < -20) {
            gameState.shipBullets.splice(i, 1);
            continue;
          }
          let hit = false;
          for (let j = gameState.asteroids.length - 1; j >= 0; j--) {
            const ast = gameState.asteroids[j];
            if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.r * 0.94 + 5) {
              hit = true;
              ast.hp -= 1;
              ast.hitFlash = 0.14;
              spawnBurstSparks(b.x, b.y, 4);
              if (ast.hp <= 0) {
                gameState.asteroids.splice(j, 1);
                gameState.shockwaves.push({ x: ast.x, y: ast.y, r: ast.r * 0.4, maxR: ast.r * 2.1, life: 0, maxLife: 0.38, color: '#ff9a62' });
                spawnBurstSparks(ast.x, ast.y, 16);
                playGameTone(190, 75, 0.18, 'sawtooth', 0.045);
              } else {
                playGameTone(520, 320, 0.06, 'triangle', 0.025);
              }
              break;
            }
          }
          if (hit) {
            gameState.shipBullets.splice(i, 1);
            continue;
          }
          gameCtx.save();
          if (window.innerWidth >= 768) {
            gameCtx.shadowColor = '#70d6ff';
            gameCtx.shadowBlur = 10;
          }
          const lg = gameCtx.createLinearGradient(b.x, b.y - 10, b.x, b.y + 6);
          lg.addColorStop(0, '#ffffff');
          lg.addColorStop(0.5, '#70d6ff');
          lg.addColorStop(1, '#ff4da6');
          gameCtx.strokeStyle = lg;
          gameCtx.lineWidth = 3;
          gameCtx.lineCap = 'round';
          gameCtx.beginPath();
          gameCtx.moveTo(b.x, b.y - 9);
          gameCtx.lineTo(b.x, b.y + 5);
          gameCtx.stroke();
          gameCtx.restore();
        }

        // Update & draw asteroids + asteroid shooting + collision with spaceship
        const spaceProgressNow = clamp(gameState.spaceTimer / SPACESHIP_DURATION, 0, 1);
        for (let i = gameState.asteroids.length - 1; i >= 0; i--) {
          const ast = gameState.asteroids[i];
          ast.x += ast.vx * dt;
          ast.y += ast.vy * dt;
          ast.rot += ast.vRot * dt;
          ast.hitFlash = Math.max(0, (ast.hitFlash || 0) - dt);

          if (!gameState.gameOver && !isIntro && !isWarp && ast.y > 16 && ast.y < gameH * 0.72) {
            ast.shootTimer -= dt;
            if (ast.shootTimer <= 0) {
              ast.shootTimer = Math.max(1.15, 2.2 - spaceProgressNow * 0.75) + Math.random() * 0.9;
              const ang = Math.atan2(p.y - ast.y, p.x - ast.x);
              const shotSpd = 235 + spaceProgressNow * 95;
              gameState.asteroidShots.push({
                x: ast.x,
                y: ast.y,
                vx: Math.cos(ang) * shotSpd,
                vy: Math.sin(ang) * shotSpd,
                r: 6 + Math.random() * 1.8,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 8
              });
            }
          }

          if (ast.y > gameH + ast.r + 40 || ast.x < -ast.r - 60 || ast.x > gameW + ast.r + 60) {
            gameState.asteroids.splice(i, 1);
            continue;
          }

          drawAsteroid(gameCtx, ast);

          if (!gameState.gameOver && !isIntro && !isWarp && p.invulnTimer <= 0) {
            if (Math.hypot(ast.x - p.x, ast.y - p.y) < ast.r * 0.78 + 15) {
              gameState.asteroids.splice(i, 1);
              damageSpaceship(p);
            }
          }
        }

        // Update & draw rock projectiles shot by asteroids
        for (let i = gameState.asteroidShots.length - 1; i >= 0; i--) {
          const shot = gameState.asteroidShots[i];
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.rot += shot.vRot * dt;
          if (shot.y > gameH + 30 || shot.y < -30 || shot.x < -30 || shot.x > gameW + 30) {
            gameState.asteroidShots.splice(i, 1);
            continue;
          }
          drawAsteroidShot(gameCtx, shot);
          if (!gameState.gameOver && !isIntro && !isWarp && p.invulnTimer <= 0) {
            if (Math.hypot(shot.x - p.x, shot.y - p.y) < shot.r + 13) {
              gameState.asteroidShots.splice(i, 1);
              damageSpaceship(p);
            }
          }
        }

        // Shockwaves, sparks & popups
        for (let i = gameState.shockwaves.length - 1; i >= 0; i--) {
          const sw = gameState.shockwaves[i];
          sw.life += dt;
          if (sw.life >= sw.maxLife) { gameState.shockwaves.splice(i, 1); continue; }
          const t = sw.life / sw.maxLife;
          gameCtx.save();
          gameCtx.globalAlpha = 1 - t;
          gameCtx.strokeStyle = sw.color || '#ff85a2';
          gameCtx.lineWidth = 3;
          gameCtx.beginPath();
          gameCtx.arc(sw.x, sw.y, sw.r + (sw.maxR - sw.r) * t, 0, Math.PI * 2);
          gameCtx.stroke();
          gameCtx.restore();
        }
        for (let i = gameState.sparks.length - 1; i >= 0; i--) {
          const s = gameState.sparks[i];
          s.life += dt;
          if (s.life >= s.maxLife) { gameState.sparks.splice(i, 1); continue; }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vx *= 0.94;
          s.vy *= 0.94;
          const alpha = 1 - s.life / s.maxLife;
          if (s.heart) {
            drawMiniHeart(gameCtx, s.x, s.y, s.size * 1.4, s.color, alpha);
          } else {
            gameCtx.save();
            gameCtx.globalAlpha = alpha;
            gameCtx.fillStyle = s.color;
            gameCtx.beginPath();
            gameCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            gameCtx.fill();
            gameCtx.restore();
          }
        }

        // Draw spaceship
        if (!gameState.gameOver) {
          let shipAlpha = 1;
          let shipScale = 1;
          if (isIntro && p.fromHeartBurst) {
            const formT = easeInOut(clamp((gameState.spaceIntroTimer - 0.35) / 0.95, 0, 1));
            shipAlpha = formT;
            shipScale = lerp(0.35, 1, formT);
          }
          if (shipAlpha > 0.02) {
            gameCtx.save();
            gameCtx.globalAlpha = shipAlpha;
            drawSpaceship(gameCtx, p.x, p.y, p.tilt || 0, now, p.invulnTimer, p.hurtTimer, shipScale, isWarp ? 1.5 : 1);
            gameCtx.restore();
          }
        }

        for (let i = gameState.popups.length - 1; i >= 0; i--) {
          const pop = gameState.popups[i];
          pop.life += dt;
          if (pop.life >= pop.maxLife) { gameState.popups.splice(i, 1); continue; }
          drawLovePopup(gameCtx, pop);
        }

        if (gameState.damageFlash > 0) {
          const fa = clamp(gameState.damageFlash / 0.35, 0, 1) * 0.36;
          const vig = gameCtx.createRadialGradient(
            gameW * 0.5, gameH * 0.5, Math.min(gameW, gameH) * 0.25,
            gameW * 0.5, gameH * 0.5, Math.max(gameW, gameH) * 0.72
          );
          vig.addColorStop(0, 'rgba(255, 30, 86, 0)');
          vig.addColorStop(1, `rgba(255, 30, 86, ${fa})`);
          gameCtx.fillStyle = vig;
          gameCtx.fillRect(0, 0, gameW, gameH);
        }

        drawSpaceshipHud(gameCtx, p, gameState, now);

        gameRaf = requestAnimationFrame(animateGame);
        return;
      }

      // Horizontal & vertical movement (auto-walk to rescue position on win, otherwise drag/tap/keyboard)
      if (gameState.won) {
        const targetX = gameW / 2;
        const targetY = getDefaultPlayerY();
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const distToTarget = Math.hypot(dx, dy);
        if (distToTarget > 2.5) {
          const maxStep = p.speed * 1.45 * dt;
          const ratio = Math.min(1, maxStep / distToTarget);
          p.x += dx * ratio;
          p.y += dy * ratio;
          p.walkPhase += Math.hypot(dx * ratio, dy * ratio) * 0.16;
          if (Math.abs(dx) > 1.5) p.facing = dx >= 0 ? 1 : -1;
        } else {
          p.x = targetX;
          p.y = targetY;
          p.walkPhase = 0;
        }

        const g = gameState.girl;
        g.phaseTimer += dt;

        // Animate flying broken chain links
        for (let i = g.chainShards.length - 1; i >= 0; i--) {
          const sh = g.chainShards[i];
          sh.life += dt;
          if (sh.life >= sh.maxLife) { g.chainShards.splice(i, 1); continue; }
          sh.vy += 420 * dt;
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          sh.rot += sh.vRot * dt;
        }

        if (g.phase === 'move_center') {
          if (Math.abs(p.x - targetX) <= 6 && Math.abs(p.y - targetY) <= 6 && g.phaseTimer >= 0.25) {
            g.phase = 'unchaining';
            g.phaseTimer = 0;
            [-14, 14].forEach((wx) => {
              spawnBurstSparks(g.x + wx, g.y - 27, 14);
              for (let k = 0; k < 5; k++) {
                const dir = wx < 0 ? -1 : 1;
                g.chainShards.push({
                  x: g.x + wx,
                  y: g.y - 27,
                  vx: dir * (55 + Math.random() * 95) + (Math.random() - 0.5) * 40,
                  vy: -90 - Math.random() * 95,
                  rot: Math.random() * Math.PI * 2,
                  vRot: (Math.random() - 0.5) * 14,
                  life: 0,
                  maxLife: 0.95
                });
              }
            });
            playGameTone(860, 1280, 0.22, 'triangle', 0.075);
          }
        } else if (g.phase === 'unchaining') {
          if (g.phaseTimer >= 0.8) {
            g.phase = 'falling';
            g.phaseTimer = 0;
            g.vy = 55;
          }
        } else if (g.phase === 'falling') {
          g.vy = Math.min(270, g.vy + 210 * dt);
          g.y += g.vy * dt;
          g.x += (p.x - g.x) * Math.min(1, dt * 8);
          g.fallTrailTimer += dt;
          if (g.fallTrailTimer >= 0.055) {
            g.fallTrailTimer = 0;
            gameState.sparks.push({
              x: g.x + (Math.random() - 0.5) * 14,
              y: g.y - 8,
              vx: (Math.random() - 0.5) * 35,
              vy: -30 - Math.random() * 25,
              size: 2.8,
              color: Math.random() < 0.5 ? '#ff4da6' : '#ffd166',
              heart: true,
              life: 0,
              maxLife: 0.55
            });
          }
          if (g.y >= p.y - 6) {
            g.y = p.y - 6;
            g.x = p.x;
            g.phase = 'caught';
            g.phaseTimer = 0;
            g.catchBounce = 8;
            for (let k = 0; k < 16; k++) {
              const ang = (k / 16) * Math.PI * 2;
              gameState.sparks.push({
                x: p.x + Math.cos(ang) * 18,
                y: p.y - 12 + Math.sin(ang) * 18,
                vx: Math.cos(ang) * 115,
                vy: Math.sin(ang) * 115,
                size: 3.1,
                color: k % 2 === 0 ? '#ff4da6' : '#ffd166',
                heart: true,
                life: 0,
                maxLife: 0.65
              });
            }
            spawnBurstSparks(p.x, p.y - 14, 18);
            playGameTone(523, 1046, 0.38, 'triangle', 0.08);
          }
        } else if (g.phase === 'caught') {
          g.x = p.x;
          g.y = p.y - 6;
          g.catchBounce = Math.max(0, g.catchBounce - dt * 24);
          if (g.phaseTimer >= 0.45) {
            g.phase = 'heart_draw';
            g.phaseTimer = 0;
            gameState.coupleHeart = { trailTimer: 0, completedBurst: false };
            playGameTone(523, 784, 0.28, 'sine', 0.05);
          }
        } else if (g.phase === 'heart_draw') {
          g.x = p.x;
          g.y = p.y - 6;
          g.catchBounce = Math.max(0, g.catchBounce - dt * 24);
          const frame = getCoupleHeartFrame(p);
          if (g.phaseTimer < HEART_DRAW_DURATION) {
            gameState.coupleHeart.trailTimer += dt;
            if (gameState.coupleHeart.trailTimer >= 0.038) {
              gameState.coupleHeart.trailTimer = 0;
              const k = ease(clamp(g.phaseTimer / HEART_DRAW_DURATION, 0, 1));
              for (const side of [-1, 1]) {
                const pt = getHeartPointAt(k, side, frame.cx, frame.cy, frame.scale);
                gameState.sparks.push({
                  x: pt.x,
                  y: pt.y,
                  vx: (Math.random() - 0.5) * 38,
                  vy: -18 - Math.random() * 28,
                  size: 2.3,
                  color: Math.random() < 0.5 ? '#ff85a2' : '#ffd166',
                  heart: Math.random() < 0.45,
                  life: 0,
                  maxLife: 0.45
                });
              }
            }
          }
          if (g.phaseTimer >= HEART_DRAW_DURATION && !gameState.coupleHeart.completedBurst) {
            gameState.coupleHeart.completedBurst = true;
            spawnBurstSparks(frame.cx, frame.cy + 80 * frame.scale, 16);
            playGameTone(659, 1046, 0.32, 'triangle', 0.065);
          }
          if (g.phaseTimer >= HEART_TOTAL_DURATION) {
            playGameTone(980, 1480, 0.25, 'triangle', 0.065);
            playGameTone(440, 220, 0.22, 'sine', 0.045);
            if (gameState.onShooterComplete) {
              cancelAnimationFrame(gameRaf);
              gameState.active = false;
              const doneCb = gameState.onShooterComplete;
              gameState.onShooterComplete = null;
              if (window.ldOrientation) window.ldOrientation.exit();
              gameOverlay.style.display = 'none';
              doneCb();
              return;
            }
            gameState.shockwaves.push({ x: p.x, y: p.y - 12, r: 16, maxR: 180, life: 0, maxLife: 0.65, color: '#ff85a2' });
            spawnBurstSparks(p.x, p.y - 12, 26);
            startSpaceshipStage(p.x, p.y - 12, frame);
            gameRaf = requestAnimationFrame(animateGame);
            return;
          }
        }
      } else if (gameState.gameOver) {
        gameState.gameOverTimer += dt;
        p.walkPhase = 0;
        if (gameState.gameOverTimer >= 0.45 && !gameState.dialogShown) {
          gameState.dialogShown = true;
          if (gameOverDialog && !gameOverDialog.open) gameOverDialog.showModal();
        }
      } else {
        gameState.hintTimer = Math.max(0, gameState.hintTimer - dt * (gameState.hasMoved ? 2.4 : 1));
        let moveX = 0;
        let moveY = 0;
        if (gameState.keys.ArrowLeft || gameState.keys.KeyA) moveX -= 1;
        if (gameState.keys.ArrowRight || gameState.keys.KeyD) moveX += 1;
        if (gameState.keys.ArrowUp || gameState.keys.KeyW) moveY -= 1;
        if (gameState.keys.ArrowDown || gameState.keys.KeyS) moveY += 1;

        if (moveX !== 0 || moveY !== 0) {
          const invLen = (moveX !== 0 && moveY !== 0) ? Math.SQRT1_2 : 1;
          const clamped = clampPlayerPos(
            p.x + moveX * invLen * p.speed * dt,
            p.y + moveY * invLen * p.speed * dt
          );
          p.x = clamped.x;
          p.y = clamped.y;
          p.walkPhase += dt * 15;
          if (moveX !== 0) p.facing = moveX > 0 ? 1 : -1;
          gameState.tapTarget = null;
          gameState.hasMoved = true;
        } else if (!gameState.dragActive && gameState.tapTarget) {
          const clampedTarget = clampPlayerPos(gameState.tapTarget.x, gameState.tapTarget.y);
          const dx = clampedTarget.x - p.x;
          const dy = clampedTarget.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            const step = Math.min(dist, p.speed * 1.15 * dt);
            const nextPos = clampPlayerPos(p.x + (dx / dist) * step, p.y + (dy / dist) * step);
            p.x = nextPos.x;
            p.y = nextPos.y;
            p.walkPhase += step * 0.16;
            if (Math.abs(dx) > 1.5) p.facing = dx >= 0 ? 1 : -1;
          } else {
            p.x = clampedTarget.x;
            p.y = clampedTarget.y;
            gameState.tapTarget = null;
          }
        }
      }

      if (!gameState.won && !gameState.gameOver && gameState.fireCooldown <= 0) {
        fireAutoBullet();
      }

      // Spawn enemies from the top edge up to cap while game is active
      if (!gameState.won && !gameState.gameOver) {
        gameState.spawnTimer -= dt;
        const maxOnScreen = gameW < 520
          ? Math.min(9, 6 + Math.floor(gameState.score / 5))
          : Math.min(12, 8 + Math.floor(gameState.score / 4));
        if (gameState.spawnTimer <= 0 && gameState.enemies.length < maxOnScreen) {
          spawnEnemy(false);
          if (gameState.score >= 4 && gameState.enemies.length < maxOnScreen - 1 && Math.random() < 0.35) {
            spawnEnemy(false);
          }
          gameState.spawnTimer = Math.max(0.28, 0.56 - gameState.score * 0.014) + Math.random() * 0.16;
        }
      }

      // Update & draw bullets
      for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        if (gameState.won || gameState.gameOver) break;
        const b = gameState.bullets[i];
        if (!b) continue;
        b.px = b.x;
        b.py = b.y;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life += dt;

        if (b.life >= b.maxLife || b.x < -30 || b.x > gameW + 30 || b.y < -30 || b.y > gameH + 30) {
          gameState.bullets.splice(i, 1);
          continue;
        }

        // Hit test against enemies
        let hit = false;
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
          const e = gameState.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) <= e.radius + 9) {
            e.hp -= 1;
            e.hitFlash = 0.14;
            hit = true;
            if (e.hp <= 0) {
              gameState.enemies.splice(j, 1);
              killEnemy(e);
            } else {
              spawnBurstSparks(b.x, b.y, 5);
              playGameTone(420, 560, 0.05, 'sine', 0.04);
            }
            break;
          }
        }
        if (gameState.won) break;
        if (hit) {
          gameState.bullets.splice(i, 1);
          continue;
        }

        // Draw glowing bullet trail
        gameCtx.save();
        gameCtx.strokeStyle = '#ffd166';
        gameCtx.shadowColor = '#ff4d79';
        gameCtx.shadowBlur = 12;
        gameCtx.lineWidth = 4;
        gameCtx.lineCap = 'round';
        gameCtx.beginPath();
        gameCtx.moveTo(b.px, b.py);
        gameCtx.lineTo(b.x, b.y);
        gameCtx.stroke();

        gameCtx.fillStyle = '#ffffff';
        gameCtx.beginPath();
        gameCtx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
      }

      // Update & draw enemies + downward firing / bottom despawn / contact damage
      for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const e = gameState.enemies[i];
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        if (!gameState.won && !gameState.gameOver) {
          const swayVx = Math.sin(now * 0.001 * e.swayFreq + e.wobblePhase) * e.swayAmp;
          e.x += (e.vx + swayVx) * dt;
          e.y += e.vy * dt;

          const minEX = e.radius + 10;
          const maxEX = Math.max(minEX, gameW - e.radius - 10);
          if (e.x <= minEX) {
            e.x = minEX;
            e.vx = Math.abs(e.vx);
          } else if (e.x >= maxEX) {
            e.x = maxEX;
            e.vx = -Math.abs(e.vx);
          }

          if (e.y > gameH + e.radius + 28) {
            gameState.enemies.splice(i, 1);
            continue;
          }

          if (e.y > 46 && e.y < p.y - 75) {
            if (e.chargeTimer > 0) {
              e.chargeTimer += dt;
              if (e.chargeTimer >= e.chargeDuration) {
                spawnEnemyBullet(e);
                e.chargeTimer = 0;
                e.shootTimer = Math.max(0.85, (e.maxHp > 1 ? 1.35 : 1.2) - gameState.score * 0.018) + Math.random() * 0.55;
              }
            } else {
              e.shootTimer -= dt;
              if (e.shootTimer <= 0) {
                e.chargeTimer = 0.001;
              }
            }
          } else {
            e.chargeTimer = 0;
          }

          const dx = p.x - e.x;
          const dy = (p.y - 6) - e.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < e.radius + 14) {
            if (p.invulnTimer <= 0) {
              damagePlayer(e);
            } else {
              e.vx = -(dx / dist) * 165;
              e.vy = -155;
              e.y -= 18;
            }
          }
        }

        drawEnemy(gameCtx, e, now);
      }

      // Update & draw enemy projectiles + dodge hit-test
      for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        if (gameState.won || gameState.gameOver) break;
        const eb = gameState.enemyBullets[i];
        eb.px = eb.x;
        eb.py = eb.y;
        eb.x += eb.vx * dt;
        eb.y += eb.vy * dt;
        eb.life += dt;

        if (eb.life >= eb.maxLife || eb.x < -24 || eb.x > gameW + 24 || eb.y < -24 || eb.y > gameH + 24) {
          gameState.enemyBullets.splice(i, 1);
          continue;
        }

        if (Math.hypot(eb.x - p.x, eb.y - (p.y - 4)) < 17.5) {
          gameState.enemyBullets.splice(i, 1);
          damagePlayer(null);
          continue;
        }

        gameCtx.save();
        gameCtx.strokeStyle = eb.isHeavy ? 'rgba(255, 42, 102, 0.85)' : 'rgba(255, 107, 53, 0.82)';
        gameCtx.shadowColor = '#ff2a66';
        gameCtx.shadowBlur = 10;
        gameCtx.lineWidth = eb.isHeavy ? 4.4 : 3.6;
        gameCtx.lineCap = 'round';
        gameCtx.beginPath();
        gameCtx.moveTo(eb.px, eb.py);
        gameCtx.lineTo(eb.x, eb.y);
        gameCtx.stroke();

        gameCtx.fillStyle = eb.isHeavy ? '#ff2a66' : '#ff6b35';
        gameCtx.beginPath();
        gameCtx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
        gameCtx.fill();

        gameCtx.shadowBlur = 0;
        gameCtx.fillStyle = '#fff5b8';
        gameCtx.beginPath();
        gameCtx.arc(eb.x, eb.y, 3.1, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
      }

      // Defensive / damage shockwave rings
      for (let i = gameState.shockwaves.length - 1; i >= 0; i--) {
        const sw = gameState.shockwaves[i];
        sw.life += dt;
        if (sw.life >= sw.maxLife) { gameState.shockwaves.splice(i, 1); continue; }
        const t = sw.life / sw.maxLife;
        gameCtx.save();
        gameCtx.globalAlpha = 1 - t;
        gameCtx.strokeStyle = sw.color || '#ff85a2';
        gameCtx.lineWidth = 3;
        gameCtx.beginPath();
        gameCtx.arc(sw.x, sw.y, sw.r + (sw.maxR - sw.r) * t, 0, Math.PI * 2);
        gameCtx.stroke();
        gameCtx.restore();
      }

      // Draw sparks & mini-heart particles
      for (let i = gameState.sparks.length - 1; i >= 0; i--) {
        const s = gameState.sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) { gameState.sparks.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.94;
        s.vy *= 0.94;
        const alpha = 1 - s.life / s.maxLife;
        if (s.heart) {
          drawMiniHeart(gameCtx, s.x, s.y, s.size * 1.4, s.color, alpha);
        } else {
          gameCtx.save();
          gameCtx.globalAlpha = alpha;
          gameCtx.fillStyle = s.color;
          gameCtx.beginPath();
          gameCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          gameCtx.fill();
          gameCtx.restore();
        }
      }

      // Draw glowing heart aura behind the embracing couple before shattering
      if (gameState.won && gameState.girl.phase === 'heart_draw') {
        drawCoupleHeartAura(gameCtx, getCoupleHeartFrame(p), gameState.girl);
      }

      // Draw the male character and the chained/falling/caught pink girl
      drawPlayerGuy(gameCtx, p, now, gameState);
      drawCaptiveGirl(gameCtx, gameState.girl, p, now);

      // Draw animated glowing heart around the couple on top
      if (gameState.won && gameState.girl.phase === 'heart_draw') {
        drawCoupleHeartAnimation(gameCtx, getCoupleHeartFrame(p), gameState.girl, now);
      }

      // Draw floating "I Love You 💖" / "-1 💔" popups that disappear quickly
      for (let i = gameState.popups.length - 1; i >= 0; i--) {
        const pop = gameState.popups[i];
        pop.life += dt;
        if (pop.life >= pop.maxLife) { gameState.popups.splice(i, 1); continue; }
        drawLovePopup(gameCtx, pop);
      }

      // Soft red edge damage flash (single fade-out, no strobing)
      if (gameState.damageFlash > 0) {
        const fa = clamp(gameState.damageFlash / 0.35, 0, 1) * 0.36;
        const vig = gameCtx.createRadialGradient(
          gameW * 0.5, gameH * 0.5, Math.min(gameW, gameH) * 0.25,
          gameW * 0.5, gameH * 0.5, Math.max(gameW, gameH) * 0.72
        );
        vig.addColorStop(0, 'rgba(255, 30, 86, 0)');
        vig.addColorStop(1, `rgba(255, 30, 86, ${fa})`);
        gameCtx.fillStyle = vig;
        gameCtx.fillRect(0, 0, gameW, gameH);
      }

      // Draw boy's Life HUD (top-left hearts + compact bar below player)
      drawLifeHud(gameCtx, p, gameState, now);

      gameRaf = requestAnimationFrame(animateGame);
    }

    function getCanvasPoint(e) {
      const rect = gameCanvas.getBoundingClientRect();
      if (gameOverlay.classList.contains('ld-portrait-mode')) {
        return { x: rect.bottom - e.clientY, y: e.clientX - rect.left };
      }
      if (gameOverlay.classList.contains('ld-landscape-mode')) {
        return { x: e.clientY - rect.top, y: rect.right - e.clientX };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function clearGameDrag() {
      if (gameState) {
        if (gameState.pointerId !== null && gameCanvas.hasPointerCapture && gameCanvas.hasPointerCapture(gameState.pointerId)) {
          try { gameCanvas.releasePointerCapture(gameState.pointerId); } catch (err) { }
        }
        gameState.pointerId = null;
        gameState.dragMode = null;
        gameState.dragActive = false;
      }
      gameCanvas.classList.remove('dragging');
    }

    function canControlGamePlayer() {
      return Boolean(
        gameState &&
        gameState.active &&
        !gameState.gameOver &&
        ((gameState.phase === 'shooter' && !gameState.won) || gameState.phase === 'spaceship')
      );
    }

    gameCanvas.addEventListener('pointerdown', (e) => {
      if (!canControlGamePlayer()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (gameState.pointerId !== null) return;
      e.preventDefault();
      unlockGalaxyAudio();

      const pt = getCanvasPoint(e);
      const p = gameState.player;
      gameState.pointerId = e.pointerId;
      gameState.downX = pt.x;
      gameState.downY = pt.y;
      gameState.lastPointerX = pt.x;
      gameState.lastPointerY = pt.y;
      gameState.dragMoved = false;
      gameState.tapTarget = null;

      if (Math.hypot(pt.x - p.x, pt.y - (p.y - 4)) <= 85) {
        gameState.dragMode = 'direct';
        gameState.dragOffsetX = pt.x - p.x;
        gameState.dragOffsetY = pt.y - p.y;
        gameState.dragActive = true;
        gameCanvas.classList.add('dragging');
      } else {
        gameState.dragMode = 'relative';
        gameState.dragActive = true;
      }

      try { gameCanvas.setPointerCapture(e.pointerId); } catch (err) { }
    });

    gameCanvas.addEventListener('pointermove', (e) => {
      if (!canControlGamePlayer()) return;
      if (e.pointerId !== gameState.pointerId) return;

      const pt = getCanvasPoint(e);
      const p = gameState.player;
      if (!gameState.dragMoved && Math.hypot(pt.x - gameState.downX, pt.y - gameState.downY) > 6) {
        gameState.dragMoved = true;
        gameState.hasMoved = true;
        gameCanvas.classList.add('dragging');
      }

      let nx, ny;
      if (gameState.dragMode === 'direct') {
        nx = pt.x - gameState.dragOffsetX;
        ny = pt.y - gameState.dragOffsetY;
      } else {
        nx = p.x + (pt.x - gameState.lastPointerX);
        ny = p.y + (pt.y - gameState.lastPointerY);
      }
      gameState.lastPointerX = pt.x;
      gameState.lastPointerY = pt.y;

      const clamped = clampPlayerPos(nx, ny);
      const mdx = clamped.x - p.x;
      const mdy = clamped.y - p.y;
      p.x = clamped.x;
      p.y = clamped.y;

      const movedDist = Math.hypot(mdx, mdy);
      if (movedDist > 0.4) {
        p.walkPhase += movedDist * 0.16;
        if (Math.abs(mdx) > 0.8) p.facing = mdx > 0 ? 1 : -1;
        gameState.hasMoved = true;
      }
    });

    gameCanvas.addEventListener('pointerup', (e) => {
      if (!gameState || e.pointerId !== gameState.pointerId) return;
      if (canControlGamePlayer() && gameState.dragMode === 'relative' && !gameState.dragMoved) {
        const pt = getCanvasPoint(e);
        gameState.tapTarget = clampPlayerPos(pt.x, pt.y);
        gameState.hasMoved = true;
      }
      clearGameDrag();
    });
    gameCanvas.addEventListener('pointercancel', (e) => {
      if (gameState && e.pointerId === gameState.pointerId) clearGameDrag();
    });
    gameCanvas.addEventListener('lostpointercapture', () => {
      if (gameState) clearGameDrag();
    });

    window.addEventListener('keydown', (e) => {
      if (!canControlGamePlayer()) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
        gameState.keys[e.code] = true;
        if (e.code.startsWith('Arrow')) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (gameState && gameState.keys) gameState.keys[e.code] = false;
    });

    function startShooterGame(onComplete = null) {
      unlockGalaxyAudio();
      unlockGalaxyMemoriesOnGesture();
      forceCloseGameOverDialog();
      stopGalaxyMemories();
      primeGalaxyMemories();
      cancelAnimationFrame(gameRaf);
      if (!onComplete) cancelAnimationFrame(galaxyRaf);
      clearGameDrag();
      tapBtn.classList.remove('show');
      soundBtn.classList.remove('show');
      againBtn.classList.remove('show');
      gameWinBanner.classList.remove('show');

      stage.classList.add('vanish');
      later(() => {
        heartVideo.pause();
        heartMedia.classList.remove('show');
      }, 750);

      gameOverlay.style.display = 'block';
      if (window.ldOrientation) window.ldOrientation.enterPortrait();
      resizeGameCanvas();

      const girlAnchor = getGirlAnchorPos();
      const startPos = clampPlayerPos(gameW / 2, getDefaultPlayerY());

      gameState = {
        active: true,
        phase: 'shooter',
        won: false,
        onShooterComplete: typeof onComplete === 'function' ? onComplete : null,
        onSpaceshipComplete: null,
        gameOver: false,
        gameOverTimer: 0,
        dialogShown: false,
        damageFlash: 0,
        score: 0,
        spawnTimer: 0.4,
        fireCooldown: 0.25,
        pointerId: null,
        dragMode: null,
        dragActive: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        lastPointerX: 0,
        lastPointerY: 0,
        downX: 0,
        downY: 0,
        dragMoved: false,
        tapTarget: null,
        hintTimer: 4.5,
        hasMoved: false,
        keys: {},
        lastTime: performance.now(),
        player: {
          x: startPos.x,
          y: startPos.y,
          speed: Math.min(360, Math.max(240, gameW * 0.55)),
          aimAngle: -Math.PI / 2,
          facing: 1,
          walkPhase: 0,
          recoil: 0,
          muzzleFlash: 0,
          lives: MAX_PLAYER_LIVES,
          maxLives: MAX_PLAYER_LIVES,
          invulnTimer: 0,
          hurtTimer: 0
        },
        girl: {
          anchorX: girlAnchor.x,
          anchorY: girlAnchor.y,
          x: girlAnchor.x,
          y: girlAnchor.y,
          vy: 0,
          phase: 'chained',
          phaseTimer: 0,
          catchBounce: 0,
          chainShards: [],
          fallTrailTimer: 0
        },
        bullets: [],
        enemyBullets: [],
        enemies: [],
        popups: [],
        sparks: [],
        shockwaves: [],
        lostHearts: [],
        coupleHeart: { trailTimer: 0, completedBurst: false },
        asteroids: [],
        shipBullets: [],
        asteroidShots: [],
        spaceStars: []
      };

      const initialEnemies = 5;
      for (let i = 0; i < initialEnemies; i++) spawnEnemy(true, i, initialEnemies);
      gameRaf = requestAnimationFrame(animateGame);
    }

    function startSpaceshipPunishmentGame(onComplete) {
      startShooterGame(onComplete);
      if (!gameState) return;
      gameState.onShooterComplete = null;
      gameState.onSpaceshipComplete = typeof onComplete === 'function' ? onComplete : null;
      startSpaceshipStage(gameW / 2, getDefaultPlayerY());
    }

    const galaxyQuizDialog = document.getElementById('galaxyQuizDialog');
    const quizStepLabel = document.getElementById('quizStepLabel');
    const quizTimerLabel = document.getElementById('quizTimerLabel');
    const quizQuestionText = document.getElementById('quizQuestionText');
    const quizHint = document.getElementById('quizHint');
    const quizStep1 = document.getElementById('quizStep1');
    const quizStep2 = document.getElementById('quizStep2');
    const quizStep3 = document.getElementById('quizStep3');
    const quizPunishmentStep = document.getElementById('quizPunishmentStep');
    const quizPunishGrid = document.getElementById('quizPunishGrid');
    const quizActions = galaxyQuizDialog ? galaxyQuizDialog.querySelector('.game-over-actions') : null;
    const quizColorGrid = document.getElementById('quizColorGrid');
    const quizMonth = document.getElementById('quizMonth');
    const quizDay = document.getElementById('quizDay');
    const quizYear = document.getElementById('quizYear');
    const quizHr = document.getElementById('quizHr');
    const quizMin = document.getElementById('quizMin');
    const quizSec = document.getElementById('quizSec');
    const quizError = document.getElementById('quizError');
    const quizNextBtn = document.getElementById('quizNextBtn');

    const QUIZ_DURATION_SEC = 15.0;

    const quizState = {
      open: false,
      step: 1,
      punishment: false,
      punishReason: '',
      timeLeft: QUIZ_DURATION_SEC,
      selectedColors: [],
      rafId: 0,
      lastTick: 0
    };

    function renderQuizStep() {
      quizError.textContent = '';
      if (quizState.punishment) {
        quizStep1.hidden = true;
        quizStep2.hidden = true;
        quizStep3.hidden = true;
        if (quizPunishmentStep) quizPunishmentStep.hidden = false;
        if (quizActions) quizActions.hidden = true;
        quizStepLabel.textContent = 'Punishment Time 😈';
        quizTimerLabel.textContent = 'Pick 1 of 4';
        quizTimerLabel.classList.remove('urgent');
        quizQuestionText.textContent = quizState.punishReason || 'Pick a game to continue!';
        quizHint.textContent = 'Beat the game to return to this question!';
        return;
      }

      if (quizPunishmentStep) quizPunishmentStep.hidden = true;
      if (quizActions) quizActions.hidden = false;
      quizStepLabel.textContent = `Question ${quizState.step} of 3`;
      quizStep1.hidden = quizState.step !== 1;
      quizStep2.hidden = quizState.step !== 2;
      quizStep3.hidden = quizState.step !== 3;

      if (quizState.step === 1) {
        quizQuestionText.textContent = "What is Sebastian's favorite color?";
        quizHint.textContent = 'Pick 2 colors only';
        quizNextBtn.textContent = 'Next →';
      } else if (quizState.step === 2) {
        quizQuestionText.textContent = 'When did we officially become a couple?';
        quizHint.textContent = 'Select the month, day, and year';
        quizNextBtn.textContent = 'Next →';
        if (quizMonth) quizMonth.focus();
      } else {
        quizQuestionText.textContent = 'What is our longest Messenger call duration?';
        quizHint.textContent = 'Wrong answer or timeout = pick a punishment game!';
        quizNextBtn.textContent = 'Unlock 💖';
        if (quizHr) quizHr.focus();
      }
    }

    function shakeQuizDialog(msg) {
      quizError.textContent = msg;
      if (!galaxyQuizDialog) return;
      galaxyQuizDialog.classList.remove('shake');
      void galaxyQuizDialog.offsetWidth;
      galaxyQuizDialog.classList.add('shake');
      playGameTone(220, 140, 0.16, 'sawtooth', 0.04);
    }

    function enterQuizPunishment(reasonText) {
      if (!quizState.open || quizState.punishment) return;
      if (quizState.rafId) {
        cancelAnimationFrame(quizState.rafId);
        quizState.rafId = 0;
      }
      quizState.punishment = true;
      quizState.punishReason = reasonText;
      renderQuizStep();
      shakeQuizDialog('');
    }

    function launchPunishmentGame(gameId) {
      if (!quizState.open || !quizState.punishment) return;
      const resumeStep = quizState.step;
      closeGalaxyQuiz();
      const returnToQuiz = () => {
        gameOverlay.style.display = 'none';
        galaxyCanvas.style.display = 'block';
        openGalaxyQuiz(resumeStep);
      };
      if (gameId === 'leveldevil' && typeof window.startLevelDevilGame === 'function') {
        window.startLevelDevilGame(returnToQuiz);
      } else if (gameId === 'dino' && typeof window.startDinoRunnerGame === 'function') {
        window.startDinoRunnerGame(returnToQuiz);
      } else if (gameId === 'shooter') {
        startShooterGame(returnToQuiz);
      } else if (gameId === 'spaceship') {
        startSpaceshipPunishmentGame(returnToQuiz);
      } else {
        returnToQuiz();
      }
    }

    function closeGalaxyQuiz() {
      quizState.open = false;
      quizState.punishment = false;
      if (quizState.rafId) {
        cancelAnimationFrame(quizState.rafId);
        quizState.rafId = 0;
      }
      if (galaxyQuizDialog && galaxyQuizDialog.open) {
        galaxyQuizDialog.close();
      }
    }

    function tickQuizTimer(now) {
      if (!quizState.open || quizState.punishment) return;
      const dt = Math.min(0.1, (now - quizState.lastTick) / 1000);
      quizState.lastTick = now;
      quizState.timeLeft = Math.max(0, quizState.timeLeft - dt);
      quizTimerLabel.textContent = `⏱️ ${quizState.timeLeft.toFixed(1)}s`;
      quizTimerLabel.classList.toggle('urgent', quizState.timeLeft <= 3.0);

      if (quizState.timeLeft <= 0) {
        enterQuizPunishment("Time's up! Pick a game first 😈");
        return;
      }
      quizState.rafId = requestAnimationFrame(tickQuizTimer);
    }

    function playGalaxyAudioFromStart() {
      galaxyAudioAllowed = true;
      if (!galaxyAudio) return;
      if (galaxyAudio.error || galaxyAudio.networkState === 3) {
        try { galaxyAudio.load(); } catch (e) { }
      }
      galaxyAudio.muted = false;
      galaxyAudio.volume = 1;
      try { galaxyAudio.currentTime = 0; } catch (e) { }
      const p = galaxyAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { });
      }
    }

    function unlockGalaxyAfterQuiz() {
      closeGalaxyQuiz();
      playGalaxyAudioFromStart();
      if (galaxyShip) {
        galaxyShip.popped = true;
        galaxyShip.active = false;
        galaxyShip.popAt = (performance.now() - galaxyStart) / 1000;
      }
      galaxyCouple = createGalaxyCoupleState();
      galaxyCouple.boy.u = -0.05;
      galaxyCouple.boy.v = 0.02;
      galaxyCouple.girl.u = 0.05;
      galaxyCouple.girl.v = -0.02;
      startGalaxyMemories();
      galaxyTitle.classList.add('show');
      if (galaxySubtitle) galaxySubtitle.classList.add('show');
      void galaxyTitle.offsetWidth;
      gLetterEls.forEach((el) => el.classList.add('show'));
      playGameTone(523, 1046, 0.38, 'triangle', 0.075);
    }

    function openGalaxyQuiz(startStep = 1) {
      if (!galaxyQuizDialog || quizState.open) return;
      quizState.open = true;
      quizState.step = startStep;
      quizState.punishment = false;
      quizState.punishReason = '';
      quizState.timeLeft = QUIZ_DURATION_SEC;
      if (startStep === 1) {
        quizState.selectedColors = [];
        if (quizColorGrid) {
          quizColorGrid.querySelectorAll('.quiz-color-btn').forEach((b) => b.classList.remove('selected'));
        }
        if (quizMonth) quizMonth.value = '';
        if (quizDay) quizDay.value = '';
        if (quizYear) quizYear.value = '';
        if (quizHr) quizHr.value = '';
        if (quizMin) quizMin.value = '';
        if (quizSec) quizSec.value = '';
      }
      quizTimerLabel.textContent = `⏱️ ${QUIZ_DURATION_SEC.toFixed(1)}s`;
      quizTimerLabel.classList.remove('urgent');
      renderQuizStep();
      if (!galaxyQuizDialog.open) galaxyQuizDialog.showModal();
      quizState.lastTick = performance.now();
      quizState.rafId = requestAnimationFrame(tickQuizTimer);
    }

    if (quizPunishGrid) {
      quizPunishGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-punish-btn');
        if (!btn || !quizState.open || !quizState.punishment) return;
        launchPunishmentGame(btn.dataset.game);
      });
    }

    if (quizColorGrid) {
      quizColorGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-color-btn');
        if (!btn || !quizState.open || quizState.step !== 1) return;
        const c = btn.dataset.color;
        const idx = quizState.selectedColors.indexOf(c);
        if (idx !== -1) {
          quizState.selectedColors.splice(idx, 1);
          btn.classList.remove('selected');
          quizError.textContent = '';
        } else if (quizState.selectedColors.length >= 2) {
          shakeQuizDialog('You can only pick 2 colors!');
        } else {
          quizState.selectedColors.push(c);
          btn.classList.add('selected');
          quizError.textContent = '';
        }
      });
    }

    function handleQuizSubmit() {
      if (!quizState.open || quizState.punishment) return;
      if (quizState.step === 1) {
        const sel = quizState.selectedColors;
        const ok = sel.length === 2 && sel.includes('black') && sel.includes('yellow');
        if (ok) {
          quizState.step = 2;
          quizState.timeLeft = QUIZ_DURATION_SEC;
          playGameTone(587, 880, 0.18, 'triangle', 0.05);
          renderQuizStep();
        } else {
          enterQuizPunishment('Wrong answer! Pick a game first 😈');
        }
      } else if (quizState.step === 2) {
        const ok = quizMonth && quizDay && quizYear
          && quizMonth.value === 'August'
          && Number(quizDay.value) === 21
          && Number(quizYear.value) === 2026;
        if (ok) {
          quizState.step = 3;
          quizState.timeLeft = QUIZ_DURATION_SEC;
          playGameTone(659, 987, 0.18, 'triangle', 0.05);
          renderQuizStep();
        } else {
          enterQuizPunishment('Wrong date! Pick a game first 😈');
        }
      } else if (quizState.step === 3) {
        const ok = quizHr && quizMin && quizSec
          && quizHr.value.trim() !== '' && quizMin.value.trim() !== '' && quizSec.value.trim() !== ''
          && Number(quizHr.value) === 26
          && Number(quizMin.value) === 10
          && Number(quizSec.value) === 28;
        if (ok) {
          unlockGalaxyAfterQuiz();
        } else {
          enterQuizPunishment('Wrong duration! Pick a game first 😈');
        }
      }
    }

    if (quizNextBtn) {
      quizNextBtn.addEventListener('click', handleQuizSubmit);
    }
    if (galaxyQuizDialog) {
      galaxyQuizDialog.addEventListener('cancel', (e) => {
        e.preventDefault();
      });
      galaxyQuizDialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && quizState.open && e.target && e.target.tagName !== 'BUTTON') {
          e.preventDefault();
          handleQuizSubmit();
        }
      });
    }

    function startGalaxyTransition(coupleOrigin) {
      cancelAnimationFrame(galaxyRaf);
      if (threeBgRaf) {
        cancelAnimationFrame(threeBgRaf);
        threeBgRaf = 0;
      }
      tapBtn.classList.remove('show');
      soundBtn.classList.remove('show');

      galaxyCanvas.style.display = 'block';
      heartVideo.pause();
      galaxyAudioAllowed = false;
      if (galaxyAudio) {
        galaxyAudio.pause();
        try { galaxyAudio.currentTime = 0; } catch (e) { }
      }
      resizeGalaxyCanvas();
      const burstCx = coupleOrigin ? coupleOrigin.x : gWidth / 2;
      const burstCy = coupleOrigin ? coupleOrigin.y : gHeight / 2;
      const pScale = window.innerWidth < 768 ? 0.55 : 1;
      const sampled = [];

      if (coupleOrigin) {
        sampleRectParticles(
          { left: burstCx - 22, top: burstCy - 34, width: 28, height: 52 },
          Math.round(650 * pScale),
          ['#38b6ff', '#1d4ed8', '#bae6fd', '#ffd5b8', '#ffffff'],
          burstCx,
          burstCy,
          sampled,
          0.05
        );
        sampleRectParticles(
          { left: burstCx - 6, top: burstCy - 33, width: 26, height: 50 },
          Math.round(650 * pScale),
          ['#ff4da6', '#ff69b4', '#db2777', '#fbcfe8', '#ffd5b8'],
          burstCx,
          burstCy,
          sampled,
          0.05
        );
        if (coupleOrigin.heartCx != null) {
          const heartPalette = ['#ff4d79', '#ff85a2', '#ffd166', '#ffe5ec', '#ffffff'];
          const heartEdgeCount = Math.round(420 * pScale);
          for (let i = 0; i < heartEdgeCount; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const prog = Math.random();
            const pt = getHeartPointAt(prog, side, coupleOrigin.heartCx, coupleOrigin.heartCy, coupleOrigin.heartScale);
            const px = pt.x + (Math.random() - 0.5) * 6;
            const py = pt.y + (Math.random() - 0.5) * 6;
            const c = heartPalette[Math.floor(Math.random() * heartPalette.length)];
            sampled.push(makeGalaxyParticle(px, py, burstCx, burstCy, c));
          }
          sampleHeartParticles(
            {
              left: coupleOrigin.heartCx - 94 * coupleOrigin.heartScale,
              top: coupleOrigin.heartCy - 84 * coupleOrigin.heartScale,
              width: 188 * coupleOrigin.heartScale,
              height: 164 * coupleOrigin.heartScale
            },
            Math.round(220 * pScale),
            ['#ff2a66', '#ff7597', '#ffd166', '#ffe5ec'],
            burstCx,
            burstCy,
            sampled
          );
        } else {
          sampleHeartParticles(
            { left: burstCx - 42, top: burstCy - 54, width: 84, height: 76 },
            Math.round(500 * pScale),
            ['#ff2a66', '#ff7597', '#ffd166', '#ffe5ec', '#ffffff'],
            burstCx,
            burstCy,
            sampled
          );
        }
      } else {
        letterEls.forEach((el) => {
          sampleRectParticles(el.getBoundingClientRect(), Math.round(45 * pScale), ['#ffd166', '#ff5c8a', '#ff9ebb', '#ffffff'], burstCx, burstCy, sampled, 0.05);
        });
        sampleHeartParticles(heartWrap.getBoundingClientRect(), Math.round(900 * pScale), ['#ff2a66', '#ff7597', '#ffb3c6', '#ffd166'], burstCx, burstCy, sampled);
        sampleRectParticles(loveText.getBoundingClientRect(), Math.round(320 * pScale), ['#ffc2d4', '#ff85a2', '#ffffff'], burstCx, burstCy, sampled, 0.22);
        sampleRectParticles(nameText.getBoundingClientRect(), Math.round(320 * pScale), ['#ffd166', '#ffe9b0', '#ffb84d'], burstCx, burstCy, sampled, 0.22);
        sampleRectParticles(underline.getBoundingClientRect(), Math.round(60 * pScale), ['#ffd166', '#ffe9b0', '#ff85a2'], burstCx, burstCy, sampled, 0);
      }

      galaxyParticles = sampled;
      trailParticles = [];
      miniHearts2D = [];
      catchRings = [];
      catchSparkles = [];
      galaxyCouple = createGalaxyCoupleState();
      if (coupleOrigin && coupleOrigin.fromSpaceship) {
        const sx = clamp(coupleOrigin.x != null ? coupleOrigin.x : gWidth * 0.5, 32, gWidth - 32);
        const sy = clamp(coupleOrigin.y != null ? coupleOrigin.y : gHeight * 0.75, 40, gHeight - 40);
        const targetCy = gHeight * 0.57;
        galaxyShip = {
          active: true,
          popped: false,
          t: 0,
          duration: 2.5,
          startX: sx,
          startY: sy,
          ctrlX: lerp(sx, gWidth * 0.5, 0.45) + (sx < gWidth * 0.5 ? 65 : -65),
          ctrlY: lerp(sy, targetCy, 0.5) - 55
        };
      } else {
        galaxyShip = null;
      }
      galaxyBubbles = [];
      galaxyBubbleTimer = 1.25;
      galaxyBubbleIdx = 0;
      againShown = false;

      if (galaxyShip) {
        primeGalaxyMemories();
      } else {
        startGalaxyMemories();
        galaxyTitle.classList.add('show');
        if (galaxySubtitle) galaxySubtitle.classList.add('show');
        void galaxyTitle.offsetWidth;
        gLetterEls.forEach((el) => el.classList.add('show'));
      }

      stage.classList.add('vanish');
      later(() => {
        heartVideo.pause();
        heartMedia.classList.remove('show');
      }, 750);

      galaxyStart = performance.now();
      lastFrameTime = galaxyStart;
      lastTrailAt = 0;
      lastHeartAt = 0;
      galaxyRaf = requestAnimationFrame(animateGalaxy);
    }

    let bgGalaxySprites = null;
    let bgGalaxies = [];
    let bgStars = [];
    let bgMeteors = [];
    let bgMeteorTimer = 0.25;

    function createBgGalaxySprites() {
      const palettes = [
        ['#ffffff', '#70d6ff', '#4f46e5'],
        ['#fff0f5', '#ff7597', '#9d174d'],
        ['#fffbeb', '#ffd166', '#d97706'],
        ['#f5f3ff', '#c084fc', '#5b21b6']
      ];
      return palettes.map(([coreCol, midCol, outerCol]) => {
        const size = 140;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const half = size / 2;

        const halo = ctx.createRadialGradient(half, half, 2, half, half, half);
        halo.addColorStop(0, coreCol);
        halo.addColorStop(0.22, midCol + 'cc');
        halo.addColorStop(0.55, outerCol + '55');
        halo.addColorStop(1, 'rgba(7, 3, 13, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, size, size);

        // Two delicate spiral arms
        for (let arm = 0; arm < 2; arm++) {
          const baseA = arm * Math.PI;
          for (let i = 0; i < 65; i++) {
            const t = i / 65;
            const r = 4 + t * (half - 10);
            const ang = baseA + t * 3.6 + (Math.random() - 0.5) * (0.45 + t * 0.4);
            const px = half + Math.cos(ang) * r;
            const py = half + Math.sin(ang) * r;
            ctx.globalAlpha = (1 - t) * 0.72;
            ctx.fillStyle = t < 0.25 ? coreCol : (t < 0.65 ? midCol : outerCol);
            ctx.beginPath();
            ctx.arc(px, py, 0.7 + (1 - t) * 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        return c;
      });
    }

    function ensureDeepSpaceBg() {
      if (!bgGalaxySprites) bgGalaxySprites = createBgGalaxySprites();
      if (bgGalaxies.length) return;

      const count = window.innerWidth < 768 ? 9 : 13;
      for (let i = 0; i < count; i++) {
        bgGalaxies.push({
          x: Math.random() * gWidth,
          y: Math.random() * gHeight,
          vx: (Math.random() - 0.5) * 14,
          vy: 6 + Math.random() * 14,
          size: 56 + Math.random() * 88,
          tiltY: 0.42 + Math.random() * 0.34,
          tiltAngle: (Math.random() - 0.5) * 1.4,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.24),
          alpha: 0.28 + Math.random() * 0.34,
          spriteIdx: i % bgGalaxySprites.length
        });
      }

      const starCount = window.innerWidth < 768 ? 85 : 135;
      const starColors = ['#ffffff', '#bae6fd', '#ffd166', '#ff9ebb'];
      for (let i = 0; i < starCount; i++) {
        const depth = 0.35 + Math.random() * 0.85;
        bgStars.push({
          x: Math.random() * gWidth,
          y: Math.random() * gHeight,
          vx: -10 * depth,
          vy: (18 + Math.random() * 26) * depth,
          r: 0.7 + depth * 1.3,
          phase: Math.random() * Math.PI * 2,
          color: starColors[i % starColors.length]
        });
      }
    }

    function drawDeepSpaceBg(ctx, dt, elapsed) {
      ensureDeepSpaceBg();

      // 1) Drifting, rotating distant galaxies
      for (let i = 0; i < bgGalaxies.length; i++) {
        const g = bgGalaxies[i];
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.vRot * dt;
        const pad = g.size;
        if (g.y > gHeight + pad) { g.y = -pad; g.x = Math.random() * gWidth; }
        if (g.x < -pad) g.x = gWidth + pad;
        if (g.x > gWidth + pad) g.x = -pad;

        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.translate(g.x, g.y);
        ctx.rotate(g.tiltAngle);
        ctx.scale(1, g.tiltY);
        ctx.rotate(g.rot);
        ctx.drawImage(bgGalaxySprites[g.spriteIdx], -g.size * 0.5, -g.size * 0.5, g.size, g.size);
        ctx.restore();
      }

      // 2) Flowing parallax starfield
      for (let i = 0; i < bgStars.length; i++) {
        const s = bgStars[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.y > gHeight + 6) { s.y = -6; s.x = Math.random() * gWidth; }
        if (s.x < -6) s.x = gWidth + 6;
        const tw = 0.45 + 0.55 * Math.sin(elapsed * 2.8 + s.phase);
        ctx.globalAlpha = tw * 0.82;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 3) Frequent glowing shooting stars / meteors streaking across space
      bgMeteorTimer -= dt;
      if (bgMeteorTimer <= 0 && bgMeteors.length < 7) {
        bgMeteorTimer = 0.3 + Math.random() * 0.48;
        const fromLeft = Math.random() < 0.65;
        const spd = 340 + Math.random() * 280;
        const ang = fromLeft ? (0.45 + Math.random() * 0.45) : (Math.PI - 0.45 - Math.random() * 0.45);
        const mColors = ['#70d6ff', '#ff85a2', '#ffd166', '#ffffff'];
        bgMeteors.push({
          x: fromLeft ? Math.random() * gWidth * 0.85 : gWidth * 0.15 + Math.random() * gWidth * 0.85,
          y: -15 - Math.random() * (gHeight * 0.25),
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          len: 42 + Math.random() * 48,
          life: 0,
          maxLife: 0.75 + Math.random() * 0.55,
          color: mColors[Math.floor(Math.random() * mColors.length)]
        });
      }

      for (let i = bgMeteors.length - 1; i >= 0; i--) {
        const m = bgMeteors[i];
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.life >= m.maxLife || m.y > gHeight + 60) {
          bgMeteors.splice(i, 1);
          continue;
        }
        const env = Math.sin((m.life / m.maxLife) * Math.PI);
        const spd = Math.hypot(m.vx, m.vy) || 1;
        const tx = m.x - (m.vx / spd) * m.len;
        const ty = m.y - (m.vy / spd) * m.len;
        const mg = ctx.createLinearGradient(m.x, m.y, tx, ty);
        mg.addColorStop(0, '#ffffff');
        mg.addColorStop(0.3, m.color);
        mg.addColorStop(1, 'rgba(7, 3, 13, 0)');
        ctx.save();
        ctx.globalAlpha = env * 0.9;
        ctx.strokeStyle = mg;
        ctx.lineWidth = 2.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
      }
    }

    function animateGalaxy(now) {
      const elapsed = (now - galaxyStart) / 1000;
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      gCtx.clearRect(0, 0, gWidth, gHeight);
      drawDeepSpaceBg(gCtx, dt, elapsed);
      updateMemoriesSlide(dt);

      const cx = gWidth / 2;
      const cy = gHeight * 0.57;
      const minDim = Math.min(gWidth, gHeight);
      const galaxyRadius = minDim * 0.44;

      // Floating heart animation in galaxy removed per user request
      const tiltY = 0.54;
      const sinPitch = Math.sqrt(1 - tiltY * tiltY);
      const galaxyTilt = -0.22;
      const cosT = Math.cos(galaxyTilt);
      const sinT = Math.sin(galaxyTilt);
      const rot = elapsed * 0.38;
      const fov = galaxyRadius * 3.1;
      const earthR = Math.min(68, minDim * 0.145);
      const galaxyForm = clamp((elapsed - 0.8) / 1.8, 0, 1);
      const pull = elapsed < 0.55 ? 0 : easeInOut(clamp((elapsed - 0.55) / 2.05, 0, 1));
      const coupleAlpha = galaxyShip
        ? (galaxyShip.popped ? clamp((elapsed - galaxyShip.popAt) / 0.18, 0, 1) : 0)
        : (elapsed < 2.1 ? 0 : clamp((elapsed - 2.1) / 0.9, 0, 1));

      // True 3D swirling spiral nebula sprite + core contrast halo
      if (galaxyForm > 0) {
        ensureGalaxyNebulaSprite();
        gCtx.save();
        gCtx.globalAlpha = galaxyForm;

        gCtx.save();
        gCtx.translate(cx, cy);
        gCtx.rotate(galaxyTilt);
        gCtx.scale(1, tiltY);
        gCtx.rotate(rot * 0.55);
        const nebSize = galaxyRadius * 2.25;
        gCtx.drawImage(galaxyNebulaCanvas, -nebSize * 0.5, -nebSize * 0.5, nebSize, nebSize);
        gCtx.restore();

        // Warm golden-white core ring & dark-softened center for sharp runner contrast
        const contrastR = Math.min(72, minDim * 0.17);
        const core = gCtx.createRadialGradient(cx, cy, contrastR * 0.35, cx, cy, contrastR * 1.55);
        core.addColorStop(0, 'rgba(7, 3, 13, 0.58)');
        core.addColorStop(0.45, 'rgba(255, 232, 185, 0.22)');
        core.addColorStop(0.75, 'rgba(255, 120, 165, 0.12)');
        core.addColorStop(1, 'rgba(7, 3, 13, 0)');
        gCtx.fillStyle = core;
        gCtx.beginPath();
        gCtx.arc(cx, cy, contrastR * 1.55, 0, Math.PI * 2);
        gCtx.fill();

        gCtx.restore();
      }

      // Pass 1: 3D Perspective Spiral Galaxy particles (far & mid-plane stars behind Earth)
      const damp = Math.pow(0.96, dt * 60);
      for (let i = 0; i < galaxyParticles.length; i++) {
        const p = galaxyParticles[i];
        if (pull < 1) {
          p.sx += p.vx * (dt * 60);
          p.sy += p.vy * (dt * 60);
          p.vx *= damp;
          p.vy *= damp;
        }

        const r = (0.04 + p.rNorm * 0.96) * galaxyRadius;
        const ang = p.baseAngle + rot * (1.28 - p.rNorm * 0.55);
        const lx = Math.cos(ang) * r;
        const lz = Math.sin(ang) * r;
        const ly = p.yOffset * galaxyRadius * 0.52;
        const syLocal = lz * tiltY - ly * sinPitch;
        const zCam = -lz * sinPitch - ly * tiltY;
        const persp = clamp(fov / (fov + zCam), 0.68, 1.45);

        const gx = cx + (lx * cosT - syLocal * sinT) * persp;
        const gy = cy + (lx * sinT + syLocal * cosT) * persp;

        const px = pull >= 1 ? gx : p.sx + (gx - p.sx) * pull;
        const py = pull >= 1 ? gy : p.sy + (gy - p.sy) * pull;

        let alpha = (0.58 + 0.36 * Math.sin(elapsed * 3.2 + p.twinklePhase)) * clamp(0.78 + (persp - 1) * 0.55, 0.55, 1);
        const distCenter = Math.hypot(px - cx, py - cy);
        const isForeground = pull > 0.7 && zCam < -galaxyRadius * 0.14 && distCenter > earthR * 0.92;

        if (coupleAlpha > 0 && distCenter < 52) {
          alpha *= 0.35 + (distCenter / 52) * 0.65;
        }

        const drawSize = p.size * (pull >= 0.5 ? persp : 1);
        p._px = px;
        p._py = py;
        p._ps = drawSize;
        p._pa = alpha;
        p._fg = isForeground;

        if (!isForeground) {
          gCtx.globalAlpha = alpha;
          gCtx.fillStyle = pull > 0.35 ? p.galaxyColor : p.color;
          if (drawSize > 2.2) {
            gCtx.beginPath();
            gCtx.arc(px, py, drawSize * 0.6, 0, Math.PI * 2);
            gCtx.fill();
          } else {
            gCtx.fillRect(px - drawSize * 0.5, py - drawSize * 0.5, drawSize, drawSize);
          }
        }
      }
      gCtx.globalAlpha = 1;

      // Slowly rotating 3D Earth globe nestled in the core of the 3D galaxy
      if (galaxyForm > 0) {
        drawRotatingEarth(gCtx, cx, cy, earthR, elapsed, galaxyForm);
      }

      // Pass 2: Near-side foreground 3D spiral stars passing in front of the core
      for (let i = 0; i < galaxyParticles.length; i++) {
        const p = galaxyParticles[i];
        if (!p._fg) continue;
        gCtx.globalAlpha = p._pa;
        gCtx.fillStyle = p.galaxyColor;
        if (p._ps > 2.2) {
          gCtx.beginPath();
          gCtx.arc(p._px, p._py, p._ps * 0.62, 0, Math.PI * 2);
          gCtx.fill();
        } else {
          gCtx.fillRect(p._px - p._ps * 0.5, p._py - p._ps * 0.5, p._ps, p._ps);
        }
      }
      gCtx.globalAlpha = 1;

      // Spaceship flies into the galaxy and enters into the Earth, then the couple pops out from Earth
      if (galaxyShip && galaxyShip.active) {
        galaxyShip.t += dt;
        const rawU = clamp(galaxyShip.t / galaxyShip.duration, 0, 1);
        const u = easeInOut(rawU);
        const invU = 1 - u;
        const sx = invU * invU * galaxyShip.startX + 2 * invU * u * galaxyShip.ctrlX + u * u * cx;
        const sy = invU * invU * galaxyShip.startY + 2 * invU * u * galaxyShip.ctrlY + u * u * cy;
        const dxdt = 2 * invU * (galaxyShip.ctrlX - galaxyShip.startX) + 2 * u * (cx - galaxyShip.ctrlX);
        const dydt = 2 * invU * (galaxyShip.ctrlY - galaxyShip.startY) + 2 * u * (cy - galaxyShip.ctrlY);
        const shipAngle = Math.atan2(dydt, dxdt) + Math.PI / 2;
        const shipScale = rawU < 0.75
          ? lerp(1.15, 0.48, rawU / 0.75)
          : lerp(0.48, 0.12, (rawU - 0.75) / 0.25);
        const shipAlpha = rawU > 0.84 ? clamp((1 - rawU) / 0.16, 0, 1) : 1;

        if (rawU < 0.88 && Math.random() < 0.75) {
          trailParticles.push({
            x: sx + (Math.random() - 0.5) * 8,
            y: sy + (Math.random() - 0.5) * 8,
            r: (2.2 + Math.random() * 2.2) * Math.max(0.35, shipScale),
            color: Math.random() < 0.5 ? '#70d6ff' : '#ff4da6',
            life: 1
          });
        }

        if (shipAlpha > 0.02) {
          gCtx.save();
          gCtx.globalAlpha = shipAlpha;
          drawSpaceship(gCtx, sx, sy, shipAngle, now, 0, 0, shipScale, 1.45);
          gCtx.restore();
        }

        // Subtle glowing portal ripple on Earth as the spaceship enters inside
        if (rawU > 0.78 && rawU < 1) {
          const entryT = (rawU - 0.78) / 0.22;
          gCtx.save();
          gCtx.globalAlpha = Math.sin(entryT * Math.PI) * 0.75;
          gCtx.strokeStyle = '#70d6ff';
          gCtx.lineWidth = 2.4;
          gCtx.beginPath();
          gCtx.arc(cx, cy, earthR * (0.35 + entryT * 0.68), 0, Math.PI * 2);
          gCtx.stroke();
          gCtx.restore();
        }

        if (rawU >= 1 && !galaxyShip.popped) {
          galaxyShip.active = false;
          openGalaxyQuiz();
        }
      }

      const trailAlpha = galaxyShip && galaxyShip.active ? 1 : coupleAlpha;
      if (trailAlpha > 0) {
        for (let i = trailParticles.length - 1; i >= 0; i--) {
          const tp = trailParticles[i];
          tp.life -= dt * 1.15;
          if (tp.life <= 0) { trailParticles.splice(i, 1); continue; }
          gCtx.globalAlpha = tp.life * trailAlpha * 0.78;
          gCtx.fillStyle = tp.color;
          gCtx.beginPath();
          gCtx.arc(tp.x, tp.y, tp.r * (0.4 + tp.life * 0.6), 0, Math.PI * 2);
          gCtx.fill();
        }
        gCtx.globalAlpha = 1;
      }

      // Tiny blue boy & pink girl roaming randomly across the whole galaxy, catching every 5 seconds
      if (coupleAlpha > 0) {
        if (!galaxyCouple) galaxyCouple = createGalaxyCoupleState();
        const baseScale = clamp(minDim / 540, 0.98, 1.32);
        const reducedMotion = reducedMotionQuery.matches;

        updateGalaxyCouple(galaxyCouple, dt, cx, cy, galaxyRadius, tiltY, cosT, sinT, baseScale, now, reducedMotion);

        for (let i = catchRings.length - 1; i >= 0; i--) {
          const cr = catchRings[i];
          cr.life -= dt / cr.maxLife;
          if (cr.life <= 0) { catchRings.splice(i, 1); continue; }
          const p = 1 - cr.life;
          const ringR = (6 + 28 * easeInOut(p)) * cr.scale;
          gCtx.save();
          gCtx.globalAlpha = cr.life * coupleAlpha * 0.65;
          gCtx.translate(cr.x, cr.y);
          gCtx.scale(1, 0.72);
          gCtx.strokeStyle = p < 0.45 ? '#ffd166' : '#ff85c0';
          gCtx.lineWidth = Math.max(1.0, 2.2 * cr.life * cr.scale);
          gCtx.beginPath();
          gCtx.arc(0, 0, ringR, 0, Math.PI * 2);
          gCtx.stroke();
          gCtx.restore();
        }

        const spDamp = Math.pow(0.92, dt * 60);
        for (let i = catchSparkles.length - 1; i >= 0; i--) {
          const sp = catchSparkles[i];
          sp.x += sp.vx * (dt * 60);
          sp.y += sp.vy * (dt * 60);
          sp.vx *= spDamp;
          sp.vy *= spDamp;
          sp.rot += sp.vRot * dt;
          sp.life -= dt / sp.maxLife;
          if (sp.life <= 0) { catchSparkles.splice(i, 1); continue; }
          drawTinyStarSparkle(gCtx, sp.x, sp.y, sp.size * (0.45 + sp.life * 0.55), sp.color, sp.life * coupleAlpha, sp.rot);
        }

        for (let i = miniHearts2D.length - 1; i >= 0; i--) {
          const mh = miniHearts2D[i];
          if (mh.swayAmp) mh.swayPhase += dt * 4.5;
          const swayVx = mh.swayAmp ? Math.sin(mh.swayPhase) * mh.swayAmp : 0;
          mh.x += ((mh.vx || 0) + swayVx) * (dt * 60);
          mh.y += mh.vy * (dt * 60);
          mh.life -= dt * (mh.decay || 0.9);
          if (mh.life <= 0) { miniHearts2D.splice(i, 1); continue; }
          drawMiniHeart(gCtx, mh.x, mh.y, mh.size, mh.color, mh.life * coupleAlpha);
        }

        if (galaxyCouple.phase === 'caught') {
          const ci = galaxyCouple.catchInfo;
          const midPos = galaxyLocalToScreen(ci.u, ci.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
          const midScale = baseScale * (0.92 + 0.14 * ((ci.v + 1) * 0.5));
          const hugP = clamp(galaxyCouple.phaseTime / GALAXY_CAUGHT_DURATION, 0, 1);
          drawCaughtCouple(gCtx, midPos.x, midPos.y, ci.facing, hugP, coupleAlpha, midScale, ci.initialHalfSep, reducedMotion);
        } else {
          const boy = galaxyCouple.boy;
          const girl = galaxyCouple.girl;
          const boyPos = galaxyLocalToScreen(boy.u, boy.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
          const girlPos = galaxyLocalToScreen(girl.u, girl.v, cx, cy, galaxyRadius, tiltY, cosT, sinT);
          const boyScale = baseScale * (0.92 + 0.14 * ((boy.v + 1) * 0.5));
          const girlScale = baseScale * (0.92 + 0.14 * ((girl.v + 1) * 0.5));

          if (boyPos.y < girlPos.y) {
            drawTinyRunner(gCtx, boyPos.x, boyPos.y, boy.dir, boy.stride, false, coupleAlpha, boyScale, boy.reach, 0);
            drawTinyRunner(gCtx, girlPos.x, girlPos.y, girl.dir, girl.stride, true, coupleAlpha, girlScale, 0, girl.escapeBoost);
          } else {
            drawTinyRunner(gCtx, girlPos.x, girlPos.y, girl.dir, girl.stride, true, coupleAlpha, girlScale, 0, girl.escapeBoost);
            drawTinyRunner(gCtx, boyPos.x, boyPos.y, boy.dir, boy.stride, false, coupleAlpha, boyScale, boy.reach, 0);
          }
        }
      }

      if (!againShown && (!galaxyShip || galaxyShip.popped) && elapsed >= 3.5) {
        againShown = true;
        againBtn.classList.add('show');
      }

      galaxyRaf = requestAnimationFrame(animateGalaxy);
    }

    tapBtn.addEventListener('click', () => {
      const startGame2 = () => {
        if (typeof window.startDinoRunnerGame === 'function') {
          window.startDinoRunnerGame(startShooterGame);
        } else {
          startShooterGame();
        }
      };
      if (typeof window.startLevelDevilGame === 'function') {
        window.startLevelDevilGame(startGame2);
      } else {
        startGame2();
      }
    });
    againBtn.addEventListener('click', playAll);

    resetAll();
    Promise.all([document.fonts ? document.fonts.ready : null, preload])
      .then(() => setTimeout(playAll, 400));
