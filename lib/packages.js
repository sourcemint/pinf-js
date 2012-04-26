
var PATH = require("path");
var FS = require("fs");
var GLOB = require("sourcemint-util-js/lib/glob").Glob;
var Q = require("sourcemint-util-js/lib/q");
var UTIL = require("sourcemint-util-js/lib/util");
var DESCRIPTORS = require("./descriptors");
var PACKAGE = require("./package");


exports.loadDependenciesForProgram = function(program) {    
    return exports.loadDependenciesForPackage(program, program.package);
}

exports.loadDependenciesForPackage = function(context, package) {
    var self = this;

    function walk(packagePath) {
        if (context.packages[packagePath]) {
            return Q.call(function() {
                return context.packages[packagePath];
            });
        }

        var done;
        if (packagePath === package.path) {
            context.packages[packagePath] = package;
            done = Q.call(function() {});
        } else {
            context.packages[packagePath] = new PACKAGE.Package();
            done = context.packages[packagePath].initForPath(packagePath);
        }

        return Q.when(done, function() {

            function addPackage(path, type, name, dir) {
                
                name = name.toLowerCase();
                
                // See if package already exists. This is the case for all packages found
                // in directories and now being looked for by name in descriptor.
                var pkg = context.packages[packagePath].children.packages[PATH.dirname(path)];
                if (pkg) {
                    return Q.call(function() {
                        context.packages[packagePath].addChild(pkg[0], type, name);
                    });
                } else
                if (!PATH.existsSync(path)) {
                    return Q.call(function() {
//                        if (type === "dependencies" || type === "devDependencies") {
                        if (dir === "node_modules/") {
                            // Go up tree to see if we can find module.
                            function findPackage(lookupPath) {
                                if (PATH.existsSync(PATH.join(lookupPath, "node_modules", name))) {
                                    return walk(PATH.join(lookupPath, "node_modules", name)).then(function(pkg) {
                                        context.packages[packagePath].addChild(pkg, type, name);
                                    });
                                } else
                                if (lookupPath === "/") {
                                    var pkg = new PACKAGE.DummyPackage();
                                    return pkg.initForPath(path).then(function() {
                                        context.packages[packagePath].addChild(pkg, type, name);
                                    });
                                } else {
                                    return findPackage(PATH.dirname(lookupPath));
                                }
                            }
                            return findPackage(path);
                        } else
                        if (dir === "mapped_packages/") {
                            if (!context.packages[packagePath].children["node_modules/"][name]) {
                                var pkg = new PACKAGE.DummyPackage();
                                return pkg.initForPath(path).then(function() {
                                    context.packages[packagePath].addChild(pkg, type, name);
                                });
                            }
                        }
                    });
                }
                return DESCRIPTORS.allPathsForPath(path).then(function(info) {
                    var done = Q.ref();
                    // If no package.json was wound we assume one should be there (if not it is a dummy package).
                    if (info.packages.length === 0) {
                        info.packages.push(PATH.join(path, "package.json"));
                    }
                    info.packages.forEach(function(path) {
                        done = Q.when(done, function() {
                            return walk(PATH.dirname(path)).then(function(pkg) {
                                context.packages[packagePath].addChild(pkg, type, name);
                            });
                        });
                    });
                    return done;
                });
            }
            
            function searchPath(matchPath, type) {
                var deferred = Q.defer();
                GLOB(matchPath, {
                    root: packagePath,
                    cwd: packagePath,
                    nomount: true
                }, function (err, filepaths) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    var done = Q.ref();
                    filepaths.forEach(function(filepath) {
                        done = Q.when(done, function() {
                            return addPackage(PATH.resolve(packagePath, filepath), type, PATH.basename(filepath), type);
                        });
                    });
                    Q.when(done, deferred.resolve, deferred.reject);
                });
                return deferred.promise;
            }
            
            return searchPath("node_modules/*", "node_modules/").then(function() {
                return searchPath("mapped_packages/*", "mapped_packages/").then(function() {

                    var descriptor = context.packages[packagePath].descriptor.json;
                    var done = Q.ref();
                    [
                        ["dependencies", "node_modules/"],
                        ["devDependencies", "node_modules/"],
                        ["mappings", "mapped_packages/"],
                        ["devMappings", "mapped_packages/"]
                    ].forEach(function(type) {
                        if (!descriptor[type[0]]) return;
                        UTIL.forEach(descriptor[type[0]], function(pair) {
                            done = Q.when(done, function() {
                                if (pair[1] === ".") {
                                    return addPackage(PATH.join(packagePath), type[0], pair[0]);
                                } else {
                                    return addPackage(PATH.join(packagePath, type[1], pair[0]), type[0], pair[0], type[1]);
                                }
                            });
                        });
                    });
                    return done;
                });
            });
        }).then(function() {
            return context.packages[packagePath];
        });
    }
    
    return walk(package.path);
}

