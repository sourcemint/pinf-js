
var UTIL = require("./util");

// @see http://semver.org/

exports.validate = function(version, options) {
    if(!version || typeof version != "string") return false;
    if(!/^(\d*)\.(\d*)\.(\d*)(([A-Za-z-]*)(\d*)?)?$/.test(version)) return false;
    if(!options) return true;
    if(options.numericOnly) {
        if(!/^[\d\.]*$/.test(version)) return false;
    }
    if(options.withSuffix) {
        if(/^(\d*)\.(\d*)\.(\d*)$/.test(version)) return false;
    }
    return true;
}

// @see http://www.php.net/manual/en/function.version-compare.php
exports.compare = function(a, b) {
    var versions = exports.sort([a, b]);
    if(versions[0]==versions[1]) {
        return 0;
    } else
    if(versions[0]==a) {
        return -1;
    } else {
        return 1;
    }
}

// NOTE: We also sort the alphanumeric string by detaching the numeric suffix if applicable
exports.sort = function(versions) {
    var aO, bO;
    versions.sort(function(a, b) {
        
        aO = a;
        bO = b;

        a = a.split(".");
        b = b.split(".");
        
        a[0] = parseInt(a[0]);
        b[0] = parseInt(b[0]);
        
        if(a[0]>b[0]) return 1;
        if(a[0]<b[0]) return -1;

        a[1] = parseInt(a[1]);
        b[1] = parseInt(b[1]);
        
        if(a[1]>b[1]) return 1;
        if(a[1]<b[1]) return -1;
        
        a = a[2].match(/^(\d*)(\D*)(\d*)?$/);
        if(!a) {
            throw new Error("Invalid version: " + aO);
        }
        b = b[2].match(/^(\d*)(\D*)(\d*)?$/);
        if(!b) {
            throw new Error("Invalid version: " + bO);
        }

        a[1] = parseInt(a[1]);
        b[1] = parseInt(b[1]);
        
        if(a[1]>b[1]) return 1;
        if(a[1]<b[1]) return -1;

        if(!a[2] && b[2]) return 1;
        if(a[2] && !b[2]) return -1;
        
        if(a[2]>b[2]) return 1;
        if(a[2]<b[2]) return -1;

        a[3] = parseInt(a[3]);
        b[3] = parseInt(b[3]);

        if(a[3]>b[3]) return 1;
        if(a[3]<b[3]) return -1;
        
        return 0;
    });
    return versions;
}

exports.latestForMajor = function(versions, version) {
    if(!versions || versions.length==0) {
        return false;
    }
    versions = exports.sort(versions);
    if(!version) {
        return versions.pop();
    }
    var majorVersion = version.split(".")[0],
        numeric = exports.validate(version, {"numericOnly":true}),
        m;
    versions = versions.filter(function(version) {
        if(version.split(".")[0]!=majorVersion) {
            return false;
        }
        m = version.match(/^(\d*\.\d*\.\d*)(\D*)(\d*)?$/);
        if(!numeric) {
            if(!m[2]) return false;
        } else {
            if(m[2]) return false;
        }
        return true;
    });
    if(!versions || versions.length==0) return false;
    return versions.pop();
}

exports.latestForEachMajor = function(versions, includeAlphanumeric) {
    if(!versions || versions.length==0) {
        return false;
    }
    versions = exports.sort(versions);

    versions.reverse();
    var found = {},
        major,
        numeric,
        m;
    versions = versions.filter(function(version) {
        numeric = exports.validate(version, {"numericOnly":true});
        if(!(includeAlphanumeric || numeric))
            return false;
        major = version.split(".")[0];
        if(includeAlphanumeric && !numeric) {
            m = version.match(/^(\d*)(\.\d*\.\d*)(\D*)(\d*)?$/);
            major = m[1] + "A";
            if(found[m[1]]) return false;
        }
        if(found[major]) return false;
        found[major] = true;
        return true;
    });
    versions.reverse();
    return versions;
}

exports.getMajor = function(version, includeAlphanumeric) {
    if(!version) return false;
    if(!includeAlphanumeric) return version.split(".").shift();
    var m = version.match(/^(\d*)(\.\d*\.\d*)(\D*)(\d*)?$/);
    if(!m) return false;
    if(!m[3]) return m[1];
    return m[1] + m[2] + m[3];
}


exports.versionsForTags = function(tags, path) {
    if(!tags) return false;
    var versions = UTIL.map(tags, function(tag) {
        if(path) {
            if(tag.length < (path.length+1)) return false;
            tag = tag.substr(path.length+1);
        }
        if(/^v(\d*)\.(\d*)\.(\d*)(([A-Za-z-]*)(\d*)?)?$/.test(tag)) {
            // remove "v" prefix to get valid version string
            return tag.substr(1);
        }
        return false;
    });
    versions = versions.filter(function(version) {
        return !!version;
    });
    if(!versions) return false;
    versions = exports.sort(versions);    
    return versions;
}

