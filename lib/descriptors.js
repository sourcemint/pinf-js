
var PATH = require("path");
var FS = require("fs");
var GLOB = require("sourcemint-util-js/lib/glob").Glob;
var Q = require("sourcemint-util-js/lib/q");
var DESCRIPTOR = require("./descriptor");


exports.programForPath = function(path) {
    var deferred = Q.defer();
    if (!PATH.existsSync(path) && !PATH.existsSync(PATH.dirname(path))) {
        deferred.reject(new Error("Can only make program descriptor for path that exists."));
        return deferred.promise;
    }
    if (PATH.existsSync(path) && FS.statSync(path).isDirectory()) {
        path = PATH.join(path, "program.json");
    }
    if (!/^program(\.[^\.]*)?\.json$/.test(PATH.basename(path))) {
        deferred.reject(new Error("Cannot make program descriptor from path '" + path + "' that does not end in '/^program(\.[^\.]*)?\.json$/'."));
        return deferred.promise;
    }
    if (PATH.existsSync(path)) {
        deferred.resolve(new DESCRIPTOR.ProgramDescriptor(path));
    } else {
        deferred.resolve(new DESCRIPTOR.DummyProgramDescriptor(path));
    }
    return deferred.promise;
}

exports.packageForPath = function(path) {
    var deferred = Q.defer();
    if (!PATH.existsSync(path)) {
        if (!/^package\.json$/.test(PATH.basename(path))) {
            path = PATH.join(path, "package.json");
        }
    } else
    if (!FS.statSync(path).isDirectory()) {
        if (!/^package\.json$/.test(PATH.basename(path))) {
            deferred.reject(new Error("Cannot make package descriptor from path '" + path + "' that does not end in '/^package\.json$/'."));
            return deferred.promise;
        }
    } else {
        path = PATH.join(path, "package.json");
    }
    if (PATH.existsSync(path)) {
        deferred.resolve(new DESCRIPTOR.PackageDescriptor(path));
    } else {
        deferred.resolve(new DESCRIPTOR.DummyPackageDescriptor(path));
    }
    return deferred.promise;
}

exports.allPathsForPath = function(path) {
    var info = {
        descriptors: {},
        packages: [],
        programs: []
    };
    function addDescriptor(path) {
        var deferred = Q.defer();
        try {
            if (PATH.existsSync(path)) {
                path = FS.realpathSync(path);
                if (/^package\.json$/.test(PATH.basename(path))) {
                    info.packages.push(path);
                } else
                if (/(^|\.)program\.json$/.test(PATH.basename(path))) {
                    info.programs.push(path);
                }
            } else if (/^package\.json$/.test(PATH.basename(path))) {
                info.packages.push(path);
            }
            deferred.resolve();
        } catch(err) {
            deferred.reject(err);
        }
        return deferred.promise;
    }    
    if (PATH.existsSync(path) &&
        (path = FS.realpathSync(path)) &&
        FS.statSync(path).isDirectory()
    ) {
        var deferred = Q.defer();
        GLOB("*.json", {
            root: path,
            cwd: path,
            nomount: true
        }, function (err, filenames) {
            if (err) {
                deferred.reject(err);
                return;
            }
            var done = Q.ref();
            filenames.forEach(function(filename) {
                done = Q.when(done, function() {
                    return addDescriptor(PATH.resolve(path, filename));
                });
            });
            Q.when(done, deferred.resolve, deferred.reject);
        });
        return Q.when(deferred.promise, function() {
            return info;
        });
    } else {
        return addDescriptor(path).then(function() {
            return info;
        });
    }
}

