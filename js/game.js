(function () {
  "use strict";

  const INVINCIBLE_MS = 1500;
  const JUMP_MS = 550;
  const COIN_SCORE = 100;
  const JUMP_DODGE_SCORE = 20;
  const STORAGE_KEY = "codeRunnersBest";

  const ENTITY_ASSETS = {
    virus: "assets/entities/virus.png",
    vaccine: "assets/entities/vaccine.png",
    coin: "assets/entities/coin.png",
  };

  const ENTITY_ALT = {
    virus: "바이러스",
    vaccine: "백신",
    coin: "코인",
  };

  const CHARACTERS = {
    piya: {
      name: "삐야",
      prefix: "ppiya",
      trailClass: "trail-piya",
      maxHp: 3,
      hitExtendAbovePx: 0,
      hitExtendAboveRatio: 0,
      hitExtendBelowPx: 0,
    },
    oru: {
      name: "오르",
      prefix: "oru",
      trailClass: "trail-oru",
      maxHp: 5,
      hitExtendAbovePx: 0,
      hitExtendAboveRatio: 0.59,
      hitExtendBelowPx: 0,
    },
  };

  const ANIM_FRAME_MS = {
    run: 85,
    heal: 130,
    hit: 110,
  };

  const speedSteps = [
    { at: 0, mult: 1.0 },
    { at: 30, mult: 1.2 },
    { at: 60, mult: 1.5 },
    { at: 90, mult: 1.8 },
    { at: 120, mult: 2.1 },
  ];

  function sfx() {
    return window.GameAudio;
  }

  function bootAudio() {
    const a = sfx();
    if (!a) return;
    a.unlock();
    if (!a.muted) a.playBgm("lobby");
  }

  function syncMuteButtons() {
    const a = sfx();
    if (!a) return;
    const icon = a.muted ? "🔇" : "🔊";
    document.querySelectorAll(".btn-mute").forEach((btn) => {
      btn.textContent = icon;
      btn.classList.toggle("is-muted", a.muted);
      btn.setAttribute("aria-pressed", a.muted ? "true" : "false");
    });
  }

  function toggleMute() {
    const a = sfx();
    if (!a) return;
    if (!a.unlocked) bootAudio();
    a.toggleMuted();
    syncMuteButtons();
  }

  const el = {
    screenTitle: document.getElementById("screen-title"),
    screenGame: document.getElementById("screen-game"),
    screenGameover: document.getElementById("screen-gameover"),
    btnStart: document.getElementById("btn-start"),
    charCards: document.querySelectorAll(".char-card"),
    hearts: document.getElementById("hearts"),
    score: document.getElementById("score-value"),
    distance: document.getElementById("distance-value"),
    btnPause: document.getElementById("btn-pause"),
    pauseOverlay: document.getElementById("pause-overlay"),
    player: document.getElementById("player"),
    playerFloats: document.getElementById("player-floats"),
    playerImg: document.getElementById("player-img"),
    scoreBlock: document.querySelector(".score-block"),
    entities: document.getElementById("entities"),
    track: document.querySelector(".track"),
    gridFloor: document.querySelector(".grid-floor"),
    finalScore: document.getElementById("final-score"),
    bestScore: document.getElementById("best-score"),
    btnRestart: document.getElementById("btn-restart"),
    btnChangeChar: document.getElementById("btn-change-char"),
  };

  let selectedChar = null;
  let state = "title";
  let hp = 0;
  let score = 0;
  let distanceM = 0;
  let elapsed = 0;
  let invincibleUntil = 0;
  let lane = 1;
  let jumping = false;
  let jumpEnds = 0;
  let entities = [];
  let spawnTimer = 0;
  let lastTs = 0;
  let animId = null;
  /** @type {"run"|"heal"|"hit"} */
  let playerAnimState = "run";
  let playerAnimFrame = 0;
  let playerAnimAcc = 0;

  function spritePaths(key) {
    const prefix = CHARACTERS[key].prefix;
    const seq = (tag, n) =>
      Array.from({ length: n }, (_, i) => `${prefix}_${tag}_0${i + 1}.png`);
    return {
      front: `${prefix}_front.png`,
      run: seq("run", 5),
      heal: seq("heal", 3),
      hit: seq("obstacle", 3),
    };
  }

  function preloadCharSprites(key) {
    const paths = spritePaths(key);
    [paths.front, ...paths.run, ...paths.heal, ...paths.hit].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  function preloadEntitySprites() {
    Object.values(ENTITY_ASSETS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  function currentSpriteList() {
    const s = spritePaths(selectedChar);
    if (playerAnimState === "heal") return s.heal;
    if (playerAnimState === "hit") return s.hit;
    return s.run;
  }

  function applyPlayerFrame() {
    if (!selectedChar) return;
    const list = currentSpriteList();
    const idx = Math.min(playerAnimFrame, list.length - 1);
    const nextSrc = list[idx];
    if (!el.playerImg.src.endsWith(nextSrc)) {
      el.playerImg.src = nextSrc;
    }
  }

  function playPlayerAnim(state) {
    playerAnimState = state;
    playerAnimFrame = 0;
    playerAnimAcc = 0;
    applyPlayerFrame();
  }

  function updatePlayerAnimation(dt) {
    if (!selectedChar || state !== "playing") return;
    const list = currentSpriteList();
    const frameMs = ANIM_FRAME_MS[playerAnimState === "run" ? "run" : playerAnimState];
    playerAnimAcc += dt * 1000;

    while (playerAnimAcc >= frameMs) {
      playerAnimAcc -= frameMs;
      playerAnimFrame += 1;

      if (playerAnimState === "run") {
        playerAnimFrame %= list.length;
      } else if (playerAnimFrame >= list.length) {
        playerAnimState = "run";
        playerAnimFrame = 0;
        playerAnimAcc = 0;
        if (performance.now() < invincibleUntil) {
          el.player.classList.add("invincible");
        }
        break;
      }
    }
    applyPlayerFrame();
  }

  function laneToPercent(l) {
    return [16.66, 50, 83.33][l];
  }

  function getSpeedMult() {
    let m = speedSteps[0].mult;
    for (const step of speedSteps) {
      if (elapsed >= step.at) m = step.mult;
    }
    return m;
  }

  function updateGridSpeed() {
    const mult = getSpeedMult();
    const dur = Math.max(0.35, 1.2 / mult);
    el.gridFloor.style.animationDuration = dur + "s";
  }

  function maxHp() {
    return CHARACTERS[selectedChar].maxHp;
  }

  function renderHearts() {
    const max = maxHp();
    el.hearts.innerHTML = "";
    for (let i = 0; i < max; i++) {
      const h = document.createElement("span");
      h.className = "heart" + (i < hp ? " on" : "");
      el.hearts.appendChild(h);
    }
  }

  function showScreen(name) {
    el.screenTitle.classList.toggle("hidden", name !== "title");
    el.screenGame.classList.toggle("hidden", name !== "game");
    el.screenGameover.classList.toggle("hidden", name !== "gameover");
    state = name;
    const a = sfx();
    if (a && a.unlocked && !a.muted) {
      a.playBgm(name === "game" ? "game" : "lobby");
    }
  }

  function selectCharacter(key) {
    selectedChar = key;
    el.charCards.forEach((card) => {
      card.classList.toggle("selected", card.dataset.char === key);
    });
    el.btnStart.disabled = !selectedChar;
    preloadCharSprites(key);
    bootAudio();
  }

  function setupPlayerVisual() {
    const c = CHARACTERS[selectedChar];
    el.playerImg.alt = c.name;
    el.player.classList.remove("trail-piya", "trail-oru", "invincible");
    el.player.classList.add(c.trailClass);
    el.player.style.left = laneToPercent(lane) + "%";
    playPlayerAnim("run");
  }

  function clearEntities() {
    entities.forEach((e) => e.dom.remove());
    entities = [];
  }

  function startGame() {
    if (!selectedChar) return;
    bootAudio();
    hp = maxHp();
    score = 0;
    distanceM = 0;
    elapsed = 0;
    invincibleUntil = 0;
    lane = 1;
    jumping = false;
    spawnTimer = 0;
    lastTs = 0;
    clearEntities();
    setupPlayerVisual();
    renderHearts();
    el.score.textContent = "0";
    el.distance.textContent = "0m";
    el.pauseOverlay.classList.add("hidden");
    showScreen("game");
    updateGridSpeed();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function endGame() {
    cancelAnimationFrame(animId);
    animId = null;
    const best = Math.max(score, loadBest());
    localStorage.setItem(STORAGE_KEY, String(best));
    el.finalScore.textContent = score;
    el.bestScore.textContent = best;
    showScreen("gameover");
  }

  function loadBest() {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }

  function moveLane(dir) {
    if (state !== "playing") return;
    const next = lane + dir;
    if (next < 0 || next > 2) return;
    lane = next;
    el.player.style.left = laneToPercent(lane) + "%";
  }

  function doJump() {
    if (state !== "playing" || jumping) return;
    jumping = true;
    jumpEnds = performance.now() + JUMP_MS;
    el.player.classList.add("jumping");
    setTimeout(() => {
      el.player.classList.remove("jumping");
      jumping = false;
    }, JUMP_MS);
  }

  function spawnRow() {
    const types = ["virus", "virus", "vaccine", "coin", "coin"];
    const row = [];
    const blocked = new Set();

    const virusCount = Math.random() < 0.55 ? 1 : 2;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);

    for (let i = 0; i < virusCount; i++) {
      blocked.add(lanes[i]);
    }
    if (blocked.size >= 3) {
      blocked.delete(lanes[2]);
    }

    blocked.forEach((ln) => {
      row.push(createEntity("virus", ln));
    });

    if (Math.random() < 0.35) {
      const free = [0, 1, 2].filter((l) => !blocked.has(l));
      if (free.length) {
        const ln = free[Math.floor(Math.random() * free.length)];
        const kind = types[Math.floor(Math.random() * types.length)];
        if (kind !== "virus") row.push(createEntity(kind, ln));
      }
    }

    if (Math.random() < 0.25) {
      const ln = Math.floor(Math.random() * 3);
      if (!row.some((e) => e.lane === ln && e.kind === "virus")) {
        row.push(createEntity("coin", ln));
      }
    }

    entities.push(...row);
  }

  function createEntity(kind, laneIndex) {
    const dom = document.createElement("div");
    dom.className = "entity " + kind;
    const img = document.createElement("img");
    img.src = ENTITY_ASSETS[kind];
    img.alt = ENTITY_ALT[kind];
    img.draggable = false;
    img.decoding = "async";
    dom.appendChild(img);
    el.entities.appendChild(dom);
    return {
      kind,
      lane: laneIndex,
      y: -8,
      dom,
      scoredDodge: false,
      collected: false,
    };
  }

  function playerHitbox() {
    const c = CHARACTERS[selectedChar];
    const track = el.track;
    const img = el.playerImg;
    if (!c || !track || !img) {
      return { lane, yMin: 84, yMax: 90 };
    }

    const tr = track.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    if (tr.height <= 0 || ir.height <= 0) {
      return { lane, yMin: 84, yMax: 90 };
    }

    const extendAbove =
      (c.hitExtendAbovePx ?? 0) + (c.hitExtendAboveRatio ?? 0) * ir.height;
    const extendBelow = c.hitExtendBelowPx ?? 0;

    const topPx = ir.top - tr.top - extendAbove;
    const bottomPx = ir.bottom - tr.top + extendBelow;

    return {
      lane,
      yMin: (topPx / tr.height) * 100,
      yMax: (bottomPx / tr.height) * 100,
    };
  }

  function entityHitsPlayer(ent) {
    if (ent.collected) return false;
    const pb = playerHitbox();
    if (ent.lane !== pb.lane) return false;
    let yMin = pb.yMin;
    let yMax = pb.yMax;
    if (ent.kind === "coin" || ent.kind === "vaccine") {
      yMin -= 6;
      yMax += 4;
    }
    if (ent.y < yMin || ent.y > yMax) return false;
    if (ent.kind === "virus" && jumping) return false;
    return true;
  }

  function onVirusHit() {
    const now = performance.now();
    if (now < invincibleUntil) return;
    hp -= 1;
    invincibleUntil = now + INVINCIBLE_MS;
    el.player.classList.remove("invincible");
    playPlayerAnim("hit");
    if (sfx()) sfx().playSfx("hit");
    setTimeout(() => el.player.classList.remove("invincible"), INVINCIBLE_MS);
    renderHearts();
    if (hp <= 0) endGame();
  }

  function showFloatingScore(points) {
    const label = document.createElement("span");
    label.className = "float-score";
    label.textContent = "+" + points;
    el.playerFloats.appendChild(label);
    label.addEventListener("animationend", () => label.remove());

    el.player.classList.remove("coin-pop");
    void el.player.offsetWidth;
    el.player.classList.add("coin-pop");
    setTimeout(() => el.player.classList.remove("coin-pop"), 360);

    el.scoreBlock.classList.remove("score-bump");
    void el.scoreBlock.offsetWidth;
    el.scoreBlock.classList.add("score-bump");
    if (sfx()) sfx().playSfx("score");
  }

  function collectItem(ent) {
    ent.collected = true;
    ent.dom.remove();
    if (ent.kind === "vaccine") {
      hp = Math.min(maxHp(), hp + 1);
      renderHearts();
      playPlayerAnim("heal");
      if (sfx()) sfx().playSfx("heal");
    } else if (ent.kind === "coin") {
      score += COIN_SCORE;
      el.score.textContent = String(score);
      showFloatingScore(COIN_SCORE);
    }
  }

  function loop(ts) {
    if (state !== "playing" && state !== "game") {
      return;
    }
    if (state === "game") state = "playing";

    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;

    updatePlayerAnimation(dt);

    elapsed += dt;
    distanceM += dt * getSpeedMult() * 10;
    score += Math.floor(dt * getSpeedMult() * 10);
    el.score.textContent = String(score);
    el.distance.textContent = Math.floor(distanceM) + "m";
    updateGridSpeed();

    spawnTimer -= dt;
    const spawnInterval = Math.max(0.55, 1.35 / getSpeedMult());
    if (spawnTimer <= 0) {
      spawnRow();
      spawnTimer = spawnInterval;
    }

    const fallSpeed = 42 * getSpeedMult();

    entities = entities.filter((ent) => {
      if (ent.collected) return false;
      ent.y += fallSpeed * dt;
      ent.dom.style.left = laneToPercent(ent.lane) + "%";
      ent.dom.style.top = ent.y + "%";

      if (ent.kind === "virus" && jumping && ent.lane === lane && !ent.scoredDodge) {
        if (ent.y > 70 && ent.y < 85) {
          ent.scoredDodge = true;
          score += JUMP_DODGE_SCORE;
          el.score.textContent = String(score);
        }
      }

      if (entityHitsPlayer(ent)) {
        if (ent.kind === "virus") {
          onVirusHit();
          ent.dom.remove();
          return false;
        }
        collectItem(ent);
        return false;
      }

      if (ent.y > 105) {
        ent.dom.remove();
        return false;
      }
      return true;
    });

    if (hp > 0) animId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      cancelAnimationFrame(animId);
      animId = null;
      el.pauseOverlay.classList.remove("hidden");
      if (sfx()) sfx().pauseBgm();
    } else if (state === "paused") {
      state = "playing";
      el.pauseOverlay.classList.add("hidden");
      lastTs = 0;
      if (sfx()) sfx().resumeBgm();
      animId = requestAnimationFrame(loop);
    }
  }

  el.charCards.forEach((card) => {
    card.addEventListener("click", () => selectCharacter(card.dataset.char));
  });
  el.btnStart.addEventListener("click", startGame);
  document.querySelectorAll(".btn-mute").forEach((btn) => {
    btn.addEventListener("click", toggleMute);
  });
  el.btnPause.addEventListener("click", togglePause);
  el.btnRestart.addEventListener("click", startGame);
  el.btnChangeChar.addEventListener("click", () => {
    showScreen("title");
    state = "title";
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      e.preventDefault();
      moveLane(-1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      e.preventDefault();
      moveLane(1);
    } else if (e.code === "ArrowUp" || e.code === "Space") {
      e.preventDefault();
      if (state === "paused") togglePause();
      else doJump();
    } else if (e.code === "Escape" && (state === "playing" || state === "paused")) {
      togglePause();
    }
  });

  el.btnStart.disabled = true;
  preloadEntitySprites();
  syncMuteButtons();
})();
