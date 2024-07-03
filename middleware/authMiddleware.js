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


const checkUser = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            res.locals.user = null;
            return next();
        }

        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decodedToken.id).select('-password'); // Avoid fetching unnecessary fields

        res.locals.user = user;

        if (!user) {
            return next();
        }

        const queryOptions = {
            requester: { loggedInUser: decodedToken.id },
            approver: { decision: 'pending...' }
        };

        const logsQuery = CommuteLog.find(queryOptions[user.userRole])
            .sort({ timeStamp: -1 })
            .limit(40)
            .lean(); // Use lean() to improve query performance

        const logs = await logsQuery;

        const updatedLogs = logs.map(log => ({
            ...log,
            openingReadingKMPhotoUrl: log.openingReadingKMPhoto,
            closingReadingKMPhotoUrl: log.closingReadingKMPhoto,
            selphiPhotoUrl: log.selphiPhoto
        }));
        console.log(updatedLogs);

        if (user.userRole === 'requester') {
            res.locals.commuteLogsForLoggedInUser = updatedLogs;
        } else if (user.userRole === 'approver') {
            res.locals.allcommuteLogs = updatedLogs;
        }
 
        next();
    } catch (err) {
        console.error(err.message);
        res.locals.user = null;
        next();
    }
};


module.exports = { requireAuth, checkUser };