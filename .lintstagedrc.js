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
    // scripts/ files live outside the project tsconfig's include glob and the
    // type-checked parser can't resolve them. Lint everything else.
    const lintable = files.filter((f) => !/[\\/]scripts[\\/]/.test(f));
    if (lintable.length === 0) return [];
    const byService = groupByService(lintable);
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
