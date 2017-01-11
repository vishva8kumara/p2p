
new arc.nav('settings', arc.q('#settings')[0],
	function(context, params){
		new arc.ajax('settings', {
			callback: function(data){
				context.q('pre')[0].html(JSON.stringify(data.data, false, 3));
			}
		});
	});

new arc.nav('users', arc.q('#users')[0],
	function(context, params){
		new arc.ajax('users', {
			callback: function(data){
				context.q('pre')[0].html(JSON.stringify(data.data, false, 3));
			}
		});
	});
