const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CommuteLog = require("../models/commuteLogs");
const machineWorkingHoursLogs = require("../models/machineWorkingHoursLogs");

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

        if (user.userRole === 'requester') {
            res.locals.commuteLogsForLoggedInUser = updatedLogs;
        } else if (user.userRole === 'approver') {
            const queryOptions = {
                approver: { decision: 'Pending At Approver' }
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
            res.locals.allcommuteLogs = updatedLogs;


            // SHOW WORKING HOURS LOGS TO THE APPROVER
            const queryOptionsForWorkingHoursLogs = {
                approver: { decision: 'Pending At Approver' }
            };
            const logsQueryForWorkingHoursLogs = machineWorkingHoursLogs.find(queryOptionsForWorkingHoursLogs[user.userRole])
                .sort({ timeStamp: -1 })
                .limit(40)
                .lean();
                const logsForWorkingHoursLogs = await logsQueryForWorkingHoursLogs;
                const updatedLogsForWorkingHoursLogs = logsForWorkingHoursLogs.map(log => ({
                    ...log,
                    openingReadingKMPhotoUrl: log.workingHoursOpeningReadingKM,
                    closingReadingKMPhotoUrl: log.workingHoursOpeningReadingKMPhoto,
                }));
                res.locals.workingHoursLogsForApprover = updatedLogsForWorkingHoursLogs;
        } else if (user.userRole === 'Machine Operator') {
            const logsQuery = machineWorkingHoursLogs.find( { loggedInUserId : user._id })
                .sort({ timeStamp: -1 })
                .limit(40)
                .lean();
                const logs = await logsQuery;
                const updatedLogs = logs.map(log => ({
                    ...log,
                    openingReadingKMPhotoUrl: log.workingHoursOpeningReadingKM,
                    closingReadingKMPhotoUrl: log.workingHoursOpeningReadingKMPhoto,
                }));
                res.locals.workingHoursLogs = updatedLogs;
        }
 
        next();
    } catch (err) {
        console.error(err.message);
        res.locals.user = null;
        next();
    }
};


module.exports = { requireAuth, checkUser };