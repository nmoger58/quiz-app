/**
 * Authoritative 30-Second Quiz Timer
 * Driven by absolute deadline timestamps for rock-solid cross-screen synchronization.
 */

class QuizTimer {
  constructor(options = {}) {
    this.durationMs = options.durationMs || 30000;
    this.onTick = options.onTick || (() => {});
    this.onTimeout = options.onTimeout || (() => {});
    this.onWarning = options.onWarning || (() => {});

    this.deadlineAt = null;
    this.remainingMs = this.durationMs;
    this.paused = false;
    this.pausedRemainingMs = this.durationMs;

    this.intervalId = null;
    this.timeoutFired = false;
    this.warned5s = false;
  }

  start(durationMs = null) {
    this.stop();
    if (durationMs) {
      this.durationMs = durationMs;
    }
    this.remainingMs = this.durationMs;
    this.pausedRemainingMs = this.durationMs;
    this.deadlineAt = Date.now() + this.durationMs;
    this.paused = false;
    this.timeoutFired = false;
    this.warned5s = false;

    this._tick();
    this.intervalId = setInterval(() => this._tick(), 100);
  }

  pause() {
    if (this.paused || !this.deadlineAt) return;
    this.pausedRemainingMs = Math.max(0, this.deadlineAt - Date.now());
    this.remainingMs = this.pausedRemainingMs;
    this.paused = true;
    this.deadlineAt = null;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onTick({
      remainingMs: this.remainingMs,
      remainingSec: Math.ceil(this.remainingMs / 1000),
      fraction: this.remainingMs / this.durationMs,
      paused: true
    });
  }

  resume() {
    if (!this.paused) return;
    this.deadlineAt = Date.now() + this.pausedRemainingMs;
    this.paused = false;
    this._tick();
    this.intervalId = setInterval(() => this._tick(), 100);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.deadlineAt = null;
    this.paused = false;
    this.timeoutFired = true; // prevent late firing
  }

  syncWithDeadline(deadlineAt, paused, pausedRemainingMs) {
    this.paused = !!paused;
    this.deadlineAt = deadlineAt;
    this.pausedRemainingMs = pausedRemainingMs;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.paused) {
      this.remainingMs = this.pausedRemainingMs;
      this.onTick({
        remainingMs: this.remainingMs,
        remainingSec: Math.ceil(this.remainingMs / 1000),
        fraction: this.remainingMs / this.durationMs,
        paused: true
      });
    } else if (this.deadlineAt) {
      this.remainingMs = Math.max(0, this.deadlineAt - Date.now());
      this._tick();
      this.intervalId = setInterval(() => this._tick(), 100);
    }
  }

  _tick() {
    if (this.paused) return;

    if (!this.deadlineAt) {
      this.remainingMs = 0;
    } else {
      this.remainingMs = Math.max(0, this.deadlineAt - Date.now());
    }

    const remainingSec = Math.ceil(this.remainingMs / 1000);
    const fraction = Math.max(0, Math.min(1, this.remainingMs / this.durationMs));

    // 5-second warning alert
    if (remainingSec <= 5 && remainingSec > 0 && !this.warned5s) {
      this.warned5s = true;
      this.onWarning(remainingSec);
    }

    this.onTick({
      remainingMs: this.remainingMs,
      remainingSec: remainingSec,
      fraction: fraction,
      paused: this.paused
    });

    if (this.remainingMs <= 0 && !this.timeoutFired) {
      this.timeoutFired = true;
      this.stop();
      this.onTimeout();
    }
  }

  getSnapshot() {
    return {
      durationMs: this.durationMs,
      deadlineAt: this.deadlineAt,
      remainingMs: this.remainingMs,
      paused: this.paused,
      pausedRemainingMs: this.pausedRemainingMs
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuizTimer };
}
