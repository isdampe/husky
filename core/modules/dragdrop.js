var dragdrop = function( husky ) {

  var dragdropm = this;

  dragdropm.dragOver = function(e,i) {

    var el = document.getElementById("vp" + i);
    el.classList.add("hover");

    window.setTimeout(function(){
      dragdropm.dragLeave(i);
    },1000);

  };

  dragdropm.dragLeave = function(i) {

    var el = document.getElementById("vp" + i);
    el.classList.remove("hover");

  };

  dragdropm.drop = function(e,i) {
    e.preventDefault();

    dragdropm.dragLeave(i);

    var files = e.target.files || e.dataTransfer.files;
    if (! files || files.length < 1 ) {
      return false;
    }

    var fp = files[0].path;

    huskyCore.modules.io.openFileToBuffer([fp,i],2);
    huskyCore.switchFocus(i);

  };

  //Executes upon registration from husky core callback.
  dragdropm.init = function() {

    var nwjsApp = ( typeof require !== 'undefined' ) ? true : false;

    if ( nwjsApp ) {
      //Override default nwjs drop behaviour.
      window.ondragover = function(e) { e.preventDefault(); return false };
      window.ondrop = function(e) { e.preventDefault(); return false };
    }

    if (! window.File || ! window.FileList || ! window.FileReader) {
      console.error("File drag and drop not supported in dragdrop.js");
      return false;
    }

    for ( var i=1; i<7; i++ ) {
      (function(i){

        document.getElementById("vp" + i).addEventListener("dragover", function(e){
          dragdropm.dragOver(e,i);
        }, false);

        document.getElementById("vp" + i).addEventListener("drop", function(e){
          dragdropm.drop(e,i);
        }, false);

      })(i);
    }



  };

};

huskyCore.registerModule('dragdrop', dragdrop);
