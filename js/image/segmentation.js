"use strict";

/** Image segmentation factory.
 *
 *  var segm = segmentation.create(imageData);
 *  var segmentData = segm.result;  // imageData with numSegments.
 *
 *  segm.finer();
 *  segm.coarser();
 *
 * Copyright 2015  Kota Yamaguchi
 */
define(["./segmentation/pff", "./segmentation/slic", "./segmentation/slico", "./segmentation/watershed"], function (pff, slic, slico, watershed) {
  var methods = {
    pff: pff,
    slic: slic,
    slico: slico,
    watershed: watershed
  };

  methods.create = function (imageData) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    options.method = options.method || "slic";

    if (!methods[options.method]) {
      throw "Invalid method: " + options.method;
    }

    return new methods[options.method](imageData, options);
  };

  return methods;
});