const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

// Initialize GridFS bucket
const initBucket = () => {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'XXXXXXX'
  });
  return bucket;
};

// Upload file to GridFS
const uploadFileToGridFS = async (file) => {
  const bucket = initBucket();
  const uploadStream = bucket.openUploadStream(file.filename, {
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', (fileInfo) => {
      resolve(fileInfo);
    });

    const readableStream = file.stream.pipe(uploadStream);
  });
};

// Download file from GridFS
const downloadFileFromGridFS = async (fileId) => {
  const bucket = initBucket();
  const downloadStream = bucket.openDownloadStreamByName(fileId);

  return new Promise((resolve, reject) => {
    const chunks = [];
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });

    downloadStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
  });
};

module.exports = {
  initBucket,
  uploadFileToGridFS,
  downloadFileFromGridFS
};
