var dragdrop = function( husky ) {

  var dragdropm = this;

  //Executes upon registration from husky core callback.
  dragdropm.init = function() {

    //Register commands.
    /*
    husky.commands.push({
      name: "Drag drop",
      c: "w [file] || [viewport]",
      s: /(w|w\s.*)$/g,
      d: "Write the currently open buffer to disk",
      fn: true
    });*/

    //Reinit cmd.
    //husky.refreshCmd();


  };

};

huskyCore.registerModule('dragdrop', dragdrop);
