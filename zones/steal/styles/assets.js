var fuzzyNormalize = require("steal-fuzzy-normalize");

module.exports = function(data){
	var inserted = new Set();

	return {
		plugins: [
			require("./trace-bundles"),
			require("./can-import")
		],

		beforeRun: function(){
			data.applyPages = function(){
				var pages = data.pages || [];
				return applyPages(data.document, data.bundleHelpers,
					pages, inserted);
			};
		},

		afterStealMain: function(){
			ensureAtLeastMainPage(data);
			data.applyPages();
		},

		ended: function(){
			ensureAtLeastMainPage(data);

			// If anything is added, update the HTML
			if(data.applyPages()) {
				data.html = data.document.documentElement.outerHTML;
			}
		}
	};
};

function applyPages(document, bundleHelpers, pages, inserted){
	var findBundle = bundleHelpers.findBundle;
	var bundles = bundleHelpers.bundles;

	var head = document.head;

	var changes = 0;
	var oldDoc = global.document;
	global.document = document;
	pages.forEach(function(moduleName){
		var bundle = findBundle(moduleName) || bundles[moduleName];

		if(bundle) {
			Object.keys(bundle).forEach(function(childName){
				var asset = bundle[childName];
				if(asset && !inserted.has(asset.id)) {
					changes++;
					inserted.add(asset.id);
					var node = asset.value();
					node.setAttribute("asset-id", asset.id);
					head.insertBefore(node, head.lastChild);
				}
			});
		}
	});
	global.document = oldDoc;
	return changes;
}

function ensureAtLeastMainPage(data) {
	if(!data.pages) {
		data.pages = [];
	}
	// If no bundles are found, put the main one in anyways, so some
	// styles are at least added
	if(data.pages.length === 0) {
		var main = data.steal.loader.main;
		var bundles = data.bundleHelpers.bundles;

		// Find the normalized main name within the bundles
		var names = Object.keys(bundles);
		// remove the main in case it's not normalized, find a better match.
		names.splice(names.indexOf(main), 1);
		var normalizedMain = fuzzyNormalize(main, names) || main;
		data.pages.unshift(normalizedMain);
	}
}
