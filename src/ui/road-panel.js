/** The road study: how far and how wide the beam lights a straight road, from a pair of lamps at the design's mounting
 * height and aim. */

import { h, fmt } from './dom.js';
import { lineChart, chartFrame, dataTable } from './charts.js';
import { ISOLUX } from '../core/road.js';

/** @import { Design } from '../core/model.js' */
/** @import { Analysis } from '../core/analysis.js' */

/** @param {{ design: Design, analysis: Analysis | null, running: boolean, width: number }} props */
export function roadPanel({ design, analysis, running, width }) {
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Road' }),
    h('p', { text: `Two lamps ${fmt(design.mounting.height, 2)} m high, aimed ${fmt(design.mounting.aimPercent, 1)}% down, on a straight road` }),
  ]);
  if (!analysis) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: running ? 'Tracing the beam…' : 'No beam yet' }), 'The road appears with the first trace.'])]);
  const r = analysis.road;
  const centre = Math.round((0 - r.grid.xMin) / r.grid.step);
  /** @type {[number, number][]} */
  const along = [];
  for (let iz = 0; iz < r.nz; iz += 4) {
    const z = r.grid.zMin + iz * r.grid.step;
    if (z >= 5) along.push([z, r.lux[iz * r.nx + centre]]);
  }
  const tiles = h('div', { class: 'tiles stacked' }, [
    h('div', { class: 'tile hero', 'data-tip': 'The farthest point on the lane centre lit to 3 lx' }, [h('div', { class: 'tile-label', text: 'Range at 3 lx' }), h('div', { class: 'tile-value' }, [fmt(r.reach[3], 0), h('small', { text: 'm' })])]),
    h('div', { class: 'tile', 'data-tip': 'The farthest point on the lane centre lit to 1 lx' }, [h('div', { class: 'tile-label', text: 'Range at 1 lx' }), h('div', { class: 'tile-value' }, [fmt(r.reach[1], 0), h('small', { text: 'm' })])]),
    h('div', { class: 'tile', 'data-tip': 'Width of road lit to 3 lx, 20 m ahead' }, [h('div', { class: 'tile-label', text: 'Width at 20 m' }), h('div', { class: 'tile-value' }, [fmt(r.width3lx20m, 1), h('small', { text: 'm at 3 lx' })])]),
  ]);
  const chart = chartFrame({
    title: 'Along the lane centre',
    subtitle: 'Illuminance on the road from both lamps',
    chart: lineChart({
      series: [{ name: 'Illuminance', colour: 'var(--sun-strong)', points: along }],
      x: { label: 'Distance ahead (m)', format: v => fmt(v, 0), domain: [0, r.grid.zMax] },
      y: { label: 'lx', format: v => fmt(v, v < 10 ? 1 : 0) },
      width: Math.max(260, width - 238), height: 168,
      markers: ISOLUX.filter(l => r.reach[l] > 0 && l <= 10).map(l => ({ x: r.reach[l], label: `${l} lx` })),
    }),
    table: dataTable(['Distance (m)', 'Illuminance (lx)'], along.filter((_, i) => i % 5 === 0).map(([z, e]) => [fmt(z, 0), fmt(e, 2)])),
  });
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'study-layout' }, [tiles, chart])]);
}
