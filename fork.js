

var http = require("http")
var fs = require("fs")
var util = require("util"), insp = util.inspect
var log5 = require("log5"), log = log5.mkLog("fork:")


var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }


var defaultConfig = {
	logLevel: 1,
	port: 80,
	forks:{
		default:"localhost:80",
	},
}
var config = defaultConfig


function start() {
	log(config.logLevel)
	log(insp(config))
	http.createServer(function(request, response) {
		log(3, request.method+" "+request.url);
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
	}).listen(config.port);
}


fs.readFile("config.json", function(e, s) {
	if(e)
		config = defaultConfig
	else
		config = j2o(s)
	start()
})


