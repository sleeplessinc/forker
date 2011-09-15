

var net = require("net")
var http = require("http")
var fs = require("fs")
var util = require("util"), insp = util.inspect
var log5 = require("log5"), log = log5.mkLog("fork:")


var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }


var defaultConfig = {
	logLevel: 1,
	port: 80,
	forks:{
		"default":	{ "host":"sleepless.com",	"port":80 }
	}
}
var config = defaultConfig


function accept(request, response) {

	var method = request.method
	var hdrs = request.headers
	var host = hdrs['host'].replace(/:\d+$/, "")
	
	var dest = config.forks[host]
	if(!dest) {
		dest = config.forks["default"]
		if(!dest) 
			dest = defaultConfig.forks["default"]
	}

	log(3, host+"  -->  "+dest.host+":"+dest.port)

	var socket = new net.Socket()
	socket.on("connect", function() {
		log(3, "(connect)")

		socket.on("data", function(data) {
			log(3, "(data from srv) ")
			response.write(data, 'binary')
		})
		request.on('data', function(data) {
			log(3, "(data from cli)")
			socket.write(data, 'binary')
		});
		socket.on("end", function() {
			log(3, "(((((((srv end))))))")
			response.end()
		})
		request.on("end", function() {
			log(3, "------cli end------")
			socket.end()
		})
		request.on("close", function() {
			log(3, "------cli close------")
			socket.end()
		})

		var l =
			request.method+" "+
			request.url+" HTTP/"+
			request.httpVersionMajor+"."+
			request.httpVersionMinor+"\r\n"
		socket.write(l)
		log(3, "   : "+l)

		hdrs['host'] = hdrs['host'].replace(/:\d+$/, ":"+dest.port)
		for(key in hdrs) {
			var h = key+": "+hdrs[key]
			socket.write(h+"\r\n")
			log(3, "   : "+h)
		}
		socket.write("\r\n")


	})
	socket.connect(dest.port, dest.host)

	/*
	var proxy = http.createClient(dest.port, dest.host)

	log(3, "headers: "+insp(request.headers));
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
	*/
}


function start() {
	log(config.logLevel)
	log(insp(config))
	http.createServer(function(request, response) {
		var host = request.headers['host']
		//log(3, insp(request))
		log(3, request.method+" "+host+" "+request.url);
		accept(request, response)
	}).listen(config.port);
}


fs.readFile("config.json", function(e, s) {
	if(e)
		config = defaultConfig
	else
		config = j2o(s)
	start()
})

