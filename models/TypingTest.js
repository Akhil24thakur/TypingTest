const db = require('./db');

const TypingTest = {
  create(data) {
    return db.createTest(data);
  },

  findAll() {
    return db.getAllTests();
  },

  findById(id) {
    return db.getTestById(id);
  },

  deleteById(id) {
    return db.deleteTest(id);
  },

  getStats() {
    return db.getStats();
  }
};

module.exports = TypingTest;
