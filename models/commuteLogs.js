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
        required: true
    },
    closingReadingKMPhoto: {
        type: String, // Store as String (path or URL to the photo)
        required: true
    },
    selphiPhoto: {
        type: String, // Store as String (path or URL to the photo)
        required: true
    },
    siteName: {
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
    }
});

// fire a function after doc saved to db
/* commuteSchema.post('save', function (doc, next) {
    console.log('new commute log was created & saved', doc);

    next();
}); */


const CommuteLog = mongoose.model('CommuteLog', commuteSchema);

module.exports = CommuteLog;
