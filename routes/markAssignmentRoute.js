const express = require('express');
const router = express.Router(); 
const markAssignmentController = require('../controllers/markAssignmentController');

router.route('/')
    .get(markAssignmentController.getAllAssignmentResults);

router.route('/campus/:campusId/outcome/:outcomeId')
    .get(markAssignmentController.getAssignmentResultsByCampusAndOutcome);

router.route('/:id')
    .get(markAssignmentController.getAssignmentResultsByIntakeGroup);

module.exports = router;