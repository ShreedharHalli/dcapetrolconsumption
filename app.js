const dotenv = require("dotenv");
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const fileUpload = require("express-fileupload");
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const { requireAuth, checkUser } = require('./middleware/authMiddleware');
const { Server } = require("socket.io");
const http = require("http");
// const User = require('./models/User');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = 8080
const server = http.createServer(app);
// const io = new Server(server);

// middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(fileUpload())// https://sebhastian.com/express-fileupload/

app.set('views', path.join(__dirname, 'views'));
// view engine
app.set('view engine', 'ejs');


mongoose.connect(process.env.MONGODBURI).then(e => {
    server.listen(PORT);
    console.log('Mongodb connected and server listening on port ' + PORT);
})
.catch(error => {
    console.log(error.message)
});


// Routes
app.get('*', checkUser);
app.get('/', (req, res) => res.render('login'));
app.get('/sysadminpage', requireAuth, (req, res) => res.render('sysadminpage'));
app.get('/consumerpage', requireAuth, (req, res) =>  res.render('consumerpage'));
app.get('/approverpage', requireAuth, (req, res) =>  res.render('approverpage'));
app.use(authRoutes);