var io = function( husky ) {

  var iom = this;

  iom.openFileToBuffer = function( argv, argc ) {

    var argvS = [];

    if ( argc < 1 ) {
      return true;
    }

    if ( argc < 2 ) {
      argv[1] = husky.currentKey;
    }

    argvS[0] = argv[1];
    argvS[1] = argv[0];

    iom.newBufferCmd( argvS, 2 )

    return true;

  };

  iom.suggestFileByArgs = function(vl, argc, argv) {

    var uri = argv[0] || "", sgs = husky.cmdSuggestion, margs;

    //Try and write the data.
    var fsDriver = husky.config.activeDriver.fs || null;
    if (! fsDriver ) {
      callback('No fs driver registered. Cannot suggestFileByArgs.');
      return false;
    }

    //Open file buffer.
    husky.drivers[fsDriver].getListOfSuggestions( uri, function(err,suggestions){
      if ( err ) {
        //Ensure we empty the suggestion.
        husky.clearSuggestions();
        return false;
      }

      margs = vl.split(" ");
      if ( margs.length < 2 ) {
        sgs.value = "";
        sgs.style.display = "none";
        return false;
      }

      sgs.value = margs[0] + ' ' + suggestions[0].suggestion;
      sgs.style.display = "block";
    });

  };

  iom.fetchBufferByUri = function(uri, callback) {

    var fsDriver = husky.config.activeDriver.fs || null;
    if (! fsDriver ) {
      console.error( 'No fs driver registered. Cannot fetchBufferByUri.' );
      callback();
      return false;
    }

    //Open file buffer.
    husky.drivers[fsDriver].readFile( uri, function(err,data){
      callback(err,data);
    } );

  };

  iom.newBufferCmd = function( argv, argc ) {

    var key = husky.currentKey;
    var uri = null, ccb = "", callback;

    //Save current buffer first?

    if ( argc > 0 ) {
      //Viewport number.
      key = argv[0];
      if ( key > husky.currentVisibleBuffers ) {
        key = husky.currentVisibleBuffers;
      }
      if ( key < 1 ) {
        key = 1;
      }
      if (! husky.viewports.hasOwnProperty(key) ) {
        key = husky.currentKey;
      }
    }

    if ( argc > 1 ) {
      uri = argv[1];
    }

    callback = function( err, data ) {
      if (! data || err ) {
        data = "";
      }

      //Set the buffer data.
      husky.viewports[key].CodeMirror.getDoc().setValue( data );
      husky.viewports[key].CodeMirror.getDoc().clearHistory();
      husky.bufferUpdateLabel(key,uri);
      husky.bufferUpdateSize(key);
      husky.viewports[key].hasChanged = false;
      husky.updateBuffer(key);
    };

    husky.clearBuffer( key );
    husky.viewports[key].uri = uri;
    husky.currentKey = key;
    husky.autoSetMode(key);

    if ( husky.buffers.hasOwnProperty(uri) ) {
      husky.preloadExistingBuffer(key,uri);
      husky.bufferUpdateLabel(key,uri);
      husky.bufferUpdateSize(key);
      husky.viewports[key].hasChanged = false;
      return true;
    }

    if ( uri !== null ) {
      iom.fetchBufferByUri( uri, callback );
    } else {
      callback();
    }

    return true;

  };

  iom.writeAllBuffers = function( argv, argc ) {

    var i = 1, max = husky.currentVisibleBuffers;

    for ( i; i<=max; i++ ) {
      iom.writeBuffer( [], 1, i );
    }

    return true;

  };

  iom.writeBufferByKey = function( key, callback ) {

    var uri = husky.viewports[key].uri;
    var buffer = husky.viewports[key].CodeMirror.getValue();

    if (! uri || uri === "" ) {
      callback('No URI specified. Could not write file.',null);
      return false;
    }

    //Try and write the data.
    var fsDriver = husky.config.activeDriver.fs || null;
    if (! fsDriver ) {
      callback('No fs driver registered. Cannot writeBufferByKey.');
      return false;
    }

    //Open file buffer.
    husky.drivers[fsDriver].writeFile( uri, buffer, function(err,data){
      callback(err,data);
    } );

  };

  iom.writeBuffer = function( argv, argc, key ) {

    if (! key ) {
      key = husky.currentKey
    }

    if (! husky.viewports[key].hasChanged ) {
      return true;
    }

    var uri = null;
    var callback;

    if ( argc > 0 ) {
      uri = argv[0];
      if (! isNaN(uri) ) {
        key = uri;
      } else {
        if ( uri && uri !== "" ) {
          husky.viewports[husky.currentKey].uri = uri;
          husky.bufferUpdateLabel( husky.currentKey, uri );
        }
      }
    }

    var callback = function(error,data) {
      if ( error ) {
        console.error(error);
        return false;
      }

      husky.bufferUpdateLabel(key, husky.viewports[key].uri);
      husky.viewports[key].hasChanged = false;

    };

    iom.writeBufferByKey( key, callback );

    return true;

  };

  //Executes upon registration from husky core callback.
  iom.init = function() {

    //Register commands.
    husky.commands.push({
      name: "Write buffer",
      c: "w [file] || [viewport]",
      s: /(w|w\s.*)$/g,
      d: "Write the currently open buffer to disk",
      fn: iom.writeBuffer
    });
    husky.commands.push({
      name: "Write all buffers",
      c: "wa",
      s: /wa$/g,
      d: "Write all open buffers to disk",
      fn: iom.writeAllBuffers
    });
    husky.commands.push({
      name: 'New buffer',
      c: 'n [viewport] [file]',
      s: /^n\s?.*$/g,
      d: 'Creates a new buffer',
      fn: iom.newBufferCmd
    });
    husky.commands.push({
      name: 'Open buffer',
      c: 'o file [viewport]',
      s: /^o\s?.*$/g,
      d: 'Opens a file into a new buffer',
      fn: iom.openFileToBuffer,
      suggestion: function(vl,argc,argv) {
        iom.suggestFileByArgs(vl,argc,argv);
      }
    });

    //Reinit cmd.
    husky.refreshCmd();

    //Ctrl + S.
    document.addEventListener('keydown', function(e){

      if ( e.ctrlKey === true && e.which === 83 ) {
        iom.writeBuffer();
      }

    });

  };

};

huskyCore.registerModule('io', io);
