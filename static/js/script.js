
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
			//	/*new arc.ajax('users/'+this.q.value, {callback: function(res){data = res.data;list.html('');for (var user in data)list.a(arc.elem('li', user));}});*/
			new arc.ajax('users/search/'+this.q.value, {
				callback: function(res){
					data = res.data;
					list.html('');
					for (var server in data){
						var usr, subList = list.a(arc.elem('li', server)).a(arc.elem('ul'));
						//subList = subList;
						for (var user in data[server]){
							usr = subList.a(arc.elem('li', user+' ', {'data-uname': user+'@'+server, 'data-code': data[server][user]}));
							usr.a(arc.elem('input', null, {type: 'button', value: 'Connect'}))
								.obj.onclick = function(){
									new arc.ajax('users/connect/'+this.parentNode.getAttribute('data-uname'), {
										callback: function(res){
										}
									});
								};
							usr.a(arc.elem('input', null, {type: 'button', value: 'Remember'}))
								.obj.onclick = function(){
									new arc.ajax('users/remember/'+this.parentNode.getAttribute('data-uname'), {
										callback: function(res){
										}
									});
								};
						}
					}
				}
			});
			return false;
		};
	});

new arc.nav('users', arc.q('#users')[0],
	function(context, params){
		var list = context.q('ul')[0];
		var data = {};//data.data[user]
		new arc.ajax('users', {
			callback: function(res){
				data = res.data;
				list.html('');
				for (var user in data)
					list.a(arc.elem('li', user));
			}
		});
	});
