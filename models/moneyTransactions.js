const mongoose = require('mongoose');


const moneyTransactionSchema = new mongoose.Schema({
   timeStamp: {
       type: Date,
       default: Date.now
   },
   userDocId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'User',
       required: true
   },
   amountGiven: {
       type: Number,
       required: true
   },
   amountGivenDt: {
       type: String, // Store as String (path or URL to the photo)
       required: true
   },
   paymentMode: {
    type: String, // Store as String (path or URL to the photo)
    required: true
},
});

// fire a function after doc saved to db
/* commuteSchema.post('save', function (doc, next) {
   console.log('new commute log was created & saved', doc);

   next();
}); */


const MoneyTransaction = mongoose.model('moneyTransaction', moneyTransactionSchema);

module.exports = MoneyTransaction;