var explorer = function( husky ) {

  var explorerm = this;
  var elWrapper, elList, visible = false;
  var directoryList = [];
  var directories = {};

  explorerm.toggle = function() {

    if ( visible === false ) {
      explorerm.refreshList();
      elWrapper.className = 'explorer-wrapper explorer-wrapper-active';
      visible = true;
    } else {
      elWrapper.className = 'explorer-wrapper';
      visible = false;
    }

  };

  explorerm.expandSubFolder = function(uri,parentList) {

    //Is there already a subfolder?
    var ul;
    var subfolders = parentList.querySelector('ol');

    if ( ! subfolders ) {
      //Create it.
      ul = document.createElement('ol');
      parentList.appendChild(ul);
    } else {
      ul = subfolders;
    }

    if ( directories.hasOwnProperty(uri)  ) {
      //Delete it
      delete directories[uri];
      parentList.classList.remove('expanded');
      ul.parentNode.removeChild(ul);
      return false;
    }

    explorerm.prefillList(uri,ul);
    parentList.classList.add('expanded');

  };

  explorerm.handleClick = function(e) {
    e.preventDefault();
    e.stopPropagation();

    var type = this.getAttribute('data-type');
    var uri = this.getAttribute('data-uri');
    if ( ! type || ! uri ) return;

    if ( type === 'file' ) {
      this.classList.add('active');
      husky.modules['io'].openFileToBuffer([ uri ]);
      explorerm.toggle();

    } else if ( type === 'directory' ) {
      explorerm.expandSubFolder(uri, this);
    }

    return true;

  };

  explorerm.addItemToMenu = function(obj,parent) {

    var cl = '';

    var el = document.createElement('li'), sp;
    el.setAttribute('data-type', obj.type);
    el.setAttribute('data-uri', obj.uri);
    el.addEventListener('click', explorerm.handleClick);



    if ( obj.type === 'directory' ) {
      sp = '<span class="octicon octicon-chevron-right"></span> <span class="octicon octicon-file-directory"></span> ';
    } else {
      sp = '<span class="octicon octicon-chevron-down octicon-hidden"></span> <span class="octicon octicon-file"></span> ';
      if ( husky.isBufferOpen(obj.uri) ) cl = 'active';
      el.className = cl;
    }

    el.innerHTML = sp + obj.name;

    obj.el = el;

    directoryList.push(obj);

    parent.appendChild(el);

  };

  explorerm.refreshList = function() {

    for ( var i=0; i<directoryList.length; i++ ) {
      if ( husky.isBufferOpen(directoryList[i].uri) ) {
        directoryList[i].el.classList.add('active');
      }
    }

  };

  //Get directory contents.
  explorerm.prefillList = function(uri, parent) {

    var parentEl;
    if ( typeof uri === 'undefined' ) uri = null;
    if ( typeof parent === 'undefined' ) parent = elList;

    var fsDriver = husky.config.activeDriver.fs || null;
    if (! fsDriver ) {
      callback('No fs driver registered. Cannot prefillList.');
      return false;
    }

    //Get URI of current file.
    if ( uri === null ) {
      if ( typeof husky.buffers[husky.currentKey] !== 'undefined' ) {
        uri = husky.viewports[husky.currentKey].uri;
      }
    }

    if ( directories.hasOwnProperty(uri) ) return false;

    husky.drivers[fsDriver].ls(uri,function(err,ls){
      if ( err ) {
        window.alert('There was an error');
        return false;
      }

      for ( var i=0; i<ls.length; i++ ) {
        explorerm.addItemToMenu(ls[i],parent);
      }

      directories[uri] = uri;

    });

  };

  //Executes upon registration from husky core callback.
  explorerm.init = function() {

    elWrapper = document.createElement('nav');
    elWrapper.id = 'explorer';
    elWrapper.className = 'explorer-wrapper';

    elList = document.createElement('ol');
    elList.id = 'explorer-list';
    elList.className = 'explorer-list';

    elWrapper.appendChild(elList);

    document.body.appendChild(elWrapper);

    //Hotkeys.
    window.addEventListener('keydown', function(e){
      if ( e.keyCode === 69 && e.ctrlKey === true ) {
        explorerm.toggle();
        e.preventDefault();
      }
    });

    //Preload list.
    explorerm.prefillList();

  };

};

huskyCore.registerModule('explorer', explorer);
