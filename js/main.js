

function p(d) {
	alert(d);
}

function ipconfig() {
	var p = $.Deferred();
	$.ajax({
		method:'GET',
		url: "http://127.0.0.1/web/shell.php?cmd=ipconfig", 
		success:function(x){
			process(x);
		}
	});
	
	function process(txt) {
		txt = txt.split('\n');
		var a = [], b=[];
		for(var i=0; i<txt.length; i++) {
			let row = txt[i];
			if (row.indexOf('Scheda ')==0) {
				a.push(b);
				b=[];
			}
			b.push(row);
			if (row.indexOf('Indirizzo IPv4')>=0) {
				b.ip4 = row;
			}
		}
		a.push(b);

		//console.log(a);
		a = a
			.filter(function(x) { return x.ip4})
			.map(function(x) { return x.ip4.substring(x.ip4.indexOf(':')+2)+'\t'+x[0] })
			.join('\n');
		p.resolve(a);
	}
	return p;
}
ipconfig().done(console.log);
function showIpconfig() {
	ipconfig().then(function(x) { 
		return $('#ipconfig-space').empty().append(
			$('<pre/>').text(x)
		);
	})
}

function hh(filepath) {
	$.getJSON( "http://127.0.0.1/web/shell.php?callback=?", { act:'hh', 'file':filepath}, message);
}

function message(m) {
	$('.message').remove();
	var i = $("<pre class='message'>"+m+"</pre>");
	
	setTimeout(function() { $('body').append(i);}, 100); // delay to blink
}


function localhome() {
	location.href="file:///c:/paolo/web/localhomepage.html";
}

function setDataOra() {
	function s2(i) {
		return (""+(100+i)).substring(1,3);
	}
	
	var d = new Date();
	var mname = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
	var wname = ['dom','lun','mar','mer','gio','ven','sab'];
	var s = wname[d.getDay()] + ' ' + s2(d.getDate()) + ' '+mname[d.getMonth()] +
		'<br>' + s2(d.getHours()) + ':' + s2(d.getMinutes()) + ':' + s2(d.getSeconds());
	document.getElementById('ora').innerHTML = s;
	setTimeout(setDataOra, 1000);
}

$(setDataOra);
 
