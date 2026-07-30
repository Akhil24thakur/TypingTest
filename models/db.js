const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'typing.json');

function initialize() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ tests: [], nextId: 1 }, null, 2));
    console.log('JSON database initialized.');
  } else {
    console.log('JSON database loaded.');
  }
}

function readDb() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { tests: [], nextId: 1 };
  }
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getAllTests() {
  const db = readDb();
  return db.tests;
}

function getTestById(id) {
  const db = readDb();
  return db.tests.find(t => t.id === id) || null;
}

function createTest(testData) {
  const db = readDb();
  const id = db.nextId;
  testData.id = id;
  testData.created_at = new Date().toISOString();
  db.tests.unshift(testData);
  db.nextId = id + 1;
  writeDb(db);
  return id;
}

function deleteTest(id) {
  const db = readDb();
  const index = db.tests.findIndex(t => t.id === id);
  if (index === -1) return false;
  db.tests.splice(index, 1);
  writeDb(db);
  return true;
}

function getStats() {
  const db = readDb();
  const tests = db.tests;
  const count = tests.length;

  if (count === 0) {
    return {
      total_tests: 0,
      avg_wpm: 0,
      highest_wpm: 0,
      highest_accuracy: 0,
      avg_accuracy: 0,
      longest_test: 0,
      total_practice_time: 0,
      total_words_typed: 0,
      total_characters_typed: 0
    };
  }

  const avgWpm = tests.reduce((s, t) => s + t.net_wpm, 0) / count;
  const avgAcc = tests.reduce((s, t) => s + t.accuracy, 0) / count;
  const highestWpm = Math.max(...tests.map(t => t.net_wpm));
  const highestAcc = Math.max(...tests.map(t => t.accuracy));
  const longestTest = Math.max(...tests.map(t => t.duration_seconds));
  const totalTime = tests.reduce((s, t) => s + t.duration_seconds, 0);
  const totalWords = tests.reduce((s, t) => s + t.words_typed, 0);
  const totalChars = tests.reduce((s, t) => s + t.characters_typed, 0);

  return {
    total_tests: count,
    avg_wpm: Math.round(avgWpm * 100) / 100,
    highest_wpm: Math.round(highestWpm * 100) / 100,
    highest_accuracy: Math.round(highestAcc * 100) / 100,
    avg_accuracy: Math.round(avgAcc * 100) / 100,
    longest_test: Math.round(longestTest * 100) / 100,
    total_practice_time: Math.round(totalTime * 100) / 100,
    total_words_typed: totalWords,
    total_characters_typed: totalChars
  };
}

module.exports = { initialize, getAllTests, getTestById, createTest, deleteTest, getStats };
