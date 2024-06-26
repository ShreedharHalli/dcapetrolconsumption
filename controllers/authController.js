const User = require("../models/User");
const CommuteLog = require("../models/commuteLogs");
const jwt = require("jsonwebtoken");



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
        res.status(200).json({ user: user._id, email: user.email, userrole: user.userRole, username:  user.fullname});
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
        res.status(201).json({user: user._id});
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


module.exports.createcommute_post = async (req, res) => {
    let { loggedInUserId, openingReadingKM, closingReadingKM, siteName } = req.body;
    
    // Fetch the logged-in user's name
    const user = await User.findOne({ _id: loggedInUserId });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const loggedInUserName = user.fullname;
    const vehicle = user.assignedVehiclNo;
    const ratePerKM = parseFloat(user.ratePerKM);
    const runningKM = (parseFloat(closingReadingKM) - parseFloat(openingReadingKM)).toFixed(2);
    const amount = (runningKM * ratePerKM).toFixed(2);

    const openingReadingKMPhoto = req.files.openingReadingKMPhoto.data;
    const closingReadingKMPhoto = req.files.closingReadingKMPhoto.data;
    const selphiPhoto = req.files.selphiPhoto.data;

    try {
        const commuteLog = new CommuteLog({
            loggedInUser: loggedInUserId,
            openingReadingKM,
            openingReadingKMPhoto,
            closingReadingKM,
            closingReadingKMPhoto,
            selphiPhoto,
            siteName,
            loggedInUserName,
            vehicle,
            ratePerKM,
            runningKM,
            amount
        });
        
        await commuteLog.save();
        res.status(200).json({ message: 'Commute log created successfully' });
    } catch (error) {
        console.log(`this is the error ${error.message}`);
        res.status(400).json({ error: error.message });
    }
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
    const { id } = req.body;
    // Check if id is provided in the request body
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        // Find the commute log by ID and update its decision field
        const commuteLog = await CommuteLog.findByIdAndUpdate(id, { decision: 'approved' }, { new: true });

        // Check if the commute log was found and updated
        if (!commuteLog) {
            return res.status(404).json({ error: 'Commute log not found' });
        }

        // Respond with a success message
        res.status(200).json({ message: 'Commute log approved successfully', commuteLog });
    } catch (error) {
        // Handle errors and respond with an error message
        res.status(400).json({ error: error.message });
    }
};

