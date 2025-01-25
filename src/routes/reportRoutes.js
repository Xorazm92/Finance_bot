const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

// Hisobotlarni olish uchun routelar
router.get('/monthly', auth, reportController.getMonthlyReport);
router.get('/current', auth, reportController.getCurrentMonthReport);

module.exports = router;
