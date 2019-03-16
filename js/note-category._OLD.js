var noteCategory = (function () {
	var initialized = false;
	var container;
	var opts = {};
	var selected = [];
	var opened = [];

	function addLabel(note) {
		$('.category-lebel', note).remove();
		var cat = note.attr('data-category');
		if (!cat)
			note.attr('data-category', cat='');
	
		var c = $('<div/>').addClass('category-label').text(cat).appendTo($('.title', note));
		c.click(function() {
			var x = prompt('categoria', cat);
			if (x!=null) {
				note.attr('data-category', x.trim());
				c.text(x||' ');
				if (opts && opts.save)
					setTimeout(function(){
						buildTree(getData());
						var d = { selected: container.jstree('get_checked') };
						opts.save(JSON.stringify(d));
					},1);
			}
		});
	}

	function init(options) {
		opts = options;
		var d = getData();
		buildTree(d);
		update();
	}

	function getStatus() {
		selected = [];
		opened = [];
		try {
			var x = $(".internal").jstree(true).get_json('#', {'flat': true});
			for(var i=0; i<x.length; i++) {
				let n = x[i];
				if(n.state.opened)
					opened.push(n.id);
				if(n.state.selected)
					selected.push(n.id);
			}
			console.log({opened:opened, selected:selected});
		}catch(e) {}
	}

	function getData() {
		getStatus();
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
			var id = nodename;
			var node = _.find(tree, function(x) { return x.id==id;});
			if (!node) {
				node = { 
					id: id, 
					text:arr[position], 
					state:{ opened:true},
					children:[]
				};
				leafMap[name] = node.children;
				console.log('insert leaf ['+name+']');
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
		// $('.note').each(function () { 
		// 	var note = $(this);
		// 	var cat = note.attr('data-category');
		// 	var txt = $('.title .text', note).text().trim();
		// 	console.log('append cat=['+cat+'] '+txt);
		// 	var container = leafMap[cat];
		// 	if (!container) {
		// 		console.log('### manca il container per ['+cat+']');
		// 		return;
		// 	}
		// 	container.push({
		// 		id: cat+":"+txt, 
		// 		text:txt, 
		// 	});
		// });

		console.log({getData:data});
		return data;
	}

	function buildTree(data) {
		if (!data)
			data = getData();
		$('body .tree-panel').remove();
		var tp = $('<div class="tree-panel"/>').appendTo('body');
		container = $('<div class="internal"/>').appendTo(tp);
		container.jstree({
			"plugins": [ "checkbox"],
			'core': { 'data': data }
		});
		container.on("changed.jstree", function (e, data) {
			console.log("changed.jstree " + data.selected);
			setTimeout(update,1);
		});
		initialized = true;
	}

	function update() {
		console.log('cat update');
		getStatus();

		$('.note').each(function() {
			var note = $(this);
			var cat = note.attr('data-category');
			var ok = cat.trim()=='' || selected.length==0 || selected.indexOf(cat)>=0;
			note.toggleClass('cat-filtered', !ok);
			note.toggleClass('cat-ok', ok);
		});
		if (opts && opts.save)
			opts.save(JSON.stringify({selected:selected, opened:opened}));
	}

	return {
		init: init,
		addLabel: addLabel,
		buildTree: buildTree,
		update: update
	}
})();

