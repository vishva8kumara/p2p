
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

//	Keep a list of clients connecting
var directory = {};

server.on('listening', function(){
	var address = server.address();
	console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

//	Receive incoming data on port 6666
server.on('message', function(message, remote){
	console.log(remote.address + ':' + remote.port +' - ' + message);
	//
	//	Reply to incoming message by sending the directory. Whole directory for now
	var client = dgram.createSocket('udp4');
	var message = JSON.stringify(directory);
	client.send(message, 0, message.length, remote.port, remote.address, function(err, bytes) {
		if (err)
			return false;
		console.log('UDP resply sent');
		client.close();
	});
	//
	//	Add the caller to the directory as well
	directory[message] = {address: remote.address, port: remote.port};
});

server.bind(6666);
