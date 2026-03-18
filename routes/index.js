const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');
const { requireLogin } = require('../middleware/auth');

// Auth routes
router.get('/login',    authController.loginPage);
router.post('/login',   authController.login);
router.get('/register', authController.registerPage);
router.post('/register', authController.register);
router.get('/logout',   authController.logout);
router.get('/forgot-password',  authController.forgotPage);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password',   authController.resetPage);
router.post('/reset-password',  authController.resetPassword);

// Protected routes
router.get('/', requireLogin, homeController.index);
router.get('/balance', requireLogin, homeController.balancePage);
router.post('/balance', requireLogin, homeController.updateBalance);
router.get('/balance/history', requireLogin, homeController.historyPage);
router.get('/income',         requireLogin, homeController.incomePage);
router.post('/income',        requireLogin, homeController.updateIncome);
router.get('/income/history', requireLogin, homeController.incomeHistoryPage);
router.post('/income/checkin',   requireLogin, homeController.checkIn);
router.post('/income/uncheckin', requireLogin, homeController.unCheckIn);
router.get('/expense',         requireLogin, homeController.expensePage);
router.post('/expense',        requireLogin, homeController.addExpense);
router.get('/expense/history', requireLogin, homeController.expenseHistoryPage);
router.get('/manage', requireLogin, homeController.managePage);
router.get('/stats',  requireLogin, homeController.statsPage);
router.get('/sources',        requireLogin, homeController.sourcesPage);
router.get('/sources/list',   requireLogin, homeController.sourcesList);
router.post('/sources/add',   requireLogin, homeController.sourceAdd);
router.post('/sources/update',requireLogin, homeController.sourceUpdate);
router.post('/sources/delete',requireLogin, homeController.sourceDelete);

router.get('/categories',        requireLogin, homeController.categoriesPage);
router.get('/categories/list',   requireLogin, homeController.categoriesList);
router.post('/categories/add',   requireLogin, homeController.categoryAdd);
router.post('/categories/update',requireLogin, homeController.categoryUpdate);
router.post('/categories/delete',requireLogin, homeController.categoryDelete);

module.exports = router;
