const ComparisonEngine = require('./comparisonEngine');
const TypingTest = require('../models/TypingTest');

const TypingController = {
  getHomePage(req, res) {
    res.render('index');
  },

  getInputPage(req, res) {
    res.render('input');
  },

  getTypingPage(req, res) {
    res.render('typing');
  },

  getHistoryPage(req, res) {
    res.render('history');
  },

  getResultPage(req, res) {
    res.render('result');
  },

  submitTest(req, res) {
    try {
      const { original_text, typed_text, duration_seconds, backspace_count, total_keystrokes } = req.body;

      if (!original_text || !typed_text) {
        return res.status(400).json({ error: 'Original text and typed text are required.' });
      }

      const metrics = ComparisonEngine.computeAll(
        original_text,
        typed_text,
        parseFloat(duration_seconds) || 0,
        parseInt(backspace_count) || 0,
        parseInt(total_keystrokes) || 0
      );

      const id = TypingTest.create(metrics);

      res.json({ success: true, id, metrics });
    } catch (err) {
      console.error('Error submitting test:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  getTestById(req, res) {
    try {
      const test = TypingTest.findById(parseInt(req.params.id));
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      res.json(test);
    } catch (err) {
      console.error('Error fetching test:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  getAllTests(req, res) {
    try {
      const tests = TypingTest.findAll();
      res.json(tests);
    } catch (err) {
      console.error('Error fetching tests:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  deleteTest(req, res) {
    try {
      const result = TypingTest.deleteById(parseInt(req.params.id));
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting test:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  getStats(req, res) {
    try {
      const stats = TypingTest.getStats();
      res.json(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
};

module.exports = TypingController;
