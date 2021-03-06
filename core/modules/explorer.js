var explorer = function( husky ) {

  var explorerm = this;
  var elWrapper, elList, visible = true;
  var directoryList = [];
  var directories = {};
  var lastDirectoryUsed = null;

  explorerm.toggle = function() {

    if ( visible === false ) {
      explorerm.refreshList();
      elWrapper.className = 'explorer-wrapper explorer-wrapper-active';
      visible = true;
    } else {
      explorerm.hide();
    }

  };

  explorerm.hide = function() {
    elWrapper.className = 'explorer-wrapper';
    visible = false;
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
      //optional
      //explorerm.toggle();

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

    if ( obj.type === 'directory' ) {
      el.addEventListener('click', explorerm.handleClick);
    } else {
      el.addEventListener('click', function(e){
        e.stopPropagation();
      });
      el.addEventListener('dblclick', explorerm.handleClick);
    }

    el.addEventListener('contextmenu',function(e){
      e.stopPropagation();

      if ( obj.type === 'file' ) {
        huskyCore.createContextMenu(e,[
          {
            label: 'Open',
            click: function(ctx,e) {
              var ce = document.createEvent('MouseEvents');
              ce.initEvent('dblclick',true, true);
              el.dispatchEvent(ce);
            }
          },
          {
            label: 'Close',
            click: function(ctx,e) {
              huskyCore.closeBuffer(false, obj.uri);
            }
          },
          {
            label: 'Rename',
            click: function(ctx,e) {
              husky.log('Renaming ' + obj.uri);
            }
          },
          {
            label: 'Copy',
            click: function(ctx,e) {
              var uri = obj.uri;
              var dir = obj.uri.substring(0,obj.uri.lastIndexOf('/'));
              explorerm.copyFile(uri,dir);
            }
          },
          {
            label: 'New file',
            click: function(ctx,e) {
              var dir = obj.uri.substring(0,obj.uri.lastIndexOf('/'));
              explorerm.createNewFile(dir);
            }
          },
          {
            label: 'Refresh',
            click: explorerm.refreshList
          }
        ]);
      } else if ( obj.type === 'directory' ) {
        huskyCore.createContextMenu(e,[
          {
            label: 'Toggle visibility',
            click: function(ctx,e) {
              el.click();
            }
          },
          {
            label: 'New file',
            click: function(ctx,e) {
              explorerm.createNewFile(obj.uri);
            }
          },
          {
            label: 'New directory',
            click: function(ctx,e) {
              husky.log('Creating new directory in ' + obj.uri);
            }
          },
          {
            label: 'Refresh',
            click: explorerm.refreshList
          }
        ]);
      }
    });



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

  explorerm.copyFile = function( uri, dir ) {
    if ( typeof uri === 'undefined' ) return false;

    huskyCore.requestInput('New file name? (Writing to ' + dir + ', copying from ' + uri + ') ', function(stdin){

      if ( stdin == '' ) return false;
      var furi = dir + '/' + stdin;

      huskyCore.modules.io.copy(uri, furi, function(err,nuri){
        if ( err ) {
          husky.error(err);
          return false;
        }

        huskyCore.emit('buffersChange');

      });

    });

  };

  explorerm.createNewFile = function( uri ) {
    if ( typeof uri === 'undefined' ) return false;


    huskyCore.requestInput('New file name? (Writing to ' + uri + ') ', function(stdin){

      if ( stdin == '' ) return false;
      var furi = uri + '/' + stdin;

      huskyCore.modules.io.touch(furi,function(err,uri){
        if ( err ) {
          husky.error(err);
          return false;
        }

        husky.modules.io.openFileToBuffer([uri, huskyCore.currentViewport],2);
        huskyCore.emit('buffersChange');

      });

    });

  };

  explorerm.refreshList = function() {

    var autoExpand = {};

    //Save pre-opened folders.
    for ( var i=0; i<directoryList.length; i++ ) {
      if ( directoryList[i].el.classList.contains('expanded') ) {
        var turi = directoryList[i].el.getAttribute('data-uri');
        autoExpand[turi] = true;
      }
    }

    //Clear the list.
    elList.innerHTML = '';
    directoryList = [];
    directories = {};
    explorerm.prefillList(husky.currentDirectory, false, function(){

      for ( var i=0; i<directoryList.length; i++ ) {

        var turi = directoryList[i].el.getAttribute('data-uri');
        var ttype = directoryList[i].el.getAttribute('data-type');

        if ( ttype == 'file' ) {

          if ( husky.isBufferOpen(directoryList[i].uri) ) {
            directoryList[i].el.classList.add('active');
          } else {
            directoryList[i].el.classList.remove('active');
          }

        } else if ( ttype == 'directory' ) {

          if ( autoExpand.hasOwnProperty(turi) ) {
            explorerm.expandSubFolder(turi, directoryList[i].el);
          }

        }
      }

    });
    lastDirectoryUsed = husky.currentDirectory;

  };

  explorerm.isBlocked = function( name, type ) {

    var blockedExtensions = {
      '.dat': true,
      '.so': true,
      '.exe': true,
      '.zip': true,
      '.tar': true,
      '.rar': true,
      '.tar.gz': true,
      '.swp': true,
      '.pak': true
    };

    if ( type === 'file' ) {
      var ext = name.substring(name.lastIndexOf('.'));
      if ( blockedExtensions.hasOwnProperty(ext) ) return true;
    } else if ( type === 'directory' ) {
      //Block directories that are hidden.
      if ( name.substring(0,1) === '.' ) {
        return true;
      }
    }

    return false;

  };

  //Get directory contents.
  explorerm.prefillList = function(uri, parent, callback) {

    var parentEl, noParent = false;
    if ( typeof uri === 'undefined' ) uri = null;
    if ( typeof parent === 'undefined' || parent === false ) {
      parent = elList;
      noParent = true;
    }

    var fsDriver = husky.config.activeDriver.fs || null;
    if (! fsDriver ) {
      husky.error('No fs driver registered. Cannot prefillList.');
      return false;
    }

    //Get URI of current file.
    if ( uri === null ) {
      if ( typeof husky.buffers[husky.currentKey] !== 'undefined' ) {
        uri = husky.viewports[husky.currentKey].uri;
      }
    }

    if ( directories.hasOwnProperty(uri) ) return false;
    if ( noParent === true ) {
      lastDirectoryUsed = uri;
    }

    husky.drivers[fsDriver].ls(uri,function(err,ls){
      if ( err ) {
        husky.error('Unable to "ls" file directory. If you are running husky on the web, you probably need to authenticate first.')
        return false;
      }

      var dirs = [], files = [];

      //Reorder, set directories first.
      for ( var i=0; i<ls.length; i++ ) {
        if ( ls[i].type === 'directory' ) {
          dirs.push(ls[i]);
        } else {
          files.push(ls[i]);
        }
      }

      for ( var i=0; i<files.length; i++ ) {
        dirs.push(files[i]);
      }


      for ( var i=0; i<dirs.length; i++ ) {
        if (! explorerm.isBlocked(dirs[i].name, dirs[i].type) ) {
          explorerm.addItemToMenu(dirs[i],parent);
        }
      }

      directories[uri] = uri;

      if ( typeof callback !== 'undefined' ) {
        callback();
      }

    });

  };

  //Executes upon registration from husky core callback.
  explorerm.init = function() {

    elWrapper = document.createElement('nav');
    elWrapper.id = 'explorer';
    elWrapper.className = 'explorer-wrapper explorer-wrapper-active';

    elList = document.createElement('ol');
    elList.id = 'explorer-list';
    elList.className = 'explorer-list';

    elWrapper.appendChild(elList);

    document.getElementById('viewport').appendChild(elWrapper);

    //Hotkeys.
    window.addEventListener('keydown', function(e){
      if ( e.keyCode === 69 && e.ctrlKey === true ) {
        explorerm.toggle();
        e.preventDefault();
      }
    });

    //Callback hooks into core.
    huskyCore.on('buffersChange', explorerm.refreshList);

    //Preload list.
    explorerm.prefillList(husky.currentDirectory);

  };

};

huskyCore.registerModule('explorer', explorer);
