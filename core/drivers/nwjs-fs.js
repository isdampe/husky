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

  };

  nwg.getListOfSuggestions = function( uri, callback ) {

    var path, file, search;

    if ( uri === "" ) {
      //Set default.
      path = process.cwd() + '/';
      search = "";
    } else {
      path = uri.substring(0,uri.lastIndexOf("/")+1);
      if ( path.charAt(0) !== "/" ) {
        path = process.cwd() + '/';
      }

      search = uri.substring(uri.lastIndexOf("/") +1);
    }

    if ( path == "" ) {
      callback(true,null);
      return false;
    }

    fs.readdir(path,function(err,files){

      if ( typeof files === "undefined" ) {
        callback(true,null);
        return false;
      }

      //Filter the results.
      if (! files.hasOwnProperty(length) ) {
        callback(true,null);
        return false;
      }
      var i = 0, max = files.length || 0, results = [];
      if ( max < 1 ) {
        callback(true,null);
        return false;
      }

      for ( i; i<max; i++ ) {
        if ( files[i].match( search ) ) {
          var arr = {
            suggestion: path + files[i],
            match: nwg.similarity(files[i], search)
          };
          results.push(arr);
        }
      }

      results.sort(function(a,b){
        if(a.match < b.match) return 1;
        if(a.match > b.match) return -1;
        return 0;
      });

      if ( results.length > 0 ) {
        callback(false,results);
      }

    });

  };

  nwg.similarity = function(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - nwg.editDistance(longer, shorter)) / parseFloat(longerLength);
  };

  nwg.editDistance = function(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

};

huskyCore.registerDriver('nwjsfs', nwjs);
