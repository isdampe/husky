var chromefs = function( husky ) {

  var cfs = this;

  //Executes upon registration from husky core callback.
  cfs.init = function() {

    //Are we running a chrome web app?
    var chromeWebApp = (typeof chrome.fileSystem !== 'undefined' ) ? true : false;

    if (! chromeWebApp ) {
      console.error("Not running inside a chrome web app. Deregistering chrome-fs.js");
      husky.deRegisterDriver('chromefs');
      delete cfs;
      return false;
    }

    //Turn myself on if there is no default driver.
    if ( husky.config.activeDriver.fs === null ) {
      husky.config.activeDriver.fs = 'chromefs';
    }

  };

  cfs.readFile = function( uri, callback ) {

    console.log("Trying to read " + uri);
    callback(null,"Hello world");

  };

};

huskyCore.registerDriver('chromefs', chromefs);
