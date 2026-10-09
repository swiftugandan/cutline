#!/usr/bin/env node
/** Writes schema/cutline.<document>.v<n>.schema.json for every document type from its spec. Run after changing a
 * spec: DESIGN_SPEC in src/core/model.js, STUDY_SPEC in src/core/study.js or VEHICLE_SPEC in src/core/vehicle.js. */
import { writeFileSync } from 'node:fs';
import { SCHEMAS, jsonSchemaFor, schemaFileName } from '../src/core/schema.js';

for (const entry of SCHEMAS) {
  const path = new URL(`../schema/${schemaFileName(entry)}`, import.meta.url);
  writeFileSync(path, JSON.stringify(jsonSchemaFor(entry), null, 2) + '\n');
  console.log(`Wrote ${path.pathname}`);
}
