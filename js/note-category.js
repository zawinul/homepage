var noteCategory = (function () {
	var initialized = false;
	var container;
	var onChange = $.Deferred();
	var status;

	function addLabel(note) {
		$('.category-label', note).remove();
		var cat = note.attr('data-category');
		if (!cat)
			note.attr('data-category', cat='');
	
		var c = $('<div/>').addClass('category-label').text(cat).appendTo($('.title', note));
		c.click(function() {
			var x = prompt('categoria', cat);
			if (x!=null) {
				note.attr('data-category', x.trim());
				c.text(x||' ');
			}
		});
	}

	function init(_status) {
		if (_status)
			status = _status;
		buildUiTree();
		updateNotes();
	}

	function getStatus(refresh) {
		if (!refresh && status)
			return status;
		try {
			console.log('get status refresh');
			var s = {
				selected: [],
				opened: []
			};
	
			var x = $(".internal").jstree(true).get_json('#', {'flat': true});
			for(var i=0; i<x.length; i++) {
				let n = x[i];
				if(n.state.opened)
					s.opened.push(n.id);
				if(n.state.selected)
					s.selected.push(n.id);
			}
			status = s;
		}catch(e) {}
		return status;
	}

	function getDataFromNotes() {
		status = status || getStatus();
		var leafMap = {};

		function insert(name, tree, position) {
			//console.log('insert '+name);
			var arr = name.split('/');
			if (arr.length==0)
				return;
			if (position>=arr.length)
				return;
			var nodename = arr.slice(0,position+1).join('/');
			if (!nodename)
				return;
			var node = _.find(tree, function(x) { return x.id==nodename;});
			if (!node) {
				opened = (status&&status.opened) ? status.opened.indexOf(nodename)>=0 : true;
				selected = (status&&status.selected) ? status.selected.indexOf(nodename)>=0 : false;
				node = { 
					id: nodename,
					text:arr[position], 
					state:{ 
						opened: opened,
						selected: selected
					},
					children:[]
				};
				leafMap[nodename] = node.children;
				//console.log('insert leaf ['+nodename+']');
				//console.log('push nodename='+nodename+' text='+arr[position]+' p='+position);
				tree.push(node);
			}
			if (arr.length==1)
				return;
			//node.children = node.children || [];
			insert(name, node.children, position+1);
		}

		if (initialized) {
			selected = container.jstree('get_selected');
		}

		var data = [{
			id: '_root_', 
			text:'', 
			state:{ opened:true},
			children:[]
		}];

		// costruisci struttura
		$('.note').each(function () { 
			var note = $(this);
			var cat = note.attr('data-category');
			if (cat.indexOf('/')==0) {
				cat = cat.substring(1);
				note.attr('data-category', cat);
			}
			// insert(cat.split('/'), data, cat);
			insert(cat, data[0].children, 0);
		});

		// appendi le foglie
		$('.note').each(function () { 
			var note = $(this);
			var cat = note.attr('data-category');
			var txt = $('.title .text', note).text().trim();
			//console.log('append cat=['+cat+'] '+txt);
			var container = leafMap[cat];
			if (!container) {
				console.log('### manca il container per ['+cat+']');
				return;
			}
			var name = cat+":"+txt; 
			var selected = (status&&status.selected) ? status.selected.indexOf(name)>=0 : true;
			//console.log("SEARCH "+selected+" "+name);
			container.push({
				id: name,
				text:txt, 
				selected: true
			});
		});

		console.log({getData:data});
		return data;
	}

	function buildUiTree() {
		status = status || getStatus();
		var	data = getDataFromNotes();
		$('body .tree-panel').remove();
		var tp = $('<div class="tree-panel"/>').appendTo('body');
		container = $('<div class="internal"/>').appendTo(tp);
		container.jstree({
			"plugins": [ "checkbox"],
			'core': { 'data': data }
		});
		container.on("changed.jstree", function (e, data) {
			setTimeout(updateNotes,1);
		});

		var x = (status && status.selected)?status.selected.slice(0):[];
		setTimeout(function(){
			for(var i=0; i<x.length; i++) 
				container.jstree(true).select_node(x[i]);
		}, 0);

		initialized = true;
	}

	function updateNotes() {
		console.log('cat updateNotes');
		var st = getStatus(true);

		$('.note').each(function() {
			var note = $(this);
			var cat = note.attr('data-category');
			var fullPath = cat+":"+$('.title .text', note).text().trim();
			var ok = cat.trim()=='' || st.selected.length==0 || st.selected.indexOf(cat)>=0 || st.selected.indexOf(fullPath)>=0;
			note.toggleClass('cat-filtered', !ok);
			note.toggleClass('cat-ok', ok);
		});
		onChange.notify();
	}

	function toggleNote(note) {
		var cat = note.attr('data-category');
		var txt = $('.title .text', note).text().trim();
		var id = cat+":"+txt;
		var sel = '[id="'+id+'"] .jstree-checkbox';
		var x = $(sel);
		console.log("sel="+sel+" n="+x.length);
		$(sel).trigger('click');
		//updateNotes();
	}


	function setStatus(_status) {
		status = _status;
		buildUiTree();
	}


	return {
		init: init,
		addLabel: addLabel,
		buildUiTree: buildUiTree,
		updateNotes: updateNotes,
		toggleNote: toggleNote,
		getStatus: getStatus,
		setStatus: setStatus,
		onChange: onChange
	}
})();

