
const PATH = require("path");
const DESCRIPTORS = require("./descriptors");


var Package = exports.Package = function() {
    this.path = null;
    this.parent = null;
    this.children = {
        packages: {},
        "node_modules/": {},
        "mapped_packages/": {},
        "dependencies": {},
        "devDependencies": {},
        "mappings": {},
        "devMappings": {}
    };
}

Package.prototype.initForPath = function(path) {
    var self = this;
    return DESCRIPTORS.packageForPath(path).then(function(descriptor) {
        self.path = PATH.dirname(descriptor.path);
        self.descriptor = descriptor;
    });
}

Package.prototype.addChild = function(pkg, type, name) {
    var self = this;
    if (!self.children[type]) {
        self.children[type] = {};
    }
    if (pkg) {
/*        
        if (self.children.packages[pkg.path]) {
            if (self.children.packages[pkg.path][0] !== pkg) {
                throw new Error("Cannot store two different package instances for same path: " + pkg.path);
            }
        } else */ if (!self.children.packages[pkg.path]) {
            self.children.packages[pkg.path] = [pkg, [], []];
        }
        self.children.packages[pkg.path][1].push(type);
        self.children.packages[pkg.path][2].push(name);
        self.children[type][name] = pkg.path;
        pkg.parent = self;
    } else {
        self.children[type][name] = null;
    }
}


var DummyPackage = exports.DummyPackage = function() {
}
DummyPackage.prototype = new Package();

