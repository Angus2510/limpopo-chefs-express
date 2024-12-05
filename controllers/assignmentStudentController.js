const Assignment = require('../models/Assignment');
const Student = require('../models/Student');
const AssignmentResult = require('../models/AssignmentResults');
const Answer = require('../models/Answer');
const Question = require('../models/Question');

// Function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// const getAssignmentsForStudent = async (req, res) => {
//     try {
//         const { studentId } = req.params;
//         console.log(`Fetching assignments for student ID: ${studentId}`);
        
//         const student = await Student.findById(studentId).populate('campus').populate('intakeGroup');

//         if (!student) {
//             console.log('Student not found');
//             return res.status(404).json({ msg: 'Student not found' });
//         }

//         const campusIds = student.campus.map(campus => campus._id.toString());
//         const intakeGroupIds = student.intakeGroup.map(intakeGroup => intakeGroup._id.toString());

//         console.log(`Student campus IDs: ${campusIds}`);
//         console.log(`Student intake group IDs: ${intakeGroupIds}`);

//         const assignments = await Assignment.find({
//             $and: [
//                 { campus: { $in: campusIds } },
//                 { intakeGroups: { $in: intakeGroupIds } }
//             ]
//         })
//         .select('title lecturer outcome availableFrom duration')
//         .populate('lecturer', 'profile.firstName')
//         .populate('outcome', 'title');

//         const filteredAssignments = assignments.map(assignment => {
//             const availableUntil = new Date(assignment.availableFrom);
//             availableUntil.setMinutes(availableUntil.getMinutes() + assignment.duration);
//             return {
//                 _id: assignment._id,
//                 title: assignment.title,
//                 lecturer: assignment.lecturer ? assignment.lecturer.profile.firstName : 'N/A',
//                 outcome: assignment.outcome.length ? assignment.outcome.map(o => o.title).join(', ') : 'N/A',
//                 availableFrom: assignment.availableFrom,
//                 duration: assignment.duration,
//                 availableUntil: availableUntil,
//             };
//         });

//         console.log(`Filtered assignments: ${JSON.stringify(filteredAssignments, null, 2)}`);
//         res.json(filteredAssignments);
//     } catch (err) {
//         console.error('Error fetching assignments:', err.message);
//         res.status(500).send(err.message);
//     }
// };

const getAssignmentsForStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log(`Fetching assignments for student ID: ${studentId}`);
        
        const student = await Student.findById(studentId).populate('campus').populate('intakeGroup');

        if (!student) {
            console.log('Student not found');
            return res.status(404).json({ msg: 'Student not found' });
        }

        const campusIds = student.campus.map(campus => campus._id.toString());
        const intakeGroupIds = student.intakeGroup.map(intakeGroup => intakeGroup._id.toString());

        console.log(`Student campus IDs: ${campusIds}`);
        console.log(`Student intake group IDs: ${intakeGroupIds}`);

        // Find assignments specifically assigned to the student
        const individualAssignments = await Assignment.find({
            individualStudents: studentId
        })
        .select('title lecturer outcome availableFrom duration')
        .populate('lecturer', 'profile.firstName')
        .populate('outcome', 'title');

        // Find assignments based on campus and intake group
        const groupAssignments = await Assignment.find({
            $and: [
                { campus: { $in: campusIds } },
                { intakeGroups: { $in: intakeGroupIds } }
            ]
        })
        .select('title lecturer outcome availableFrom duration')
        .populate('lecturer', 'profile.firstName')
        .populate('outcome', 'title');

        // Merge individual and group assignments
        const allAssignments = [...individualAssignments, ...groupAssignments];

        // Remove duplicates
        const uniqueAssignments = allAssignments.filter((assignment, index, self) =>
            index === self.findIndex(a => a._id.toString() === assignment._id.toString())
        );

        const filteredAssignments = uniqueAssignments.map(assignment => {
            const availableUntil = new Date(assignment.availableFrom);
            availableUntil.setMinutes(availableUntil.getMinutes() + assignment.duration);
            return {
                _id: assignment._id,
                title: assignment.title,
                lecturer: assignment.lecturer ? assignment.lecturer.profile.firstName : 'N/A',
                outcome: assignment.outcome.length ? assignment.outcome.map(o => o.title).join(', ') : 'N/A',
                availableFrom: assignment.availableFrom,
                duration: assignment.duration,
                availableUntil: availableUntil,
            };
        });

        console.log(`Filtered assignments: ${JSON.stringify(filteredAssignments, null, 2)}`);
        res.json(filteredAssignments);
    } catch (err) {
        console.error('Error fetching assignments:', err.message);
        res.status(500).send(err.message);
    }
};


const startAssignment = async (req, res) => {
    try {
        const { studentId, assignmentId } = req.params;
        const { password } = req.body;
        console.log(`Password received: ${password}`);
        
        const assignment = await Assignment.findById(assignmentId).populate('questions').populate('outcome');
        console.log(`Fetched assignment: ${JSON.stringify(assignment, null, 2)}`);

        if (!assignment) {
            console.log('Assignment not found');
            return res.status(404).json({ msg: 'Assignment not found' });
        }

        // Log the availableFrom time
        console.log(`Assignment availableFrom: ${assignment.availableFrom}`);

        // Time validation
        const currentTime = new Date();
        const availableFrom = new Date(assignment.availableFrom);
        const availableUntil = new Date(availableFrom.getTime() + assignment.duration * 60000);

        console.log(`Current Time: ${currentTime}`);
        console.log(`Available From: ${availableFrom}`);
        console.log(`Available Until: ${availableUntil}`);

        if (currentTime < availableFrom || currentTime > availableUntil) {
            console.log('Test is not available at this time');
            return res.status(403).json({ msg: 'Test is not available at this time' });
        }

        if (assignment.password !== password) {
            console.log('Incorrect password');
            return res.status(401).json({ msg: 'Incorrect password' });
        }

        console.log(`Password verified for assignment: ${assignmentId}`);

        let existingResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
        console.log(`Existing result: ${JSON.stringify(existingResult, null, 2)}`);

        if (existingResult) {
            if ((assignment.type === 'Test' && existingResult.status === 'Starting') || assignment.type === 'Task') {
                console.log('Assignment already started, granting access');
            } else {
                console.log('Assignment already started but not in starting status');
                return res.status(403).json({ msg: 'Test has already been started and cannot be reopened.' });
            }
        } else {
            // Fetch the student's details
            const student = await Student.findById(studentId).populate('campus').populate('intakeGroup');
            console.log(`Fetched student: ${JSON.stringify(student, null, 2)}`);

            if (!student) {
                console.log('Student not found');
                return res.status(404).json({ msg: 'Student not found' });
            }

            console.log('Creating new result entry');
            const newResultData = {
                assignment: assignmentId,
                student: studentId,
                campus: student.campus.length > 0 ? student.campus[0]._id : null,
                intakeGroup: student.intakeGroup.length > 0 ? student.intakeGroup[0]._id : null,
                outcome: assignment.outcome.length > 0 ? assignment.outcome[0]._id : null,
            };
            
            console.log(`New result data: ${JSON.stringify(newResultData, null, 2)}`);

            const newResult = new AssignmentResult(newResultData);

            await newResult.save();
            console.log('New AssignmentResult saved:', JSON.stringify(newResult, null, 2));
            existingResult = newResult;

            const answerPromises = assignment.questions.map((question) => {
                const newAnswer = new Answer({
                    student: studentId,
                    assignment: assignmentId,
                    question: question._id,
                    answer: "", 
                    matchAnswers: [],
                });
                return newAnswer.save();
            });

            const answers = await Promise.all(answerPromises);
            existingResult.answers = answers.map(answer => answer._id);
            await existingResult.save();
            console.log('Answers saved and added to AssignmentResult:', JSON.stringify(existingResult, null, 2));
        }

        const response = {
            msg: 'Access granted',
            assignment: {
                _id: assignment._id,
                title: assignment.title,
                duration: assignment.duration,
                availableFrom: assignment.availableFrom,
                availableUntil: availableUntil,
            },
            assignmentResultId: existingResult._id, 
        };

        console.log(`Response: ${JSON.stringify(response, null, 2)}`);
        res.status(200).json(response);
    } catch (err) {
        console.error('Error starting assignment:', err.message);
        res.status(500).send(err.message);
    }
};

const startWritingAssignment = async (req, res) => {
    try {
        const { studentId, assignmentId } = req.params;

        // Find the assignment result
        const assignmentResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
        console.log('AssignmentResult found:', assignmentResult);

        if (!assignmentResult) {
            console.log('Assignment result not found');
            return res.status(404).json({ msg: 'Assignment result not found' });
        }

        if (assignmentResult.status !== 'Starting') {
            console.log('Assignment is not in the Starting status');
            return res.status(403).json({ msg: 'Assignment is already started.' });
        }

        // Change status to 'Writing'
        assignmentResult.status = 'Writing';
        await assignmentResult.save();
        console.log('Assignment result status changed to Writing:', assignmentResult);

        // Fetch the assignment and its questions
        const assignment = await Assignment.findById(assignmentId).populate('questions');
        console.log('Fetched assignment:', assignment);

        if (!assignment) {
            console.log('Assignment not found');
            return res.status(404).json({ msg: 'Assignment not found' });
        }

        // Shuffle questions
        const shuffledQuestions = shuffleArray(assignment.questions);

        // Fetch answers for the student and assignment
        const answers = await Answer.find({ student: studentId, assignment: assignmentId });
        console.log('Fetched answers:', answers);

        // Attach answers to questions
        const questionsWithAnswers = shuffledQuestions.map(question => {
            if (question.type === 'Match') {
                question.options.forEach(option => {
                    if (option.columnA && option.columnA.startsWith('https://')) {
                        const columnAKey = option.columnA.split('.com/')[1];
                        option.columnA = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnAKey}`;
                    }
                    if (option.columnB && option.columnB.startsWith('https://')) {
                        const columnBKey = option.columnB.split('.com/')[1];
                        option.columnB = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnBKey}`;
                    }
                });
            }

            const answer = answers.find(ans => ans.question.toString() === question._id.toString());
            const questionObject = question.toObject();
            delete questionObject.correctAnswer;
            return {
                ...questionObject,
                answer: answer ? answer.answer : null,
                matchAnswers: answer ? answer.matchAnswers : [],
            };
        }); 

        console.log('Questions with answers:', questionsWithAnswers);

        const response = {
            msg: 'Assignment status changed to Writing',
            resultId: assignmentResult._id,
            questions: questionsWithAnswers 
        };

        console.log('Response:', response);

        res.status(200).json(response);
    } catch (err) {
        console.error('Error starting assignment:', err.message);
        res.status(500).send(err.message);
    }
};

// const startWritingAssignment = async (req, res) => {
//     try {
//         const { studentId, assignmentId } = req.params;

//         // Find the assignment result
//         const assignmentResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
//         console.log('AssignmentResult found:', assignmentResult);

//         if (!assignmentResult) {
//             console.log('Assignment result not found');
//             return res.status(404).json({ msg: 'Assignment result not found' });
//         }

//         if (assignmentResult.status !== 'Starting') {
//             console.log('Assignment is not in the Starting status');
//             return res.status(403).json({ msg: 'Assignment is not in the Starting status' });
//         }

//         // Find the assignment
//         const assignment = await Assignment.findById(assignmentId);
//         console.log('Fetched assignment:', assignment);

//         if (!assignment) {
//             console.log('Assignment not found');
//             return res.status(404).json({ msg: 'Assignment not found' });
//         }

//         // Change status to 'Writing'
//         assignmentResult.status = 'Writing';
//         await assignmentResult.save();
//         console.log('Assignment result status changed to Writing:', assignmentResult);

//         // Fetch the assignment questions
//         const questions = await Question.find({ _id: { $in: assignment.questions } });
//         console.log('Fetched questions:', questions);

//         // If it is a Task, return the questions directly
//         if (assignment.type === 'Task') {
//             const response = {
//                 msg: 'Assignment status changed to Writing',
//                 resultId: assignmentResult._id,
//                 questions: questions,
//             };

//             console.log('Response:', response);

//             return res.status(200).json(response);
//         }

//         // For Test type, create answers if not already present
//         const answers = await Answer.find({ student: studentId, assignment: assignmentId });
//         if (answers.length === 0) {
//             console.log('Creating answers for the test');

//             // Code to create answers goes here
//         }

//         // Attach answers to questions
//         const questionsWithAnswers = shuffledQuestions.map(question => {
//             if (question.type === 'Match') {
//                 question.options.forEach(option => {
//                     if (option.columnA && option.columnA.startsWith('https://')) {
//                         const columnAKey = option.columnA.split('.com/')[1];
//                         option.columnA = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnAKey}`;
//                     }
//                     if (option.columnB && option.columnB.startsWith('https://')) {
//                         const columnBKey = option.columnB.split('.com/')[1];
//                         option.columnB = `https://limpopochefs.vercel.app/api/files/getFile?key=${columnBKey}`;
//                     }
//                 });
//             }

//             const answer = answers.find(ans => ans.question.toString() === question._id.toString());
//             const questionObject = question.toObject();
//             delete questionObject.correctAnswer;
//             return {
//                 ...questionObject,
//                 answer: answer ? answer.answer : null,
//                 matchAnswers: answer ? answer.matchAnswers : [],
//             };
//         });

//         console.log('Questions with answers:', questionsWithAnswers);

//         const response = {
//             msg: 'Assignment status changed to Writing',
//             resultId: assignmentResult._id,
//             questions: questionsWithAnswers 
//         };

//         console.log('Response:', response);

//         res.status(200).json(response);
//     } catch (err) {
//         console.error('Error starting assignment:', err.message);
//         res.status(500).send(err.message);
//     }
// };


const submitAnswers = async (req, res) => {
    try {
        const { studentId, assignmentId } = req.params;
        const { questionId, answer, matchAnswers } = req.body;
        console.log('Request Body:', req.body);

        // Log studentId and assignmentId
        console.log('Student ID:', studentId);
        console.log('Assignment ID:', assignmentId);

        const assignmentResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
        
        if (!assignmentResult) {
            console.log('Assignment result not found');
            return res.status(404).json({ msg: 'Assignment result not found' });
        }

        // Log found assignmentResult
        console.log('Found AssignmentResult:', assignmentResult);

        let existingAnswer = await Answer.findOne({ student: studentId, assignment: assignmentId, question: questionId });

        if (existingAnswer) {
            console.log('Existing Answer found. Updating the answer...');
            existingAnswer.answer = answer;
            existingAnswer.matchAnswers = matchAnswers;
            await existingAnswer.save();
            console.log('Answer updated:', existingAnswer);
        } else {
            console.log('No existing answer found. Creating a new answer...');
            existingAnswer = new Answer({
                student: studentId,
                assignment: assignmentId,
                question: questionId,
                answer,
                matchAnswers,
            });
            await existingAnswer.save();
            console.log('New answer created:', existingAnswer);

            assignmentResult.answers.push(existingAnswer._id);
            await assignmentResult.save();
            console.log('Answer added to assignment result:', assignmentResult);
        }

        res.status(200).json({ msg: 'Answer submitted successfully', answerId: existingAnswer._id });
    } catch (err) {
        console.error('Error submitting answer:', err);
        res.status(500).send(err.message);
    }
};


const submitAssignment = async (req, res) => {
    try {
        const { studentId, assignmentId } = req.params;
        const { answers } = req.body;
        console.log('Submit Assignment Request Body:', JSON.stringify(req.body, null, 2));

        // Log studentId and assignmentId
        console.log('Student ID:', studentId);
        console.log('Assignment ID:', assignmentId);

        const assignmentResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
        
        if (!assignmentResult) {
            console.log('Assignment result not found');
            return res.status(404).json({ msg: 'Assignment result not found' });
        }

        // Log found assignmentResult
        console.log('Found AssignmentResult:', JSON.stringify(assignmentResult, null, 2));

        let totalScore = 0;

        // Update each answer
        for (const ans of answers) {
            let existingAnswer = await Answer.findOne({ student: studentId, assignment: assignmentId, question: ans.questionId });

            const question = await Question.findById(ans.questionId);
            if (!question) {
                console.log(`Question not found: ${ans.questionId}`);
                continue;
            }

            console.log(`Processing Question ID: ${ans.questionId}`);
            let score = 0;

            if (question.type === 'SingleWord') {
                const studentAnswer = typeof ans.answer === 'string' ? ans.answer : '';
                console.log(`Evaluating SingleWord question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}`);
                if (studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'TrueFalse') {
                const studentAnswer = typeof ans.answer === 'string' ? ans.answer : '';
                console.log(`Evaluating TrueFalse question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}`);
                if (studentAnswer === question.correctAnswer) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'MultipleChoice') {
                const studentAnswer = ans.answer.value;
                const isCorrect = studentAnswer === question.correctAnswer[0]; // Assuming correctAnswer is an array with one correct value
                console.log(`Evaluating MultipleChoice question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}, Is Correct: ${isCorrect}`);
                if (isCorrect) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'Match') {
                const correctMatches = question.correctAnswer;
                let correctCount = 0;
                if (Array.isArray(ans.matchAnswers)) {
                  for (let i = 0; i < ans.matchAnswers.length; i++) {
                    if (ans.matchAnswers[i] && ans.matchAnswers[i].pairOne === correctMatches[i].columnA && ans.matchAnswers[i].pairTwo === correctMatches[i].columnB) {
                      correctCount++;
                    }
                  }
                } else {
                  console.error('matchAnswers is not an array:', ans.matchAnswers);
                }
                const markPerMatch = parseInt(question.mark) / correctMatches.length;
                score = Math.round(correctCount * markPerMatch);
                console.log(`Evaluating Match question. Student Match Answers: ${JSON.stringify(ans.matchAnswers)}, Correct Matches: ${JSON.stringify(correctMatches)}, Correct Count: ${correctCount}, Score: ${score}`);
              }

            totalScore += score;

            if (existingAnswer) {
                console.log('Existing Answer found. Updating the answer...');
                existingAnswer.answer = ans.answer;
                existingAnswer.matchAnswers = ans.matchAnswers;
                existingAnswer.scores = score;
                await existingAnswer.save();
                console.log('Answer updated:', existingAnswer);
            } else {
                console.log('No existing answer found. Creating a new answer...');
                existingAnswer = new Answer({
                    student: studentId,
                    assignment: assignmentId,
                    question: ans.questionId,
                    answer: ans.answer,
                    matchAnswers: ans.matchAnswers,
                    scores: score,
                });
                await existingAnswer.save();
                console.log('New answer created:', existingAnswer);

                assignmentResult.answers.push(existingAnswer._id);
            }
        }

        // Change the status of the assignment result from 'Writing' to 'Pending'
        assignmentResult.status = 'Pending';
        assignmentResult.scores = totalScore;
        await assignmentResult.save();
        console.log('Assignment result status changed to Pending:', assignmentResult);

        res.status(200).json({ msg: 'Assignment submitted successfully', resultId: assignmentResult._id, totalScore });
    } catch (err) {
        console.error('Error submitting assignment:', err);
        res.status(500).send(err.message);
    }
};

const terminateAssignment = async (req, res) => {
    try {
        const { studentId, assignmentId } = req.params;
        const { answers } = req.body;
        console.log('Submit Assignment Request Body:', JSON.stringify(req.body, null, 2));

        // Log studentId and assignmentId
        console.log('Student ID:', studentId);
        console.log('Assignment ID:', assignmentId);

        const assignmentResult = await AssignmentResult.findOne({ student: studentId, assignment: assignmentId });
        
        if (!assignmentResult) {
            console.log('Assignment result not found');
            return res.status(404).json({ msg: 'Assignment result not found' });
        }

        // Log found assignmentResult
        console.log('Found AssignmentResult:', JSON.stringify(assignmentResult, null, 2));

        let totalScore = 0;

        // Update each answer
        for (const ans of answers) {
            let existingAnswer = await Answer.findOne({ student: studentId, assignment: assignmentId, question: ans.questionId });

            const question = await Question.findById(ans.questionId);
            if (!question) {
                console.log(`Question not found: ${ans.questionId}`);
                continue;
            }

            console.log(`Processing Question ID: ${ans.questionId}`);
            let score = 0;

            if (question.type === 'SingleWord') {
                const studentAnswer = typeof ans.answer === 'string' ? ans.answer : '';
                console.log(`Evaluating SingleWord question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}`);
                if (studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'TrueFalse') {
                const studentAnswer = typeof ans.answer === 'string' ? ans.answer : '';
                console.log(`Evaluating TrueFalse question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}`);
                if (studentAnswer === question.correctAnswer) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'MultipleChoice') {
                const studentAnswer = ans.answer.value;
                const isCorrect = studentAnswer === question.correctAnswer[0]; // Assuming correctAnswer is an array with one correct value
                console.log(`Evaluating MultipleChoice question. Student Answer: ${studentAnswer}, Correct Answer: ${question.correctAnswer}, Is Correct: ${isCorrect}`);
                if (isCorrect) {
                    score = parseInt(question.mark);
                }
            } else if (question.type === 'Match') {
                const correctMatches = question.correctAnswer;
                let correctCount = 0;
                if (Array.isArray(ans.matchAnswers)) {
                  for (let i = 0; i < ans.matchAnswers.length; i++) {
                    if (ans.matchAnswers[i] && ans.matchAnswers[i].pairOne === correctMatches[i].columnA && ans.matchAnswers[i].pairTwo === correctMatches[i].columnB) {
                      correctCount++;
                    }
                  }
                } else {
                  console.error('matchAnswers is not an array:', ans.matchAnswers);
                }
                const markPerMatch = parseInt(question.mark) / correctMatches.length;
                score = Math.round(correctCount * markPerMatch);
                console.log(`Evaluating Match question. Student Match Answers: ${JSON.stringify(ans.matchAnswers)}, Correct Matches: ${JSON.stringify(correctMatches)}, Correct Count: ${correctCount}, Score: ${score}`);
              }

            totalScore += score;

            if (existingAnswer) {
                console.log('Existing Answer found. Updating the answer...');
                existingAnswer.answer = ans.answer;
                existingAnswer.matchAnswers = ans.matchAnswers;
                existingAnswer.scores = score;
                await existingAnswer.save();
                console.log('Answer updated:', existingAnswer);
            } else {
                console.log('No existing answer found. Creating a new answer...');
                existingAnswer = new Answer({
                    student: studentId,
                    assignment: assignmentId,
                    question: ans.questionId,
                    answer: ans.answer,
                    matchAnswers: ans.matchAnswers,
                    scores: score,
                });
                await existingAnswer.save();
                console.log('New answer created:', existingAnswer);

                assignmentResult.answers.push(existingAnswer._id);
            }
        }

        // Change the status of the assignment result from 'Writing' to 'Pending'
        assignmentResult.status = 'Terminated';
        assignmentResult.scores = totalScore;
        await assignmentResult.save();
        console.log('Assignment result status changed to Pending:', assignmentResult);

        res.status(200).json({ msg: 'Assignment submitted successfully', resultId: assignmentResult._id, totalScore });
    } catch (err) {
        console.error('Error submitting assignment:', err);
        res.status(500).send(err.message);
    }
};


module.exports = {
    getAssignmentsForStudent,
    startAssignment,
    submitAnswers,
    startWritingAssignment,
    submitAssignment,
    terminateAssignment,
};
