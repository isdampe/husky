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
      key = husky.currentKey
    }

    var viewportMode;

    if ( argc > 0 ) {
      viewportMode = argv[0];
    } else {
      return true;
    }

    if (! viewportm.modes.hasOwnProperty(viewportMode) ) {
      console.error('Invalid viewport mode specified.');
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

  viewportm.swapBuffers = function( argv, argc ) {

    console.log(argv);

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

    //Reinit cmd.
    husky.refreshCmd();

  };

};

huskyCore.registerModule('viewport', viewport);
