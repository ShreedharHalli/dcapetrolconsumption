const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CommuteLog = require("../models/commuteLogs");

const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.redirect('/home');
            } else {
                console.log(decodedToken);
                next();
            }
        });
    } else {
        res.redirect('/home');
    }

}



// check current user
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.locals.user = null;
                next();
            } else {
                let user = await User.findById(decodedToken.id);
                res.locals.user = user;
                if (user.userRole === 'requester') {
                    let commuteLogsForRequester = await CommuteLog.find({ loggedInUser: decodedToken.id })
                    .sort({ timeStamp: -1 }) // Sort by timeStamp in descending order (latest first)
                    .limit(60); // Limit the result to 60 documents
                    
                    // Add URLs for the images
                    commuteLogsForRequester = commuteLogsForRequester.map(log => ({
                        ...log._doc,
                        openingReadingKMPhotoUrl: `/images/${log._id}/openingReadingKMPhoto`,
                        closingReadingKMPhotoUrl: `/images/${log._id}/closingReadingKMPhoto`,
                        selphiPhotoUrl: `/images/${log._id}/selphiPhoto`
                        }));
                        res.locals.commuteLogsForLoggedInUser = commuteLogsForRequester ? commuteLogsForRequester : []; // returning empty array if data is not availabe to the logged in user
                        next();
                } else if (user.userRole === 'approver') {
                    let allcommuteLogs = await CommuteLog.find({ decision: 'pending...' }).sort({ timeStamp: -1 }).limit(60);
                    
                    // add URLs for the images
                    allcommuteLogs = allcommuteLogs.map(log => ({
                        ...log._doc,
                        openingReadingKMPhotoUrl: `/images/${log._id}/openingReadingKMPhoto`,
                        closingReadingKMPhotoUrl: `/images/${log._id}/closingReadingKMPhoto`,
                        selphiPhotoUrl: `/images/${log._id}/selphiPhoto`
                        }));
                        res.locals.allcommuteLogs = allcommuteLogs;
                        next();
            }
            }
        });
    } else {
        res.locals.user = null;
        next();
    }
};



module.exports = { requireAuth, checkUser };