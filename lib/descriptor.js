
const FS = require("fs");
const UTIL = require("sourcemint-util-js/lib/util");
const Q = require("sourcemint-util-js/lib/q");


var Descriptor = function() {}

Descriptor.prototype.loadFromPath = function(path) {
    var self = this;
    self.path = path;
    try {
        self.json = JSON.parse(FS.readFileSync(self.path));
    } catch(err) {
        throw new Error("Error '" + err + "' parsing JSON file: " + self.path);
    }
}

Descriptor.prototype.write = function() {
    var self = this;
    var deferred = Q.defer();
    FS.writeFile(self.path, JSON.stringify(self.json, null, 4), function(err) {
        if (err) {
            deferred.reject(err);
            return;
        }
        deferred.resolve();
    });
    return deferred.promise;
}


var PackageDescriptor = exports.PackageDescriptor = function(path) {
    this.type = "package";
    if (path) {
        this.loadFromPath(path);
    }
}
PackageDescriptor.prototype = new Descriptor();

PackageDescriptor.prototype.versionSelectorForDependencyName = function(name) {
    var self = this;
    function findDependency(dependencies) {
        var selector = null;
        if (Array.isArray(dependencies)) {
            for (var i=0 ; i<dependencies.length ; i++) {
                if (dependencies[i] === name) {
                    // Found but no version specified.
                    return true;
                }
            }
        } else {
            for (var key in dependencies) {
                if (key === name) {
                    return dependencies[key];
                }
            }
        }
    }
    var selector = findDependency(self.json.dependencies || []);
    if (!selector) {
        selector = findDependency(self.json.devDependencies || []);
    }
    return selector;
}


var DummyPackageDescriptor = exports.DummyPackageDescriptor = function(path) {
    this.type = "package-dummy";
    this.path = path;
    this.json = {};
}
DummyPackageDescriptor.prototype = new PackageDescriptor();



var ProgramDescriptor = exports.ProgramDescriptor = function(path) {
    this.type = "program";
    if (path) {
        this.loadFromPath(path);
    }
}
ProgramDescriptor.prototype = new Descriptor();


var DummyProgramDescriptor = exports.DummyProgramDescriptor = function(path) {
    this.type = "program-dummy";
    this.path = path;
    this.json = {};
}
DummyProgramDescriptor.prototype = new ProgramDescriptor();

