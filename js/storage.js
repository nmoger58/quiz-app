/**
 * Storage and Session Persistence Manager
 * Uses localStorage to persist game state, team lists, question edits, and audit logs.
 */
const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: 'kannada_quiz_active_session_id',
  SESSION_PREFIX: 'kannada_quiz_session_',
  QUESTIONS: 'kannada_quiz_custom_questions',
  SETTINGS: 'kannada_quiz_settings'
};

class StorageManager {
  static generateSessionId() {
    return 'KA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static getActiveSessionId() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    } catch (e) {
      return null;
    }
  }

  static setActiveSessionId(sessionId) {
    try {
      if (sessionId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      }
    } catch (e) {}
  }

  static saveSession(state) {
    if (!state || !state.sessionId) return;
    try {
      const key = STORAGE_KEYS.SESSION_PREFIX + state.sessionId;
      localStorage.setItem(key, JSON.stringify(state));
      this.setActiveSessionId(state.sessionId);
    } catch (e) {
      console.warn("Storage save error", e);
    }
  }

  static loadSession(sessionId) {
    if (!sessionId) {
      sessionId = this.getActiveSessionId();
    }
    if (!sessionId) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION_PREFIX + sessionId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Storage load error", e);
      return null;
    }
  }

  static clearSession(sessionId) {
    try {
      if (sessionId) {
        localStorage.removeItem(STORAGE_KEYS.SESSION_PREFIX + sessionId);
      }
      if (this.getActiveSessionId() === sessionId) {
        this.setActiveSessionId(null);
      }
    } catch (e) {}
  }

  static saveQuestions(questions) {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    } catch (e) {}
  }

  static loadQuestions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  static resetQuestions() {
    try {
      localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    } catch (e) {}
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }

  static loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : { sound: true, autoPassDelay: 1500 };
    } catch (e) {
      return { sound: true, autoPassDelay: 1500 };
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { StorageManager, STORAGE_KEYS };
}
