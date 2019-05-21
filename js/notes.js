var lastSaved = '';
var curVersion = 0;

$(window).on('unload', function() {
	console.log('ON UNLOAD');
	//saveUi();
});
  
(function () {
	var editing = false;

	var notes = function(){ 

		// prende tutte le note e le ripulisce, 
		// ritorna un $(div) pronto per il save
		function prepareNotesForSave() {
			// clona l'oggetto notes in un contenitore
			var d = $('<div/>');
			d.append($('.notes').clone());
			console.log(' pre filter: '+$('.note', d).length);

			// toglie elementi non significativi
			var rem = '.ui-resizable-handle,.checkbox,.context-menu-list,.button,.category-label';
			$(rem, d).remove();
			$('.note', d).css('display','');
			console.log(' post filter: '+$('.note', d).length);
	
			// toglie classi non significative
			$('*', d).removeClass('filtered cat-filtered editing not-editing contenteditableui-draggable ui-draggable ui-draggable-handle ui-resizable ui-draggable-dragging ui-resizable-resizing');
			return d;
		}

		// salva su localstorage e su AWS
		function save() {
			if ($('.note').length==0) {
				console.log('non salvo perchè 0 note');
				return;
			}
			$('.save-notes').addClass('loading');
			var s = extract();
		
			localStorage.setItem('localNotes', s);

			aws.put('hp-notes', 'paolo-hp-notes-v2.html', s).then(function(){
				$('.save-notes').removeClass('loading');
				alert('saved on AWS');
			});
		}
	
		function createNewNote() {
			function newId() {
				var x = Math.floor(Math.random()*1000000000+1000000000);
				x = 'n'+x.toString().substring(1);
				if ($('#'+id).length>0)
					return newId();
				return x;
			}
			console.log('new note');
			var id = newId();
			var col = Math.floor(Math.random()*12);
			var n = $('<div/>').addClass('note').appendTo('.notes');
			n.attr('id', id);
			var h = $('<h2 class="title"><div class="text">nuova nota</div></h2>').appendTo(n);
			var b = $('<div class="body"/>').appendTo(n);
			n.addClass('col' + col);
			n.width(200).height(150);
			n.css({ top: Math.random() * 30, right: $('.notes').width()*.5-100 });

			var descr =  {
				"id": id,
				"x": Math.floor(Math.random()*500+10),
				"y": Math.floor(Math.random()*100+10),
				"width": 200,
				"height": 150,
				"position": "0",
				"category": "",
				"title": "nuova nota",
				"color": col
			};
			showcase.notes[id] = descr;
			n.css({
				left: descr.x,
				top: descr.y,
				width: descr.width,
				height: descr.height
			});

			n.initNote();
			invalidateShowcase();
		}
	
		return {
			save: save,
			createNewNote:createNewNote
		};
	}();

	var storage = function(){
		function getVersions(forceReload) {
			if (!getVersions.promise || forceReload) {
				getVersions.promise = aws.listVersions('hp-notes', 'paolo-hp-notes-v2.html').then(function(data){
					versions = data.Versions;
					console.log({VERSIONI:data});
					console.log('SONO PRESENTI '+versions.length+' VERSIONI');
					return versions;
				});
			}
			return getVersions.promise;
		}
	
		function getVersion(ver) {
			console.log('get version '+ver);
			if (!ver)
				return aws.get('hp-notes', 'paolo-hp-notes-v2.html');
			else
				return getVersions().then(function(versions){
					return aws.get('hp-notes', 'paolo-hp-notes-v2.html', versions[ver].VersionId);
				});
		}
	
		function setVersion(ver) {
			$('.save-notes').addClass('loading');
			return getVersion(ver).then(function(x) {
				console.log({VERSION: {a:ver, b:x}});
				lastSaved = x;
				curVersion = ver;
				ui.buildFromHtml(x);
				localStorage.setItem('localNotes', x);
				$('.save-notes').removeClass('loading');
				return x;
			});
		}

		function regredisci() {
			setVersion(curVersion+1).then(function() {
				console.log("CUR VERSION = "+curVersion);
			});
		}
	
	
		return {
			getVersions:getVersions,
			getVersion:getVersion,
			setVersion:setVersion,
			regredisci: regredisci
		}
	}();

	function extendJQuery(){
		function initSingleNote(index, el) {
			var note = $(el);
			var id = note.attr('id');
			var descr = showcase.notes[id];
			function addMenu() {
				function elimina() {
					setTimeout(function () {
						note.animate({ width: 0, height: 0, opacity: 0 }, 500, function () {
							note.remove();
							delete showcase.notes[id];
							invalidateShowcase();
						});
					}, 500);
				}
	
				function edit() {
					editor.editNote(id);
				}
	
				function changeColor() {
					note.removeClass('col'+descr.color);
					descr.color = (descr.color+1)%12;
					note.addClass('col'+descr.color);
					invalidateShowcase();
				}
			
				var container = $('.title', note);

				var checkbox = $('<div/>').addClass('checkbox').prependTo(container);
				checkbox.click(function(){
					noteCategory.toggleNote(id);
					noteCategory.updateNotes();
				});

				$('.button', container).remove();
				var b = $('<div class="button menu"><img src="img/menu.png"/></div>').appendTo(container);
				// $( ".button", div).disableSelection();
				items = {
					edit: { name: 'Edit', callback: edit},
					changeColor: { name: 'Cambia colore', callback: changeColor},
					elimina: { name: 'Elimina', callback:  elimina}
				};
				$.contextMenu({
					selector: '#' + id + ' .menu',
					appendTo: 'body',
					trigger: 'left',
					autoHide: false,
					items: items
				});
			}
		
			addMenu();
			noteCategory.addLabel(id);
			note.draggable({
				start: function () { 
					note.putOnTop(); 
				},
				stop: function(event, ui) { 
					descr.x = ui.position.left; 
					descr.y = ui.position.top; 
					console.log('x:' +descr.x+' , y:'+descr.y);
					invalidateShowcase();
				},
				handle: $(".title", note)
			});
			note.resizable({
				stop: function () {
					$('.body', note).css({ height: note.height() - 38 });
					descr.width = note.width();
					descr.height = note.height();
					invalidateShowcase();
				},
				start: function () { note.putOnTop();  }
	
			});
	
			note.click(function () { 
				note.putOnTop(); 
			});
			note.dblclick(function () {
				note.putOnTop();
				note.toggleClass('zoomed');
			});
			$('.title', note).click(function () {
				if (editing) 
					editor.setTarget('.title .text');
			});
			$('.body', note).click(function () {
				if (editing) 
					editor.setTarget('.body');
			});
		}

		function putOnTopSingleNote(index, el) {
			var note = $(el);
			console.log('putOnTop '+$('.title .text', note).text());
			var id = note.attr('id');
			showcase.notes[id].position=999999;
			
			var notes = [];
			for(var k in showcase.notes)
				notes.push(showcase.notes[k]);
			
			notes.sort((a,b)=>a.position-b.position);
			for(var i=0; i<notes.length; i++) {
				var descr = notes[i];
				var n = $('#'+descr.id);
				descr.position = i+1;
				n.css({ zIndex: i+1 }).removeClass('on-top');
			}
			note.addClass('on-top');
			invalidateShowcase();
		}

		jQuery.fn.extend({
			initNote: function() {
				$(this).each(initSingleNote);
			},
			putOnTop: function(){
				$(this).each(putOnTopSingleNote);
			}
		});
	};

	function uiInit() {

		function loadCkEditor() {
			setTimeout(function loadCKEditor() {
				return $.ajax({
					dataType: "script",
					cache: true,
					url: "https://cdn.ckeditor.com/4.11.1/full-all/ckeditor.js"
				});
			}, 2000);
		}

		loadCkEditor();

		function filterChanged() {
			var pattern = $('.filter').val().toUpperCase().trim();
			showcase.filter = pattern; 
			var filterOn = !!pattern;
			$('.filter,.magnifier').toggleClass('filter-on', filterOn);

			if (!filterOn) {
				$('.note').removeClass('filter-excluded filter-selected');
				return; 
			}

			function filtered(note) {
				if (!filterOn)
					return true;
				if ($('.title .text', this).text().toUpperCase().indexOf(pattern) >= 0)
					return true;
				if ($('.body', this).text().toUpperCase().indexOf(pattern) >= 0)
					return true;
				return false;
			}
			

			var fset = $('.note').filter(filtered);
			console.log("TOT:"+$('.note').length+" fset:"+fset.length);
			fset.addClass('filter-selected').removeClass('filter-excluded');
			$('.note').not(fset).addClass('filter-excluded').removeClass('filter-selected');
			console.log('filter: [' + pattern + '] #' + fset.length);
			save();
		}
	
		$('body .note-panel').remove();
		var p = $('<div/>').addClass('note-panel').appendTo('body');
		var inp = $('<input/>').addClass('filter').appendTo(p);
		inp.on('keypress keyup blur focus change', filterChanged);
		$('<img/>').addClass('magnifier').attr('src', 'img/magnifier.png').appendTo(p);

		var s = $('<div/>').addClass('save-notes').appendTo(p);
		$('<img/>').attr('src', 'img/save.png').appendTo(s);
		$('<img/>').attr('src', 'img/spin-1s-16px.gif').addClass('loader').appendTo(s);
		s.click(notes.save);

		var b = $('<div/>').addClass('new-note').appendTo(p);
		$('<img/>').attr('src', 'img/new-note.png').appendTo(b);
		b.click(notes.createNewNote);

		var l = $('<div/>').addClass('linear').appendTo(p);
		$('<img/>').attr('src', 'img/list.png').appendTo(l);
		l.click(function(){ $('body').addClass('linear'); });

		var o = $('<div/>').addClass('overlapping').appendTo(p);
		$('<img/>').attr('src', 'img/overlap.png').appendTo(o);
		o.click(function(){ $('body').removeClass('linear'); });
	}


	var editor = function() {
		var instance = null;
		var savedTitle, savedBody, target, currNote, currNoteId;
		function init() {
			if (instance)
				return;
			$('#editor1').show().css({ zIndox: 200 });
			instance = window.editorInstance = CKEDITOR.replace('editor1', {
				startupFocus: true,
				enterMode: CKEDITOR.ENTER_BR,
				shiftEnterMode: CKEDITOR.ENTER_BR
			});
	
			instance.addCommand("chiudiEditor", { // create named command
				exec: function (edt) {
					$('.notes .note').removeClass('editing').removeClass('not-editing');
					var data = edt.getData();
					target.html(data);
					instance.destroy();
					$('#editor1').hide();
					$('body').removeClass('editor-opened');
					instance = null;
					editing = false;
					var title = $('.title .text', currNote).text().trim();
					showcase.notes[currNoteId].title = title;
					invalidateShowcase();
				}
			});
	
			instance.addCommand("abbandonaEditor", { // create named command
				exec: function (edt) {
					$('.notes .note').removeClass('editing').removeClass('not-editing');
					instance.destroy();
					$('#editor1').hide();
					$('body').removeClass('editor-opened');
					instance = null;
					target.html(savedData);
					editing = false;
				}
			});
	
			instance.ui.addButton('chiudiEditor', { // add new button and bind our command
				label: "Click me",
				command: 'chiudiEditor',
				toolbar: 'mode,2',
				icon: location.href + '/img/Ok-PNG-Picture.png'
			});
	
			instance.ui.addButton('abbandonaEditor', { // add new button and bind our command
				label: "Click me",
				command: 'abbandonaEditor',
				toolbar: 'mode,1',
				icon: location.href + '/img/no-icon.png'
			});
	
			instance.on('change', function (evt) {
				target.html(evt.editor.getData());
			});
	
			instance.on('blur', function (evt) {
				console.log('blur');
			});
			instance.on('focus', function (evt) {
				console.log('focus');
			});
		}
	
		function editNote(id) {
			currNoteId = id;
			currNote = $('#'+id);
			savedTitle = $('.title .text', currNote).html();
			savedBody = $('.body', currNote).html();
			target = $('.body', currNote);
			$('.note').not(currNote).addClass('not-editing');
			currNote.addClass('editing');
			init();
			instance.setData(savedBody);
			editing = true;
			$('body').addClass('editor-opened');
		}

		function setTarget(selector) {
			target = $(selector, currNote);
			instance.setData(target.html());
		}

		return {
			init:init,
			editNote: editNote,
			setTarget: setTarget
		};
	}();


	function init() {
		$('#editor1').hide();
		extendJQuery();
		uiInit();
	}

	$(init);

})();

function provaBackground() {
	var url = prompt('background url');
	if (!url)
		return;
	$('body').css({
		backgroundImage: 'url("'+url+'")',
		backgroundSize: 'cover'
	});
}

Mousetrap.bind('ctrl+b', provaBackground);