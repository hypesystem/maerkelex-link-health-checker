var request = require("request");
var async = require("async");
var debug = require("debug")("maerkelex:link-health-checker");

debug("Getting m.json");

request.get("http://mærkelex.dk/m.json", function(error, httpResponse, body) {
	if(error) {
		return console.error("Failed to get m.json", error);
	}
	if(httpResponse.statusCode != 200) {
		return console.error("Got non-200 on request for m.json", httpResponse.statusCode, body);
	}
	
	debug("Succesfully got m.json");
	
	var data = JSON.parse(body);
	var links = [];
	data.m.map(function(maerke) {
		links.push({
			name: maerke.name,
			url: maerke.buylink
		});
		if(maerke.infolink) {
			links.push({
				name: maerke.name,
				url: maerke.infolink
			});
		}
	});
	
	debug("Parsed m.json into " + links.length + " links to be checked.");
	
	async.mapLimit(links, 5, function(link, callback) {
		request.get(link.url, function(error, httpResponse, body) {
			if(error) {
				return callback({
					message: "Failed to check link " + link.url,
					error: error
				});
			}
			if(httpResponse.statusCode != 200) {
				return callback(null, {
					healthy: false,
					message: "Non-200 response code (" + httpResponse.statusCode + ") on link",
					link: link
				});
			}
			callback(null, {
				healthy: true,
				link: link
			});
		});
	}, function(error, status) {
		if(error) {
			return console.error("Error while checking links")
		}
		var unhealthyLinks = status.filter(function(linkStatus) {
			return !linkStatus.healthy;
		});
	    console.log("Unhealthy links:", unhealthyLinks);
	});
});
