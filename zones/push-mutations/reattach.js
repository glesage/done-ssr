var fs = require("fs");
var isPromise = require("is-promise");
var path = require("path");

var clientScript = getClientScript();

module.exports = function(url){
	function appendToHead(document, element){
		var fc = document.head.firstChild;
		if(fc) {
			document.head.insertBefore(element, fc);
		} else {
			document.head.appendChild(element);
		}
	};

	function makeIframe(document) {
		var clone = document.documentElement.cloneNode(true);
		// Disable all scripts, but leave them in the page so that ids
		// match up correctly.
		Array.from(clone.getElementsByTagName("script")).forEach(function(el){
			el.removeAttribute("src");
			while(el.firstChild) {
				el.removeChild(el.firstChild);
			}
			el.setAttribute("data-noop", "");
		});
		var fakeDoc = { head: clone.firstChild };

		// iframe placeholder
		appendToHead(fakeDoc, document.createComment("iframe placeholder"));

		var script = document.createElement("script");
		script.setAttribute("data-streamurl", url);
		script.appendChild(document.createTextNode(clientScript));
		appendToHead(fakeDoc, script);

		var iframe = document.createElement("iframe");
		iframe.setAttribute("id", "donessr-iframe");
		iframe.setAttribute("srcdoc", clone.outerHTML);
		iframe.setAttribute("style", "border:0;position:fixed;top:0;left:0;width:100vw;height:100vh;");
		return iframe;
	}

	function injectIntoHead(document, element) {
		// If the documentElement is replaced (done-autorender),
		// move the script over to the new <head> element.
		var rc = document.replaceChild;
		document.replaceChild = function(newDocEl){
			var res = rc.apply(this, arguments);
			appendToHead(document, element);
			return res;
		};

		appendToHead(document, element);
	}

	return function(data){
		function injectStuff() {
			let doc = data.document;
			injectIntoHead(doc, makeIframe(doc));
			var closeScript = doc.createElement("script");
			closeScript.textContent = `
				window.closeSsrIframe = function(){
					var frame = document.getElementById("donessr-iframe");
					frame.parentNode.removeChild(frame);
				};
			`;
			appendToHead(doc, closeScript);
		}

		return {
			afterRun: function(){
				if(!isPromise(data.startMutations)) {
					injectStuff();
				}
			},
			afterStealMain: function() {
				injectStuff();
			}
		};
	};
};

function getClientScript() {
	var dir = path.dirname(require.resolve("done-ssr-incremental-rendering-client"));
	var basename = "done-ssr-incremental-rendering-client";
	var debugMode = typeof process.env.DONE_SSR_DEBUG !== "undefined";
	var clientPth = `${dir}/${basename}${debugMode ? "" : ".min"}.js`;
	return fs.readFileSync(clientPth, "utf8");
}
