/**
 * CODE RUNNERS — 사운드 (CC0 / Mixkit License 계열 무료 에셋)
 * BGM: Kenney Music Loops (CC0) — Night at the Beach, Space Cadet
 * SFX: Kenney Interface Sounds (CC0), sfxmint ready-coin-05 (CC0)
 */
(function () {
  "use strict";

  const PATH = {
    bgmLobby: "audio/bgm_lobby.ogg",
    bgmGame: "audio/bgm_game.ogg",
    heal: "audio/sfx_heal.ogg",
    hit: "audio/sfx_hit.ogg",
    score: "audio/sfx_score.mp3",
  };

  const SETTINGS_KEY = "codeRunnersAudioSettings";

  const GameAudio = {
    unlocked: false,
    muted: false,
    enabled: { bgm: true, sfx: true },
    volume: { bgm: 0.42, sfx: 0.72 },
    bgmLobby: null,
    bgmGame: null,
    sfx: {},
    currentBgm: null,
    lastBgmKind: "lobby",

    init() {
      this.bgmLobby = this.makeLoop(PATH.bgmLobby);
      this.bgmGame = this.makeLoop(PATH.bgmGame);
      this.sfx = {
        heal: this.makeOneShot(PATH.heal),
        hit: this.makeOneShot(PATH.hit),
        score: this.makeOneShot(PATH.score),
      };
      this.loadSettings();
      this.applyBgmVolume();
    },

    loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        const o = JSON.parse(raw);
        if (typeof o.bgm === "boolean") this.enabled.bgm = o.bgm;
        if (typeof o.sfx === "boolean") this.enabled.sfx = o.sfx;
        if (typeof o.bgmVol === "number" && o.bgmVol >= 0 && o.bgmVol <= 1) {
          this.volume.bgm = o.bgmVol;
        }
        if (typeof o.sfxVol === "number" && o.sfxVol >= 0 && o.sfxVol <= 1) {
          this.volume.sfx = o.sfxVol;
        }
      } catch (_) {
        /* ignore */
      }
    },

    saveSettings() {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          bgm: this.enabled.bgm,
          sfx: this.enabled.sfx,
          bgmVol: this.volume.bgm,
          sfxVol: this.volume.sfx,
        })
      );
    },

    setBgmEnabled(on) {
      this.enabled.bgm = !!on;
      this.saveSettings();
      if (!this.enabled.bgm) {
        this.pauseBgm();
      } else if (this.unlocked && !this.muted) {
        this.playBgm(this.lastBgmKind);
      }
    },

    setSfxEnabled(on) {
      this.enabled.sfx = !!on;
      this.saveSettings();
    },

    setBgmVolume(v) {
      this.volume.bgm = Math.max(0, Math.min(1, v));
      this.applyBgmVolume();
      this.saveSettings();
    },

    setSfxVolume(v) {
      this.volume.sfx = Math.max(0, Math.min(1, v));
      this.saveSettings();
    },

    makeLoop(src) {
      const a = new Audio(src);
      a.loop = true;
      a.preload = "auto";
      return a;
    },

    makeOneShot(src) {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    },

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      [this.bgmLobby, this.bgmGame, ...Object.values(this.sfx)].forEach((a) => {
        a.load();
      });
    },

    setMuted(next) {
      this.muted = next;
      if (this.muted) {
        this.pauseBgm();
      } else if (this.unlocked) {
        const screen = document.getElementById("screen-game");
        const inGame = screen && !screen.classList.contains("hidden");
        this.playBgm(inGame ? "game" : "lobby");
      }
      return this.muted;
    },

    toggleMuted() {
      return this.setMuted(!this.muted);
    },

    applyBgmVolume() {
      if (this.bgmLobby) this.bgmLobby.volume = this.volume.bgm;
      if (this.bgmGame) this.bgmGame.volume = this.volume.bgm;
    },

    playBgm(kind) {
      this.lastBgmKind = kind === "game" ? "game" : "lobby";
      if (!this.unlocked || this.muted || !this.enabled.bgm) return;
      const next = kind === "game" ? this.bgmGame : this.bgmLobby;
      if (this.currentBgm === next && !next.paused) return;

      [this.bgmLobby, this.bgmGame].forEach((track) => {
        track.pause();
        track.currentTime = 0;
      });

      this.applyBgmVolume();
      next.play().catch(() => {});
      this.currentBgm = next;
    },

    pauseBgm() {
      [this.bgmLobby, this.bgmGame].forEach((track) => track.pause());
    },

    resumeBgm() {
      if (!this.unlocked || this.muted || !this.enabled.bgm || !this.currentBgm) return;
      this.currentBgm.play().catch(() => {});
    },

    playSfx(name) {
      if (!this.unlocked || this.muted || !this.enabled.sfx) return;
      const base = this.sfx[name];
      if (!base) return;
      const clip = base.cloneNode();
      clip.volume = this.volume.sfx;
      clip.play().catch(() => {});
    },
  };

  GameAudio.init();
  window.GameAudio = GameAudio;
})();
