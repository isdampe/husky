var vimMode = function( husky ) {

  var vimModem = this;
  var vimOn = false;

  vimModem.toggleVimMode = function(argv, argc) {

    var mode = "toggle";

    if ( argc > 0 ) {
      if ( argv[0] == "" ) {
        mode = "toggle";
      } else {
        if ( argv[0] == "on" ) {
          mode = "on";
        } else {
          mode = "off";
        }
      }
    }

    if ( mode === "toggle" ) {
      if ( vimOn === true ) {
        mode = "off";
      } else {
        mode = "on";
      }
    }

    //Turn on vim.
    for ( var i=1; i<6; i++ ) {
      if ( mode === "on" ) {
        huskyCore.setKeyMap(i,"vim");
      } else {
        huskyCore.setKeyMap(i,"default");
      }
    }

    if ( mode === "on" ) {
      vimOn = true;
    } else {
      vimOn = false;
    }

    return true;

  };

  //Executes upon registration from husky core callback.
  vimModem.init = function() {

    //Register commands.
    husky.commands.push({
      name: 'Toggle vim mode',
      c: 'vim [on || off]',
      s: /(vim|vim\s.*)$/g,
      d: 'Enables or disables vim mode key bindings',
      fn: vimModem.toggleVimMode
    });

    //Reinit cmd.
    husky.refreshCmd();

  };

};

huskyCore.registerModule('vimMode', vimMode);
