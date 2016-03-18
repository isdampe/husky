var husky = function() {

  var husky = this;

  husky.currentKey = 1;
  husky.currentVisibleBuffers = 3;
  husky.buffers = {};
  husky.drivers = {};

  husky.config = {
    'CodeMirror': {
      'theme': 'monokai'
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

    husky.cmd.inpt.addEventListener('blur', function(e){

      var i = 0, max = husky.commands.length;
      for ( i; i<max; i++ ) {
        husky.commands[i].el.style.display = "block";
      }
      husky.toggleCmd();

    });

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

  husky.createNewBuffer = function( i ) {

    var cm, el, tn, ct;

    ct = document.getElementById('vp' + i);
    el = document.getElementById("codemirror-" + i);
    cm = CodeMirror.fromTextArea(el, {
      lineNumbers: true,
      styleActiveLine: true,
      matchBrackets: true,
      theme: husky.config.CodeMirror.theme,
      mode: "javascript"
    });

    var buffer = {
      ct: ct,
      el: el,
      CodeMirror: cm,
      element: el,
      uri: null,
      lastSaved: 0
    };

    return buffer;

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

  husky.writeBuffer = function( argv, argc ) {

    console.log('writeBuffer');

    return true;

  };

  husky.writeAllBuffers = function( argv, argc ) {

    console.log('writeAllBuffers');

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

      if (! data ) {
        data = "";
      }

      //Clear it.
      husky.clearBuffer( key );

      //Set options.
      husky.buffers[key].uri = uri;
      husky.buffers[key].CodeMirror.getDoc().setValue( data );
      husky.currentKey = key;
    };


    if ( uri !== null ) {

      husky.fetchBufferByUri( uri, callback );

    } else {
      callback();
    }


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
      c: "wa",
      s: /^wa\s?$/g,
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
