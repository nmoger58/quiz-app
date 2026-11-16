/**
 * Kannada Quiz Arena - Comprehensive Test Suite
 * Tests all core functional logic, scoring rules, option elimination,
 * circular rotation, timeout rules, idempotency, and security requirements.
 */

const assert = require('assert');
const { DEFAULT_QUESTIONS, QUIZ_CATEGORIES } = require('../js/questions');
const { createInitialQuizState, createPublicQuizState } = require('../js/quizState');
const { ScoringSystem } = require('../js/scoringSystem');
const { QuizEngine } = require('../js/quizEngine');

// Mock localStorage for headless Node testing
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
  clear() { this.data = {}; }
};

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("\n=======================================================");
console.log("🚩 RUNNING KANNADA QUIZ ARENA VALIDATION TESTS");
console.log("=======================================================\n");

// 1. Content & Categories Verification
console.log("--- 1. Question Bank & Categories ---");
runTest("All 6 required categories are defined", () => {
  assert.strictEqual(QUIZ_CATEGORIES.length, 6);
  const ids = QUIZ_CATEGORIES.map(c => c.id);
  assert.deepStrictEqual(ids, ['gk', 'sports', 'computer', 'science', 'photo', 'riddles']);
});

runTest("All questions have 4 options and valid correct answers", () => {
  assert(DEFAULT_QUESTIONS.length >= 48, `Expected at least 48 questions, got ${DEFAULT_QUESTIONS.length}`);
  DEFAULT_QUESTIONS.forEach(q => {
    assert(q.id, `Question missing ID: ${q.question}`);
    assert(q.options && q.options.length === 4, `Question ${q.id} must have 4 options`);
    assert(q.options.includes(q.answer), `Correct answer '${q.answer}' not in options for Q ${q.id}`);
  });
});

// 2. Scoring System Verification
console.log("\n--- 2. Scoring System Rules ---");
runTest("4 options remaining awards 10 points", () => {
  assert.strictEqual(ScoringSystem.getPointsForAttempt(4, 1), 10);
});

runTest("3 options remaining awards 5 points", () => {
  assert.strictEqual(ScoringSystem.getPointsForAttempt(3, 2), 5);
});

runTest("2 options remaining awards 3 points", () => {
  assert.strictEqual(ScoringSystem.getPointsForAttempt(2, 3), 3);
  assert.strictEqual(ScoringSystem.getPointsForAttempt(2, 4), 3);
  assert.strictEqual(ScoringSystem.getPointsForAttempt(2, 8), 3);
});

// 3. Team Registration & Validation
console.log("\n--- 3. Team Registration ---");
runTest("Team registration accepts valid custom team names", () => {
  const engine = new QuizEngine();
  const teams = engine.setupTeams(['ತಂಡ A', 'ತಂಡ B', 'ತಂಡ C', 'ತಂಡ D']);
  assert.strictEqual(teams.length, 4);
  assert.strictEqual(teams[0].name, 'ತಂಡ A');
  assert.strictEqual(teams[0].score, 0);
});

runTest("Rejects duplicate team names", () => {
  const engine = new QuizEngine();
  assert.throws(() => {
    engine.setupTeams(['ತಂಡ A', 'ತಂಡ B', 'ತಂಡ A']);
  }, /Duplicate|ಆಗಾಗಲೇ/);
});

runTest("Rejects empty or blank team names", () => {
  const engine = new QuizEngine();
  assert.throws(() => {
    engine.setupTeams(['ತಂಡ A', '   ', 'ತಂಡ C']);
  }, /cannot be empty|ಹೆಸರು ನಮೂದಿಸಿ/);
});

runTest("Rejects fewer than 2 teams", () => {
  const engine = new QuizEngine();
  assert.throws(() => {
    engine.setupTeams(['ಏಕೈಕ ತಂಡ']);
  }, /At least 2 teams|ಕನಿಷ್ಠ 2 ತಂಡಗಳು/);
});

// 4. Circular Rotation & Starting Team Rotation
console.log("\n--- 4. Circular Team Rotation & Fair Distribution ---");
runTest("Starting team rotates for every new question", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  // Question 1: global index 0 -> starting team T1 (index 0)
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 0);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 0);
  assert.strictEqual(engine.state.attempt.teamName, 'T1');

  // Move to Question 2: global index 1 -> starting team T2 (index 1)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 1);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1);
  assert.strictEqual(engine.state.attempt.teamName, 'T2');

  // Move to Question 3: global index 2 -> starting team T3 (index 2)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 2);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2);
  assert.strictEqual(engine.state.attempt.teamName, 'T3');
});

// 5. Option Elimination & Minimum 2-Option Retention Rule
console.log("\n--- 5. Option Elimination & 2-Option Retention Rule ---");
runTest("Incorrect answer on attempt 1 eliminates chosen option (4 -> 3)", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOption = q.options.find(o => o !== q.correctAnswer);

  assert.strictEqual(q.availableOptions.length, 4);
  engine.evaluateAnswer(wrongOption);

  // Now available options must be 3
  assert.strictEqual(engine.state.question.availableOptions.length, 3);
  assert(engine.state.question.eliminatedOptions.includes(wrongOption));
  assert.strictEqual(engine.state.teams[0].score, 0);
  assert.strictEqual(engine.state.teams[0].wrongCount, 1);
});

runTest("Incorrect answer on attempt 2 eliminates chosen option (3 -> 2)", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOptions = q.options.filter(o => o !== q.correctAnswer);

  // Attempt 1: wrong
  engine.evaluateAnswer(wrongOptions[0]);
  assert.strictEqual(engine.state.question.availableOptions.length, 3);

  // Attempt 2: wrong
  engine.evaluateAnswer(wrongOptions[1]);

  // Now available options must be 2
  assert.strictEqual(engine.state.question.availableOptions.length, 2);
  assert(engine.state.question.eliminatedOptions.includes(wrongOptions[1]));
});

runTest("CRUCIAL: When 2 options remain, incorrect answer NEVER eliminates further (Minimum 2-option rule)", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4', 'T5']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOptions = q.options.filter(o => o !== q.correctAnswer);

  // Attempt 1: eliminates 1st wrong option (3 left)
  engine.evaluateAnswer(wrongOptions[0]);
  assert.strictEqual(engine.state.question.availableOptions.length, 3);

  // Attempt 2: eliminates 2nd wrong option (2 left)
  engine.evaluateAnswer(wrongOptions[1]);
  assert.strictEqual(engine.state.question.availableOptions.length, 2);

  // Attempt 3: 3rd wrong option (Attempt on remaining 2 options)
  engine.evaluateAnswer(wrongOptions[2]);

  // MUST STILL HAVE EXACTLY 2 OPTIONS REMAINING!
  assert.strictEqual(engine.state.question.availableOptions.length, 2, "Options must NOT be reduced below 2!");
  assert.strictEqual(engine.state.question.eliminatedOptions.length, 2, "Eliminated options count must remain 2");
});

// 6. Timeout Rule Verification
console.log("\n--- 6. Timeout Rule ---");
runTest("Timeout does not eliminate any option and awards 0 points", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  assert.strictEqual(engine.state.question.availableOptions.length, 4);
  engine.handleTimeout();

  // All 4 options must still be available
  assert.strictEqual(engine.state.question.availableOptions.length, 4);
  assert.strictEqual(engine.state.question.eliminatedOptions.length, 0);
  assert.strictEqual(engine.state.teams[0].score, 0);
  assert.strictEqual(engine.state.teams[0].timeoutCount, 1);
});

// 7. Correct Evaluation & Cumulative Scoring
console.log("\n--- 7. Correct Answer Scoring & Cumulative Totals ---");
runTest("Correct answer on attempt 1 awards 10 points", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const correctAns = engine.state.question.correctAnswer;
  engine.evaluateAnswer(correctAns);

  assert.strictEqual(engine.state.teams[0].score, 10);
  assert.strictEqual(engine.state.teams[0].correctCount, 1);
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
});

runTest("Cumulative scores are preserved across questions", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  // Q1: T1 answers correctly (+10)
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[0].score, 10);

  // Q2: Starts with T2. T2 answers incorrectly, passes to T3. T3 answers correctly (+5)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1); // T2

  // Q2 correct answer for T2 (+10)
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[1].score, 10);
  // T1 score must still be 10
  assert.strictEqual(engine.state.teams[0].score, 10);
});

// 8. Public State Privacy & Security
console.log("\n--- 8. Projector Public State Security ---");
runTest("Public projector state DOES NOT reveal correct answer before evaluation", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const publicState = createPublicQuizState(engine.state);
  assert.strictEqual(publicState.display.revealAnswer, false);
  assert.strictEqual(publicState.question.correctAnswer, null, "Correct answer must be hidden before reveal!");
  assert.strictEqual(publicState.question.explanation, null, "Explanation must be hidden before reveal!");
});

runTest("Public projector state reveals correct answer only AFTER teacher evaluation", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  engine.evaluateAnswer(engine.state.question.correctAnswer);

  const publicState = createPublicQuizState(engine.state);
  assert.strictEqual(publicState.display.revealAnswer, true);
  assert.strictEqual(publicState.question.correctAnswer, engine.state.question.correctAnswer);
});

// 9. Score Audit Log
console.log("\n--- 9. Score Audit History ---");
runTest("Audit log records attempt details", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  engine.evaluateAnswer(engine.state.question.correctAnswer);
  const history = engine.state.scoring.history;

  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].teamName, 'T1');
  assert.strictEqual(history[0].result, 'CORRECT');
  assert.strictEqual(history[0].pointsAwarded, 10);
});

console.log("\n=======================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed.`);
console.log("=======================================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
