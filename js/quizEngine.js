/**
 * Core Quiz Engine
 * Authoritative controller for circular team rotation, progressive option elimination,
 * question progression, and event dispatching.
 */

// Node.js environment compatibility
if (typeof require !== 'undefined') {
  if (typeof DEFAULT_QUESTIONS === 'undefined') {
    try {
      const qMod = require('./questions');
      global.DEFAULT_QUESTIONS = qMod.DEFAULT_QUESTIONS;
      global.QUIZ_CATEGORIES = qMod.QUIZ_CATEGORIES;
    } catch (e) {}
  }
  if (typeof createInitialQuizState === 'undefined') {
    try {
      const stateMod = require('./quizState');
      global.createInitialQuizState = stateMod.createInitialQuizState;
      global.createPublicQuizState = stateMod.createPublicQuizState;
    } catch (e) {}
  }
  if (typeof QuizTimer === 'undefined') {
    try {
      const timerMod = require('./timer');
      global.QuizTimer = timerMod.QuizTimer;
    } catch (e) {}
  }
  if (typeof ScoringSystem === 'undefined') {
    try {
      const scoringMod = require('./scoringSystem');
      global.ScoringSystem = scoringMod.ScoringSystem;
    } catch (e) {}
  }
  if (typeof StorageManager === 'undefined') {
    try {
      const storageMod = require('./storage');
      global.StorageManager = storageMod.StorageManager;
    } catch (e) {}
  }
}

class QuizEngine {
  constructor(state = null, questions = null, transport = null) {
    this.questions = questions || (typeof DEFAULT_QUESTIONS !== 'undefined' ? DEFAULT_QUESTIONS : []);
    this.transport = transport;
    this.timer = new QuizTimer({
      durationMs: 30000,
      onTick: (tickData) => this._onTimerTick(tickData),
      onTimeout: () => this.handleTimeout(),
      onWarning: (sec) => this._onTimerWarning(sec)
    });

    this.state = state || createInitialQuizState();
    this.onStateChangeCallbacks = [];
    this.isEvaluating = false; // Prevents rapid double click / race condition
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.onStateChangeCallbacks.push(callback);
    }
  }

  notifyStateChange(eventType = 'STATE_UPDATED') {
    this.state.revision++;
    this.state.sequenceNumber++;

    // Persist authoritative state locally
    StorageManager.saveSession(this.state);

    // Notify local subscribers
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb(this.state, eventType);
      } catch (e) {
        console.error("QuizEngine subscriber error:", e);
      }
    });

    // Broadcast public state to projector & secondary screens
    if (this.transport) {
      const publicState = createPublicQuizState(this.state);
      this.transport.send({
        type: eventType,
        revision: this.state.revision,
        sequenceNumber: this.state.sequenceNumber,
        state: publicState
      });
    }
  }

  // ==========================================
  // TEAM MANAGEMENT & REGISTRATION
  // ==========================================
  setupTeams(teamNames) {
    if (!teamNames || teamNames.length < 2) {
      throw new Error("ಕನಿಷ್ಠ 2 ತಂಡಗಳು ಅಗತ್ಯವಿದೆ (At least 2 teams required)");
    }

    const uniqueNames = new Set();
    const formattedTeams = [];

    teamNames.forEach((name, idx) => {
      const cleanName = (name || '').trim();
      if (!cleanName) {
        throw new Error(`ತಂಡ ${idx + 1} ಕ್ಕೆ ಹೆಸರು ನಮೂದಿಸಿ (Team ${idx + 1} name cannot be empty)`);
      }
      if (uniqueNames.has(cleanName)) {
        throw new Error(`'${cleanName}' ಹೆಸರಿನ ತಂಡ ಈಗಾಗಲೇ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ (Duplicate team name)`);
      }
      uniqueNames.add(cleanName);

      formattedTeams.push({
        id: `team_${idx + 1}`,
        name: cleanName,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        timeoutCount: 0,
        categoryScores: {}
      });
    });

    this.state.teams = formattedTeams;
    this.state.status = 'ready';
    this.state.rotation.startingTeamIndex = 0;
    this.state.rotation.activeTeamIndex = 0;
    this.state.rotation.attemptedTeamIds = [];

    this.notifyStateChange('TEAMS_UPDATED');
    return this.state.teams;
  }

  // ==========================================
  // CATEGORY & QUESTION NAVIGATION
  // ==========================================
  getQuestionsForCategory(categoryId) {
    return this.questions.filter(q => q.categoryId === categoryId);
  }

  startCategory(categoryId) {
    const cat = QUIZ_CATEGORIES.find(c => c.id === categoryId) || QUIZ_CATEGORIES[0];
    const catIndex = QUIZ_CATEGORIES.findIndex(c => c.id === cat.id);
    const catQuestions = this.getQuestionsForCategory(cat.id);

    if (catQuestions.length === 0) {
      throw new Error(`ಈ ವಿಭಾಗದಲ್ಲಿ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಲ್ಲ: ${cat.name}`);
    }

    this.state.currentCategoryId = cat.id;
    this.state.currentCategoryName = cat.name;
    this.state.currentCategoryIndex = catIndex;
    this.state.currentQuestionIndex = 0;
    this.state.status = 'running';

    this.loadQuestion(catQuestions[0]);
  }

  loadQuestion(questionData) {
    this.timer.stop();
    this.isEvaluating = false;

    // Determine starting team based on overall question count rotation
    const globalQIndex = (this.state.currentCategoryIndex * 8) + this.state.currentQuestionIndex;
    const startingTeamIdx = globalQIndex % this.state.teams.length;

    this.state.rotation.startingTeamIndex = startingTeamIdx;
    this.state.rotation.activeTeamIndex = startingTeamIdx;
    this.state.rotation.attemptedTeamIds = [];

    const activeTeam = this.state.teams[startingTeamIdx];

    // Build question state
    this.state.question = {
      id: questionData.id,
      category: questionData.category,
      categoryId: questionData.categoryId,
      text: questionData.question,
      options: [...questionData.options],
      correctAnswer: questionData.answer, // Authoritative ONLY
      eliminatedOptions: [],
      availableOptions: [...questionData.options],
      type: questionData.type || 'mcq',
      image: questionData.image || null,
      explanation: questionData.explanation || ''
    };

    const attemptId = ScoringSystem.generateAttemptId(questionData.id, activeTeam.id, 1);

    this.state.attempt = {
      attemptId: attemptId,
      attemptNumber: 1,
      teamId: activeTeam.id,
      teamName: activeTeam.name,
      selectedOption: null,
      result: null,
      pointsAwarded: 0
    };

    this.state.display = {
      phase: 'question',
      revealAnswer: false,
      passMessage: "",
      passSubMessage: "",
      winnerTeam: null
    };

    // Start 30s timer
    this.timer.start(30000);
    this.state.timer = this.timer.getSnapshot();

    this.notifyStateChange('QUESTION_STARTED');
  }

  // ==========================================
  // ANSWER EVALUATION & ELIMINATION
  // ==========================================
  evaluateAnswer(selectedOption) {
    if (this.isEvaluating) return;
    if (this.state.display.phase === 'answer_revealed' || this.state.display.phase === 'passing') return;

    const currentAttemptId = this.state.attempt.attemptId;
    if (this.state.processedAttemptIds.includes(currentAttemptId)) {
      console.warn("Attempt already processed, ignoring duplicate evaluation");
      return;
    }

    this.isEvaluating = true;
    this.timer.stop();

    const isCorrect = (selectedOption === this.state.question.correctAnswer);
    const activeTeam = this.state.teams[this.state.rotation.activeTeamIndex];
    const attemptNumber = this.state.attempt.attemptNumber;
    const remainingOptionsCount = this.state.question.availableOptions.length;

    this.state.attempt.selectedOption = selectedOption;
    this.state.processedAttemptIds.push(currentAttemptId);

    if (isCorrect) {
      // ----------------------------------------
      // CORRECT ANSWER
      // ----------------------------------------
      const points = ScoringSystem.getPointsForAttempt(remainingOptionsCount, attemptNumber);

      activeTeam.score += points;
      activeTeam.correctCount = (activeTeam.correctCount || 0) + 1;
      activeTeam.categoryScores[this.state.currentCategoryId] =
        (activeTeam.categoryScores[this.state.currentCategoryId] || 0) + points;

      this.state.attempt.result = 'CORRECT';
      this.state.attempt.pointsAwarded = points;

      // Log to Score Audit
      this.state.scoring.history.push(
        ScoringSystem.createAuditEntry({
          attemptId: currentAttemptId,
          questionId: this.state.question.id,
          questionText: this.state.question.text,
          category: this.state.question.category,
          teamId: activeTeam.id,
          teamName: activeTeam.name,
          attemptNumber: attemptNumber,
          selectedOption: selectedOption,
          correctAnswer: this.state.question.correctAnswer,
          result: 'CORRECT',
          pointsAwarded: points,
          optionsRemainingCount: remainingOptionsCount
        })
      );

      this.state.display = {
        phase: 'answer_revealed',
        revealAnswer: true,
        passMessage: `ಸರಿಯಾದ ಉತ್ತರ!`,
        passSubMessage: `${activeTeam.name} ಗೆ +${points} ಅಂಕಗಳು!`,
        winnerTeam: {
          id: activeTeam.id,
          name: activeTeam.name,
          points: points,
          score: activeTeam.score
        }
      };

      this.isEvaluating = false;
      this.notifyStateChange('ANSWER_EVALUATED');

    } else {
      // ----------------------------------------
      // INCORRECT ANSWER
      // ----------------------------------------
      activeTeam.wrongCount = (activeTeam.wrongCount || 0) + 1;
      this.state.attempt.result = 'WRONG';
      this.state.attempt.pointsAwarded = 0;

      // Minimum 2-Option Retention Rule:
      // Only eliminate if strictly MORE than 2 options remain!
      if (this.state.question.availableOptions.length > 2) {
        if (!this.state.question.eliminatedOptions.includes(selectedOption)) {
          this.state.question.eliminatedOptions.push(selectedOption);
        }
        this.state.question.availableOptions = this.state.question.options.filter(
          opt => !this.state.question.eliminatedOptions.includes(opt)
        );
      }

      // Record attempted team
      this.state.rotation.attemptedTeamIds.push(activeTeam.id);

      // Audit Log
      this.state.scoring.history.push(
        ScoringSystem.createAuditEntry({
          attemptId: currentAttemptId,
          questionId: this.state.question.id,
          questionText: this.state.question.text,
          category: this.state.question.category,
          teamId: activeTeam.id,
          teamName: activeTeam.name,
          attemptNumber: attemptNumber,
          selectedOption: selectedOption,
          correctAnswer: this.state.question.correctAnswer,
          result: 'WRONG',
          pointsAwarded: 0,
          optionsRemainingCount: this.state.question.availableOptions.length
        })
      );

      // Check if all teams have attempted
      if (this.state.rotation.attemptedTeamIds.length >= this.state.teams.length) {
        this._handleAllTeamsExhausted();
      } else {
        this._passToNextTeam(false);
      }
    }
  }

  // ==========================================
  // TIMEOUT HANDLER
  // ==========================================
  handleTimeout() {
    if (this.isEvaluating) return;
    if (this.state.display.phase === 'answer_revealed' || this.state.display.phase === 'passing') return;

    this.isEvaluating = true;
    this.timer.stop();

    const currentAttemptId = this.state.attempt.attemptId;
    this.state.processedAttemptIds.push(currentAttemptId);

    const activeTeam = this.state.teams[this.state.rotation.activeTeamIndex];
    const attemptNumber = this.state.attempt.attemptNumber;
    activeTeam.timeoutCount = (activeTeam.timeoutCount || 0) + 1;

    this.state.attempt.selectedOption = null;
    this.state.attempt.result = 'TIMEOUT';
    this.state.attempt.pointsAwarded = 0;

    // Timeout rule: DO NOT remove any option! All options remain!
    this.state.rotation.attemptedTeamIds.push(activeTeam.id);

    // Audit log
    this.state.scoring.history.push(
      ScoringSystem.createAuditEntry({
        attemptId: currentAttemptId,
        questionId: this.state.question.id,
        questionText: this.state.question.text,
        category: this.state.question.category,
        teamId: activeTeam.id,
        teamName: activeTeam.name,
        attemptNumber: attemptNumber,
        selectedOption: '(ಸಮಯ ಮೀರಿದೆ / Timeout)',
        correctAnswer: this.state.question.correctAnswer,
        result: 'TIMEOUT',
        pointsAwarded: 0,
        optionsRemainingCount: this.state.question.availableOptions.length
      })
    );

    if (this.state.rotation.attemptedTeamIds.length >= this.state.teams.length) {
      this._handleAllTeamsExhausted();
    } else {
      this._passToNextTeam(true);
    }
  }

  // ==========================================
  // CIRCULAR PASSING
  // ==========================================
  _passToNextTeam(isTimeout) {
    const nextTeamIndex = (this.state.rotation.activeTeamIndex + 1) % this.state.teams.length;
    const nextTeam = this.state.teams[nextTeamIndex];
    const nextAttemptNumber = this.state.attempt.attemptNumber + 1;

    const remainingCount = this.state.question.availableOptions.length;
    const nextPoints = ScoringSystem.getPointsForAttempt(remainingCount, nextAttemptNumber);

    this.state.display = {
      phase: 'passing',
      revealAnswer: false,
      passMessage: isTimeout ? 'ಸಮಯ ಮುಗಿದಿದೆ!' : 'ತಪ್ಪು ಉತ್ತರ!',
      passSubMessage: `ಮುಂದಿನ ಅವಕಾಶ ${nextTeam.name} ಗೆ! (+${nextPoints} ಅಂಕಗಳು)`,
      winnerTeam: null
    };

    this.notifyStateChange('TEAM_PASSED');

    const passDelay = (typeof this.passDelayMs !== 'undefined') ? this.passDelayMs : 1600;

    if (passDelay === 0) {
      this._activateNextAttempt(nextTeamIndex, nextTeam, nextAttemptNumber);
    } else {
      clearTimeout(this.passTimeoutId);
      this.passTimeoutId = setTimeout(() => {
        this._activateNextAttempt(nextTeamIndex, nextTeam, nextAttemptNumber);
      }, passDelay);
    }
  }

  _activateNextAttempt(nextTeamIndex, nextTeam, nextAttemptNumber) {
    this.state.rotation.activeTeamIndex = nextTeamIndex;
    const newAttemptId = ScoringSystem.generateAttemptId(this.state.question.id, nextTeam.id, nextAttemptNumber);

    this.state.attempt = {
      attemptId: newAttemptId,
      attemptNumber: nextAttemptNumber,
      teamId: nextTeam.id,
      teamName: nextTeam.name,
      selectedOption: null,
      result: null,
      pointsAwarded: 0
    };

    this.state.display.phase = 'question';
    this.state.display.passMessage = "";
    this.state.display.passSubMessage = "";

    this.isEvaluating = false;
    this.timer.start(30000);
    this.state.timer = this.timer.getSnapshot();

    this.notifyStateChange('ATTEMPT_STARTED');
  }

  _handleAllTeamsExhausted() {
    this.timer.stop();
    this.state.display = {
      phase: 'answer_revealed',
      revealAnswer: true,
      passMessage: 'ಯಾವ ತಂಡವೂ ಸರಿಯಾದ ಉತ್ತರ ನೀಡಿಲ್ಲ!',
      passSubMessage: `ಸರಿಯಾದ ಉತ್ತರ: ${this.state.question.correctAnswer}`,
      winnerTeam: null
    };
    this.isEvaluating = false;
    this.notifyStateChange('QUESTION_EXHAUSTED');
  }

  // ==========================================
  // NEXT QUESTION & SECTION PROGRESSION
  // ==========================================
  nextQuestion() {
    this.timer.stop();
    const catQuestions = this.getQuestionsForCategory(this.state.currentCategoryId);
    const nextIndex = this.state.currentQuestionIndex + 1;

    if (nextIndex < catQuestions.length) {
      this.state.currentQuestionIndex = nextIndex;
      this.loadQuestion(catQuestions[nextIndex]);
    } else {
      // Category finished! Show Section Leaderboard
      this.showSectionLeaderboard();
    }
  }

  previousQuestion() {
    if (this.state.currentQuestionIndex > 0) {
      this.timer.stop();
      const prevIndex = this.state.currentQuestionIndex - 1;
      this.state.currentQuestionIndex = prevIndex;
      const catQuestions = this.getQuestionsForCategory(this.state.currentCategoryId);
      this.loadQuestion(catQuestions[prevIndex]);
    }
  }

  skipQuestion() {
    this.timer.stop();
    this.nextQuestion();
  }

  revealAnswerManually() {
    this.timer.stop();
    this.state.display.phase = 'answer_revealed';
    this.state.display.revealAnswer = true;
    this.notifyStateChange('ANSWER_REVEALED');
  }

  showSectionLeaderboard() {
    this.timer.stop();
    this.state.status = 'section_complete';
    this.state.display.phase = 'section_leaderboard';
    this.notifyStateChange('SECTION_LEADERBOARD');
  }

  proceedToNextSection() {
    const nextCatIndex = this.state.currentCategoryIndex + 1;
    if (nextCatIndex < QUIZ_CATEGORIES.length) {
      const nextCategory = QUIZ_CATEGORIES[nextCatIndex];
      this.startCategory(nextCategory.id);
    } else {
      this.showGrandFinale();
    }
  }

  showGrandFinale() {
    this.timer.stop();
    this.state.status = 'finished';
    this.state.display.phase = 'finale_podium';
    this.notifyStateChange('GRAND_FINALE');
  }

  // ==========================================
  // TIMER CONTROLS
  // ==========================================
  pauseTimer() {
    this.timer.pause();
    this.state.timer = this.timer.getSnapshot();
    this.notifyStateChange('TIMER_PAUSED');
  }

  resumeTimer() {
    this.timer.resume();
    this.state.timer = this.timer.getSnapshot();
    this.notifyStateChange('TIMER_RESUMED');
  }

  resetCurrentTimer() {
    this.timer.start(30000);
    this.state.timer = this.timer.getSnapshot();
    this.notifyStateChange('TIMER_STARTED');
  }

  _onTimerTick(tickData) {
    this.state.timer.remainingMs = tickData.remainingMs;
    this.state.timer.paused = tickData.paused;
    // Notify locally for smooth UI rendering
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb(this.state, 'TIMER_TICK');
      } catch (e) {}
    });
  }

  _onTimerWarning(remainingSec) {
    if (typeof soundManager !== 'undefined') {
      soundManager.playWarning();
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuizEngine };
}
