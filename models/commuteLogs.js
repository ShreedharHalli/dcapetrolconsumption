 const mongoose = require('mongoose');


const commuteSchema = new mongoose.Schema({
    timeStamp: {
        type: Date,
        default: Date.now
    },
    loggedInUser: {
        type: String,
        required: true
    },
    openingReadingKM: {
        type: Number,
        required: true
    },
    openingReadingKMPhoto: {
        type: Buffer,
        required: true
    },
    closingReadingKM: {
        type: Number,
        required: true
    },
    closingReadingKMPhoto: {
        type: Buffer,
        required: true
    },
    selphiPhoto: {
        type: Buffer,
        required: true
    },
    siteName: {
        type: String,
        required: true
    },
    commuteReason: {
        type: String,
        required: true
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
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    decision: {
        type: String,
        required: true,
        default: 'pending...'
    },
    visitRemarks: {
        type: String,
        required: true
    }
});

// fire a function after doc saved to db
/* commuteSchema.post('save', function (doc, next) {
    console.log('new commute log was created & saved', doc);

    next();
}); */

const CommuteLog = mongoose.model('CommuteLog', commuteSchema);

module.exports = CommuteLog;
