const sharp = require('sharp');

const compressImage = async (imageBuffer, compressionLevel) => {
  const compressedImage = await sharp(imageBuffer)
    .jpeg({ quality: compressionLevel })
    .toBuffer();

  return compressedImage;
};

module.exports = compressImage;
