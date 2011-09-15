

var http = require("http");
var util = require("util");

http.createServer(function(request, response) {
	console.log(request.method+" "+request.url);
	//var proxy = http.createClient(80, request.headers['host'])
	var proxy = http.createClient(80, "sleepless.com")
	var proxy_request = proxy.request(request.method, request.url, request.headers);
	proxy_request.addListener('response', function (proxy_response) {
		proxy_response.addListener('data', function(chunk) {
			response.write(chunk, 'binary');
		});
		proxy_response.addListener('end', function() {
			response.end();
		});
		response.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
	request.addListener('data', function(chunk) {
		proxy_request.write(chunk, 'binary');
	});
	request.addListener('end', function() {
		proxy_request.end();
	});
}).listen(8880);
console.log("listening");

