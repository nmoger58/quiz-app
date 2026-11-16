/**
 * Team Manager Module
 * Manages team registration, validation, team updates, circular rotation mapping,
 * and team-specific scoring state.
 */

class TeamManager {
  /**
   * Validates an array of team names.
   * Throws Error if fewer than 2 teams, or if empty / duplicate names exist.
   * @param {string[]} names 
   * @returns {string[]} trimmed and validated names
   */
  static validateTeamNames(names) {
    if (!names || names.length < 2) {
      throw new Error("ಕನಿಷ್ಠ 2 ತಂಡಗಳು ಅಗತ್ಯವಿದೆ (At least 2 teams required)");
    }
    const cleanNames = names.map(n => (n || '').trim());
    for (let i = 0; i < cleanNames.length; i++) {
      if (!cleanNames[i]) {
        throw new Error(`ತಂಡ ${i + 1} ಕ್ಕೆ ಹೆಸರು ನಮೂದಿಸಿ (Team ${i + 1} name cannot be empty)`);
      }
    }
    const seen = new Set();
    for (const name of cleanNames) {
      if (seen.has(name)) {
        throw new Error(`'${name}' ಹೆಸರಿನ ತಂಡ ಈಗಾಗಲೇ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ (Duplicate team name)`);
      }
      seen.add(name);
    }
    return cleanNames;
  }

  /**
   * Initializes a new set of team objects with zeroed scores.
   * @param {string[]} names 
   * @returns {object[]} array of initialized team models
   */
  static createTeams(names) {
    const validated = this.validateTeamNames(names);
    return validated.map((name, idx) => ({
      id: `team_${idx + 1}`,
      name: name,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0,
      categoryScores: {}
    }));
  }

  /**
   * Returns the next team index in circular rotation order.
   * @param {number} currentIndex 
   * @param {number} teamCount 
   * @returns {number}
   */
  static getNextActiveTeamIndex(currentIndex, teamCount) {
    if (!teamCount || teamCount <= 0) return 0;
    return (currentIndex + 1) % teamCount;
  }

  /**
   * Returns the starting team index for a given global question offset.
   * @param {number} globalQuestionIndex 
   * @param {number} teamCount 
   * @returns {number}
   */
  static getStartingTeamForQuestion(globalQuestionIndex, teamCount) {
    if (!teamCount || teamCount <= 0) return 0;
    return globalQuestionIndex % teamCount;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TeamManager };
}
if (typeof window !== 'undefined') {
  window.TeamManager = TeamManager;
}
