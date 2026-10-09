/** The contract between the shell and a workspace. A workspace owns one document and everything derived from it: its
 * ribbon tabs, commands, studies, dock, design panel and canvas views. The shell owns the window around them and gives
 * the shared regions to whichever workspace is active. This module has no runtime code. */

/** @import { DocumentStore } from '../core/history.js' */
/** @import { RibbonTab, Command } from '../ui/shell.js' */

/**
 * @typedef {'design' | 'photometry' | 'vehicle'} WorkspaceId
 *
 * @typedef {{ active: boolean, camera: { scale: number }, resize(): void, fit(): void, request(): void, draw(): void,
 *   zoom(factor: number, x?: number, y?: number): void, pan(dx: number, dy: number): void, canvas: HTMLCanvasElement,
 *   glCanvas?: HTMLCanvasElement }} CanvasView
 *   A view drawn on a canvas in the viewport. Several views may share one canvas; only the active one draws. canvas
 *   takes the pointer; a 3D view also draws on glCanvas, beneath it.
 *
 * @typedef {{ id: string, label: string, icon: string, hint: string }} ViewEntry
 *
 * @typedef {{ entries: [string, string, boolean?][], hint: string }} Legend
 *   Legend entries are [label, colour, dashed]; the hint goes to the status bar.
 *
 * @typedef {{ unit: string, text: (x: number) => string }} ScaleUnit  The scale bar's unit, or none.
 *
 * @typedef {{ down?: (e: PointerEvent, x: number, y: number) => boolean, move?: (e: PointerEvent, x: number, y: number) => boolean,
 *   up?: (e: PointerEvent, x: number, y: number) => boolean }} Interaction
 *   Canvas pointer handling a workspace takes over from the shell's pan and hover; returning true means handled.
 *
 * @typedef {{
 *   id: WorkspaceId, label: string, icon: string,
 *   store: DocumentStore<any>,
 *   saveState: 'saved' | 'pending' | 'error',
 *   fileTypes: string,
 *   start(): Promise<void>,
 *   activate(): void,
 *   deactivate(): void,
 *   title(): string,
 *   rename(title: string): void,
 *   tabs(): RibbonTab[],
 *   commandList(): Command[],
 *   views(): ViewEntry[],
 *   view: string,
 *   setView(id: string): void,
 *   current: CanvasView,
 *   renderPanels(): void,
 *   renderDock(): void,
 *   breadcrumb(): (Node | string)[],
 *   legend(): Legend,
 *   scaleUnit(): ScaleUnit | null,
 *   readout(x: number, y: number): string | null,
 *   interaction?: Interaction,
 *   download(): void,
 *   accepts(file: File): boolean,
 *   openFile(file: File): Promise<void>,
 *   key?: (key: string, e: KeyboardEvent) => string | null,
 *   shortcuts(): [string, string][],
 * }} Workspace
 *   fileTypes: the file picker's accept list. key: a workspace shortcut, returning the command to run.
 */

export {};
