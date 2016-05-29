var husky = function() {

  var husky = this;

  husky.currentKey = 1;
  husky.currentVisibleBuffers = 3;
  husky.buffers = {};
  husky.drivers = {};
  husky.modules= {};
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
  husky.cmdSuggestion = document.getElementById('cmd-suggestion');

  husky.registerModule = function( guid, obj ) {

    if (! husky.modules.hasOwnProperty(guid) ) {
      console.log("Registered module " + guid);

      husky.modules[guid] = new obj( husky );
      if ( husky.modules[guid].hasOwnProperty("init") ) {
        husky.modules[guid].init();
      }
    }

  };

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

  husky.setKeyMap = function( key, keyMap ) {

    huskyCore.buffers[key].CodeMirror.setOption("keyMap","vim");

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

      husky.clearSuggestions();
      husky.cmd.el.style.display = "block";
      husky.cmd.inpt.focus();
      husky.cmd.active = true;

    }

  };

  husky.hideCmd = function() {

    if ( husky.cmd.active === true ) {

      husky.clearSuggestions();
      husky.cmd.inpt.value = "";
      husky.cmd.el.style.display = "none";
      husky.cmd.inpt.blur();
      husky.cmd.active = false;
      husky.focusEditor();

    }

  };

  husky.clearSuggestions = function() {
    husky.cmdSuggestion.value = "";
    husky.cmdSuggestion.style.display = "none";
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

  husky.refreshCmd = function() {

    //Inject commands.
    for ( var i=0; i<husky.commands.length; i++ ) {
      if ( husky.commands[i].hasOwnProperty('el') ) {
        continue;
      }

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
  }

  husky.setupCmd = function() {

    husky.cmd = {
      active: false,
      el: document.getElementById('cmd'),
      inpt: document.getElementById('cmd-input'),
      list: document.getElementById('cmd-list')
    };

    var t, l, hooke;

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
    } else if ( e.keyCode === 39 ) {
      husky.autoFillCmd();
    } else if ( e.keyCode === 9 ) {
      e.preventDefault();
      husky.autoFillCmd();
    }

  };

  husky.autoFillCmd = function() {

    if (! husky.cmdSuggestion.value || husky.cmdSuggestion.value === "" ) {
      return false;
    }

    husky.setCmd( husky.cmdSuggestion.value );

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
    var currentCmd = null, cmdKey = null;
    var argv, argc, args;

    vl = husky.cmd.inpt.value;
    if ( vl === "" ) {
      husky.clearSuggestions();
      for ( i; i<max; i++ ) {
        husky.commands[i].el.style.display = "block";
      }

      cmdKey = null;
      return false;
    }

    for ( i; i<max; i++ ) {

      mt = vl.match( husky.commands[i].s );
      if ( mt ) {
        husky.commands[i].el.style.display = "block";
        if (! currentCmd ) {
          currentCmd = husky.commands[i];
          cmdKey = i;
        }
      } else {
        husky.commands[i].el.style.display = "none";
      }

    }

    args = vl.split(" ");
    argc = args.length -1;
    argv = args;
    argv.splice(0,1);

    if ( currentCmd ) {
      if ( husky.commands[cmdKey].hasOwnProperty('suggestion') ) {
        husky.commands[cmdKey].suggestion(vl,argc,argv);
      } else {
        husky.clearSuggestions();
      }
    }

    if ( e.keyCode === 13 ) {
      e.preventDefault();
      if ( currentCmd ) {

        if ( husky.lastCommand !== vl ) {
          husky.commandMemory.unshift( vl );
          husky.lastCommand = vl;
        }

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

  husky.flagHasChanged = function( i ) {
    if ( husky.buffers[i].hasChanged === false ) {
      husky.buffers[i].hasChanged = true;
      husky.bufferUpdateLabel(i, husky.buffers[i].bfl.innerHTML + " *" );
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
      dragDrop: false,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      autoCloseBrackets: true
    });

    //Hooks.
    cm.on('change',function(){
      husky.bufferUpdateSize(i);
      husky.flagHasChanged(i);
    });

    var buffer = {
      ct: ct,
      el: el,
      bfl: bfl,
      sl: sl,
      CodeMirror: cm,
      element: el,
      uri: null,
      lastSaved: 0,
      hasChanged: false
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

    if (mode) {
      cm.setOption("mode", spec);
      CodeMirror.autoLoadMode(cm, mode);
    } else {
      console.error('Could not find a mode');
    }


  };

  husky.createBuffers = function() {

    var i = 1;

    for ( i; i<7; i++ ) {
      husky.buffers[i] = husky.createNewBuffer( i );
    }

  };

  husky.focusEditor = function() {

    husky.buffers[husky.currentKey].CodeMirror.focus();

  };


  husky.clearBuffer = function( key ) {

    //Should I save the buffer first?
    husky.buffers[key].CodeMirror.getDoc().setValue('');
    husky.buffers[key].uri = null;
    husky.buffers[key].lastSaved = 0;

  };

  husky.registerCommand = function( cmd ) {

    husky.commands.push(cmd);

  };

  husky.init = function() {

    husky.createBuffers();
    husky.createHooks();
    husky.setupCmd();
    husky.focusEditor();

  };

  husky.init();

};

window.huskyCore = new husky();
