/** The published JSON Schema for design files, generated from the same spec the loader validates against. */

import { toJsonSchema } from './spec.js';
import { DESIGN_SPEC, FORMAT_VERSION } from './model.js';

export const SCHEMA_ID = `urn:cutline:schema:design:v${FORMAT_VERSION}`;

/** @returns {Record<string, unknown>} */
export function designJsonSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_ID,
    title: 'Cutline design',
    ...toJsonSchema(DESIGN_SPEC),
    description: 'A car headlamp design. Lengths are millimetres, angles degrees and flux lumens; the mounting height is metres. Cross-field rules are listed in docs/SCHEMA.md and checked by the loader.',
  };
}
