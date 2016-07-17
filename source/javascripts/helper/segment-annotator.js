/**
 * Segment annotation widget.
 *
 * var annotator = new SegmentAnnotator("/path/to/image.jpg", {
 *   onload: function () {},
 *   onerror: function () {},
 *   onchange: function () {},
 *   onrightclick: function () {},
 *   onleftclick: function () {}
 * });
 * document.body.appendChild(annotator.container);
 *
 * Copyright 2015  Kota Yamaguchi
 */
define([
  '../image/layer',
  '../image/segmentation',
  '../image/morph'
], function (Layer, segmentation, morph) {
  function Annotator(imageURL, options = {}) {
    if (typeof imageURL !== "string") {
      throw "Invalid imageURL";
    }

    this.colormap = options.colormap || [[255, 255, 255], [255, 0, 0]];
    this.boundaryColor = options.boundaryColor || [255, 255, 255];
    this.boundaryAlpha = options.boundaryAlpha || 127;
    this.visualizationAlpha = options.visualizationAlpha || (Math.abs(255 / 2));
    this.highlightAlpha = options.highlightAlpha || Math.min(255, this.visualizationAlpha + 128);
    this.currentZoom = 1.0;
    this.defaultLabel = options.defaultLabel || 0;
    this.maxHistoryRecord = options.maxHistoryRecord || 10;
    this.onchange = options.onchange || null;
    this.onrightclick = options.onrightclick || null;
    this.onleftclick = options.onleftclick || null;
    this.onhighlight = options.onhighlight || null;
    this.onmousemove = options.onmousemove || null;

    this._createLayers(options);
    this._initializeHistory(options);
    this._createLayers(options);
    this._initializeHistory(options);

    this.mode = "superpixel";
    this.polygonPoints = [];
    this.linePoints = [];
    this.prevAnnotationImg = null;

    this.layers.image.load(imageURL, {
      width: options.width,
      height: options.height,
      onload: () => {
        this._initialize(options);
      },
      onerror: options.onerror
    });
  }

  Annotator.prototype.setFromURL = function(imageURL) {
    var canvas = document.createElement('canvas');

    // set canvas dimensions.
    canvas.width = this.layers.annotation.canvas.width;
    canvas.height = this.layers.annotation.canvas.height;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    var annotator = this;
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      var vd = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      var color_lookup = {};
      for (var i = 0;i < annotator.colormap.length; i++) {
        var color = _getEncodedLabel(annotator.colormap[i], 0);
        color_lookup[color] = i;
      }
      // black is nothing
      //p(color_lookup);
      p("loaded suggestion");
      var offsets = [], labels = [];
      for (y = 0; y < canvas.height; y++) {
        for (x = 0; x < canvas.width; x++) {
          var offset = (x + y*canvas.width)*4;
          var tc = _getEncodedLabel(vd, offset);
          var lbl = color_lookup[tc];
          if (lbl !== undefined) {
            offsets.push(offset);
            labels.push(lbl);
          }
        }
      }
      annotator._fillPixels(offsets, labels);
      annotator.layers.visualization.render();
      if (typeof annotator.onchange === "function")
        annotator.onchange.call(annotator);
    };
    img.src = imageURL;
  };

  // Run superpixel segmentation.
  Annotator.prototype.resetSuperpixels = function (options) {
    options = options || {};
    this.layers.superpixel.copy(this.layers.image);
    this.segmentation = segmentation.create(this.layers.image.imageData,
                                            options);
    this._updateSuperpixels(options);
    return this;
  };

  // Set specifig superpixel resolution.
  Annotator.prototype.setPixelSize = function (size, options) {
    this.segmentation.setPixelSize(size);
    this._updateSuperpixels(options);
    return this;
  };

  // Adjust the superpixel resolution.
  Annotator.prototype.finer = function (options) {
    this.segmentation.finer();
    this._updateSuperpixels(options);
    return this;
  };

  // Adjust the superpixel resolution.
  Annotator.prototype.coarser = function (options) {
    this.segmentation.coarser();
    this._updateSuperpixels(options);
    return this;
  };

  // Undo the edit.
  Annotator.prototype.undo = function () {
    if (this.currentHistoryRecord < 0)
      return false;
    var record = this.history[this.currentHistoryRecord--];
    this._fillPixels(record.pixels, record.prev);
    this.layers.visualization.render();
    if (typeof this.onchange === "function")
      this.onchange.call(this);
    return this.currentHistoryRecord < 0;
  };


  // Redo the edit.
  Annotator.prototype.redo = function () {
    if (this.currentHistoryRecord >= this.history.length - 1)
      return false;
    var record = this.history[++this.currentHistoryRecord];
    this._fillPixels(record.pixels, record.next);
    this.layers.visualization.render();
    if (typeof this.onchange === "function")
      this.onchange.call(this);
    return this.currentHistoryRecord >= this.history.length;
  };

  // Write the brush tool
  Annotator.prototype.brush = function (pos, label) {
    var offsets = [], labels = [];

    for (var y = -3; y <= 3; y++) {
      for (var x = -3; x <= 3; x++) {
        // it is circle bitches
        if ((x*x + y*y) > 9) {
          continue;
        }

        var offset = 4 * ((pos[1]+y) * this.layers.visualization.canvas.width + (pos[0]+x));

        offsets.push(offset);
        labels.push(label);
      }
    }

    this._fillPixels(offsets, labels);
    this.layers.visualization.render();

    if (typeof this.onchange === "function") {
      this.onchange.call(this);
    }
  };

  // Get unique labels in the current annotation.
  Annotator.prototype.getUniqueLabels = function () {
    var uniqueIndex = [],
        data = this.layers.annotation.imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      var label = _getEncodedLabel(data, i);
      if (uniqueIndex.indexOf(label) < 0) {
        uniqueIndex.push(label);
      }
    }
    return uniqueIndex.sort(function (a, b) { return a - b; });
  };

  // Fill all the pixels assigned the target label or all.
  Annotator.prototype.fill = function (targetLabel) {
    var pixels = [],
        annotationData = this.layers.annotation.imageData.data;
    for (var i = 0; i < annotationData.length; i += 4) {
      var label = _getEncodedLabel(annotationData, i);
      if (label === targetLabel || targetLabel === undefined)
        pixels.push(i);
    }
    if (pixels.length > 0)
      this._updateAnnotation(pixels, this.currentLabel);
    return this;
  };

  Annotator.prototype.setAlpha = function (alpha) {
    this.visualizationAlpha = Math.abs(Math.max(Math.min(alpha, 255), 0));
    this.layers.visualization.setAlpha(this.visualizationAlpha).render();
    return this;
  };

  Annotator.prototype.lessAlpha = function (scale) {
    return this.setAlpha(this.visualizationAlpha - (scale || 1) * 20);
  };

  Annotator.prototype.moreAlpha = function (scale) {
    return this.setAlpha(this.visualizationAlpha + (scale || 1) * 20);
  };

  // Import an existing annotation.
  Annotator.prototype.import = function (annotationURL, options) {
    options = options || {};
    var annotator = this;
    this.layers.annotation.load(annotationURL, {
      onload: function () {
        if (options.grayscale)
          this.gray2index();
        annotator.layers
                 .visualization
                 .copy(this)
                 .applyColormap(annotator.colormap)
                 .setAlpha(annotator.visualizationAlpha)
                 .render();
        this.setAlpha(0).render();
        this.history = [];
        this.currentHistoryRecord = -1;
        if (typeof options.onload === "function")
          options.onload.call(annotator);
        if (typeof annotator.onchange === "function")
          annotator.onchange.call(annotator);
      },
      onerror: options.onerror
    });
    return this;
  };

  // Export the annotation in data URL.
  Annotator.prototype.export = function () {
    this.layers.visualization.setAlpha(255);
    this.layers.visualization.render();
    var data = this.layers.visualization.canvas.toDataURL();
    this.layers.visualization.setAlpha(this.visualizationAlpha);
    this.layers.visualization.render();
    return data;
  };

  // Show if specified layer is shown or hidden.
  Annotator.prototype.isLayerShown = function (layer) {
    const displayValue = this.layers[layer].canvas.style.display;

    if (displayValue === 'inline-block' || displayValue === 'block') {
      return true;
    } else {
      return false;
    }
  }

  // Show a specified layer.
  Annotator.prototype.show = function (layer) {
    this.layers[layer].canvas.style.display = "inline-block";
    return this;
  };

  // Hide a specified layer.
  Annotator.prototype.hide = function (layer) {
    this.layers[layer].canvas.style.display = "none";
    return this;
  };

  Annotator.prototype.getFilledPercent = function () {
    var layer = this.layers.visualization;
    var data = layer.imageData.data;
    var tt = 0;
    var dd = 0;

    for (var i = 0; i < data.length; i+= 4) {
      var pxl = data[i] + data[i+1] + data[i+2];
      if (pxl != 255*3) tt += 1;
      dd += 1;
    }
    return tt*1.0/dd;
  }

  // Highlight a specified label.
  Annotator.prototype.highlightLabel = function (label) {
    var pixels = [],
        annotationData = this.layers.annotation.imageData.data;

    for (var i = 0; i < annotationData.length; i += 4) {
      var currentLabel = _getEncodedLabel(annotationData, i);
      if (currentLabel === label)
        pixels.push(i);
    }
    this._updateHighlight(pixels);
    return this;
  };

  // Disable highlight.
  Annotator.prototype.unhighlightLabel = function () {
    this._updateHighlight(null);
    return this;
  };

  // Zoom to specific resolution.
  Annotator.prototype.zoom = function (scale) {
    this.currentZoom = Math.max(Math.min(scale || 1.0, 10.0), 1.0);

    $(this.innerContainer).css({
      'transform': `scale(${this.currentZoom})`
    });

    return this;
  };

  Annotator.prototype.denoise = function () {
    var indexImage = morph.decodeIndexImage(this.layers.annotation.imageData),
        result = morph.maxFilter(indexImage);
    var pixels = new Int32Array(result.data.length);
    for (var i = 0; i < pixels.length; ++i)
      pixels[i] = 4 * i;
    this._updateAnnotation(pixels, result.data);
    return this;
  };

  // Private methods.

  Annotator.prototype._createLayers = function (options) {
    var onload = options.onload;
    delete options.onload;
    this.container = document.createElement("div");
    this.container.classList.add("segment-annotator-outer-container");

    this.innerContainer = document.createElement("div");
    this.innerContainer.classList.add("segment-annotator-inner-container");
    this.innerContainer.style.overflow = 'hidden';

    this.layers = {
      image: new Layer(options),
      superpixel: new Layer(options),
      visualization: new Layer(options),
      boundary: new Layer(options),
      annotation: new Layer(options)
    };
    options.onload = onload;
    for (var key in this.layers) {
      var canvas = this.layers[key].canvas;
      canvas.classList.add("segment-annotator-layer");
      this.innerContainer.appendChild(canvas);
    }
    this.container.appendChild(this.innerContainer);
    this._resizeLayers(options);
  };

  Annotator.prototype._resizeLayers = function (options) {
    this.width = options.width || this.layers.image.canvas.width;
    this.height = options.height || this.layers.image.canvas.height;

    for (var key in this.layers) {
      if (key !== "image") {
        var canvas = this.layers[key].canvas;
        canvas.width = this.width;
        canvas.height = this.height;
      }
    }

    this.innerContainer.style.width = this.width + "px";
    this.innerContainer.style.height = this.height + "px";
    this.container.style.width = this.width + "px";
    this.container.style.height = this.height + "px";
  };

  Annotator.prototype._initializeHistory = function (options) {
    this.history = [];
    this.currentHistoryRecord = -1;
  };

  Annotator.prototype._initialize = function (options = {}) {
    if (!options.width) {
      this._resizeLayers(options);
    }

    this._initializeAnnotationLayer();
    this._initializeVisualizationLayer();
    this._initializeEvents();

    this.resetSuperpixels(options.superpixelOptions);

    if (typeof options.onload === "function") {
      options.onload.call(this);
    }

    if (typeof this.onchange === "function") {
      this.onchange.call(this);
    }
  };

  Annotator.prototype._initializeEvents = function () {
    var canvas = this.layers.annotation.canvas,
        mousestate = { down: false, button: 0 },
        annotator = this;

    var isRightClickEraseModeActive = false;
    var previousLabel = 0;

    canvas.oncontextmenu = function() { return false; };

    function updateIfActive(event) {
      var offset = annotator._getClickOffset(event),
          superpixelData = annotator.layers.superpixel.imageData.data,
          annotationData = annotator.layers.annotation.imageData.data,
          superpixelIndex = _getEncodedLabel(superpixelData, offset),
          pixels = annotator.pixelIndex[superpixelIndex],
          existingLabel = _getEncodedLabel(annotationData, offset);

      if (annotator.mode === "superpixel") {
        annotator._updateHighlight(pixels);
      }

      if (typeof annotator.onmousemove === "function") {
        annotator.onmousemove.call(annotator, existingLabel);
      }

      if (mousestate.down) {
        if (mousestate.button === 2) {
          if (annotator.mode === "polygon") {
            annotator._emptyPolygonPoints(); //reset
          } else if (annotator.mode === 'superpixel') {
            isRightClickEraseModeActive = true;

            if (previousLabel !== annotator.currentLabel && annotator.currentLabel !== 0) {
              previousLabel = annotator.currentLabel;
            }

            existingLabel = 0;

            annotator._updateAnnotation(pixels, existingLabel);
          }

          if (typeof annotator.onrightclick === 'function') {
            annotator.onrightclick.call(annotator, existingLabel);
          }
        } else {
          if (annotator.mode === "brush" && event.button === 0) {
            annotator.brush(annotator._getClickPos(event), annotator.currentLabel);
          }

          if (annotator.mode === 'line' && event.button === 0) {
            annotator.line(event, annotator.currentLabel);
          }

          if (event.button === 0 && annotator.mode === "polygon") {
            annotator._addPolygonPoint(event);

            if (annotator._checkLineIntersection()) {
              annotator._addPolygonToAnnotation();
            }
          } else if (annotator.mode === "superpixel") {
            annotator._updateAnnotation(pixels, annotator.currentLabel);
          }

          if (typeof annotator.onleftclick === "function") {
            annotator.onleftclick.call(annotator, annotator.currentLabel);
          }
        }
      } else {
        if (isRightClickEraseModeActive) {
          isRightClickEraseModeActive = 0;
          existingLabel = previousLabel;

          annotator.currentLabel = existingLabel;
        }
      }
    }

    canvas.addEventListener('mousemove', updateIfActive);
    canvas.addEventListener('mouseup', updateIfActive);
    canvas.addEventListener('mouseleave', function () {
      annotator._updateHighlight(null);

      if (typeof annotator.onmousemove === "function") {
        annotator.onmousemove.call(annotator, null);
      }
    });

    canvas.addEventListener('mousedown', function (event) {
      mousestate.down = true;
      mousestate.button = event.button;
    });

    window.addEventListener('mouseup', function () {
      mousestate.down = false;
      mousestate.button = 0;
    });
  };

  Annotator.prototype._updateBoundaryLayer = function () {
    var boundaryLayer = this.layers.boundary;
    boundaryLayer.copy(this.layers.superpixel);
    boundaryLayer.computeEdgemap({
      foreground: this.boundaryColor.concat(this.boundaryAlpha),
      background: this.boundaryColor.concat(0)
    });
    boundaryLayer.render();
  };

  Annotator.prototype._initializeAnnotationLayer = function () {
    var layer = this.layers.annotation;
    layer.resize(this.width, this.height);
    this.currentLabel = this.defaultLabel;
    layer.fill([this.defaultLabel, 0, 0, 0]);
    layer.render();
  };

  Annotator.prototype._initializeVisualizationLayer = function () {
    var layer = this.layers.visualization;
    layer.resize(this.width, this.height);
    var initialColor = this.colormap[this.defaultLabel]
                           .concat([this.visualizationAlpha]);
    layer.fill(initialColor);
    layer.render();
  };

  Annotator.prototype._updateSuperpixels = function () {
    var annotator = this;
    this.layers.superpixel.process(function (imageData) {
      imageData.data.set(annotator.segmentation.result.data);
      annotator._createPixelIndex(annotator.segmentation.result.numSegments);
      annotator._updateBoundaryLayer();
      this.setAlpha(0).render();
    });
  };

  Annotator.prototype._createPixelIndex = function (numSegments) {
    var pixelIndex = new Array(numSegments),
        data = this.layers.superpixel.imageData.data,
        i;
    for (i = 0; i < numSegments; ++i)
      pixelIndex[i] = [];
    for (i = 0; i < data.length; i += 4) {
      var index = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
      pixelIndex[index].push(i);
    }
    this.currentPixels = null;
    this.pixelIndex = pixelIndex;
  };

  Annotator.prototype._getClickOffset = function (event) {
    var pos = this._getClickPos(event),
        x = pos[0],
        y = pos[1];
    return 4 * (y * this.layers.visualization.canvas.width + x);
  };

  Annotator.prototype._getClickPos = function (event) {
    return [event.offsetX, event.offsetY];
  };

  Annotator.prototype.line = function (event, label) {
    const annotator = this;
    const pos = this._getClickPos(event);
    const [ x, y ] = pos;
    const canvas = annotator.layers.annotation.canvas;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = 'rgba(0, 0, 0, 255)';
    ctx.lineWidth = 3;

    if (this.linePoints.length === 0) {
      ctx.save();
      annotator.prevAnnotationImg = ctx.getImageData(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(x, y);

      this.linePoints.push(pos);
    } else {
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.stroke();

      this.linePoints.push(pos);

      this._addLineToAnnotator();
    }
  };

  Annotator.prototype._addLineToAnnotator = function () {
    const annotator = this;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const lineColor = [255, 255, 255, 255]; // Black

    canvas.width = annotator.layers.annotation.canvas.width;
    canvas.height = annotator.layers.annotation.canvas.height;

    ctx.strokeStyle = `rgba(${lineColor[0]}, ${lineColor[1]}, ${lineColor[2]}, ${lineColor[3]})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(annotator.linePoints[0][0], annotator.linePoints[0][1]);
    ctx.lineTo(annotator.linePoints[1][0], annotator.linePoints[1][1]);
    ctx.closePath();
    ctx.stroke();

    const colorToCheck = lineColor;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let pixelsLine = [];

    for (let x = 0; x < canvas.width; ++x) {
      for (let y = 0; y < canvas.height; ++y) {
        let index = (x + y * imageData.width) * 4;

        if (data[index + 0] == colorToCheck[0] &&
            data[index + 1] == colorToCheck[1] &&
            data[index + 2] == colorToCheck[2] &&
            data[index + 3] == colorToCheck[3]) {
          pixelsLine.push(index);
        }
      }
    }

    annotator._updateAnnotation(pixelsLine, annotator.currentLabel);
    annotator._emptyLines();

    /*var w=window.open('about:blank','image from canvas');
    w.document.write("<img src='"+canvas.toDataURL("image/png")+"' alt='from canvas'/>");*/

    console.log(pixelsLine);
  };

  Annotator.prototype._emptyLines = function () {
    const annotator = this;
    const ctx = annotator.layers.annotation.canvas.getContext('2d');

    ctx.restore();

    if (annotator.prevAnnotationImg) {
      ctx.putImageData(annotator.prevAnnotationImg, 0, 0);
    }

    this.linePoints = [];
  };

  // polygon tool.
  Annotator.prototype._addPolygonPoint = function (event) {
    var annotator = this,
        pos = this._getClickPos(event),
        x = pos[0],
        y = pos[1];
    //get canvas.
    var canvas = annotator.layers.annotation.canvas;
    var ctx = canvas.getContext('2d');

    if (this.polygonPoints.length === 0) {
      ctx.save();
      annotator.prevAnnotationImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // draw.
    ctx.fillStyle = '#FA6900';
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    if (this.polygonPoints.length === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    this.polygonPoints.push(pos);
  };

  Annotator.prototype._emptyPolygonPoints = function () {
    var annotator = this,
        ctx = annotator.layers.annotation.canvas.getContext('2d');
    ctx.restore();
    if (annotator.prevAnnotationImg)
      ctx.putImageData(annotator.prevAnnotationImg,0,0);
    //reset polygon-points
    annotator.polygonPoints = [];
  };

  Annotator.prototype._addPolygonToAnnotation = function () {
    var annotator = this,
        canvas = document.createElement('canvas'),
        x, y;
    // set canvas dimensions.
    canvas.width = annotator.layers.annotation.canvas.width;
    canvas.height = annotator.layers.annotation.canvas.height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(0, 0, 255, 255)";
    ctx.beginPath();
    ctx.moveTo(annotator.polygonPoints[0][0],annotator.polygonPoints[0][1]);
    for (let i = 1; i < annotator.polygonPoints.length; ++i) {
      x = annotator.polygonPoints[i][0];
      y = annotator.polygonPoints[i][1];
      ctx.lineTo(x, y);
    }
    ctx.lineTo(annotator.polygonPoints[0][0], annotator.polygonPoints[0][1]);
    ctx.closePath();
    ctx.fill();
    //get pixels within polygon.
    var colorToCheck = [0, 0, 255, 255],
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
        data = imageData.data,
        pixelsPolygon = [];
    for (x = 0; x < canvas.width; ++x) {
      for (y = 0; y < canvas.height; ++y) {
        var index = (x + y * imageData.width) * 4;
        if (data[index + 0] == colorToCheck[0] &&
            data[index + 1] == colorToCheck[1] &&
            data[index + 2] == colorToCheck[2] &&
            data[index + 3] == colorToCheck[3]) {
          pixelsPolygon.push(index);
        }
      }
    }
    // update annotation.
    annotator._updateAnnotation(pixelsPolygon, annotator.currentLabel);
    annotator._emptyPolygonPoints();

    // cause you always click afterward
    window.setTimeout(function() { annotator._emptyPolygonPoints(); }, 50);
  };

  Annotator.prototype._checkLineIntersection = function () {
    if (this.polygonPoints.length < 4)
      return false;
    var newLineStartX = this.polygonPoints[this.polygonPoints.length - 2][0],
        newLineStartY = this.polygonPoints[this.polygonPoints.length - 2][1],
        newLineEndX = this.polygonPoints[this.polygonPoints.length - 1][0],
        newLineEndY = this.polygonPoints[this.polygonPoints.length - 1][1];

    for (let i = 1; i < this.polygonPoints.length - 2; ++i) {
      var line1StartX = this.polygonPoints[i - 1][0],
          line1StartY = this.polygonPoints[i - 1][1],
          line1EndX = this.polygonPoints[i][0],
          line1EndY = this.polygonPoints[i][1],
          denominator =
            ((newLineEndY - newLineStartY) * (line1EndX - line1StartX)) -
            ((newLineEndX - newLineStartX) * (line1EndY - line1StartY)),
          a = line1StartY - newLineStartY,
          b = line1StartX - newLineStartX,
          numerator1 = ((newLineEndX - newLineStartX) * a) -
                       ((newLineEndY - newLineStartY) * b),
          numerator2 = ((line1EndX - line1StartX) * a) -
                       ((line1EndY - line1StartY) * b);
      a = numerator1 / denominator;
      b = numerator2 / denominator;
      if (a > 0 && a < 1 && b > 0 && b < 1)
        return true;
    }
    return false;
  };

  Annotator.prototype._setMode = function (mode) {
    this.mode = mode;
  };

  Annotator.prototype._updateHighlight = function (pixels) {
    var visualizationData = this.layers.visualization.imageData.data,
        boundaryData = this.layers.boundary.imageData.data,
        annotationData = this.layers.annotation.imageData.data,
        i,
        color,
        offset;
    if (this.currentPixels !== null) {
      for (i = 0; i < this.currentPixels.length; ++i) {
        offset = this.currentPixels[i];
        color = this.colormap[_getEncodedLabel(annotationData, offset)];
        visualizationData[offset + 0] = color[0];
        visualizationData[offset + 1] = color[1];
        visualizationData[offset + 2] = color[2];
        visualizationData[offset + 3] = this.visualizationAlpha;
      }
    }
    this.currentPixels = pixels;
    if (this.currentPixels !== null) {
      for (i = 0; i < pixels.length; ++i) {
        offset = pixels[i];
        if (boundaryData[offset + 3]) {
          visualizationData[offset + 0] = this.boundaryColor[0];
          visualizationData[offset + 1] = this.boundaryColor[1];
          visualizationData[offset + 2] = this.boundaryColor[2];
          visualizationData[offset + 3] = this.highlightAlpha;
        }
        else {
          visualizationData[offset + 3] = this.highlightAlpha;
        }
      }
    }
    this.layers.visualization.render();
    this.layers.boundary.render();
    if (typeof this.onhighlight === "function")
      this.onhighlight.call(this);
  };

  Annotator.prototype._fillPixels = function (pixels, labels) {
    if (pixels.length !== labels.length)
      throw "Invalid fill: " + pixels.length + " !== " + labels.length;
    var annotationData = this.layers.annotation.imageData.data,
        visualizationData = this.layers.visualization.imageData.data;
    for (var i = 0; i < pixels.length; ++i) {
      var offset = pixels[i],
          label = labels[i],
          color = this.colormap[label];
      //p([offset, label, color]);
      _setEncodedLabel(annotationData, offset, label);
      visualizationData[offset + 0] = color[0];
      visualizationData[offset + 1] = color[1];
      visualizationData[offset + 2] = color[2];
    }
  };

  // Update label.
  Annotator.prototype._updateAnnotation = function (pixels, labels) {
    var updates;
    labels = (typeof labels === "object") ?
        labels : _fillArray(new Int32Array(pixels.length), labels);
    updates = this._getDifferentialUpdates(pixels, labels);
    if (updates.pixels.length === 0)
      return this;
    this._updateHistory(updates);
    this._fillPixels(updates.pixels, updates.next);
    this.layers.visualization.render();
    if (typeof this.onchange === "function")
      this.onchange.call(this);
    return this;
  };

  // Get the differential update of labels.
  Annotator.prototype._getDifferentialUpdates = function (pixels, labels) {
    if (pixels.length !== labels.length)
      throw "Invalid labels";
    var annotationData = this.layers.annotation.imageData.data,
        updates = { pixels: [], prev: [], next: [] };
    for (var i = 0; i < pixels.length; ++i) {
      var label = _getEncodedLabel(annotationData, pixels[i]);
      if (label !== labels[i]) {
        updates.pixels.push(pixels[i]);
        updates.prev.push(label);
        updates.next.push(labels[i]);
      }
    }
    return updates;
  };

  Annotator.prototype._updateHistory = function (updates) {
    this.history = this.history.slice(0, this.currentHistoryRecord + 1);
    this.history.push(updates);
    if (this.history.length > this.maxHistoryRecord)
      this.history = this.history.slice(1, this.history.length);
    else
      ++this.currentHistoryRecord;
  };

  function _fillArray(array, value) {
    for (var i = 0; i < array.length; ++i)
      array[i] = value;
    return array;
  }

  function _getEncodedLabel(array, offset) {
    return array[offset] |
           (array[offset + 1] << 8) |
           (array[offset + 2] << 16);
  }

  function _setEncodedLabel(array, offset, label) {
    array[offset + 0] = label & 255;
    array[offset + 1] = (label >>> 8) & 255;
    array[offset + 2] = (label >>> 16) & 255;
    array[offset + 3] = 255;
  }

  return Annotator;
});
