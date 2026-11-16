/**
 * Single Authoritative Quiz State & Public Projection Builder
 */

function createInitialQuizState(sessionId = 'KA-DEMO') {
  return {
    sessionId: sessionId,
    revision: 1,
    sequenceNumber: 1,
    status: 'setup', // 'setup', 'category_select', 'running', 'section_complete', 'finished'

    currentCategoryIndex: 0,
    currentCategoryId: 'gk',
    currentCategoryName: 'ಸಾಮಾನ್ಯ ಜ್ಞಾನ',
    currentQuestionIndex: 0,
    currentQuestionId: 101,

    teams: [
      { id: 'team_1', name: 'ತಂಡ 1 (ಕದಂಬ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_2', name: 'ತಂಡ 2 (ಚಾಲುಕ್ಯ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_3', name: 'ತಂಡ 3 (ರಾಷ್ಟ್ರಕೂಟ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_4', name: 'ತಂಡ 4 (ಹೊಯ್ಸಳ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_5', name: 'ತಂಡ 5 (ವಿಜಯನಗರ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_6', name: 'ತಂಡ 6 (ಒಡೆಯರ್)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_7', name: 'ತಂಡ 7 (ಗಂಗ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} },
      { id: 'team_8', name: 'ತಂಡ 8 (ಬಹಮನಿ)', score: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0, categoryScores: {} }
    ],

    rotation: {
      startingTeamIndex: 0,
      activeTeamIndex: 0,
      attemptedTeamIds: []
    },

    question: {
      id: 101,
      category: 'ಸಾಮಾನ್ಯ ಜ್ಞಾನ',
      categoryId: 'gk',
      text: "'ಸತ್ಯಮೇವ ಜಯತೇ' ಎಂಬ ರಾಷ್ಟ್ರೀಯ ಲಾಂಛನದ ನುಡಿಗಟ್ಟು ಯಾವ ಭಾಷೆಯಲ್ಲಿದೆ?",
      options: ["ಕನ್ನಡ", "ಸಂಸ್ಕೃತ", "ಹಿಂದಿ", "ಇಂಗ್ಲಿಷ್"],
      correctAnswer: "ಸಂಸ್ಕೃತ", // Authoritative ONLY
      eliminatedOptions: [],
      availableOptions: ["ಕನ್ನಡ", "ಸಂಸ್ಕೃತ", "ಹಿಂದಿ", "ಇಂಗ್ಲಿಷ್"],
      type: "mcq",
      image: null,
      explanation: "'ಸತ್ಯಮೇವ ಜಯತೇ' ಎಂಬುದು ಮುಂಡಕೋಪನಿಷತ್ತಿನ ಪ್ರಸಿದ್ಧ ಮಂತ್ರವಾಗಿದ್ದು, ದೇವನಾಗರಿ ಲಿಪಿಯ ಸಂಸ್ಕೃತ ಭಾಷೆಯಲ್ಲಿದೆ."
    },

    timer: {
      durationMs: 30000,
      deadlineAt: null,
      remainingMs: 30000,
      paused: false,
      pausedRemainingMs: 30000
    },

    attempt: {
      attemptId: null,
      attemptNumber: 1,
      teamId: 'team_1',
      teamName: 'ತಂಡ 1 (ಕದಂಬ)',
      selectedOption: null,
      result: null, // 'correct', 'wrong', 'timeout'
      pointsAwarded: 0
    },

    scoring: {
      history: []
    },

    display: {
      phase: 'waiting', // 'waiting', 'question', 'passing', 'answer_revealed', 'section_leaderboard', 'finale_podium'
      revealAnswer: false,
      passMessage: "",
      passSubMessage: "",
      winnerTeam: null,
      passUntil: null
    },

    processedAttemptIds: [],
    completedQuestionIds: []
  };
}

/**
 * Creates an audience-safe Public State projection for the Projector Display.
 * Crucial Rule: NEVER leak the correctAnswer or teacher-only data before reveal!
 */
function createPublicQuizState(state) {
  if (!state) return null;

  const isPhoto = state.question.type === 'photo' || state.question.categoryId === 'photo' || state.currentCategoryId === 'photo';

  const publicQuestion = {
    id: state.question.id,
    category: state.question.category,
    categoryId: state.question.categoryId,
    text: state.question.text,
    options: isPhoto ? [] : [...state.question.options],
    eliminatedOptions: isPhoto ? [] : [...state.question.eliminatedOptions],
    availableOptions: isPhoto ? [] : [...state.question.availableOptions],
    type: state.question.type,
    image: state.question.image,
    // Only reveal correct answer after evaluation!
    correctAnswer: state.display.revealAnswer ? state.question.correctAnswer : null,
    explanation: state.display.revealAnswer ? state.question.explanation : null
  };

  return {
    sessionId: state.sessionId,
    revision: state.revision,
    sequenceNumber: state.sequenceNumber,
    status: state.status,

    currentCategoryIndex: state.currentCategoryIndex,
    currentCategoryId: state.currentCategoryId,
    currentCategoryName: state.currentCategoryName,
    currentQuestionIndex: state.currentQuestionIndex,
    currentQuestionId: state.currentQuestionId,

    // Public team info: ID, Name, Score, Correct Count
    teams: state.teams.map(t => ({
      id: t.id,
      name: t.name,
      score: t.score,
      correctCount: t.correctCount,
      wrongCount: t.wrongCount,
      timeoutCount: t.timeoutCount,
      categoryScores: { ...(t.categoryScores || {}) }
    })),

    rotation: {
      startingTeamIndex: state.rotation.startingTeamIndex,
      activeTeamIndex: state.rotation.activeTeamIndex,
      attemptedTeamIds: [...state.rotation.attemptedTeamIds]
    },

    question: publicQuestion,

    timer: {
      durationMs: state.timer.durationMs,
      deadlineAt: state.timer.deadlineAt,
      remainingMs: state.timer.remainingMs,
      paused: state.timer.paused,
      pausedRemainingMs: state.timer.pausedRemainingMs
    },

    attempt: {
      attemptNumber: state.attempt.attemptNumber,
      teamId: state.attempt.teamId,
      teamName: state.attempt.teamName,
      selectedOption: state.attempt.selectedOption,
      result: state.attempt.result,
      pointsAwarded: state.attempt.pointsAwarded
    },

    display: {
      phase: state.display.phase,
      revealAnswer: state.display.revealAnswer,
      passMessage: state.display.passMessage,
      passSubMessage: state.display.passSubMessage,
      winnerTeam: state.display.winnerTeam ? { ...state.display.winnerTeam } : null,
      passUntil: state.display.passUntil || null
    },
    completedQuestionIds: [...(state.completedQuestionIds || [])]
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createInitialQuizState, createPublicQuizState };
}
