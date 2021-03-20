#!/usr/bin/env node

// Imports
const {existsSync, readFileSync, statSync} = require('fs');
const {basename, join, resolve} = require('path');

// Constants
const MAX_IMAGE_SIZE = 30 * 1024;  // 30kb
const CONTENT_DIR = resolve(__dirname, '../../content');
const IMAGES_DIR = join(CONTENT_DIR, 'images/bios');
const CONTRIBUTORS_PATH = join(CONTENT_DIR, 'marketing/contributors.json');
const EXISTING_GROUPS = new Set(['Angular', 'GDE', 'Collaborators']);

// The list of profile images that exceed specified `MAX_IMAGE_SIZE` limit.
// These images were added before the size check was introduced. Exclude these images
// from size check for now, but still check other images (more importantly run the check
// for new PRs where profile images are added).
const EXCLUDE_FROM_SIZE_CHECK = new Set([
  'alainchautard.png', 'ahsanayaz.jpg', 'alan-agius4.jpg', 'andrew-kushnir.jpg',
  'brian-love.jpg', 'cexbrayat.jpg', 'christianliebel.jpg', 'patovargas.png', 'gerardsans.jpg',
  'jessicajaniuk.jpg', 'JiaLiPassion.jpg', 'juristr.jpg', 'katerina.jpg', 'kimmaida.jpg',
  'kyliau.jpg', 'lacolaco.jpg', 'leonardo.jpg', 'nirkaufman.jpg', 'sajee.jpg', 'sonukapoor.jpg',
  'tracylee.jpg', 'twerske.jpg', 'wesgrimes.jpg'
]);

// Run
_main();

// Functions - Definitions
function _main() {
  const contributors = JSON.parse(readFileSync(CONTRIBUTORS_PATH, 'utf8'));

  // Check that there are no missing images.
  const expectedImages = Object.keys(contributors)
      .filter(key => !!contributors[key].picture)
      .map(key => join(IMAGES_DIR, contributors[key].picture));
  const missingImages = expectedImages.filter(path => !existsSync(path));

  if (missingImages.length > 0) {
    throw new Error(
        'The following pictures are referenced in \'contributors.json\' but do not exist:' +
        missingImages.map(path => `\n  - ${path}`).join(''));
  }

  // Check that there are no images that exceed the size limit.
  const tooLargeImages = expectedImages
       .filter(path => !EXCLUDE_FROM_SIZE_CHECK.has(basename(path)))
       .filter(path => statSync(path).size > MAX_IMAGE_SIZE);
  if (tooLargeImages.length > 0) {
    throw new Error(
        `The following pictures exceed maximum size limit of ${MAX_IMAGE_SIZE / 1024}kb:` +
        tooLargeImages.map(path => `\n  - ${path}`).join(''));
  }

  // Verify that all keys are sorted alphabetically
  const keys = Object.keys(contributors);
  for (let i = 1; i < keys.length; i++) {
    if (keys[i - 1].toLowerCase() > keys[i].toLowerCase()) {
      throw new Error(
        `The following keys in 'contributors.json' are not in alphabetical order: '${keys[i - 1]}' and '${keys[i]}'.`
      );
    }
  }

  Object.entries(contributors).forEach(([key, entry]) => {
    // Make sure `lead` and `mentor` fields refer to existing entries
    if (entry.lead && !contributors[entry.lead]) {
      throw new Error(`The '${key}' entry contains 'lead' field, but it refers to non-existing entry ('${entry.lead}').`);
    }
    if (entry.mentor && !contributors[entry.mentor]) {
      throw new Error(`The '${key}' entry contains 'mentor' field, but it refers to non-existing entry ('${entry.mentor}').`);
    }

    // Verify that `groups` field is always present and contains existing groups
    if (!entry.groups || !Array.isArray(entry.groups) || entry.groups.length === 0) {
      throw new Error(`The 'groups' field should be defined as a non-empty array (entry: '${key}').`);
    }
    if (entry.groups.some(group => !EXISTING_GROUPS.has(group))) {
      throw new Error(`The '${key}' entry contains 'groups' field with unknown values ` +
        `(groups: ${JSON.stringify(entry.groups)}, known values: ${JSON.stringify(Array.from(EXISTING_GROUPS))}).`);
    }
  });
}
