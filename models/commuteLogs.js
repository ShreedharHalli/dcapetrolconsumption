 const mongoose = require('mongoose');


 const commuteSchema = new mongoose.Schema({
    timeStamp: {
        type: Date,
        default: Date.now
    },
    loggedInUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    openingReadingKM: {
        type: Number,
        required: true
    },
    openingReadingKMPhoto: {
        type: String, // Store as String (path or URL to the photo)
        required: true
    },
    closingReadingKM: {
        type: Number,
        default: 0
    },
    closingReadingKMPhoto: {
        type: String, // Store as String (path or URL to the photo)
        default: 0
    },
    selphiPhoto: {
        type: String, // Store as String (path or URL to the photo)
        default: 0
    },
    siteName: {
        type: String,
        default: 0
    },
    loggedInUserName: {
        type: String,
        required: true
    },
    vehicle: {
        type: String,
        required: true
    },
    ratePerKM: {
        type: Number,
        required: true
    },
    runningKM: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    decision: {
        type: String,
        required: true,
        default: 'Pending At Requester'
    },
    decisionBy: {
        type: String,
        required: true,
        default: '-'
    }
});

// fire a function after doc saved to db
/* commuteSchema.post('save', function (doc, next) {
    console.log('new commute log was created & saved', doc);

    next();
}); */


const CommuteLog = mongoose.model('CommuteLog', commuteSchema);

module.exports = CommuteLog;
