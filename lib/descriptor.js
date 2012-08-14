
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

Descriptor.prototype.reload = function() {
    this.loadFromPath(this.path);
}

Descriptor.prototype.write = function() {
    var self = this;
    var deferred = Q.defer();
    FS.writeFile(self.path, JSON.stringify(self.json, null, 4), function(err) {
        if (err) {
            deferred.reject(err);
            return;
        }
        deferred.resolve(true);
    });
    return deferred.promise;
}

Descriptor.prototype.set = function() {
    if(arguments.length==1) {
        this.json = arguments[0];
    } else
    if(arguments.length==2) {
        var data = this.get(arguments[0], true, true);
        data[0][data[1]] = arguments[1];
    } else {
        throw new Error("Invalid argument count: " + arguments.length);
    }
    return this.write();
};

Descriptor.prototype.remove = function(keysPath) {
    var data = this.get(keysPath, false, true);
    if(!data) {
        return Q.call(function() {
            return false;
        });
    }
    delete data[0][data[1]];
    return this.write();
};

Descriptor.prototype.get = function(keysPath, createObjects, returnWithKey) {
    if(!keysPath) {
        return this.json;
    }
    var keys = [];
    UTIL.forEach(keysPath, function(key) {
        if(UTIL.isArrayLike(key)) {
            keys.push(key.join(""));
        } else {
            keys.push(key);
        }
    });
    var data = this.json,
        key;
    while(true) {
        if(keys.length==1 && returnWithKey===true) {
            return [data, keys.shift()];
        }
        if(keys.length==0) break;
        key = keys.shift();
        if(!data[key]) {
            if(createObjects===true) {
                data[key] = {};
            } else {
                return null;
            }
        }
        data = data[key];
    }
    return data;
};

Descriptor.prototype.has = function(keysPath) {
    return (this.get(keysPath)!==null);
};



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

