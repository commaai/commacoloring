/** Image morphology operations and index image I/O.
 *
 * Copyright 2015  Kota Yamaguchi
 */
define([
  './compat',
  './morph/max-filter'
], function (compat, maxFilter) {
  function decodeIndexImage (imageData) {
    let indexImage = {
      width: imageData.width,
      height: imageData.height,
      data: new Int32Array(imageData.width * imageData.height)
    };
    let offset = null;

    for (let i = 0; i < imageData.data.length; ++i) {
      offset = 4 * i;
      indexImage.data[i] = (imageData.data[offset + 0]) |
                           (imageData.data[offset + 1] << 8) |
                           (imageData.data[offset + 2] << 16);
    }
    return indexImage;
  }

  function encodeIndexImage (indexImage) {
    let imageData = compat.createImageData(indexImage.width, indexImage.height);
    let offset = null;
    let value = null;

    for (let i = 0; i < indexImage.length; ++i) {
      offset = 4 * i,
      value = indexImage.data[i];

      imageData.data[offset] = 255 & value;
      imageData.data[offset + 1] = 255 & (value >>> 8);
      imageData.data[offset + 2] = 255 & (value >>> 16);
      imageData.data[offset + 3] = 255;
    }

    return imageData;
  }

  return {
    encodeIndexImage: encodeIndexImage,
    decodeIndexImage: decodeIndexImage,
    maxFilter: maxFilter
  };
});
