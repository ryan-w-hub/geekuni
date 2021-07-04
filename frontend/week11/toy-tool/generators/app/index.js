const Generator = require("yeoman-generator");

module.exports = class extends Generator {
  constructor(args, opts) {
    // Calling the super constructor is important so our generator is correctly set up
    super(args, opts);

    // Next, add your custom code
    // this.option('babel'); // This method adds support for a `--babel` flag
  }

  async initPackage() {
    const answers = await this.prompt([
      {
        type: "input",
        name: "name",
        message: "Your project name",
        default: this.appname
      }
    ]);

    const pkgJson = {
      name: answers.name,
      version: "1.0.0",
      description: "",
      main: "index.js",
      scripts: {
        test: "mocha --require @babel/register",
        coverage: "nyc mocha"
      },
      author: "",
      license: "ISC",
      devDependencies: await this.addDevDependencies({
        "@babel/core": "7.14.6",
        "@babel/preset-env": "7.14.7",
        "@babel/register": "7.14.5",
        "@istanbuljs/nyc-config-babel": "3.0.0",
        "@vue/compiler-sfc": "3.1.2",
        "babel-loader": "7.1.5",
        "babel-plugin-istanbul": "6.0.0",
        "css-loader": "5.2.6",
        "copy-webpack-plugin": "9.0.1",
        webpack: "4.46.0",
        "vue-loader": "16.3.0",
        "vue-style-loader": "4.1.3",
        mocha: "9.0.2",
        nyc: "15.1.0"
      }),
      dependencies: await this.addDependencies({ vue: "2.6.14" })
    };

    this.fs.extendJSON(this.destinationPath("package.json"), pkgJson);
  }

  async copyFiles() {
    this.fs.copyTpl(
      this.templatePath(".babelrc"),
      this.destinationPath(".babelrc"),
      {}
    );

    this.fs.copyTpl(
      this.templatePath(".nycrc"),
      this.destinationPath(".nycrc"),
      {}
    );

    this.fs.copyTpl(
      this.templatePath("Hello.vue"),
      this.destinationPath("src/Hello.vue"),
      {}
    );

    this.fs.copyTpl(
      this.templatePath("webpack.config.js"),
      this.destinationPath("webpack.config.js"),
      {}
    );

    this.fs.copyTpl(
      this.templatePath("main.js"),
      this.destinationPath("src/main.js"),
      {}
    );

    this.fs.copyTpl(
      this.templatePath("index.html"),
      this.destinationPath("src/index.html"),
      { title: "hello vue" }
    );

    this.fs.copyTpl(
      this.templatePath("sample-test.js"),
      this.destinationPath("test/sample-test.js"),
      {}
    );
  }

  async install() {
    this.spawnCommand("yarn");
  }
};
