/**
 * Question Management Module
 * Enables teachers to view, add, edit, delete, reorder questions, and upload images.
 */

class QuestionManager {
  constructor(defaultQuestions = DEFAULT_QUESTIONS) {
    this.questions = StorageManager.loadQuestions() || [...defaultQuestions];
  }

  getAllQuestions(onlyEnabled = false) {
    if (onlyEnabled) {
      return this.questions.filter(q => q.enabled !== false);
    }
    return this.questions;
  }

  getQuestionsByCategory(categoryId, onlyEnabled = false) {
    return this.questions.filter(q => {
      const matchCat = (q.categoryId === categoryId || q.category === categoryId);
      return onlyEnabled ? (matchCat && q.enabled !== false) : matchCat;
    });
  }

  getQuestionById(id) {
    return this.questions.find(q => q.id === id || q.id === parseInt(id, 10));
  }

  addQuestion(questionData) {
    const newId = Date.now();
    const newQuestion = {
      id: newId,
      category: questionData.category,
      categoryId: questionData.categoryId || 'gk',
      question: questionData.question,
      options: [...questionData.options],
      answer: questionData.answer,
      type: questionData.type || 'mcq',
      image: questionData.image || null,
      explanation: questionData.explanation || '',
      enabled: questionData.enabled !== false
    };
    this.questions.push(newQuestion);
    this.save();
    return newQuestion;
  }

  updateQuestion(id, updatedData) {
    const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
    const idx = this.questions.findIndex(q => q.id === id || q.id === parsedId);
    if (idx !== -1) {
      this.questions[idx] = {
        ...this.questions[idx],
        ...updatedData
      };
      this.save();
      return this.questions[idx];
    }
    return null;
  }

  toggleEnable(id) {
    const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
    const q = this.questions.find(item => item.id === id || item.id === parsedId);
    if (q) {
      q.enabled = (q.enabled === false) ? true : false;
      this.save();
      return q.enabled;
    }
    return true;
  }

  deleteQuestion(id) {
    const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
    this.questions = this.questions.filter(q => q.id !== id && q.id !== parsedId);
    this.save();
  }

  moveQuestion(id, direction) {
    const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
    const idx = this.questions.findIndex(q => q.id === id || q.id === parsedId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= this.questions.length) return;
    const temp = this.questions[idx];
    this.questions[idx] = this.questions[targetIdx];
    this.questions[targetIdx] = temp;
    this.save();
  }

  resetToDefault(defaultQuestions = DEFAULT_QUESTIONS) {
    this.questions = [...defaultQuestions];
    StorageManager.resetQuestions();
    return this.questions;
  }

  save() {
    StorageManager.saveQuestions(this.questions);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuestionManager };
}
