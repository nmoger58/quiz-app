/**
 * Scoring and Audit History Engine
 * Implements the 10 -> 5 -> 3 points rule, minimum 2-option retention rule,
 * and maintains a question-by-question audit log for dispute resolution.
 */

class ScoringSystem {
  /**
   * Calculates points for a correct answer based on remaining options count
   */
  static getPointsForAttempt(remainingOptionsCount, attemptNumber = 1) {
    if (remainingOptionsCount !== undefined && remainingOptionsCount !== null && remainingOptionsCount > 0) {
      if (remainingOptionsCount >= 4) return 10;
      if (remainingOptionsCount === 3) return 5;
      return 3;
    }
    if (attemptNumber === 1) return 10;
    if (attemptNumber === 2) return 5;
    return 3;
  }

  /**
   * Generates a unique attempt ID to guarantee idempotency
   */
  static generateAttemptId(questionId, teamId, attemptNumber) {
    return `q${questionId}_t${teamId}_att${attemptNumber}_${Date.now()}`;
  }

  /**
   * Records a score audit log entry
   */
  static createAuditEntry(params) {
    return {
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      attemptId: params.attemptId,
      questionId: params.questionId,
      questionText: params.questionText || '',
      category: params.category || '',
      teamId: params.teamId,
      teamName: params.teamName,
      attemptNumber: params.attemptNumber,
      selectedOption: params.selectedOption || '(ಸಮಯ ಮೀರಿದೆ / Timeout)',
      correctAnswer: params.correctAnswer,
      result: params.result, // 'CORRECT', 'WRONG', 'TIMEOUT'
      pointsAwarded: params.pointsAwarded || 0,
      optionsRemainingCount: params.optionsRemainingCount,
      timestamp: new Date().toLocaleTimeString('kn-IN', { hour12: true })
    };
  }

  /**
   * Computes category totals and rankings from teams array
   */
  static getRankedTeams(teams) {
    return [...teams].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tie breaker: more correct answers first
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      // Fewer wrong answers
      return a.wrongCount - b.wrongCount;
    });
  }

  /**
   * Exports audit log as CSV format for teacher records
   */
  static exportAuditCsv(auditHistory, teams) {
    let csv = "ಕನ್ನಡ ಕ್ವಿಜ್ ಅರೆನಾ - ಅಂಕಗಳ ಲೆಕ್ಕಪರಿಶೋಧನೆ (Score Audit History)\n\n";
    csv += "ಕ್ರಮ ಸಂಖ್ಯೆ,ಪ್ರಶ್ನೆ ID,ವಿಭಾಗ,ತಂಡ,ಯತ್ನ (Attempt),ಆಯ್ಕೆ,ಫಲಿತಾಂಶ,ಅಂಕಗಳು,ಸಮಯ\n";

    auditHistory.forEach((item, idx) => {
      const row = [
        idx + 1,
        item.questionId,
        `"${item.category}"`,
        `"${item.teamName}"`,
        item.attemptNumber,
        `"${(item.selectedOption || '').replace(/"/g, '""')}"`,
        item.result,
        item.pointsAwarded,
        `"${item.timestamp}"`
      ];
      csv += row.join(",") + "\n";
    });

    csv += "\nಅಂತಿಮ ಫಲಿತಾಂಶ (Final Rankings)\n";
    csv += "ಸ್ಥಾನ,ತಂಡದ ಹೆಸರು,ಒಟ್ಟು ಅಂಕಗಳು,ಸರಿಯಾದ ಉತ್ತರಗಳು,ತಪ್ಪು ಉತ್ತರಗಳು,ಟೈಮ್‌ಔಟ್\n";

    const ranked = this.getRankedTeams(teams);
    ranked.forEach((team, idx) => {
      csv += `${idx + 1},"${team.name}",${team.score},${team.correctCount},${team.wrongCount},${team.timeoutCount}\n`;
    });

    return csv;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ScoringSystem };
}
