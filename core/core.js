var husky = function() {

  var husky = this;

  husky.currentKey = 1;
  husky.currentVisibleBuffers = 3;
  husky.buffers = {};
  husky.drivers = {};
  husky.commandMemory = [];
  husky.lastCommand = null;
  husky.currentCommand = -1;

  husky.config = {
    'CodeMirror': {
      'theme': 'one-dark'
    },
    activeDriver: {
      fs: null
    }
  };

  husky.cmd = {};
  husky.commands = [];

  husky.registerDriver = function( guid, obj ) {

    if (! husky.drivers.hasOwnProperty(guid) ) {
      console.log("Registered driver " + guid);

      husky.drivers[guid] = new obj( husky );
      if ( husky.drivers[guid].hasOwnProperty("init") ) {
        husky.drivers[guid].init();
      }
    }

  };

  husky.deRegisterDriver = function( guid ) {

    delete husky.drivers[guid];

  };

  husky.switchFocus = function( key ) {

    var buffer = husky.buffers[key], els, i = 0, max;

    //Remove all.
    els = document.querySelectorAll('.editors .active');
    max = els.length;
    if ( max > 0 ) {
      for ( i; i<max; i++ ) {
        els[i].className = "viewport";
      }
    }

    husky.buffers[key].CodeMirror.focus();
    husky.buffers[key].ct.className = "viewport active";
    husky.currentKey = key;

  };

  husky.createHooks = function() {

    var key;

    for ( key in husky.buffers ) {

      //On focus.
      (function(key){
        husky.buffers[key].CodeMirror.on('focus', function(e){
          husky.switchFocus( key );
        });
      })(key);

    }

  };

  husky.toggleCmd = function() {

    if ( husky.cmd.active === true ) {
      husky.hideCmd();
    } else {
      husky.showCmd();
    }

  };

  husky.showCmd = function() {

    husky.currentCommand = -1;

    if ( husky.cmd.active === false ) {

      husky.cmd.el.style.display = "block";
      husky.cmd.inpt.focus();
      husky.cmd.active = true;

    }

  };

  husky.hideCmd = function() {

    if ( husky.cmd.active === true ) {

      husky.cmd.inpt.value = "";
      husky.cmd.el.style.display = "none";
      husky.cmd.inpt.blur();
      husky.cmd.active = false;
      husky.focusEditor();

    }

  };

  husky.swapBuffers = function(step) {

    var current = husky.currentKey, max = husky.currentVisibleBuffers;
    var newk = parseInt(current) + parseInt(step);

    if ( newk < 1 ) {
      newk = max;
    }

    if ( newk > max ) {
      newk = 1;
    }

    husky.switchFocus( newk );

  };

  husky.setupCmd = function() {

    husky.cmd = {
      active: false,
      el: document.getElementById('cmd'),
      inpt: document.getElementById('cmd-input'),
      list: document.getElementById('cmd-list')
    };

    var t, l, hooke;

    //Inject commands.
    for ( var i=0; i<husky.commands.length; i++ ) {

      husky.commands[i].el = document.createElement('li');

      t = document.createElement('div');
      t.className = 't';
      t.innerHTML = husky.commands[i].innerHTML = husky.commands[i].name + ' <span class="h">' + husky.commands[i].c + '</span>';

      l = document.createElement('div');
      l.className = 'l';
      l.innerHTML = husky.commands[i].d;


      husky.commands[i].el.appendChild(t);
      husky.commands[i].el.appendChild(l);

      husky.cmd.list.appendChild( husky.commands[i].el );

    }

    //Hotkeys.
    window.addEventListener('keydown', function(e){
      if ( e.keyCode === 32 && e.ctrlKey === true ) {
        husky.toggleCmd();
      }

    });

    //Detect if running as chrome extension, or via another method.
    hooke = (window.chrome && chrome.runtime && chrome.runtime.id) ? 'keydown' : 'keyup';

    //Ctrl+Tab.
    window.addEventListener(hooke, function(e){

      if ( e.keyCode === 9 && e.ctrlKey === true ) {

        e.preventDefault();

        if ( e.shiftKey === true ) {
          husky.swapBuffers(-1);
        } else {
          husky.swapBuffers(1);
        }
      }

    });

    husky.cmd.el.addEventListener('keydown', function(e){

      if ( e.keyCode === 27 ) {
        husky.hideCmd();
      }

    });

    husky.cmd.inpt.addEventListener('keyup', husky.procCmd);
    husky.cmd.inpt.addEventListener('keydown', husky.procCmd);
    husky.cmd.inpt.addEventListener('keydown', husky.cmdHotkeys);

    husky.cmd.inpt.addEventListener('blur', function(e){

      var i = 0, max = husky.commands.length;
      for ( i; i<max; i++ ) {
        husky.commands[i].el.style.display = "block";
      }
      husky.toggleCmd();

    });

  };

  husky.cmdHotkeys = function(e) {

    if ( e.keyCode === 38 ) {
      husky.toggleCmdHistory(1);
    } else if ( e.keyCode === 40 ) {
      husky.toggleCmdHistory(-1);
    }

  };

  husky.toggleCmdHistory = function( direction ) {

    if ( husky.currentCommand < 0 && direction === -1 ) {
      return false;
    }

    if ( husky.currentCommand === 0 && direction === -1 ) {
      husky.currentCommand = -1;
      husky.setCmd('');
      return false;
    }

    if ( direction === 1 && husky.currentCommand === (husky.commandMemory.length -1) ) {
      return false;
    }

    husky.currentCommand = husky.currentCommand + direction;

    husky.setCmd( husky.commandMemory[husky.currentCommand] );

  };

  husky.setCmd = function( val ) {

    husky.cmd.inpt.value = val;

  };

  husky.procCmd = function(e) {

    var vl, i = 0, max = husky.commands.length;
    var sr = [], mt;
    var currentCmd = null;
    var argv, argc, args;

    vl = husky.cmd.inpt.value;
    if ( vl === "" ) {
      for ( i; i<max; i++ ) {
        husky.commands[i].el.style.display = "block";
      }
      return false;
    }

    for ( i; i<max; i++ ) {

      mt = vl.match( husky.commands[i].s );
      if ( mt ) {
        husky.commands[i].el.style.display = "block";
        if (! currentCmd ) {
          currentCmd = husky.commands[i];
        }
      } else {
        husky.commands[i].el.style.display = "none";
      }

    }

    if ( e.keyCode === 13 ) {
      e.preventDefault();
      if ( currentCmd ) {

        if ( husky.lastCommand !== vl ) {
          husky.commandMemory.unshift( vl );
          husky.lastCommand = vl;
        }

        args = vl.split(" ");
        argc = args.length -1;
        argv = args;
        argv.splice(0,1);

        if ( currentCmd.fn( argv, argc ) ) {
          for ( i=0; i<max; i++ ) {
            husky.commands[i].el.style.display = "block";
          }
          husky.toggleCmd();
          return true;
        }
      } else {
        for ( i=0; i<max; i++ ) {
          husky.commands[i].el.style.display = "block";
        }
        husky.toggleCmd();
      }

    }


  };

  husky.bufferUpdateLabel = function( i, label ) {

    if (! label || label == "" ) {
      label = "/dev/null";
    }

    if ( husky.buffers[i].bfl.innerHTML !== label ) {
      husky.buffers[i].bfl.innerHTML = label;
    }

  };

  husky.bufferUpdateSize = function( i ) {

    var size = husky.buffers[i].CodeMirror.getValue().length;

    size = size + ' bytes';
    if ( husky.buffers[i].sl.innerHTML !== size ) {
      husky.buffers[i].sl.innerHTML = size;
    }

  };

  husky.createNewBuffer = function( i ) {

    var cm, el, tn, ct, bfl, sl;

    ct = document.getElementById('vp' + i);
    el = document.getElementById("codemirror-" + i);
    bfl = document.getElementById('vp' + i + '-buffer');
    sl = document.getElementById('vp' + i + '-size');
    cm = CodeMirror.fromTextArea(el, {
      lineNumbers: true,
      styleActiveLine: true,
      matchBrackets: true,
      theme: husky.config.CodeMirror.theme,
      mode: "text",
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      autoCloseBrackets: true
    });

    //Hooks.
    cm.on('change',function(){
      husky.bufferUpdateSize(i);
    });

    var buffer = {
      ct: ct,
      el: el,
      bfl: bfl,
      sl: sl,
      CodeMirror: cm,
      element: el,
      uri: null,
      lastSaved: 0
    };

    return buffer;

  };

  husky.autoSetMode = function( i ) {

    var cm = husky.buffers[i].CodeMirror;

    var val = husky.buffers[i].uri, m, mode, spec;

    if (m = /.+\.([^.]+)$/.exec(val)) {
      var info = CodeMirror.findModeByExtension(m[1]);
      if (info) {
        mode = info.mode;
        spec = info.mime;
      }
    } else if (/\//.test(val)) {
      var info = CodeMirror.findModeByMIME(val);
      if (info) {
        mode = info.mode;
        spec = val;
      }
    } else {
      mode = spec = val;
    }

    console.log(mode);

    if (mode) {
      cm.setOption("mode", spec);
      CodeMirror.autoLoadMode(cm, mode);
    } else {
      console.error('Could not find a mode');
    }


  };

  husky.createBuffers = function() {

    var i = 1;

    for ( i; i<5; i++ ) {
      husky.buffers[i] = husky.createNewBuffer( i );
    }

  };

  husky.focusEditor = function() {

    husky.buffers[husky.currentKey].CodeMirror.focus();

  };

  husky.writeBufferByKey = function( key, callback ) {

    var uri = husky.buffers[key].uri;
    var buffer = husky.buffers[key].CodeMirror.getValue();

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

  husky.writeBuffer = function( argv, argc, key ) {

    if (! key ) {
      key = husky.currentKey
    }

    var uri = null;
    var callback;

    if ( argc > 0 ) {
      uri = argv[0];
      if (! isNaN(uri) ) {
        key = uri;
      } else {
        if ( uri && uri !== "" ) {
          husky.buffers[husky.currentKey].uri = uri;
          husky.bufferUpdateLabel( husky.currentKey, uri );
        }
      }
    }

    var callback = function(error,data) {
      if ( error ) {
        console.error(error);
        return false;
      }

    };

    husky.writeBufferByKey( key, callback );

    return true;

  };

  husky.writeAllBuffers = function( argv, argc ) {

    var i = 1, max = husky.currentVisibleBuffers;

    for ( i; i<=max; i++ ) {
      husky.writeBuffer( [], 1, i );
    }

    return true;

  };

  husky.clearBuffer = function( key ) {

    //Should I save the buffer first?
    husky.buffers[key].CodeMirror.getDoc().setValue('');
    husky.buffers[key].uri = null;
    husky.buffers[key].lastSaved = 0;

  };

  husky.fetchBufferByUri = function(uri, callback) {

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

  husky.newBufferCmd = function( argv, argc ) {

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
      if (! husky.buffers.hasOwnProperty(key) ) {
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
      husky.buffers[key].CodeMirror.getDoc().setValue( data );
      husky.bufferUpdateLabel(key,uri);
      husky.bufferUpdateSize(key);
    };

    husky.clearBuffer( key );
    husky.buffers[key].uri = uri;
    husky.currentKey = key;
    husky.autoSetMode(key);

    if ( uri !== null ) {
      husky.fetchBufferByUri( uri, callback );
    } else {
      callback();
    }

    return true;

  };

  husky.openFileToBuffer = function( argv, argc ) {

    var argvS = [];

    if ( argc < 1 ) {
      return true;
    }

    if ( argc < 2 ) {
      argv[1] = husky.currentKey;
    }

    argvS[0] = argv[1];
    argvS[1] = argv[0];

    husky.newBufferCmd( argvS, 2 )

    return true;

  };

  husky.registerCommands = function() {

    husky.commands.push({
      name: "Write buffer",
      c: "w [file] || [viewport]",
      s: /^w\s?.*$/g,
      d: "Write the currently open buffer to disk",
      fn: husky.writeBuffer
    });
    husky.commands.push({
      name: "Write all buffers",
      c: "sw",
      s: /sw/g,
      d: "Write all open buffers to disk",
      fn: husky.writeAllBuffers
    });
    husky.commands.push({
      name: 'New buffer',
      c: 'n [viewport] [file]',
      s: /^n\s?.*$/g,
      d: 'Creates a new buffer',
      fn: husky.newBufferCmd
    });
    husky.commands.push({
      name: 'Open buffer',
      c: 'o file [viewport]',
      s: /^o\s?.*$/g,
      d: 'Opens a file into a new buffer',
      fn: husky.openFileToBuffer
    });

  };

  husky.init = function() {

    husky.createBuffers();
    husky.createHooks();
    husky.registerCommands();
    husky.setupCmd();
    husky.focusEditor();


  };

  husky.init();

};

window.huskyCore = new husky();
