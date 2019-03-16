var lastSaved = '';
var curVersion = 0;

$(window).on('unload', function() {
	alert("Bye now!");
});
  
(function () {
	var editing = false;
	var initializing = true;

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
			$('.save-notes').addClass('loading');
			var d = prepareNotesForSave();
			var html = d.html();
	
			if ($('.note', d).length==0) {
				console.log('non salvo perchè 0 note');
				return;
			}
	
			localStorage.setItem('localNotes', html);

			aws.put('hp-notes', 'paolo-hp-notes.html', html).then(function(){
				console.log('saved on AWS');
				$('.save-notes').removeClass('loading');
			});
		}
	
		// function buildUiFromHtml(x) {
		// 	x = $(x);
		// 	if (!x.is('.notes'))
		// 		x = $('<div/>').addClass('notes').append(x);

		// 	//$('.note',x).addClass('cat-filtered');
		// 	$('.notes').remove();
		// 	x.appendTo('body');
		// 	var n = $('.note', $(x)).length;
		// 	console.log('restored '+n+' notes');
		// 	$(".notes .note").initNote();
		// 	ui.restore();
		// }
	
		function createNewNote() {
			console.log('new note');
			var n = $('<div/>').addClass('note corsivo').appendTo('.notes');
			var h = $('<h2 class="title"><div class="text">nuova nota</div></h2>').appendTo(n);
			var b = $('<div class="body"/>').appendTo(n);
			n.addClass('col' + Math.floor(Math.random() * 12));
			n.addClass('rot' + Math.floor(Math.random() * 13));
			n.width(200).height(150);
			n.css({ top: Math.random() * 30, right: $('.notes').width()*.5-100 });
			n.initNote();
		}
	
		return {
			prepareNotesForSave: prepareNotesForSave,
			save: save,
			//buildUiFromHtml:buildUiFromHtml,
			createNewNote:createNewNote
		};
	}();

	var storage = function(){
		function getVersions(forceReload) {
			if (!getVersions.promise) {
				getVersions.promise = aws.listVersions('hp-notes', 'paolo-hp-notes.html').then(function(data){
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
			return getVersions().then(function(versions){
				return aws.get('hp-notes', 'paolo-hp-notes.html', versions[ver].VersionId);
			})
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

	var postit = function(){
		function init(){
			jQuery.fn.extend({
				initNote: initNote,
				putOnTop: putOnTop
			});
		}

		function initNote() {
			$(this).each(initSingleNote);
		}

		function initSingleNote(index, el) {
			var note = $(el);
			function addMenu() {
				function elimina() {
					setTimeout(function () {
						note.animate({ width: 0, height: 0, opacity: 0 }, 500, function () {
							note.remove();
						});
					}, 500);
				}
	
				function edit() {
					editor.editNote(note);
				}
			
				function corsivo() { 
					note.toggleClass('corsivo'); 
				}
	
				function changeColor() {
					var col = 11, cl = note.attr('class').split(' ');
					for (var i = 0; i < cl.length; i++) {
						let x = cl[i];
						if (x.indexOf('col') == 0) {
							col = x.substring(3) - 0;
							note.removeClass(x);
							break;
						}
					}
					col = (col + 1) % 12;
					console.log('new color: ' + col);
					note.addClass('col' + col);
				}
			
				var id = "n" + Math.floor(Math.random() * 1000000000);
				var container = $('.title', note);

				var checkbox = $('<div/>').addClass('checkbox').prependTo(container);
				checkbox.click(function(){
					noteCategory.toggleNote(note);
					noteCategory.updateNotes();
				});

				note.removeAttr('id').attr('id', id);
				$('.button', container).remove();
				var b = $('<div class="button menu"><img src="img/menu.png"/></div>').appendTo(container);
				// $( ".button", div).disableSelection();
				items = {
					edit: { name: 'Edit', callback: edit},
					changeColor: { name: 'Cambia colore', callback: changeColor},
					corsivo: { name: 'Corsivo', callback:  corsivo},
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
			noteCategory.addLabel(note);
			note.draggable({
				start: function () { note.putOnTop(); },
				handle: $(".title", note)
			});
			note.resizable({
				stop: function () {
					$('.body', note).css({ height: note.height() - 38 });
				},
				start: function () { note.putOnTop();  }
	
			});
	
	
			note.click(function () { 
				note.putOnTop(); 
			});
			note.dblclick(function () {
				note.putOnTop();
				if (note.is('.zoomed')) {
					note.removeClass('zoomed');
					note.addClass('minimized');
				} 
				else if (note.is('.minimized')) {
					note.removeClass('minimized');
					note.removeClass('zoomed');
				}
				else {
					note.removeClass('minimized');
					note.addClass('zoomed');
				}
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

		function putOnTop() {
			$(this).each(putOnTopSingleNote);
		}
	
		function putOnTopSingleNote(index, el) {
			var note = $(el)
			$('.note').each(function (i, el) {
				$(el).attr('data-position', i);
			});
	
			var isTop = note.attr('data-position') == $('.note').length - 1;
			console.log('putOnTop istop=' + isTop + ' n=' + $('.note').length + ' top=' + $('.on-top').length + ' pos=' + note.attr('data-position'));
			if (!isTop) {
				$('.note').removeClass('on-top');
				note.addClass('on-top');
				$('.notes').append(note.detach());
				$('.note').each(function (i, el) {
					$(el).attr('data-position', i);
				});
			}
		}
	
		return {
			init:init
		}
	}();

	var ui = function() {
		var status = {
			filter: null,
			categories: {},
			positions: []
		};

		function init() {
			setFont();
			addTopPanel();
			restore();
		}

		function setFont() {
			// var noteFont = "Sedgwick Ave";
			//var noteFont = "Architects Daughter";
			var noteFont = "Indie Flower";

			// var href="https://fonts.googleapis.com/css?family="+encodeURI(noteFont);
			var href = "img/font.css";
			$('<link/>').attr({ href: href, rel: 'stylesheet' }).appendTo('head');
			setTimeout(function loadCKEditor() {
				return $.ajax({
					dataType: "script",
					cache: true,
					url: "https://cdn.ckeditor.com/4.11.1/full-all/ckeditor.js"
				});
			}, 2000);
		}

		function addTopPanel() {
			function filterChanged() {
				var pattern = $('.filter').val().toUpperCase().trim();
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
	
		function save() {
			if (!save.delayed)
				save.delayed = _.debounce(f, 10000);
			return save.delayed();

			function f() {
				if (initializing)
					return;
				console.log('save UI');
				status.filter = $('.filter').val();
				status.categories = noteCategory.getStatus(true);
				localStorage.setItem('uiStatus', JSON.stringify(status, null,2));
			}
		}

		function restore() {
			var x = localStorage.getItem('uiStatus');
			if (x)
				status = JSON.parse(x);
			$('.filter').val(status.filter || '');
			noteCategory.init(status.categories);
		}

		function getStatus() {
			return status;
		}

		function buildFromHtml(x) {
			x = $(x);
			if (!x.is('.notes'))
				x = $('<div/>').addClass('notes').append(x);

			//$('.note',x).addClass('cat-filtered');
			$('.notes').remove();
			x.appendTo('body');
			var n = $('.note', $(x)).length;
			console.log('restored '+n+' notes');
			$(".notes .note").initNote();
			restore();
		}


		return {
			init: init,
			save: save,
			restore:restore,
			getStatus:getStatus,
			buildFromHtml: buildFromHtml
		}
	}();


	var editor = function() {
		var instance = null;
		var savedTitle, savedBody, target, currNote;
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
	
		function editNote(note) {
			currNote = note;
			savedTitle = $('.title .text', note).html();
			savedBody = $('.body', note).html();
			target = $('.body', note);
			$('.note').not(note).addClass('not-editing');
			note.addClass('editing');
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
		$('.tree-panel').hide();
		postit.init();
		ui.init();

		noteCategory.onChange.progress(ui.save);

		var localNotes = localStorage.getItem('localNotes');
		if (localNotes) {
			ui.buildFromHtml(localNotes);
		}
		
		storage.setVersion(0).then(function(){
			ui.restore();
			$('.tree-panel').show();
			initializing = false;
		}); // 0 = most recent
	}


	window.setVersion = storage.setVersion;
	window.save = notes.save;
	window.regredisci = storage.regredisci;

	$(init);

})();

