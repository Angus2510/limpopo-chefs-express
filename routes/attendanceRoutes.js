const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { isAuthenticated, hasPermission, hasRoles, isStaff, isStudent, isGuardian } = require('../middleware/authMiddelware');
const welAttendanceController = require('../controllers/attendanceWelController');

router.use(isAuthenticated); 

router.post('/',hasPermission(['admin/attendance/student']), attendanceController.addManualAttendance);

router.get('/',hasPermission(['admin/attendance/student']), attendanceController.getAllAttendance);

router.get('/student', attendanceController.getAttendance);

router.post('/student', attendanceController.bulkAddAttendance);

router.post('/qr', hasPermission(['admin/attendance/qr']), attendanceController.addQRAttendance);

router.get('/qr', attendanceController.getAllQRCodes);

router.get('/qr/:id', attendanceController.getQrById);

router.delete('/qr/:id', hasPermission(['admin/attendance/qr']), attendanceController.deleteQrById);

router.get('/student/:studentId', attendanceController.getAttendanceByStudentId);

router.get('/student/:studentId/:year/:month', attendanceController.getAttendanceByStudentIdAndMonth);

router.post('/wel', hasPermission(['admin/attendance/wel']), welAttendanceController.addWelAttendance);

router.get('/wel', hasPermission(['admin/attendance/wel']), welAttendanceController.getAllWelAttendance);

module.exports = router;  