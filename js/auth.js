function p(x) {
  console.log(x);
}

var clientId = "45471411055-k3q2s5c53mm3ha6846mjrcjjpc5e2o64.apps.googleusercontent.com";
var clientSecret = "MPOvHjRoaYkVmLLlc4N_zF7k";

var scopes = "profile";

// fill this in
var userinfo = {}

function handleClientLoad() {
  // Load the API client and auth library
  gapi.load('client:auth2', initAuth);
}
function initAuth() {
  gapi.client.setApiKey(clientSecret);
  gapi.auth2.init({
    client_id: clientId,
    scope: scopes
  }).then(function () {
    auth2 = gapi.auth2.getAuthInstance();
    // Listen for sign-in state changes.
    auth2.isSignedIn.listen(updateSigninStatus);
    // Handle the initial sign-in state.
    updateSigninStatus(auth2.isSignedIn.get());
  });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    fillUserInfo();
  } else {
    auth2.signIn();
  }
}

function fillUserInfo() {
  var basicProfile = auth2.currentUser.get().getBasicProfile();
  userinfo = {"email": basicProfile.getEmail(), "id": basicProfile.getId()};
  console.log(userinfo);
}

