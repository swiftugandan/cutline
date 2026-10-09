/** The published JSON Schemas for Cutline's document files, generated from the same specs the loaders validate
 * against: the lamp design, the photometry study and the vehicle. */

import { toJsonSchema } from './spec.js';
import { DESIGN_SPEC, FORMAT_VERSION } from './model.js';
import { STUDY_SPEC, STUDY_VERSION } from './study.js';
import { VEHICLE_SPEC, VEHICLE_VERSION } from './vehicle.js';

/** @import { Spec } from './spec.js' */

/**
 * @typedef {{ name: string, version: number, title: string, spec: Spec, description: string }} SchemaEntry
 *   name is the document type, as in cutline.<name>.v<version>.schema.json.
 */

/** @type {SchemaEntry[]} */
export const SCHEMAS = [
  {
    name: 'design', version: FORMAT_VERSION, title: 'Cutline design', spec: DESIGN_SPEC,
    description: 'A car headlamp design. Lengths are millimetres, angles degrees and flux lumens; the mounting height is metres. Cross-field rules are listed in docs/SCHEMA.md and checked by the loader.',
  },
  {
    name: 'photometry', version: STUDY_VERSION, title: 'Cutline photometry study', spec: STUDY_SPEC,
    description: 'A light distribution file and what the engineer decided about it: how its angles map, what the lamp is, the markets to check, the engineer\'s targets, the road and the pictures. Angles are degrees, the road is metres. Cross-field rules are listed in docs/SCHEMA.md and checked by the loader.',
  },
  {
    name: 'vehicle', version: VEHICLE_VERSION, title: 'Cutline vehicle', spec: VEHICLE_SPEC,
    description: 'A vehicle and the lamps placed on it, in millimetres in the vehicle frame: x forwards from the front-most point, y to the left of the median plane, z up from the ground. The model file itself is kept beside this document, not in it. Cross-field rules are listed in docs/SCHEMA.md and checked by the loader.',
  },
];

/** @param {SchemaEntry} entry @returns {Record<string, unknown>} */
export function jsonSchemaFor(entry) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `urn:cutline:schema:${entry.name}:v${entry.version}`,
    title: entry.title,
    ...toJsonSchema(entry.spec),
    description: entry.description,
  };
}

/** The schema file name for an entry. @param {SchemaEntry} entry */
export const schemaFileName = entry => `cutline.${entry.name}.v${entry.version}.schema.json`;

/** @returns {Record<string, unknown>} */
export function designJsonSchema() {
  return jsonSchemaFor(SCHEMAS[0]);
}
