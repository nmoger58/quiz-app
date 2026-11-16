/**
 * Question Management Module
 * Enables teachers to view, add, edit, delete, reorder questions, and upload images.
 */

class QuestionManager {
  constructor(defaultQuestions = DEFAULT_QUESTIONS) {
    this.questions = StorageManager.loadQuestions() || [...defaultQuestions];
  }

  getAllQuestions() {
    return this.questions;
  }

  getQuestionsByCategory(categoryId) {
    return this.questions.filter(q => q.categoryId === categoryId);
  }

  getQuestionById(id) {
    return this.questions.find(q => q.id === id);
  }

  addQuestion(questionData) {
    const newId = Date.now();
    const newQuestion = {
      id: newId,
      category: questionData.category,
      categoryId: questionData.categoryId,
      question: questionData.question,
      options: questionData.options,
      answer: questionData.answer,
      type: questionData.type || 'mcq',
      image: questionData.image || null,
      explanation: questionData.explanation || ''
    };
    this.questions.push(newQuestion);
    this.save();
    return newQuestion;
  }

  updateQuestion(id, updatedData) {
    const idx = this.questions.findIndex(q => q.id === id);
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

  deleteQuestion(id) {
    this.questions = this.questions.filter(q => q.id !== id);
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
