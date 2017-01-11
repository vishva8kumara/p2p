
var dgram = require('dgram');
var httpLib = require("http");
var os = require('os');
var qs = require('qs');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname+'/config.json', 'UTF-8'));
var udpport = 6660;//139.162.7.150

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
			//else if (address.family === 'IPv6')
			//	host[1] = address.address;
	}
}

//	Create UDP socket to communicate p2p
var udp = dgram.createSocket('udp4');
if (host[0] == false && host[1] == false)
	console.log('\033[91mNo connection to outside\033[0m');
else{
	udp.bind(udpport, host[0]);
	//console.log(host);
}

/*
	message
		c: command
			ka: keep-alive
			cr1: connect request stage 1
			cr2: connect request stage 2
			qrq: query users - request
			qrs: query users - response
			...
		u: user
		h: host
		p: port
*/

//	Keep-alive with identity server which is another node similar to this
function keepAlive(){
	//	Only if this node has upstream servers - not a top level introducer
	if (config.servers.length > 0){
		var message = JSON.stringify({c: 'ka', u: config.username, h: host[0]});
		console.log('Sending keep-alive');
		//
		for (var i = 0; i < config.servers.length; i++)
			udp.send(new Buffer(message), 0, message.length,
				udpport, config.servers[i], function(err, bytes){});
		//
		keepAliveTimer = setTimeout(function(){
			keepAlive();
		}, config.keepAliveFreq);
	}
}
keepAlive();


var p2pSpool = {};
function p2pHandler(username){
}


// Receive incoming data from a client on udpport
udp.on('message', function(message, remote){
	console.log(remote.address + ':' + remote.port + ' - ' + message);
	//
	// Reply to incoming message by sending the directory. Whole directory for now
	message = JSON.parse(message);
	if (typeof message.c == 'string'){
		if (message.c == 'ka'){
			if (typeof users[message.u] != 'undefined')
				clearTimeout(users[message.u]['expire']);
			//	Add to directory
			users[message.u] = {inner: {host: message.h, port: udpport},
							outer: {host: remote.address, port: remote.port},
							timestamp: (new Date()).getTime()};
			//	Set Timeout to auto remove if inactive
			new (function(username){
				users[username]['expire'] = setTimeout(function(){
					console.log('Removing user \''+username+'\' for inactivity.');
					delete users[username];
				}, config.keepAliveTimeout);
			})(message.u);
			//
			/*/	Send ack
			message = JSON.stringify({c: 'ack', fqdn: config.fqdn});
			udp.send(new Buffer(message), 0, message.length,
				remote.port, remote.address, function(err, bytes){});*/
		}
		if (message.c == 'cr1'){
		}
	}
	/*
	else
		udp.send(new Buffer(message), 0, message.length,
			remote.port, remote.address, function(err, bytes){});
	//
	// Add the caller to the directory as well
	directory[message] = {address: remote.address, port: remote.port};
	*/
});


//	Web service interface
var http = httpLib.createServer(
	function (req, res){
		//	Parse URL and query string
		var url = req.url.substring(1).split('?');
		var get = qs.parse(url[1]);
		url = url[0].split('/');
		if (url[url.length-1] == '')
			url.splice(url.length-1);
		//
		//	Deliver base template
		if (url.length == 0){
			fs.readFile(__dirname+'/views/base.html', 'utf8',
				function(err, data) {
					res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
					res.write(data);
					res.end();
				});
		}
		//	List users or search on servers
		else if (url[0] == 'users'){
			var output = [];
			if (url.length > 2 && url[1] == 'search'){
				var progress = 0;
				for (var i = 0; i < config.servers.length; i++)
					console.log('xTo Do.');
					/*new (function(i, q){
						httpLib.request(
							{port: 8080, method: 'GET', host: config.servers[i], path: '/users/'+q},
							function(response){
								handlePost(response, function(apiData){
									output.push(apiData);
									progress += 1;
									if (progress == config.servers.length){
										res.write(JSON.stringify(output));
										res.end();
									}
								});
							})
						.on('error', function(err){
							console.log(err);
						}).end();
					})(i, url[2]);*/
			}
			else{
				console.log('http: '+url);
				res.writeHead(200, {'Content-Type': 'application/json'});
				for (var user in users)
					if (url.length == 1 || user.indexOf(url[1]) > -1)
						output[user] = [[users[user].inner.host, users[user].inner.port],//s[0], users[user].inner.hosts[1]
									[users[user].outer.host, users[user].outer.port]];//, users[user].timestamp
				res.write(JSON.stringify(output));
				res.end();
			}
		}
		//	Deliver static resources as is - later we can look into minification and caching
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
		//	Settings - read-only
		else if (url[0] == 'settings'){
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify({host: host, username: config.username}));
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
http.on('error',
	function(e){
		console.log('--------------------------------');
		console.log('\033[91m'+e.errno+'\033[0m');
	});

http.listen(config.httpport);


//	Handler for multipart POST request/response body
function handlePost(req, callback){
	req.setEncoding('utf8');
	var body = '';
	req.on('data', function (data){
		body += data;
		//	Not receiving anything over 1Mb
		if (body.length > 1e6)
			req.connection.destroy();
	});
	req.on('end', function (data){
		var post = body;
		//	Try to parse/normalize body, either xformurlencoded or jsonencoded. hereafter it wouldn't make difference to us
		try{
			post = JSON.parse(post);
		}
		catch(e){
			try{
				post = qs.parse(post);
			}
			catch(e){}
		}
		callback(post);
	});
}

