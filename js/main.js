/* Main page dispatcher.
*/

data = {
  "labels": [
    "unlabelled, eraser",
    "sky",
    "drivable; road",
    "on road markings; lane",
    "undrivable; trees, curbs",
    "movable; cars, people",
    "signs, traffic lights",
    "my car"
  ],
  "imageURLs": [
    "data/driving/000.png",
    "data/driving/007.png",
    "data/driving/014.png"
  ]
};

requirejs(['app/index',
           'app/edit',
           'helper/colormap',
           'helper/util'],
function(indexPage, editPage, colormap, util) {
  var dataURL = "data/example.json",  // Change this to another dataset.
      params = util.getQueryParams();

  // Create a colormap for display. The following is an example.
  function createColormap(label, labels) {
    return (label) ?
      colormap.create("single", {
        size: labels.length,
        index: labels.indexOf(label)
      }) :
      [[255, 255, 255],
       [226, 196, 196],
       [64, 32, 32]].concat(colormap.create("hsv", {
        size: labels.length - 3
      }));
  }

  // Load dataset before rendering a view.
  function renderPage(renderer) {
    data.colormap = createColormap(params.label, data.labels);
    renderer(data, params);
  }

  switch(params.view) {
    case "index":
      renderPage(indexPage);
      break;
    case "edit":
      renderPage(editPage);
      break;
    default:
      params.view = "index";
      window.location = util.makeQueryParams(params);
      break;
  }
});
