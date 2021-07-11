let http = require("http");
let https = require("https");
let fs = require("fs");
let unzipper = require("unzipper");
let querystring = require("querystring");

// auth路由： 接收code， code + client_id+client_secret => access_token
function auth(request, response) {
    let query = querystring.parse(request.url.match(/^\/auth\?([\s\S]+)$/)[1]);
    getToken(query.code, info => {
        response.write(`<a href="http://localhost:8083/?token=${info.access_token}">publish</a>`)
        response.end();
    });
}

function getToken(code, callback) {
    let request = https.request({
        host: "github.com",
        path: `/login/oauth/access_token?code=${code}&client_id=96f8cb57fc02784ef7d7&client_secret=56135e0398b96d88c181d4ec83938f00aa8ef414`,
        port: 443,
        method: "POST"
    }, function(response) {
        let body = "";
        response.on("data", chunk => {
            body += chunk.toString();
        })

        response.on("end", () => {
            callback(querystring.parse(body));
        })
    });

    request.end();
}

// publish路由发布：token => user_info，check auth
function publish(request, response) {
    let query = querystring.parse(request.url.match(/^\/publish\?([\s\S]+)$/)[1]);

    getUser(query.token, info => {
        if(info.login === "ryan-w-hub") {
            request.pipe(unzipper.Extract({ path: "../web-server/public/" }));
            request.on("end", () => {
                response.write("srccess")
                response.end();
            });
        }
    }) 
}

function getUser(token, callback) {
    let request = https.request({
        host: "api.github.com",
        path: "/user",
        port: 443,
        method: "GET",
        headers: {
            Authorization: `token ${token}`,
            "User-Agent": "toy-publish"
        }
    }, function(response) {
        let body = "";
        response.on("data", chunk => {
            body += chunk.toString();
        })

        response.on("end", () => {
            console.log(JSON.parse(body));
            callback(JSON.parse(body));
        })
    });

    request.end();
}

http.createServer(function(request, response) {
    if(request.url.match(/^\/auth\?/)) {
        return auth(request, response);
    }
    if(request.url.match(/^\/publish\?/)) {
        return publish(request, response);
    }    
}).listen(8082);