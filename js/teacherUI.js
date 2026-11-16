/**
 * Teacher Console UI Controller
 * Manages all user interactions, modal dialogs, audio effects, and keyboard shortcuts.
 */

class TeacherUI {
  constructor(engine, questionManager, transport) {
    this.engine = engine;
    this.questionManager = questionManager;
    this.transport = transport;

    this.timerCircle = null;
    this.isAuditingOpen = false;
    this.isLeaderboardOpen = false;

    this._bindEvents();
    this._bindKeyboardShortcuts();
    this._initTransportStatus();
  }

  init() {
    this.render();
  }

  _bindEvents() {
    // Engine state subscriber
    this.engine.subscribe((state, eventType) => {
      this.handleStateUpdate(state, eventType);
    });

    // Transport listener
    if (this.transport) {
      this.transport.subscribe((msg) => {
        if (msg.type === 'TRANSPORT_STATUS_CHANGED') {
          this.updateTransportStatus(msg.payload);
        }
      });
    }
  }

  handleStateUpdate(state, eventType) {
    if (eventType === 'TIMER_TICK') {
      this.updateTimerDisplay(state.timer);
      return;
    }

    // Play sound effects according to events
    if (typeof soundManager !== 'undefined') {
      if (eventType === 'ANSWER_EVALUATED') {
        if (state.attempt.result === 'CORRECT') soundManager.playCorrect();
        else soundManager.playWrong();
      } else if (eventType === 'TEAM_PASSED') {
        if (state.attempt && state.attempt.result === 'WRONG') {
          soundManager.playWrong();
        } else {
          soundManager.playPass();
        }
      } else if (eventType === 'TIMEOUT_OCCURRED') {
        soundManager.playTimeout();
      } else if (eventType === 'QUESTION_EXHAUSTED') {
        soundManager.playWrong();
      } else if (eventType === 'GRAND_FINALE') {
        soundManager.playVictory();
        LeaderboardRenderer.triggerConfetti();
      }
    }

    this.render();
  }

  render() {
    const state = this.engine.state;
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (state.status === 'setup') {
      this.renderSetupScreen();
    } else if (state.status === 'category_select') {
      this.renderCategorySelection();
    } else if (state.status === 'section_complete') {
      this.renderSectionCompleteScreen();
    } else if (state.status === 'finished') {
      this.renderGrandFinaleScreen();
    } else {
      this.renderQuizDashboard();
    }
  }

  // ==========================================
  // SCREEN 1: TEAM REGISTRATION & SETUP
  // ==========================================
  renderSetupScreen() {
    const appEl = document.getElementById('app');
    const defaultTeamNames = [
      'ತಂಡ 1 (ಕದಂಬ)',
      'ತಂಡ 2 (ಚಾಲುಕ್ಯ)',
      'ತಂಡ 3 (ರಾಷ್ಟ್ರಕೂಟ)',
      'ತಂಡ 4 (ಹೊಯ್ಸಳ)',
      'ತಂಡ 5 (ವಿಜಯನಗರ)',
      'ತಂಡ 6 (ಒಡೆಯರ್)',
      'ತಂಡ 7 (ಗಂಗ)',
      'ತಂಡ 8 (ಬಹಮನಿ)'
    ];

    appEl.innerHTML = `
      <div class="landing-hero py-4 text-center">
        <div class="container">
          <div class="kannada-header-badge mb-3">
            <span class="badge bg-danger text-warning px-4 py-2 fs-6 rounded-pill border border-warning shadow">
              <i data-lucide="sparkles" class="inline-icon me-1"></i> ಕರ್ನಾಟಕ ರಾಜ್ಯ ಮಟ್ಟದ ಅಂತರ-ಕಾಲೇಜು ರಸಪ್ರಶ್ನೆ
            </span>
          </div>
          <h1 class="display-3 fw-bold kannada-title text-warning text-shadow mb-2">
            ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ
          </h1>
          <h4 class="text-light opacity-90 fw-semibold mb-4">
            ಜ್ಞಾನವೇ ಶಕ್ತಿ – ಗೆಲುವೇ ಗುರಿ! | KANNADA QUIZ ARENA
          </h4>
          <p class="lead text-secondary mx-auto mb-4" style="max-width: 680px;">
            ವೃತ್ತಾಕಾರದ ತಂಡಗಳ ಸರದಿ, ಹಂತ ಹಂತದ ಆಯ್ಕೆಗಳ ನಿಷ್ಕಾಸನ, ಮತ್ತು ನೈಜ-ಸಮಯದ ಪ್ರೊಜೆಕ್ಟರ್ ಪರದೆಯೊಂದಿಗೆ ಸಂಯೋಜಿತವಾದ ನೇರ ರಸಪ್ರಶ್ನೆ ವೇದಿಕೆ.
          </p>

          <div class="card glass-card mx-auto shadow-lg p-4 mb-5" style="max-width: 820px; text-align: left;">
            <div class="card-header bg-transparent border-bottom border-secondary d-flex justify-content-between align-items-center pb-3">
              <h4 class="text-warning mb-0 font-kannada">
                <i data-lucide="users" class="me-2 text-danger"></i> ಸ್ಪರ್ಧಾ ತಂಡಗಳ ನೋಂದಣಿ (Team Registration)
              </h4>
              <span class="badge bg-primary fs-6" id="teamCountBadge">8 ತಂಡಗಳು</span>
            </div>

            <div class="card-body pt-4">
              <div class="row align-items-center mb-4">
                <div class="col-md-6">
                  <label class="form-label text-light fw-bold">ಭಾಗವಹಿಸುವ ತಂಡಗಳ ಸಂಖ್ಯೆ (Number of Teams):</label>
                  <select id="teamCountSelect" class="form-select bg-dark text-warning border-warning">
                    ${[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => `
                      <option value="${n}" ${n === 8 ? 'selected' : ''}>${n} ತಂಡಗಳು (${n} Teams)</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-md-6 text-md-end mt-3 mt-md-0">
                  <button id="addTeamBtn" class="btn btn-outline-warning btn-sm me-2">
                    <i data-lucide="plus" class="me-1"></i> ತಂಡ ಸೇರಿಸಿ (+ Team)
                  </button>
                  <button id="resetTeamsBtn" class="btn btn-outline-danger btn-sm">
                    <i data-lucide="rotate-ccw" class="me-1"></i> ಮರುಹೊಂದಿಸಿ (Reset)
                  </button>
                </div>
              </div>

              <div id="teamInputsContainer" class="row g-3 mb-4">
                <!-- Dynamically generated team inputs -->
              </div>

              <div class="alert alert-dark border border-secondary text-light small d-flex align-items-center">
                <i data-lucide="info" class="me-2 text-warning flex-shrink-0"></i>
                <div>
                  <strong>ನ್ಯಾಯಸಮ್ಮತ ರಸಪ್ರಶ್ನೆ ನಿಯಮ:</strong> ಪ್ರತಿ ಹೊಸ ಪ್ರಶ್ನೆಯು ಮುಂದಿನ ತಂಡದಿಂದ ಆರಂಭವಾಗುತ್ತದೆ. ತಪ್ಪಾದ ಉತ್ತರಕ್ಕೆ ಆಯ್ಕೆಗಳು 4 → 3 → 2 ಕ್ಕೆ ಇಳಿಯುತ್ತವೆ (ಕನಿಷ್ಠ 2 ಆಯ್ಕೆಗಳು ಉಳಿಯುತ್ತವೆ).
                </div>
              </div>

              <div class="d-grid gap-2 d-md-flex justify-content-md-between align-items-center pt-3 border-top border-secondary">
                <button id="openProjectorFromSetup" class="btn btn-outline-info">
                  <i data-lucide="projector" class="me-1"></i> ಪ್ರೊಜೆಕ್ಟರ್ ಪರದೆ ತೆರೆಯಿರಿ (Open Projector)
                </button>
                <button id="startCompetitionBtn" class="btn btn-warning btn-lg px-5 fw-bold text-dark shadow pulse-btn">
                  ಸ್ಪರ್ಧೆ ಪ್ರಾರಂಭಿಸಿ (Start Competition) <i data-lucide="arrow-right" class="ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Render team inputs
    const renderTeamInputs = (count) => {
      const container = document.getElementById('teamInputsContainer');
      const badge = document.getElementById('teamCountBadge');
      if (badge) badge.innerText = `${count} ತಂಡಗಳು`;

      let html = '';
      for (let i = 0; i < count; i++) {
        const defaultName = defaultTeamNames[i] || `ತಂಡ ${i + 1}`;
        html += `
          <div class="col-md-6 team-input-row" data-index="${i}">
            <div class="input-group">
              <span class="input-group-text bg-secondary text-white fw-bold" style="width: 50px;">T${i + 1}</span>
              <input type="text" class="form-control bg-dark text-light border-secondary team-name-input" 
                value="${defaultName}" placeholder="ತಂಡ ${i + 1} ರ ಹೆಸರು" required>
              ${count > 2 ? `
                <button class="btn btn-outline-danger remove-single-team" data-index="${i}" title="ತೆಗೆದುಹಾಕಿ">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }
      container.innerHTML = html;
      if (window.lucide) lucide.createIcons();

      // Hook single team remove
      container.querySelectorAll('.remove-single-team').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          defaultTeamNames.splice(idx, 1);
          const sel = document.getElementById('teamCountSelect');
          if (sel) {
            sel.value = defaultTeamNames.length;
          }
          renderTeamInputs(defaultTeamNames.length);
        };
      });
    };

    renderTeamInputs(8);

    // Event listeners
    const teamSelect = document.getElementById('teamCountSelect');
    if (teamSelect) {
      teamSelect.onchange = (e) => {
        renderTeamInputs(parseInt(e.target.value, 10));
      };
    }

    const addBtn = document.getElementById('addTeamBtn');
    if (addBtn) {
      addBtn.onclick = () => {
        const currentCount = document.querySelectorAll('.team-input-row').length;
        if (currentCount >= 16) {
          Swal.fire({
            icon: 'warning',
            title: 'ಗರಿಷ್ಠ ಮಿತಿ',
            text: 'ಗರಿಷ್ಠ 16 ತಂಡಗಳನ್ನು ಮಾತ್ರ ಅನುಮತಿಸಲಾಗಿದೆ.'
          });
          return;
        }
        renderTeamInputs(currentCount + 1);
        if (teamSelect) teamSelect.value = currentCount + 1;
      };
    }

    const resetBtn = document.getElementById('resetTeamsBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (teamSelect) teamSelect.value = 8;
        renderTeamInputs(8);
      };
    }

    const projBtn = document.getElementById('openProjectorFromSetup');
    if (projBtn) {
      projBtn.onclick = () => this.openProjectorTab();
    }

    const startBtn = document.getElementById('startCompetitionBtn');
    if (startBtn) {
      startBtn.onclick = () => {
        const inputEls = document.querySelectorAll('.team-name-input');
        const names = Array.from(inputEls).map(inp => inp.value.trim());

        try {
          this.engine.setupTeams(names);
          this.engine.state.status = 'category_select';
          this.engine.notifyStateChange('CATEGORY_SCREEN');
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'ದೋಷ (Error)',
            text: err.message,
            confirmButtonColor: '#e11d48'
          });
        }
      };
    }
  }

  // ==========================================
  // SCREEN 2: CATEGORY SELECTION
  // ==========================================
  renderCategorySelection() {
    const appEl = document.getElementById('app');
    const state = this.engine.state;

    appEl.innerHTML = `
      ${this._getHeaderHtml('ವಿಭಾಗ ಆಯ್ಕೆ (Category Selection)')}

      <div class="container py-4">
        <div class="text-center mb-4">
          <h2 class="text-warning font-kannada fw-bold">ರಸಪ್ರಶ್ನೆ ವಿಭಾಗಗಳು (Quiz Categories)</h2>
          <p class="text-secondary">ಸ್ಪರ್ಧೆಯನ್ನು ಆರಂಭಿಸಲು ಕೆಳಗಿನ ಯಾವುದೇ ವಿಭಾಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:</p>
        </div>

        <div class="row g-4 justify-content-center">
          ${QUIZ_CATEGORIES.map((cat, idx) => {
            const questions = this.questionManager.getQuestionsByCategory(cat.id);
            const totalPoints = questions.length * 10;
            const isCompleted = state.teams.some(t => t.categoryScores && t.categoryScores[cat.id]);

            return `
              <div class="col-md-4 col-sm-6">
                <div class="card glass-card category-card h-100 p-4 border border-secondary text-center cursor-pointer"
                  data-catid="${cat.id}">
                  <div class="category-icon-wrapper mb-3 mx-auto" style="background-color: ${cat.color}22; color: ${cat.color};">
                    <i data-lucide="${cat.icon}" style="width: 44px; height: 44px;"></i>
                  </div>
                  <h4 class="text-light font-kannada fw-bold mb-1">${cat.name}</h4>
                  <div class="text-secondary small mb-3">${cat.englishName}</div>
                  <p class="text-muted small mb-3">${cat.description}</p>
                  
                  <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-secondary">
                    <span class="badge bg-dark border border-secondary text-light">
                      <i data-lucide="help-circle" class="me-1"></i> ${questions.length} ಪ್ರಶ್ನೆಗಳು
                    </span>
                    <span class="badge bg-warning text-dark fw-bold">
                      ಗರಿಷ್ಠ ${totalPoints} ಅಂಕ
                    </span>
                  </div>

                  <button class="btn btn-warning w-100 fw-bold mt-3 text-dark start-cat-btn" data-catid="${cat.id}">
                    ವಿಭಾಗ ಪ್ರಾರಂಭಿಸಿ <i data-lucide="play" class="ms-1"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this._attachHeaderEventListeners();

    document.querySelectorAll('.start-cat-btn, .category-card').forEach(el => {
      el.onclick = (e) => {
        const catId = el.getAttribute('data-catid');
        this.engine.startCategory(catId);
      };
    });
  }

  // ==========================================
  // SCREEN 3: TEACHER QUIZ DASHBOARD (MAIN)
  // ==========================================
  renderQuizDashboard() {
    const appEl = document.getElementById('app');
    const state = this.engine.state;
    const catQuestions = this.questionManager.getQuestionsByCategory(state.currentCategoryId);
    const qIndex = state.currentQuestionIndex;
    const totalQ = catQuestions.length;
    const activeTeam = state.teams[state.rotation.activeTeamIndex];
    const attemptNumber = state.attempt.attemptNumber;
    const isPhotoQuestion = state.question.type === 'photo' || state.currentCategoryId === 'photo' || state.question.categoryId === 'photo';
    const remainingCount = state.question.availableOptions.length;
    const currentPoints = ScoringSystem.getPointsForAttempt(isPhotoQuestion ? null : remainingCount, attemptNumber);

    appEl.innerHTML = `
      ${this._getHeaderHtml(`${state.currentCategoryName} (ಪ್ರಶ್ನೆ ${qIndex + 1}/${totalQ})`)}

      <div class="container-fluid px-4 py-3">
        <!-- Passing Transition Banner if in passing state -->
        ${state.display.phase === 'passing' ? `
          <div class="passing-overlay animate__animated animate__fadeIn">
            <div class="passing-card p-4 text-center">
              <div class="fs-1 text-danger fw-bold mb-2">${state.display.passMessage}</div>
              <div class="fs-3 text-warning font-kannada fw-bold mb-2">${state.display.passSubMessage}</div>
              <div class="spinner-border text-warning" role="status"></div>
            </div>
          </div>
        ` : ''}

        <div class="row g-4">
          <!-- ================= LEFT / MAIN PANEL: QUESTION & OPTIONS ================= -->
          <div class="col-lg-8">
            <div class="card glass-card shadow-lg p-4 mb-3 ${state.currentCategoryId === 'riddles' ? 'riddle-story-card' : 'border-warning border-opacity-25'}">
              <!-- Question Header Meta -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge ${state.currentCategoryId === 'riddles' ? 'bg-warning text-dark fw-bold' : 'bg-danger text-warning'} px-3 py-2 fs-6 rounded-pill">
                  <i data-lucide="${state.currentCategoryId === 'riddles' ? 'scroll' : (isPhotoQuestion ? 'camera' : 'tag')}" class="me-1"></i> ${state.currentCategoryName} | ಪ್ರಶ್ನೆ ${qIndex + 1}
                </span>
                ${isPhotoQuestion ? `
                  <span class="badge bg-info bg-opacity-25 border border-info text-info px-3 py-2 fs-6">
                    <i data-lucide="camera" class="me-1"></i> ಚಿತ್ರ ನೋಡಿ ಉತ್ತರಿಸಿ (ನೇರ ಉತ್ತರ)
                  </span>
                ` : `
                  <span class="badge bg-dark border border-secondary text-light px-3 py-2">
                    <i data-lucide="layers" class="me-1"></i> ಲಭ್ಯವಿರುವ ಆಯ್ಕೆಗಳು: <strong class="text-warning">${remainingCount}</strong>
                  </span>
                `}
              </div>

              <!-- Question Image for Guess the Photo -->
              ${isPhotoQuestion || state.question.type === 'photo' || state.question.image ? `
                <div class="text-center mb-4 photo-container rounded border border-secondary overflow-hidden p-2 bg-dark bg-opacity-50">
                  <img src="${state.question.image || 'assets/images/photo_placeholder.svg'}" 
                    onerror="this.src='assets/images/photo_placeholder.svg'" 
                    alt="Question Image" class="img-fluid rounded quiz-photo-img" 
                    style="max-height: 280px; width: auto; object-fit: contain;">
                  <div class="mt-2">
                    <button id="replaceCurrentPhotoBtn" class="btn btn-outline-warning btn-sm">
                      <i data-lucide="upload" class="me-1"></i> ಚಿತ್ರ ಬದಲಿಸಿ (Replace Image)
                    </button>
                    <input type="file" id="photoFileInput" accept="image/*" style="display: none;">
                  </div>
                </div>
              ` : ''}

              <!-- Question Text in Kannada -->
              <div class="question-text-box p-3 mb-4 rounded ${state.currentCategoryId === 'riddles' ? 'riddle-parchment-box' : 'bg-dark bg-opacity-50 border border-secondary'}">
                <h3 class="font-kannada fw-bold mb-0 lh-base ${state.currentCategoryId === 'riddles' ? 'riddle-question-text fs-2' : 'text-light'}">
                  ${state.question.text}
                </h3>
              </div>

              ${isPhotoQuestion ? `
                <!-- GUESS THE PHOTO: NO OPTIONS - TEACHER ANSWER KEY & 2 BUTTONS (RIGHT / WRONG) -->
                <div class="teacher-answer-key-box p-3 mb-4 rounded bg-dark border border-warning border-opacity-50 text-warning d-flex align-items-center justify-content-between">
                  <div>
                    <span class="badge bg-warning text-dark me-2 fs-6"><i data-lucide="key" class="me-1"></i> ಶಿಕ್ಷಕರ ಉತ್ತರ ಕೀ (Answer Key)</span>
                    <span class="fs-5 font-kannada">ಸರಿಯಾದ ಉತ್ತರ: <strong>${state.question.correctAnswer}</strong></span>
                  </div>
                  <span class="badge bg-success fs-6 px-3 py-2">+${currentPoints} ಅಂಕಗಳು</span>
                </div>

                <div class="row g-3 photo-evaluation-buttons mb-4">
                  <div class="col-md-6">
                    <button id="photoRightBtn" class="btn btn-success w-100 py-3 fs-4 fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2 btn-photo-right"
                      ${state.display.revealAnswer || state.display.phase === 'passing' ? 'disabled' : ''}>
                      <i data-lucide="check-circle" style="width: 32px; height: 32px;"></i>
                      <span>ಸರಿ (Right) [+${currentPoints}]</span>
                    </button>
                    <div class="text-center small text-secondary mt-1">ಶಾರ್ಟ್‌ಕಟ್: [R] ಅಥವಾ [1]</div>
                  </div>
                  <div class="col-md-6">
                    <button id="photoWrongBtn" class="btn btn-danger w-100 py-3 fs-4 fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2 btn-photo-wrong"
                      ${state.display.revealAnswer || state.display.phase === 'passing' ? 'disabled' : ''}>
                      <i data-lucide="x-circle" style="width: 32px; height: 32px;"></i>
                      <span>ತಪ್ಪು (Wrong) [ಮುಂದಿನ ತಂಡಕ್ಕೆ]</span>
                    </button>
                    <div class="text-center small text-secondary mt-1">ಶಾರ್ಟ್‌ಕಟ್: [W] ಅಥವಾ [2] (ಅಂಕ ಕಡಿತವಿಲ್ಲ)</div>
                  </div>
                </div>
              ` : `
                <!-- Options Grid A, B, C, D -->
                <div class="row g-3 options-grid">
                  ${state.question.options.map((opt, idx) => {
                    const label = String.fromCharCode(65 + idx); // A, B, C, D
                    const isEliminated = state.question.eliminatedOptions.includes(opt);
                    const isCorrect = (opt === state.question.correctAnswer);
                    const isRevealed = state.display.revealAnswer;

                    let optClass = "btn-option";
                    let badgeClass = "bg-primary";

                    if (isEliminated) {
                      optClass += " option-eliminated text-muted";
                      badgeClass = "bg-secondary";
                    } else if (isRevealed && isCorrect) {
                      optClass += " option-correct animate__animated animate__pulse";
                      badgeClass = "bg-success";
                    } else if (isRevealed && opt === state.attempt.selectedOption && !isCorrect) {
                      optClass += " option-wrong";
                      badgeClass = "bg-danger";
                    }

                    const isDisabled = isEliminated || isRevealed || state.display.phase === 'passing';

                    return `
                      <div class="col-md-6">
                        <button class="btn btn-dark w-100 text-start p-3 ${optClass} position-relative"
                          data-option="${opt.replace(/"/g, '&quot;')}"
                          ${isDisabled ? 'disabled' : ''}>
                          <div class="d-flex align-items-center">
                            <span class="badge ${badgeClass} fs-5 me-3 px-3 py-2">${label}</span>
                            <span class="font-kannada fs-5 fw-semibold option-text">${opt}</span>
                          </div>
                          ${isEliminated ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">ತೆಗೆದುಹಾಕಲಾಗಿದೆ</span>` : ''}
                          ${isRevealed && isCorrect ? `<span class="badge bg-success position-absolute top-0 end-0 m-2">✓ ಸರಿಯಾದ ಉತ್ತರ</span>` : ''}
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}

              <!-- Evaluation banner if answer revealed -->
              ${state.display.revealAnswer ? `
                <div class="mt-4 p-3 rounded alert ${state.attempt.result === 'CORRECT' ? 'alert-success' : 'alert-info'} border animate__animated animate__fadeIn">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 class="alert-heading font-kannada fw-bold mb-1">
                        ${state.attempt.result === 'CORRECT' ? '🎉 ಅದ್ಭುತ! ಸರಿಯಾದ ಉತ್ತರ!' : (state.display.passMessage || 'ವಿವರಣೆ / Explanation')}
                      </h4>
                      <p class="mb-1 fs-5">
                        ${state.attempt.result === 'CORRECT' 
                          ? `<strong>${state.attempt.teamName}</strong> ಗೆ <span class="badge bg-warning text-dark">+${state.attempt.pointsAwarded} ಅಂಕಗಳು!</span>`
                          : `ಸರಿಯಾದ ಉತ್ತರ: <strong>${state.question.correctAnswer}</strong>`}
                      </p>
                      ${state.question.explanation ? `
                        <p class="text-light small mb-0 mt-1">${state.question.explanation}</p>
                      ` : ''}
                    </div>
                    <button id="dashboardNextBtn" class="btn btn-warning btn-lg fw-bold text-dark px-4 shadow">
                      ಮುಂದಿನ ಪ್ರಶ್ನೆ (Next Question) <i data-lucide="arrow-right" class="ms-1"></i>
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Bottom Teacher Action Bar -->
            <div class="card glass-card p-3 border-secondary">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <button id="prevQBtn" class="btn btn-outline-light me-2" ${qIndex === 0 ? 'disabled' : ''}>
                    <i data-lucide="chevron-left" class="me-1"></i> ಹಿಂದಿನ ಪ್ರಶ್ನೆ
                  </button>
                  <button id="skipQBtn" class="btn btn-outline-warning me-2" ${state.display.revealAnswer || state.display.phase === 'passing' ? 'disabled' : ''} title="ಮುಂದಿನ ತಂಡಕ್ಕೆ ಪ್ರಶ್ನೆಯನ್ನು ಪಾಸ್ ಮಾಡಿ">
                    <i data-lucide="skip-forward" class="me-1"></i> ಪಾಸ್ (Pass)
                  </button>
                </div>

                <div class="d-flex gap-2">
                  <button id="pauseResumeTimerBtn" class="btn ${state.timer.paused ? 'btn-success' : 'btn-outline-warning'}">
                    <i data-lucide="${state.timer.paused ? 'play' : 'pause'}" class="me-1"></i>
                    ${state.timer.paused ? 'ಟೈಮರ್ ಪುನರಾರಂಭ (Resume)' : 'ಟೈಮರ್ ವಿರಾಮ (Pause)'}
                  </button>
                  <button id="resetTimerBtn" class="btn btn-outline-secondary">
                    <i data-lucide="rotate-ccw" class="me-1"></i> 30s ಮರುಹೊಂದಿಸಿ
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= RIGHT SIDE PANEL: ACTIVE TEAM, TIMER & ROTATION QUEUE ================= -->
          <div class="col-lg-4">
            <!-- Active Team Card -->
            <div class="card glass-card p-3 mb-3 border-warning active-team-box shadow">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-danger px-3 py-1 uppercase fw-bold">NOW PLAYING</span>
                <span class="badge bg-warning text-dark fw-bold">ಯತ್ನ (Attempt) ${attemptNumber}</span>
              </div>
              <h2 class="font-kannada text-warning fw-bold mb-1">${activeTeam.name}</h2>
              <div class="text-light fs-5 mb-3">
                ಲಭ್ಯವಿರುವ ಅಂಕಗಳು: <strong class="badge bg-success fs-5">+${currentPoints}</strong>
              </div>

              <!-- Circular Progress 30s Countdown Timer -->
              <div class="timer-widget d-flex align-items-center justify-content-center my-2">
                <div class="timer-circle-wrap position-relative">
                  <svg class="timer-svg" width="140" height="140" viewBox="0 0 140 140">
                    <circle class="timer-bg" cx="70" cy="70" r="58" stroke-width="10" />
                    <circle id="timerProgressCircle" class="timer-progress" cx="70" cy="70" r="58" stroke-width="10" />
                  </svg>
                  <div class="timer-text position-absolute top-50 start-50 translate-middle text-center">
                    <div id="timerSeconds" class="display-6 fw-bold text-light font-monospace">00:30</div>
                    <small id="timerStatusLabel" class="text-secondary text-uppercase" style="font-size: 11px;">
                      ${state.timer.paused ? 'PAUSED' : 'SECONDS'}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Team Rotation Circular Queue -->
            <div class="card glass-card p-3 mb-3 border-secondary">
              <div class="card-header bg-transparent border-bottom border-secondary px-0 pt-0 pb-2 mb-2 d-flex justify-content-between align-items-center">
                <span class="text-light fw-bold font-kannada">
                  <i data-lucide="rotate-cw" class="me-1 text-warning"></i> ವೃತ್ತಾಕಾರದ ಸರದಿ (Queue)
                </span>
                <small class="text-secondary">ಪ್ರಾರಂಭ: T${state.rotation.startingTeamIndex + 1}</small>
              </div>

              <div class="team-queue-list">
                ${state.teams.map((t, idx) => {
                  const isActive = (idx === state.rotation.activeTeamIndex);
                  const isStarting = (idx === state.rotation.startingTeamIndex);
                  const hasAttempted = state.rotation.attemptedTeamIds.includes(t.id);

                  let badgeColor = "bg-dark border border-secondary text-secondary";
                  if (isActive) badgeColor = "bg-warning text-dark fw-bold border-warning shadow";
                  else if (hasAttempted) badgeColor = "bg-secondary text-light opacity-50";

                  return `
                    <div class="queue-item d-flex justify-content-between align-items-center p-2 mb-1 rounded ${badgeColor}">
                      <div class="d-flex align-items-center">
                        <span class="badge ${isActive ? 'bg-dark text-warning' : 'bg-secondary'} me-2">T${idx + 1}</span>
                        <span class="font-kannada fw-semibold">${t.name}</span>
                        ${isStarting ? `<span class="badge bg-danger ms-2" style="font-size: 10px;">ಆರಂಭ</span>` : ''}
                      </div>
                      <div class="fw-bold">${t.score} pts</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Quick Score Table -->
            <div class="card glass-card p-3 border-secondary">
              <div class="card-header bg-transparent border-bottom border-secondary px-0 pt-0 pb-2 mb-2 d-flex justify-content-between align-items-center">
                <span class="text-light fw-bold font-kannada">
                  <i data-lucide="bar-chart-2" class="me-1 text-info"></i> ಲೈವ್ ಅಂಕಪಟ್ಟಿ
                </span>
                <button id="openLeaderboardSidebarBtn" class="btn btn-outline-info btn-sm py-0">
                  ಪೂರ್ಣ ಪಟ್ಟಿ
                </button>
              </div>
              <div class="quick-scores" style="max-height: 180px; overflow-y: auto;">
                ${ScoringSystem.getRankedTeams(state.teams).map((team, idx) => `
                  <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-secondary border-opacity-25 small">
                    <span class="font-kannada text-light">
                      <span class="text-warning me-1">#${idx + 1}</span> ${team.name}
                    </span>
                    <span class="badge bg-dark border border-warning text-warning fw-bold">${team.score}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this._attachHeaderEventListeners();
    this._attachDashboardEventListeners();
    this.updateTimerDisplay(state.timer);
  }

  // ==========================================
  // SCREEN 4: SECTION-END LEADERBOARD
  // ==========================================
  renderSectionCompleteScreen() {
    const appEl = document.getElementById('app');
    const state = this.engine.state;
    const ranked = ScoringSystem.getRankedTeams(state.teams);
    const cat = QUIZ_CATEGORIES.find(c => c.id === state.currentCategoryId);

    appEl.innerHTML = `
      ${this._getHeaderHtml(`ವಿಭಾಗ ಪೂರ್ಣಗೊಂಡಿದೆ: ${state.currentCategoryName}`)}

      <div class="container py-4 text-center">
        <div class="badge bg-success px-4 py-2 fs-5 rounded-pill mb-3 animate__animated animate__bounceIn">
          ✓ ವಿಭಾಗ ಪೂರ್ಣಗೊಂಡಿದೆ!
        </div>
        <h1 class="display-5 font-kannada text-warning fw-bold mb-2">
          ${state.currentCategoryName} – ಫಲಿತಾಂಶಗಳು
        </h1>
        <p class="text-secondary mb-4">ಈ ವಿಭಾಗದ ಕೊನೆಯಲ್ಲಿ ತಂಡಗಳ ಸ್ಥಾನಮಾನಗಳು ಮತ್ತು ಒಟ್ಟು ಸಂಚಿತ ಅಂಕಗಳು:</p>

        <!-- Top 3 Podium -->
        ${LeaderboardRenderer.renderPodiumHtml(ranked)}

        <!-- Rankings Table -->
        <div class="card glass-card p-4 mx-auto my-4 shadow-lg text-start" style="max-width: 900px;">
          <h4 class="font-kannada text-warning mb-3">
            <i data-lucide="list-ordered" class="me-2 text-danger"></i> ಸಮಗ್ರ ಅಂಕಪಟ್ಟಿ (Cumulative Standings)
          </h4>
          ${LeaderboardRenderer.renderTableHtml(ranked, state.currentCategoryId)}
        </div>

        <div class="d-flex flex-wrap justify-content-center gap-3 my-4">
          <button id="viewDetailedAuditFromSection" class="btn btn-outline-info btn-lg px-4">
            <i data-lucide="history" class="me-2"></i> ಅಂಕಗಳ ಲೆಕ್ಕಪರಿಶೋಧನೆ (Audit Log)
          </button>
          <button id="overallLeaderboardFromSection" class="btn btn-outline-warning btn-lg px-4">
            <i data-lucide="trophy" class="me-2"></i> ಸಮಗ್ರ ಲೀಡರ್‌ಬೋರ್ಡ್ (Overall Leaderboard)
          </button>
          <button id="nextSectionBtn" class="btn btn-warning btn-lg px-5 fw-bold text-dark shadow pulse-btn">
            ಮುಂದಿನ ವಿಭಾಗಕ್ಕೆ ಮುಂದುವರಿಯಿರಿ <i data-lucide="arrow-right" class="ms-2"></i>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this._attachHeaderEventListeners();

    const auditBtn = document.getElementById('viewDetailedAuditFromSection');
    if (auditBtn) auditBtn.onclick = () => this.openScoreAuditModal();

    const leadBtn = document.getElementById('overallLeaderboardFromSection');
    if (leadBtn) leadBtn.onclick = () => this.openLeaderboardModal();

    const nextSecBtn = document.getElementById('nextSectionBtn');
    if (nextSecBtn) nextSecBtn.onclick = () => this.engine.proceedToNextSection();
  }

  // ==========================================
  // SCREEN 5: GRAND FINALE
  // ==========================================
  renderGrandFinaleScreen() {
    const appEl = document.getElementById('app');
    const state = this.engine.state;
    const ranked = ScoringSystem.getRankedTeams(state.teams);
    const winner = ranked[0] || null;

    appEl.innerHTML = `
      ${this._getHeaderHtml('ಮಹಾ ಫಲಿತಾಂಶ (Grand Finale)')}

      <div class="container py-4 text-center">
        <div class="kannada-header-badge mb-2">
          <span class="badge bg-warning text-dark px-4 py-2 fs-5 rounded-pill fw-bold shadow">
            👑 ಅಂತಿಮ ಚಾಂಪಿಯನ್‌ಷಿಪ್
          </span>
        </div>

        <h1 class="display-3 font-kannada text-warning fw-bold text-shadow mb-1 animate__animated animate__tada">
          ಅಭಿನಂದನೆಗಳು! ಮಹಾ ವಿಜೇತರು!
        </h1>
        <h3 class="text-light mb-4">ಜ್ಞಾನವೇ ಶಕ್ತಿ – ಗೆಲುವೇ ಗುರಿ!</h3>

        ${winner ? `
          <div class="winner-spotlight card glass-card p-4 mx-auto my-4 border-warning shadow-lg animate__animated animate__zoomIn" style="max-width: 600px;">
            <div class="trophy-icon mb-2">🏆</div>
            <div class="text-secondary text-uppercase fw-bold">CHAMPION OF KANNADA QUIZ ARENA</div>
            <h2 class="display-5 font-kannada text-warning fw-bold my-2">${winner.name}</h2>
            <div class="badge bg-success fs-4 px-4 py-2">${winner.score} ಅಂಕಗಳು</div>
          </div>
        ` : ''}

        <!-- Top 3 Grand Podium -->
        ${LeaderboardRenderer.renderPodiumHtml(ranked, true)}

        <!-- Complete Standings Table -->
        <div class="card glass-card p-4 mx-auto my-4 shadow-lg text-start" style="max-width: 960px;">
          <h4 class="font-kannada text-warning mb-3">
            <i data-lucide="award" class="me-2 text-danger"></i> ಅಂತಿಮ ಸಮಗ್ರ ಶ್ರೇಯಾಂಕ (Final Standings)
          </h4>
          ${LeaderboardRenderer.renderTableHtml(ranked)}

          <!-- Visual Chart Canvas -->
          <div class="mt-4 pt-3 border-top border-secondary" style="height: 320px;">
            <canvas id="finalChartCanvas"></canvas>
          </div>
        </div>

        <!-- Export & Action Buttons -->
        <div class="d-flex flex-wrap justify-content-center gap-3 my-4">
          <button id="downloadCsvBtn" class="btn btn-outline-success btn-lg px-4">
            <i data-lucide="download" class="me-2"></i> CSV ಡೌನ್‌ಲೋಡ್ (Export CSV)
          </button>
          <button id="printResultsBtn" class="btn btn-outline-info btn-lg px-4">
            <i data-lucide="printer" class="me-2"></i> ಮುದ್ರಿಸಿ (Print Results)
          </button>
          <button id="viewFinalAuditBtn" class="btn btn-outline-light btn-lg px-4">
            <i data-lucide="history" class="me-2"></i> ಲೆಕ್ಕಪರಿಶೋಧನೆ (Audit Log)
          </button>
          <button id="restartCompetitionBtn" class="btn btn-danger btn-lg px-4 fw-bold">
            <i data-lucide="rotate-ccw" class="me-2"></i> ಹೊಸ ಸ್ಪರ್ಧೆ ಆರಂಭಿಸಿ (Restart)
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this._attachHeaderEventListeners();

    // Render chart
    const chartCanvas = document.getElementById('finalChartCanvas');
    if (chartCanvas) {
      LeaderboardRenderer.renderChart(chartCanvas, state.teams);
    }

    const csvBtn = document.getElementById('downloadCsvBtn');
    if (csvBtn) {
      csvBtn.onclick = () => {
        const csv = ScoringSystem.exportAuditCsv(state.scoring.history, state.teams);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `kannada_quiz_results_${state.sessionId}.csv`;
        link.click();
      };
    }

    const printBtn = document.getElementById('printResultsBtn');
    if (printBtn) {
      printBtn.onclick = () => window.print();
    }

    const auditBtn = document.getElementById('viewFinalAuditBtn');
    if (auditBtn) {
      auditBtn.onclick = () => this.openScoreAuditModal();
    }

    const restartBtn = document.getElementById('restartCompetitionBtn');
    if (restartBtn) {
      restartBtn.onclick = () => {
        Swal.fire({
          title: 'ಸ್ಪರ್ಧೆಯನ್ನು ಮರುಪ್ರಾರಂಭಿಸಬೇಕೆ?',
          text: 'ಎಲ್ಲಾ ಅಂಕಗಳು ಮತ್ತು ಪ್ರಗತಿಯನ್ನು ಮರುಹೊಂದಿಸಲಾಗುತ್ತದೆ.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#e11d48',
          cancelButtonColor: '#4b5563',
          confirmButtonText: 'ಹೌದು, ಮರುಪ್ರಾರಂಭಿಸಿ',
          cancelButtonText: 'ರದ್ದುಗೊಳಿಸಿ'
        }).then((result) => {
          if (result.isConfirmed) {
            StorageManager.clearSession(state.sessionId);
            window.location.reload();
          }
        });
      };
    }
  }

  // ==========================================
  // COMMON HEADER COMPONENT
  // ==========================================
  _getHeaderHtml(subtitle = '') {
    const state = this.engine.state;
    const catQuestions = this.questionManager.getQuestionsByCategory(state.currentCategoryId);
    const totalQ = catQuestions.length || 8;
    const currentQ = state.currentQuestionIndex + 1;
    const progressPct = Math.round((currentQ / totalQ) * 100);

    return `
      <header class="quiz-top-navbar border-bottom border-secondary bg-dark bg-opacity-75 sticky-top px-3 py-2">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <span class="fs-4 me-2">🚩</span>
            <div>
              <h5 class="mb-0 font-kannada text-warning fw-bold">ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ</h5>
              <small class="text-secondary">${subtitle || 'ಜ್ಞಾನವೇ ಶಕ್ತಿ – ಗೆಲುವೇ ಗುರಿ!'}</small>
            </div>
          </div>

          <!-- Center: Progress bar if in quiz -->
          ${state.status === 'running' ? `
            <div class="d-none d-md-block" style="width: 280px;">
              <div class="d-flex justify-content-between text-secondary small mb-1">
                <span>ಪ್ರಗತಿ (Progress)</span>
                <span>${currentQ}/${totalQ}</span>
              </div>
              <div class="progress bg-secondary" style="height: 6px;">
                <div class="progress-bar bg-warning" role="progressbar" style="width: ${progressPct}%;"></div>
              </div>
            </div>
          ` : ''}

          <!-- Right Action Buttons -->
          <div class="d-flex align-items-center gap-2">
            <!-- Projector Sync Status Pill -->
            <button id="projectorStatusPill" class="btn btn-outline-info btn-sm d-flex align-items-center" title="Projector Sync Settings">
              <span class="status-dot bg-success me-1"></span>
              <span id="projectorStatusText">ಪ್ರೊಜೆಕ್ಟರ್: ಸಕ್ರಿಯ</span>
            </button>

            <!-- Audit History Button -->
            <button id="navAuditBtn" class="btn btn-outline-secondary btn-sm" title="ಅಂಕಗಳ ಲೆಕ್ಕಪರಿಶೋಧನೆ">
              <i data-lucide="history"></i>
            </button>

            <!-- Mid-Game Leaderboard -->
            <button id="navLeaderboardBtn" class="btn btn-outline-warning btn-sm" title="ಲೀಡರ್‌ಬೋರ್ಡ್">
              <i data-lucide="trophy"></i>
            </button>

            <!-- Question Management -->
            <button id="navQuestionManagerBtn" class="btn btn-outline-light btn-sm" title="ಪ್ರಶ್ನಾವಳಿ ನಿರ್ವಹಣೆ">
              <i data-lucide="edit-3"></i>
            </button>

            <!-- Exit Quiz -->
            <button id="navExitBtn" class="btn btn-outline-danger btn-sm" title="ನಿರ್ಗಮನ">
              <i data-lucide="log-out"></i>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  _attachHeaderEventListeners() {
    const projBtn = document.getElementById('projectorStatusPill');
    if (projBtn) {
      projBtn.onclick = () => this.showProjectorConnectionModal();
    }

    const auditBtn = document.getElementById('navAuditBtn');
    if (auditBtn) {
      auditBtn.onclick = () => this.openScoreAuditModal();
    }

    const leadBtn = document.getElementById('navLeaderboardBtn');
    if (leadBtn) {
      leadBtn.onclick = () => this.openLeaderboardModal();
    }

    const qmBtn = document.getElementById('navQuestionManagerBtn');
    if (qmBtn) {
      qmBtn.onclick = () => this.openQuestionManagerModal();
    }

    const exitBtn = document.getElementById('navExitBtn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        Swal.fire({
          title: 'ಸ್ಪರ್ಧೆಯಿಂದ ನಿರ್ಗಮಿಸಬೇಕೆ?',
          text: 'ನೀವು ಮುಖ್ಯ ಪರದೆಗೆ ಹಿಂತಿರುಗುತ್ತೀರಿ.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#e11d48',
          cancelButtonColor: '#4b5563',
          confirmButtonText: 'ಹೌದು, ನಿರ್ಗಮಿಸಿ',
          cancelButtonText: 'ಮುಂದುವರಿಯಿರಿ'
        }).then((result) => {
          if (result.isConfirmed) {
            this.engine.state.status = 'setup';
            this.render();
          }
        });
      };
    }
  }

  _attachDashboardEventListeners() {
    // Option Click - Evaluate Answer on behalf of current team
    document.querySelectorAll('.btn-option').forEach(btn => {
      btn.onclick = () => {
        const selectedOption = btn.getAttribute('data-option');
        if (selectedOption) {
          this.engine.evaluateAnswer(selectedOption);
        }
      };
    });

    // Guess the Photo: Right & Wrong Evaluation Buttons
    const photoRightBtn = document.getElementById('photoRightBtn');
    if (photoRightBtn) {
      photoRightBtn.onclick = () => {
        if (typeof soundManager !== 'undefined') soundManager.init();
        this.engine.evaluatePhotoAnswer(true);
      };
    }

    const photoWrongBtn = document.getElementById('photoWrongBtn');
    if (photoWrongBtn) {
      photoWrongBtn.onclick = () => {
        if (typeof soundManager !== 'undefined') soundManager.init();
        this.engine.evaluatePhotoAnswer(false);
      };
    }

    const nextQBtn = document.getElementById('dashboardNextBtn');
    if (nextQBtn) {
      nextQBtn.onclick = () => this.engine.nextQuestion();
    }

    const prevQBtn = document.getElementById('prevQBtn');
    if (prevQBtn) {
      prevQBtn.onclick = () => this.engine.previousQuestion();
    }

    const skipQBtn = document.getElementById('skipQBtn');
    if (skipQBtn) {
      skipQBtn.onclick = () => {
        Swal.fire({
          title: 'ಪ್ರಶ್ನೆಯನ್ನು ಪಾಸ್ ಮಾಡಬೇಕೇ?',
          text: 'ಈ ಪ್ರಶ್ನೆಯನ್ನು ಮುಂದಿನ ತಂಡಕ್ಕೆ ವರ್ಗಾಯಿಸಲಾಗುತ್ತದೆ.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'ಹೌದು, ಪಾಸ್ ಮಾಡಿ (Pass)',
          cancelButtonText: 'ರದ್ದು (Cancel)'
        }).then(res => {
          if (res.isConfirmed) this.engine.passQuestion();
        });
      };
    }

    const replacePhotoBtn = document.getElementById('replaceCurrentPhotoBtn');
    const photoFileInput = document.getElementById('photoFileInput');
    if (replacePhotoBtn && photoFileInput) {
      replacePhotoBtn.onclick = () => photoFileInput.click();
      photoFileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvt) => {
            const dataUrl = uploadEvt.target.result;
            this.engine.state.question.image = dataUrl;
            this.questionManager.updateQuestion(this.engine.state.question.id, { image: dataUrl });
            this.engine.notifyStateChange('QUESTION_UPDATED');
            this.render();
          };
          reader.readAsDataURL(file);
        }
      };
    }

    const pauseResumeBtn = document.getElementById('pauseResumeTimerBtn');
    if (pauseResumeBtn) {
      pauseResumeBtn.onclick = () => {
        if (this.engine.state.timer.paused) {
          this.engine.resumeTimer();
        } else {
          this.engine.pauseTimer();
        }
      };
    }

    const resetTimerBtn = document.getElementById('resetTimerBtn');
    if (resetTimerBtn) {
      resetTimerBtn.onclick = () => this.engine.resetCurrentTimer();
    }

    const leadSideBtn = document.getElementById('openLeaderboardSidebarBtn');
    if (leadSideBtn) {
      leadSideBtn.onclick = () => this.openLeaderboardModal();
    }
  }

  // ==========================================
  // TIMER CIRCLE UPDATE
  // ==========================================
  updateTimerDisplay(timerState) {
    const secEl = document.getElementById('timerSeconds');
    const circleEl = document.getElementById('timerProgressCircle');
    const labelEl = document.getElementById('timerStatusLabel');
    if (!secEl || !circleEl) return;

    const remainingSec = Math.ceil(timerState.remainingMs / 1000);
    const formatted = remainingSec < 10 ? `00:0${remainingSec}` : `00:${remainingSec}`;
    secEl.innerText = formatted;

    if (labelEl) {
      labelEl.innerText = timerState.paused ? 'PAUSED' : 'SECONDS';
    }

    // Circumference = 2 * PI * 58 = 364.42
    const totalCircumference = 364.42;
    const fraction = Math.max(0, timerState.remainingMs / timerState.durationMs);
    const strokeDashoffset = totalCircumference * (1 - fraction);
    circleEl.style.strokeDashoffset = strokeDashoffset;

    // Color states: <=5s Red, <=15s Yellow, else Green/Cyan
    if (remainingSec <= 5) {
      circleEl.style.stroke = '#ef4444'; // Red
      secEl.className = 'display-6 fw-bold text-danger font-monospace animate__animated animate__pulse animate__infinite';
    } else if (remainingSec <= 15) {
      circleEl.style.stroke = '#f59e0b'; // Yellow
      secEl.className = 'display-6 fw-bold text-warning font-monospace';
    } else {
      circleEl.style.stroke = '#06b6d4'; // Cyan
      secEl.className = 'display-6 fw-bold text-light font-monospace';
    }
  }

  // ==========================================
  // MODALS: LEADERBOARD, AUDIT, PROJECTOR, QM
  // ==========================================
  openLeaderboardModal() {
    // Pause timer if game running to be fair
    const wasRunning = (this.engine.state.status === 'running' && !this.engine.state.timer.paused);
    if (wasRunning) {
      this.engine.pauseTimer();
    }

    const ranked = ScoringSystem.getRankedTeams(this.engine.state.teams);
    const content = `
      <div class="text-start">
        ${LeaderboardRenderer.renderPodiumHtml(ranked)}
        <div class="my-3">
          ${LeaderboardRenderer.renderTableHtml(ranked, this.engine.state.currentCategoryId)}
        </div>
      </div>
    `;

    Swal.fire({
      title: '🏆 ಲೀಡರ್‌ಬೋರ್ಡ್ (Live Leaderboard)',
      html: content,
      width: '850px',
      showCloseButton: true,
      confirmButtonText: 'ಮುಚ್ಚಿರಿ (Close)',
      confirmButtonColor: '#f59e0b'
    }).then(() => {
      // Resume timer if it was running before opening
      if (wasRunning) {
        this.engine.resumeTimer();
      }
    });

    if (window.lucide) lucide.createIcons();
  }

  openScoreAuditModal() {
    const history = this.engine.state.scoring.history;
    let rowsHtml = '';

    if (!history || history.length === 0) {
      rowsHtml = `<tr><td colspan="7" class="text-center text-muted py-3">ಇನ್ನೂ ಯಾವುದೇ ಯತ್ನಗಳು ದಾಖಲಾಗಿಲ್ಲ</td></tr>`;
    } else {
      rowsHtml = history.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong class="text-warning">${item.teamName}</strong></td>
          <td>${item.attemptNumber}</td>
          <td><small class="text-truncate d-inline-block" style="max-width: 220px;">${item.selectedOption}</small></td>
          <td>
            ${item.result === 'CORRECT' ? `<span class="badge bg-success">ಸರಿ (Correct)</span>` : ''}
            ${item.result === 'WRONG' ? `<span class="badge bg-danger">ತಪ್ಪು (Wrong)</span>` : ''}
            ${item.result === 'TIMEOUT' ? `<span class="badge bg-secondary">ಟೈಮ್‌ಔಟ್</span>` : ''}
          </td>
          <td class="fw-bold ${item.pointsAwarded > 0 ? 'text-success' : 'text-muted'}">+${item.pointsAwarded}</td>
          <td><small class="text-secondary">${item.timestamp}</small></td>
        </tr>
      `).join('');
    }

    const content = `
      <div class="text-start">
        <p class="text-muted small">ಸ್ಪರ್ಧೆಯ ಪ್ರತಿಯೊಂದು ಯತ್ನ, ಆಯ್ದ ಆಯ್ಕೆ ಮತ್ತು ನೀಡಲಾದ ಅಂಕಗಳ ನಿಖರ ದಾಖಲೆ:</p>
        <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
          <table class="table table-dark table-sm table-striped font-kannada">
            <thead>
              <tr class="table-secondary text-dark">
                <th>#</th>
                <th>ತಂಡ (Team)</th>
                <th>ಯತ್ನ</th>
                <th>ಆಯ್ಕೆ</th>
                <th>ಫಲಿತಾಂಶ</th>
                <th>ಅಂಕಗಳು</th>
                <th>ಸಮಯ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    Swal.fire({
      title: '📋 ಅಂಕಗಳ ಲೆಕ್ಕಪರಿಶೋಧನೆ (Score Audit History)',
      html: content,
      width: '820px',
      showCancelButton: true,
      cancelButtonText: 'ಮುಚ್ಚಿರಿ',
      confirmButtonText: 'CSV ಡೌನ್‌ಲೋಡ್',
      confirmButtonColor: '#10b981'
    }).then(res => {
      if (res.isConfirmed) {
        const csv = ScoringSystem.exportAuditCsv(history, this.engine.state.teams);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `audit_history_${this.engine.state.sessionId}.csv`;
        link.click();
      }
    });
  }

  showProjectorConnectionModal() {
    const sessionId = this.engine.state.sessionId;
    const projectorUrl = `${window.location.origin}/projector.html?session=${sessionId}`;
    const status = this.transport ? this.transport.getConnectionStatus() : { mode: 'local' };

    const content = `
      <div class="text-start">
        <div class="alert alert-dark border border-secondary mb-3">
          <div class="d-flex justify-content-between mb-2">
            <span>ಸ್ಥಿತಿ (Status):</span>
            <span class="badge ${status.wsConnected ? 'bg-success' : 'bg-info'}">
              ${status.wsConnected ? 'WebSocket ಸಂಪರ್ಕಿತ (Separate Devices Ready)' : 'ಸ್ಥಳೀಯ ಮೋಡ್ (BroadcastChannel Active)'}
            </span>
          </div>
          <div class="d-flex justify-content-between">
            <span>ಅಧಿವೇಶನ ಕೋಡ್ (Session ID):</span>
            <strong class="text-warning font-monospace">${sessionId}</strong>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label text-light small fw-bold">ಪ್ರೊಜೆಕ್ಟರ್ ಪರದೆಯ ವಿಳಾಸ (Display URL):</label>
          <div class="input-group">
            <input type="text" id="projUrlInput" class="form-control bg-dark text-warning border-secondary small" 
              value="${projectorUrl}" readonly>
            <button class="btn btn-outline-warning" id="copyProjUrlBtn">
              ನಕಲಿಸಿ (Copy)
            </button>
          </div>
          <small class="text-muted">ಈ ವಿಳಾಸವನ್ನು ಪ್ರೊಜೆಕ್ಟರ್ ಲ್ಯಾಪ್‌ಟಾಪ್ ಅಥವಾ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ.</small>
        </div>

        <div class="d-grid gap-2">
          <button id="openProjectorNewTabBtn" class="btn btn-warning fw-bold text-dark">
            <i data-lucide="external-link" class="me-1"></i> ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಪ್ರೊಜೆಕ್ಟರ್ ತೆರೆಯಿರಿ
          </button>
        </div>
      </div>
    `;

    Swal.fire({
      title: '📽️ ಪ್ರೊಜೆಕ್ಟರ್ ಪರದೆ ಸಂಯೋಜನೆ',
      html: content,
      showCloseButton: true,
      confirmButtonText: 'ಸರಿ (OK)',
      confirmButtonColor: '#f59e0b'
    });

    const copyBtn = document.getElementById('copyProjUrlBtn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const inp = document.getElementById('projUrlInput');
        if (inp) {
          navigator.clipboard.writeText(inp.value).then(() => {
            copyBtn.innerText = 'ನಕಲಿಸಲಾಗಿದೆ! ✓';
            setTimeout(() => { copyBtn.innerText = 'ನಕಲಿಸಿ (Copy)'; }, 2000);
          });
        }
      };
    }

    const openTabBtn = document.getElementById('openProjectorNewTabBtn');
    if (openTabBtn) {
      openTabBtn.onclick = () => {
        this.openProjectorTab();
        Swal.close();
      };
    }

    if (window.lucide) lucide.createIcons();
  }

  openProjectorTab() {
    const sessionId = this.engine.state.sessionId;
    const url = `projector.html?session=${sessionId}`;
    window.open(url, '_blank');
  }

  openQuestionManagerModal(selectedCategoryId = 'all') {
    const isRunning = (this.engine.state.status === 'running');
    const allQuestions = this.questionManager.getAllQuestions();
    const categories = QUIZ_CATEGORIES;
    const filtered = selectedCategoryId === 'all' 
      ? allQuestions 
      : allQuestions.filter(q => q.categoryId === selectedCategoryId || q.category === selectedCategoryId);

    let qListHtml = '';
    if (filtered.length === 0) {
      qListHtml = `<div class="text-center text-muted py-4">ಈ ವಿಭಾಗದಲ್ಲಿ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಲ್ಲ</div>`;
    } else {
      qListHtml = filtered.map((q, idx) => {
        const isEnabled = q.enabled !== false;
        return `
          <div class="qm-question-item d-flex justify-content-between align-items-center p-2 mb-2 rounded bg-dark border border-secondary border-opacity-50">
            <div class="d-flex align-items-center flex-grow-1 me-2 overflow-hidden">
              <span class="badge ${isEnabled ? 'bg-secondary' : 'bg-danger'} me-2 flex-shrink-0" style="font-size: 11px;">
                ${q.category}
              </span>
              <span class="text-light font-kannada text-truncate ${!isEnabled ? 'text-decoration-line-through opacity-50' : ''}" style="max-width: 380px;">
                ${idx + 1}. ${q.question}
              </span>
            </div>
            <div class="d-flex align-items-center gap-1 flex-shrink-0">
              <span class="badge bg-success me-1" title="ಸರಿಯಾದ ಉತ್ತರ">${q.answer}</span>
              ${q.image ? `<span class="badge bg-info text-dark" title="ಚಿತ್ರ ಸಹಿತ"><i data-lucide="image" style="width: 12px; height: 12px;"></i></span>` : ''}
              
              <!-- Toggle Enabled/Disabled -->
              <button class="btn btn-sm ${isEnabled ? 'btn-outline-success' : 'btn-outline-secondary'} toggle-enable-q-btn py-0 px-2" 
                data-id="${q.id}" title="${isEnabled ? 'ಸಕ್ರಿಯ (Active)' : 'ನಿಷ್ಕ್ರಿಯ (Disabled)'}" ${isRunning ? 'disabled' : ''}>
                ${isEnabled ? '✓' : '✗'}
              </button>

              <!-- Reorder Up/Down -->
              <button class="btn btn-sm btn-outline-secondary move-q-btn py-0 px-1" data-id="${q.id}" data-dir="up" title="ಮೇಲಕ್ಕೆ" ${isRunning ? 'disabled' : ''}>
                ▲
              </button>
              <button class="btn btn-sm btn-outline-secondary move-q-btn py-0 px-1" data-id="${q.id}" data-dir="down" title="ಕೆಳಕ್ಕೆ" ${isRunning ? 'disabled' : ''}>
                ▼
              </button>

              <!-- Edit -->
              <button class="btn btn-sm btn-outline-warning edit-q-btn py-0 px-2" data-id="${q.id}" title="ಸಂಪಾದಿಸಿ" ${isRunning ? 'disabled' : ''}>
                <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>
              </button>

              <!-- Delete -->
              <button class="btn btn-sm btn-outline-danger delete-q-btn py-0 px-2" data-id="${q.id}" title="ತೆಗೆದುಹಾಕಿ" ${isRunning ? 'disabled' : ''}>
                <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    const content = `
      <div class="text-start">
        ${isRunning ? `
          <div class="alert alert-warning py-2 px-3 small d-flex align-items-center mb-3">
            <i data-lucide="alert-triangle" class="me-2 text-danger"></i>
            <span><strong>ಗಮನಿಸಿ:</strong> ಸ್ಪರ್ಧೆ ಚಾಲ್ತಿಯಲ್ಲಿರುವಾಗ ಪ್ರಶ್ನೆಗಳ ಬದಲಾವಣೆ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ.</span>
          </div>
        ` : ''}

        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <!-- Category Filter -->
          <div class="d-flex align-items-center gap-2">
            <label class="text-light small fw-bold">ವಿಭಾಗ:</label>
            <select id="qmCategoryFilter" class="form-select form-select-sm bg-dark text-warning border-secondary" style="width: 180px;">
              <option value="all" ${selectedCategoryId === 'all' ? 'selected' : ''}>ಎಲ್ಲಾ ವಿಭಾಗಗಳು (${allQuestions.length})</option>
              ${categories.map(c => `
                <option value="${c.id}" ${selectedCategoryId === c.id ? 'selected' : ''}>${c.name} (${allQuestions.filter(q => q.categoryId === c.id).length})</option>
              `).join('')}
            </select>
          </div>

          <!-- Add & Reset Buttons -->
          <div class="d-flex gap-2">
            <button id="qmAddNewBtn" class="btn btn-warning btn-sm text-dark fw-bold" ${isRunning ? 'disabled' : ''}>
              <i data-lucide="plus" class="me-1"></i> + ಹೊಸ ಪ್ರಶ್ನೆ
            </button>
            <button id="qmResetDefaultBtn" class="btn btn-outline-danger btn-sm" ${isRunning ? 'disabled' : ''}>
              <i data-lucide="rotate-ccw" class="me-1"></i> ಮರುಹೊಂದಿಸಿ
            </button>
          </div>
        </div>

        <!-- Question List Container -->
        <div style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
          ${qListHtml}
        </div>
      </div>
    `;

    Swal.fire({
      title: '📚 ಪ್ರಶ್ನಾವಳಿ ನಿರ್ವಹಣೆ (Question Management)',
      html: content,
      width: '880px',
      showCloseButton: true,
      confirmButtonText: 'ಮುಚ್ಚಿರಿ (Close)',
      confirmButtonColor: '#f59e0b'
    });

    if (window.lucide) lucide.createIcons();

    // Hook filter change
    const filterSelect = document.getElementById('qmCategoryFilter');
    if (filterSelect) {
      filterSelect.onchange = (e) => this.openQuestionManagerModal(e.target.value);
    }

    // Hook Add New Question
    const addBtn = document.getElementById('qmAddNewBtn');
    if (addBtn) {
      addBtn.onclick = () => this._showAddQuestionDialog(selectedCategoryId);
    }

    // Hook Reset Defaults
    const resetBtn = document.getElementById('qmResetDefaultBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        Swal.fire({
          title: 'ಪ್ರಶ್ನೆ ಭಂಡಾರವನ್ನು ಮರುಹೊಂದಿಸಬೇಕೆ?',
          text: 'ಎಲ್ಲಾ ಕಸ್ಟಮ್ ಸೇರ್ಪಡೆಗಳು ರದ್ದಾಗುತ್ತವೆ.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ಹೌದು, ಮರುಹೊಂದಿಸಿ',
          cancelButtonText: 'ರದ್ದು',
          confirmButtonColor: '#dc2626'
        }).then(res => {
          if (res.isConfirmed) {
            this.questionManager.resetToDefault(DEFAULT_QUESTIONS);
            this.engine.questions = this.questionManager.getAllQuestions();
            this.openQuestionManagerModal(selectedCategoryId);
          }
        });
      };
    }

    // Hook Item Actions
    document.querySelectorAll('.toggle-enable-q-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        this.questionManager.toggleEnable(id);
        this.engine.questions = this.questionManager.getAllQuestions();
        this.openQuestionManagerModal(selectedCategoryId);
      };
    });

    document.querySelectorAll('.move-q-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const dir = btn.getAttribute('data-dir');
        this.questionManager.moveQuestion(id, dir);
        this.engine.questions = this.questionManager.getAllQuestions();
        this.openQuestionManagerModal(selectedCategoryId);
      };
    });

    document.querySelectorAll('.delete-q-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        Swal.fire({
          title: 'ಪ್ರಶ್ನೆಯನ್ನು ಅಳಿಸಬೇಕೆ?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ಹೌದು, ಅಳಿಸಿ',
          cancelButtonText: 'ರದ್ದು',
          confirmButtonColor: '#dc2626'
        }).then(res => {
          if (res.isConfirmed) {
            this.questionManager.deleteQuestion(id);
            this.engine.questions = this.questionManager.getAllQuestions();
            this.openQuestionManagerModal(selectedCategoryId);
          }
        });
      };
    });

    document.querySelectorAll('.edit-q-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        this._showEditQuestionDialog(id, selectedCategoryId);
      };
    });
  }

  _showAddQuestionDialog(currentCatId = 'all') {
    const categories = QUIZ_CATEGORIES;
    const defaultCat = currentCatId === 'all' ? 'gk' : currentCatId;

    const formHtml = `
      <div class="text-start font-kannada">
        <div class="mb-3">
          <label class="form-label text-light small fw-bold">ವಿಭಾಗ (Category):</label>
          <select id="newQCat" class="form-select bg-dark text-warning border-secondary">
            ${categories.map(c => `
              <option value="${c.id}" data-name="${c.name}" ${c.id === defaultCat ? 'selected' : ''}>${c.name} (${c.englishName})</option>
            `).join('')}
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-light small fw-bold">ಪ್ರಶ್ನೆ (Question in Kannada):</label>
          <textarea id="newQText" class="form-control bg-dark text-light border-secondary" rows="2" placeholder="ಕನ್ನಡದಲ್ಲಿ ಪ್ರಶ್ನೆ ನಮೂದಿಸಿ..." required></textarea>
        </div>

        <div id="newQMcqOptionsWrap">
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ A (Option A):</label>
              <input type="text" id="newQOptA" class="form-control bg-dark text-light border-secondary" placeholder="ಆಯ್ಕೆ A">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ B (Option B):</label>
              <input type="text" id="newQOptB" class="form-control bg-dark text-light border-secondary" placeholder="ಆಯ್ಕೆ B">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ C (Option C):</label>
              <input type="text" id="newQOptC" class="form-control bg-dark text-light border-secondary" placeholder="ಆಯ್ಕೆ C">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ D (Option D):</label>
              <input type="text" id="newQOptD" class="form-control bg-dark text-light border-secondary" placeholder="ಆಯ್ಕೆ D">
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-light small fw-bold">ಸರಿಯಾದ ಉತ್ತರ (Correct Answer):</label>
            <select id="newQCorrect" class="form-select bg-dark text-success border-success">
              <option value="A">ಆಯ್ಕೆ A</option>
              <option value="B">ಆಯ್ಕೆ B</option>
              <option value="C">ಆಯ್ಕೆ C</option>
              <option value="D">ಆಯ್ಕೆ D</option>
            </select>
          </div>
        </div>

        <div id="newQPhotoAnswerWrap" class="mb-3" style="display: none;">
          <label class="form-label text-light small fw-bold">ಸರಿಯಾದ ಉತ್ತರ (ವ್ಯಕ್ತಿ/ಸ್ಥಳ/ವಸ್ತುವಿನ ಹೆಸರು):</label>
          <input type="text" id="newQPhotoAnswer" class="form-control bg-dark text-success border-success" placeholder="ಸರಿಯಾದ ಉತ್ತರ ನಮೂದಿಸಿ...">
          <div class="form-text text-secondary small">ಚಿತ್ರ ನೋಡಿ ಉತ್ತರಿಸಿ ವಿಭಾಗಕ್ಕೆ ಯಾವುದೇ ಬಹು ಆಯ್ಕೆಗಳ ಅಗತ್ಯವಿಲ್ಲ (No options needed).</div>
        </div>

        <div class="mb-3">
          <label class="form-label text-light small">ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ (Image Upload - Optional):</label>
          <input type="file" id="newQImageFile" class="form-control bg-dark text-light border-secondary" accept="image/*">
        </div>

        <div class="mb-3">
          <label class="form-label text-light small">ವಿವರಣೆ (Explanation - Optional):</label>
          <input type="text" id="newQExplanation" class="form-control bg-dark text-light border-secondary" placeholder="ಉತ್ತರದ ವಿವರಣೆ...">
        </div>
      </div>
    `;

    Swal.fire({
      title: '➕ ಹೊಸ ಪ್ರಶ್ನೆ ಸೇರಿಸಿ (Add Question)',
      html: formHtml,
      width: '700px',
      showCancelButton: true,
      confirmButtonText: 'ಸೇರಿಸಿ (Save Question)',
      cancelButtonText: 'ರದ್ದು',
      confirmButtonColor: '#f59e0b',
      didOpen: () => {
        const catSelect = document.getElementById('newQCat');
        const updateVisibility = () => {
          const isPhoto = catSelect.value === 'photo';
          const optsWrap = document.getElementById('newQMcqOptionsWrap');
          const photoWrap = document.getElementById('newQPhotoAnswerWrap');
          if (optsWrap) optsWrap.style.display = isPhoto ? 'none' : 'block';
          if (photoWrap) photoWrap.style.display = isPhoto ? 'block' : 'none';
        };
        catSelect.onchange = updateVisibility;
        updateVisibility();
      },
      preConfirm: () => {
        const catSelect = document.getElementById('newQCat');
        const catId = catSelect.value;
        const catName = catSelect.options[catSelect.selectedIndex].getAttribute('data-name');
        const text = (document.getElementById('newQText').value || '').trim();
        const explanation = (document.getElementById('newQExplanation').value || '').trim();

        if (catId === 'photo') {
          const photoAns = (document.getElementById('newQPhotoAnswer').value || '').trim();
          if (!text || !photoAns) {
            Swal.showValidationMessage('ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಮತ್ತು ಸರಿಯಾದ ಉತ್ತರವನ್ನು ಭರ್ತಿ ಮಾಡಿ');
            return false;
          }
          return { catId, catName, text, options: [], answer: photoAns, explanation };
        } else {
          const optA = (document.getElementById('newQOptA').value || '').trim();
          const optB = (document.getElementById('newQOptB').value || '').trim();
          const optC = (document.getElementById('newQOptC').value || '').trim();
          const optD = (document.getElementById('newQOptD').value || '').trim();
          const correctChoice = document.getElementById('newQCorrect').value;

          if (!text || !optA || !optB || !optC || !optD) {
            Swal.showValidationMessage('ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಮತ್ತು ಎಲ್ಲಾ 4 ಆಯ್ಕೆಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ');
            return false;
          }

          const options = [optA, optB, optC, optD];
          const answerMap = { 'A': optA, 'B': optB, 'C': optC, 'D': optD };
          const answer = answerMap[correctChoice];

          return { catId, catName, text, options, answer, explanation };
        }
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const { catId, catName, text, options, answer, explanation } = res.value;
        const fileInput = document.getElementById('newQImageFile');
        const file = fileInput && fileInput.files && fileInput.files[0];

        const saveIt = (imgData = null) => {
          this.questionManager.addQuestion({
            category: catName,
            categoryId: catId,
            question: text,
            options: options,
            answer: answer,
            explanation: explanation,
            type: catId === 'photo' || imgData ? 'photo' : (catId === 'riddles' ? 'riddle' : 'mcq'),
            image: imgData
          });
          this.engine.questions = this.questionManager.getAllQuestions();
          this.openQuestionManagerModal(catId);
        };

        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => saveIt(e.target.result);
          reader.readAsDataURL(file);
        } else {
          saveIt(null);
        }
      }
    });
  }

  _showEditQuestionDialog(qId, currentCatId = 'all') {
    const q = this.questionManager.getQuestionById(qId);
    if (!q) return;

    const categories = QUIZ_CATEGORIES;
    const formHtml = `
      <div class="text-start font-kannada">
        <div class="mb-3">
          <label class="form-label text-light small fw-bold">ವಿಭಾಗ (Category):</label>
          <select id="editQCat" class="form-select bg-dark text-warning border-secondary">
            ${categories.map(c => `
              <option value="${c.id}" data-name="${c.name}" ${c.id === q.categoryId ? 'selected' : ''}>${c.name} (${c.englishName})</option>
            `).join('')}
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-light small fw-bold">ಪ್ರಶ್ನೆ (Question):</label>
          <textarea id="editQText" class="form-control bg-dark text-light border-secondary" rows="2" required>${q.question}</textarea>
        </div>

        <div id="editQMcqOptionsWrap">
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ A:</label>
              <input type="text" id="editQOptA" class="form-control bg-dark text-light border-secondary" value="${(q.options && q.options[0]) || ''}">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ B:</label>
              <input type="text" id="editQOptB" class="form-control bg-dark text-light border-secondary" value="${(q.options && q.options[1]) || ''}">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ C:</label>
              <input type="text" id="editQOptC" class="form-control bg-dark text-light border-secondary" value="${(q.options && q.options[2]) || ''}">
            </div>
            <div class="col-6">
              <label class="form-label text-light small">ಆಯ್ಕೆ D:</label>
              <input type="text" id="editQOptD" class="form-control bg-dark text-light border-secondary" value="${(q.options && q.options[3]) || ''}">
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-light small fw-bold">ಸರಿಯಾದ ಉತ್ತರ (Correct Answer):</label>
            <select id="editQCorrect" class="form-select bg-dark text-success border-success">
              <option value="0" ${q.options && q.answer === q.options[0] ? 'selected' : ''}>ಆಯ್ಕೆ A (${(q.options && q.options[0]) || ''})</option>
              <option value="1" ${q.options && q.answer === q.options[1] ? 'selected' : ''}>ಆಯ್ಕೆ B (${(q.options && q.options[1]) || ''})</option>
              <option value="2" ${q.options && q.answer === q.options[2] ? 'selected' : ''}>ಆಯ್ಕೆ C (${(q.options && q.options[2]) || ''})</option>
              <option value="3" ${q.options && q.answer === q.options[3] ? 'selected' : ''}>ಆಯ್ಕೆ D (${(q.options && q.options[3]) || ''})</option>
            </select>
          </div>
        </div>

        <div id="editQPhotoAnswerWrap" class="mb-3" style="display: none;">
          <label class="form-label text-light small fw-bold">ಸರಿಯಾದ ಉತ್ತರ (ವ್ಯಕ್ತಿ/ಸ್ಥಳ/ವಸ್ತುವಿನ ಹೆಸರು):</label>
          <input type="text" id="editQPhotoAnswer" class="form-control bg-dark text-success border-success" value="${q.answer || ''}">
          <div class="form-text text-secondary small">ಚಿತ್ರ ನೋಡಿ ಉತ್ತರಿಸಿ ವಿಭಾಗಕ್ಕೆ ಯಾವುದೇ ಬಹು ಆಯ್ಕೆಗಳ ಅಗತ್ಯವಿಲ್ಲ (No options needed).</div>
        </div>

        <div class="mb-3">
          <label class="form-label text-light small">ಚಿತ್ರ ಬದಲಿಸಿ (Change Image - Optional):</label>
          ${q.image ? `<div class="mb-2"><img src="${q.image}" class="qm-image-preview" alt="Preview"></div>` : ''}
          <input type="file" id="editQImageFile" class="form-control bg-dark text-light border-secondary" accept="image/*">
        </div>

        <div class="mb-3">
          <label class="form-label text-light small">ವಿವರಣೆ (Explanation):</label>
          <input type="text" id="editQExplanation" class="form-control bg-dark text-light border-secondary" value="${q.explanation || ''}">
        </div>
      </div>
    `;

    Swal.fire({
      title: '✏️ ಪ್ರಶ್ನೆ ಸಂಪಾದಿಸಿ (Edit Question)',
      html: formHtml,
      width: '700px',
      showCancelButton: true,
      confirmButtonText: 'ಉಳಿಸಿ (Save Changes)',
      cancelButtonText: 'ರದ್ದು',
      confirmButtonColor: '#f59e0b',
      didOpen: () => {
        const catSelect = document.getElementById('editQCat');
        const updateVisibility = () => {
          const isPhoto = catSelect.value === 'photo';
          const optsWrap = document.getElementById('editQMcqOptionsWrap');
          const photoWrap = document.getElementById('editQPhotoAnswerWrap');
          if (optsWrap) optsWrap.style.display = isPhoto ? 'none' : 'block';
          if (photoWrap) photoWrap.style.display = isPhoto ? 'block' : 'none';
        };
        catSelect.onchange = updateVisibility;
        updateVisibility();
      },
      preConfirm: () => {
        const catSelect = document.getElementById('editQCat');
        const catId = catSelect.value;
        const catName = catSelect.options[catSelect.selectedIndex].getAttribute('data-name');
        const text = (document.getElementById('editQText').value || '').trim();
        const explanation = (document.getElementById('editQExplanation').value || '').trim();

        if (catId === 'photo') {
          const photoAns = (document.getElementById('editQPhotoAnswer').value || '').trim();
          if (!text || !photoAns) {
            Swal.showValidationMessage('ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಮತ್ತು ಸರಿಯಾದ ಉತ್ತರವನ್ನು ಭರ್ತಿ ಮಾಡಿ');
            return false;
          }
          return { catId, catName, text, options: [], answer: photoAns, explanation };
        } else {
          const optA = (document.getElementById('editQOptA').value || '').trim();
          const optB = (document.getElementById('editQOptB').value || '').trim();
          const optC = (document.getElementById('editQOptC').value || '').trim();
          const optD = (document.getElementById('editQOptD').value || '').trim();
          const correctChoice = parseInt(document.getElementById('editQCorrect').value, 10);

          if (!text || !optA || !optB || !optC || !optD) {
            Swal.showValidationMessage('ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಮತ್ತು ಎಲ್ಲಾ 4 ಆಯ್ಕೆಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ');
            return false;
          }

          const options = [optA, optB, optC, optD];
          const answer = options[correctChoice] || optA;

          return { catId, catName, text, options, answer, explanation };
        }
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const { catId, catName, text, options, answer, explanation } = res.value;
        const fileInput = document.getElementById('editQImageFile');
        const file = fileInput && fileInput.files && fileInput.files[0];

        const saveUpdated = (imgData = null) => {
          const updatePayload = {
            category: catName,
            categoryId: catId,
            question: text,
            options: options,
            answer: answer,
            explanation: explanation
          };
          if (imgData || catId === 'photo') {
            if (imgData) updatePayload.image = imgData;
            updatePayload.type = 'photo';
          }
          this.questionManager.updateQuestion(qId, updatePayload);
          this.engine.questions = this.questionManager.getAllQuestions();
          this.openQuestionManagerModal(currentCatId);
        };

        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => saveUpdated(e.target.result);
          reader.readAsDataURL(file);
        } else {
          saveUpdated(null);
        }
      }
    });
  }

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Do not trigger if user is typing in an input or textarea
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // Do not trigger quiz actions if any modal dialog is currently visible
      if (typeof Swal !== 'undefined' && Swal.isVisible()) {
        if (e.key === 'Escape') {
          Swal.close();
        }
        return;
      }

      if (this.engine.state.status === 'running') {
        const isPhotoQuestion = this.engine.state.question.type === 'photo' || this.engine.state.question.categoryId === 'photo' || this.engine.state.currentCategoryId === 'photo';

        if (isPhotoQuestion) {
          // Photo evaluation shortcuts: 'R'/'1' for Right, 'W'/'2' for Wrong
          if ((e.key === 'r' || e.key === 'R' || e.key === '1') && !this.engine.state.display.revealAnswer && this.engine.state.display.phase !== 'passing') {
            e.preventDefault();
            if (typeof soundManager !== 'undefined') soundManager.init();
            this.engine.evaluatePhotoAnswer(true);
          } else if ((e.key === 'w' || e.key === 'W' || e.key === '2') && !this.engine.state.display.revealAnswer && this.engine.state.display.phase !== 'passing') {
            e.preventDefault();
            if (typeof soundManager !== 'undefined') soundManager.init();
            this.engine.evaluatePhotoAnswer(false);
          }
        } else {
          // Numbers 1, 2, 3, 4 to select options A, B, C, D
          if (['1', '2', '3', '4'].includes(e.key)) {
            const optIdx = parseInt(e.key, 10) - 1;
            const options = this.engine.state.question.options;
            if (options && options[optIdx]) {
              const opt = options[optIdx];
              // Only select if not already eliminated
              if (!this.engine.state.question.eliminatedOptions.includes(opt)) {
                this.engine.evaluateAnswer(opt);
              }
            }
          }
        }

        // Space: Pause/Resume timer
        if (e.code === 'Space') {
          e.preventDefault();
          if (this.engine.state.timer.paused) {
            this.engine.resumeTimer();
          } else {
            this.engine.pauseTimer();
          }
        }

        // L: Leaderboard
        if (e.key === 'l' || e.key === 'L') {
          this.openLeaderboardModal();
        }

        // P: Pass question to next team
        if ((e.key === 'p' || e.key === 'P') && !this.engine.state.display.revealAnswer && this.engine.state.display.phase !== 'passing') {
          this.engine.passQuestion();
        }

        // Enter: Continue to next question if question is finished
        if (e.key === 'Enter') {
          if (this.engine.state.display.revealAnswer) {
            this.engine.nextQuestion();
          }
        }
      }

      // Esc: Close any SweetAlert modal
      if (e.key === 'Escape') {
        Swal.close();
      }
    });
  }

  _initTransportStatus() {
    if (this.transport) {
      const status = this.transport.getConnectionStatus();
      this.updateTransportStatus(status);
    }
  }

  updateTransportStatus(status) {
    const textEl = document.getElementById('projectorStatusText');
    if (!textEl) return;

    if (status.wsConnected) {
      textEl.innerText = 'ಪ್ರೊಜೆಕ್ಟರ್: ನೆಟ್‌ವರ್ಕ್ (WS)';
    } else if (status.localConnected) {
      textEl.innerText = 'ಪ್ರೊಜೆಕ್ಟರ್: ಲೋಕಲ್ ಟ್ಯಾಬ್';
    } else {
      textEl.innerText = 'ಪ್ರೊಜೆಕ್ಟರ್: ಅಸಂಪರ್ಕಿತ';
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TeacherUI };
}
