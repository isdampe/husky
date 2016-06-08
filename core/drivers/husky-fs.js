var huskyfs = function( husky ) {

  var fs;
  var hfs = this;

  /*
   * Parses a husky-fs URI
   * Input: /tmp/test.c@http://localhost:8001
   * Return: A request URL
   */
  hfs.parseUri = function( uri, action ) {

    var s, server, fp, http;

    if ( typeof action === 'undefined' ) {
      action = 'read';
    }

    s = uri.split("@");
    if ( s.length < 2 ) {
      husky.error("Invalid uri passed to hfs.parseUri. No server or file in string. (Missing @)");
      return false;
    }

    server = s[1], fp = s[0];

    http = server + '/fs/' + encodeURIComponent(fp) + '/' + action;

    return http;

  };

  hfs.readFile = function( uri, callback ) {

    //Get the URL.
    uri = hfs.parseUri( uri + '@' + husky.config.huskyfs.server, 'read' );
    if (! uri ) {
      callback(true,null);
      return false;
    }

    //Try to read the file.
    hfs.sendRequest(uri, function(err,res,req){
      if ( err || ! res.hasOwnProperty('buffer') ) {
        husky.error('Error reading file over HTTP stream via husky-fs.');
        callback(true,null);
        return false;
      }

      callback(null,res.buffer);

    }, husky.config.huskyfs.credentials);

  };

  hfs.writeFile = function( uri, buffer, callback ) {

    var post_uri, post_data;

    post_uri = husky.config.huskyfs.server + '/fs/write';
    if (! post_uri ) {
      callback(true,null);
      return false;
    }

    //Set post data.
    post_data = {
      uri: uri,
      buffer: buffer,
      user: husky.config.huskyfs.credentials.user,
      pass: husky.config.huskyfs.credentials.pass
    };

    hfs.sendRequest(post_uri,function(err,res,req){
      if (err) {
        husky.error("Could not write file over HTTP stream via husky-fs.");
      }
      callback(err,true);
    },post_data);

  };

  hfs.getListOfSuggestions = function( uri, callback ) {

    var base_uri = uri, path, file, search;

    if ( uri === "" ) {
      callback(true,null);
      return false;
    }

    path = base_uri.substring(0,base_uri.lastIndexOf("/")+1);
    if ( path.charAt(0) !== "/" ) {
      path = "/";
    }
    if ( path == "" ) {
      callback(true,null);
      return false;
    }

    uri = hfs.parseUri( path + '@' + husky.config.huskyfs.server, 'read' );
    if (! uri ) {
      callback(true,null);
      return false;
    }

    search = base_uri.substring(base_uri.lastIndexOf("/") +1);

    hfs.sendRequest(uri,function(err,res,req){
      if ( err || ! res.hasOwnProperty('fileList') ) {
        callback(true,null);
        return false;
      }

      var files;

      files = res.fileList;

      var i = 0, max = files.length || 0, results = [];
      if ( max < 1 ) {
        callback(true,null);
        return false;
      }

      for ( i; i<max; i++ ) {
        if ( files[i].name.match( search ) ) {

          var arr = {
            suggestion: path + files[i].name,
            match: hfs.similarity(files[i].name, search)
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

    }, husky.config.huskyfs.credentials);

  };

  hfs.similarity = function(s1, s2) {
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
    return (longerLength - hfs.editDistance(longer, shorter)) / parseFloat(longerLength);
  };

  hfs.editDistance = function(s1, s2) {
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

  hfs.setAuth = function( argv, argc, key ) {

    var cre, srv = false;

    if ( argc < 1 ) {
      return true;
    }

    cre = argv[0];
    if ( argc > 1 ) {
      srv = argv[1];
    }

    if ( cre !== "" ) {
      cre = cre.split(":");
      if ( cre.length < 2 ) {
        return true;
      }
      husky.config.huskyfs.credentials.user = cre[0];
      husky.config.huskyfs.credentials.pass = cre[1];
    }

    if ( srv !== false && srv !== "" ) {
      husky.config.huskyfs.server = srv;
    }

    return true;

  };

  //Executes upon registration from husky core callback.
  hfs.init = function() {

    //Turn myself on if there is no default driver.
    if ( husky.config.activeDriver.fs === null ) {
      husky.config.activeDriver.fs = 'huskyfs';
    }

    //Set default server.
    husky.config.huskyfs = {
      server: "http://localhost:8291",
      credentials: {
        user: "user",
        pass: "pass"
      }
    };

    //To do.
    //Add a command to set the server manually.
    husky.commands.push({
      name: "Authenticate",
      c: 'au username:password [http://server:80]',
      s: /(^au|^au\s.*)$/g,
      d: 'Set the basic auth for remote access',
      fn: hfs.setAuth
    });

  };

  /*
   * Thanks to quirksmode.org
   */
   hfs.sendRequest = function(url,callback,postData) {

   	var req = hfs.createXMLHTTPObject();
   	if (!req) return;
   	var method = (postData) ? "POST" : "GET";
   	req.open(method,url,true);
   	if (postData) {
   		req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
    }
   	req.onreadystatechange = function () {

      var jsonRes;

      if ( req.readyState !== 4 ) return;
      if ( req.status !== 200 && req.status !== 304 ) {
        callback(true,null,req);
        return;
      } else {
        try {
          jsonRes = JSON.parse(req.responseText);
        } catch(e) {
          husky.error("Invalid JSON response from server in husky-fs");
          callback(true,null,req);
          return;
        }
        callback(false,jsonRes,req);
      }
   	};
    if (req.readyState == 4) return;
   	req.send( hfs.serialize(postData) );
   }

   hfs.createXMLHTTPObject = function() {

     var XMLHttpFactories = [
     	function () {return new XMLHttpRequest()},
     	function () {return new ActiveXObject("Msxml2.XMLHTTP")},
     	function () {return new ActiveXObject("Msxml3.XMLHTTP")},
     	function () {return new ActiveXObject("Microsoft.XMLHTTP")}
     ];

   	var xmlhttp = false;
   	for (var i=0;i<XMLHttpFactories.length;i++) {
   		try {
   			xmlhttp = XMLHttpFactories[i]();
   		}
   		catch (e) {
   			continue;
   		}
   		break;
   	}
   	return xmlhttp;
   };

   hfs.serialize = function(obj, prefix) {
      var str = [];
      for(var p in obj) {
        if (obj.hasOwnProperty(p)) {
          var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
          str.push(typeof v == "object" ?
            serialize(v, k) :
            encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
      }
      return str.join("&");
    }

};

huskyCore.registerDriver('huskyfs', huskyfs);
