var io = function( husky ) {

  var iom = this;

  iom.quitBuffer = function( argv, argc ) {

    var key;
    if ( argc < 1 ) {
      key = husky.currentKey;
    } else {
      key = argv[0];
    }

    //Close the buffer.
    huskyCore.closeBuffer( key );

    return true;

  };

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
      husky.error( 'No fs driver registered. Cannot fetchBufferByUri.', 1 );
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
      husky.emit('buffersChange');

    };


    //Is the uri already open?
    if ( husky.buffers.hasOwnProperty(uri) && uri !== '/dev/null' ) {
      if ( husky.buffers[uri].key !== key ) {
        //Move the buffers instead.
        huskyCore.modules.viewport.swapBuffers([husky.buffers[uri].key, key], 2);
        husky.buffers[uri].key = key;
        huskyCore.switchFocus(key);
        return true;
      }
    }


    var nextAction = function() {
      husky.clearBuffer( key );
      husky.viewports[key].uri = uri;
      husky.currentKey = key;
      husky.autoSetMode(key);

      if ( uri !== null ) {
        iom.fetchBufferByUri( uri, callback );
      } else {
        callback();
        husky.emit('buffersChange');
      }

    };

    //Is there a buffer that is already open?
    if ( husky.viewports[key].hasChanged === true && husky.viewports[key].uri !== '/dev/null' ) {
      //Save first?
      var ri = function() {

        husky.confirm('Save current buffer before closing it? (Y/N)', function(bool){
          if ( bool === true ) {
            iom.writeBuffer(key);
            nextAction();
          } else {
            nextAction();
          }
        });

      };
      ri();
    } else {
      nextAction();
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

  iom.changeWorkingDirectory = function( argv, argc ) {

    if ( argc < 1 ) return true;

    var cwd = argv[0];
    husky.currentDirectory = cwd;

    husky.log('Changed working directory to ' + cwd);

    //Try to update explorer.
    husky.emit('buffersChange');

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
      husky.log('Wrote buffer to ' + uri);
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
        husky.log(error,1);
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
      name: "Quit buffer",
      c: "q [viewport]",
      s: /^q\s?.*/g,
      d: 'Quits the specified buffer',
      fn: iom.quitBuffer
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
      name: 'Change working directory',
      c: 'cd [directory]',
      s: /^cd\s?.*$/g,
      d: 'Changes the working directory',
      fn: iom.changeWorkingDirectory
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
