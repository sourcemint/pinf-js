
/*
 * @see http://semver.org/
 * 
 * This lib builds on semver to support:
 * 
 *   - Versions without a patch part
 *   - Split sorting for suffixes: `alpha1`, `alpha1rc1`
 *   
 */

var UTIL = require("sourcemint-util-js/lib/util");

/**
 * Determine the kind of version selector we have
 */
exports.parse = function(revision)
{
    var info = {
        revision: revision
    };

    // v?x.x*
    var m = revision.match(/^(v?)((\d*)(\.(\d*)(\.(\d*)(([A-Za-z-]*)(\d*)?)?)?)?)$/);
    if (m && m[4])
    {
        if (m[1]) info.prefix = m[1];
        info.version = m[2];
    } else
    if (revision.length === 40)
    {
        // GIT ref
        // TODO: Check characters to ensure we don't have a 40 character branch name
        info.commit = revision;
    } else
    if (m)
    {
        if (m[1]) info.prefix = m[1];
        info.version = m[2];
        info.stream = true;
    } else {
        info.branch = revision;
        info.stream = true;
    }
    return info;
}


exports.validate = function(version, options) {
    if(typeof version === "undefined" || version === null || version === false || typeof version != "string") return false;
    if(!/^v?(\d+)\.(\d+)(([A-Za-z-]+)(\d+)){0,2}$/.test(version) &&
       !/^v?(\d+)\.(\d+)\.(\d+)(([A-Za-z-]+)(\d+)){0,2}$/.test(version)) return false;
    if(!options) return true;
    if(options.numericOnly) {
        if(!/^v?[\d\.]*$/.test(version)) return false;
    }
    if(options.withSuffix) {
        if(/^v?(\d*)\.(\d*)$/.test(version) ||
           /^v?(\d*)\.(\d*)\.(\d*)$/.test(version)) return false;
    }
    return true;
}

// @see http://www.php.net/manual/en/function.version-compare.php
exports.compare = function(a, b) {
    return compareVersion(a, b, true);
}

// NOTE: We also sort the alphanumeric string by detaching the numeric suffix if applicable
exports.sort = function(versions) {
    versions.sort(function(a, b) {
        return compareVersion(a, b);
    });
    return versions;
}

var normalizeRevision = exports.normalizeRevision = function(revision)
{
    return (""+revision).replace(/^v/, "").replace(/^[^:]*:v?/, "");
}

function fillVersionZeros(version)
{
    var returnString = false;
    if (!UTIL.isArrayLike(version)) {
        returnString = true;
        version = (""+version).replace(/^v/, "").split(".");
    }
    
    if (version.length === 1 && (m = version[0].match(/^(\d+)([A-Za-z-\d]*)$/))) {
        version[0] = m[1];
        version.push("0" + m[2]);
    }
    if (version.length === 2 && (m = version[1].match(/^(\d+)([A-Za-z-\d]*)$/))) {
        version[1] = m[1];
        version.push("0" + m[2]);
    }
    
    if (returnString)
        return version.join(".");
    return version;
}

function compareVersion(aO, bO, isEquivalent)
{
    var cmp, m, ifEqual = 0;
    
    var a = aO.replace(/^v/, "").split(".");
    var b = bO.replace(/^v/, "").split(".");

    // Fill in zeros for minor and patch if applicable

    if (a.length > b.length) ifEqual = 1;
    if (a.length < b.length) ifEqual = -1;
    
    a = fillVersionZeros(a);
    b = fillVersionZeros(b);
    
    if (a.join(".") == b.join(".")) {
        if (isEquivalent) return 0;
        return ifEqual;
    }
    
    if ((cmp = comparePart(a[0], b[0])) !== 0) return cmp;
    if ((cmp = comparePart(a[1], b[1])) !== 0) return cmp;
    if ((cmp = comparePart(a[2], b[2])) !== 0) return cmp;
    
    return 0;
}

function comparePart(aO, bO)
{
    if (aO == bO) return 0;

    var a = aO.match(/^(\d+)(([A-Za-z-]+)(\d+)?)?(([A-Za-z-]+)(\d+)?)?$/);
    if(!a) {
        throw new Error("Invalid version: " + aO);
    }

    var b = bO.match(/^(\d+)(([A-Za-z-]+)(\d+)?)?(([A-Za-z-]+)(\d+)?)?$/);
    if(!b) {
        throw new Error("Invalid version: " + bO);
    }
    /*
    Example: 
        [ 
        0  '1beta1rc100',
        1  '1',
        2  'beta1',
        3  'beta',
        4  '1',
        5  'rc100',
        6  'rc',
        7  '100'
        ]
    */

    a[1] = parseInt(a[1]);
    b[1] = parseInt(b[1]);
    
    if(a[1]>b[1]) return 1;
    if(a[1]<b[1]) return -1;

    if(!a[2] && !b[2]) return 0;    
    if(a[2] && !b[2]) return -1;
    if(!a[2] && b[2]) return 1;
    
    if(a[3]>b[3]) return 1;
    if(a[3]<b[3]) return -1;

    if (typeof a[4] === "undefined" && typeof b[4] !== "undefined") return -1;
    if (typeof b[4] === "undefined" && typeof a[4] !== "undefined") return 1;
    
    a[4] = parseInt(a[4]);
    b[4] = parseInt(b[4]);

    if(a[4]>b[4]) return 1;
    if(a[4]<b[4]) return -1;

    if(!a[5] && !b[5]) return 0;
    if(!a[5] && b[5]) return 1;
    if(a[5] && !b[5]) return -1;
    
    if(a[6]>b[6]) return 1;
    if(a[6]<b[6]) return -1;

    if (typeof a[7] === "undefined" && typeof b[7] !== "undefined") return -1;
    if (typeof b[7] === "undefined" && typeof a[7] !== "undefined") return 1;
    
    a[7] = parseInt(a[7]);
    b[7] = parseInt(b[7]);
    
    if(a[7]>b[7]) return 1;
    if(a[7]<b[7]) return -1;
    
    return 0;
}

exports.latestForMajor = function(versions, revision) {
    // TODO: Log deprecated
    return exports.latestForRevision(versions, revision);
}
    
exports.latestForRevision = function(versions, revision, includeAlphanumeric) {
    if(!versions || versions.length==0) {
        return false;
    }
    
    includeAlphanumeric = includeAlphanumeric || false;
    
    var normalizedRevision = false,
        exactMatch = false;
    if (revision) {
        normalizedRevision = normalizeRevision(revision);
        var revisionParts = revision.split(":");
        revision = fillVersionZeros(normalizedRevision);
        if (revisionParts.length === 2 && 
            revision == normalizedRevision &&
            revisionParts[1] == revision)
        {
            exactMatch = true;
        }
        versions = UTIL.copy(versions);
        // We inject our revision which gets sorted and then look for it below and work forwards
        // to get the latest.
        versions.push(revision);
    }

    versions = exports.sort(versions);

    if(!revision)
        return versions.pop();

    var revisionIndex = versions.indexOf(revision),
        revisionParts = revision.split("."),
        revisionSuffix = revisionParts[2].match(/^(\d+)(([A-Za-z-]+)(\d+)?)?(([A-Za-z-]+)(\d+)?)?$/);

    if (!revisionSuffix) {
        return false;
    }

    if (revisionIndex === versions.length-1 && !includeAlphanumeric)
    {
        if (versions.length > 1 && normalizeRevision(versions[versions.length-2]) === normalizeRevision(versions[versions.length-1]))
        {
            return versions[versions.length-2];
        }
        return false;
    }
    
    if (revisionIndex >= 0 && exactMatch)
    {
        if (revisionIndex >=1 && normalizeRevision(versions[revisionIndex-1]) == normalizedRevision)
            return versions[revisionIndex-1];
        if (revisionIndex < versions.length-1 && normalizeRevision(versions[revisionIndex+1]) == normalizedRevision)
            return versions[revisionIndex+1];
    }

    var version,
        lastMatchingVersion = false,
        suffix;

    function finalize()
    {
        if (lastMatchingVersion === false && revisionIndex > 0 && includeAlphanumeric) {
            return versions[revisionIndex-1];
        }
        return lastMatchingVersion;
    }
    
    for (var i = revisionIndex+1 ; i< versions.length ; i++)
    {
        version = fillVersionZeros(versions[i]).split(".");

        if (version[0] === revision[0]) {
            
            suffix = version[2].match(/^(\d+)(([A-Za-z-]+)(\d+)?)?(([A-Za-z-]+)(\d+)?)?$/);

            if (!revisionSuffix[2] || (revisionSuffix[2] && !suffix[2])) {
                lastMatchingVersion = versions[i];
            } else {
                if (suffix[3].substring(0, revisionSuffix[3].length) >= revisionSuffix[3]) {
                    if (revisionSuffix[4] && !suffix[4]) {
                        lastMatchingVersion = versions[i];
                    } else {
                        if (!revisionSuffix[4]) {
                            lastMatchingVersion = versions[i];
                        } else
                        if (suffix[4] >= revisionSuffix[4]) {
                            if (!revisionSuffix[5] || (revisionSuffix[5] && !suffix[5])) {
                                lastMatchingVersion = versions[i];
                            } else {
                                if (suffix[6].substring(0, revisionSuffix[6].length) >= revisionSuffix[6]) {
                                    if (revisionSuffix[7] && !suffix[7]) {
                                        lastMatchingVersion = versions[i];
                                    } else {
                                        if (!revisionSuffix[7] || suffix[7] >= revisionSuffix[7]) {
                                            lastMatchingVersion = versions[i];
                                        }
                                    }
                                }
                            }
                            
                        }
                    }
                }
            }
        }

        if (version[0] != revision[0]) return finalize();
    }
    
    return finalize();
}

exports.latestForEachMajor = function(versions, includeAlphanumeric) {
    if(!versions || versions.length==0) {
        return false;
    }
    versions = exports.sort(versions);
    versions.reverse();
    var found = {},
        major;
    versions = versions.filter(function(version) {
        version = fillVersionZeros(version);
        major = version.split(".")[0];
        if (exports.validate(version, {"numericOnly":true}))
        {
            if(found[major]) return false;
            found[major] = true;
            return true;
        }
        else
        if (includeAlphanumeric)
        {
            major += "A";
            if(found[major]) return false;
            found[major] = true;
            return true;
        }
    });
    versions.reverse();
    return versions;
}

exports.getMajor = function(version, includeAlphanumeric) {
    if(!version) return false;
    if(!includeAlphanumeric) return version.split(".").shift().replace(/^v/, "");

    var m = version.match(/^v?((\d+)\.\d+(\.\d+)?)$/);
    if (m) return m[2];
    
    var m = version.match(/^v?(\d+)\.(\d+)([A-Za-z-\d]*)(.(\d+)([A-Za-z-\d]*))?$/);
    if (!m)
        throw new Error("Invalid version: " + version);
        
    if (m[6]) {
        return m[1] + "." + m[2] + m[3] + "." + m[5] + m[6].replace(/\d+$/, "");
    } else {
        return m[1] + "." + m[2] + m[3].replace(/\d+$/, "");
    }
}


exports.versionsForTags = function(tags, path) {
    if(!tags) return false;
    var tag, remove;
    for (var i=tags.length-1 ; i>=0 ; i--) {
        tag = tags[i];
        remove = false      
        if(path) {
            if(tag.length < (path.length+1)) remove = true;
            tag = tags[i] = tag.substr(path.length+1);
        }
        if (!remove)
            remove = !exports.validate(tag);
        if (remove) {
            tags.splice(i, 1);
        }
    }
    return tags;
}


