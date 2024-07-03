const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require("dotenv");
dotenv.config();

const CLIENT_ID = '508049337234-jd43v43pptekjru8usto35mbvfk4vt1v.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:8080/oauth2callback';
const REFRESH_TOKEN = '1//0gDXiWeIE_JVGCgYIARAAGBASNwF-L9Irr7OF7Qu7Fil0IraA17ulNipnVFLmaGr0qp3vfPozPEZDg_w_8J8oxgY-keKj3a7kWi8';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });
async function uploadFile(filePath, mimeType) {
    console.log('Uploading file:', filePath);
    const fileMetadata = {
        name: path.basename(filePath),
        parents: ['1-uUFtfFIHefiqxeoReOk3qWzpxENblH5'], // Specify the folder ID here
    };
    const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
    });

    return response.data;
}
/* 

const scopes = [
    'https://www.googleapis.com/auth/drive.file',
];


const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get the refresh token
    scope: scopes,
});
// console.log(process.env.CLIENT_ID);
console.log('Authorize this app by visiting this url :', authUrl); */




module.exports = { uploadFile };
