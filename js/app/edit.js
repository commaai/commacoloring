'use strict';

/** Editor page renderer.
 */
define(['../image/layer', '../helper/segment-annotator'], function (Layer, Annotator) {
  // Create slider element.
  function createSlider(slider, options, callback, hotkeyCallback) {
    if (!slider) {
      return;
    }

    noUiSlider.create(slider, {
      start: [options.value || 1],
      step: options.step || 1,
      range: {
        min: [options.min || 0],
        max: [options.max || 10]
      }
    });

    if (callback && typeof callback === 'function') {
      slider.noUiSlider.on('update', function (values, handle) {
        callback(values[handle]);
      });
    }

    if (hotkeyCallback && typeof hotkeyCallback === 'function') {
      hotkeyCallback(slider.noUiSlider.set);
    }
  }

  // Automatic flash of boundary.
  function flashBoundaries(annotator) {
    if (annotator.isLayerShown('boundary') === true) {
      return;
    }

    annotator.show('boundary');

    window.setTimeout(function () {
      annotator.hide('boundary');
    }, 1000);
  }

  // Mousewheel event handler.
  function createMousewheelScrollEvent() {
    var onUpScroll = arguments.length <= 0 || arguments[0] === undefined ? function () {} : arguments[0];
    var onDownScroll = arguments.length <= 1 || arguments[1] === undefined ? function () {} : arguments[1];

    $(window).bind('DOMMouseScroll mousewheel', function (e) {
      if (e.originalEvent.detail > 0 || e.originalEvent.wheelDelta < 0) {
        onDownScroll();
      } else {
        onUpScroll();
      }

      // Prevent page fom scrolling.
      return false;
    });
  }

  // Creates sliders.
  function createSlidersFromElements(annotator) {
    var pixelSizeSlider = $('.pixel-size-slider')[0];
    var brightnessSlider = $('.brightness-slider')[0];
    var zoomSlider = $('.zoom-slider')[0];
    var brushSizeSlider = $('.brush-size-slider')[0];
    var lineWidthSlider = $('.line-width-slider')[0];

    var pixelSizeLabel = $('.pixel-size-label');
    var brightnessLabel = $('.brightness-label');

    var zoomValue = $('.zoom-value');
    var brightnessValue = $('.brightness-value');
    var pixelSizeValue = $('.pixel-size-value');
    var brushSizeValue = $('.brush-size-value');
    var lineWidthValue = $('.line-width-value');

    var temporaryElementHolder = null;

    // Pixel size slider configuration.
    var pixelSizeSliderConfig = {
      min: 11,
      max: 110,
      step: 11,
      value: 55, // default value
      behaviour: 'none'
    };

    // Brightness slider configuration.
    var brightnessSliderConfig = {
      min: 0,
      max: 100,
      step: 5,
      value: 50,
      behaviour: 'none'
    };

    // Zoom slider configuration.
    var zoomSliderConfig = {
      min: 1,
      max: 3,
      step: 0.1,
      value: 1
    };

    // Brush size configuration.
    var brushSizeSliderConfig = {
      min: 1,
      max: 50,
      step: 1,
      value: 25
    };

    // Line width configuration.
    var lineWidthSliderConfig = {
      min: 1,
      max: 50,
      step: 1,
      value: 3
    };

    // Value holders.
    var currentPixelSize = pixelSizeSliderConfig.value;
    var currentBrightnessValue = brightnessSliderConfig.value;
    var currentZoomValue = zoomSliderConfig.value;
    var currentBrushSizeValue = brushSizeSliderConfig.value;
    var currentLineWidthValue = lineWidthSliderConfig.value;

    // Create superpixel size slider.
    createSlider(pixelSizeSlider, pixelSizeSliderConfig, function (value) {
      value = Math.abs(value);

      if (value > currentPixelSize || value < currentPixelSize) {
        annotator.setPixelSize(value);
        flashBoundaries(annotator);
      }

      currentPixelSize = value;

      pixelSizeValue.text(value / pixelSizeSliderConfig.step);
    }, function (setValue) {
      Mousetrap.bind(['p +'], function () {
        if (currentPixelSize + pixelSizeSliderConfig.step <= pixelSizeSliderConfig.max) {
          setValue(currentPixelSize + pixelSizeSliderConfig.step);
        }
      });

      Mousetrap.bind(['p -'], function () {
        if (currentPixelSize - pixelSizeSliderConfig.step >= pixelSizeSliderConfig.min) {
          setValue(currentPixelSize - pixelSizeSliderConfig.step);
        }
      });
    });

    // Create brightness slider.
    createSlider(brightnessSlider, brightnessSliderConfig, function (value) {
      value = Math.abs(value);

      if (value > currentBrightnessValue || value < currentBrightnessValue) {
        annotator.setAlpha(value * 2.55);
      }

      currentBrightnessValue = value;

      brightnessValue.text(value + ' %');
    }, function (setValue) {
      Mousetrap.bind(['b +'], function () {
        if (currentBrightnessValue + brightnessSliderConfig.step <= brightnessSliderConfig.max) {
          setValue(currentBrightnessValue + brightnessSliderConfig.step);
        }
      });

      Mousetrap.bind(['b -'], function () {
        if (currentBrightnessValue - brightnessSliderConfig.step >= brightnessSliderConfig.min) {
          setValue(currentBrightnessValue - brightnessSliderConfig.step);
        }
      });
    });

    // Create zoom slider.
    createSlider(zoomSlider, zoomSliderConfig, function (value) {
      currentZoomValue = +value;

      zoomValue.text(value);
      annotator.zoom(value);
    }, function (setValue) {
      function increaseZoom() {
        setValue(currentZoomValue + zoomSliderConfig.step);
      }

      function decraseZoom() {
        setValue(currentZoomValue - zoomSliderConfig.step);
      }

      createMousewheelScrollEvent(increaseZoom, decraseZoom);

      Mousetrap.bind(['z +'], function () {
        increaseZoom();
      });

      Mousetrap.bind(['z -'], function () {
        decraseZoom();
      });
    });

    // Create brush size slider.
    createSlider(brushSizeSlider, brushSizeSliderConfig, function (value) {
      value = Math.abs(value);

      currentBrushSizeValue = value;

      annotator.setBrushSize(currentBrushSizeValue);
      brushSizeValue.text(currentBrushSizeValue);
    });

    // Create line width slider.
    createSlider(lineWidthSlider, lineWidthSliderConfig, function (value) {
      value = Math.abs(value);

      currentLineWidthValue = value;

      annotator.setLineWidth(currentLineWidthValue);
      lineWidthValue.text(currentLineWidthValue);
    });

    // Toggle pixel size.
    pixelSizeLabel.on('click', function () {
      temporaryElementHolder = $(this);

      if (temporaryElementHolder.hasClass('active')) {
        temporaryElementHolder.removeClass('active');
        annotator.hide('boundary');
      } else {
        temporaryElementHolder.addClass('active');
        annotator.show('boundary');
      }
    });

    // Toggle brightness.
    brightnessLabel.on('click', function () {
      temporaryElementHolder = $(this);

      if (temporaryElementHolder.hasClass('active')) {
        temporaryElementHolder.removeClass('active');
        annotator.hide('image');
      } else {
        temporaryElementHolder.addClass('active');
        annotator.show('image');
      }
    });

    // Hide currenlty unnececarry sliders.
    $('#brush-size').addClass('hide');
    $('#line-width').addClass('hide');
  }

  // Add percentage filled information.
  function addPercentageInformation(annotator) {
    var element = $('.edit-image-percent-done');
    var percentFilled = Math.round(annotator.getFilledPercent() * 100, 1);
    var text = percentFilled + '% done';

    element.text(text);
  }

  // Add hotkeys (non-slider related as those are added at slider functions).
  function addHotkeys(annotator) {
    Mousetrap.bind(['command+z', 'ctrl+z'], function () {
      annotator.undo();
    });

    Mousetrap.bind(['command+y', 'ctrl+y'], function () {
      annotator.redo();
    });
  }

  // Create toolset bar.
  function createToolSetbar(annotator) {
    var selectTool = function selectTool(tool) {
      $(tool).css({
        'background-color': '#c0c0c0',
        'border-width': '2px',
        'margin': '0'
      });
    };
    var deselectTool = function deselectTool(tool) {
      $(tool).css({
        'background-color': '#FFFFFF',
        'border-width': '1px',
        'margin': '1px'
      });
    };
    var tools = $('.tool');

    selectTool(tools.get(0));

    tools.on('click', function () {
      var tool = $(this);
      var toolName = tool.attr('data-tool');

      if (toolName !== undefined) {
        deselectTool(tools);
        selectTool(tool);
        annotator._setMode(toolName);
      }
    });
  }

  // Create the main content block.
  function createMainDisplay(params, data, annotator) {
    var sidebar = createSidebar(params, data, annotator);

    createSlidersFromElements(annotator);
    createToolSetbar(annotator);
    addPercentageInformation(annotator);
    addHotkeys(annotator);

    var sidebarContainer = $("#lhp")[0];
    sidebarContainer.appendChild(sidebar);

    // set up right panel
    var annotatorContainer = $("#rhp")[0];
    annotatorContainer.appendChild(annotator.container);

    var container = $(".edit-main-container")[0];

    if (Cookies.get("track") === undefined) {
      Cookies.set("track", Math.floor(Math.random() * 10000000));
    }

    function getCount() {
      var count = Cookies.get("count");
      if (count !== undefined) {
        try {
          count = parseInt(count);
        } catch (err) {
          count = 0;
        }
      } else {
        count = 0;
      }
      return count;
    }

    var count = getCount();
    $(".edit-image-count").html("you've submitted " + count.toString() + " image" + (count != 1 ? "s" : "") + "." + (count > 0 ? "<br/>keep up the good work!" : ""));
    if (count > 0) {
      $(".edit-image-count")[0].style.color = "#008000";
    }

    $(".img-submit").click(function () {
      var percent = annotator.getFilledPercent();

      if (percent < 0.10) {
        alert('Please color in the image before clicking submit!');
      } else {
        var _data = annotator.export();
        var name = annotator.imageName;

        $.post("/submit", {
          data: _data,
          name: name,
          track: Cookies.get('track'),
          email: user_email,
          gid: user_gid
        }, function () {
          var count = getCount();

          count += 1;
          Cookies.set('count', count.toString());
          location.reload();
        });
      }
    });

    return container;
  }

  // Create the sidebar.
  function createSidebar(params, data, annotator) {
    var container = document.createElement("div"),
        labelPicker = createLabelPicker(params, data, annotator);
    container.className = "edit-sidebar";
    container.appendChild(labelPicker);
    return container;
  }

  function createLabelButton(data, value, index, annotator) {
    var colorBox = document.createElement("span"),
        labelText = document.createElement("span"),
        pickButton = document.createElement("div");

    colorBox.className = "edit-sidebar-legend-colorbox";
    colorBox.style.backgroundColor = "rgb(" + data.colormap[index].join(",") + ")";

    labelText.appendChild(document.createTextNode(value));

    labelText.className = "edit-sidebar-legend-label";

    pickButton.appendChild(colorBox);
    pickButton.appendChild(labelText);
    pickButton.id = "label-" + index + "-button";
    pickButton.className = "edit-sidebar-button";

    pickButton.addEventListener("click", function () {
      var className = "edit-sidebar-button-selected";
      var selectedElements = document.getElementsByClassName(className);

      annotator.currentLabel = index;

      for (var i = 0; i < selectedElements.length; ++i) {
        selectedElements[i].classList.remove(className);
      }pickButton.classList.add(className);
    });

    pickButton.addEventListener('mouseenter', function () {
      if (!document.getElementsByClassName("edit-sidebar-popup-active").length) annotator.highlightLabel(index);
    });

    pickButton.addEventListener('mouseleave', function () {
      if (!document.getElementsByClassName("edit-sidebar-popup-active").length) annotator.unhighlightLabel();
    });

    return pickButton;
  }

  // Hightlight legend labels.
  function highlightLabel(label) {
    var highlightClass = "edit-sidebar-button-highlight",
        elements = document.getElementsByClassName(highlightClass);
    for (var i = 0; i < elements.length; ++i) {
      elements[i].classList.remove(highlightClass);
    }var pickButton = document.getElementById("label-" + label + "-button");
    if (pickButton) pickButton.classList.add(highlightClass);
  }

  // Create the label picker button.
  function createLabelPicker(params, data, annotator) {
    var container = document.createElement("div");
    container.className = "edit-sidebar-label-picker";
    for (var i = 0; i < data.labels.length; ++i) {
      var labelButton = createLabelButton(data, data.labels[i], i, annotator);
      if (i === 0) {
        annotator.currentLabel = 0;
        labelButton.classList.add("edit-sidebar-button-selected");
      }
      container.appendChild(labelButton);
    }
    window.addEventListener("click", cancelPopup, true);
    return container;
  }

  // Cancel popup.
  function cancelPopup(event) {
    var isOutsidePopup = true,
        target = event.target;
    while (target.parentNode) {
      isOutsidePopup = isOutsidePopup && !target.classList.contains("edit-sidebar-popup");
      target = target.parentNode;
    }
    if (isOutsidePopup) {
      var popups = document.getElementsByClassName("edit-sidebar-popup-active");
      if (popups.length) for (var i = 0; i < popups.length; ++i) {
        popups[i].classList.remove("edit-sidebar-popup-active");
      }
    }
  }

  // Entry point.
  function render(data, params) {
    var id = parseInt(params.id, 10);

    // Replace with /sample
    $.getJSON("http://cors.io/?u=https://commacoloring.herokuapp.com/sample", function (json) {
      var width = Math.abs($(window).width() - 350); // 350 - aside width
      var height = Math.abs($(window).height());

      if (width <= 960) {
        width = 960;
      }

      if (height <= 720) {
        height = 720;
      }

      var annotator = new Annotator(json.data, {
        width: width,
        height: height,
        colormap: data.colormap,
        superpixelOptions: {
          method: 'slic',
          regionSize: 25
        },

        onload: function onload() {
          if (data.annotationURLs) {
            annotator.import(data.annotationURLs[id]);
          }

          annotator.hide('boundary');
          flashBoundaries(annotator);
        },

        onchange: function onchange() {
          var activeLabels = this.getUniqueLabels();
          var legendClass = 'edit-sidebar-legend-label';
          var legendActiveClass = 'edit-sidebar-legend-label-active';
          var elements = document.getElementsByClassName(legendClass);
          var i = void 0;

          for (i = 0; i < elements.length; ++i) {
            elements[i].classList.remove(legendActiveClass);
          }

          for (i = 0; i < activeLabels.length; ++i) {
            elements[activeLabels[i]].classList.add(legendActiveClass);
          }

          addPercentageInformation(annotator);
        },

        onrightclick: function onrightclick(label) {
          document.getElementById('label-' + label + '-button').click();
        },

        onmousemove: highlightLabel
      });

      annotator.imageName = json.name;

      $(".suggest-button").click(function () {
        if (confirm('Caution, this will replace your work with a suggestion. Okay? If you just submit the suggestion, you will not get comma points.')) {
          $.getJSON("/suggestion/" + json.name, function (json2) {
            annotator.setFromURL(json2.data);
          });
        }
      });

      document.body.appendChild(createMainDisplay(params, data, annotator));
    });
  }

  return render;
});