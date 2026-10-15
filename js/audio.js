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

  const GameAudio = {
    unlocked: false,
    muted: false,
    volume: { bgm: 0.42, sfx: 0.72 },
    bgmLobby: null,
    bgmGame: null,
    sfx: {},
    currentBgm: null,

    init() {
      this.bgmLobby = this.makeLoop(PATH.bgmLobby);
      this.bgmGame = this.makeLoop(PATH.bgmGame);
      this.sfx = {
        heal: this.makeOneShot(PATH.heal),
        hit: this.makeOneShot(PATH.hit),
        score: this.makeOneShot(PATH.score),
      };
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
      if (!this.unlocked || this.muted) return;
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
      if (!this.unlocked || this.muted || !this.currentBgm) return;
      this.currentBgm.play().catch(() => {});
    },

    playSfx(name) {
      if (!this.unlocked || this.muted) return;
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
