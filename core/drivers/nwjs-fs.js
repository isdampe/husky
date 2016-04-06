var nwjs = function( husky ) {

  var fs;
  var nwg = this;


  //Executes upon registration from husky core callback.
  nwg.init = function() {

    var nwjsApp = ( typeof require !== 'undefined' ) ? true : false;

    if (! nwjsApp ) {
      console.error("Not running inside nw.js. Deregistering nwjs-fs.js");
      husky.deRegisterDriver('nwjsfs');
      delete nwg;
      return false;
    }

    //Turn myself on if there is no default driver.
    if ( husky.config.activeDriver.fs === null ) {
      husky.config.activeDriver.fs = 'nwjsfs';
    }

    fs = require('fs');

  };

  nwg.readFile = function( uri, callback ) {

    //Can we read file?
    fs.access(uri, fs.R_OK | fs.W_OK, function(err) {
      if ( err ) {
        console.error('Error accessing ' + uri + 'File doesnt exit or not permitted.');
        callback(true,null);
        return false;
      }

      fs.readFile(uri,{encoding: "utf8"},function(err,data){
        if ( err ) {
          console.error('Could not read ' + uri);
          callback(true,data);
          return false;
        }

        callback(null,data);
        return true;

      });

    });


  };

  nwg.writeFile = function( uri, buffer, callback ) {

    fs.writeFile( uri, buffer, {encding: "utf8"}, function(err){
      callback(err,true);
    });

  }

};

huskyCore.registerDriver('nwjsfs', nwjs);
