/** The contract between the shell and a workspace. A workspace owns one document and everything derived from it: its
 * ribbon tabs, commands, studies, dock, design panel and canvas views. The shell owns the window around them and gives
 * the shared regions to whichever workspace is active. This module has no runtime code. */

/** @import { DocumentStore } from '../core/history.js' */
/** @import { RibbonTab, Command, MenuEntry } from '../ui/shell.js' */
/** @import { MeasureAdapter } from '../ui/measure.js' */

/**
 * @typedef {'design' | 'photometry' | 'vehicle'} WorkspaceId
 *
 * @typedef {{ active: boolean, camera: { scale: number }, width: number, height: number, resize(): void,
 *   fit(animate?: boolean): void, request(): void, draw(): void, zoom(factor: number, x?: number, y?: number): void,
 *   pan(dx: number, dy: number): void, canvas: HTMLCanvasElement, glCanvas?: HTMLCanvasElement,
 *   overlay: ((ctx: CanvasRenderingContext2D) => void) | null, plain?: boolean, goal?: { scale: number } | null,
 *   onCamera?: (() => void) | null, centreOn?: (x: number, y: number) => void, snapshot?: () => HTMLCanvasElement }} CanvasView
 *   A view drawn on a canvas in the viewport. Several views may share one canvas; only the active one draws. canvas
 *   takes the pointer; a 3D view also draws on glCanvas, beneath it. overlay is the shell's drawing (the measure
 *   tool), called at the end of every draw in CSS pixels. plain asks for a drawing without on-screen aids (the measure
 *   tool, hover, the view cube), for an exported image or a report. A view that moves its camera smoothly gives the camera it is moving to as goal and calls onCamera
 *   on each step. centreOn
 *   brings a canvas point to the middle of the view, for a view whose camera does not simply pan. snapshot
 *   gives the view as one image, for a view drawn on more than one canvas.
 *
 * @typedef {{ id: string, label: string, icon: string, hint: string }} ViewEntry
 *
 * @typedef {{ entries: [string, string, boolean?][], hint: string }} Legend
 *   Legend entries are [label, colour, dashed]; the hint goes to the status bar.
 *
 * @typedef {{ unit: string, text: (x: number) => string }} ScaleUnit  The scale bar's unit, or none.
 *
 * @typedef {{ down?: (e: PointerEvent, x: number, y: number) => boolean, move?: (e: PointerEvent, x: number, y: number) => boolean,
 *   up?: (e: PointerEvent, x: number, y: number) => boolean, cancel?: () => void }} Interaction
 *   Canvas pointer handling a workspace takes over from the shell's pan and hover; returning true means handled. move
 *   is also called while no button is down, for hover. cancel ends a gesture the shell took over (a long press that
 *   opened the menu, or a click the measure tool used) without its click.
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
 *   menu?: (x: number, y: number) => MenuEntry[] | null,
 *   menuAnchor?: () => [number, number] | null,
 *   position?: (x: number, y: number) => string | null,
 *   measure?: () => MeasureAdapter | null,
 *   dblclick?: (x: number, y: number) => boolean,
 *   cancelMode?: () => void,
 *   cursor?: () => string | null,
 * }} Workspace
 *   fileTypes: the file picker's accept list. key: a workspace shortcut, returning the command to run; a key with
 *   Ctrl or Cmd arrives as 'mod+<key>'. menu: the context menu for a canvas point, whose commands may read
 *   app.menuPoint. menuAnchor: where the menu opens from the keyboard (the selection), in canvas pixels. position:
 *   the point under the pointer in the view's terms, for the status bar and "Copy the position". measure: the
 *   measure tool's adapter for the view on screen. dblclick: a double-click the workspace handles itself, instead of
 *   fitting the view. cancelMode: leave any mode (placing, picking) because another tool starts. cursor: the canvas
 *   cursor between gestures (a viewport data-cursor value), when not the hand.
 */

export {};
