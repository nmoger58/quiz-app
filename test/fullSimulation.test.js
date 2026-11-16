/**
 * Full Competition Simulation & Server Integration Test
 * Simulates an 8-team competition across multiple categories,
 * tests server HTTP asset serving, and tests WebSocket communication.
 */

const http = require('http');
const assert = require('assert');
const { DEFAULT_QUESTIONS, QUIZ_CATEGORIES } = require('../js/questions');
const { QuizEngine } = require('../js/quizEngine');
const { ScoringSystem } = require('../js/scoringSystem');
const { WebSocket } = require('ws');

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
  clear() { this.data = {}; }
};

console.log("\n=======================================================");
console.log("🚩 SIMULATING FULL 8-TEAM COMPETITION ACROSS CATEGORIES");
console.log("=======================================================\n");

const engine = new QuizEngine();
engine.passDelayMs = 0; // instantaneous pass for simulation

// 1. Setup 8 teams
const teamNames = [
  'ಕದಂಬ (Kadamba)',
  'ಚಾಲುಕ್ಯ (Chalukya)',
  'ರಾಷ್ಟ್ರಕೂಟ (Rashtrakuta)',
  'ಹೊಯ್ಸಳ (Hoysala)',
  'ವಿಜಯನಗರ (Vijayanagara)',
  'ಒಡೆಯರ್ (Wodeyar)',
  'ಗಂಗ (Ganga)',
  'ಬಹಮನಿ (Bahamani)'
];
engine.setupTeams(teamNames);
assert.strictEqual(engine.state.teams.length, 8);
console.log("✓ Registered 8 Teams successfully");

// 2. Play through Category 1: GK (8 questions)
engine.startCategory('gk');
assert.strictEqual(engine.state.currentCategoryId, 'gk');

for (let qIdx = 0; qIdx < 8; qIdx++) {
  const currentTeam = engine.state.teams[engine.state.rotation.activeTeamIndex];
  const q = engine.state.question;

  if (qIdx % 3 === 0) {
    // Correct on attempt 1 (+10)
    engine.evaluateAnswer(q.correctAnswer);
  } else if (qIdx % 3 === 1) {
    // 1 wrong attempt, then 2nd team answers correctly (+5)
    const wrong = q.options.find(o => o !== q.correctAnswer);
    engine.evaluateAnswer(wrong); // T_start wrong
    engine.evaluateAnswer(q.correctAnswer); // T_next correct (+5)
  } else {
    // Timeout on 1st team, then 2nd team answers correctly (+10 because no option was eliminated)
    engine.handleTimeout();
    engine.evaluateAnswer(q.correctAnswer);
  }

  // Next question or section complete
  if (qIdx < 7) {
    engine.nextQuestion();
  }
}

// Section complete check
engine.showSectionLeaderboard();
assert.strictEqual(engine.state.status, 'section_complete');
const rankedGk = ScoringSystem.getRankedTeams(engine.state.teams);
console.log(`✓ Completed GK section. Top Team: ${rankedGk[0].name} (${rankedGk[0].score} pts)`);

// 3. Play through Category 2: Sports (8 questions)
engine.proceedToNextSection();
assert.strictEqual(engine.state.currentCategoryId, 'sports');

for (let qIdx = 0; qIdx < 8; qIdx++) {
  const q = engine.state.question;
  engine.evaluateAnswer(q.correctAnswer); // all answered correctly (+10 each)
  if (qIdx < 7) engine.nextQuestion();
}

// Cumulative score check
const rankedSports = ScoringSystem.getRankedTeams(engine.state.teams);
const totalPointsInGame = engine.state.teams.reduce((sum, t) => sum + t.score, 0);
assert(totalPointsInGame >= 120, `Cumulative scores must accumulate across sections! Total points: ${totalPointsInGame}`);
console.log(`✓ Completed Sports section. Cumulative total points in game: ${totalPointsInGame}`);

// 4. Test Grand Finale & CSV Export
engine.showGrandFinale();
assert.strictEqual(engine.state.status, 'finished');
assert.strictEqual(engine.state.display.phase, 'finale_podium');

const csvOutput = ScoringSystem.exportAuditCsv(engine.state.scoring.history, engine.state.teams);
assert(csvOutput.includes('ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ'));
assert(csvOutput.includes('Kadamba'));
assert(csvOutput.includes('Final Rankings'));
console.log("✓ Grand Finale screen and CSV Export generated successfully");

// 5. Test Node.js HTTP Server & WebSocket
console.log("\n--- Testing HTTP Static Server & WebSocket ---");
const server = require('../server');

setTimeout(() => {
  // Test GET /
  http.get('http://localhost:3000/', (res) => {
    assert.strictEqual(res.statusCode, 200);
    assert(res.headers['content-type'].includes('text/html'));
    console.log("✓ HTTP GET / served 200 OK (Teacher Console)");

    // Test GET /projector
    http.get('http://localhost:3000/projector', (res2) => {
      assert.strictEqual(res2.statusCode, 200);
      assert(res2.headers['content-type'].includes('text/html'));
      console.log("✓ HTTP GET /projector served 200 OK (Projector Display)");

      // Test WebSocket connection
      const wsTeacher = new WebSocket('ws://localhost:3000/ws?sessionId=TEST_SIM&role=teacher');
      wsTeacher.on('open', () => {
        console.log("✓ Teacher WebSocket connected");

        const wsProjector = new WebSocket('ws://localhost:3000/ws?sessionId=TEST_SIM&role=projector');
        wsProjector.on('open', () => {
          console.log("✓ Projector WebSocket connected");

          wsProjector.on('message', (raw) => {
            const data = JSON.parse(raw.toString());
            if (data.type === 'TEST_EVENT') {
              console.log("✓ Projector received real-time broadcast message from Teacher!");
              wsTeacher.close();
              wsProjector.close();
              console.log("\n=======================================================");
              console.log("ALL SIMULATION AND INTEGRATION TESTS PASSED!");
              console.log("=======================================================\n");
              process.exit(0);
            }
          });

          // Teacher sends message
          wsTeacher.send(JSON.stringify({
            type: 'TEST_EVENT',
            sessionId: 'TEST_SIM',
            state: { status: 'testing' }
          }));
        });
      });
    });
  });
}, 500);
