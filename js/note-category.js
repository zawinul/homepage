var noteCategory = (function () {
	var initialized = false;
	var container;
	var tree;

	function addLabel(id) {
		var descr = showcase.notes[id];
		var note = $('#'+id);
		$('.category-label', note).remove();
		var cat = descr.category || '';
	
		var c = $('<div/>').addClass('category-label').text(cat).appendTo($('.title', note));
		c.click(function() {
			var x = prompt('categoria', cat);
			if (x!=null) {
				descr.category = x.trim();
				c.text(descr.category);
			}
		});
	}

	function init() {
		buildUiTree();
		updateNotes();
	}


	function getDataFromNotes() {
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
				closed = showcase.categories.closed.indexOf(nodename)>=0;
				selected = showcase.categories.selected.indexOf(nodename)>=0;
				node = { 
					id: nodename,
					text:arr[position], 
					state:{ 
						opened: !closed,
						selected: selected
					},
					children:[]
				};
				leafMap[nodename] = node.children;
				tree.push(node);
			}
			if (arr.length==1)
				return;
			//node.children = node.children || [];
			insert(name, node.children, position+1);
		}

		var data = [{
			id: '_root_', 
			text:'', 
			state:{ opened:true},
			children:[]
		}];

		leafMap[''] = data[0].children;

		// costruisci struttura
		for(var id in showcase.notes) {
			var descr = showcase.notes[id];
			var cat = descr.category;
			if (cat.indexOf('/')==0) {
				cat = cat.substring(1);
				descr.category = cat;
			}
			insert(cat, data[0].children, 0);
		};

		// appendi le foglie
		for(var id in showcase.notes) {
			var descr = showcase.notes[id];
			var cat = descr.category;
			var txt = descr.title;
			//console.log('append cat=['+cat+'] '+txt);
			var container = leafMap[cat];
			if (!container) {
				console.log('### manca il container per ['+cat+']');
				return data;
			}
			var name = cat+":"+txt; 
			//console.log("SEARCH "+selected+" "+name);
			selected = showcase.categories.selected.indexOf(name)>=0;

			container.push({
				id: name,
				text:txt, 
				state: {
					selected: selected
				}
			});
		};

		//console.log({getData:data});
		return data;
	}

	function buildUiTree() {
		var	data = getDataFromNotes();
		$('body .tree-panel').remove();
		var tp = $('<div class="tree-panel"/>').appendTo('body');
		container = $('<div class="internal"/>').appendTo(tp);
		tree = container.jstree({
			"plugins": [ "checkbox"],
			'core': { 'data': data }
		});
		container.on("changed.jstree", function (e, data) {
			setTimeout(updateNotes,1);
		});
		container.on("open_node.jstree close_node.jstree", function(evt, node){
			showcase.categories.closed.length = 0;
			$('li[role="treeitem"].jstree-closed').each(function(i,node) { 
				showcase.categories.closed.push(node.id); 
			});
			invalidateShowcase();
		});

		var x = showcase.categories.selected.slice(0);
		setTimeout(function(){
			for(var i=0; i<x.length; i++) 
				container.jstree(true).select_node(x[i]);
		}, 0);

		initialized = true;
	}

	function updateNotes() {
		console.log('cat updateNotes');
		var newSelected = tree.jstree('get_selected');
		for(var id in showcase.notes) {
			var descr = showcase.notes[id];
			var note = $('#'+id);
			var all = newSelected.length==0;
			var fullPath = descr.category+":"+descr.title;
			var top = descr.category=='';
			var wasOk = note.is('.cat-ok');
			var ok = top || all || newSelected.indexOf(descr.category)>=0 
				|| newSelected.indexOf(fullPath)>=0;

			note.toggleClass('cat-filtered', !ok);
			note.toggleClass('cat-ok', ok);
			if (ok && !wasOk)
				note.putOnTop();
			//console.log('ok='+ok+' top='+top+' all='+all+' nlen='+$('#'+id).length+' ['+id+'] '+fullPath);
		}
		showcase.categories.selected = newSelected;
		invalidateShowcase();
	}

	function toggleNote(id) {
		var descr = showcase.notes[id];
		var name = descr.category+":"+descr.title;
		$('#'+id).putOnTop();
		var treeNode = $('[id="'+name+'"] .jstree-checkbox');
		treeNode.trigger('click');
	}

	return {
		init: init,
		addLabel: addLabel,
		buildUiTree: buildUiTree,
		updateNotes: updateNotes,
		toggleNote: toggleNote
	}
})();

