import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL('../' + name, import.meta.url), 'utf8'));
const chrome = read('manifest.json'), firefox = read('manifest.firefox.json'), pkg = read('package.json');
for (const manifest of [chrome, firefox]) {
  assert.equal(manifest.version, pkg.version);
  assert.deepEqual(manifest.permissions, ['storage']);
  for (const content of manifest.content_scripts) for (const file of content.js) assert(existsSync(new URL('../' + file, import.meta.url)), file);
}
assert(chrome.background.service_worker);
assert(!firefox.background.service_worker);
assert.deepEqual(firefox.background.scripts, ['model.js', 'background.js']);
assert(firefox.browser_specific_settings.gecko_android.strict_min_version);
console.log('Chrome / Firefox manifests and runtime allowlist valid');
