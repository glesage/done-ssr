var ssr = require("../lib/");
var helpers = require("./helpers");
var assert = require("assert");
var path = require("path");
var Writable = require("stream").Writable;
var through = require("through2");
var noop = Function.prototype;
var chromeUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.109 Safari/537.36";

describe("Incremental rendering", function(){
	this.timeout(10000);

	before(function(){
		this.oldXHR = global.XMLHttpRequest;
		global.XMLHttpRequest = helpers.mockXHR(
			'[ { "a": "a" }, { "b": "b" } ]');

		this.render = ssr({
			config: "file:" + path.join(__dirname, "tests", "package.json!npm"),
			main: "async/index.stache!done-autorender"
		}, {
			strategy: "incremental"
		});
	});

	after(function(){
		global.XMLHttpRequest = this.oldXHR;
	});

	describe("A basic asyc app", function(){
		before(function(done){
			var result = this.result = {
				html: null,
				instructions: []
			};

			var request = {
				url: "/",
				headers: {
					"user-agent": chromeUA
				}
			};

			var response = through(function(buffer, enc, done){
				result.html = buffer.toString();
			});
			response.writeHead = noop;
			response.push = function(){
				return new Writable({
					write(chunk, enc, next) {
						var json = chunk.toString();
						var instrs = JSON.parse(json);
						result.instructions.push(instrs);
						done();
						next();
					}
				});
			};

			this.render(request).pipe(response);
		});

		it("Sends the correct rendering instructions", function(){
			var instr = this.result.instructions[0][0];
			assert.equal(instr.route, "0.2.7");
			
			// Easier to test
			var nodeAsJson = JSON.stringify(instr.node);
			assert.ok(/ORDER-HISTORY/.test(nodeAsJson), "adds the order-history component");
		});

		it("Includes the styles as part of the initial HTML", function(){
			var dom = helpers.dom(this.result.html);
			// The script is the first element of the dom
			var doc = dom.nextSibling;
			var style = helpers.find(doc, function(el){
				return el.nodeName === "STYLE";
			});

			assert.ok(style, "Some styles were included");
		});
	});
});