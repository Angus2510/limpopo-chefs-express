const AssignmentResult = require('../models/AssignmentResults');
const Outcome = require('../models/Outcome');
const Campus = require('../models/Campus');

exports.getAssignmentResultsByIntakeGroup = async (req, res) => {
  try {
    const intakeGroupId = req.params.id;
    const assignmentResults = await AssignmentResult.find({ intakeGroup: intakeGroupId }).populate('outcome').populate('campus');

    const groupedResults = assignmentResults.reduce((acc, result) => {
      const campusId = result.campus._id.toString();
      const outcomeId = result.outcome._id.toString();

      if (!acc[campusId]) {
        acc[campusId] = {
          campus: result.campus, 
          outcomes: {},
        };
      }

      if (!acc[campusId].outcomes[outcomeId]) {
        acc[campusId].outcomes[outcomeId] = {
          outcome: result.outcome,
          results: [],
          markedCount: 0,
          totalCount: 0,
        };
      }

      acc[campusId].outcomes[outcomeId].results.push(result);
      acc[campusId].outcomes[outcomeId].totalCount += 1;
      if (['Marked', 'Moderated', 'Terminated'].includes(result.status)) {
        acc[campusId].outcomes[outcomeId].markedCount += 1;
      }

      return acc;
    }, {});

    const formattedResults = Object.values(groupedResults).map(group => ({
      campus: group.campus,
      outcomes: Object.values(group.outcomes).map(outcomeGroup => ({
        outcome: outcomeGroup.outcome,
        marked: `${outcomeGroup.markedCount}/${outcomeGroup.totalCount}`,
      })),
    }));

    res.status(200).json(formattedResults);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignmentResultsByCampusAndOutcome = async (req, res) => {
    console.log('Request params:', req.params);
    const { campusId, outcomeId } = req.params;
  
    try {
      const assignmentResults = await AssignmentResult.find({
        campus: campusId,
        outcome: outcomeId
      })
      .populate('assignment')
      .populate({
          path: 'assignment',
          populate: [
            { path: 'lecturer', model: 'Staff' },
            { path: 'outcome', model: 'Outcome' }
          ] 
        })
        .populate('student')
        .populate('intakeGroup')
        .populate('campus');
  
      console.log('Assignment Results:', assignmentResults);
      res.json(assignmentResults);
    } catch (err) {
      console.error('Error fetching assignment results:', err);
      res.status(500).send(err);
    }
  };

  exports.getAllAssignmentResults = async (req, res) => {
    try {
      const assignmentResults = await AssignmentResult.find({})
        .populate('outcome')
        .populate('campus');
  
      const groupedResults = assignmentResults.reduce((acc, result) => {
        if (!result.campus || !result.outcome) {
          return acc; // Skip results that don't have campus or outcome populated
        }
  
        const campusId = result.campus._id.toString();
        const outcomeId = result.outcome._id.toString();
  
        if (!acc[campusId]) {
          acc[campusId] = {
            campus: result.campus,
            outcomes: {},
          };
        }
  
        if (!acc[campusId].outcomes[outcomeId]) {
          acc[campusId].outcomes[outcomeId] = {
            outcome: result.outcome,
            results: [],
            markedCount: 0,
            totalCount: 0,
          };
        }
  
        acc[campusId].outcomes[outcomeId].results.push(result);
        acc[campusId].outcomes[outcomeId].totalCount += 1;
        if (['Marked', 'Moderated', 'Terminated'].includes(result.status)) {
          acc[campusId].outcomes[outcomeId].markedCount += 1;
        }
  
        return acc;
      }, {});
  
      const formattedResults = Object.values(groupedResults).map(group => ({
        campus: group.campus,
        outcomes: Object.values(group.outcomes).map(outcomeGroup => ({
          outcome: outcomeGroup.outcome,
          marked: `${outcomeGroup.markedCount}/${outcomeGroup.totalCount}`,
        })),
      }));
  
      res.status(200).json(formattedResults);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  