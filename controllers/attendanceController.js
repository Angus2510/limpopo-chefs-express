const Attendance = require('../models/Attendance');
const Qr = require('../models/Qr');
const QRCode = require('qrcode');
const upload = require('../middleware/multerConfig');
const { s3, bucketName} = require('../config/s3');
const moment = require('moment');
const Student = require('../models/Student');
const Campus = require('../models/Campus');
const IntakeGroup = require('../models/IntakeGroup');


const addManualAttendance = async (req, res) => {
  try {
    const { intakeGroup, campus, attendanceDate, type, attendees } = req.body;
    const attendance = new Attendance({
      intakeGroup,
      campus, 
      attendanceDate,
      type,
      attendees,
    });

    await attendance.save();

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error adding manual attendance:', error);
    res.status(500).json({ success: false, error: 'Error adding manual attendance' });
  }
};


const getAttendance = async (req, res) => {
  try {
    const { intakeGroupId, campusId, date } = req.query;
    const startDate = moment(date).startOf('week').toDate();
    const endDate = moment(date).endOf('week').toDate();

    const students = await Student.find({ intakeGroup: intakeGroupId, campus: campusId });

    const attendanceRecords = await Attendance.find({
      intakeGroup: intakeGroupId,
      campus: campusId,
      attendanceDate: { $gte: startDate, $lte: endDate },
    }).populate('attendees.student');

    const dayIdMapping = {
      0: 7, // Sunday
      1: 1, // Monday
      2: 2, // Tuesday
      3: 3, // Wednesday
      4: 4, // Thursday
      5: 5, // Friday
      6: 6  // Saturday
    };

    const weekAttendance = {};
    for (let m = moment(startDate); m.isBefore(endDate); m.add(1, 'days')) {
      const day = m.format('YYYY-MM-DD');
      const dayId = dayIdMapping[m.day()];
      weekAttendance[day] = students.map(student => ({
        dayId,
        student: student._id,
        firstName: student.profile.firstName,
        lastName: student.profile.lastName,
        admissionNumber: student.admissionNumber,
        status: 'N', // Default status
      }));
    }

    attendanceRecords.forEach(record => {
      const day = moment(record.attendanceDate).format('YYYY-MM-DD');
      record.attendees.forEach(attendee => {
        const studentAttendance = weekAttendance[day].find(sa => sa.student.equals(attendee.student._id));
        if (studentAttendance) {
          studentAttendance.status = attendee.status;
        }
      });
    });

    res.json(weekAttendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const bulkAddAttendance = async (req, res) => {
  try {
    const { intakeGroupId, campusId, attendance } = req.body;

    // Validate input
    if (!intakeGroupId || !campusId || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    for (const day of attendance) {
      const { date, attendees } = day;
      const parsedDate = new Date(date);

      // Find existing attendance record for the specific date
      let attendanceRecord = await Attendance.findOne({
        intakeGroup: intakeGroupId,
        campus: campusId,
        attendanceDate: parsedDate,
      });

      if (!attendanceRecord) {
        // Create a new attendance record if one does not exist
        attendanceRecord = new Attendance({
          intakeGroup: intakeGroupId,
          campus: campusId,
          attendanceDate: parsedDate,
          type: 'One Day',
          attendees: [],
        });
      }

      // Update attendees
      attendees.forEach(att => {
        const existingAttendee = attendanceRecord.attendees.find(a => a.student.toString() === att.student);
        if (existingAttendee) {
          // Update existing attendee status
          existingAttendee.status = att.status;
        } else {
          // Add new attendee
          attendanceRecord.attendees.push({
            student: att.student,
            status: att.status,
          });
        }
      });

      // Save the record
      await attendanceRecord.save();
    }

    res.status(200).json({ message: 'Attendance records updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


const addQRAttendance = async (req, res) => {
  try {
    const { intakeGroup, campus, attendanceDate } = req.body;

    // Log initial request body
    console.log('Request body:', req.body);

    // Ensure intakeGroup is an array
    const intakeGroups = Array.isArray(intakeGroup) ? intakeGroup : [intakeGroup];

    // Log the intakeGroups and campus
    console.log('IntakeGroup IDs:', intakeGroups);
    console.log('Campus ID:', campus);

    // Attendance type is 'One Day'
    const type = 'One Day';
    console.log('Attendance type:', type);

    // Create a new QR code document
    const newQr = new Qr({
      intakeGroup: intakeGroups,
      campus,
      attendanceDate,
      type,
    });

    // Save the QR code document to the database
    const savedQr = await newQr.save();
    console.log('QR code document saved:', savedQr);

    // Generate the URL for redirecting to the Next.js website with the QR ID
    const websiteURL = process.env.NEXT_PUBLIC_WEBSITE_URL;
    const qrRedirectURL = `${websiteURL}qr/attendance/${savedQr._id}`;

    // Generate the data for the QR code
    const qrData = {
      intakeGroup: intakeGroups,
      campus,
      attendanceDate,
      type,
      qrRedirectURL,
    };
    console.log('QR data:', qrData);

    // Generate the QR code image
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
    console.log('QR code data URL generated');

    // Upload the QR code image to Amazon S3
    const params = {
      Bucket: bucketName,
      Key: `${savedQr._id}.png`,
      Body: Buffer.from(qrCodeDataURL.split(',')[1], 'base64'),
      ContentType: 'image/png',
    };

    const s3Data = await s3.upload(params).promise();
    console.log('QR code image uploaded to S3:', s3Data);

    // Update the QR code document with the S3 URL of the QR code image
    savedQr.qrcode = s3Data.Location;
    await savedQr.save();
    console.log('QR code document updated with S3 URL');

    // Find all students for the given intake group and campus
    for (const intakeGroupId of intakeGroups) {
      const students = await Student.find({
        intakeGroup: intakeGroupId,
        campus: { $in: [campus] },
      }).select('_id');
      console.log('Fetched students for intake group', intakeGroupId, ':', students);

      // Check if any students were found
      if (students.length === 0) {
        console.log(`No students found for intake group ${intakeGroupId} and campus ${campus}.`);
        continue;
      }

      // Prepare attendance data
      const attendanceData = students.map(student => ({
        student: student._id,
        status: 'A', // Mark all as absent initially
      }));
      console.log('Prepared attendance data:', attendanceData);

      // Update or create attendance record for the given date
      let attendanceRecord = await Attendance.findOne({
        intakeGroup: intakeGroupId,
        campus: campus,
        attendanceDate: attendanceDate,
      });

      if (!attendanceRecord) {
        // Create a new attendance record if one does not exist
        attendanceRecord = new Attendance({
          intakeGroup: intakeGroupId,
          campus,
          attendanceDate,
          type,
          attendees: [],
        });
        console.log(`Creating new attendance record for date: ${attendanceDate} and intake group: ${intakeGroupId}`);
      } else {
        console.log(`Updating existing attendance record for date: ${attendanceDate} and intake group: ${intakeGroupId}`);
      }

      // Update attendees
      attendanceData.forEach(att => {
        const existingAttendee = attendanceRecord.attendees.find(a => a.student.toString() === att.student.toString());
        if (existingAttendee) {
          // Update existing attendee status
          existingAttendee.status = att.status;
          console.log(`Updating status for student: ${att.student} in intake group: ${intakeGroupId}`);
        } else {
          // Add new attendee
          attendanceRecord.attendees.push(att);
          console.log(`Adding new attendee for student: ${att.student} in intake group: ${intakeGroupId}`);
        }
      });

      // Save the record
      await attendanceRecord.save();
      console.log(`Saved attendance record for date: ${attendanceDate} and intake group: ${intakeGroupId}`);
    }

    // Return the MongoDB ID of the newly created QR code
    res.status(201).json({ qrId: savedQr._id });
  } catch (error) {
    console.error('Error adding QR attendance:', error);
    res.status(500).json({ error: 'Error adding QR attendance' });
  }
};

const getAllQRCodes = async (req, res) => {
  try {
    const qrCodes = await Qr.find()
      .populate('intakeGroup', 'title')
      .lean();

    if (!qrCodes.length) {
      return res.status(404).json({ message: 'No QR codes found' });
    }

    const signedQrCodes = await Promise.all(
      qrCodes.map(async (qrCode) => {
        const campus = await Campus.findById(qrCode.campus).lean();
        const signedUrl = s3.getSignedUrl('getObject', {
          Bucket: bucketName,
          Key: `${qrCode._id}.png`,
          Expires: 60 * 60, // URL expiration time in seconds (1 hour in this example)
        });

        return {
          ...qrCode,
          campus: campus && campus.title ? campus.title : 'N/A',
          intakeGroup: qrCode.intakeGroup && qrCode.intakeGroup.length > 0 ? qrCode.intakeGroup.map(group => group.title) : [],
          signedQrCodeUrl: signedUrl,
          formattedAttendanceDate: qrCode.attendanceDate ? new Date(qrCode.attendanceDate).toLocaleDateString() : 'Invalid Date', // Format the attendance date as desired
        };
      })
    );

    res.status(200).json(signedQrCodes);
  } catch (error) {
    console.error('Error retrieving QR codes:', error);
    res.status(500).json({ error: 'Error retrieving QR codes' });
  }
};

const deleteQrById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the QR code document by ID
    const qrCode = await Qr.findById(id);
    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // Delete the QR code image from S3
    const params = {
      Bucket: bucketName,
      Key: `${id}.png`,
    };
    await s3.deleteObject(params).promise();

    // Delete the QR code document from MongoDB
    await Qr.findByIdAndDelete(id);

    res.status(200).json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({ error: 'Error deleting QR code' });
  }
};

const getQrById = async (req, res) => {
  try {
    const { id } = req.params;
    const qrCode = await Qr.findById(id).lean();
    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    const campus = await Campus.findById(qrCode.campus).lean();
    const intakeGroup = await IntakeGroup.find({ _id: { $in: qrCode.intakeGroup } }).lean();

    res.status(200).json({
      ...qrCode,
      campus: campus ? { id: campus._id, title: campus.title } : { id: 'N/A', title: 'N/A' },
      intakeGroup: intakeGroup.map(group => ({ id: group._id, title: group.title })),
    });
  } catch (error) {
    console.error('Error getting QR code by ID:', error);
    res.status(500).json({ error: 'Error getting QR code by ID' });
  }
};


const getAllAttendance = async (req, res) => {
  try {
    const allAttendance = await Attendance.find();
    res.status(200).json({ success: true, data: allAttendance });
  } catch (error) {
    console.error('Error getting all attendance:', error);
    res.status(500).json({ success: false, error: 'Error getting all attendance' });
  }
};

const getAttendanceByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate student ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch attendance records for the student
    const attendanceRecords = await Attendance.find({ 'attendees.student': studentId }).populate('attendees.student');

    // Format the response
    const formattedAttendance = attendanceRecords.map(record => ({
      date: moment(record.attendanceDate).format('YYYY-MM-DD'),
      type: record.type,
      status: record.attendees.find(att => att.student.equals(studentId)).status,
    }));

    res.status(200).json({ success: true, data: formattedAttendance });
  } catch (error) {
    console.error('Error fetching attendance by student ID:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getAttendanceByStudentIdAndMonth = async (req, res) => {
  try {
    const { studentId, month, year } = req.params;

    // Validate student ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Define the start and end dates of the month
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    // Fetch attendance records for the student within the specified month
    const attendanceRecords = await Attendance.find({
      'attendees.student': studentId,
      attendanceDate: { $gte: startDate, $lte: endDate },
    }).populate('attendees.student');

    // Format the response
    const formattedAttendance = attendanceRecords.map(record => ({
      date: moment(record.attendanceDate).format('YYYY-MM-DD'),
      type: record.type,
      status: record.attendees.find(att => att.student.equals(studentId)).status,
    }));

    res.status(200).json({ success: true, data: formattedAttendance });
  } catch (error) {
    console.error('Error fetching attendance by student ID and month:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
  addManualAttendance,
  addQRAttendance,
  getAllAttendance,
  bulkAddAttendance,
  getAllQRCodes,
  deleteQrById,
  getQrById,
  getAttendance,
  getAttendanceByStudentId,
  getAttendanceByStudentIdAndMonth,
};
