(function () {
  'use strict';

  const DR_W = 800;
  const DR_H = 450;
  const GROUND_Y = 365;
  const PLAYER_W = 24;
  const PLAYER_H = 34;
  const PLAYER_X = 112;
  const GRAVITY = 1720;
  const JUMP_VY = -610;
  const TOTAL_ASTEROIDS = 10;
  // 1: stay, 2: jump, 3: stay, 4: stay, 5: jump, 6: jump, 7: stay, 8: jump, 9: stay, 10: stay
  const ASTEROID_PATTERN = [false, true, false, false, true, true, false, true, false, false];

  let drState = null;
  let drRaf = 0;
  let listenersBound = false;

  const DEATH_QUIPS = [
    'Boom! Try again! 💥',
    'Trust nothing! 😈',
    'Oops! Plot twist! 😜',
    'Almost there! ✨'
  ];

  function getEls() {
    return {
      overlay: document.getElementById('gameOverlay'),
      canvas: document.getElementById('gameCanvas'),
      controls: document.getElementById('ldControls'),
      jumpBtn: document.getElementById('ldJumpBtn'),
      winBanner: document.getElementById('gameWinBanner'),
      tapBtn: document.getElementById('tapBtn'),
      soundBtn: document.getElementById('soundBtn'),
      againBtn: document.getElementById('againBtn'),
      stage: document.querySelector('.stage')
    };
  }

  function playSfx(type) {
    if (window.ldShared && typeof window.ldShared.playSfx === 'function') {
      window.ldShared.playSfx(type);
    }
  }

  function buildAsteroidDeck() {
    return ASTEROID_PATTERN.slice();
  }

  function spawnExplosion(x, y, colors, count) {
    if (!drState) return;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 250;
      drState.particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40,
        r: 2.2 + Math.random() * 4.2,
        color: colors[i % colors.length],
        life: 0,
        maxLife: 0.45 + Math.random() * 0.4
      });
    }
    drState.shockwaves.push({
      x: x,
      y: y,
      r: 8,
      maxR: 68,
      life: 0,
      maxLife: 0.42,
      color: colors[0]
    });
  }

  function resetRun(quipText) {
    if (!drState) return;
    drState.dead = false;
    drState.deadTimer = 0;
    drState.cleared = 0;
    drState.spawnedCount = 0;
    drState.deck = buildAsteroidDeck();
    drState.asteroids = [];
    drState.popups = [];
    drState.spawnTimer = 0.85;
    drState.jumpBuffer = 0;
    drState.quip = quipText || 'Survive 10 Asteroids! Good luck 😈';
    drState.quipTimer = 2.6;
    drState.player = {
      x: PLAYER_X,
      y: GROUND_Y - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 260,
      vy: 0,
      facing: 1,
      onGround: true,
      walkPhase: 0,
      blinkTimer: 2.0,
      squashX: 1,
      squashY: 1
    };
  }

  function triggerDeath(reason) {
    if (!drState || drState.dead || drState.won) return;
    drState.dead = true;
    drState.deadTimer = 0;
    drState.deaths += 1;
    drState.shake = 12;
    drState.quip = reason || DEATH_QUIPS[drState.deaths % DEATH_QUIPS.length];
    drState.quipTimer = 1.8;
    const p = drState.player;
    spawnExplosion(
      p.x + p.w / 2,
      p.y + p.h / 2,
      ['#ff2e7a', '#ff85b3', '#ffe08a', '#ffffff'],
      30
    );
    playSfx('die');
  }

  function requestJump() {
    if (!drState || !drState.active || drState.dead || drState.won) return;
    drState.jumpBuffer = 0.12;
  }

  function bindInputs() {
    if (listenersBound) return;
    listenersBound = true;

    window.addEventListener('keydown', (e) => {
      if (!drState || !drState.active) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        requestJump();
      }
    });

    const els = getEls();
    if (els.jumpBtn) {
      els.jumpBtn.addEventListener('pointerdown', (e) => {
        if (!drState || !drState.active) return;
        e.preventDefault();
        e.stopPropagation();
        els.jumpBtn.classList.add('pressed');
        requestJump();
      });
      const release = () => {
        if (els.jumpBtn) els.jumpBtn.classList.remove('pressed');
      };
      els.jumpBtn.addEventListener('pointerup', release);
      els.jumpBtn.addEventListener('pointercancel', release);
      els.jumpBtn.addEventListener('pointerleave', release);
    }

    if (els.canvas) {
      els.canvas.addEventListener('pointerdown', (e) => {
        if (!drState || !drState.active) return;
        e.preventDefault();
        requestJump();
      });
    }
  }

  function spawnNextAsteroid() {
    if (!drState || drState.spawnedCount >= TOTAL_ASTEROIDS) return;
    const mustAvoid = drState.deck[drState.spawnedCount];
    drState.spawnedCount += 1;

    const r = 18 + Math.random() * 3.5;
    const baseRgb = [168, 154, 172];
    const seed = 50 + drState.spawnedCount * 37 + Math.floor(Math.random() * 50);
    const mesh = window.ldShared && window.ldShared.create3DRockMesh
      ? window.ldShared.create3DRockMesh(seed, baseRgb)
      : null;

    drState.asteroids.push({
      x: DR_W + r + 24,
      y: GROUND_Y - r - 2,
      r: r,
      mustAvoid: mustAvoid,
      speed: 325 + drState.cleared * 9,
      meshIdx: drState.spawnedCount % 4,
      mesh: mesh,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      drx: (Math.random() - 0.5) * 3.2,
      dry: (Math.random() - 0.5) * 3.2,
      drz: -3.8,
      touchedPlayer: false,
      scored: false,
      dissolved: false
    });
  }

  function circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= cr * cr;
  }

  function updateDinoRunner(dt) {
    if (!drState || !drState.active) return;

    if (drState.shake > 0) drState.shake = Math.max(0, drState.shake - dt * 36);
    if (drState.quipTimer > 0) drState.quipTimer = Math.max(0, drState.quipTimer - dt);

    // Update particles & shockwaves
    for (let i = drState.particles.length - 1; i >= 0; i--) {
      const pt = drState.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 420 * dt;
      pt.life += dt;
      if (pt.life >= pt.maxLife) drState.particles.splice(i, 1);
    }
    for (let i = drState.shockwaves.length - 1; i >= 0; i--) {
      const sw = drState.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) drState.shockwaves.splice(i, 1);
    }
    for (let i = drState.popups.length - 1; i >= 0; i--) {
      const pop = drState.popups[i];
      pop.y -= 36 * dt;
      pop.life += dt;
      if (pop.life >= pop.maxLife) drState.popups.splice(i, 1);
    }

    if (drState.won) {
      drState.winTimer += dt;
      if (drState.winTimer >= 1.65 && !drState.transitioned) {
        drState.transitioned = true;
        const cb = drState.onComplete;
        stopDinoRunnerGame(false);
        if (typeof cb === 'function') cb();
      }
      return;
    }

    if (drState.dead) {
      drState.deadTimer += dt;
      if (drState.deadTimer >= 0.95) {
        resetRun(DEATH_QUIPS[drState.deaths % DEATH_QUIPS.length]);
      }
      return;
    }

    // Scroll ground & stars
    const worldSpeed = 325 + drState.cleared * 9;
    drState.groundOffset = (drState.groundOffset + worldSpeed * dt) % 48;
    for (let i = 0; i < drState.bgDots.length; i++) {
      const d = drState.bgDots[i];
      d.x -= d.speed * dt;
      if (d.x < -10) {
        d.x = DR_W + 10;
        d.y = 30 + Math.random() * (GROUND_Y - 60);
      }
    }

    // Player physics
    const p = drState.player;
    p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

    p.blinkTimer -= dt;
    if (p.blinkTimer < -0.14) {
      p.blinkTimer = 1.6 + Math.random() * 2.5;
    }

    if (drState.jumpBuffer > 0) {
      drState.jumpBuffer = Math.max(0, drState.jumpBuffer - dt);
      if (p.onGround) {
        p.vy = JUMP_VY;
        p.onGround = false;
        p.squashX = 0.82;
        p.squashY = 1.22;
        drState.jumpBuffer = 0;
        playSfx('jump');
      }
    }

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y - p.h) {
      if (!p.onGround) {
        p.squashX = 1.2;
        p.squashY = 0.82;
      }
      p.y = GROUND_Y - p.h;
      p.vy = 0;
      p.onGround = true;
    }

    if (p.onGround) {
      p.walkPhase += dt * 14;
    }

    // Spawn asteroids
    if (drState.spawnedCount < TOTAL_ASTEROIDS) {
      drState.spawnTimer -= dt;
      if (drState.spawnTimer <= 0) {
        spawnNextAsteroid();
        drState.spawnTimer = 1.15 + Math.random() * 0.45;
      }
    }

    // Update asteroids & collisions
    for (let i = drState.asteroids.length - 1; i >= 0; i--) {
      const ast = drState.asteroids[i];
      ast.x -= ast.speed * dt;
      ast.rx += ast.drx * dt;
      ast.ry += ast.dry * dt;
      ast.rz += ast.drz * dt;

      if (!ast.dissolved) {
        // Forgiving hitbox for must-avoid, generous hitbox for must-not-avoid
        const pad = ast.mustAvoid ? 3 : -3;
        const hit = circleIntersectsRect(
          ast.x,
          ast.y,
          Math.max(6, ast.r - pad),
          p.x + (ast.mustAvoid ? 3 : 0),
          p.y + (ast.mustAvoid ? 4 : 0),
          p.w - (ast.mustAvoid ? 6 : 0),
          p.h - (ast.mustAvoid ? 4 : 0)
        );

        if (ast.mustAvoid) {
          if (hit) {
            triggerDeath('Boom! Wrong move! 💥');
            return;
          }
          if (!ast.scored && ast.x + ast.r < p.x) {
            ast.scored = true;
            drState.cleared += 1;
            drState.popups.push({
              x: p.x + p.w / 2,
              y: p.y - 10,
              text: `${drState.cleared}/10 ✨`,
              color: '#ffe08a',
              life: 0,
              maxLife: 0.75
            });
            playSfx('bounce');
          }
        } else {
          // Must NOT avoid!
          if (hit && !ast.touchedPlayer) {
            ast.touchedPlayer = true;
            ast.dissolved = true;
            ast.scored = true;
            drState.cleared += 1;
            spawnExplosion(ast.x, ast.y, ['#ff85b3', '#ffe08a', '#ffffff'], 16);
            drState.popups.push({
              x: p.x + p.w / 2,
              y: p.y - 12,
              text: `Safe! ${drState.cleared}/10 💖`,
              color: '#ff9ec4',
              life: 0,
              maxLife: 0.8
            });
            playSfx('goal');
          } else if (!ast.touchedPlayer && ast.x + ast.r < p.x) {
            triggerDeath('Boom! Wrong move! 💥');
            return;
          }
        }
      }

      if (ast.x + ast.r < -40) {
        drState.asteroids.splice(i, 1);
      }
    }

    if (drState.cleared >= TOTAL_ASTEROIDS && !drState.won) {
      drState.won = true;
      drState.winTimer = 0;
      playSfx('win');
    }
  }

  function renderDinoRunner() {
    const els = getEls();
    if (!els.canvas || !drState) return;
    const ctx = els.canvas.getContext('2d');
    const vp = window.ldOrientation ? window.ldOrientation.getViewportSize() : { w: window.innerWidth, h: window.innerHeight };
    const w = vp.w;
    const h = vp.h;

    ctx.clearRect(0, 0, w, h);

    let scale, offsetX, offsetY;
    if (window.ldOrientation && typeof window.ldOrientation.getPlayfieldBounds === 'function') {
      ({ scale, offsetX, offsetY } = window.ldOrientation.getPlayfieldBounds(vp, DR_W, DR_H));
    } else {
      const topReserve = 20;
      const availW = Math.max(240, w - 20);
      const availH = Math.max(120, h - 140 - topReserve);
      scale = Math.min(availW / DR_W, availH / DR_H);
      offsetX = (w - DR_W * scale) / 2;
      offsetY = topReserve + (availH - DR_H * scale) / 2;
    }

    ctx.save();
    const shakeX = drState.shake > 0 ? (Math.random() - 0.5) * drState.shake : 0;
    const shakeY = drState.shake > 0 ? (Math.random() - 0.5) * drState.shake : 0;
    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(scale, scale);

    // Translucent playfield frame
    ctx.fillStyle = 'rgba(14, 6, 26, 0.36)';
    ctx.strokeStyle = 'rgba(255, 133, 179, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, DR_W, DR_H, 16);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, DR_W, DR_H, 16);
    ctx.clip();

    // Speed dust / stars
    for (let i = 0; i < drState.bgDots.length; i++) {
      const d = drState.bgDots[i];
      ctx.fillStyle = `rgba(255, 210, 232, ${d.alpha})`;
      ctx.fillRect(d.x, d.y, d.len, 2);
    }

    // Ground track
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, DR_H);
    groundGrad.addColorStop(0, '#5a1e63');
    groundGrad.addColorStop(1, '#200830');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, DR_W, DR_H - GROUND_Y);

    ctx.strokeStyle = 'rgba(255, 182, 217, 0.78)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(DR_W, GROUND_Y);
    ctx.stroke();

    // Scrolling Chrome-Dino style ground pebbles/dashes
    ctx.fillStyle = 'rgba(255, 182, 217, 0.35)';
    for (let gx = -drState.groundOffset; gx < DR_W + 48; gx += 48) {
      ctx.fillRect(gx, GROUND_Y + 12, 16, 2.5);
      ctx.fillRect(gx + 24, GROUND_Y + 24, 9, 2);
    }

    // Asteroids
    for (let i = 0; i < drState.asteroids.length; i++) {
      const ast = drState.asteroids[i];
      if (ast.dissolved) continue;

      if (window.ldShared && typeof window.ldShared.draw3DRock === 'function') {
        window.ldShared.draw3DRock(ctx, ast);
      }
    }

    // Shockwaves
    for (let i = 0; i < drState.shockwaves.length; i++) {
      const sw = drState.shockwaves[i];
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

    // Pink Girl player
    if (!drState.dead && window.ldShared && typeof window.ldShared.drawPinkGirl === 'function') {
      window.ldShared.drawPinkGirl(ctx, drState.player);
    }

    // Particles
    for (let i = 0; i < drState.particles.length; i++) {
      const pt = drState.particles[i];
      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Popups
    for (let i = 0; i < drState.popups.length; i++) {
      const pop = drState.popups[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pop.life / pop.maxLife);
      ctx.font = '700 15px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }

    // HUD
    ctx.fillStyle = 'rgba(255, 229, 236, 0.94)';
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Game 2 • Asteroid Runner`, 16, 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe08a';
    ctx.fillText(`Cleared: ${drState.cleared} / ${TOTAL_ASTEROIDS}`, DR_W - 16, 28);

    ctx.textAlign = 'center';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 200, 226, 0.78)';
    ctx.fillText('Tap / Space to Jump', DR_W / 2, 28);

    if (drState.quipTimer > 0 && drState.quip) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, drState.quipTimer * 2);
      ctx.textAlign = 'center';
      ctx.font = '700 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffe08a';
      ctx.fillText(drState.quip, DR_W / 2, 64);
      ctx.restore();
    }

    if (drState.won) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 6, 26, 0.55)';
      ctx.fillRect(0, 0, DR_W, DR_H);
      ctx.fillStyle = '#ffe5ec';
      ctx.textAlign = 'center';
      ctx.font = '700 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('10/10 Asteroids Cleared! 💖', DR_W / 2, DR_H / 2 - 14);
      ctx.font = '600 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ff9ec4';
      ctx.fillText('Starting Game 3...', DR_W / 2, DR_H / 2 + 22);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  function loop(now) {
    if (!drState || !drState.active) return;
    const dt = Math.min(0.05, (now - drState.lastTime) / 1000);
    drState.lastTime = now;
    updateDinoRunner(dt);
    renderDinoRunner();
    drRaf = requestAnimationFrame(loop);
  }

  function stopDinoRunnerGame(hideOverlay = true) {
    cancelAnimationFrame(drRaf);
    if (drState) drState.active = false;
    const els = getEls();
    if (els.controls) {
      els.controls.classList.remove('active');
      els.controls.classList.remove('jump-only');
    }
    if (els.jumpBtn) els.jumpBtn.classList.remove('pressed');
    if (window.ldOrientation) window.ldOrientation.exit();
    if (hideOverlay && els.overlay) els.overlay.style.display = 'none';
  }

  function startDinoRunnerGame(onComplete) {
    bindInputs();
    if (typeof window.unlockGalaxyAudio === 'function') window.unlockGalaxyAudio();

    const els = getEls();
    if (els.tapBtn) els.tapBtn.classList.remove('show');
    if (els.soundBtn) els.soundBtn.classList.remove('show');
    if (els.againBtn) els.againBtn.classList.remove('show');
    if (els.winBanner) els.winBanner.classList.remove('show');
    if (els.stage) els.stage.classList.add('vanish');

    if (els.overlay) els.overlay.style.display = 'block';
    if (els.controls) {
      els.controls.classList.add('active');
      els.controls.classList.add('jump-only');
    }
    if (window.ldOrientation) window.ldOrientation.enter();
    if (typeof window.resizeGameCanvas === 'function') window.resizeGameCanvas();

    const bgDots = [];
    for (let i = 0; i < 24; i++) {
      bgDots.push({
        x: Math.random() * DR_W,
        y: 30 + Math.random() * (GROUND_Y - 60),
        len: 4 + Math.random() * 14,
        speed: 90 + Math.random() * 160,
        alpha: 0.14 + Math.random() * 0.25
      });
    }

    drState = {
      active: true,
      deaths: 0,
      cleared: 0,
      spawnedCount: 0,
      deck: [],
      asteroids: [],
      particles: [],
      shockwaves: [],
      popups: [],
      bgDots: bgDots,
      groundOffset: 0,
      spawnTimer: 0.85,
      jumpBuffer: 0,
      dead: false,
      deadTimer: 0,
      won: false,
      winTimer: 0,
      transitioned: false,
      shake: 0,
      quip: '',
      quipTimer: 0,
      onComplete: onComplete || null,
      lastTime: performance.now(),
      player: null
    };

    resetRun('Survive 10 Asteroids! Good luck 😈');
    cancelAnimationFrame(drRaf);
    drRaf = requestAnimationFrame(loop);
  }

  window.startDinoRunnerGame = startDinoRunnerGame;
  window.stopDinoRunnerGame = stopDinoRunnerGame;
})();
