'use strict';

var es = require('event-stream');
var _ = require("lodash");
var vfs = require('vinyl-fs');
var sassGraph = require('sass-graph');

var stream;

function gulpSassInheritance(options) {
  options = options || {};

  var files = [];

  function writeStream(currentFile) {
    if (currentFile && currentFile.contents.length) {
      files.push(currentFile.path);
    }
  }

  function findWhoImports(files, graph) {
    return _.flatten(_.map(files, function(file) {

      if (graph.index && graph.index[file]) {
        var fullpaths = graph.index[file].importedBy;
        if (fullpaths.length) {
          var needsToResolve = _.filter(fullpaths, function(file) {
            return /\/_/.test(file)
          });

          if (needsToResolve.length) {
            fullpaths = _.difference(fullpaths, needsToResolve);
            fullpaths = _.union(fullpaths, findWhoImports(needsToResolve, graph));
          }
        }
        else if (!/\/_/.test(file)) {
          fullpaths.push(file);
        }

        if (options.debug) {
          console.log('File', file);
          console.log(' - importedBy', fullpaths);
        }
        return fullpaths;
      }
      return [];
    }));
  }

  function endStream() {
    if (files.length) {
      var graph = sassGraph.parseDir(options.dir, options);

      var filesPaths = _.unique(findWhoImports(files, graph));

      vfs.src(filesPaths)
          .pipe(es.through(
              function (f) {
                stream.emit('data', f);
              },
              function () {
                stream.emit('end');
              }
          ));
    } else {
      stream.emit('end');
    }
  }

  stream = es.through(writeStream, endStream);

  return stream;
}

module.exports = gulpSassInheritance;
