
new arc.nav('settings', arc.q('#settings')[0],
	function(context, params){
		var pre = context.q('pre')[0];
		new arc.ajax('settings', {
			callback: function(data){
				pre.html(JSON.stringify(data.data, false, 3));
			}
		});
	});

new arc.nav('users', arc.q('#users')[0],
	function(context, params){
		var list = context.q('ul')[0];
		var data = {};//data.data[user]
		new arc.ajax('users', {
			callback: function(res){
				data = res.data;
				for (var user in data)
					list.a(arc.elem('li', user));
			}
		});
	});
