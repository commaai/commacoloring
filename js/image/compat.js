"use strict";

/** Compatibility API.
 *
 * Copyright 2015  Kota Yamaguchi
 */
define({
  // Internet Explorer doesn't support ImageData().
  createImageData: function createImageData(width, height) {
    var context = document.createElement("canvas").getContext("2d");
    return context.createImageData(width, height);
  }
});