(function () {
  'use strict';

  const LD_W = 800;
  const LD_H = 450;
  const GRAVITY = 1550;
  const MOVE_SPEED = 265;
  const JUMP_VY = -560;
  const PLAYER_W = 24;
  const PLAYER_H = 34;

  const DEATH_QUIPS = [
    'Oops! Trap got you 😜',
    'Trust nobody! 💀',
    'Almost had it! 💖',
    'Surprise!! 😈',
    'Watch your step! ✨'
  ];

  let ldState = null;
  let ldRaf = 0;
  let audioCtx = null;
  let listenersBound = false;
  let rockRenderer = null;
  let rockScene = null;
  let rockCamera = null;
  let rockMeshPool = null;

  function ensureThreeRockRenderer() {
    if (rockRenderer) return true;
    if (!window.THREE || !window.ldThreeRock) return false;
    try {
      const THREE = window.THREE;
      rockRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      rockRenderer.setSize(112, 112, false);
      rockRenderer.setClearColor(0x000000, 0);

      rockScene = new THREE.Scene();
      rockCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
      rockCamera.position.set(0, 0, 4.4);

      rockScene.add(new THREE.HemisphereLight(0x9ec5ff, 0x26122c, 0.72));
      const key = new THREE.DirectionalLight(0xfff1d6, 1.55);
      key.position.set(18, 12, 22);
      rockScene.add(key);
      const rim = new THREE.DirectionalLight(0x68b5ff, 0.68);
      rim.position.set(-20, -10, -14);
      rockScene.add(rim);
      const rose = new THREE.PointLight(0xff5c8a, 0.75, 85);
      rose.position.set(0, 0, 12);
      rockScene.add(rose);

      const { rockGeomPool, rockMats } = window.ldThreeRock;
      rockMeshPool = rockGeomPool.map((geo, idx) => {
        const m = new THREE.Mesh(geo, rockMats[idx % rockMats.length]);
        m.visible = false;
        rockScene.add(m);
        return m;
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  const touchState = {
    left: false,
    right: false,
    jumpPressed: false,
    jumpHeld: false
  };
  const keyState = {
    left: false,
    right: false,
    jumpHeld: false
  };

  function getEls() {
    return {
      overlay: document.getElementById('gameOverlay'),
      canvas: document.getElementById('gameCanvas'),
      controls: document.getElementById('ldControls'),
      leftBtn: document.getElementById('ldLeftBtn'),
      rightBtn: document.getElementById('ldRightBtn'),
      jumpBtn: document.getElementById('ldJumpBtn'),
      winBanner: document.getElementById('gameWinBanner'),
      tapBtn: document.getElementById('tapBtn'),
      soundBtn: document.getElementById('soundBtn'),
      againBtn: document.getElementById('againBtn'),
      stage: document.querySelector('.stage'),
      heartVideo: document.getElementById('heartVideo'),
      heartMedia: document.getElementById('heartMedia')
    };
  }

  function playSfx(type) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.11);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'bounce') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'trap') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'die') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(36, now + 0.36);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + idx * 0.07);
          g.gain.setValueAtTime(0.08, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.22);
        });
      }
    } catch (e) { }
  }

  function createLevel(index) {
    if (index === 0) {
      return {
        name: '1. Trust Issues',
        spawn: { x: 56, y: 336 },
        goal: { x: 716, y: 314, w: 34, h: 56, baseX: 716, baseY: 314, teleported: false, dodged: false, targetX: 716, targetY: 314 },
        platforms: [
          { x: 20, y: 370, w: 190, h: 40, type: 'solid' },
          { x: 280, y: 370, w: 130, h: 26, type: 'collapse', delay: 0.14, touched: false, timer: 0, falling: false, vy: 0, origY: 370, respawnTimer: 0 },
          { x: 475, y: 370, w: 305, h: 40, type: 'solid' }
        ],
        spikes: [
          { x: 565, y: 370, w: 30, h: 22, dir: 'up', type: 'popup', triggerX: 515, triggered: false, progress: 0 }
        ],
        crushers: [],
        bouncePads: [],
        hudSkull: { x: LD_W - 102, y: 23, vx: 0, vy: 0, r: 13, rot: 0, state: 'hud', triggerX: 660 }
      };
    }

    if (index === 1) {
      return {
        name: '2. The Floor Is A Lie',
        spawn: { x: 46, y: 336 },
        goal: { x: 726, y: 254, w: 34, h: 56, baseX: 726, baseY: 254, dodged: false, targetX: 726, targetY: 254 },
        platforms: [
          { x: 20, y: 370, w: 160, h: 40, type: 'solid' },
          { x: 225, y: 325, w: 150, h: 24, type: 'solid' },
          { x: 420, y: 350, w: 145, h: 28, type: 'solid' },
          { x: 595, y: 330, w: 58, h: 20, type: 'collapse', delay: 0.2, touched: false, timer: 0, falling: false, vy: 0, origY: 330, respawnTimer: 0 },
          { x: 685, y: 310, w: 98, h: 32, type: 'solid' }
        ],
        spikes: [
          { x: 342, y: 325, w: 28, h: 22, dir: 'up', type: 'slide', origX: 342, minX: 235, speed: 150, triggerX: 215, triggered: false, progress: 1 }
        ],
        crushers: [
          { x: 468, y: 120, origY: 120, targetY: 306, w: 56, h: 44, triggerX: 445, state: 'idle', timer: 0 }
        ],
        bouncePads: []
      };
    }

    if (index === 2) {
      return {
        name: "3. Devil's Heart",
        spawn: { x: 44, y: 336 },
        goal: { x: 730, y: 224, w: 34, h: 56, baseX: 730, baseY: 224, dodged: false, targetX: 730, targetY: 224 },
        platforms: [
          { x: 20, y: 370, w: 155, h: 40, type: 'solid' },
          { x: 250, y: 350, w: 115, h: 26, type: 'solid' },
          { x: 395, y: 320, w: 82, h: 18, type: 'moving_drop', origX: 395, origY: 320, minX: 395, maxX: 505, vx: 72, touched: false, timer: 0, falling: false, vy: 0, respawnTimer: 0 },
          { x: 545, y: 300, w: 120, h: 26, type: 'solid' },
          { x: 695, y: 280, w: 90, h: 28, type: 'solid' }
        ],
        spikes: [
          { x: 192, y: 225, w: 46, h: 22, dir: 'down', type: 'static', progress: 1 },
          { x: 590, y: 300, w: 28, h: 22, dir: 'up', type: 'popup', triggerX: 552, triggered: false, progress: 0 }
        ],
        crushers: [],
        bouncePads: [
          { x: 704, y: 270, w: 32, h: 10, active: false, bounceAnim: 0 }
        ]
      };
    }

    if (index === 3) {
      return {
        name: '4. Fake Safe',
        spawn: { x: 42, y: 336 },
        goal: { x: 725, y: 259, w: 34, h: 56, baseX: 725, baseY: 259, teleported: false, targetX: 725, targetY: 259 },
        platforms: [
          { x: 20, y: 370, w: 145, h: 40, type: 'solid' },
          { x: 225, y: 355, w: 80, h: 28, type: 'solid' },
          { x: 310, y: 355, w: 80, h: 28, type: 'collapse', delay: 0.14, touched: false, timer: 0, falling: false, vy: 0, origY: 355, respawnTimer: 0 },
          { x: 450, y: 335, w: 155, h: 28, type: 'solid' },
          { x: 665, y: 315, w: 120, h: 30, type: 'solid' }
        ],
        spikes: [
          { x: 258, y: 355, w: 28, h: 22, dir: 'up', type: 'popup', triggerX: 225, triggered: false, progress: 0 },
          { x: 735, y: 315, w: 28, h: 22, dir: 'up', type: 'popup', triggerX: 665, triggered: false, progress: 0 }
        ],
        crushers: [
          { x: 498, y: 120, origY: 120, targetY: 291, w: 56, h: 44, triggerX: 468, state: 'idle', timer: 0 }
        ],
        bouncePads: []
      };
    }

    return {
      name: '5. Final Heart',
      spawn: { x: 40, y: 336 },
      goal: { x: 730, y: 214, w: 34, h: 56, baseX: 730, baseY: 214, isFake: true, exploded: false },
      realGoal: { x: 34, y: 314, w: 34, h: 56, active: false, openAmount: 1 },
      platforms: [
        { x: 16, y: 370, w: 100, h: 40, type: 'solid' },
        { x: 220, y: 345, w: 120, h: 24, type: 'solid' },
        { x: 400, y: 315, w: 74, h: 18, type: 'moving_drop', origX: 400, origY: 315, minX: 400, maxX: 480, vx: 75, touched: false, timer: 0, falling: false, vy: 0, respawnTimer: 0 },
        { x: 540, y: 290, w: 100, h: 26, type: 'solid' },
        { x: 710, y: 270, w: 75, h: 28, type: 'solid' }
      ],
      spikes: [
        { x: 308, y: 345, w: 28, h: 22, dir: 'up', type: 'chase_slide', origX: 308, targetX: 230, speed: 240, triggered: false, steady: false, progress: 1 },
        { x: 425, y: 185, w: 46, h: 22, dir: 'down', type: 'static', progress: 1 }
      ],
      crushers: [
        { x: 564, y: 95, origY: 95, targetY: 246, w: 54, h: 44, triggerX: 544, state: 'idle', timer: 0 }
      ],
      asteroids: [
        // Decoy passing 3D rocks (floating & drifting in background)
        {
          x: 110, y: 92, baseY: 92, r: 19, isTrap: false, meshIdx: 0,
          driftVx: 24, floatAmp: 10, floatFreq: 1.5, phase: 0.4, vx: 0, vy: 0,
          rx: 0.4, ry: 0.9, rz: 0.2, drx: 0.6, dry: 0.8, drz: 0.35,
          state: 'hover', exploded: false,
          mesh: create3DRockMesh(101, [158, 149, 163])
        },
        {
          x: 470, y: 66, baseY: 66, r: 21, isTrap: false, meshIdx: 2,
          driftVx: -20, floatAmp: 11, floatFreq: 1.3, phase: 1.9, vx: 0, vy: 0,
          rx: 1.2, ry: 0.3, rz: 0.8, drx: -0.5, dry: 0.75, drz: -0.4,
          state: 'hover', exploded: false,
          mesh: create3DRockMesh(138, [137, 148, 171])
        },
        // Trap 3D rocks (float & drift just like the others, then aim at the player!)
        {
          x: 270, y: 78, baseY: 78, r: 21, isTrap: true, meshIdx: 1,
          driftVx: 22, floatAmp: 10, floatFreq: 1.4, phase: 0.9, vx: 0, vy: 0, speed: 355,
          rx: 0.6, ry: 1.4, rz: 0.3, drx: 0.7, dry: 0.9, drz: 0.45,
          triggerX: 235, state: 'hover', exploded: false,
          mesh: create3DRockMesh(175, [184, 163, 152])
        },
        {
          x: 660, y: 72, baseY: 72, r: 23, isTrap: true, meshIdx: 3,
          driftVx: -22, floatAmp: 12, floatFreq: 1.2, phase: 2.6, vx: 0, vy: 0, speed: 375,
          rx: 1.8, ry: 0.7, rz: 1.1, drx: -0.7, dry: 0.85, drz: -0.5,
          triggerX: 548, state: 'hover', exploded: false,
          mesh: create3DRockMesh(212, [168, 146, 164])
        }
      ],
      bouncePads: []
    };
  }

  function create3DRockMesh(seed, baseRgb) {
    const t = (1 + Math.sqrt(5)) / 2;
    const rawVerts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    const verts = rawVerts.map((v, idx) => {
      const len = Math.hypot(v[0], v[1], v[2]) || 1;
      const noise = 0.78 + 0.34 * Math.abs(Math.sin(seed * 1.7 + idx * 2.31));
      return [v[0] / len * noise, v[1] / len * noise, v[2] / len * noise];
    });
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    return { verts, faces, baseRgb };
  }

  function draw3DRock(ctx, ast) {
    if (ensureThreeRockRenderer() && rockMeshPool && rockMeshPool.length > 0) {
      const idx = (ast.meshIdx || 0) % rockMeshPool.length;
      for (let i = 0; i < rockMeshPool.length; i++) rockMeshPool[i].visible = (i === idx);
      const m = rockMeshPool[idx];
      m.rotation.set(ast.rx, ast.ry, ast.rz);
      m.scale.setScalar(1);
      rockRenderer.render(rockScene, rockCamera);
      const drawSize = ast.r * 2.5;
      ctx.drawImage(rockRenderer.domElement, ast.x - drawSize / 2, ast.y - drawSize / 2, drawSize, drawSize);
      return;
    }

    const m = ast.mesh;
    if (!m) return;
    const cx = Math.cos(ast.rx), sx = Math.sin(ast.rx);
    const cy = Math.cos(ast.ry), sy = Math.sin(ast.ry);
    const cz = Math.cos(ast.rz), sz = Math.sin(ast.rz);
    const r = ast.r;

    const transformed = m.verts.map(([vx, vy, vz]) => {
      // Rotate X
      const y1 = vy * cx - vz * sx;
      const z1 = vy * sx + vz * cx;
      // Rotate Y
      const x2 = vx * cy + z1 * sy;
      const z2 = -vx * sy + z1 * cy;
      // Rotate Z
      const x3 = x2 * cz - y1 * sz;
      const y3 = x2 * sz + y1 * cz;
      return [x3 * r, y3 * r, z2 * r];
    });

    const visibleFaces = [];
    for (let i = 0; i < m.faces.length; i++) {
      const [ia, ib, ic] = m.faces[i];
      const a = transformed[ia];
      const b = transformed[ib];
      const c = transformed[ic];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      if (nz > 0) {
        const nLen = Math.hypot(nx, ny, nz) || 1;
        const lnx = nx / nLen, lny = ny / nLen, lnz = nz / nLen;
        // Cosmic light from upper-left-front
        const diff = Math.max(0, lnx * -0.45 + lny * -0.58 + lnz * 0.68);
        const rim = Math.pow(Math.max(0, 1 - lnz), 2) * 0.16;
        const shade = 0.22 + diff * 0.85 + rim;
        visibleFaces.push({
          a, b, c,
          z: (a[2] + b[2] + c[2]) / 3,
          shade
        });
      }
    }

    visibleFaces.sort((f1, f2) => f1.z - f2.z);

    const [br, bg, bb] = m.baseRgb;
    ctx.save();
    ctx.translate(ast.x, ast.y);
    for (let i = 0; i < visibleFaces.length; i++) {
      const f = visibleFaces[i];
      const cr = Math.min(255, Math.round(br * f.shade));
      const cg = Math.min(255, Math.round(bg * f.shade));
      const cb = Math.min(255, Math.round(bb * f.shade));
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.strokeStyle = `rgba(${Math.min(255, cr + 24)},${Math.min(255, cg + 20)},${Math.min(255, cb + 28)},0.35)`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(f.a[0], f.a[1]);
      ctx.lineTo(f.b[0], f.b[1]);
      ctx.lineTo(f.c[0], f.c[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function spawnParticles(x, y, color, count, speed) {
    if (!ldState) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.85);
      ldState.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        r: 2.5 + Math.random() * 3.5,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.3,
        color
      });
    }
  }

  function loadLevel(index) {
    const lvl = createLevel(index);
    ldState.levelIndex = index;
    ldState.level = lvl;
    ldState.player = {
      x: lvl.spawn.x,
      y: lvl.spawn.y,
      vx: 0,
      vy: 0,
      w: PLAYER_W,
      h: PLAYER_H,
      onGround: false,
      coyoteTimer: 0,
      jumpBuffer: 0,
      facing: 1,
      walkPhase: 0,
      squashX: 1,
      squashY: 1,
      enterScale: 1,
      enterAlpha: 1,
      blinkTimer: 2.4
    };
    lvl.goal.openAmount = 1;
    ldState.portalClosedBurst = false;
    ldState.dead = false;
    ldState.deathTimer = 0;
    ldState.levelClearTimer = 0;
    ldState.particles = [];
    ldState.shockwaves = [];
    ldState.shake = 0;
  }

  function triggerDeath(isExplosion = false) {
    if (!ldState || ldState.dead || ldState.wonAll) return;
    ldState.dead = true;
    ldState.deathTimer = isExplosion ? 0.62 : 0.45;
    ldState.deaths += 1;
    ldState.shake = isExplosion ? 13 : 7;
    ldState.quip = isExplosion ? 'BOOM!! Asteroid hit! 💥' : DEATH_QUIPS[ldState.deaths % DEATH_QUIPS.length];
    ldState.quipTimer = 1.4;
    const p = ldState.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    if (isExplosion) {
      ldState.shockwaves.push({ x: cx, y: cy, r: 8, maxR: 78, life: 0, maxLife: 0.42, color: '#ff9e00' });
      ldState.shockwaves.push({ x: cx, y: cy, r: 4, maxR: 52, life: 0, maxLife: 0.32, color: '#ffe5ec' });
      spawnParticles(cx, cy, '#ff5c00', 18, 280);
      spawnParticles(cx, cy, '#ffe08a', 14, 240);
      spawnParticles(cx, cy, '#ff6fa3', 14, 210);
      playSfx('boom');
    } else {
      spawnParticles(cx, cy, '#ff6fa3', 18, 220);
      spawnParticles(cx, cy, '#ffe5ec', 8, 160);
      playSfx('die');
    }
  }

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function bindInputs() {
    if (listenersBound) return;
    listenersBound = true;

    window.addEventListener('keydown', (e) => {
      if (!ldState || !ldState.active) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keyState.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keyState.right = true;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (!keyState.jumpHeld && ldState.player) {
          ldState.player.jumpBuffer = 0.14;
        }
        keyState.jumpHeld = true;
        e.preventDefault();
      }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = false;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = false;
      else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keyState.jumpHeld = false;
    });

    const els = getEls();
    function bindTouchBtn(btn, key) {
      if (!btn) return;
      const activePointers = new Set();
      const setPressed = (down) => {
        btn.classList.toggle('pressed', down);
        if (key === 'jump') {
          if (down && !touchState.jumpHeld && ldState && ldState.player) {
            ldState.player.jumpBuffer = 0.14;
          }
          touchState.jumpHeld = down;
        } else {
          touchState[key] = down;
        }
      };

      btn.addEventListener('pointerdown', (e) => {
        if (!ldState || !ldState.active) return;
        e.preventDefault();
        e.stopPropagation();
        activePointers.add(e.pointerId);
        try { btn.setPointerCapture(e.pointerId); } catch (err) { }
        setPressed(true);
      });

      const release = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) setPressed(false);
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', () => {
        activePointers.clear();
        setPressed(false);
      });
    }

    bindTouchBtn(els.leftBtn, 'left');
    bindTouchBtn(els.rightBtn, 'right');
    bindTouchBtn(els.jumpBtn, 'jump');
  }

  function updateLevelDevil(dt) {
    const lvl = ldState.level;
    const p = ldState.player;

    if (ldState.quipTimer > 0) ldState.quipTimer = Math.max(0, ldState.quipTimer - dt);
    if (ldState.shake > 0) ldState.shake = Math.max(0, ldState.shake - dt * 28);

    for (let i = ldState.particles.length - 1; i >= 0; i--) {
      const pt = ldState.particles[i];
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 420 * dt;
      if (pt.life >= pt.maxLife) ldState.particles.splice(i, 1);
    }

    for (let i = (ldState.shockwaves ? ldState.shockwaves.length : 0) - 1; i >= 0; i--) {
      const sw = ldState.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) ldState.shockwaves.splice(i, 1);
    }

    if (ldState.wonAll) {
      ldState.winTimer += dt;
      if (ldState.winTimer >= 1.35 && !ldState.transitioned) {
        ldState.transitioned = true;
        const cb = ldState.onComplete;
        stopLevelDevilGame(false);
        if (typeof cb === 'function') cb();
      }
      return;
    }

    if (ldState.levelClearTimer > 0) {
      ldState.levelClearTimer -= dt;
      const totalDur = 0.90;
      const elapsed = Math.max(0, totalDur - ldState.levelClearTimer);
      const goal = (lvl.realGoal && lvl.realGoal.active) ? lvl.realGoal : lvl.goal;

      if (elapsed < 0.44) {
        const t = Math.min(1, elapsed / 0.44);
        const targetPx = goal.x + goal.w / 2 - p.w / 2;
        const targetPy = goal.y + goal.h - p.h - 4;
        p.x += (targetPx - p.x) * Math.min(1, dt * 14);
        p.y += (targetPy - p.y) * Math.min(1, dt * 14);
        p.enterScale = Math.max(0, 1 - t * 0.92);
        p.enterAlpha = Math.max(0, 1 - t);
        goal.openAmount = 1;
      } else {
        p.enterScale = 0;
        p.enterAlpha = 0;
        const closeT = Math.min(1, (elapsed - 0.44) / 0.36);
        goal.openAmount = Math.max(0, 1 - closeT);
        if (closeT >= 1 && !ldState.portalClosedBurst) {
          ldState.portalClosedBurst = true;
          const gx = goal.x + goal.w / 2;
          const gy = goal.y + goal.h / 2;
          ldState.shockwaves.push({ x: gx, y: gy, r: 6, maxR: 46, life: 0, maxLife: 0.28, color: '#ffe5f1' });
          spawnParticles(gx, gy, '#ffe5f1', 12, 130);
        }
      }

      if (ldState.levelClearTimer <= 0) {
        if (ldState.levelIndex + 1 < 5) {
          loadLevel(ldState.levelIndex + 1);
        } else {
          ldState.wonAll = true;
          ldState.winTimer = 0;
          playSfx('win');
        }
      }
      return;
    }

    if (ldState.dead) {
      ldState.deathTimer -= dt;
      if (ldState.deathTimer <= 0) {
        loadLevel(ldState.levelIndex);
      }
      return;
    }

    // Update platforms (collapsing & moving)
    for (let i = 0; i < lvl.platforms.length; i++) {
      const pl = lvl.platforms[i];
      pl.deltaX = 0;
      if (pl.type === 'collapse') {
        if (pl.touched && !pl.falling) {
          pl.timer += dt;
          if (pl.timer >= pl.delay) {
            pl.falling = true;
            pl.vy = 60;
            playSfx('trap');
          }
        } else if (pl.falling) {
          pl.vy += 900 * dt;
          pl.y += pl.vy * dt;
          pl.respawnTimer += dt;
          if (pl.respawnTimer >= 1.6) {
            pl.y = pl.origY;
            pl.touched = false;
            pl.timer = 0;
            pl.falling = false;
            pl.vy = 0;
            pl.respawnTimer = 0;
          }
        }
      } else if (pl.type === 'moving_drop') {
        if (!pl.falling) {
          const oldX = pl.x;
          pl.x += pl.vx * dt;
          if (pl.x <= pl.minX) {
            pl.x = pl.minX;
            pl.vx = Math.abs(pl.vx);
          } else if (pl.x >= pl.maxX) {
            pl.x = pl.maxX;
            pl.vx = -Math.abs(pl.vx);
          }
          pl.deltaX = pl.x - oldX;
          if (pl.touched) {
            pl.timer += dt;
            if (pl.timer >= 0.72) {
              pl.falling = true;
              pl.vy = 70;
              playSfx('trap');
            }
          }
        } else {
          pl.vy += 880 * dt;
          pl.y += pl.vy * dt;
          pl.respawnTimer += dt;
          if (pl.respawnTimer >= 1.5) {
            pl.x = pl.origX;
            pl.y = pl.origY;
            pl.touched = false;
            pl.timer = 0;
            pl.falling = false;
            pl.vy = 0;
            pl.respawnTimer = 0;
          }
        }
      }
    }

    // Update spikes
    for (let i = 0; i < lvl.spikes.length; i++) {
      const sp = lvl.spikes[i];
      if (sp.type === 'popup') {
        if (!sp.triggered && p.x + p.w > sp.triggerX) {
          sp.triggered = true;
          playSfx('trap');
        }
        if (sp.triggered && sp.progress < 1) {
          sp.progress = Math.min(1, sp.progress + dt * 9);
        }
      } else if (sp.type === 'slide') {
        if (!sp.triggered && p.x + p.w > sp.triggerX) {
          sp.triggered = true;
          playSfx('trap');
        }
        if (sp.triggered && sp.x > sp.minX) {
          sp.x = Math.max(sp.minX, sp.x - sp.speed * dt);
        }
      } else if (sp.type === 'chase_slide') {
        if (!sp.triggered && p.onGround && p.x + p.w > 220 && p.x < 340) {
          sp.triggered = true;
          playSfx('trap');
        }
        if (sp.triggered && !sp.steady) {
          if (sp.x > sp.targetX) {
            sp.x = Math.max(sp.targetX, sp.x - sp.speed * dt);
          } else {
            sp.steady = true;
          }
        }
      }
    }

    // Update crushers
    for (let i = 0; i < lvl.crushers.length; i++) {
      const cr = lvl.crushers[i];
      if (cr.state === 'idle' && p.x + p.w > cr.triggerX) {
        cr.state = 'dropping';
        playSfx('trap');
      } else if (cr.state === 'dropping') {
        cr.y = Math.min(cr.targetY, cr.y + 680 * dt);
        if (cr.y >= cr.targetY) {
          cr.state = 'wait';
          cr.timer = 0.55;
        }
      } else if (cr.state === 'wait') {
        cr.timer -= dt;
        if (cr.timer <= 0) cr.state = 'rising';
      } else if (cr.state === 'rising') {
        cr.y = Math.max(cr.origY, cr.y - 170 * dt);
        if (cr.y <= cr.origY) cr.state = 'idle';
      }
    }

    // Stationary portal goal (except Level 1 & Level 4 troll teleport back to start)
    const goal = lvl.goal;
    if ((ldState.levelIndex === 0 && !goal.teleported && p.x + p.w > 655) ||
        (ldState.levelIndex === 3 && !goal.teleported && p.x + p.w > 690)) {
      goal.teleported = true;
      const oldCx = goal.x + goal.w / 2;
      const oldCy = goal.y + goal.h / 2;
      spawnParticles(oldCx, oldCy, '#d1d5db', 16, 160);
      ldState.shockwaves.push({ x: oldCx, y: oldCy, r: 6, maxR: 42, life: 0, maxLife: 0.3, color: '#d1d5db' });

      goal.x = 36;
      goal.y = 314;
      const newCx = goal.x + goal.w / 2;
      const newCy = goal.y + goal.h / 2;
      spawnParticles(newCx, newCy, '#d1d5db', 16, 160);
      ldState.shockwaves.push({ x: newCx, y: newCy, r: 6, maxR: 42, life: 0, maxLife: 0.3, color: '#e5e7eb' });

      ldState.quip = 'Psych! Back to the start! 😜';
      ldState.quipTimer = 2.0;
      playSfx('trap');
    }

    // Player movement
    const moveLeft = keyState.left || touchState.left;
    const moveRight = keyState.right || touchState.right;
    let moveDir = 0;
    if (moveLeft) moveDir -= 1;
    if (moveRight) moveDir += 1;

    p.vx = moveDir * MOVE_SPEED;
    if (moveDir !== 0) {
      p.facing = moveDir;
      p.walkPhase += dt * 14;
    }

    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.blinkTimer -= dt;
    if (p.blinkTimer <= -0.12) p.blinkTimer = 2.2 + Math.random() * 2.0;

    if (p.jumpBuffer > 0 && p.coyoteTimer > 0) {
      p.vy = JUMP_VY;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBuffer = 0;
      p.squashX = 0.78;
      p.squashY = 1.24;
      spawnParticles(p.x + p.w / 2, p.y + p.h, '#ff9ec4', 5, 90);
      playSfx('jump');
    }

    // Horizontal move & collision
    p.x += p.vx * dt;
    if (p.x < 8) p.x = 8;
    if (p.x + p.w > LD_W - 8) p.x = LD_W - 8 - p.w;

    for (let i = 0; i < lvl.platforms.length; i++) {
      const pl = lvl.platforms[i];
      if (pl.falling && pl.y > LD_H) continue;
      if (aabb(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, pl.h)) {
        if (p.vx > 0) p.x = pl.x - p.w;
        else if (p.vx < 0) p.x = pl.x + pl.w;
      }
    }

    // Vertical move & collision
    const wasOnGround = p.onGround;
    p.vy += GRAVITY * dt;
    if (p.vy > 820) p.vy = 820;
    p.y += p.vy * dt;
    p.onGround = false;

    for (let i = 0; i < lvl.platforms.length; i++) {
      const pl = lvl.platforms[i];
      if (pl.falling && pl.y > LD_H) continue;
      if (aabb(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, pl.h)) {
        if (p.vy >= 0) {
          p.y = pl.y - p.h;
          if (!wasOnGround && p.vy > 220) {
            p.squashX = 1.22;
            p.squashY = 0.8;
          }
          p.vy = 0;
          p.onGround = true;
          p.coyoteTimer = 0.1;
          if (pl.deltaX) p.x += pl.deltaX;
          if ((pl.type === 'collapse' || pl.type === 'moving_drop') && !pl.touched) {
            pl.touched = true;
          }
        } else if (p.vy < 0) {
          p.y = pl.y + pl.h;
          p.vy = 0;
        }
      }
    }

    p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

    // Bounce pads
    for (let i = 0; i < lvl.bouncePads.length; i++) {
      const bp = lvl.bouncePads[i];
      if (!bp.active) continue;
      bp.bounceAnim = Math.max(0, bp.bounceAnim - dt * 5);
      if (aabb(p.x, p.y, p.w, p.h, bp.x, bp.y - 4, bp.w, bp.h + 4) && p.vy >= -50) {
        p.vy = -685;
        p.onGround = false;
        p.coyoteTimer = 0;
        bp.bounceAnim = 1;
        spawnParticles(bp.x + bp.w / 2, bp.y, '#ff75b5', 10, 150);
        playSfx('bounce');
      }
    }

    // Fall into void
    if (p.y > LD_H + 36) {
      triggerDeath();
      return;
    }

    // Spike collisions (forgiving inner hitbox)
    const px = p.x + 4;
    const py = p.y + 4;
    const pw = p.w - 8;
    const ph = p.h - 6;

    for (let i = 0; i < lvl.spikes.length; i++) {
      const sp = lvl.spikes[i];
      if (sp.progress <= 0.15) continue;
      const sh = sp.h * sp.progress;
      const sy = sp.dir === 'up' ? sp.y - sh : sp.y;
      if (aabb(px, py, pw, ph, sp.x + 4, sy + 3, sp.w - 8, Math.max(4, sh - 4))) {
        triggerDeath();
        return;
      }
    }

    // Crusher collisions
    for (let i = 0; i < lvl.crushers.length; i++) {
      const cr = lvl.crushers[i];
      if (aabb(px, py, pw, ph, cr.x + 3, cr.y + 3, cr.w - 6, cr.h - 4)) {
        triggerDeath();
        return;
      }
    }

    // Update & collide 3D asteroids (Level 5)
    const asts = lvl.asteroids || [];
    for (let i = 0; i < asts.length; i++) {
      const ast = asts[i];
      if (ast.exploded) continue;
      ast.rx += ast.drx * dt;
      ast.ry += ast.dry * dt;
      ast.rz += ast.drz * dt;
      if (ast.state === 'hover') {
        ast.x += ast.driftVx * dt;
        ast.phase = (ast.phase || 0) + (ast.floatFreq || 1.4) * dt;
        ast.y = (ast.baseY || ast.y) + Math.sin(ast.phase) * (ast.floatAmp || 10);
        if (ast.x < -30) ast.x = LD_W + 30;
        if (ast.x > LD_W + 30) ast.x = -30;
        if (ast.isTrap && p.x + p.w > ast.triggerX) {
          ast.state = 'falling';
          const tx = p.x + p.w / 2;
          const ty = p.y + p.h / 2;
          const dx = tx - ast.x;
          const dy = ty - ast.y;
          const dist = Math.hypot(dx, dy) || 1;
          const spd = ast.speed || 355;
          ast.vx = (dx / dist) * spd;
          ast.vy = (dy / dist) * spd;
          ast.drx *= 2.2;
          ast.dry *= 2.2;
          playSfx('trap');
        }
      } else if (ast.state === 'falling') {
        ast.x += ast.vx * dt;
        ast.y += ast.vy * dt;
        if (Math.random() < 0.65) {
          ldState.particles.push({
            x: ast.x - ast.vx * 0.03 + (Math.random() - 0.5) * 10,
            y: ast.y - ast.vy * 0.03 + (Math.random() - 0.5) * 10,
            vx: -ast.vx * 0.15,
            vy: -ast.vy * 0.15,
            r: 2.5 + Math.random() * 2.5,
            life: 0,
            maxLife: 0.24,
            color: Math.random() < 0.5 ? '#ff7b00' : '#ff5c9e'
          });
        }
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        if (Math.hypot(ast.x - cx, ast.y - cy) < ast.r + 11) {
          ast.exploded = true;
          triggerDeath(true);
          return;
        }
        if (ast.y > LD_H + 50 || ast.x < -50) {
          ast.state = 'done';
        }
      }
    }

    // Level 1: HUD skull trap — flies from the death counter toward the player near the portal!
    if (lvl.hudSkull) {
      const sk = lvl.hudSkull;
      if (sk.state === 'hud' && p.x + p.w > sk.triggerX) {
        sk.state = 'attacking';
        const tx = p.x + p.w / 2 + p.vx * 0.1;
        const ty = p.y + p.h / 2 + p.vy * 0.05;
        const dx = tx - sk.x;
        const dy = ty - sk.y;
        const dist = Math.hypot(dx, dy) || 1;
        sk.vx = (dx / dist) * 1350;
        sk.vy = (dy / dist) * 1350;
        spawnParticles(sk.x, sk.y, '#ffe5ec', 10, 110);
        playSfx('trap');
      } else if (sk.state === 'attacking') {
        sk.x += sk.vx * dt;
        sk.y += sk.vy * dt;
        sk.rot += 9 * dt;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        if (Math.hypot(sk.x - cx, sk.y - cy) < sk.r + 10) {
          sk.state = 'done';
          triggerDeath();
          ldState.quip = 'Even the 💀 betrayed you! 😜';
          return;
        }
        if (sk.y > LD_H + 40 || sk.x < -40 || sk.x > LD_W + 40) {
          sk.state = 'done';
        }
      }
    }

    // Level 5: Spawn real portal back at the start when player reaches right platform
    if (lvl.realGoal && !lvl.realGoal.active && p.x + p.w > 690) {
      lvl.realGoal.active = true;
      lvl.realGoal.openAmount = 1;
      const rx = lvl.realGoal.x + lvl.realGoal.w / 2;
      const ry = lvl.realGoal.y + lvl.realGoal.h / 2;
      spawnParticles(rx, ry, '#d1d5db', 16, 150);
      ldState.shockwaves.push({ x: rx, y: ry, r: 6, maxR: 42, life: 0, maxLife: 0.3, color: '#e5e7eb' });
    }

    // Goal collision (fake portal explodes; real portal clears level)
    if (!goal.exploded && aabb(p.x, p.y, p.w, p.h, goal.x + 4, goal.y + 4, goal.w - 8, goal.h - 4)) {
      if (goal.isFake) {
        goal.exploded = true;
        triggerDeath(true);
        ldState.quip = 'BOOM!! Fake Portal! 💥';
        return;
      }
      ldState.levelClearTimer = 0.90;
      spawnParticles(goal.x + goal.w / 2, goal.y + goal.h / 2, '#ff75b5', 18, 180);
      spawnParticles(goal.x + goal.w / 2, goal.y + goal.h / 2, '#ffe08a', 10, 140);
      playSfx('win');
    } else if (lvl.realGoal && lvl.realGoal.active && aabb(p.x, p.y, p.w, p.h, lvl.realGoal.x + 4, lvl.realGoal.y + 4, lvl.realGoal.w - 8, lvl.realGoal.h - 4)) {
      ldState.levelClearTimer = 0.90;
      spawnParticles(lvl.realGoal.x + lvl.realGoal.w / 2, lvl.realGoal.y + lvl.realGoal.h / 2, '#ff75b5', 18, 180);
      spawnParticles(lvl.realGoal.x + lvl.realGoal.w / 2, lvl.realGoal.y + lvl.realGoal.h / 2, '#ffe08a', 10, 140);
      playSfx('win');
    }
  }

  function drawPinkGirl(ctx, p) {
    if (p.enterAlpha !== undefined && p.enterAlpha <= 0.02) return;
    const cx = p.x + p.w / 2;
    const bottomY = p.y + p.h;
    const walkBob = p.onGround && Math.abs(p.vx) > 10 ? Math.abs(Math.sin(p.walkPhase)) * 2.5 : 0;
    const legSwing = p.onGround && Math.abs(p.vx) > 10 ? Math.sin(p.walkPhase) * 4.5 : 0;
    const es = p.enterScale !== undefined ? p.enterScale : 1;

    ctx.save();
    ctx.globalAlpha = p.enterAlpha !== undefined ? p.enterAlpha : 1;
    ctx.translate(cx, bottomY - walkBob);
    ctx.scale(p.facing * p.squashX * es, p.squashY * es);

    // Soft pink glow
    ctx.shadowColor = 'rgba(255, 110, 175, 0.55)';
    ctx.shadowBlur = 10;

    // Ponytail / back hair
    ctx.fillStyle = '#ff5c9e';
    ctx.beginPath();
    ctx.ellipse(-9, -22, 5.5, 9, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Little boots / legs
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ff9ec4';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(-4 - legSwing, -1);
    ctx.moveTo(4, -8);
    ctx.lineTo(4 + legSwing, -1);
    ctx.stroke();

    // Pink shoes
    ctx.fillStyle = '#ff2e7a';
    ctx.beginPath();
    ctx.ellipse(-4 - legSwing + 1.5, -1, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(4 + legSwing + 1.5, -1, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute pink dress
    const dressGrad = ctx.createLinearGradient(0, -21, 0, -6);
    dressGrad.addColorStop(0, '#ff77b7');
    dressGrad.addColorStop(1, '#ff2e7a');
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(5, -20);
    ctx.lineTo(9.5, -7);
    ctx.lineTo(-9.5, -7);
    ctx.closePath();
    ctx.fill();

    // Dress white trim
    ctx.strokeStyle = '#ffe5f1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, -7.5);
    ctx.lineTo(9, -7.5);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#ffe3eb';
    ctx.beginPath();
    ctx.arc(0, -26, 8.2, 0, Math.PI * 2);
    ctx.fill();

    // Pink hair top & bangs
    ctx.fillStyle = '#ff5c9e';
    ctx.beginPath();
    ctx.arc(0, -27.5, 8.6, Math.PI * 0.95, Math.PI * 2.08);
    ctx.lineTo(7, -23);
    ctx.quadraticCurveTo(2, -26, -3, -24);
    ctx.closePath();
    ctx.fill();

    // Hair bow
    ctx.fillStyle = '#ff1f6d';
    ctx.beginPath();
    ctx.moveTo(-5, -33);
    ctx.lineTo(-9.5, -36.5);
    ctx.lineTo(-8.5, -31);
    ctx.closePath();
    ctx.moveTo(-5, -33);
    ctx.lineTo(-1, -36.5);
    ctx.lineTo(-2, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(-5, -33, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (blink occasionally)
    const isBlinking = p.blinkTimer < 0;
    ctx.fillStyle = '#2d0b24';
    if (isBlinking) {
      ctx.fillRect(1.5, -26, 3.2, 1.3);
    } else {
      ctx.beginPath();
      ctx.arc(3.3, -25.6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3.8, -26.1, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rosy cheek
    ctx.fillStyle = 'rgba(255, 92, 158, 0.45)';
    ctx.beginPath();
    ctx.arc(2.5, -22.8, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSpike(ctx, sp) {
    if (sp.progress <= 0.05) return;
    const count = Math.max(2, Math.round(sp.w / 14));
    const sw = sp.w / count;
    const sh = sp.h * sp.progress;

    ctx.save();
    ctx.fillStyle = '#ff3b7f';
    ctx.strokeStyle = '#ffd1e3';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(255, 59, 127, 0.65)';
    ctx.shadowBlur = 8;

    for (let i = 0; i < count; i++) {
      const sx = sp.x + i * sw;
      ctx.beginPath();
      if (sp.dir === 'up') {
        ctx.moveTo(sx, sp.y);
        ctx.lineTo(sx + sw / 2, sp.y - sh);
        ctx.lineTo(sx + sw, sp.y);
      } else {
        ctx.moveTo(sx, sp.y);
        ctx.lineTo(sx + sw / 2, sp.y + sh);
        ctx.lineTo(sx + sw, sp.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGoalDoor(ctx, goal, timeSec) {
    const open = goal.openAmount !== undefined ? goal.openAmount : 1;
    if (open <= 0.02) return;
    const pulse = 0.85 + Math.sin(timeSec * 5) * 0.15;
    const cx = goal.x + goal.w / 2;
    const cy = goal.y + goal.h / 2;

    ctx.save();
    ctx.globalAlpha = Math.min(1, open * 1.15);
    ctx.translate(cx, cy);
    ctx.scale(open, 0.25 + 0.75 * open);
    ctx.translate(-cx, -cy);

    // Outer portal doorway frame
    ctx.shadowColor = 'rgba(209, 213, 219, 0.65)';
    ctx.shadowBlur = 14 * pulse;
    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(goal.x, goal.y, goal.w, goal.h, [17, 17, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Open gray portal interior (deep dimensional gray)
    ctx.shadowBlur = 0;
    const innerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, goal.h * 0.52);
    innerGrad.addColorStop(0, '#d1d5db');
    innerGrad.addColorStop(0.45, '#6b7280');
    innerGrad.addColorStop(1, '#1f2937');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.roundRect(goal.x + 4, goal.y + 4, goal.w - 8, goal.h - 6, [13, 13, 2, 2]);
    ctx.fill();

    // Swirling gray portal rings
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7 + Math.sin(timeSec * 5) * 1.6, 15 + Math.cos(timeSec * 5) * 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4 + Math.cos(timeSec * 6) * 1.2, 9 + Math.sin(timeSec * 6) * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function renderLevelDevil(now) {
    const els = getEls();
    if (!els.canvas) return;
    const ctx = els.canvas.getContext('2d');
    const vp = getViewportSize();
    const w = vp.w;
    const h = vp.h;

    ctx.clearRect(0, 0, w, h);

    const { scale, offsetX, offsetY } = getPlayfieldBounds(vp, LD_W, LD_H);

    const timeSec = now * 0.001;
    const lvl = ldState.level;

    ctx.save();
    const shakeX = ldState.shake > 0 ? (Math.random() - 0.5) * ldState.shake : 0;
    const shakeY = ldState.shake > 0 ? (Math.random() - 0.5) * ldState.shake : 0;
    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(scale, scale);

    // Subtle translucent playfield frame over galaxy background
    ctx.fillStyle = 'rgba(14, 6, 26, 0.34)';
    ctx.strokeStyle = 'rgba(255, 133, 179, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, LD_W, LD_H, 16);
    ctx.fill();
    ctx.stroke();

    // Clip to playfield
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, LD_W, LD_H, 16);
    ctx.clip();

    // Platforms
    for (let i = 0; i < lvl.platforms.length; i++) {
      const pl = lvl.platforms[i];
      if (pl.y > LD_H + 20) continue;
      ctx.save();
      const jitterX = pl.touched && !pl.falling ? (Math.random() - 0.5) * 3.5 : 0;
      const grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
      grad.addColorStop(0, '#8b3a8e');
      grad.addColorStop(1, '#321048');
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(255, 182, 217, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(pl.x + jitterX, pl.y, pl.w, pl.h, 6);
      ctx.fill();
      ctx.stroke();

      // Top highlight strip
      ctx.fillStyle = 'rgba(255, 214, 235, 0.28)';
      ctx.fillRect(pl.x + jitterX + 4, pl.y + 2, Math.max(0, pl.w - 8), 3);
      ctx.restore();
    }

    // Bounce pads
    for (let i = 0; i < lvl.bouncePads.length; i++) {
      const bp = lvl.bouncePads[i];
      if (!bp.active) continue;
      ctx.save();
      ctx.fillStyle = '#ff5ca8';
      ctx.strokeStyle = '#ffe5f1';
      ctx.lineWidth = 1.6;
      const lift = bp.bounceAnim * 6;
      ctx.beginPath();
      ctx.roundRect(bp.x, bp.y - lift, bp.w, bp.h + lift, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Crushers (disguised to look like normal blocks)
    for (let i = 0; i < lvl.crushers.length; i++) {
      const cr = lvl.crushers[i];
      ctx.save();
      const grad = ctx.createLinearGradient(cr.x, cr.y, cr.x, cr.y + cr.h);
      grad.addColorStop(0, '#8b3a8e');
      grad.addColorStop(1, '#321048');
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(255, 182, 217, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cr.x, cr.y, cr.w, cr.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 214, 235, 0.28)';
      ctx.fillRect(cr.x + 4, cr.y + 2, Math.max(0, cr.w - 8), 3);
      ctx.restore();
    }

    // Spikes
    for (let i = 0; i < lvl.spikes.length; i++) {
      drawSpike(ctx, lvl.spikes[i]);
    }

    // 3D tumbling passing & trap asteroids
    const asts = lvl.asteroids || [];
    for (let i = 0; i < asts.length; i++) {
      const ast = asts[i];
      if (ast.exploded || ast.state === 'done') continue;
      draw3DRock(ctx, ast);
    }

    // Shockwaves (asteroid explosion)
    if (ldState.shockwaves) {
      for (let i = 0; i < ldState.shockwaves.length; i++) {
        const sw = ldState.shockwaves[i];
        const t = sw.life / sw.maxLife;
        const r = sw.r + (sw.maxR - sw.r) * t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Goal Door(s)
    if (!lvl.goal.exploded) {
      drawGoalDoor(ctx, lvl.goal, timeSec);
    }
    if (lvl.realGoal && lvl.realGoal.active) {
      drawGoalDoor(ctx, lvl.realGoal, timeSec);
    }

    // Player
    if (!ldState.dead) {
      drawPinkGirl(ctx, ldState.player);
    }

    // Particles
    for (let i = 0; i < ldState.particles.length; i++) {
      const pt = ldState.particles[i];
      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // HUD
    ctx.fillStyle = 'rgba(255, 229, 236, 0.92)';
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Game 1 • Level ${ldState.levelIndex + 1}/5: ${lvl.name}`, 16, 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9ec4';
    const deathsLabel = `Deaths: ${ldState.deaths}`;
    const labelW = ctx.measureText(deathsLabel).width;
    if (lvl.hudSkull && lvl.hudSkull.state === 'hud') {
      lvl.hudSkull.x = LD_W - 16 - labelW - 12;
      lvl.hudSkull.y = 23;
    }
    if (lvl.hudSkull && lvl.hudSkull.state !== 'hud') {
      ctx.fillText(deathsLabel, LD_W - 16, 28);
      if (lvl.hudSkull.state === 'attacking') {
        ctx.save();
        ctx.translate(lvl.hudSkull.x, lvl.hudSkull.y);
        ctx.rotate(lvl.hudSkull.rot);
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 92, 158, 0.85)';
        ctx.shadowBlur = 10;
        ctx.fillText('💀', 0, 0);
        ctx.restore();
      }
    } else {
      ctx.fillText(`💀 ${deathsLabel}`, LD_W - 16, 28);
    }

    if (ldState.quipTimer > 0 && ldState.quip) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ldState.quipTimer * 2);
      ctx.textAlign = 'center';
      ctx.font = '700 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffe08a';
      ctx.fillText(ldState.quip, LD_W / 2, 62);
      ctx.restore();
    }

    if (ldState.levelClearTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 240, 248, 0.95)';
      ctx.textAlign = 'center';
      ctx.font = '700 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('Level Cleared! 💖', LD_W / 2, LD_H / 2 - 20);
      ctx.restore();
    }

    if (ldState.wonAll) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 6, 26, 0.55)';
      ctx.fillRect(0, 0, LD_W, LD_H);
      ctx.fillStyle = '#ffe5ec';
      ctx.textAlign = 'center';
      ctx.font = '700 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('All 5 Levels Cleared! 💖', LD_W / 2, LD_H / 2 - 14);
      ctx.font = '600 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ff9ec4';
      ctx.fillText('Starting Game 2...', LD_W / 2, LD_H / 2 + 22);
      ctx.restore();
    }

    ctx.restore(); // end clip
    ctx.restore(); // end transform
  }

  function loop(now) {
    if (!ldState || !ldState.active) return;
    const dt = Math.min(0.05, (now - ldState.lastTime) / 1000);
    ldState.lastTime = now;
    updateLevelDevil(dt);
    renderLevelDevil(now);
    ldRaf = requestAnimationFrame(loop);
  }

  let orientationMode = 'none'; // 'none' | 'landscape' | 'portrait'
  let didRequestFullscreen = false;
  let orientationListenersBound = false;

  function isMobileDevice() {
    return (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window ||
      Math.min(window.innerWidth, window.innerHeight) <= 900
    );
  }

  function getViewportSize() {
    const overlay = document.getElementById('gameOverlay');
    if (overlay && (overlay.classList.contains('ld-landscape-mode') || overlay.classList.contains('ld-portrait-mode'))) {
      return {
        w: overlay.clientWidth || window.innerHeight,
        h: overlay.clientHeight || window.innerWidth
      };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function getPlayfieldBounds(vp, gameW, gameH) {
    const w = vp.w;
    const h = vp.h;
    const isCompactLandscape = w > h && h <= 520;
    const topReserve = isCompactLandscape ? 8 : 20;
    const sidePad = isCompactLandscape ? 16 : 20;

    let bottomLimit = h - (isCompactLandscape ? 14 : 24);
    const controls = document.getElementById('ldControls');
    if (controls && controls.classList.contains('active') && controls.offsetTop > 0) {
      // Keep the entire playfield above the touch controls so buttons never cover the game
      bottomLimit = Math.min(bottomLimit, controls.offsetTop - (isCompactLandscape ? 8 : 12));
    }

    const availW = Math.max(240, w - sidePad);
    const availH = Math.max(120, bottomLimit - topReserve);
    const scale = Math.min(availW / gameW, availH / gameH);
    const offsetX = (w - gameW * scale) / 2;
    const offsetY = topReserve + (availH - gameH * scale) / 2;
    return { scale, offsetX, offsetY };
  }

  function bindOrientationListeners() {
    if (orientationListenersBound) return;
    orientationListenersBound = true;
    window.addEventListener('resize', syncLandscapeOverlay);
    window.addEventListener('orientationchange', syncLandscapeOverlay);
  }

  function syncLandscapeOverlay() {
    const overlay = document.getElementById('gameOverlay');
    if (!overlay) return;
    const mobile = isMobileDevice();
    const shouldLandscape = orientationMode === 'landscape' && mobile && window.innerHeight > window.innerWidth;
    const shouldPortrait = orientationMode === 'portrait' && mobile && window.innerWidth > window.innerHeight;
    overlay.classList.toggle('ld-landscape-mode', shouldLandscape);
    overlay.classList.toggle('ld-portrait-mode', shouldPortrait);
    if (typeof window.resizeGameCanvas === 'function') {
      window.resizeGameCanvas();
    }
  }

  function enterLandscapeMode() {
    orientationMode = 'landscape';
    bindOrientationListeners();
    const fsTarget = document.documentElement || document.getElementById('gameOverlay');
    if (isMobileDevice()) {
      if (fsTarget && fsTarget.requestFullscreen && !document.fullscreenElement) {
        didRequestFullscreen = true;
        Promise.resolve(fsTarget.requestFullscreen()).catch(() => {
          didRequestFullscreen = false;
        });
      }
      if (screen.orientation && screen.orientation.lock) {
        Promise.resolve(screen.orientation.lock('landscape')).catch(() => {});
      }
    }
    syncLandscapeOverlay();
  }

  function enterPortraitMode() {
    orientationMode = 'portrait';
    bindOrientationListeners();
    if (isMobileDevice()) {
      if (screen.orientation && screen.orientation.lock) {
        Promise.resolve(screen.orientation.lock('portrait')).catch(() => {});
      }
      if (didRequestFullscreen && document.fullscreenElement && document.exitFullscreen) {
        didRequestFullscreen = false;
        Promise.resolve(document.exitFullscreen()).catch(() => {});
      }
    }
    syncLandscapeOverlay();
  }

  function exitLandscapeMode() {
    orientationMode = 'none';
    const overlay = document.getElementById('gameOverlay');
    if (overlay) {
      overlay.classList.remove('ld-landscape-mode');
      overlay.classList.remove('ld-portrait-mode');
    }
    if (screen.orientation && screen.orientation.unlock) {
      try { screen.orientation.unlock(); } catch (e) {}
    }
    if (didRequestFullscreen && document.fullscreenElement && document.exitFullscreen) {
      didRequestFullscreen = false;
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
    if (typeof window.resizeGameCanvas === 'function') {
      window.resizeGameCanvas();
    }
  }

  function stopLevelDevilGame(hideOverlay = true) {
    cancelAnimationFrame(ldRaf);
    if (ldState) ldState.active = false;
    touchState.left = false;
    touchState.right = false;
    touchState.jumpHeld = false;
    keyState.left = false;
    keyState.right = false;
    keyState.jumpHeld = false;
    const els = getEls();
    if (els.controls) els.controls.classList.remove('active');
    if (els.leftBtn) els.leftBtn.classList.remove('pressed');
    if (els.rightBtn) els.rightBtn.classList.remove('pressed');
    if (els.jumpBtn) els.jumpBtn.classList.remove('pressed');
    exitLandscapeMode();
    if (hideOverlay && els.overlay) els.overlay.style.display = 'none';
  }

  function startLevelDevilGame(onComplete) {
    bindInputs();
    if (typeof window.unlockGalaxyAudio === 'function') window.unlockGalaxyAudio();

    const els = getEls();
    if (els.tapBtn) els.tapBtn.classList.remove('show');
    if (els.soundBtn) els.soundBtn.classList.remove('show');
    if (els.againBtn) els.againBtn.classList.remove('show');
    if (els.winBanner) els.winBanner.classList.remove('show');
    if (els.stage) els.stage.classList.add('vanish');
    setTimeout(() => {
      if (els.heartVideo) els.heartVideo.pause();
      if (els.heartMedia) els.heartMedia.classList.remove('show');
    }, 750);

    if (els.overlay) els.overlay.style.display = 'block';
    if (els.controls) els.controls.classList.add('active');
    enterLandscapeMode();
    if (typeof window.resizeGameCanvas === 'function') window.resizeGameCanvas();

    ldState = {
      active: true,
      levelIndex: 0,
      deaths: 0,
      quip: 'Reach the 💖 door! Watch out for traps!',
      quipTimer: 2.2,
      wonAll: false,
      winTimer: 0,
      transitioned: false,
      onComplete: onComplete || null,
      lastTime: performance.now(),
      particles: [],
      shake: 0
    };
    loadLevel(0);
    cancelAnimationFrame(ldRaf);
    ldRaf = requestAnimationFrame(loop);
  }

  window.startLevelDevilGame = startLevelDevilGame;
  window.stopLevelDevilGame = stopLevelDevilGame;
  window.ldOrientation = {
    enter: enterLandscapeMode,
    enterPortrait: enterPortraitMode,
    exit: exitLandscapeMode,
    getViewportSize: getViewportSize,
    getPlayfieldBounds: getPlayfieldBounds
  };
  window.ldShared = {
    drawPinkGirl: drawPinkGirl,
    draw3DRock: draw3DRock,
    create3DRockMesh: create3DRockMesh,
    playSfx: playSfx
  };
})();
