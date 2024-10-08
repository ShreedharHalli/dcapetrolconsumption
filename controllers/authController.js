const User = require("../models/User");
const CommuteLog = require("../models/commuteLogs");
const MoneyTransactions = require("../models/moneyTransactions");
const jwt = require("jsonwebtoken");
const path = require('path');
const express = require('express');
const fs = require('fs');
const { uploadFile } = require('../googledrive/googleDrive');
const mongoose = require('mongoose');
const multer = require('multer');
const { google } = require('googleapis');
const { promisify } = require('util');
const axios = require('axios');
const mv = promisify(require('mv'));
const machineWorkingHoursLogs = require("../models/machineWorkingHoursLogs");



// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { email: '', password: '' };

    // incorrect email
    if (err.message === 'incorrect email') {
        errors.email = 'That email is not registered';
    }

    // incorrect password
    if (err.message === 'incorrect password') {
        errors.password = 'XXXX password is incorrect';
    }

    // duplicate email error
    if (err.code === 11000) {
        errors.email = 'that email is already registered';
        return errors;
    }

    // validation errors
    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }

    return errors;

}

const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge
    });

}

module.exports.login_post = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id, email: user.email, userrole: user.userRole, username: user.fullname });
    } catch (error) {
        const errors = handleErrors(error);
        console.log(error.message);
        res.status(400).json({ errors });
    }
};


module.exports.logout_get = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/login');
}

module.exports.signup_post = async (req, res) => {
    const { fullname, email, password, userRole, assignedVehiclNo, ratePerKM } = req.body;
    try {
        const user = await User.create({ fullname, email, password, userRole, assignedVehiclNo, ratePerKM });
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    } catch (error) {
        // const errors = handleErrors(error);
        console.log(error.message);
        res.status(400).json({ error });
    }
};

module.exports.login_get = (req, res) => {
    res.render("login");
};

module.exports.approver_get = (req, res) => {
    res.render("approverpage");
};

module.exports.machineoperatorpage_get = (req, res) => {
    res.render("machineoperatorpage");
};

module.exports.serveImage_get = async (req, res) => {
    try {
        const { id, field } = req.params;
        const commuteLog = await CommuteLog.findById(id).select(field);

        if (!commuteLog || !commuteLog[field]) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.set('Content-Type', 'image/png'); // Set the appropriate content type
        res.send(commuteLog[field]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


module.exports.approvecommute_post = async (req, res) => {
    const { id, decisionBy } = req.body;
    // Check if id is provided in the request body
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        
        // Find the commute log by ID and update its decision field
        const commuteLog = await CommuteLog.findByIdAndUpdate(id, { decision: 'approved', decisionBy: decisionBy }, { new: true });
        // UPDATE USER DATA
        const user = await User.findById(commuteLog.loggedInUser);
        const newlastTotalRunningKM = commuteLog.runningKM + user.lastTotalRunningKM
        const availableBalAtRequester = user.presentlyAvailableAmount;
        const newAvailableBal = availableBalAtRequester - commuteLog.amount;
        const updateUserData = await User.findByIdAndUpdate(commuteLog.loggedInUser, { 
            lastTotalRunningKM: newlastTotalRunningKM,
            presentlyAvailableAmount: newAvailableBal
         });

        //  console.log(updateUserData)
        // Respond with a success message
        res.status(200).json({ message: 'Commute log approved successfully', commuteLog });
        const webhookURL = "https://script.google.com/macros/s/AKfycbx6-57Jt281tz79VMpXyG2nQdR5kEsZH9MECXeiU6Ua4DrFy0Hol6maNwH2Eryn1V37/exec"
        try {
          await axios.post(webhookURL, JSON.stringify(commuteLog));
        } catch (error) {
          console.log(error);
          console.log(error.message);
        }
    } catch (error) {
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};


module.exports.denycommute_post = async (req, res) => {
    const { id, decisionBy } = req.body;
    // Check if id is provided in the request body
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        
        // Find the commute log by ID and update its decision field
        const commuteLog = await CommuteLog.findByIdAndUpdate(id, { decision: 'denied', decisionBy: decisionBy }, { new: true });
        

        //  console.log(updateUserData)
        // Respond with a success message
        res.status(200).json({ message: 'Commute log denied successfully', commuteLog });
        
    } catch (error) {
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};





// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    console.log('Uploads directory does not exist. Creating one...');
    fs.mkdirSync(uploadDir, { recursive: true });
}




module.exports.createcommute_post = async (req, res) => {
    try {
        const { loggedInUserId, openingReadingKM } = req.body;
        // Fetch the logged-in user's name
        const user = await User.findOne({ _id: loggedInUserId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const loggedInUserName = user.fullname;
        const vehicle = user.assignedVehiclNo;
        const ratePerKM = parseFloat(user.ratePerKM);


        if (!req.files || !req.files.openingReadingKMPhoto) {
            return res.status(400).json({ error: 'All photos are required' });
        }

        const openingReadingKMPhoto = req.files.openingReadingKMPhoto;

        // Move files to uploads directory and get their paths and mimetypes
        const openingReadingKMPhotoData = await manageUploadedFile('create', openingReadingKMPhoto);

        // Example of uploading to a service like Google Drive (assuming `uploadFile` function exists)
        const openingReadingKMPhotoUpload = await uploadFile(openingReadingKMPhotoData.filePath, openingReadingKMPhotoData.mimetype);

        const commuteLog = new CommuteLog({
            loggedInUser: loggedInUserId,
            openingReadingKM,
            openingReadingKMPhoto: openingReadingKMPhotoUpload.webContentLink,
            loggedInUserName,
            vehicle,
            ratePerKM,
        });

        await commuteLog.save();
        await manageUploadedFile('delete', openingReadingKMPhoto);
        res.status(200).json({ message: 'Commute log created successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};


function manageUploadedFile(action, file) {
    return new Promise((resolve, reject) => {
        try {
            if (action === 'create') {
                const filePath = path.join(__dirname, '..', 'uploads', `${file.name}`);

                file.mv(filePath, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err); // Reject the promise on failure
                    } else {
                        resolve({ filePath, mimetype: file.mimetype }); // Resolve the promise with the file path and mimetype on success
                    }
                });
            } else if (action === 'delete') {
                const filePath = path.join(__dirname, '..', 'uploads', `${file.name}`);

                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err); // Reject the promise on failure
                    } else {
                        resolve(true); // Resolve the promise with true on success
                    }
                });
            } else {
                const errorMessage = 'Invalid action';
                console.error(errorMessage);
                reject(new Error(errorMessage)); // Reject the promise with an error for invalid action
            }
        } catch (error) {
            reject(error); // Reject the promise on any other unexpected error
        }
    });
}


module.exports.getuseravailablecommutedata_post = async (req, res) => {
    try {
        const docId = req.body.docId;
        const currCommuteLog = await CommuteLog.findOne({ _id: docId });
        if (currCommuteLog.selphiPhoto === '0' && currCommuteLog.closingReadingKM === 0) { // dont apply quotes at second zero
            res.status(200).json({ result: 'openSefilModal', logData: currCommuteLog });
        } else if (currCommuteLog.selphiPhoto !== '0' && currCommuteLog.closingReadingKM === 0) {
            res.status(200).json({ result: 'openClosingModal', logData: currCommuteLog });
        } else if (currCommuteLog.selphiPhoto !== '0' && currCommuteLog.closingReadingKM !== 0) {
            res.status(200).json({ result: 'showFullEditForm', logData: currCommuteLog });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
};



module.exports.uploadselfitothecurrdoc_post = async (req, res) => {
    try {
        const { currDocId, siteName } = req.body;
        if (!req.files || !req.files.selphiPhoto) {
            return res.status(400).json({ error: 'All photos are required' });
        }


        const currCommuteLog = await CommuteLog.findOne({ _id: currDocId });
        if (!currCommuteLog) {
            return res.status(404).json({ error: 'Commute log not found' });
        }

        const uploadedSelphiPhoto = req.files.selphiPhoto;
        // Move files to uploads directory and get their paths and mimetypes
        const uploadedSelphiPhotoData = await manageUploadedFile('create', uploadedSelphiPhoto);
        // Example of uploading to a service like Google Drive (assuming `uploadFile` function exists)
        const webLink = await uploadFile(uploadedSelphiPhotoData.filePath, uploadedSelphiPhotoData.mimetype);
        const result = await CommuteLog.updateOne({ _id: currDocId }, {
            $set: {
                selphiPhoto: webLink.webContentLink,
                siteName: siteName
            }
        });
        res.status(200).json({ message: 'Selfie uploaded successfully' });
        await manageUploadedFile('delete', uploadedSelphiPhoto);
    } catch (error) {
        console.log(error.message, 'line no 270');
        res.status(500).json({ error: error.message });
    }
}


module.exports.addclosingdatatocurrdoc_post = async (req, res) => {
    try {
        const { currDocId, closingReadingVal } = req.body;

        if (!req.files || !req.files.closingReadingPhoto) {
            return res.status(400).json({ error: 'All photos are required' });
        }

        const uploadclosingReadingPhoto = req.files.closingReadingPhoto;

        const localClosingPhoto = await manageUploadedFile('create', uploadclosingReadingPhoto);
        const webLink = await uploadFile(localClosingPhoto.filePath, localClosingPhoto.mimetype);
        const currCommuteLog = await CommuteLog.findOne({ _id: currDocId });
        if (!currCommuteLog) {
            return res.status(404).json({ error: 'Commute log not found' });
        }
        const openingReading = currCommuteLog.openingReadingKM;
        const lenghtOfOpeningReading = openingReading.toString().length;
        const lenghtOfClosingReading = closingReadingVal.toString().length;
        const openingReadingKMVal = parseInt(currCommuteLog.openingReadingKM);
            if (parseInt(closingReadingVal) > openingReadingKMVal) {
                const totatRunningKM = closingReadingVal - openingReadingKMVal;
                const result = await CommuteLog.updateOne({ _id: currDocId }, {
                    $set: {
                        closingReadingKM: closingReadingVal,
                        closingReadingKMPhoto: webLink.webContentLink,
                        runningKM: parseFloat(totatRunningKM).toFixed(2),
                        amount: parseFloat(totatRunningKM * currCommuteLog.ratePerKM).toFixed(2),
                        decision: 'Pending At Approver'
                    }
                });
                res.status(200).json({ message: 'Closing Data Uploaded Successfully' });
                await manageUploadedFile('delete', uploadclosingReadingPhoto);
            } else {
                res.status(400).json({ message: 'Closing Reading KM should be greater than Opening Reading KM' });
            }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};


module.exports.getrequestersavailablemoney_get = async (req, res) => {
    // GET ALL THE USER DETAILS
    try {
        const allUser = await User.find({ userRole : 'requester'});
        res.status(200).json({ allUser });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};



module.exports.addmoneytorequestersac_post = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { moneyIssuedUsersOnly } = req.body;

        const bulkOps = moneyIssuedUsersOnly.map((item) => ({
            updateOne: {
                filter: { _id: item.userId },
                update: {
                    $inc: { presentlyAvailableAmount: parseInt(item.amountGiven) },
                    $set: { amountGivenDt: new Date(item.amountGivenDt) }
                }
            }
        }));

        const result = await User.bulkWrite(bulkOps, { session });

        const moneyTransactionDocs = moneyIssuedUsersOnly.map((item) => ({
            userDocId: item.userId,
            amountGiven: parseInt(item.amountGiven),
            amountGivenDt: item.amountGivenDt,
            paymentMode: item.paymentMode
        }));

        await MoneyTransactions.insertMany(moneyTransactionDocs, { session });

        // Call the webhook for each entry
        for (const item of moneyIssuedUsersOnly) {
            try {
                await axios.post('https://script.google.com/macros/s/AKfycbzIP493on-5ooxNavQWhzpWbgOJn_xtWm_py5ODao9xelNvBkhI8-sbZj5zJQWJZf0B/exec',
                    {
                        userId: item.userId,
                        amountGiven: parseInt(item.amountGiven),
                        amountGivenDt: item.amountGivenDt,
                        paymentMode: item.paymentMode 
                    });
                
            } catch (error) {
                console.log(error);
            }
            
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Users updated and transactions recorded successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};





module.exports.createnewmachineoperator_post = async (req, res) => {
    const { operatorFullName, operatorEmail, operatorEmailPassword } = req.body;
    const userRole = 'Machine Operator';
    const fullname = operatorFullName;
    const email = operatorEmail;
    const password = operatorEmailPassword;
    try {
        const user = await User.create({ fullname, email, password, userRole });
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    } catch (error) {
        // const errors = handleErrors(error);
        console.log(error.message);
        res.status(400).json({ error });
    }
};



module.exports.createnewworkinghrstransaction_post = async (req, res) => {
    try {
        const { loggedInUserId, workingHoursMachineId, workingHoursOpeningReadingKM, createNewWorkingHrsTransactionSiteName } = req.body;

        // Fetch the logged-in user's name
        const user = await User.findOne({ _id: loggedInUserId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const loggedInUserName = user.fullname;

        if (!req.files || !req.files.workingHoursOpeningReadingKMPhoto) {
            return res.status(400).json({ error: 'All photos are required' });
        }

        // Convert to number and round to 2 decimal places
        const numberedworkingHoursOpeningReadingKM = parseFloat(Number(workingHoursOpeningReadingKM).toFixed(2));

        const workingHoursOpeningReadingKMPhoto = req.files.workingHoursOpeningReadingKMPhoto;
        const workingHoursOpeningReadingKMPhotoData = await manageUploadedFile('create', workingHoursOpeningReadingKMPhoto);
        const workingHoursOpeningReadingKMPhotoDataUpload = await uploadFile(workingHoursOpeningReadingKMPhotoData.filePath, workingHoursOpeningReadingKMPhotoData.mimetype);

        const updatedMachineWorkingHoursLogs = new machineWorkingHoursLogs({
            loggedInUserId,
            loggedInUserName,
            workingHoursMachineId,
            workingHoursOpeningReadingKM: numberedworkingHoursOpeningReadingKM,
            workingHoursOpeningReadingKMPhoto: workingHoursOpeningReadingKMPhotoDataUpload.webContentLink,
            createNewWorkingHrsTransactionSiteName,
            siteName: createNewWorkingHrsTransactionSiteName
        });
        await updatedMachineWorkingHoursLogs.save();
        res.status(200).json({ message: 'Working Hours created successfully' });
        await manageUploadedFile('delete', workingHoursOpeningReadingKMPhoto);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};


module.exports.addclosingdatatocurrdocworkinghourslogs_post = async (req, res) => {
    try {
        const { currDocId, workingHoursclosingReadingKM } = req.body;
        if (!req.files || !req.files.workingHoursclosingReadingPhoto) {
            return res.status(400).json({ error: 'All photos are required' });
        }
        const uploadclosingReadingPhoto = req.files.workingHoursclosingReadingPhoto;
        const localClosingPhoto = await manageUploadedFile('create', uploadclosingReadingPhoto);
        const webLink = await uploadFile(localClosingPhoto.filePath, localClosingPhoto.mimetype);
        const currmachineWorkingHoursLogs = await machineWorkingHoursLogs.findOne({ _id: currDocId });
        if (!currmachineWorkingHoursLogs) {
            return res.status(404).json({ error: 'Log not found' });
        }

        const openingReadingKMVal = Number(currmachineWorkingHoursLogs.workingHoursOpeningReadingKM);
        const closingReadingKMVal = Number(workingHoursclosingReadingKM);

        
            // Use a more precise calculation method
            const totalRunningKM = parseFloat((closingReadingKMVal - openingReadingKMVal).toFixed(2));
            const runningKM = totalRunningKM;
            
            const result = await machineWorkingHoursLogs.updateOne({ _id: currDocId }, {
                $set: {
                    workingHoursclosingReadingKM: closingReadingKMVal,
                    workingHoursclosingReadingPhoto: webLink.webContentLink,
                    runningKM: runningKM,
                    decision: 'Pending At Approver'
                }
            });
            res.status(200).json({ message: 'Closing Data Uploaded Successfully' });
            await manageUploadedFile('delete', uploadclosingReadingPhoto);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};




module.exports.approveworkinghrs_post = async (req, res) => {
    const { id, decisionBy } = req.body;
    // Check if id is provided in the request body
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        
        // Find the commute log by ID and update its decision field
        const updatedMachineWorkingHoursLogs = await machineWorkingHoursLogs.findByIdAndUpdate(id, { decision: 'approved', decisionBy: decisionBy }, { new: true });
        res.status(200).json({ message: 'working hrs approved successfully', updatedMachineWorkingHoursLogs });
        const updatedOne = await machineWorkingHoursLogs.findOne({ _id: id });
        const webhookURL = "https://script.google.com/macros/s/AKfycbweo82b9oJyQMsOlOZD8j7tVvIDqWdx0x6zG0TXhxP_-iqlGWzJsEJ4ahqbtiytTRIm/exec"
            try {
            await axios.post(webhookURL, JSON.stringify(updatedOne));
            } catch (error) {
            console.log(error);
            console.log(error.message);
            }
    } catch (error) {
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};




module.exports.denyworkinghrs_post = async (req, res) => {
    const { id } = req.body;
    // Check if id is provided in the request body
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        
        // Find the commute log by ID and update its decision field
        const updatedMachineWorkingHoursLogs = await machineWorkingHoursLogs.findByIdAndUpdate(id, { decision: 'denied', decisionBy: decisionBy }, { new: true });
        res.status(200).json({ message: 'working hrs denied successfully', updatedMachineWorkingHoursLogs });
        
    } catch (error) {
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};



// DUMP CUMMUTE LOGS
/* module.exports.dumpworkinghours_post = async (req, res) => {
    try {
        const machineWorkingHoursLogsData = await CommuteLog.find();
         machineWorkingHoursLogsData.forEach((item) => {
            const date = new Date(item.timeStamp);
            const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30, which is 5 hours and 30 minutes
            const istDate = new Date(date.getTime() + istOffset);
            // // Format the date as "YYYY-MM-DDTHH:MM:SS"
            const formattedDate = istDate.toISOString().replace('T', ' ').substring(0, 19);
            // format the date as "mm/dd/yyyy"
            const mmddyyyy = istDate.toLocaleDateString();
            const loggedInUser = item.loggedInUser;
            const openingReadingKM = item.openingReadingKM;
            const closingReadingKM = item.closingReadingKM;
            const siteName = item.siteName;
            const runningKM = item.runningKM;
            const ratePerKM = item.ratePerKM;
            const amount = item.amount;
            const decision = item.decision;
            const vehicle = item.vehicle;
            const timeStamp = item.timeStamp;
            const loggedInUserName = item.loggedInUserName;
            // const data = `${fullname},${userID}\n`;
            const data = `${mmddyyyy},${loggedInUser},${loggedInUserName},${openingReadingKM},${closingReadingKM},${siteName},${runningKM},${ratePerKM},${amount},${decision},${vehicle},${timeStamp}\n`;
            fs.appendFileSync('tripslogs.csv', data);
            
            
        });
    } catch (error) {
        console.log(error);
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
}; */


// DUMP MONEY ISSUE TRANSACTIONS
module.exports.dumpworkinghours_post = async (req, res) => {
    try {
        const machineWorkingHoursLogsData = await MoneyTransactions.find();
         machineWorkingHoursLogsData.forEach((item) => {
            const date = new Date(item.timeStamp);
            const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30, which is 5 hours and 30 minutes
            const istDate = new Date(date.getTime() + istOffset);
            // // Format the date as "YYYY-MM-DDTHH:MM:SS"
            const formattedDate = istDate.toISOString().replace('T', ' ').substring(0, 19);
            // format the date as "mm/dd/yyyy"
            const mmddyyyy = istDate.toLocaleDateString();
            const userDocId = item.userDocId;
            const amountGiven = item.amountGiven;
            const amountGivenDt = item.amountGivenDt;
            // convert amount given date from "dd-mm-yyyy" to "mm/dd/yyyy"
            const amountGivenDtFormatted = new Date(amountGivenDt).toLocaleDateString();
            const paymentMode = item.paymentMode;
            const timeStamp = item.timeStamp;
            // const data = `${fullname},${userID}\n`;
            const data = `${mmddyyyy},${userDocId},${amountGiven},${amountGivenDt},${amountGivenDtFormatted},${paymentMode},${timeStamp}\n`;
            fs.appendFileSync('moneytransactions.csv', data);
            
            
        });
    } catch (error) {
        console.log(error);
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};