const fs = require('fs');
const path = require('path');
const compressImage = require('../utils/imageCompression');

const testImagePath = path.join(__dirname, 'test-image.jpg');
const testImageBuffer = fs.readFileSync(testImagePath);

describe('Image Compression', () => {
  test('Compress and decompress an image', async () => {
    const compressedImage = await compressImage(testImageBuffer, 80);
    const decompressedImage = await compressImage(compressedImage, 100);

    expect(decompressedImage).toEqual(testImageBuffer);
  });

  test('Compress an image with different compression levels', async () => {
    const lowQualityCompressedImage = await compressImage(testImageBuffer, 60);
    const highQualityCompressedImage = await compressImage(testImageBuffer, 90);

    expect(lowQualityCompressedImage.length).toBeLessThan(highQualityCompressedImage.length);
  });

  test('Performance of compression and decompression', async () => {
    const compressionStartTime = performance.now();
    const compressedImage = await compressImage(testImageBuffer, 80);
    const compressionEndTime = performance.now();

    const decompressionStartTime = performance.now();
    const decompressedImage = await compressImage(compressedImage, 100);
    const decompressionEndTime = performance.now();

    const compressionTime = compressionEndTime - compressionStartTime;
    const decompressionTime = decompressionEndTime - decompressionStartTime;

    console.log(`Compression time: ${compressionTime.toFixed(2)} ms`);
    console.log(`Decompression time: ${decompressionTime.toFixed(2)} ms`);

    expect(compressionTime).toBeLessThan(1000); // Adjust this value based on your performance expectations
    expect(decompressionTime).toBeLessThan(1000); // Adjust this value based on your performance expectations
  });
});
