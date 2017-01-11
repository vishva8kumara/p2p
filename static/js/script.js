
new arc.nav('settings', arc.q('#settings')[0],
	function(context, params){
		var pre = context.q('pre')[0];
		new arc.ajax('settings', {
			callback: function(data){
				pre.html(JSON.stringify(data.data, false, 3));
			}
		});
	});

new arc.nav('connect', arc.q('#connect')[0],
	function(context, params){
		var list = context.q('ul')[0];
		var form = context.q('form')[0];
		form.obj.onsubmit = function(){
			/*new arc.ajax('users/'+this.q.value, {
				callback: function(res){
					data = res.data;
					list.html('');
					for (var user in data)
						list.a(arc.elem('li', user));
				}
			});*/
			new arc.ajax('users/search/'+this.q.value, {
				callback: function(res){
					data = res.data;
					list.html('');
					for (var user in data)
						list.a(arc.elem('li', user));
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
