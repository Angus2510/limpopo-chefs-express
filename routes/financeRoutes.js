const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');

router.use(isAuthenticated); 

router.route('/collectFees')
    .post( hasPermission(['admin/finance/collect']), financeController.collectFees)
    .get(financeController.getAllCollectedFees);

router.route('/collectFees/:studentId')
    .get(financeController.getCollectedFeesByStudentId);

router.route('/updatecollectfees')
    .post( hasPermission(['admin/finance/collect']), financeController.updateCollectedFees);

router.route('/payableFees')
    .post( hasPermission(['admin/finance/payable']), financeController.addPayableFees)
    .get(financeController.getAllPayableFees);

router.route('/studentFees')
    .get(financeController.getStudentFees);

router.route('/studentFees/:studentId')
    .get(financeController.getStudentFeesById);

router.route('/studentFees/add')
    .post( hasPermission(['admin/finance/payable']), financeController.bulkAddPayableFees);

module.exports = router;
