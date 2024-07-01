const fs = require('fs');
const path = require('path');
const { initBucket, uploadFileToGridFS, downloadFileFromGridFS } = require('../utils/gridFsUtils');

const testImagePath = path.join(__dirname, 'test-image.jpg');
const testImageBuffer = fs.readFileSync(testImagePath);

describe('GridFS Image Storage', () => {
  test('Save and retrieve an image from GridFS', async () => {
    const bucket = initBucket();
    const uploadedFileId = await uploadFileToGridFS(bucket, testImageBuffer);
    const downloadedImage = await downloadFileFromGridFS(bucket, uploadedFileId);

    expect(downloadedImage).toEqual(testImageBuffer);
  });

  test('Save and retrieve multiple images from GridFS', async () => {
    const bucket = initBucket();
    const image1Id = await uploadFileToGridFS(bucket, testImageBuffer);
    const image2Id = await uploadFileToGridFS(bucket, testImageBuffer);

    const downloadedImage1 = await downloadFileFromGridFS(bucket, image1Id);
    const downloadedImage2 = await downloadFileFromGridFS(bucket, image2Id);

    expect(downloadedImage1).toEqual(testImageBuffer);
    expect(downloadedImage2).toEqual(testImageBuffer);
  });

  test('Performance of saving and retrieving images using GridFS', async () => {
    const bucket = initBucket();
    const saveStartTime = performance.now();
    const uploadedFileId = await uploadFileToGridFS(bucket, testImageBuffer);
    const saveEndTime = performance.now();

    const retrieveStartTime = performance.now();
    const downloadedImage = await downloadFileFromGridFS(bucket, uploadedFileId);
    const retrieveEndTime = performance.now();

    const saveTime = saveEndTime - saveStartTime;
    const retrieveTime = retrieveEndTime - retrieveStartTime;

    console.log(`Save time: ${saveTime.toFixed(2)} ms`);
    console.log(`Retrieve time: ${retrieveTime.toFixed(2)} ms`);

    expect(saveTime).toBeLessThan(1000); // Adjust this value based on your performance expectations
    expect(retrieveTime).toBeLessThan(1000); // Adjust this value based on your performance expectations
  });
});
