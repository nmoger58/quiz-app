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
const { QuestionManager } = require('../js/questionManager');
const { TeamManager } = require('../js/teamManager');

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

runTest("All non-photo questions have 4 options and photo questions have 0 options", () => {
  assert(DEFAULT_QUESTIONS.length >= 48, `Expected at least 48 questions, got ${DEFAULT_QUESTIONS.length}`);
  DEFAULT_QUESTIONS.forEach(q => {
    assert(q.id, `Question missing ID: ${q.question}`);
    if (q.categoryId === 'photo') {
      assert(Array.isArray(q.options) && q.options.length === 0, `Photo question ${q.id} must have NO options (empty array)`);
      assert(typeof q.answer === 'string' && q.answer.trim().length > 0, `Photo question ${q.id} must have valid answer text`);
    } else {
      assert(q.options && q.options.length === 4, `Question ${q.id} must have 4 options`);
      assert(q.options.includes(q.answer), `Correct answer '${q.answer}' not in options for Q ${q.id}`);
    }
  });
});

runTest("All photo questions reference existing image files on disk and older SVGs are deleted", () => {
  const fs = require('fs');
  const path = require('path');
  const photoQs = DEFAULT_QUESTIONS.filter(q => q.categoryId === 'photo');
  assert(photoQs.length >= 8, "Expected at least 8 photo questions");
  photoQs.forEach(q => {
    assert(q.image, `Photo question ${q.id} is missing image property`);
    const fullPath = path.resolve(__dirname, '..', q.image);
    assert(fs.existsSync(fullPath), `Referenced image file does not exist: ${fullPath}`);
  });

  // Verify older generated SVGs are removed
  const oldSvgs = [
    'photo_dravid.svg',
    'photo_gol_gumbaz.svg',
    'photo_gommateshwara.svg',
    'photo_hampi.svg',
    'photo_jog_falls.svg',
    'photo_kuvempu.svg',
    'photo_mysore_palace.svg',
    'photo_rajkumar.svg'
  ];
  oldSvgs.forEach(svg => {
    const svgPath = path.resolve(__dirname, '../assets/images', svg);
    assert(!fs.existsSync(svgPath), `Old generated SVG must be deleted: ${svg}`);
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

runTest("TeamManager helper correctly calculates next team and starting team", () => {
  assert.strictEqual(TeamManager.getNextActiveTeamIndex(0, 4), 1);
  assert.strictEqual(TeamManager.getNextActiveTeamIndex(3, 4), 0);
  assert.strictEqual(TeamManager.getStartingTeamForQuestion(5, 4), 1);
  const created = TeamManager.createTeams(['ಆಲ್ಫಾ', 'ಬ್ರಾವೋ']);
  assert.strictEqual(created.length, 2);
  assert.strictEqual(created[0].id, 'team_1');
  assert.strictEqual(created[0].name, 'ಆಲ್ಫಾ');
  assert.strictEqual(created[0].score, 0);
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

// 10. Multi-Team Circular Rotation (4, 5, 8, 10 Teams)
console.log("\n--- 10. Multi-Team Circular Rotation Scaling ---");
[4, 5, 8, 10].forEach(numTeams => {
  runTest(`Circular team rotation functions cleanly with ${numTeams} teams`, () => {
    const engine = new QuizEngine();
    engine.passDelayMs = 0;
    const names = Array.from({ length: numTeams }, (_, i) => `Team_${i + 1}`);
    engine.setupTeams(names);
    engine.startCategory('gk');

    // Verify starting team for Q1 is index 0
    assert.strictEqual(engine.state.rotation.activeTeamIndex, 0);

    // Pass through all teams
    for (let pass = 0; pass < numTeams - 1; pass++) {
      engine.handleTimeout();
      assert.strictEqual(engine.state.rotation.activeTeamIndex, (pass + 1) % numTeams);
    }

    // Final attempt times out -> question exhausted
    engine.handleTimeout();
    assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  });
});

// 11. Continuous Starting-Team Rotation Across Questions and Sections
console.log("\n--- 11. Continuous Rotation Across Questions & Sections ---");
runTest("Starting team index advances by 1 across every question and section boundary", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['A', 'B', 'C', 'D']);
  engine.startCategory('gk');

  // Q1: starts with A (index 0)
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 0);

  // Q2: starts with B (index 1)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 1);

  // Q3: starts with C (index 2)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 2);

  // Skip Q3 -> Q4: starts with D (index 3)
  engine.skipQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 3);

  // Q5: wraps back to A (index 0)
  engine.nextQuestion();
  assert.strictEqual(engine.state.rotation.startingTeamIndex, 0);
});

// 12. Security & Idempotency: Rejection of Eliminated Options and Completed Questions
console.log("\n--- 12. Duplicate Scoring & Elimination Security ---");
runTest("Attempting to evaluate an already eliminated option is rejected", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOpt = q.options.find(o => o !== q.correctAnswer);

  // Attempt 1: wrongOpt is eliminated
  engine.evaluateAnswer(wrongOpt);
  assert(engine.state.question.eliminatedOptions.includes(wrongOpt));

  const team2ScoreBefore = engine.state.teams[1].score;
  const historyLenBefore = engine.state.scoring.history.length;

  // Attempt 2: trying to submit the same eliminated option should be ignored
  engine.evaluateAnswer(wrongOpt);
  assert.strictEqual(engine.state.teams[1].score, team2ScoreBefore);
  assert.strictEqual(engine.state.scoring.history.length, historyLenBefore);
});

runTest("Cannot score a question that has already been completed", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  // Answer Q1 correctly
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[0].score, 10);

  // Attempting to evaluate again on the same question is blocked
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[0].score, 10);
  assert.strictEqual(engine.state.teams[0].correctCount, 1);
});

// 13. Question Manager CRUD, Enable/Disable & Reorder
console.log("\n--- 13. Question Manager CRUD & Operations ---");
runTest("Question Manager supports adding, editing, deleting, toggle enable, and moving", () => {
  const qm = new QuestionManager(DEFAULT_QUESTIONS);
  const initialCount = qm.getAllQuestions().length;

  // Add
  const newQ = qm.addQuestion({
    category: "ಕಂಪ್ಯೂಟರ್",
    categoryId: "computer",
    question: "ಹೊಸ ಪರೀಕ್ಷಾ ಪ್ರಶ್ನೆ?",
    options: ["ಆಯ್ಕೆ 1", "ಆಯ್ಕೆ 2", "ಆಯ್ಕೆ 3", "ಆಯ್ಕೆ 4"],
    answer: "ಆಯ್ಕೆ 1",
    explanation: "ಪರೀಕ್ಷಾರ್ಥ ವಿವರಣೆ"
  });
  assert(newQ && newQ.id);
  assert.strictEqual(qm.getAllQuestions().length, initialCount + 1);

  // Edit
  qm.updateQuestion(newQ.id, { question: "ಬದಲಾದ ಪ್ರಶ್ನೆ?", answer: "ಆಯ್ಕೆ 2" });
  const updated = qm.getQuestionById(newQ.id);
  assert.strictEqual(updated.question, "ಬದಲಾದ ಪ್ರಶ್ನೆ?");
  assert.strictEqual(updated.answer, "ಆಯ್ಕೆ 2");

  // Toggle Enable
  qm.toggleEnable(newQ.id);
  assert.strictEqual(updated.enabled, false);
  assert.strictEqual(qm.getAllQuestions(true).length, initialCount); // onlyEnabled filters it out
  qm.toggleEnable(newQ.id);
  assert.strictEqual(updated.enabled, true);

  // Move
  qm.moveQuestion(newQ.id, 'up');

  // Delete
  qm.deleteQuestion(newQ.id);
  assert.strictEqual(qm.getAllQuestions().length, initialCount);
});

// 14. Timeout followed by Correct with 4 options awards 10 points
console.log("\n--- 14. Scoring Post-Timeout ---");
runTest("Timeout does not eliminate options; subsequent team answering correctly with 4 options earns 10 points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  // T1 times out
  engine.handleTimeout();
  assert.strictEqual(engine.state.question.availableOptions.length, 4);

  // T2 answers correctly with 4 options remaining
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[1].score, 10);
  assert.strictEqual(engine.state.attempt.pointsAwarded, 10);
});

// 15. Pass Question Logic (Skip button acts like a pass button)
console.log("\n--- 15. Pass Question Logic ---");
runTest("passQuestion passes the same question to the next team without eliminating options", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const initialQId = engine.state.question.id;
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 0); // T1
  assert.strictEqual(engine.state.question.availableOptions.length, 4);

  // T1 passes
  engine.passQuestion();

  // Same question is now active for T2
  assert.strictEqual(engine.state.question.id, initialQId);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1); // T2
  assert.strictEqual(engine.state.attempt.teamName, 'T2');
  assert.strictEqual(engine.state.attempt.attemptNumber, 2);
  // All 4 options must still be available
  assert.strictEqual(engine.state.question.availableOptions.length, 4);
  assert.strictEqual(engine.state.teams[0].score, 0);
  assert.strictEqual(engine.state.teams[0].passCount, 1);

  // T2 answers correctly with 4 options remaining -> 10 points
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.teams[1].score, 10);
});

runTest("All teams passing on a question exhausts the question and reveals answer", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3']);
  engine.startCategory('gk');
  const qId = engine.state.question.id;

  engine.passQuestion(); // T1 passes -> T2
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1);
  engine.passQuestion(); // T2 passes -> T3
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2);
  engine.passQuestion(); // T3 passes -> All teams exhausted!

  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
  assert(engine.state.completedQuestionIds.includes(qId));
  assert.strictEqual(engine.state.display.winnerTeam, null);
});

// 16. Stop Question When Guessing Wrong on 2 Options
console.log("\n--- 16. Stop Question on Wrong Guess with 2 Options ---");
runTest("If a team guesses wrong when there are only 2 options, stop that question immediately", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4', 'T5']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOptions = q.options.filter(o => o !== q.correctAnswer);

  // Attempt 1: T1 wrong -> eliminates 1st wrong option (3 options left)
  engine.evaluateAnswer(wrongOptions[0]);
  assert.strictEqual(engine.state.question.availableOptions.length, 3);
  assert.strictEqual(engine.state.display.phase, 'question');
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1); // T2

  // Attempt 2: T2 wrong -> eliminates 2nd wrong option (2 options left)
  engine.evaluateAnswer(wrongOptions[1]);
  assert.strictEqual(engine.state.question.availableOptions.length, 2);
  assert.strictEqual(engine.state.display.phase, 'question');
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2); // T3

  // Attempt 3: T3 guesses wrong when only 2 options remain!
  engine.evaluateAnswer(wrongOptions[2]);

  // The question MUST BE STOPPED!
  assert.strictEqual(engine.state.display.phase, 'answer_revealed', "Phase must be answer_revealed");
  assert.strictEqual(engine.state.display.revealAnswer, true, "revealAnswer must be true");
  assert(engine.state.completedQuestionIds.includes(q.id), "Question ID must be in completedQuestionIds");
  assert.strictEqual(engine.state.display.winnerTeam, null, "winnerTeam must be null");

  // It must NOT pass to T4! T3 must remain the last active team index
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2, "Must not advance to next team");

  // Subsequent answer evaluations on this stopped question must be rejected
  const t4 = engine.state.teams[3];
  const initialT4Score = t4.score;
  engine.evaluateAnswer(q.correctAnswer);
  assert.strictEqual(t4.score, initialT4Score, "Cannot score a stopped question");
});

runTest("Pass when 2 options remain allows next team to attempt, and wrong guess stops question", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOptions = q.options.filter(o => o !== q.correctAnswer);

  // Attempt 1: T1 wrong (3 left)
  engine.evaluateAnswer(wrongOptions[0]);
  // Attempt 2: T2 wrong (2 left)
  engine.evaluateAnswer(wrongOptions[1]);
  assert.strictEqual(engine.state.question.availableOptions.length, 2);

  // T3 passes with 2 options left (did NOT guess wrong)
  engine.passQuestion();
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 3); // Passes to T4
  assert.strictEqual(engine.state.question.availableOptions.length, 2);

  // T4 guesses wrong on 2 options -> STOP!
  engine.evaluateAnswer(wrongOptions[2]);
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
  assert(engine.state.completedQuestionIds.includes(q.id));
});

runTest("Correct answer when 2 options remain awards 3 points and finishes question normally", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3', 'T4']);
  engine.startCategory('gk');

  const q = engine.state.question;
  const wrongOptions = q.options.filter(o => o !== q.correctAnswer);

  // Attempt 1: T1 wrong (3 left)
  engine.evaluateAnswer(wrongOptions[0]);
  // Attempt 2: T2 wrong (2 left)
  engine.evaluateAnswer(wrongOptions[1]);

  // Attempt 3: T3 answers CORRECTLY on 2 options
  engine.evaluateAnswer(q.correctAnswer);
  assert.strictEqual(engine.state.teams[2].score, 3);
  assert.strictEqual(engine.state.attempt.result, 'CORRECT');
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
});

// 17. UI Verification: Reveal button removed, skip button acts as pass button
console.log("\n--- 17. Teacher UI Verification ---");
runTest("Teacher UI action bar does not contain revealAnswerBtn and has pass button", () => {
  const fs = require('fs');
  const teacherUiCode = fs.readFileSync(__dirname + '/../js/teacherUI.js', 'utf8');

  // Verify revealAnswerBtn is removed
  assert(!teacherUiCode.includes('id="revealAnswerBtn"'), "revealAnswerBtn must be removed from teacherUI");
  assert(!teacherUiCode.includes("this.engine.revealAnswerManually()"), "revealAnswerManually call should be removed from teacherUI events");

  // Verify pass button exists and invokes passQuestion
  assert(teacherUiCode.includes('id="skipQBtn"'), "skipQBtn element should exist for pass action");
  assert(teacherUiCode.includes('ಪಾಸ್ (Pass)'), "Button text should display ಪಾಸ್ (Pass)");
  assert(teacherUiCode.includes('this.engine.passQuestion()'), "skipQBtn click handler must call passQuestion()");
});

// 18. Edge Cases for Pass and 2-Option Stop Rule
console.log("\n--- 18. Edge Cases for Pass and 2-Option Stop Rule ---");
runTest("Initial 2-option question stops immediately on 1st wrong guess", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3']);
  engine.startCategory('gk');

  // Simulate a 2-option question
  const correct = engine.state.question.correctAnswer;
  const wrong = engine.state.question.options.find(o => o !== correct);
  engine.state.question.options = [correct, wrong];
  engine.state.question.availableOptions = [correct, wrong];
  engine.state.question.eliminatedOptions = [];

  // T1 guesses wrong
  engine.evaluateAnswer(wrong);

  // Question stops immediately
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
  assert(engine.state.completedQuestionIds.includes(engine.state.question.id));
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 0); // did not pass to T2
});

runTest("Calling passQuestion when question is already completed or in passing phase is safely ignored", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['T1', 'T2', 'T3']);
  engine.startCategory('gk');

  // Complete question by answering correctly
  engine.evaluateAnswer(engine.state.question.correctAnswer);
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');

  // Calling passQuestion on a completed question should do nothing
  const auditLengthBefore = engine.state.scoring.history.length;
  engine.passQuestion();
  assert.strictEqual(engine.state.scoring.history.length, auditLengthBefore);
});

// ==========================================
// 19. Guess the Photo Round (No Options, Right/Wrong flow)
// ==========================================
console.log("\n--- 19. Guess the Photo Round (No Options, Right/Wrong flow) ---");

runTest("Photo question loaded in QuizEngine has empty options and availableOptions", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2']);
  engine.startCategory('photo');

  assert.strictEqual(engine.state.currentCategoryId, 'photo');
  assert.strictEqual(engine.state.question.type, 'photo');
  assert.deepStrictEqual(engine.state.question.options, []);
  assert.deepStrictEqual(engine.state.question.availableOptions, []);
  assert.deepStrictEqual(engine.state.question.eliminatedOptions, []);
  assert(engine.state.question.correctAnswer, "Must have correct answer key");
});

runTest("Projector public state for photo question contains no options before and after evaluation", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2']);
  engine.startCategory('photo');

  const publicBefore = createPublicQuizState(engine.state);
  assert.deepStrictEqual(publicBefore.question.options, []);
  assert.deepStrictEqual(publicBefore.question.availableOptions, []);
  assert.strictEqual(publicBefore.question.correctAnswer, null, "Correct answer must remain secret before evaluation");

  engine.evaluatePhotoAnswer(true);
  const publicAfter = createPublicQuizState(engine.state);
  assert.deepStrictEqual(publicAfter.question.options, []);
  assert.strictEqual(publicAfter.question.correctAnswer, engine.state.question.correctAnswer, "Answer revealed after evaluation");
});

runTest("Teacher Right button on Attempt 1 awards 10 points and completes question", () => {
  const engine = new QuizEngine();
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2', 'ತಂಡ 3']);
  engine.startCategory('photo');

  const team1 = engine.state.teams[0];
  assert.strictEqual(team1.score, 0);

  engine.evaluatePhotoAnswer(true);

  assert.strictEqual(team1.score, 10);
  assert.strictEqual(team1.correctCount, 1);
  assert.strictEqual(engine.state.attempt.result, 'CORRECT');
  assert.strictEqual(engine.state.attempt.pointsAwarded, 10);
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
  assert(engine.state.completedQuestionIds.includes(engine.state.question.id));
});

runTest("Teacher Wrong button moves same photo to next team without deducting points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0; // instantaneous pass for test
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2', 'ತಂಡ 3']);
  engine.startCategory('photo');

  const qId = engine.state.question.id;
  const team1 = engine.state.teams[0];
  const team2 = engine.state.teams[1];

  // Team 1 starts with 0
  assert.strictEqual(team1.score, 0);

  // Teacher clicks Wrong
  engine.evaluatePhotoAnswer(false);

  // NO points deducted from Team 1
  assert.strictEqual(team1.score, 0, "Team 1 points must not be deducted");
  assert.strictEqual(team1.wrongCount, 1, "Team 1 wrong count must increment");

  // Same photo moved to Team 2
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1);
  assert.strictEqual(engine.state.question.id, qId, "Must be the SAME photo");
  assert.strictEqual(engine.state.attempt.teamId, team2.id);
  assert.strictEqual(engine.state.attempt.attemptNumber, 2);
  assert.strictEqual(engine.state.display.phase, 'question');
});

runTest("Subsequent team answering photo question correctly on Attempt 2 awards 5 points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2', 'ತಂಡ 3']);
  engine.startCategory('photo');

  const team1 = engine.state.teams[0];
  const team2 = engine.state.teams[1];

  // Team 1 wrong -> passes
  engine.evaluatePhotoAnswer(false);

  // Team 2 answers Right
  engine.evaluatePhotoAnswer(true);

  assert.strictEqual(team1.score, 0);
  assert.strictEqual(team2.score, 5, "Attempt 2 must award 5 points");
  assert.strictEqual(team2.correctCount, 1);
  assert.strictEqual(engine.state.attempt.pointsAwarded, 5);
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
});

runTest("Attempt 3 in photo question awards 3 points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2', 'ತಂಡ 3']);
  engine.startCategory('photo');

  const team1 = engine.state.teams[0];
  const team2 = engine.state.teams[1];
  const team3 = engine.state.teams[2];

  // Team 1 wrong
  engine.evaluatePhotoAnswer(false);
  // Team 2 wrong
  engine.evaluatePhotoAnswer(false);

  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2);
  assert.strictEqual(engine.state.attempt.attemptNumber, 3);

  // Team 3 right
  engine.evaluatePhotoAnswer(true);

  assert.strictEqual(team1.score, 0);
  assert.strictEqual(team2.score, 0);
  assert.strictEqual(team3.score, 3, "Attempt 3 must award 3 points");
  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
});

runTest("All teams guessing wrong on photo exhausts question and reveals answer without deducting points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2']);
  engine.startCategory('photo');

  const team1 = engine.state.teams[0];
  const team2 = engine.state.teams[1];

  engine.evaluatePhotoAnswer(false); // Team 1 wrong
  engine.evaluatePhotoAnswer(false); // Team 2 wrong (all exhausted)

  assert.strictEqual(engine.state.display.phase, 'answer_revealed');
  assert.strictEqual(engine.state.display.revealAnswer, true);
  assert.strictEqual(team1.score, 0, "No deduction");
  assert.strictEqual(team2.score, 0, "No deduction");
  assert(engine.state.completedQuestionIds.includes(engine.state.question.id));
  assert(engine.state.display.passMessage.includes('ಯಾವ ತಂಡವೂ ಸರಿಯಾದ ಉತ್ತರ ನೀಡಿಲ್ಲ'));
});

runTest("Photo question timeout and pass also move same photo to next team without deducting points", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2', 'ತಂಡ 3']);
  engine.startCategory('photo');

  const qId = engine.state.question.id;
  const team1 = engine.state.teams[0];
  const team2 = engine.state.teams[1];
  const team3 = engine.state.teams[2];

  // Team 1 timeout
  engine.handleTimeout();
  assert.strictEqual(team1.score, 0);
  assert.strictEqual(team1.timeoutCount, 1);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 1);
  assert.strictEqual(engine.state.question.id, qId);

  // Team 2 passes
  engine.passQuestion();
  assert.strictEqual(team2.score, 0);
  assert.strictEqual(team2.passCount, 1);
  assert.strictEqual(engine.state.rotation.activeTeamIndex, 2);
  assert.strictEqual(engine.state.question.id, qId);

  // Team 3 right
  engine.evaluatePhotoAnswer(true);
  assert.strictEqual(team3.score, 3);
});

runTest("Teacher UI rendering for photo questions renders Right and Wrong buttons and no options grid", () => {
  const fs = require('fs');
  const teacherCode = fs.readFileSync('js/teacherUI.js', 'utf8');

  assert(teacherCode.includes('photoRightBtn'), "Must contain photoRightBtn");
  assert(teacherCode.includes('photoWrongBtn'), "Must contain photoWrongBtn");
  assert(teacherCode.includes('evaluatePhotoAnswer(true)'), "Must call evaluatePhotoAnswer(true)");
  assert(teacherCode.includes('evaluatePhotoAnswer(false)'), "Must call evaluatePhotoAnswer(false)");
});

runTest("Projector UI rendering for photo questions suppresses options row", () => {
  const fs = require('fs');
  const projectorCode = fs.readFileSync('js/projectorUI.js', 'utf8');

  assert(projectorCode.includes('!isPhotoQuestion && q.options'), "Must conditionally suppress options for photo");
  assert(projectorCode.includes('projector-photo-hero'), "Must support hero presentation for photo");
});

runTest("State recovery in QuizEngine constructor during passing phase advances to next team and attempt", () => {
  const initialEngine = new QuizEngine();
  initialEngine.setupTeams(['ತಂಡ A', 'ತಂಡ B', 'ತಂಡ C']);
  initialEngine.startCategory('photo');

  // Trigger wrong answer to put into passing phase with non-zero delay
  initialEngine.passDelayMs = 5000;
  initialEngine.evaluatePhotoAnswer(false);

  assert.strictEqual(initialEngine.state.display.phase, 'passing');
  assert.strictEqual(initialEngine.state.rotation.activeTeamIndex, 0); // Previous team before pass completes

  // Simulate serialization to localStorage and reload
  const serializedState = JSON.parse(JSON.stringify(initialEngine.state));
  serializedState.display.passUntil = Date.now() - 100; // pass delay already elapsed during reload

  const recoveredEngine = new QuizEngine(serializedState);
  assert.strictEqual(recoveredEngine.state.rotation.activeTeamIndex, 1, "Must advance to NEXT team (Team B)");
  assert.strictEqual(recoveredEngine.state.attempt.teamId, 'team_2');
  assert.strictEqual(recoveredEngine.state.attempt.attemptNumber, 2, "Must advance to attempt 2");
  assert.strictEqual(recoveredEngine.state.display.phase, 'question');
});

runTest("QuizEngine getQuestionsForCategory ignores disabled questions", () => {
  const customQuestions = [
    { id: 901, categoryId: 'gk', question: 'Q1', options: ['A','B','C','D'], answer: 'A', enabled: true },
    { id: 902, categoryId: 'gk', question: 'Q2', options: ['A','B','C','D'], answer: 'B', enabled: false },
    { id: 903, categoryId: 'gk', question: 'Q3', options: ['A','B','C','D'], answer: 'C' }
  ];
  const engine = new QuizEngine(null, customQuestions);
  const activeQs = engine.getQuestionsForCategory('gk');
  assert.strictEqual(activeQs.length, 2);
  assert.strictEqual(activeQs.find(q => q.id === 902), undefined, "Disabled question must be filtered out");
});

runTest("Audio dispatcher triggers playWrong on wrong attempt transition and question exhaustion", () => {
  const fs = require('fs');
  const teacherCode = fs.readFileSync('js/teacherUI.js', 'utf8');

  assert(teacherCode.includes("state.attempt.result === 'WRONG'"), "Must check for WRONG result in TEAM_PASSED");
  assert(teacherCode.includes("QUESTION_EXHAUSTED"), "Must handle QUESTION_EXHAUSTED sound");
});

runTest("Audit log for photo round records correct answer string upon right answer", () => {
  const engine = new QuizEngine();
  engine.passDelayMs = 0;
  engine.setupTeams(['ತಂಡ 1', 'ತಂಡ 2']);
  engine.startCategory('photo');

  const answer = engine.state.question.correctAnswer;
  engine.evaluatePhotoAnswer(true);

  const lastAudit = engine.state.scoring.history[engine.state.scoring.history.length - 1];
  assert.strictEqual(lastAudit.result, 'CORRECT');
  assert.strictEqual(lastAudit.correctAnswer, answer);
  assert.strictEqual(lastAudit.selectedOption, answer);
});

console.log("\n=======================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed.`);
console.log("=======================================================\n");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
