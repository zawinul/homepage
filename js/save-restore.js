
// function saveOnFile(txt, filename, mime) {
// 	mime = mime || 'plain/text';
// 	filename=filename || 'file.txt'
// 	var blob = new Blob([txt], {type: 'text/plain'});
// 	var url = window.URL.createObjectURL(blob);
// 	var a = $('<a/>');
// 	a.appendTo('body').attr('href',url).attr('download',filename).hide();
// 	setTimeout(function() {
// 		a[0].click();
// 		window.URL.revokeObjectURL(url);
// 		a.remove();
// 	},1);
// }

function extract(onDataFunName) {
	onDataFunName = onDataFunName || 'onRestoreData';

	function prepareNotes() {
		// clona l'oggetto notes in un contenitore
		var d = $('<div/>');
		d.append($('.notes').clone());

		var rem = '.ui-resizable-handle,.checkbox,.context-menu-list,.button,.category-label';
		$(rem, d).remove();
		$('.note', d).removeAttr('style');
		$('.note', d).attr('class', 'note');

		$('*', d).removeClass('filtered cat-filtered editing not-editing contenteditableui-draggable ui-draggable ui-draggable-handle ui-resizable ui-draggable-dragging ui-resizable-resizing');
		return d;
	}

	conf = $.extend(true, {} , showcase);
	var script="<script>\n" +onDataFunName+"(" +JSON.stringify(conf,null,2)+");\n</script>\n";
	d = prepareNotes();
	d.append(script);
	return d.html();
}


function frestore_from_disk() {
	$('.notes').remove();
	$('.context-menu-list').remove();
	
	setTimeout(function(){
		var div = $('<div/>');
		div.load('./dump.html', function(){
			div.children().detach().appendTo('body');
		});
	}, 100);
}

function frestore_from_aws() {
	aws.get('hp-notes', 'paolo-hp-notes-v2.html').then(frestore_from_string);
}

function frestore_from_string(html) {
	var url = "data:text/html;base64,"+btoa(unescape(encodeURIComponent(html)));
	$('.maincontainer').remove();
	var div = $('<div/>').addClass('maincontainer').appendTo('body').hide();
	div.load(url);
}

function frestore_from_localstorage() {
	var x = localStorage.getItem('localNotes');
	if (x==null)
		aws.get('hp-notes', 'paolo-hp-notes-v2.html').then(function(html) {
			frestore_from_string(html);
			localStorage.setItem('localNotes', html);
		});
	else
		frestore_from_string(x);
}

function frestore() {
	return frestore_from_localstorage();
}


function onRestoreData(data) {
	showcase = data;
	$('.note').each(function(){
		var note = $(this);
		var id = note.attr('id');
		var descr = showcase.notes[id];
		initializeNote(note, descr);
	});
	noteCategory.init();
	setTimeout(function(){
		$('.maincontainer').fadeIn(100);
	}, 100)
}

function initializeNote(note, descr) {
	note.addClass('col'+descr.color);
	note.css({
		width: descr.width,
		height: descr.height,
		left: descr.x,
		top: descr.y,
		zIndex: descr.position
	});
	note.initNote();
}

function invalidateShowcase() {
	console.log('invalidate showcase');
	var html = extract();
	localStorage.setItem('localNotes', html);

}

$(function(){
	setTimeout(frestore, 100);
})