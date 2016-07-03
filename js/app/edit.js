/** Editor page renderer.
 */
define(['../image/layer',
        '../helper/segment-annotator',
        '../helper/util'],
function(Layer, Annotator, util) {
  // Create the main content block.
  function createMainDisplay(params, data, annotator) {
    var annotatorTopMenu = createImageTopMenu(params, data, annotator),
        sidebar = createSidebar(params, data, annotator);
    
    var sidebarContainer = $("#lhp")[0];
    sidebarContainer.appendChild(annotatorTopMenu);
    sidebarContainer.appendChild(sidebar);


    // set up right panel
    var annotatorContainer = $("#rhp")[0];
    annotatorContainer.appendChild(annotator.container);

    var container = $(".edit-main-container")[0];


    $(".img-submit").click(function() {
      var data = annotator.export();
      var name = annotator.imageName;
      $.post("/submit", { data: data, name: name }, 'json');  
      //console.log(data);
      //window.open(data);
    });

    
    return container;
  }

  // Create the menu above the editor.
  function createImageTopMenu(params, data, annotator) {
    var container = document.createElement("div"),
        zoomOutButton = document.createElement("div"),
        zoomInButton = document.createElement("div"),
        spacer1 = document.createElement("span"),
        finerButton = document.createElement("div"),
        boundaryButton = document.createElement("div"),
        coarserButton = document.createElement("div"),
        spacer2 = document.createElement("span"),
        alphaMinusButton = document.createElement("div"),
        imageButton = document.createElement("div"),
        alphaPlusButton = document.createElement("div");
    zoomOutButton.appendChild(document.createTextNode("-"));
    zoomOutButton.classList.add("edit-image-top-button");
    zoomOutButton.addEventListener("click", function () {
      annotator.zoomOut();
    });
    zoomInButton.appendChild(document.createTextNode("zoom +"));
    zoomInButton.classList.add("edit-image-top-button");
    zoomInButton.addEventListener("click", function () {
      annotator.zoomIn();
    });
    spacer1.className = "edit-image-top-spacer";
    boundaryButton.id = "boundary-button";
    boundaryButton.className = "edit-image-top-button";
    boundaryButton.appendChild(document.createTextNode("boundary"));
    boundaryButton.addEventListener("click", function () {
      if (boundaryFlashTimeoutID)
        window.clearTimeout(boundaryFlashTimeoutID);
      if (boundaryButton.classList.contains("edit-image-top-button-enabled"))
        annotator.hide("boundary");
      else
        annotator.show("boundary");
      boundaryButton.classList.toggle("edit-image-top-button-enabled");
    });
    finerButton.appendChild(document.createTextNode("-"));
    finerButton.className = "edit-image-top-button";
    finerButton.addEventListener("click", function () {
      annotator.finer();
      boundaryFlash();
    });
    coarserButton.appendChild(document.createTextNode("+"));
    coarserButton.className = "edit-image-top-button";
    coarserButton.addEventListener("click", function () {
      annotator.coarser();
      boundaryFlash();
    });
    spacer2.className = "edit-image-top-spacer";
    alphaMinusButton.className = "edit-image-top-button";
    alphaMinusButton.appendChild(document.createTextNode("-"));
    alphaMinusButton.addEventListener("click", function () {
      annotator.moreAlpha();
    });
    imageButton.className = "edit-image-top-button " +
                            "edit-image-top-button-enabled";
    imageButton.appendChild(document.createTextNode("image"));
    imageButton.addEventListener("click", function () {
      if (imageButton.classList.contains("edit-image-top-button-enabled"))
        annotator.hide("image");
      else
        annotator.show("image");
      imageButton.classList.toggle("edit-image-top-button-enabled");
    });
    alphaPlusButton.className = "edit-image-top-button";
    alphaPlusButton.appendChild(document.createTextNode("+"));
    alphaPlusButton.addEventListener("click", function () {
      annotator.lessAlpha();
    });
    //
    container.className = "edit-image-top-menu";
    //container.appendChild(zoomOutButton);
    //container.appendChild(zoomInButton);
    //container.appendChild(spacer1);
    container.appendChild(finerButton);
    container.appendChild(boundaryButton);
    container.appendChild(coarserButton);
    container.appendChild(spacer2);
    container.appendChild(alphaMinusButton);
    container.appendChild(imageButton);
    container.appendChild(alphaPlusButton);
    return container;
  }

  // Set up the automatic flash of boundary.
  var boundaryFlashTimeoutID = null;
  function boundaryFlash() {
    var boundaryButton = document.getElementById("boundary-button");
    if (boundaryFlashTimeoutID) {
      window.clearTimeout(boundaryFlashTimeoutID);
      boundaryFlashTimeoutID = window.setTimeout(function() {
        boundaryButton.click();
        boundaryFlashTimeoutID = null;
      }, 1000);
    }
    else if (!boundaryButton.classList.contains(
             "edit-image-top-button-enabled")) {
      boundaryButton.click();
      boundaryFlashTimeoutID = window.setTimeout(function() {
        boundaryButton.click();
        boundaryFlashTimeoutID = null;
      }, 1000);
    }
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
    colorBox.style.backgroundColor =
        "rgb(" + data.colormap[index].join(",") + ")";
    labelText.appendChild(document.createTextNode(value));
    labelText.className = "edit-sidebar-legend-label";
    pickButton.appendChild(colorBox);
    pickButton.appendChild(labelText);
    pickButton.id = "label-" + index + "-button";
    pickButton.className = "edit-sidebar-button";
    pickButton.addEventListener("click", function () {
      var className = "edit-sidebar-button-selected";
      annotator.currentLabel = index;
      var selectedElements = document.getElementsByClassName(className);
      for (var i = 0; i < selectedElements.length; ++i)
        selectedElements[i].classList.remove(className);
      pickButton.classList.add(className);
    });
    pickButton.addEventListener('mouseenter', function () {
      if (!document.getElementsByClassName("edit-sidebar-popup-active").length)
        annotator.highlightLabel(index);
    });
    pickButton.addEventListener('mouseleave', function () {
      if (!document.getElementsByClassName("edit-sidebar-popup-active").length)
        annotator.unhighlightLabel();
    });
    return pickButton;
  }

  // Hightlight legend labels.
  function highlightLabel(label) {
    var highlightClass = "edit-sidebar-button-highlight",
        elements = document.getElementsByClassName(highlightClass);
    for (var i = 0; i < elements.length; ++i)
      elements[i].classList.remove(highlightClass);
    var pickButton = document.getElementById("label-" + label + "-button");
    if (pickButton)
      pickButton.classList.add(highlightClass);
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
      isOutsidePopup = isOutsidePopup &&
                       !target.classList.contains("edit-sidebar-popup");
      target = target.parentNode;
    }
    if (isOutsidePopup) {
      var popups = document.getElementsByClassName(
          "edit-sidebar-popup-active");
      if (popups.length)
        for (var i = 0; i < popups.length; ++i)
          popups[i].classList.remove("edit-sidebar-popup-active");
    }
  }

  // Create the relabel selector.
  function createRelabelSelector(data, index, annotator, popupContainer) {
    var select = document.createElement("select"),
        firstOption = document.createElement("option");
    firstOption.appendChild(document.createTextNode("Change to"));
    select.appendChild(firstOption);
    for (var i = 0; i < data.labels.length; ++i) {
      if (i !== index) {
        var option = document.createElement("option");
        option.value = i;
        option.appendChild(document.createTextNode(data.labels[i]));
        select.appendChild(option);
      }
    }
    select.addEventListener("change", function (event) {
      var sourceLabel = index;
      var targetLabel = parseInt(event.target.value, 10);
      if (sourceLabel !== targetLabel) {
        var currentLabel = annotator.currentLabel;
        annotator.currentLabel = targetLabel;
        annotator.fill(sourceLabel);
        annotator.currentLabel = currentLabel;
      }
      popupContainer.classList.remove("edit-sidebar-popup-active");
      firstOption.selected = true;
      event.preventDefault();
    });
    return select;
  }

  // Download trick.
  function downloadURI(uri, filename) {
    var anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.target = "_blank"; // Safari doesn't work.
    anchor.download = filename;
    anchor.href = uri;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  // Entry point.
  function render(data, params) {
    $.getJSON("/sample", function(json) {
      var annotator = new Annotator(json.data, {
            width: params.width,
            height: params.height,
            colormap: data.colormap,
            superpixelOptions: { method: "slic", regionSize: 25 },
            onload: function () {
              if (data.annotationURLs)
                annotator.import(data.annotationURLs[id]);
              annotator.hide("boundary");
              boundaryFlash();
            },
            onchange: function () {
              var activeLabels = this.getUniqueLabels(),
                  legendClass = "edit-sidebar-legend-label",
                  legendActiveClass = "edit-sidebar-legend-label-active",
                  elements = document.getElementsByClassName(legendClass),
                  i;
              for (i = 0; i < elements.length; ++i)
                elements[i].classList.remove(legendActiveClass);
              for (i = 0; i < activeLabels.length; ++i)
                elements[activeLabels[i]].classList.add(legendActiveClass);
            },
            onrightclick: function (label) {
              document.getElementById("label-" + label + "-button").click();
            },
            onmousemove: highlightLabel
          });
      annotator.imageName = json.name;
      document.body.appendChild(createMainDisplay(params, data, annotator));
    });
  }
  return render;
});


