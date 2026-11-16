/**
 * Teacher Console Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Get or create session ID
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session') || StorageManager.getActiveSessionId();
  if (!sessionId) {
    sessionId = StorageManager.generateSessionId();
  }

  // 2. Initialize Transport
  const transport = new QuizTransport();
  transport.connect(sessionId, 'teacher');

  // 3. Initialize Question Manager
  const questionManager = new QuestionManager(DEFAULT_QUESTIONS);

  // 4. Load persisted state or create initial
  let savedState = StorageManager.loadSession(sessionId);
  if (!savedState) {
    savedState = createInitialQuizState(sessionId);
  } else {
    savedState.sessionId = sessionId;
  }

  // 5. Initialize Engine
  const engine = new QuizEngine(savedState, questionManager.getAllQuestions(), transport);

  // 6. Initialize UI
  const teacherUI = new TeacherUI(engine, questionManager, transport);
  window.teacherUI = teacherUI;
  window.quizEngine = engine;

  teacherUI.init();
});
