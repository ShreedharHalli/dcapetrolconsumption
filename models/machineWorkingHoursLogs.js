const mongoose = require('mongoose');


const machineWorkingHoursLogSchema = new mongoose.Schema({
   timeStamp: {
       type: Date,
       default: Date.now
   },
   loggedInUserId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'User',
       required: true
   },
   workingHoursOpeningReadingKM: {
       type: Number,
       required: true
   },
   workingHoursOpeningReadingKMPhoto: {
       type: String, // Store as String (path or URL to the photo)
       required: true
   },
   workingHoursclosingReadingKM: {
       type: Number,
       default: 0
   },
   workingHoursclosingReadingPhoto: {
       type: String, // Store as String (path or URL to the photo)
       default: 0
   },
   loggedInUserName: {
       type: String,
       required: true
   },
   workingHoursMachineId: {
       type: String,
       required: true
   },
   runningKM: {
       type: Number,
       default: 0
   }
});



const machineWorkingHoursLogs = mongoose.model('machineWorkingHoursLogs', machineWorkingHoursLogSchema);

module.exports = machineWorkingHoursLogs;
