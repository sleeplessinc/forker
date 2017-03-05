
express = require('express');
http = require('http');
httpProxy = require('http-proxy');
vhost = require('vhost');
require("sleepless")

cfg = require("./config.json")

function webProxy(proxy) { return proxy.web.bind(proxy); }


var vhost_app = express();

for(var host in cfg.forks) {

	var fork = cfg.forks[host]

	var tgt_host = fork.host
	var tgt_port = fork.port
	var prox = httpProxy.createProxyServer({
		target: { host: tgt_host, port: tgt_port },
		agent: http.globalAgent,
		xfwd: true, // add x-forwarded-for header so we get the real IP
	});

	vhost_app.use(vhost( host, webProxy(prox)));

	log("added fork: "+host+" -> "+tgt_host+":"+tgt_port);
}


var server = http.createServer(function (req, res) {
	if (!req.headers.host && req.url.indexOf('://') !== -1) {
		res.writeHead(500)
		res.end()
	}
	else {
	  vhost_app(req, res);
	}
});

server.listen(cfg.port, function() { log('Listening on ' + cfg.port) });

