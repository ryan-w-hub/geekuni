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
      if (connection) {
        connection.write(this.toString());
      } else {
        connection = net.createConnection(
          {
            host: this.host,
            port: this.port
          },
          () => {
            connection.write(this.toString());
          }
        );
      }

      connection.on("data", (data) => {
        console.log("data: ", data.toString());
        parser.receive(data.toString());
        if (parser.isFinished) {
          resolve(parser.response);
          connection.end();
        }
      });

      connection.on("error", (err) => {
        console.error("connection error:".err);
        reject(err);
        connection.end();
      });
    });
  }

  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.headers)
      .map((k) => `${k}: ${this.headers[k]}`)
      .join("\r\n")}\r\n\r\n${this.bodyText}`;
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
