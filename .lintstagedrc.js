'use strict';

const { resolve } = require('path');

/** @param {string[]} files */
function groupByService(files) {
  const map = {};
  for (const file of files) {
    const match = file.match(/services[\\/]([^\\/]+)[\\/]/);
    if (match) {
      const svc = match[1];
      if (!map[svc]) map[svc] = [];
      map[svc].push(file);
    }
  }
  return map;
}

module.exports = {
  'services/**/*.ts': (files) => {
    const byService = groupByService(files);
    return Object.entries(byService).map(([svc, svcFiles]) => {
      const cfg = resolve(__dirname, 'services', svc, 'eslint.config.mjs');
      return `eslint --fix --config ${cfg} ${svcFiles.join(' ')}`;
    });
  },
  'frontend/src/**/*.{ts,tsx}': (files) => {
    const cfg = resolve(__dirname, 'frontend', 'eslint.config.mjs');
    return `eslint --fix --config ${cfg} ${files.join(' ')}`;
  },
  'mobile/**/*.{ts,tsx}': (files) => {
    const cfg = resolve(__dirname, 'mobile', 'eslint.config.js');
    return `eslint --fix --config ${cfg} ${files.join(' ')}`;
  },
};
