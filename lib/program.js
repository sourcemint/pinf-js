
const DESCRIPTORS = require("./descriptors");
const PACKAGE = require("./package");
const Q = require("sourcemint-util-js/lib/q");
const UTIL = require("sourcemint-util-js/lib/util");


var Program = exports.Program = function() {
    this.path = null;
    // The root package for this program.
    this.package = null;
    // All dependency packages for this program.
    this.packages = {};
}

Program.prototype.initForPath = function(path) {
    var self = this;
    return DESCRIPTORS.programForPath(path).then(function(descriptor) {
        self.path = descriptor.path;
        self.descriptor = descriptor;
        self.package = new PACKAGE.Package();
        // TODO: Determine 'path' based on descriptor declarations.
        return self.package.initForPath(path);
    });
}

// options: show = [true|false], dev = [true|false]
// callback: function(parentPkg, pkgInfo, context)
Program.prototype.walkPackages = function(options, callback) {
    var self = this;

    options = options || {};
    options.dev = options.dev || false;

    var walked = {};

    function walkPackage(parentPkg, pkgInfo, level, context) {

        var callbackContext = UTIL.copy(context);

        if ((pkgInfo[1].indexOf("devDependencies") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0) && 
            options["dev"] !== true && level > 1) {
            return;
        }

        callbackContext.circular = false;
        if (walked[pkgInfo[0].path]) {
            callbackContext.circular = true;
        }
        walked[pkgInfo[0].path] = true;

        callbackContext.level = level;

        return Q.when(callback(parentPkg, pkgInfo, callbackContext), function(cont) {
            if (cont === false) return;

            if (callbackContext.circular) return;

            var done = Q.ref();
            UTIL.forEach(pkgInfo[0].children.packages, function(child) {
                done = Q.when(done, function() {
                    return walkPackage(pkgInfo[0], child[1], level + 1, UTIL.copy(context));
                });
            });
            return done;                        
        });
    }

    return walkPackage(null, [self.package, [], []], 0, {});
}
