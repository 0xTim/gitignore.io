'use strict';

/*
 * .gitIgnore File Walker and Data Builder
 */
var fs = require('fs');

/*
 * Helper function to walk through the gitIgnore filesystem
 */
var walk = function(dir, ignoreDict, filter, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) { return done(err); }
    var pending = list.length;
    if (!pending) { return done(null, results); }

    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, ignoreDict, filter, function(err, res) {
            results = results.concat(res);
            if (!--pending) { done(null, results); }
          });

        } else {
          if (file.indexOf(filter) > -1) {
            // Strip off file name
            var fileName = file.split('/').pop();
            var name = fileName.split('.')[0];
            var contents = fs.readFileSync(file, 'utf8');
            ignoreDict[name.toLowerCase()] = {
              name: name,
              fileName: fileName,
              contents: contents
            };
          }

          if (!--pending) { done(null, results); }
        }
      });
    });
  });
};

// Build gitIgnore data set
var DatastoreModel = function() {
  var self = this;

  var gitIgnores = {};
  var gitPatches = {};

  // Add .gitignore templates
  walk(__dirname + '/../data', gitIgnores, '.gitignore', function(err, results) {
    if (err) { throw err; }
    var gitIgnoreJSON = [];
    var dropdownList = [];

    var gitIgnoresSorted = [];
    for(var k in gitIgnores) {
      gitIgnoresSorted.push(k);
    }
    gitIgnoresSorted.sort();

    for (var index in gitIgnoresSorted) {
      var key = gitIgnoresSorted[index];
      gitIgnoreJSON.push(gitIgnores[key].name.toLowerCase());
      dropdownList.push({
        id: gitIgnores[key].name.toLowerCase(),
        text: gitIgnores[key].name
      });
    }

    self.dropdownList = dropdownList;
    self.JSONObject = gitIgnores;
    self.JSONObjectSorted = gitIgnoresSorted;
    self.JSONStringLines = gitIgnoresSorted.join('\n') + '\n';

    self.fileCount = gitIgnoresSorted.length;

    self.JSONString = '';
    var arrays = [], size = 5;
    while (gitIgnoresSorted.length > 0) {
      self.JSONString += gitIgnoresSorted.splice(0, size).join(',') + '\n';
    }
  });

  // Add .patch templates
  walk(__dirname + '/../data', gitPatches, '.patch', function(err, results) {
    for (var key in gitPatches) {
      var name = gitPatches[key].name.toLowerCase();
      self.JSONObject[name].contents += '\n### ' + gitIgnores[key].name + ' Patch ###\n' + gitPatches[key].contents;
    }
  });

  // Load order
  var orderList = fs.readFileSync(__dirname + '/../data/order', 'utf8')
      .split('\n')
      .map(function(s) { return s.trim(); })
      .filter(function(s) { return s.length > 0 && !s.startsWith('#'); });
  // order is a mapping filename -> desired position in the output
  var order = {};
  for (var i = 0; i < orderList.length; ++i) {
      order[orderList[i]] = i + 1;
  }
  self.order = order;
};

module.exports = new DatastoreModel();
