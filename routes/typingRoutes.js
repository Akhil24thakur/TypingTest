const express = require('express');
const router = express.Router();
const controller = require('../controllers/typingController');

router.get('/', controller.getHomePage);
router.get('/input', controller.getInputPage);
router.get('/typing', controller.getTypingPage);
router.get('/history', controller.getHistoryPage);
router.get('/result', controller.getResultPage);

router.post('/api/submit', controller.submitTest);
router.get('/api/tests', controller.getAllTests);
router.get('/api/tests/:id', controller.getTestById);
router.delete('/api/tests/:id', controller.deleteTest);
router.get('/api/stats', controller.getStats);

module.exports = router;
