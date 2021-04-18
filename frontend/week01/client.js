const net = require("net");

class Request {
  constructor(options) {
    this.method = options.method || "GET";
    this.host = options.host;
    this.port = options.port || 80;
    this.path = options.path || "/";
    this.body = options.body || {};
    this.headers = options.headers || {};

    if (!this.headers["Content-Type"]) {
      this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    if (this.headers["Content-Type"] === "application/json") {
      this.bodyText = JSON.stringify(this.body);
    } else if (
      this.headers["Content-Type"] === "application/x-www-form-urlencoded"
    ) {
      this.bodyText = Object.keys(this.body)
        .map((k) => `${k}=${encodeURIComponent(this.body[k])}`)
        .join("&");
    }

    this.headers["Content-Length"] = this.bodyText.length;
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser();
      resolve("");
    });
  }
}

class ResponseParser {
  receive(str) {
    for (let c of str) {
      this.receiveChar(c);
    }
  }

  receiveChar(char) {}
}

void (async function () {
  const request = new Request({
    method: "POST",
    host: "localhost",
    port: 8080,
    path: "/",
    headers: {
      ["X-Foo"]: "customed"
    },
    body: {
      name: "ryan"
    }
  });
  const response = await request.send();
  console.log(response);
})();
