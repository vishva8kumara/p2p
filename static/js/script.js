
new arc.nav('settings', arc.q('#settings')[0],
	function(context, params){
		var table = context.q('table')[0];
		var form = context.q('form')[0];
		new arc.ajax('settings', {
			callback: function(data){
				table.html('');//JSON.stringify(data.data, false, 3)
				var row;
				for (var key in data.data){
					row = table.a(arc.elem('tr'));
					row.a(arc.elem('td', key));
					row.a(arc.elem('td')).
						a(arc.elem('input', null, {type: 'text', name: key, 'data-type': typeof data.data[key],
							value: (data.data[key] instanceof Array ? data.data[key].join(',') : data.data[key]) }));
				}
			}
		});
		form.obj.onsubmit = function(){
			var data = {};
			for (element in this.elements)
				if (typeof this.elements[element] == 'object' && this.elements[element].name != '')
					data[this.elements[element].name] = this.elements[element].getAttribute('data-type') == 'object' ?
						this.elements[element].value.split(',') : this.elements[element].value;
			new arc.ajax('settings', {
				method: POST, data: {settings: btoa(JSON.stringify(data, false, 2))},
				callback: function(){
					alert('Configurations saved');
				}
			});
			return false;
		}
	});

new arc.nav('connect', arc.q('#connect')[0],
	function(context, params){
		var list = context.q('ul')[0];
		var form = context.q('form')[0];
		form.obj.onsubmit = function(){
			//	/*new arc.ajax('peers/'+this.q.value, {callback: function(res){data = res.data;list.html('');for (var peer in data)list.a(arc.elem('li', peer));}});*/
			new arc.ajax('peers/search/'+this.q.value, {
				callback: function(res){
					data = res.data;
					list.html('');
					var found = false;
					for (var server in data){
						var usr, subList = list.a(arc.elem('li', server)).a(arc.elem('ul'));
						//subList = subList;
						for (var peer in data[server]){
							usr = subList.a(arc.elem('li', peer+' ', {'data-uname': peer+'@'+server, 'data-code': data[server][peer]}));
							usr.a(arc.elem('input', null, {type: 'button', value: 'Connect'}))
								.obj.onclick = function(){
									new arc.ajax('peers/connect/'+this.parentNode.getAttribute('data-uname'), {
										callback: function(res){
										}
									});
								};
							usr.a(arc.elem('input', null, {type: 'button', value: 'Remember'}))
								.obj.onclick = function(){
									new arc.ajax('peers/remember/'+this.parentNode.getAttribute('data-uname'), {
										callback: function(res){
										}
									});
								};
							found = true;
						}
					}
					if (!found)
						list.a(arc.elem('li', '<i>No matching peers found on connected servers.</i>'));
				}
			});
			return false;
		};
	});

new arc.nav('peers', arc.q('#peers')[0],
	function(context, params){
		var list = context.q('ul')[0];
		var data = {};//data.data[peer]
		list.html('');
		var found = false;
		new arc.ajax('peers', {
			callback: function(res){
				data = res.data;
				for (var peer in data){
					list.a(arc.elem('li', peer));
					found = true;
				}
				if (!found)
					list.a(arc.elem('li', '<i>You still don\'t have peers connected to this node.</i>'));
					//list.html('<li><i>You still don\'t have peers connected to this node.</i></li>');
			}
		});
	});
