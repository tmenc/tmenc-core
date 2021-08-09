console.log("#4761");

// process.chdir('src')
__dirname = process.cwd();

function start_router() {
    var fs = require("fs");
    var http = require("http");
    var url = require("url");
    var path = require("path");

    var server = http.createServer(function (request, response) {
        var pathname = url.parse(request.url).pathname;
        // console.log("Request for " + pathname + " received.");

        response.writeHead(200, {"Content-Type": "text/html"});

        var fullname = path.join(__dirname, pathname);
        // console.log("!", fullname, "!");
        // console.log("exists?", fs.existsSync(fullname));

        if(pathname == "/") {
            var html = fs.readFileSync("index.html", "utf8");
            response.write(html);
        }
        else if (fs.existsSync(fullname)) {
            var script = fs.readFileSync(fullname, "utf8");
            response.write(script.toString());
        }
        else if (fs.existsSync(pathname)) {
            var script = fs.readFileSync(pathname, "utf8");
            response.write(script.toString());
        }
        else {
            console.error("Unknown route request = \"" + pathname + "\"");
        }

        response.end();
    });

    var port = process.env.PORT || 1337;
    server.listen(port);

    // console.log("Listening to server on 1337...");
}

function start() {
    start_router();
}

start();
