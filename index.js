const PATTERN = /<(svg|img|math)\s+(.*?)src\s*=\s*"(.*?)"(.*?)\/?>/gi;

const fs = require('fs');
const path = require('path');
const SVGO = require('svgo');
const asyncReplace = require('async-replace');

const SVGOConfiguration = {
  plugins: [
    {
      removeTitle: true,
    },
  ],
};

module.exports = function (content) {
  this.cacheable && this.cacheable();
  const loader = this;
  const callback = this.async();
  const loaderUtils = require('loader-utils');
  const options = Object.assign({strict: '[markup-inline]'}, loaderUtils.getOptions(this));
  const svgo = new SVGO(options.svgo || SVGOConfiguration);
  const strict = options.strict.replace(/\[(data-)?([\w-]+)\]/, '$2');

  function replacer(match, tagName, preAttributes, fileName, postAttributes, offset, string, done) {
    const isSvgFile = path.extname(fileName).toLowerCase() === '.svg';
    const isImg = tagName.toLowerCase() === 'img';
    const meetStrict = !strict || new RegExp(`[^\w-](data-)?${strict}[^\w-]`).test(match);

    if (isImg && !isSvgFile || !meetStrict) {
      done(null, match);
    } else {

      const filePath = loaderUtils.urlToRequest(fileName, options.root);
      
      loader.resolve(loader.context, filePath, function(err, resolvedFilePath) {
        if (err) done(err);
        loader.addDependency(resolvedFilePath);
        let fileContent = fs.readFileSync(resolvedFilePath, {encoding: 'utf-8'});
        if (isSvgFile) {
          // It's callback, But it's sync call, So, we needn't use async loader
          svgo.optimize(fileContent, (result) => {
            fileContent = result.data;
          });
        }
        let replacedContent = fileContent.replace(/^<svg/, '<svg ' + preAttributes + postAttributes + ' ');

        done(null, replacedContent);
      });
    }
  }

  asyncReplace(content, PATTERN, replacer, function(err, result) {
    callback(err, result);
  });
};
