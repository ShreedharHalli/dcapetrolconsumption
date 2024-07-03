const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require("dotenv");
dotenv.config();


const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });
async function uploadFile(filePath, mimeType) {
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
