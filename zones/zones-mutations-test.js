var Zone = require("can-zone");
var requests = require("./requests");
var dom = require("./can-simple-dom");
var pushFetch = require("./push-fetch");
var pushImages = require("./push-images");
var pushMutations = require("./push-mutations");
var pushXHR = require("./push-xhr");

var assert = require("assert");
var {
	createServer,
	Request,
	Response
} = require("./test-helpers");
var helpers = require("../test/helpers");
var main = require("./tests/basics/main");

var spinUpServer = function(cb){
	return createServer(8070, function(req, res){
		switch(req.url) {
			case "/api/todos":
				var data = ["eat", "sleep"];
				break;
			case "/api/cart":
				var data = { count: 22 };
				break;
		}
		res.end(JSON.stringify(data));
	})
	.then(server => {
		return cb().then(() => server.close());
	});
};

describe("SSR Zones - Incremental Rendering", function(){
	describe("An app using fetch and PUSH", function(){
		before(function(){
			return spinUpServer(() => {
				var request = new Request();
				var response = this.response = new Response();

				var zone = this.zone = new Zone([
					// Overrides XHR, fetch
					requests(request),

					// Sets up a DOM
					dom(request),

					pushMutations(response)
				]);

				var runPromise = zone.run(main);
				zone.data.initialHTML = zone.data.html;
				return runPromise;
			});
		});

		it("Contains the correct initial HTML", function(){
			var dom = helpers.dom(this.zone.data.initialHTML);
			assert.equal(dom.getAttribute("data-incrementally-rendered"), "",
				"contains the flag that incrementally rendering is used");

			var ul = helpers.find(dom, node => node.nodeName === "UL");
			assert.ok(!ul.firstChild, "There are no child LIs yet");
		});

		it("Contains mutations", function(){
			var pushes = this.response.data.pushes;
			var liMutation = JSON.parse(pushes[0][2][0].toString());

			assert.equal(liMutation[0].type, "insert", "Inserting a li");
			assert.equal(liMutation[0].node[3], "LI", "Inserting a li");
		});
	});
});
