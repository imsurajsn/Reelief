#!/usr/bin/env node
// Zero-dependency codegen: fills manifest.template.json from
// config/product.config.json. Chrome reads manifest.json's name/icons as
// literal strings, so it can't reference the config at runtime — this
// script is the one place that bridges the two. Run it after any edit to
// config/product.config.json:
//
//   node scripts/generate-manifest.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const product = JSON.parse(readFileSync(path.join(root, 'config/product.config.json'), 'utf8'));
const template = readFileSync(path.join(root, 'manifest.template.json'), 'utf8');

const filled = template
  .replace(/"__NAME__"/g, JSON.stringify(product.name))
  .replace(/"__SHORT_NAME__"/g, JSON.stringify(product.shortName))
  .replace(/"__DESCRIPTION__"/g, JSON.stringify(product.description))
  .replace(/"__VERSION__"/g, JSON.stringify(product.version))
  .replace(/"__ICONS__"/g, JSON.stringify(product.icons));

const manifest = JSON.parse(filled);
writeFileSync(
  path.join(root, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

console.log(`manifest.json generated from config/product.config.json (${product.name} v${product.version})`);
