function initPWA() {
	var ret = $.Deferred();

	console.log('start app.js');

	if (!('serviceWorker' in navigator)) {
		return Promise.reject("serviceWorker non supportato");
	}

	navigator.serviceWorker.addEventListener('message', function(event){
		console.log(">>>Client 1 Received Message: " + event.data);
		if (event.data=="init-done")
			ret.resolve();
	});

	if (navigator.serviceWorker.controller) {
		console.log('active service worker found, no need to register');
		navigator.serviceWorker.controller.postMessage("initialize");
	} 
	else {
		console.log('active service worker NOT found!');
		navigator.serviceWorker.register('./service-worker-3.js?version=B33&x='+Math.random(), { scope: "./" }).then(
			function (reg) {
				navigator.serviceWorker.ready.then(function(){
					console.log('service worker ready');
					if (navigator.serviceWorker.controller)
						navigator.serviceWorker.controller.postMessage("initialize");
				});
				console.log('Service worker registrato scope:' + reg.scope);
			}, 
			function (err) {
				console.log('ServiceWorker registration failed: ', err);
			}
		);
	}
	return ret;
}

function sendPwaMessage(msg){
	if (navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage(msg);
		return true;
	}
	return false;
}



initPWA().then(function(){
	console.log("PARTITI!");
});

setTimeout(function(){
	sendPwaMessage("initialize");
}, 1000)