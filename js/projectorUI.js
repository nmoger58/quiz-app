/**
 * Projector Display UI Controller
 * Read-only audience interface optimized for large screens & projectors (16:9).
 * Synchronizes with teacher console via BroadcastChannel / LocalStorage / WebSocket.
 */

class ProjectorUI {
  constructor(transport) {
    this.transport = transport;
    this.state = null;
    this.timerInterval = null;
    this.currentRevision = 0;

    this._bindEvents();
  }

  init() {
    this.renderWaitingScreen();
    this._startLocalTimerLoop();
  }

  _bindEvents() {
    if (this.transport) {
      this.transport.subscribe((msg, source) => {
        this.handleIncomingEvent(msg, source);
      });
    }

    // Toggle fullscreen with F key or click
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      }
    });
  }

  handleIncomingEvent(msg, source) {
    if (!msg) return;

    if (msg.type === 'TRANSPORT_STATUS_CHANGED') {
      this.updateConnectionPill(msg.payload);
      return;
    }

    // Process state update
    if (msg.state) {
      // Ignore stale revisions
      if (msg.revision && msg.revision < this.currentRevision) {
        return;
      }
      this.currentRevision = msg.revision || this.currentRevision + 1;
      this.state = msg.state;
      this.render();
    }
  }

  _startLocalTimerLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.state || !this.state.timer) return;

      const timer = this.state.timer;
      const secEl = document.getElementById('projectorTimerSec');
      const barEl = document.getElementById('projectorTimerBar');
      if (!secEl) return;

      let remainingMs = 0;
      if (timer.paused) {
        remainingMs = timer.pausedRemainingMs || timer.remainingMs || 0;
      } else if (timer.deadlineAt) {
        remainingMs = Math.max(0, timer.deadlineAt - Date.now());
      }

      const sec = Math.ceil(remainingMs / 1000);
      secEl.innerText = sec < 10 ? `00:0${sec}` : `00:${sec}`;

      const pct = Math.max(0, Math.min(100, (remainingMs / (timer.durationMs || 30000)) * 100));
      if (barEl) {
        barEl.style.width = `${pct}%`;
        if (sec <= 5) {
          barEl.className = 'progress-bar bg-danger';
          secEl.className = 'display-4 fw-bold font-monospace text-danger animate__animated animate__pulse animate__infinite';
        } else if (sec <= 15) {
          barEl.className = 'progress-bar bg-warning';
          secEl.className = 'display-4 fw-bold font-monospace text-warning';
        } else {
          barEl.className = 'progress-bar bg-info';
          secEl.className = 'display-4 fw-bold font-monospace text-light';
        }
      }
    }, 100);
  }

  render() {
    if (!this.state) {
      this.renderWaitingScreen();
      return;
    }

    const phase = this.state.display ? this.state.display.phase : 'waiting';

    if (phase === 'passing') {
      this.renderPassingTransition();
    } else if (phase === 'section_leaderboard') {
      this.renderSectionLeaderboard();
    } else if (phase === 'finale_podium') {
      this.renderFinalePodium();
    } else if (phase === 'answer_revealed') {
      this.renderActiveQuestion(true);
    } else if (phase === 'question') {
      this.renderActiveQuestion(false);
    } else {
      this.renderWaitingScreen();
    }
  }

  // ==========================================
  // LAYOUT A: WAITING SCREEN
  // ==========================================
  renderWaitingScreen() {
    const root = document.getElementById('projectorApp');
    if (!root) return;

    const sessionId = this.transport ? this.transport.sessionId : 'KA-DEMO';

    root.innerHTML = `
      <div class="projector-waiting-screen d-flex flex-column justify-content-center align-items-center text-center p-5 min-vh-100">
        <div class="kannada-header-badge mb-4">
          <span class="badge bg-danger text-warning px-5 py-3 fs-4 rounded-pill border border-warning shadow-lg animate__animated animate__pulse animate__infinite">
            ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ • KANNADA QUIZ ARENA
          </span>
        </div>

        <h1 class="display-2 font-kannada text-warning fw-bold text-shadow my-3">
          ಜ್ಞಾನವೇ ಶಕ್ತಿ – ಗೆಲುವೇ ಗುರಿ!
        </h1>
        <p class="fs-3 text-light opacity-80 mb-5">
          ರಾಜ್ಯ ಮಟ್ಟದ ಅಂತರ-ಕಾಲೇಜು ರಸಪ್ರಶ್ನೆ ಚಾಂಪಿಯನ್‌ಷಿಪ್
        </p>

        <div class="card glass-card p-4 shadow-lg border-warning border-opacity-50 text-center" style="min-width: 460px;">
          <div class="spinner-grow text-warning mb-3" style="width: 3.5rem; height: 3.5rem;" role="status"></div>
          <h3 class="font-kannada text-light mb-2">ಶೀಘ್ರದಲ್ಲೇ ಸ್ಪರ್ಧೆ ಆರಂಭವಾಗಲಿದೆ...</h3>
          <p class="text-secondary mb-3">ಶಿಕ್ಷಕರು ಪ್ರಶ್ನೆಯನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿದ ತಕ್ಷಣ ಇಲ್ಲಿ ಮೂಡಿಬರಲಿದೆ.</p>
          <div class="badge bg-dark border border-secondary text-warning font-monospace fs-5 py-2 px-4">
            SESSION: ${sessionId}
          </div>
        </div>

        ${this._getProjectorFooterHtml()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // LAYOUT B & D: ACTIVE QUESTION / ANSWER REVEAL
  // ==========================================
  renderActiveQuestion(isRevealed = false) {
    const root = document.getElementById('projectorApp');
    if (!root || !this.state) return;

    const q = this.state.question;
    const attempt = this.state.attempt;
    const activeTeam = this.state.teams[this.state.rotation.activeTeamIndex];
    const catName = this.state.currentCategoryName || q.category;
    const qNum = this.state.currentQuestionIndex + 1;
    const remainingCount = q.availableOptions.length;
    const currentPoints = ScoringSystem.getPointsForAttempt(remainingCount, attempt.attemptNumber);

    root.innerHTML = `
      <div class="projector-container d-flex flex-column min-vh-100 p-4">
        <!-- TOP BROADCAST HEADER -->
        <header class="projector-header d-flex justify-content-between align-items-center pb-3 border-bottom border-secondary mb-3">
          <div class="d-flex align-items-center">
            <span class="fs-1 me-3">🚩</span>
            <div>
              <h2 class="font-kannada text-warning fw-bold mb-0">ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ</h2>
              <span class="badge bg-danger text-warning fs-5 px-3 py-1 rounded-pill">
                ವಿಭಾಗ: ${catName} | ಪ್ರಶ್ನೆ ${qNum}
              </span>
            </div>
          </div>

          <!-- ACTIVE TEAM PROMINENT BANNER -->
          <div class="active-team-pill bg-dark border border-warning px-4 py-2 rounded-pill shadow-lg text-center">
            <div class="text-secondary small uppercase fw-bold" style="letter-spacing: 1px;">NOW PLAYING • ನಿಮ್ಮ ಸರದಿ!</div>
            <h2 class="font-kannada text-warning fw-bold mb-0">${activeTeam ? activeTeam.name : attempt.teamName}</h2>
          </div>

          <!-- POINTS & ATTEMPT BADGES -->
          <div class="d-flex align-items-center gap-3">
            <div class="text-end">
              <div class="text-secondary small">ಅಂಕಗಳು (Points)</div>
              <span class="badge bg-success fs-3 px-3 py-1">+${currentPoints}</span>
            </div>
            <div class="text-end">
              <div class="text-secondary small">ಯತ್ನ (Attempt)</div>
              <span class="badge bg-dark border border-secondary text-light fs-3 px-3 py-1">${attempt.attemptNumber}</span>
            </div>
          </div>
        </header>

        <!-- MAIN QUESTION & VISUAL AREA -->
        <div class="projector-main-body flex-grow-1 d-flex flex-column justify-content-center">
          
          <!-- Photo Display for Guess the Photo -->
          ${q.type === 'photo' && q.image ? `
            <div class="projector-photo-wrap text-center mb-3">
              <img src="${q.image}" alt="Quiz Photo" class="projector-photo-img rounded border border-warning shadow-lg"
                style="max-height: 280px; width: auto; object-fit: contain;">
            </div>
          ` : ''}

          <!-- Large Question Box -->
          <div class="projector-question-card p-4 rounded-4 bg-dark bg-opacity-75 border border-secondary shadow-lg mb-4 text-center">
            <h1 class="display-6 font-kannada text-light fw-bold mb-0 lh-base text-shadow">
              ${q.text}
            </h1>
          </div>

          <!-- 4 LARGE AUDIENCE OPTION CARDS -->
          <div class="row g-4 projector-options-row">
            ${q.options.map((opt, idx) => {
              const label = String.fromCharCode(65 + idx);
              const isEliminated = q.eliminatedOptions.includes(opt);
              const isCorrect = (opt === q.correctAnswer);
              const isSelected = (opt === attempt.selectedOption);

              let cardStyle = "bg-dark bg-opacity-75 border-secondary";
              let badgeStyle = "bg-primary text-white";
              let textStyle = "text-light";

              if (isEliminated) {
                cardStyle = "bg-secondary bg-opacity-10 border-danger border-opacity-25 opacity-40";
                badgeStyle = "bg-secondary text-muted";
                textStyle = "text-muted text-decoration-line-through";
              } else if (isRevealed && isCorrect) {
                cardStyle = "bg-success bg-opacity-25 border-success border-3 shadow-lg animate__animated animate__pulse animate__infinite";
                badgeStyle = "bg-success text-white fw-bold";
                textStyle = "text-warning fw-bold";
              } else if (isRevealed && isSelected && !isCorrect) {
                cardStyle = "bg-danger bg-opacity-25 border-danger";
                badgeStyle = "bg-danger text-white";
                textStyle = "text-danger";
              }

              return `
                <div class="col-6">
                  <div class="card projector-option-card p-4 rounded-3 border ${cardStyle} h-100 position-relative shadow">
                    <div class="d-flex align-items-center">
                      <span class="badge ${badgeStyle} fs-2 px-3 py-2 me-4 rounded-2">${label}</span>
                      <span class="font-kannada fs-3 fw-bold ${textStyle}">${opt}</span>
                    </div>
                    ${isEliminated ? `
                      <span class="badge bg-danger position-absolute top-0 end-0 m-3 fs-6">ತೆಗೆದುಹಾಕಲಾಗಿದೆ</span>
                    ` : ''}
                    ${isRevealed && isCorrect ? `
                      <span class="badge bg-success position-absolute top-0 end-0 m-3 fs-5">✓ ಸರಿಯಾದ ಉತ್ತರ</span>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- ANSWER REVEAL CELEBRATION BANNER -->
          ${isRevealed ? `
            <div class="mt-4 p-4 rounded-4 alert ${attempt.result === 'CORRECT' ? 'alert-success' : 'alert-info'} border-3 shadow-lg text-center animate__animated animate__bounceIn">
              <h2 class="font-kannada fw-bold mb-1">
                ${attempt.result === 'CORRECT' ? `🎉 ಅದ್ಭುತ! ಸರಿಯಾದ ಉತ್ತರ!` : `ಸರಿಯಾದ ಉತ್ತರ: ${q.correctAnswer}`}
              </h2>
              ${attempt.result === 'CORRECT' ? `
                <div class="fs-3 font-kannada">
                  <strong>${attempt.teamName}</strong> ತಂಡಕ್ಕೆ <span class="badge bg-warning text-dark fs-3">+${attempt.pointsAwarded} ಅಂಕಗಳು!</span>
                </div>
              ` : ''}
              ${q.explanation ? `
                <p class="fs-5 text-light opacity-90 mt-2 mb-0">${q.explanation}</p>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- BOTTOM TIMER BAR & TEAMS ROTATION STRIP -->
        <footer class="projector-footer pt-3 border-top border-secondary mt-3">
          <div class="row align-items-center">
            <!-- Digital Timer & Bar -->
            <div class="col-md-4">
              <div class="d-flex align-items-center gap-3">
                <div id="projectorTimerSec" class="display-4 fw-bold font-monospace text-light">00:30</div>
                <div class="flex-grow-1">
                  <div class="progress bg-secondary bg-opacity-50" style="height: 14px;">
                    <div id="projectorTimerBar" class="progress-bar bg-info" style="width: 100%;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Compact Team Queue -->
            <div class="col-md-8 text-end">
              <div class="d-inline-flex flex-wrap gap-2 justify-content-end align-items-center">
                ${this.state.teams.map((t, idx) => {
                  const isActive = (idx === this.state.rotation.activeTeamIndex);
                  return `
                    <span class="badge ${isActive ? 'bg-warning text-dark fs-6 fw-bold border-warning shadow' : 'bg-dark border border-secondary text-secondary'} px-3 py-2">
                      ${t.name}: ${t.score} pts
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </footer>

        ${this._getProjectorFooterHtml()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // LAYOUT C: PASSING TRANSITION SCREEN
  // ==========================================
  renderPassingTransition() {
    const root = document.getElementById('projectorApp');
    if (!root || !this.state) return;

    const display = this.state.display;
    const nextTeamIdx = (this.state.rotation.activeTeamIndex + 1) % this.state.teams.length;
    const nextTeam = this.state.teams[nextTeamIdx];

    root.innerHTML = `
      <div class="projector-passing-screen d-flex flex-column justify-content-center align-items-center text-center p-5 min-vh-100 animate__animated animate__fadeIn">
        <div class="pass-warning-badge mb-4">
          <span class="badge bg-danger fs-1 px-5 py-3 rounded-pill border border-warning shadow-lg animate__animated animate__shakeX">
            ${display.passMessage || 'ತಪ್ಪು ಉತ್ತರ / ಸಮಯ ಮುಗಿದಿದೆ!'}
          </span>
        </div>

        <h3 class="text-secondary font-kannada mb-3">ಮುಂದಿನ ತಂಡಕ್ಕೆ ಅವಕಾಶ</h3>

        <div class="card glass-card p-5 border-warning shadow-lg my-3 animate__animated animate__zoomIn" style="min-width: 550px;">
          <div class="text-uppercase text-warning fw-bold small mb-2" style="letter-spacing: 2px;">NEXT UP</div>
          <h1 class="display-3 font-kannada text-warning fw-bold mb-2">
            ${nextTeam ? nextTeam.name : 'ಮುಂದಿನ ತಂಡ'}
          </h1>
          <div class="fs-3 text-light">ನಿಮ್ಮ ಸರದಿ! (Your Turn)</div>
        </div>

        <div class="spinner-border text-warning mt-4" style="width: 3rem; height: 3rem;" role="status"></div>

        ${this._getProjectorFooterHtml()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // LAYOUT E: SECTION LEADERBOARD SCREEN
  // ==========================================
  renderSectionLeaderboard() {
    const root = document.getElementById('projectorApp');
    if (!root || !this.state) return;

    const ranked = ScoringSystem.getRankedTeams(this.state.teams);
    const catName = this.state.currentCategoryName;

    root.innerHTML = `
      <div class="projector-leaderboard-screen p-5 min-vh-100 d-flex flex-column justify-content-center">
        <div class="text-center mb-4">
          <span class="badge bg-success px-4 py-2 fs-5 rounded-pill mb-2">ವಿಭಾಗ ಪೂರ್ಣಗೊಂಡಿದೆ!</span>
          <h1 class="display-4 font-kannada text-warning fw-bold mb-1">${catName} – ಅಂಕಪಟ್ಟಿ</h1>
          <p class="text-secondary fs-5">ಸಂಚಿತ ಅಂಕಗಳ ವಿವರ (Cumulative Standings)</p>
        </div>

        <!-- Top 3 Podium -->
        ${LeaderboardRenderer.renderPodiumHtml(ranked)}

        <div class="card glass-card p-4 mx-auto my-3 shadow-lg" style="max-width: 980px; width: 100%;">
          ${LeaderboardRenderer.renderTableHtml(ranked, this.state.currentCategoryId)}
        </div>

        ${this._getProjectorFooterHtml()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // LAYOUT F: FINAL PODIUM SCREEN
  // ==========================================
  renderFinalePodium() {
    const root = document.getElementById('projectorApp');
    if (!root || !this.state) return;

    const ranked = ScoringSystem.getRankedTeams(this.state.teams);
    const winner = ranked[0] || null;

    root.innerHTML = `
      <div class="projector-finale-screen p-5 min-vh-100 text-center d-flex flex-column justify-content-center">
        <div class="kannada-header-badge mb-3">
          <span class="badge bg-warning text-dark px-5 py-2 fs-4 rounded-pill fw-bold shadow">
            👑 ಮಹಾ ಫಲಿತಾಂಶ – GRAND FINALE
          </span>
        </div>

        <h1 class="display-3 font-kannada text-warning fw-bold text-shadow mb-1 animate__animated animate__tada">
          ಅಭಿನಂದನೆಗಳು! ನಮ್ಮ ಚಾಂಪಿಯನ್!
        </h1>
        <h3 class="text-light opacity-90 mb-4">ಜ್ಞಾನವೇ ಶಕ್ತಿ – ಗೆಲುವೇ ಗುರಿ!</h3>

        ${winner ? `
          <div class="winner-box card glass-card p-4 mx-auto my-3 border-warning shadow-lg animate__animated animate__zoomIn" style="max-width: 650px;">
            <div class="trophy-icon mb-2">🏆</div>
            <h1 class="display-4 font-kannada text-warning fw-bold mb-1">${winner.name}</h1>
            <div class="badge bg-success fs-3 px-4 py-2">${winner.score} ಅಂಕಗಳು</div>
          </div>
        ` : ''}

        ${LeaderboardRenderer.renderPodiumHtml(ranked, true)}

        <div class="card glass-card p-4 mx-auto my-3 shadow-lg" style="max-width: 1000px; width: 100%;">
          ${LeaderboardRenderer.renderTableHtml(ranked)}
        </div>

        ${this._getProjectorFooterHtml()}
      </div>
    `;

    LeaderboardRenderer.triggerConfetti();
    if (window.lucide) lucide.createIcons();
  }

  _getProjectorFooterHtml() {
    return `
      <div class="projector-screen-controls position-fixed bottom-0 end-0 m-3 d-flex align-items-center gap-2">
        <span id="projectorConnPill" class="badge bg-dark border border-secondary text-info px-3 py-2">
          ● ಪ್ರೊಜೆಕ್ಟರ್ ಸಕ್ರಿಯ
        </span>
        <button id="fullscreenToggleBtn" class="btn btn-outline-secondary btn-sm" onclick="projectorAppInstance.toggleFullscreen()" title="Full Screen (F)">
          <i data-lucide="maximize"></i>
        </button>
      </div>
    `;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  updateConnectionPill(status) {
    const pill = document.getElementById('projectorConnPill');
    if (!pill) return;
    if (status.wsConnected) {
      pill.className = 'badge bg-success px-3 py-2';
      pill.innerText = '● WebSocket ಸಂಪರ್ಕಿತ';
    } else if (status.localConnected) {
      pill.className = 'badge bg-info text-dark px-3 py-2';
      pill.innerText = '● ಲೋಕಲ್ ಟ್ಯಾಬ್ ಮೋಡ್';
    } else {
      pill.className = 'badge bg-danger px-3 py-2';
      pill.innerText = '● ಮರುಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...';
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ProjectorUI };
}
