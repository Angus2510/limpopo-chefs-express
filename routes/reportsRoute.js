const express = require('express');
const router = express.Router();
const { getAccountsInArrears, getModerationReport } = require('../controllers/reportsController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

// Route for accounts in arrears
router.get('/accounts-in-arrears', hasPermission(['admin/reports/arrears']), getAccountsInArrears);

// Route for moderation report
router.get('/moderation-report', hasPermission(['admin/reports/moderation']), getModerationReport);

module.exports = router;
