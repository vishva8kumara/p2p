
var dgram = require('dgram');
var http = require("http");
var os = require('os');
var qs = require('qs');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname+'/config.json', 'UTF-8'));

var udpport = 6668;
var keepAliveTimer = false;
var users = {};

//	First, find out our IP address
var host = [false, false];
var interfaces = os.networkInterfaces();
for (var k in interfaces) {
	for (var k2 in interfaces[k]) {
		var address = interfaces[k][k2];
		//console.log(address);
		if (!address.internal)
			if (address.family === 'IPv4')
				host[0] = address.address;
			else if (address.family === 'IPv6')
				host[1] = address.address;
	}
}

//	Create UDP socket to communicate p2p
var client = dgram.createSocket('udp4');
if (host[0] == false && host[1] == false)
	console.log('\033[91mNo connection to outside\033[0m');
else{
	client.bind(udpport, host[0]);
	//console.log(host);
}

//	Keep-alive with identity server, another node similar to this
function keepAlive(){
	for (var i = 0; i < servers.length; i++)
		client.send(new Buffer(config.username), 0, config.username.length,
			udpport, servers[i], function(err, bytes){});
	keepAliveTimer = setTimeout(function(){
		keepAlive();
	}, 12000);
}


// Receive incoming data on udpport
client.on('message', function(message, remote){
	console.log(remote.address + ':' + remote.port +' - ' + message);
	//
	// Reply to incoming message by sending the directory. Whole directory for now
	var message = JSON.stringify(directory);
	client.send(new Buffer(message), 0, message.length,
		remote.port, remote.address, function(err, bytes){});
	//
	// Add the caller to the directory as well
	directory[message] = {address: remote.address, port: remote.port};
});


//	Web server interface
var server = http.createServer(
	function (req, res){
		//	Parse URL and query string
		var url = req.url.substring(1).split('?');
		var get = qs.parse(url[1]);
		url = url[0].split('/');
		if (url[url.length-1] == '')
			url.splice(url.length-1);
		//
		if (url.length == 0){
			//	Deliv er base template
			fs.readFile(__dirname+'/views/base.html', 'utf8',
				function(err, data) {
					res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
					res.write(data);
					res.end();
				});
		}
		else if (url[0] == 'static'){
			fs.readFile(__dirname+'/'+url.join('/'), 'utf8',
				function(err, data) {
					if (err){
						console.log(err);
						res.writeHead(404, {'Content-Type': 'text/html'});
						res.end('<h1>404: Static File Not Found</h1>');
					}
					else
						res.end(data);
				});
		}
		else if (url[0] == 'settings'){
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify({host: host, username: username}));
			res.end();
		}
		else if (url[0] == 'users'){
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify(users));
			res.end();
		}
		else{
			res.write(JSON.stringify({url: url, get: get}));
			res.end();
		}
		//	Default module and method
		/*if (url.length == 0 || url[0] == '')
			url[0] = 'index';
		if (url.length == 1 || url[1] == '')
			url[1] = 'index';*/
		//
	}
);
server.on('error',
	function(e){
		console.log('--------------------------------');
		console.log('\033[91m'+e.errno+'\033[0m');
	});

server.listen(config.httpport);

