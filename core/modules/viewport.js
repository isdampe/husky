var viewport = function( husky ) {

  var viewportm = this;

  viewportm.wrapper = document.getElementById('editors');
  viewportm.modes = {
    "1c": {
      visibleBuffers: 1,
      className: "onec"
    },
    "2c": {
      visibleBuffers: 2,
      className: "twoc"
    },
    "3c": {
      visibleBuffers: 3,
      className: "threec"
    },
    "4c": {
      visibleBuffers: 4,
      className: "fourc"
    },
    "2r": {
      visibleBuffers: 2,
      className: "twor"
    },
    "3r": {
      visibleBuffers: 3,
      className: "threer"
    },
    "4r": {
      visibleBuffers: 4,
      className: "fourr"
    },
    "4g": {
      visibleBuffers: 4,
      className: "fourg"
    },
    "6g": {
      visibleBuffers: 6,
      className: "sixg"
    }
  };


  viewportm.changeViewport = function( argv, argc, key ) {

    if (! key ) {
      key = husky.currentKey;
    }

    var viewportMode;

    if ( argc > 0 ) {
      viewportMode = argv[0];
    } else {
      return true;
    }

    if (! viewportm.modes.hasOwnProperty(viewportMode) ) {
      husky.error('Invalid viewport mode specified.');
      return true;
    }

    viewportm.wrapper.className = "editors " + viewportm.modes[viewportMode].className;
    husky.currentVisibleBuffers = viewportm.modes[viewportMode].visibleBuffers;

    if ( husky.currentKey > husky.currentVisibleBuffers ) {
      setTimeout(function(){
        husky.switchFocus( husky.currentVisibleBuffers );
      },1);
    }

    return true;

  };

  viewportm.setMode = function( argv, argc ) {

    var cmMode, key;

    if ( argc > 0 ) {
      cmMode = argv[0];
    } else {
      return true;
    }

    if ( argc > 1 ) {
      key = argv[1] || husky.currentKey;
    } else {
      key = husky.currentKey;
    }

    var cm = husky.viewports[key].CodeMirror;
    cm.setOption("mode", cmMode);
    CodeMirror.autoLoadMode(cm, cmMode);

    return true;

  };

  viewportm.swapBuffers = function( argv, argc ) {

    var key1, key, doc1, doc2;

    //There needs to be at least one key to swap with.
    if ( argc < 1 ) {
      return true;
    }

    //Assume we are swapping current active viewport if two aren't specified.
    if ( argc < 2 ) {
      key1 = husky.currentKey;
      key2 = argv[0];
    } else {
      key1 = argv[0];
      key2 = argv[1];
    }

    if ( key1 == "" || key2 == "" || key1 < 0 || key1 > 6 || key2 < 0 || key2 > 6 || key1 === key2 ) {
      return true;
    }

    doc1 = {
      doc: husky.viewports[key1].CodeMirror.getDoc().copy(),
      history: husky.viewports[key1].CodeMirror.getDoc().getHistory(),
      cursor: husky.viewports[key1].CodeMirror.getDoc().getCursor(),
      uri: husky.viewports[key1].uri
    };
    doc2 = {
      doc: husky.viewports[key2].CodeMirror.getDoc().copy(),
      history: husky.viewports[key2].CodeMirror.getDoc().getHistory(),
      cursor: husky.viewports[key2].CodeMirror.getDoc().getCursor(),
      uri: husky.viewports[key2].uri
    };

    husky.viewports[key1].CodeMirror.swapDoc(doc2.doc);
    husky.viewports[key1].CodeMirror.getDoc().setHistory(doc2.history);
    husky.viewports[key1].CodeMirror.getDoc().setCursor(doc2.cursor);
    husky.viewports[key1].uri = doc2.uri;

    husky.viewports[key2].CodeMirror.swapDoc(doc1.doc);
    husky.viewports[key2].CodeMirror.getDoc().setHistory(doc1.history);
    husky.viewports[key2].CodeMirror.getDoc().setCursor(doc1.cursor);
    husky.viewports[key2].uri = doc1.uri;

    husky.bufferUpdateSize(key1,doc2.uri);
    husky.bufferUpdateLabel(key1,doc2.uri);
    husky.bufferUpdateSize(key2,doc1.uri);
    husky.bufferUpdateLabel(key2,doc1.uri);

    return true;

  };


  //Executes upon registration from husky core callback.
  viewportm.init = function() {

    //Register commands.
    husky.commands.push({
      name: 'Viewport layout',
      c: 'v [viewtype]',
      s: /(v|v\s.*)$/g,
      d: 'Changes the viewport layout',
      fn: viewportm.changeViewport
    });
    husky.commands.push({
      name: 'Viewport swap',
      c: 'vs [src (int)] [dest (int)]',
      s: /(vs|vs\s.*)$/g,
      d: 'Swap the position of two buffers',
      fn: viewportm.swapBuffers
    });
    husky.commands.push({
      name: "Mode set",
      c: 'm [mode] [viewport]',
      s: /(^m|^m\s.*)$/g,
      d: 'Set the mode of a viewport',
      fn: viewportm.setMode
    });

    //Reinit cmd.
    husky.refreshCmd();

  };

};

huskyCore.registerModule('viewport', viewport);
