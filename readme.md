# ANTIGRAVITY IMPLEMENTATION PROMPT
## Kannada Quiz Arena — Synchronized Teacher Console + Projector Display

### 1. Project objective

Extend my existing **Kannada Quiz Arena** web application by adding a dedicated **Projector / Student Display** that synchronizes in real time with the teacher's quiz control screen.

The application already has a Kannada-themed quiz interface, quiz categories, questions, teams, circular team assignment, timers, answer elimination, scoring, and leaderboards.

**IMPORTANT: Extend the existing application. Do not rebuild it from scratch.**

Before making changes:
1. Inspect the existing project structure and identify the current HTML, CSS, JavaScript, question bank, scoring functions, timer implementation, team-management logic, and leaderboard logic.
2. Understand the existing quiz flow and reuse its working functionality.
3. Preserve all existing Kannada questions, answers, categories, scoring rules, visual assets, and features.
4. Avoid creating a second, independent quiz engine.
5. Refactor existing logic only when necessary to support synchronized displays.

The application must have two distinct interfaces:

- **Teacher Console:** The only screen allowed to control the quiz.
- **Projector Display:** A read-only audience-facing screen that reflects the teacher's actions immediately.

The teacher must retain complete control throughout the competition.

---

### 2. Core architecture and permissions

Implement a clear separation between the authoritative quiz state and the audience-facing display.

#### Teacher Console — authoritative controller

The teacher console is the sole control surface for:

- Registering, editing, and removing teams before the quiz starts.
- Selecting quiz categories and questions.
- Assigning teams in circular order.
- Starting, pausing, and resuming timers.
- Selecting answers on behalf of the active team.
- Evaluating correct and incorrect answers.
- Eliminating incorrect options when applicable.
- Handling timeouts.
- Moving to the next team.
- Revealing the correct answer after evaluation.
- Updating scores.
- Moving between questions and sections.
- Opening section leaderboards.
- Displaying the final leaderboard and podium.
- Starting a new round or resetting the quiz.

The projector must never be able to perform these actions.

#### Projector Display — read-only audience interface

The projector should display only information appropriate for students and the audience:

- Quiz title and current section.
- Current Kannada question.
- Currently available answer options.
- Large countdown timer.
- Active team name.
- Clear indication when the question passes to the next team.
- Correct-answer reveal after teacher evaluation.
- Section leaderboard.
- Final leaderboard and winners' podium.
- Connection status when the display is disconnected or reconnecting.

Do not show:
- Teacher controls.
- Answer-selection buttons.
- Team registration forms.
- Edit or delete controls.
- Internal answer keys before evaluation.
- Administrative settings.
- Hidden scoring or question-management controls.

**Security and presentation requirement:** Do not send the correct answer in the projector's public question payload before the teacher evaluates the attempt. Hiding it with CSS is not sufficient. Create a separate audience-safe state projection that omits the answer key until the reveal event.

---

### 3. Two-screen usage flow

The intended workflow is:

1. The teacher opens the main application.
2. The teacher registers all participating teams.
3. The teacher opens the Projector Display using a dedicated button.
4. The application displays a connection code or session identifier.
5. The projector opens the dedicated display URL in another tab, browser, laptop, or connected computer.
6. The teacher starts the quiz.
7. Every teacher action updates the projector automatically.
8. Students see the question, options, active team, and countdown.
9. The teacher evaluates the team's answer.
10. The projector displays the appropriate result and next-team transition.
11. The teacher continues the quiz.
12. Section leaderboards and the final podium are synchronized automatically.

Provide a clear button in the teacher console:

**OPEN PROJECTOR DISPLAY**

The button should open the dedicated projector route, preferably:

`/projector?session=SESSION_ID`

Also provide:
- Copy projector link.
- Copy session code.
- Reconnect display.
- Display connection status.
- Full-screen display instructions.

The teacher must be able to continue using the quiz even when the projector is disconnected.

---

### 4. Shared state and communication architecture

Design the synchronization layer as a reusable module rather than scattering communication code across UI components.

Suggested modules:

```text
/js
  /core
    quizEngine.js
    quizState.js
    scoring.js
    teamRotation.js
    timerManager.js

  /sync
    syncManager.js
    transport.js
    websocketTransport.js
    localTransport.js
    eventHandler.js
    publicState.js
    reconnectManager.js

  /teacher
    teacherController.js
    teacherUI.js

  /projector
    projectorController.js
    projectorUI.js
```

Adapt these filenames to the existing project rather than duplicating existing modules.

#### Recommended communication strategy

Implement a transport abstraction with two operating modes.

**Mode A — Local same-browser synchronization**

Use:
- `BroadcastChannel` for real-time communication between tabs.
- `localStorage` events as a fallback.
- A shared session identifier to isolate different quiz sessions.

This mode should work when the teacher and projector are separate tabs or windows in the same browser profile.

**Mode B — Separate-device synchronization**

For a projector connected to another laptop, browser, or device, use a small WebSocket relay server.

If the existing application already has a Node.js server, integrate the WebSocket endpoint into it. Otherwise, add a lightweight Node.js server using the existing project's conventions.

Use a library such as `ws` if appropriate.

The server should:
- Accept teacher and projector connections.
- Associate connections with a quiz session.
- Authenticate the teacher as the session controller.
- Permit projector connections only as read-only clients.
- Relay validated state updates.
- Provide the latest authoritative snapshot to reconnecting displays.
- Reject projector-originated control commands.
- Avoid running a separate scoring or timer engine.

The server acts as a communication relay. The teacher remains the authority for quiz actions.

Do not assume that `BroadcastChannel` or `localStorage` can synchronize independent devices. The WebSocket transport is required for separate-device operation.

#### Transport abstraction

Implement a consistent interface:

```javascript
connect(sessionId, role)
send(message)
subscribe(callback)
disconnect()
getConnectionStatus()
```

The quiz UI should not need to know whether communication is using local browser synchronization or WebSockets.

Allow the teacher to select or automatically use the available transport.

---

### 5. Authoritative state model

Maintain one clearly defined quiz state.

Suggested state structure:

```javascript
const quizState = {
  sessionId: null,
  revision: 0,
  sequenceNumber: 0,

  status: "setup",
  // setup, ready, running, paused, section_complete, finished

  currentSection: null,
  currentQuestionId: null,

  teams: [],

  rotation: {
    startingTeamIndex: 0,
    activeTeamIndex: 0,
    attemptedTeamIds: []
  },

  question: {
    id: null,
    text: "",
    options: [],
    correctAnswer: null,
    eliminatedOptions: []
  },

  timer: {
    durationMs: 30000,
    deadlineAt: null,
    remainingMs: 30000,
    paused: false
  },

  attempt: {
    attemptId: null,
    teamId: null,
    selectedOptionId: null,
    result: null
  },

  scoring: {
    history: []
  },

  display: {
    phase: "waiting",
    // waiting, question, answering, passing,
    // result, leaderboard, podium
    revealAnswer: false
  }
};
```

Adjust the structure to fit the existing codebase.

Requirements:
- Every meaningful state change must increment the revision or sequence number.
- Keep team IDs and question IDs stable.
- Keep score history instead of only storing the latest score.
- Store the active team and circular rotation position explicitly.
- Maintain the current question's eliminated options.
- Keep timer state independent from display rendering.
- Persist enough information to recover from a page refresh or temporary connection loss.

Do not allow the projector to mutate the authoritative state.

---

### 6. Event-driven synchronization

Use explicit event types rather than sending loosely structured UI updates.

Suggested events:

```text
SESSION_CREATED
TEAMS_UPDATED
QUIZ_STARTED
SECTION_CHANGED
QUESTION_STARTED
TIMER_STARTED
TIMER_PAUSED
TIMER_RESUMED
ANSWER_EVALUATED
OPTION_ELIMINATED
TEAM_PASSED
TIMEOUT_OCCURRED
SCORE_UPDATED
ANSWER_REVEALED
SECTION_LEADERBOARD
NEXT_QUESTION
QUIZ_FINISHED
FINAL_PODIUM
STATE_SNAPSHOT
```

Every event should include:

```javascript
{
  type: "ANSWER_EVALUATED",
  sessionId: "...",
  eventId: "...",
  commandId: "...",
  sequenceNumber: 12,
  revision: 12,
  timestamp: 0,
  payload: {}
}
```

Use unique event IDs and command IDs.

The teacher controller should:
1. Validate the requested action.
2. Apply the action to the authoritative quiz engine.
3. Persist the resulting state.
4. Generate the appropriate event.
5. Publish an audience-safe state update.
6. Update its own UI.

The projector should:
1. Receive the state update.
2. Verify the session ID.
3. Ignore stale revisions and duplicate events.
4. Update its read-only interface.
5. Render the new state without initiating quiz actions.

**Important:** The projector must not calculate scores independently. It only displays scores received from the teacher's authoritative state.

---

### 7. Duplicate action and duplicate scoring prevention

This is critical.

Prevent:
- Double-clicking an answer and awarding points twice.
- A repeated WebSocket message applying the same score again.
- A reconnect replaying an already processed answer.
- A timeout and answer evaluation both completing the same attempt.
- A repeated leaderboard event changing the score.
- Two simultaneous evaluation actions for one team attempt.

Implement idempotency using a unique `attemptId` for every team attempt.

Before evaluating an attempt:
- Verify that the attempt is still active.
- Verify that the attempt has not already been evaluated.
- Verify that the selected option belongs to the current question.
- Verify that the acting client has teacher authority.

Once evaluated, mark the attempt as completed.

Maintain a set or persistent record of processed command IDs and attempt IDs.

A completed attempt must never be scored again, even if its event is received multiple times.

Disable answer-evaluation controls immediately while an evaluation is being processed.

---

### 8. Preserve the established scoring and elimination rules

Do not change the existing competition scoring mechanism.

The rules are:

| Remaining options | Points for a correct answer |
|---|---:|
| 4 options | 10 points |
| 3 options | 5 points |
| 2 options | 3 points |

#### Incorrect answer

- The teacher selects the team's answer.
- The quiz engine evaluates it.
- If more than two options remain, eliminate the selected incorrect option.
- Pass the question to the next team in circular order.
- Keep the remaining options visible on the projector.
- Update the active team indicator.
- Restart the 30-second timer for the next eligible attempt.

#### Minimum two-option rule

Never eliminate an option when only two options remain.

The quiz must always preserve at least two available options until the question is answered or the competition's existing question-ending rules apply.

#### Timeout

When a team fails to answer within 30 seconds:

- Do not award points.
- Do not eliminate an option.
- Mark that team's attempt as timed out.
- Pass the question to the next team.
- Preserve all currently available options.
- Start a fresh 30-second timer for the next eligible team.

A timeout must not be treated as an incorrect answer.

#### Correct answer

When the teacher evaluates a correct answer:

- Award points based on the number of options remaining at the moment of evaluation.
- Four options: 10 points.
- Three options: 5 points.
- Two options: 3 points.
- Record the score transaction against the attempt ID.
- Reveal the correct answer on the projector only after evaluation.
- Show the team name and points earned.
- Update the leaderboard.

Ensure the existing circular team assignment and question flow are preserved.

---

### 9. Circular team assignment and pass transitions

Preserve the existing circular assignment logic.

For example, with eight teams:

```text
Team 1 → Team 2 → Team 3 → Team 4
        → Team 5 → Team 6 → Team 7 → Team 8
        → Team 1
```

Requirements:
- The active team must be unambiguous on both screens.
- Every pass must update the active team on the teacher screen and projector.
- Do not accidentally skip a team.
- Do not assign a team twice in the same question unless the existing competition rules explicitly allow it.
- Preserve the existing starting-team rotation between questions.
- Handle the final team correctly when the rotation wraps back to the first team.

#### Projector transition animation

When a wrong answer or timeout causes a pass, show:

```text
ತಪ್ಪು ಉತ್ತರ / ಸಮಯ ಮುಗಿದಿದೆ

ಮುಂದಿನ ತಂಡ

TEAM 04
ನಿಮ್ಮ ಸರದಿ!
```

Use an animated transition lasting approximately 1–2 seconds.

The animation should not block the actual quiz timer or delay the authoritative state update.

The next team's name must appear clearly and prominently.

---

### 10. Reliable 30-second timer synchronization

Do not rely on a simple decrementing interval running independently on both screens.

The teacher controls the timer.

Use an absolute deadline timestamp:

```javascript
timer = {
  durationMs: 30000,
  deadlineAt: Date.now() + 30000,
  remainingMs: 30000,
  paused: false
};
```

The projector calculates the displayed remaining time using the latest synchronized deadline:

```javascript
remainingMs = Math.max(0, deadlineAt - Date.now());
```

For separate devices:
- Estimate clock offset between the teacher/server and projector.
- Include authoritative timestamps in state updates.
- Recalculate the countdown using the synchronized clock.
- Send timer state changes rather than sending every second as a separate authoritative event.

Requirements:
- The projector countdown must remain visually smooth.
- The teacher timer is authoritative.
- The timer must never restart merely because the projector reconnects.
- A reconnecting projector must receive the actual remaining time.
- Pausing must freeze the remaining time.
- Resuming must calculate a new deadline from the saved remaining time.
- A timeout must be processed only once.

Use a small visual warning when five seconds remain.

Suggested countdown styling:

- 30–11 seconds: normal.
- 10–6 seconds: warning.
- 5–1 seconds: urgent animation.
- 0 seconds: timeout state.

The teacher must have visible Pause and Resume controls.

If the teacher pauses, the projector must immediately show the paused state.

---

### 11. Projector display design

Create a dedicated, responsive, full-screen interface.

The display should be optimized for:
- Projectors.
- Large televisions.
- 16:9 screens.
- Classroom viewing from a distance.

Use the existing Kannada visual identity.

Design direction:
- Dark navy or near-black background.
- Karnataka red and yellow accents.
- Gold highlights for points and correct answers.
- Kannada typography using Noto Sans Kannada.
- Large, readable text.
- High contrast.
- Minimal distractions.
- Smooth animations.

Avoid excessive gradients, tiny labels, crowded layouts, and unnecessary controls.

#### Layout A — Waiting screen

<Description>

Show:
- ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ title.
- Quiz subtitle.
- Session code.
- Connected / waiting status.
- A simple animated Karnataka-themed background.
- Message: `ಶೀಘ್ರದಲ್ಲೇ ಸ್ಪರ್ಧೆ ಆರಂಭವಾಗಲಿದೆ...`

Do not expose teacher controls.

#### Layout B — Active question

Suggested layout:

```text
┌────────────────────────────────────────────────────┐
│ ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ        ವಿಭಾಗ: ಸಾಮಾನ್ಯ ಜ್ಞಾನ     │
├────────────────────────────────────────────────────┤
│                                                    │
│                   TEAM 03                          │
│                  ನಿಮ್ಮ ಸರದಿ!                       │
│                                                    │
│                    00:24                           │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│        ಕನ್ನಡ ಪ್ರಶ್ನೆ ಇಲ್ಲಿ ಕಾಣಿಸಬೇಕು               │
│                                                    │
├────────────────────────┬───────────────────────────┤
│                        │                           │
│  A. ಆಯ್ಕೆ ಒಂದು          │  B. ಆಯ್ಕೆ ಎರಡು            │
│                        │                           │
├────────────────────────┼───────────────────────────┤
│                        │                           │
│  C. ಆಯ್ಕೆ ಮೂರು          │  D. ಆಯ್ಕೆ ನಾಲ್ಕು          │
│                        │                           │
└────────────────────────┴───────────────────────────┘
```

Requirements:
- Question should occupy the main visual area.
- Countdown should be large and prominent.
- Active team should be unmistakable.
- Answer options should be large cards.
- Eliminated options should visibly fade or become crossed out.
- Do not display the correct answer before teacher evaluation.

For long Kannada questions, support responsive font scaling and text wrapping.

#### Layout C — Pass to next team

Show a clear transition:

```text
ತಪ್ಪು ಉತ್ತರ!

ಮುಂದಿನ ತಂಡಕ್ಕೆ ಅವಕಾಶ

TEAM 04

ನಿಮ್ಮ ಸರದಿ!
```

For timeouts, use:

```text
ಸಮಯ ಮುಗಿದಿದೆ!

ಯಾವ ಆಯ್ಕೆಯೂ ತೆಗೆದುಹಾಕಲಾಗಿಲ್ಲ.

ಮುಂದಿನ ತಂಡ: TEAM 04
```

Do not remove an answer option when a timeout occurs.

#### Layout D — Correct answer reveal

Only activate this layout after the teacher evaluates the answer.

Show:
- `ಸರಿಯಾದ ಉತ್ತರ!`
- Team name.
- Correct answer.
- Points earned.
- Remaining options.
- Updated score.

Use a short celebratory animation, but avoid distracting effects that obscure Kannada text.

#### Layout E — Section leaderboard

Show the current section ranking with:

- Rank.
- Team name.
- Section score.
- Total score, if appropriate under the existing scoring structure.

Use clear ranking indicators and a podium-style top three.

Only show the leaderboard when the teacher opens it.

#### Layout F — Final podium

Display the final three teams:

```text
             ವಿಜೇತರು

          🥈 TEAM 02
     🥇 TEAM 05
          🥉 TEAM 01

         ಅಂತಿಮ ಅಂಕಗಳು
```

Show:
- First place.
- Second place.
- Third place.
- Final team scores.
- Complete leaderboard accessible after the podium.

The teacher must control when the final podium appears.

---

### 12. Teacher console design

Preserve the existing teacher UI and add a clear connection/status panel.

Suggested header:

```text
KANNADA QUIZ ARENA

[PROJECTOR: CONNECTED]
[OPEN PROJECTOR]
[COPY DISPLAY LINK]
```

Add a compact synchronization indicator:

- Connected — green.
- Connecting — yellow.
- Disconnected — red.
- Reconnecting — yellow.

The teacher console should also show:
- Current section.
- Current question.
- Active team.
- Remaining options.
- Timer.
- Current question's attempt history.
- Current team scores.

All controls remain on the teacher screen.

Suggested controls:

```text
[START TIMER] [PAUSE] [RESUME]

[OPTION A] [OPTION B]
[OPTION C] [OPTION D]

[EVALUATE ANSWER]

[NEXT TEAM]
[REVEAL ANSWER]
[SHOW LEADERBOARD]
[NEXT QUESTION]
```

Adapt these controls to the existing workflow. Do not introduce duplicate actions that conflict with existing functionality.

Make the teacher console usable on a laptop and tablet.

---

### 13. Connection loss and reconnection

The projector must be resilient to:
- Wi-Fi interruptions.
- Temporary server disconnections.
- Browser refreshes.
- Projector laptop sleep.
- WebSocket reconnections.
- Duplicate or delayed messages.
- A projector joining after the quiz has started.

Implement automatic reconnection with exponential backoff and a reasonable maximum delay.

When the projector reconnects:

1. Re-establish the session connection.
2. Identify itself as a read-only projector.
3. Request the latest state snapshot.
4. Verify the session ID.
5. Verify the revision or sequence number.
6. Replace its stale display state with the latest public snapshot.
7. Resume timer rendering from the authoritative deadline.
8. Do not replay old scoring or answer animations as new events.

The teacher must not lose the current question, active team, score, or timer because the projector disconnected.

If a projector disconnects during an active question:
- Continue the quiz normally on the teacher screen.
- Continue processing the timer and answers.
- Show the disconnected status on the teacher screen.
- Synchronize the projector to the latest state when it reconnects.

Never make the teacher wait for the projector to reconnect before continuing the quiz.

---

### 14. Graceful local/demo fallback

The application must remain fully usable if no second display connection is available.

Implement three display modes:

**Mode 1: Connected projector**
- Real-time synchronization with the separate projector device.

**Mode 2: Local second tab**
- Synchronization using BroadcastChannel.
- Use localStorage events as a fallback where appropriate.

**Mode 3: Demo / preview**
- Open the projector layout locally in another tab or an embedded preview.
- Display a clear `LOCAL PREVIEW` indicator.
- Allow the teacher to test the question layout and animations.
- Do not pretend a separate device is connected.

If the WebSocket server is unavailable:
- Offer local preview mode.
- Keep teacher controls working.
- Show a clear explanation of the connection limitation.
- Do not silently report a successful remote connection.

---

### 15. Persistence and recovery

Preserve the existing LocalStorage persistence mechanism, if available.

Persist:
- Session ID.
- Team registration.
- Current section.
- Current question.
- Active team.
- Rotation state.
- Eliminated options.
- Score history.
- Current scores.
- Timer pause state and remaining time.
- Quiz status.
- Processed attempt IDs.

For a separate-device setup, use the server's latest authoritative snapshot or another reliable shared persistence mechanism.

On teacher refresh:
- Restore the active session.
- Restore the current question and team.
- Restore scores and eliminated options.
- Restore the timer accurately.
- Avoid replaying already processed actions.

Do not allow an old session to overwrite a newer session.

Provide a teacher-controlled option to start a fresh quiz session.

---

### 16. Preserve all existing Kannada quiz categories and questions

Do not remove, rename, replace, translate unnecessarily, or modify the existing question bank.

Preserve the established categories:

1. ಸಾಮಾನ್ಯ ಜ್ಞಾನ
2. ಕ್ರೀಡೆ
3. ಕಂಪ್ಯೂಟರ್
4. ವಿಜ್ಞಾನ
5. ಚಿತ್ರ ನೋಡಿ ಉತ್ತರಿಸಿ
6. ಒಗಟುಗಳು

Preserve all existing questions and their answers in these categories.

For the photo round:
- Show the question image prominently.
- Keep any answer or identity hidden until teacher evaluation.
- Preserve the existing image-question flow.

For the riddles round:
- Display the Kannada riddle clearly.
- Keep the answer hidden until evaluation.
- Ensure long Kannada text fits the projector layout.

If the existing application supports adding or editing questions, keep that functionality on the teacher screen only.

Do not hardcode a new question bank into the projector.

---

### 17. Data flow example

Implement and verify this exact sequence:

**Initial state**

Teacher starts Question 1 with four options.

Projector receives:
- Section name.
- Question text.
- Four public options.
- Active team.
- 30-second deadline.

**First team selects an incorrect option**

Teacher evaluates the answer.

Quiz engine:
- Marks the attempt incorrect.
- Eliminates the selected option.
- Keeps three options.
- Does not award points.
- Moves to the next team.

Projector:
- Displays the wrong-answer transition.
- Shows the next team.
- Displays the three remaining options.
- Starts the new countdown.

**Second team times out**

Quiz engine:
- Marks the attempt timed out.
- Does not eliminate an option.
- Does not award points.
- Moves to the next team.

Projector:
- Shows the timeout transition.
- Keeps all three options.
- Displays the next team.
- Starts a fresh countdown.

**Third team answers correctly with three options remaining**

Teacher evaluates the answer.

Quiz engine:
- Marks the attempt correct.
- Awards 5 points.
- Records the score transaction once.
- Ends the question.

Projector:
- Reveals the correct answer.
- Displays the team name.
- Displays `+5`.
- Displays the updated score.

**Teacher opens the section leaderboard**

Projector switches to the section leaderboard.

**Teacher starts the next section**

Projector returns to the appropriate section transition screen.

---

### 18. Implementation phases

Implement in the following order. Do not attempt everything in one uncontrolled change.

**Phase 1 — Inspect and map the existing application**
- Identify existing quiz state.
- Identify team rotation and scoring logic.
- Identify timer logic.
- Identify question-bank structure.
- Identify leaderboard and persistence logic.
- Produce a concise implementation plan before editing files.

**Phase 2 — Refactor the authoritative state**
- Establish one authoritative quiz state.
- Separate quiz-engine logic from UI rendering.
- Add stable IDs for teams, questions, and attempts.
- Preserve existing scoring and question flow.

**Phase 3 — Implement synchronization**
- Create the transport abstraction.
- Implement local BroadcastChannel synchronization.
- Add WebSocket support for separate devices.
- Implement session identification and role permissions.
- Add revision numbers, event IDs, and idempotency.

**Phase 4 — Build the projector interface**
- Create a dedicated projector route or page.
- Implement the waiting, question, pass, answer reveal, leaderboard, and podium states.
- Ensure the projector is read-only.
- Add full-screen support and responsive 16:9 styling.

**Phase 5 — Implement timer and reconnection reliability**
- Synchronize using authoritative deadlines.
- Implement pause/resume.
- Handle timeouts exactly once.
- Implement snapshot recovery.
- Test temporary network disconnections.

**Phase 6 — Integrate all existing categories**
- Test GK.
- Test sports.
- Test computer.
- Test science.
- Test photo questions.
- Test riddles.
- Confirm no existing questions or answers were lost.

**Phase 7 — Polish and test**
- Improve animations.
- Verify Kannada typography.
- Test laptop, tablet, and projector layouts.
- Verify the entire quiz from registration to final podium.

After each phase, verify that previously working quiz functionality still works.

---

### 19. Edge cases that must be handled

Test and correctly handle all of these:

1. Only two options remain and a team answers incorrectly.
2. A team times out while four options remain.
3. A team times out while two options remain.
4. The final team in the circular rotation passes the question.
5. The next team is the first team in the rotation.
6. Teacher double-clicks Evaluate.
7. A WebSocket event is received twice.
8. Projector refreshes during a running countdown.
9. Projector disconnects during answer evaluation.
10. Teacher refreshes during an active question.
11. Teacher pauses and resumes the timer.
12. A timeout and an answer evaluation happen almost simultaneously.
13. A projector tries to send an answer-selection command.
14. A projector joins halfway through a question.
15. The teacher opens two projector windows.
16. A previous session attempts to reconnect to a newer quiz.
17. A question contains long Kannada text.
18. A photo question is displayed.
19. A section leaderboard is opened while the projector is reconnecting.
20. The final podium is opened more than once.

No edge case should cause duplicate scoring, incorrect rotation, an incorrect reveal, or a loss of quiz state.

---

### 20. Acceptance tests and verification checklist

Do not mark the implementation complete until all relevant tests pass.

#### Teacher control and permissions
- [ ] Teacher can register teams.
- [ ] Teacher remains the only controller.
- [ ] Projector has no actionable quiz controls.
- [ ] Projector cannot modify scores or team rotation.
- [ ] Projector cannot reveal the answer independently.

#### Synchronization
- [ ] Teacher actions appear on the projector in real time.
- [ ] Question changes synchronize correctly.
- [ ] Active team changes synchronize correctly.
- [ ] Eliminated options synchronize correctly.
- [ ] Leaderboards synchronize correctly.
- [ ] Final podium synchronizes correctly.
- [ ] Separate-device WebSocket mode works.
- [ ] Same-browser local mode works.

#### Scoring
- [ ] Correct answer with four options awards 10 points.
- [ ] Correct answer with three options awards 5 points.
- [ ] Correct answer with two options awards 3 points.
- [ ] Incorrect answer removes an option only when more than two remain.
- [ ] No question ever has fewer than two available options due to elimination.
- [ ] Timeout does not remove an option.
- [ ] Timeout awards zero points.
- [ ] Duplicate evaluation does not award duplicate points.

#### Timer
- [ ] Every new attempt receives 30 seconds.
- [ ] Projector countdown follows the teacher's timer.
- [ ] Pause freezes the countdown.
- [ ] Resume continues from the correct remaining time.
- [ ] Reconnection does not restart the timer.
- [ ] Timeout is processed only once.

#### Reconnection and recovery
- [ ] Projector reconnects automatically.
- [ ] Projector receives the latest snapshot.
- [ ] Teacher can continue while projector is disconnected.
- [ ] Teacher refresh restores the quiz state.
- [ ] Projector refresh restores the current display state.
- [ ] Old events cannot overwrite newer state.

#### Kannada quiz content
- [ ] All six existing categories remain available.
- [ ] All existing questions and answers are preserved.
- [ ] Photo questions display correctly.
- [ ] Riddles display correctly.
- [ ] Kannada characters render properly.
- [ ] Long questions do not overflow the display.

#### Final presentation
- [ ] Projector is readable from a distance.
- [ ] Full-screen mode works.
- [ ] Correct answer appears only after teacher evaluation.
- [ ] Section leaderboard displays correctly.
- [ ] Final podium displays correctly.
- [ ] Local preview works without a second device.

---

### 21. Final implementation report

After implementation, provide a concise report containing:

1. Files created.
2. Files modified.
3. Architecture used.
4. How the teacher and projector connect.
5. How separate-device synchronization works.
6. How local preview works.
7. How duplicate scoring is prevented.
8. How timer synchronization and reconnection work.
9. Tests performed and their actual results.
10. Any incomplete functionality or known limitations.
11. Exact commands to start the application and WebSocket server.
12. Exact steps to open the teacher console and projector display on two devices.

Do not claim a feature is working unless it has actually been tested.

**Final priority:** Reliability and correct quiz behavior come before animations or visual effects. The teacher screen must remain the single source of truth, the projector must remain read-only, and the existing Kannada quiz experience must be preserved completely.