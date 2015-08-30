var AppMap = require("can-ssr/app-map");
var QUnit = require("steal-qunit");
var loader = require("@loader");
var $ = require("jquery");

QUnit.module("can-ssr/app-map");

QUnit.module("pageData");

var keys = Object.keys || function(obj){
	var result = [];
	for (prop in obj) {
		result.push(prop);
	}
};

test("sorts correctly", function(){
	var map = new AppMap();
	map.pageData("foo", { "one": 1, "two": 2 }, {});
	map.pageData("foo", { "two": 2, "one": 1 }, {});

	equal(keys(map.__pageData).length, 1, "There is one key");
});

test("Correctly serializes json with scripts in it", function(){
	var cloneAsset;
	loader.set("asset-register", loader.newModule({
		"default": function(name, callback){
			cloneAsset = callback;
		}
	}));

	var map = new AppMap();
	map.pageData("foo", {foo:"bar"}, {
		readme: "# hello world\n ```<script type=\"test/stache\">something</script>"
	});

	var script = cloneAsset();
	$("#qunit-test-area").append(script);

	QUnit.ok(window.INLINE_CACHE, "Inline cache exists");
	QUnit.ok(INLINE_CACHE["{\"foo\":\"bar\"}"], "The set key exists");
});
