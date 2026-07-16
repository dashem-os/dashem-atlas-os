import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const preferredPort = Number(process.env.ATLAS_FIELD_PORT ?? 5174);

const html = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#07131c" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='192' height='192'><rect width='512' height='512' rx='100' fill='%2307131c'/><text x='50%' y='62%' font-size='280' font-family='Arial, sans-serif' font-weight='bold' fill='%2300f0c0' text-anchor='middle'>D</text></svg>" />
    <title>ATLAS OS Field</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #10212c;
        background: #f5f8fb;
        --bg: #f5f8fb;
        --body-bg:
          radial-gradient(circle at 8% 0%, rgba(32, 141, 255, 0.14), transparent 34%),
          radial-gradient(circle at 100% 16%, rgba(255, 128, 0, 0.12), transparent 28%),
          linear-gradient(145deg, #f7fbff 0%, #eef5f9 52%, #f7f2ea 100%);
        --panel: #ffffff;
        --panel-strong: #ffffff;
        --line: #cbdce6;
        --line-strong: #8fb1c6;
        --text: #10212c;
        --text-soft: #4a606e;
        --side-bg: rgba(243, 249, 252, 0.88);
        --bottom-bg: rgba(248, 252, 255, 0.9);
        --input-bg: rgba(255, 255, 255, 0.92);
        --surface-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(238, 247, 252, 0.8));
        --shadow: 0 18px 42px rgba(32, 69, 91, 0.13);
        --blue: #1a8cff;
        --cyan: #25c7ff;
        --green: #09b86f;
        --amber: #ff9f1a;
        --orange: #ff6a00;
        --danger: #ff5a65;
        color-scheme: light;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          color: #edf7ff;
          background: #07131c;
          --bg: #07131c;
          --body-bg:
            radial-gradient(circle at 8% 0%, rgba(32, 141, 255, 0.2), transparent 34%),
            radial-gradient(circle at 100% 16%, rgba(255, 128, 0, 0.16), transparent 28%),
            linear-gradient(145deg, #07131c 0%, #061018 52%, #081924 100%);
          --panel: rgba(9, 30, 44, 0.82);
          --panel-strong: rgba(11, 40, 58, 0.94);
          --line: rgba(73, 180, 232, 0.22);
          --line-strong: rgba(73, 180, 232, 0.48);
          --text: #edf7ff;
          --text-soft: #9eb7c7;
          --side-bg: rgba(4, 14, 22, 0.72);
          --bottom-bg: rgba(3, 12, 19, 0.88);
          --input-bg: rgba(4, 14, 22, 0.86);
          --surface-gradient: linear-gradient(145deg, rgba(10, 35, 51, 0.86), rgba(4, 16, 25, 0.72));
          --shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
          color-scheme: dark;
        }
      }

      * { box-sizing: border-box; }
      html { min-height: 100%; background: var(--bg); }
      body {
        min-height: 100vh;
        margin: 0;
        background: var(--body-bg);
      }

      button, input, select, textarea { font: inherit; }
      button { cursor: pointer; }
      h1, h2, h3, p { margin: 0; }
      p { color: var(--text-soft); line-height: 1.45; }

      body.not-logged-in > *:not(#login-view) {
        display: none !important;
      }

      .app {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 248px minmax(0, 1fr);
      }

      .side {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 26px 18px;
        border-right: 1px solid var(--line);
        background: var(--side-bg);
        backdrop-filter: blur(20px);
        overflow-y: auto;
      }

      .brand { display: grid; gap: 6px; margin-bottom: 26px; }
      .brand-mark {
        width: 46px;
        height: 46px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        display: grid;
        place-items: center;
        color: var(--cyan);
        font-weight: 900;
        box-shadow: 0 0 22px rgba(37, 199, 255, 0.24);
      }
      .brand strong { font-size: 20px; letter-spacing: 0; }
      .brand span { color: var(--amber); font-size: 11px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase; }

      .side-group { display: grid; gap: 8px; margin-top: 18px; }
      .side-label { color: var(--text-soft); font-size: 11px; font-weight: 800; text-transform: uppercase; }
      .side button, .bottom button, .chip, .icon-button {
        border: 1px solid transparent;
        background: transparent;
        color: inherit;
      }
      .side button {
        width: 100%;
        min-height: 42px;
        padding: 10px 12px;
        border-radius: 8px;
        color: var(--text-soft);
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
      }
      .side button.active, .side button:hover {
        border-color: var(--line-strong);
        background: rgba(28, 123, 188, 0.14);
        color: var(--text);
      }

      .content {
        min-width: 0;
        padding: 22px 22px 96px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin: 0 auto 18px;
        max-width: 1180px;
      }
      .hello { display: grid; gap: 4px; }
      .hello h1 { font-size: clamp(24px, 4vw, 38px); letter-spacing: 0; }
      .hello b { color: var(--amber); }
      .top-actions { display: flex; align-items: center; gap: 10px; }
      .status-pill {
        min-height: 40px;
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--panel);
        color: var(--text-soft);
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
      .status-dot {
        width: 9px;
        height: 9px;
        border-radius: 99px;
        background: var(--amber);
        box-shadow: 0 0 14px var(--amber);
      }
      .avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 1px solid rgba(255, 159, 26, 0.55);
        background: linear-gradient(145deg, #1e7dd9, #ff9f1a);
        display: grid;
        place-items: center;
        font-weight: 900;
      }

      .view {
        display: none;
        max-width: 1180px;
        margin: 0 auto;
      }
      .view.active { display: grid; gap: 18px; }

      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .metric, .op-card, .panel, .order-card, .ai-card, .quick-sheet {
        border: 1px solid var(--line);
        background: var(--surface-gradient);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }
      .metric {
        min-height: 78px;
        padding: 13px;
        border-radius: 8px;
        display: grid;
        align-content: space-between;
      }
      .metric strong { font-size: 22px; }
      .metric span { color: var(--text-soft); font-size: 12px; }
      .metric .accent { color: var(--amber); }

      .home-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 330px;
        gap: 18px;
        align-items: start;
      }
      .ops-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .op-card {
        min-height: 132px;
        padding: 16px;
        border-radius: 8px;
        color: var(--text);
        display: grid;
        align-content: space-between;
        text-align: left;
        transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
      }
      .op-card:hover {
        transform: translateY(-2px);
        border-color: var(--line-strong);
        box-shadow: 0 18px 44px rgba(26, 140, 255, 0.14);
      }
      .op-card:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        transform: none;
        box-shadow: none;
      }
      .op-card strong { font-size: 16px; }
      .op-card span { color: var(--text-soft); font-size: 12px; }
      .op-icon {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        border: 1px solid currentColor;
        color: var(--cyan);
        font-weight: 900;
        box-shadow: 0 0 18px color-mix(in srgb, currentColor 28%, transparent);
      }
      .op-card.orange .op-icon, .op-card.orange strong { color: var(--amber); }
      .op-card.green .op-icon, .op-card.green strong { color: var(--green); }
      .op-card.blue .op-icon, .op-card.blue strong { color: #58a9ff; }


      .panel {
        border-radius: 8px;
        padding: 16px;
      }
      .panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .panel-title h2, .panel-title h3 { font-size: 17px; }
      .chip {
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        border-color: rgba(255, 159, 26, 0.42);
        color: var(--amber);
        background: rgba(255, 159, 26, 0.1);
        font-size: 12px;
        font-weight: 800;
      }

      .smart-slots { display: grid; gap: 10px; }
      .slot {
        position: relative;
        padding: 12px;
        border: 1px solid rgba(73, 180, 232, 0.18);
        border-radius: 8px;
        background: color-mix(in srgb, var(--panel-strong) 68%, transparent);
        display: grid;
        gap: 4px;
      }
      .slot.slot-pinned {
        border-color: var(--amber);
        box-shadow: 0 0 10px rgba(255, 159, 26, 0.35);
        background: color-mix(in srgb, var(--panel-strong) 74%, rgba(255, 159, 26, 0.08));
      }
      .slot strong { font-size: 14px; }
      .slot small { color: var(--text-soft); line-height: 1.4; }
      .slot-clickable {
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        width: 100%;
        font-family: inherit;
        color: inherit;
      }
      .slot-clickable:hover {
        background: color-mix(in srgb, var(--panel-strong) 90%, var(--accent));
        border-color: var(--accent);
        transform: translateY(-2px);
      }
      .slot-actions {
        position: absolute;
        right: 8px;
        bottom: 8px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
        background: color-mix(in srgb, var(--panel-strong) 95%, transparent);
        padding: 4px;
        border-radius: 6px;
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }
      .slot:hover .slot-actions {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .slot-action-btn {
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s ease, border-color 0.2s ease;
        color: inherit;
      }
      .slot-action-btn:hover {
        transform: scale(1.18);
      }
      .slot-action-btn[data-action="view"]:hover {
        background: rgba(26, 140, 255, 0.16);
        border-color: rgba(26, 140, 255, 0.3);
      }
      .slot-action-btn[data-action="edit"]:hover {
        background: rgba(255, 159, 26, 0.16);
        border-color: rgba(255, 159, 26, 0.3);
      }
      .slot-action-btn[data-action="pin"]:hover {
        background: rgba(255, 159, 26, 0.16);
        border-color: rgba(255, 159, 26, 0.3);
      }
      .slot-action-btn[data-action="delete"]:hover {
        background: rgba(255, 90, 101, 0.16);
        border-color: rgba(255, 90, 101, 0.3);
      }
      .slot-action-btn.active-pin {
        background: rgba(255, 159, 26, 0.18);
        border-color: rgba(255, 159, 26, 0.45);
      }
      .calendar-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
        align-items: start;
      }
      .calendar-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 8px;
      }
      .calendar-weekday {
        color: var(--text-soft);
        font-size: 12px;
        font-weight: 800;
        text-align: center;
      }
      .calendar-day {
        min-height: 86px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: color-mix(in srgb, var(--panel-strong) 70%, transparent);
        color: var(--text);
        padding: 9px;
        display: grid;
        align-content: start;
        gap: 6px;
        text-align: left;
      }
      .calendar-day.muted { opacity: 0.42; }
      .calendar-day.selected {
        border-color: rgba(255, 159, 26, 0.72);
        box-shadow: 0 0 20px rgba(255, 159, 26, 0.18);
      }
      .calendar-day.has-items::after {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 99px;
        background: var(--amber);
      }
      .day-number { font-weight: 900; }
      .day-count { color: var(--text-soft); font-size: 11px; }

      .orders-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
        align-items: start;
      }
      .orders-layout > *, .calendar-layout > *, .home-grid > * { min-width: 0; }
      .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
      .tab {
        min-height: 36px;
        padding: 7px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--panel);
        color: var(--text-soft);
        white-space: nowrap;
      }
      .tab.active {
        border-color: rgba(255, 159, 26, 0.66);
        background: rgba(255, 159, 26, 0.12);
        color: var(--amber);
      }
      .order-list { display: grid; gap: 10px; }
      .order-card {
        width: 100%;
        min-height: 112px;
        padding: 14px;
        border-radius: 8px;
        color: var(--text);
        text-align: left;
        display: grid;
        gap: 8px;
      }
      .order-card.selected { border-color: var(--amber); box-shadow: 0 0 26px rgba(255, 159, 26, 0.16); }
      .order-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
      .badge {
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(26, 140, 255, 0.16);
        color: #7fbdff;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }
      .badge.progress { background: rgba(255, 159, 26, 0.14); color: var(--amber); }
      .badge.done { background: rgba(40, 215, 120, 0.14); color: var(--green); }
      .badge.danger { background: rgba(255, 90, 101, 0.14); color: var(--danger); }

      /* KANBAN BOARD STYLES */
      .kanban-board {
        display: flex;
        gap: 12px;
        align-items: stretch;
        height: 100%;
        overflow-x: auto;
        padding-bottom: 8px;
        scrollbar-width: thin;
      }
      .kanban-col {
        flex: 1;
        min-width: 250px;
        max-width: 320px;
        background: rgba(13, 27, 38, 0.45);
        border: 1px solid rgba(73, 180, 232, 0.16);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        padding: 10px;
        min-height: 480px;
        transition: border-color 0.2s, background-color 0.2s;
      }
      .kanban-col.drag-hover {
        border-color: var(--amber);
        background: rgba(255, 159, 26, 0.08);
      }
      .kanban-col-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-weight: bold;
        font-size: 12px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(73, 180, 232, 0.1);
        padding-bottom: 6px;
      }
      .kanban-col-count {
        background: rgba(73, 180, 232, 0.16);
        color: var(--text-soft);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 99px;
      }
      .kanban-col-cards {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        overflow-y: auto;
        min-height: 100px;
      }
      .kanban-card {
        background: rgba(16, 33, 44, 0.7);
        border: 1px solid rgba(73, 180, 232, 0.12);
        border-radius: 8px;
        padding: 10px;
        cursor: grab;
        display: grid;
        gap: 6px;
        transition: transform 0.15s, border-color 0.15s;
        user-select: none;
      }
      .kanban-card:active {
        cursor: grabbing;
      }
      .kanban-card:hover {
        border-color: rgba(73, 180, 232, 0.4);
        transform: translateY(-2px);
      }
      .kanban-card.selected {
        border-color: var(--amber);
        box-shadow: 0 0 12px rgba(255, 159, 26, 0.15);
      }
      .kanban-card-title {
        font-weight: bold;
        font-size: 12px;
        color: var(--text);
        margin: 0;
      }
      .kanban-card-info {
        font-size: 10px;
        color: var(--text-soft);
        margin: 0;
      }
      .kanban-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .mini-badge {
        font-size: 8px;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 4px;
        text-transform: uppercase;
        background: rgba(73, 180, 232, 0.12);
        color: var(--text-soft);
      }

      form { display: grid; gap: 10px; }
      label { display: grid; gap: 5px; color: var(--text-soft); font-size: 12px; font-weight: 800; }
      form, label, .inline { min-width: 0; }
      #work-order-form, #budget-form { width: 100%; max-width: 100%; }
      #work-order-form > *, #budget-form > * { min-width: 0; }
      input, textarea, select {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        border: 1px solid rgba(73, 180, 232, 0.26);
        border-radius: 8px;
        padding: 10px;
        color: var(--text);
        background: var(--input-bg);
      }
      .work-order-intake {
        display: grid;
        grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
        gap: 14px;
        align-items: start;
        margin-bottom: 6px;
        min-width: 0;
      }
      .work-order-intake .asset-field {
        grid-column: 1 / -1;
      }
      .customer-picker {
        position: relative;
        z-index: 36;
        display: grid;
        gap: 6px;
        align-content: start;
        min-width: 0;
      }
      .customer-picker label {
        display: block;
      }
      .selected-customer-card {
        min-height: 42px;
        padding: 9px 10px;
        border: 1px solid rgba(73, 180, 232, 0.22);
        border-radius: 8px;
        background: color-mix(in srgb, var(--panel-strong) 72%, transparent);
        color: var(--text-soft);
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .selected-customer-card strong {
        color: var(--text);
        font-size: 13px;
      }
      .selected-customer-card small {
        color: var(--text-soft);
        line-height: 1.35;
      }
      .selected-customer-card.empty {
        border-style: dashed;
      }
      .selected-customer-card .kicker {
        color: var(--amber);
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .work-order-hidden-select {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .customer-suggestions {
        position: absolute;
        z-index: 35;
        top: 68px;
        left: 0;
        right: 0;
        max-height: 240px;
        overflow: auto;
        display: grid;
        gap: 6px;
        padding: 8px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        background: var(--panel-strong);
        box-shadow: var(--shadow);
      }
      .customer-suggestions[hidden] { display: none; }
      .customer-suggestion {
        width: 100%;
        min-height: 40px;
        padding: 8px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--text);
        text-align: left;
        display: grid;
        gap: 2px;
      }
      .customer-suggestion:hover {
        border-color: var(--line);
        background: rgba(26, 140, 255, 0.1);
      }
      .customer-suggestion small {
        color: var(--text-soft);
        font-weight: 700;
        line-height: 1.35;
      }
      .customer-suggestion.create {
        border-color: rgba(255, 159, 26, 0.46);
        color: var(--amber);
      }
      textarea { min-height: 72px; resize: vertical; }
      .inline { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .primary, .secondary {
        min-height: 42px;
        border-radius: 8px;
        padding: 10px 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .primary {
        border: 1px solid rgba(255, 159, 26, 0.72);
        background: linear-gradient(135deg, rgba(255, 106, 0, 0.9), rgba(255, 159, 26, 0.56));
        color: #fff;
        box-shadow: 0 0 24px rgba(255, 159, 26, 0.22);
      }
      .secondary {
        border: 1px solid var(--line);
        background: var(--panel);
        color: var(--text);
      }
      button:disabled, .primary:disabled, .secondary:disabled {
        cursor: not-allowed;
        opacity: 0.5;
        box-shadow: none;
      }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }

      .finance-grid, .ai-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .owner-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
        align-items: start;
      }
      .tenant-list {
        display: grid;
        gap: 10px;
      }
      .tenant-card {
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: color-mix(in srgb, var(--panel-strong) 72%, transparent);
        display: grid;
        gap: 6px;
      }
      .tenant-card header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: start;
      }
      .tenant-code {
        color: var(--amber);
        font-weight: 900;
      }
      .tenant-card small {
        color: var(--text-soft);
      }
      .ai-card {
        min-height: 130px;
        padding: 16px;
        border-radius: 8px;
        display: grid;
        gap: 8px;
        align-content: start;
      }
      .ai-card strong { color: var(--text); }
      pre {
        max-height: 280px;
        overflow: auto;
        margin: 0;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--line);
        color: #cdefff;
        background: rgba(2, 8, 13, 0.82);
        font-size: 12px;
      }

      .fab {
        position: fixed;
        right: 22px;
        bottom: calc(104px + env(safe-area-inset-bottom));
        z-index: 30;
        width: 62px;
        height: 62px;
        border: 1px solid rgba(255, 185, 76, 0.9);
        border-radius: 50%;
        background: radial-gradient(circle, #ffb64d 0%, #ff7a00 44%, #5a2400 100%);
        color: #fff;
        font-size: 34px;
        transform: none;
        box-shadow: 0 0 28px rgba(255, 159, 26, 0.66);
        touch-action: none;
        user-select: none;
      }

      .bottom {
        position: fixed;
        left: 50%;
        bottom: 0;
        z-index: 20;
        width: min(720px, 100%);
        transform: translateX(-50%);
        min-height: calc(72px + env(safe-area-inset-bottom));
        padding: 8px 14px calc(8px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--line);
        background: var(--bottom-bg);
        backdrop-filter: blur(18px);
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 4px;
      }
      .bottom button {
        min-width: 0;
        min-height: 52px;
        border-radius: 8px;
        color: var(--text-soft);
        display: grid;
        place-items: center;
        align-content: center;
        gap: 3px;
        font-size: 11px;
      }
      .bottom b { font-size: 18px; line-height: 1; }
      .bottom button.active { color: var(--amber); background: rgba(255, 159, 26, 0.08); }

      .quick-sheet {
        position: fixed;
        left: 50%;
        bottom: calc(96px + env(safe-area-inset-bottom));
        z-index: 40;
        width: min(420px, calc(100% - 28px));
        padding: 14px;
        border-radius: 8px;
        transform: translate(-50%, 14px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.16s ease, transform 0.16s ease;
      }
      .quick-sheet.open {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, 0);
      }
      .quick-sheet .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }

      /* Modal styles for viewing appointment details */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .modal-card {
        background: var(--surface-gradient);
        border: 1px solid var(--line-strong);
        border-radius: 12px;
        box-shadow: var(--shadow);
        width: min(500px, calc(100% - 24px));
        max-height: 90vh;
        overflow-y: auto;
        display: grid;
        gap: 16px;
        padding: 24px;
        transform: translateY(20px);
        transition: transform 0.2s ease;
      }
      .modal-overlay.open .modal-card {
        transform: translateY(0);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 12px;
      }
      .modal-body {
        display: grid;
        gap: 12px;
        font-size: 14px;
      }
      .modal-field {
        display: grid;
        gap: 4px;
      }
      .modal-field span {
        color: var(--text-soft);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .modal-field strong {
        font-size: 15px;
      }

      /* Custom Confirm Modal */
      #confirm-modal .modal-card {
        border: 1px solid rgba(255, 159, 26, 0.45);
        box-shadow: 0 12px 36px rgba(255, 159, 26, 0.25), inset 0 0 12px rgba(255, 159, 26, 0.1);
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 240, 0.92));
        backdrop-filter: blur(12px) saturate(180%);
      }
      @media (prefers-color-scheme: dark) {
        #confirm-modal .modal-card {
          background: linear-gradient(145deg, rgba(12, 28, 38, 0.96), rgba(30, 20, 10, 0.92));
          border-color: rgba(255, 159, 26, 0.6);
          box-shadow: 0 12px 36px rgba(255, 159, 26, 0.35), inset 0 0 12px rgba(255, 159, 26, 0.15);
        }
      }

      /* Toast styles */
      .toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 200;
        display: grid;
        gap: 10px;
        pointer-events: none;
      }
      .toast {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px) saturate(180%);
        -webkit-backdrop-filter: blur(12px) saturate(180%);
        border: 1.5px solid rgba(255, 106, 0, 0.45);
        border-radius: 12px;
        padding: 12px 18px;
        color: var(--text);
        box-shadow: 0 8px 32px 0 rgba(255, 106, 0, 0.25), inset 0 0 8px rgba(255, 106, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: toast-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        pointer-events: auto;
        min-width: 280px;
        max-width: 400px;
      }
      @media (prefers-color-scheme: dark) {
        .toast {
          background: rgba(9, 30, 44, 0.4);
        }
      }
      @keyframes toast-in {
        from { transform: translateY(-20px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .toast.fade-out {
        animation: toast-out 0.2s ease forwards;
      }
      @keyframes toast-out {
        from { transform: translateY(0) scale(1); opacity: 1; }
        to { transform: translateY(-20px) scale(0.9); opacity: 0; }
      }

      @media (max-width: 980px) {
        .app { display: block; }
        .side { display: none; }
        .content { padding: 18px 14px 104px; }
        .topbar { align-items: start; }
        .status-pill span { display: none; }
        .home-grid, .orders-layout, .calendar-layout { grid-template-columns: 1fr; }
        .ops-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .finance-grid, .ai-grid, .owner-grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 420px) {
        .ops-grid { grid-template-columns: 1fr; }
        .inline, .work-order-intake { grid-template-columns: 1fr; }
        .work-order-intake .asset-field { grid-column: auto; }
        .work-order-intake { gap: 14px; }
        .hello h1 { font-size: 25px; }
        .op-card { min-height: 112px; }
      }

      /* Premium Contexto Operacional Banner */
      .context-banner {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .context-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .context-label {
        font-size: 10px;
        font-weight: 900;
        color: var(--orange);
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      .context-value {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
      }
      .context-select-wrapper {
        position: relative;
        width: 100%;
      }
      .context-select {
        width: 100%;
        background: var(--input-bg);
        border: 1px solid var(--line-strong);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--text);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .context-select:focus {
        border-color: var(--cyan);
        box-shadow: 0 0 8px rgba(37, 199, 255, 0.3);
      }
      @media (max-width: 768px) {
        .context-banner {
          grid-template-columns: 1fr;
          gap: 12px;
        }
      }

      /* HIDE MOBILE BOTTOM NAV ON DESKTOP */
      @media (min-width: 981px) {
        .bottom { display: none !important; }
        .profile-grid { grid-template-columns: 1fr 1fr !important; }
      }

      /* MEU AJUDANTE EXPENSES AND CATEGORIES STYLES */
      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .category-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .category-card:hover {
        transform: translateY(-3px);
        border-color: var(--line-strong);
        box-shadow: var(--shadow);
      }
      .category-circle-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 20px;
        font-weight: bold;
      }
      .category-card span {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .category-card small {
        font-size: 10px;
        color: var(--text-soft);
        background: rgba(255,255,255,0.06);
        padding: 2px 6px;
        border-radius: 99px;
      }
      .expense-ledger {
        margin-top: 20px;
        display: grid;
        gap: 8px;
      }
      .expense-card {
        background: var(--surface-gradient);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .expense-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .expense-meta {
        display: grid;
        gap: 2px;
      }
      .expense-meta strong {
        font-size: 14px;
        color: var(--text);
      }
      .expense-meta small {
        font-size: 12px;
        color: var(--text-soft);
      }
      .expense-amount {
        font-size: 15px;
        font-weight: bold;
        color: var(--danger);
      }

      /* ACCENT HIGHLIGHTS FOR MEU AJUDANTE STYLE */
      :root {
        --accent: #00f0c0 !important;
      }
      .side button.active, .side button:hover {
        border-color: var(--accent) !important;
        background: rgba(0, 240, 192, 0.1) !important;
      }
      .bottom button.active {
        color: var(--accent) !important;
      }
      .primary {
        border: 1px solid var(--accent) !important;
        background: linear-gradient(135deg, #00d4a8, #00f0c0) !important;
        color: #0b0f14 !important;
        font-weight: bold !important;
        box-shadow: 0 0 20px rgba(0, 240, 192, 0.3) !important;
      }
      .badge.progress {
        background: rgba(0, 240, 192, 0.15) !important;
        color: var(--accent) !important;
      }
      
      /* Color picker elements for category create */
      .color-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.1s ease;
      }
      .color-dot.active {
        border-color: #fff;
        transform: scale(1.15);
      }
      .icon-dot {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255,255,255,0.06);
        display: grid;
        place-items: center;
        cursor: pointer;
        font-size: 16px;
        border: 2px solid transparent;
      }
      .icon-dot.active {
        border-color: var(--accent);
        background: rgba(0, 240, 192, 0.1);
      }

      /* Premium custom popover styles for FSM flow trail chips */
      .trail-chip {
        position: relative;
      }
      .trail-chip .tooltip-popover {
        visibility: hidden;
        position: absolute;
        z-index: 1000;
        bottom: 135%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--panel-strong);
        color: var(--text);
        border: 1px solid var(--line-strong);
        padding: 10px 14px;
        border-radius: 8px;
        box-shadow: var(--shadow);
        width: 240px;
        white-space: normal;
        text-align: left;
        font-size: 10px;
        font-weight: normal;
        opacity: 0;
        transition: opacity 0.2s, visibility 0.2s;
        pointer-events: none;
        line-height: 1.5;
        backdrop-filter: blur(12px);
      }
      .trail-chip:hover .tooltip-popover {
        visibility: visible;
        opacity: 1;
      }
      .trail-chip .tooltip-popover::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: var(--line-strong) transparent transparent transparent;
      }
      .trail-chip .tooltip-popover strong {
        display: block;
        font-size: 11px;
        margin-bottom: 4px;
        color: var(--amber);
        border-bottom: 1px solid var(--line);
        padding-bottom: 4px;
      }
      .trail-chip .tooltip-popover span {
        display: block;
        margin-bottom: 2px;
      }

    </style>
  </head>
  <body>
    <!-- Toast notifications system -->
    <div class="toast-container" id="toast-container"></div>

    <main class="app">
      <aside class="side" aria-label="Menu de apoio">
        <div class="brand">
          <div class="brand-mark">D</div>
          <strong>DASHEM</strong>
          <span>Technologies</span>
        </div>
        <div class="side-group">
          <div class="side-label">Navegação</div>
          <button class="active" data-tab="home"><span>⌂</span>Home operacional</button>
          <button data-tab="orders"><span>▣</span>Ordens de serviço</button>
          <button data-tab="agenda"><span>◇</span>Agenda inteligente</button>
          <button data-tab="finance"><span>$</span>Financeiro</button>
          <button data-tab="tools"><span>🔧</span>Ferramentas</button>
          <button data-tab="ai"><span>✦</span>Assistente IA</button>
          <button data-tab="profile"><span>○</span>Perfil</button>
        </div>
        <div class="side-group">
          <div class="side-label">Apoio</div>
          <button data-tab="admin"><span>⚙</span>Configurações</button>
          <button data-tab="admin"><span>⇄</span>Integrações</button>
          <button data-tab="admin"><span>□</span>Relatórios avançados</button>
        </div>
        <div class="side-group" style="margin-top: auto; border-top: 1px solid var(--line); padding-top: 14px;">
          <button onclick="localStorage.removeItem('atlas_login_session'); location.reload();" style="border: 1px solid rgba(239, 68, 68, 0.2); color: #ff5a65; background: rgba(239, 68, 68, 0.05); width: 100%; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px; min-height: 40px; border-radius: 8px; padding: 10px 12px;">
            <span style="font-size: 16px;">⎋</span>Sair da Conta
          </button>
        </div>
      </aside>

      <section class="content">
        <header class="topbar">
          <div class="hello">
            <h1>ATLAS <b>OS Field</b></h1>
            <p id="view-subtitle">PWA operacional para campo, caixa leve, supervisao e inteligencia em contexto.</p>
          </div>
          <div class="top-actions">
            <div class="status-pill" title="Status da API"><i class="status-dot"></i><span id="health-label">API verificando</span></div>
            <div class="avatar" title="Perfil" id="user-avatar" style="cursor: pointer;">MS</div>
          </div>
        </header>

        <div id="home" class="view active">
          <div class="context-banner" id="context-banner">
            <div class="context-item">
              <span class="context-label">Técnico Logado</span>
              <strong class="context-value" id="context-technician-name">-</strong>
            </div>
            <div class="context-item">
              <span class="context-label">Tenant Ativo</span>
              <strong class="context-value" id="context-tenant-name">-</strong>
            </div>
            <div class="context-item">
              <span class="context-label">Cliente Ativo</span>
              <div class="context-select-wrapper">
                <select id="active-client-select" class="context-select">
                  <!-- Preenchido dinamicamente -->
                </select>
              </div>
            </div>
          </div>

          <div class="summary" id="metrics"></div>
          <div class="home-grid">
            <div class="ops-grid" id="operation-cards"></div>
            <aside class="panel">
              <div class="panel-title">
                <h2>Slots inteligentes</h2>
                <span class="chip" id="profile-chip">Técnico</span>
              </div>
              <div class="smart-slots" id="smart-slots"></div>
            </aside>
          </div>
          <div class="panel">
            <div class="panel-title">
              <h2>IA em contexto</h2>
              <span class="chip">Agora</span>
            </div>
            <div class="ai-grid" id="context-ai"></div>
          </div>
        </div>

        <div id="orders" class="view">
          <div class="orders-layout">
            <section class="panel" style="display: flex; flex-direction: column;">
              <div class="panel-title" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; width: 100%;">
                <h2 style="margin: 0;">Ordens de Serviço</h2>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <button class="secondary" id="btn-toggle-kanban" style="padding: 6px 12px; font-size: 11px; font-weight: bold; background: linear-gradient(135deg, #0ea5e9, #0284c7) !important; color: #fff !important; border: none; box-shadow: 0 0 10px rgba(14, 165, 233, 0.25);">📋 Ver Kanban</button>
                  <button class="secondary" data-quick="work-order">Nova OS</button>
                </div>
              </div>
              
              <!-- LIST VIEW MODE CONTAINER -->
              <div id="view-mode-list" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
                <div class="tabs" style="overflow-x: auto; white-space: nowrap; display: flex; gap: 8px; padding-bottom: 6px; scrollbar-width: none; -webkit-overflow-scrolling: touch; flex-shrink: 0;">
                  <button class="tab active" data-filter="all" style="flex-shrink: 0;">Todas</button>
                  <button class="tab" data-filter="requested" style="flex-shrink: 0;">Pendentes</button>
                  <button class="tab" data-filter="budget_sent" style="flex-shrink: 0;">Negociação</button>
                  <button class="tab" data-filter="approved" style="flex-shrink: 0;">Aprovadas</button>
                  <button class="tab" data-filter="in_progress" style="flex-shrink: 0;">Execução</button>
                  <button class="tab" data-filter="closed" style="flex-shrink: 0;">Concluídas</button>
                  <button class="tab" data-filter="cancelled" style="flex-shrink: 0;">Canceladas</button>
                </div>
                <div class="order-list" id="work-order-list" style="flex: 1; overflow-y: auto;"></div>
              </div>

              <!-- KANBAN VIEW MODE CONTAINER -->
              <div id="view-mode-kanban" style="display: none; flex-direction: column; flex: 1; min-height: 0; overflow-x: auto; width: 100%;">
                <div class="kanban-board" id="work-order-kanban-board" style="display: flex; gap: 12px; padding: 4px; height: 100%; min-height: 480px; align-items: stretch;">
                  <!-- Columns will be filled dynamically -->
                </div>
              </div>
            </section>
            <aside class="panel">
              <div class="panel-title">
                <h3>OS selecionada</h3>
                <span class="chip" id="selected-state">Aguardando</span>
              </div>
              <div class="tabs" style="margin-bottom: 10px; display: flex; gap: 8px;">
                <button class="tab active" id="aside-tab-general" style="flex: 1; padding: 6px 12px; font-size: 12px; min-height: auto;">Geral</button>
                <button class="tab" id="aside-tab-laudo" style="flex: 1; padding: 6px 12px; font-size: 12px; min-height: auto;">Laudo Técnico</button>
              </div>
              <div id="selected-work-order" class="slot">Selecione uma OS para operar.</div>
              <div id="selected-work-order-laudo" class="slot" style="display: none;">
                <form id="laudo-form" style="display: grid; gap: 8px; margin: 0;">
                  <label style="font-size: 12px;">
                    Constatações Técnicas (Laudo Inicial)
                    <textarea id="laudo-inicial-input" style="width: 100%; height: 55px; font-size: 12px;" placeholder="Sintomas, medições, problemas identificados..."></textarea>
                  </label>
                  <label style="font-size: 12px;">
                    Conclusão dos Serviços (Laudo Final)
                    <textarea id="laudo-final-input" style="width: 100%; height: 55px; font-size: 12px;" placeholder="Ações tomadas, peças trocadas, conformidade..."></textarea>
                  </label>
                  <label style="font-size: 12px;">
                    Validade da Garantia (Dias)
                    <input type="number" id="laudo-garantia-input" style="width: 100%; font-size: 12px;" min="0" placeholder="Ex: 90" value="90" />
                  </label>
                  <div style="border-top:1px dashed var(--line); margin:6px 0; padding-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <label style="font-size: 11px; margin:0;">
                      📸 Foto ANTES
                      <input type="file" id="laudo-photo-before" accept="image/*" style="font-size:10px; width:100%;" />
                      <div id="laudo-preview-before" style="margin-top:4px; display:none;"><img src="" style="width:45px; height:45px; object-fit:cover; border-radius:4px; border:1px solid var(--line);" /></div>
                    </label>
                    <label style="font-size: 11px; margin:0;">
                      📸 Foto DEPOIS
                      <input type="file" id="laudo-photo-after" accept="image/*" style="font-size:10px; width:100%;" />
                      <div id="laudo-preview-after" style="margin-top:4px; display:none;"><img src="" style="width:45px; height:45px; object-fit:cover; border-radius:4px; border:1px solid var(--line);" /></div>
                    </label>
                  </div>
                  <button type="submit" class="primary" style="margin-top: 4px; font-size: 12px; min-height: 32px; padding: 4px 12px;">Salvar Laudo</button>
                </form>
              </div>
              <div class="actions" style="margin-top: 12px; display: grid; gap: 8px;">
                <button id="view-laudo-btn" class="primary" style="background: linear-gradient(135deg, #0284c7, #0ea5e9) !important; color:#fff !important; border:none !important; min-height: 42px; font-weight: bold; box-shadow: 0 0 15px rgba(14, 165, 233, 0.25) !important;">📋 Gerar Laudo Técnico</button>
                <button id="share-whatsapp-btn" class="primary" style="background: linear-gradient(135deg, #16a34a, #22c55e) !important; color:#fff !important; border:none !important; min-height: 42px; font-weight: bold; box-shadow: 0 0 15px rgba(34, 197, 94, 0.25) !important; display:flex; align-items:center; justify-content:center; gap:8px;">💬 Enviar no WhatsApp</button>
                <button id="view-recibo-btn" class="primary" style="background: linear-gradient(135deg, #0d6b7a, #1e3a8a) !important; color:#fff !important; border:none !important; min-height: 42px; font-weight: bold; box-shadow: 0 0 15px rgba(13, 107, 122, 0.25) !important;">🧾 Gerar Recibo e Garantia</button>
                <div style="border-top: 1px solid var(--line); margin: 8px 0;"></div>
                <button id="attach-evidence" class="secondary">Evidência</button>
                <button id="diagnosis-agent" class="secondary">Diagnóstico IA</button>
                <button id="budget-agent" class="secondary">Orçamento IA</button>
                <button id="submit-budget" class="primary">💸 4. Enviar Orçamento</button>
                <button id="approve-budget" class="secondary">✍️ 8. Coletar Aceite Formal</button>
                <button id="start-work" class="secondary">⚙️ 6. Iniciar Execução</button>
                <button id="close-work" class="secondary">🏁 9. Encerrar & Faturar</button>
                <button id="rework-work" class="secondary" style="border-color: var(--danger); color: var(--danger); display: none;">🔄 Solicitar Retrabalho</button>
                <button id="edit-work-order" class="secondary">Editar</button>
                <button id="cancel-work-order" class="secondary" style="border-color: var(--danger); color: var(--danger);">Cancelar</button>
                <button id="delete-work-order" class="secondary" style="border-color: var(--danger); color: var(--danger);">Excluir</button>
              </div>
            </aside>
          </div>

<!-- PREMIUM CENTERED OVERLAY MODAL FOR WORK ORDER FORM -->
          <div class="modal-overlay" id="work-order-modal" aria-hidden="true" style="z-index: 120;">
            <div class="modal-card" style="max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 24px;">
              <header class="modal-header" style="margin-bottom: 14px;">
                <h3 id="work-order-modal-title" style="color: var(--accent); margin:0;">🛠 Ordem de Serviço</h3>
                <button class="secondary" id="btn-close-work-order-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>

              <div class="orders-layout" style="display: grid; grid-template-columns: 1fr 340px; gap: 18px;">
                <form id="work-order-form" class="panel" style="margin: 0; padding: 14px; border: 1px solid var(--line);">
                  <div class="panel-title" style="margin-bottom: 10px;"><h4>Dados Operacionais</h4></div>
                  <div class="work-order-intake">
                    <label>Número da OS<input name="sequenceNumber" placeholder="Ex: OS-001" required /></label>
                    <div class="customer-picker">
                      <label for="work-order-customer-search">Cliente</label>
                      <input id="work-order-customer-search" autocomplete="off" placeholder="Buscar ou cadastrar cliente" />
                      <div id="customer-suggestions" class="customer-suggestions" hidden></div>
                      <div id="selected-customer-card" class="selected-customer-card empty">
                        <small>Nenhum cliente selecionado.</small>
                      </div>
                      <select id="work-order-organization-select" class="work-order-hidden-select" tabindex="-1" aria-hidden="true"></select>
                    </div>
                    <label class="asset-field">Ativo<select id="asset-select"></select></label>
                  </div>
                  
                  <!-- ANTES / DEPOIS PHOTO UPLOADER (MVP 15 SECONDS FLOW) -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: rgba(0,0,0,0.01);">
                    <label style="margin:0;">
                      <span style="font-weight:bold; font-size:12px; display:block; margin-bottom:4px; color:var(--text-soft);">📸 Foto ANTES (Diagnóstico)</span>
                      <div style="display:flex; gap:6px;">
                        <input type="file" id="evidence-photo-before" accept="image/*" style="font-size:11px; flex:1; min-width:0;" />
                        <button type="button" id="btn-predictive-vision" class="secondary" style="display:none; font-size:11px; padding:2px 8px; min-height:auto; border-color:var(--accent); white-space:nowrap;">🧠 Analisar Foto</button>
                      </div>
                      <div id="preview-photo-before" style="margin-top:6px; display:none;"><img src="" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid var(--line);" /></div>
                    </label>
                    <label style="margin:0;">
                      <span style="font-weight:bold; font-size:12px; display:block; margin-bottom:4px; color:var(--text-soft);">📸 Foto DEPOIS (Conclusão)</span>
                      <input type="file" id="evidence-photo-after" accept="image/*" style="font-size:11px;" />
                      <div id="preview-photo-after" style="margin-top:6px; display:none;"><img src="" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid var(--line);" /></div>
                    </label>
                  </div>
                  
                  <!-- VOICE RECORDING OVERLAY WAVE (FASE 4) -->
                  <div id="voice-wave-overlay" style="display:none; background:rgba(0,11,20,0.95); border:1px solid var(--accent); border-radius:8px; padding:12px; margin-bottom:12px; align-items:center; gap:12px; box-shadow: 0 0 14px rgba(0, 240, 192, 0.2);">
                    <div style="font-size:24px; animation: pulse 1s infinite; line-height:1;">🎙️</div>
                    <div style="flex:1;">
                      <span style="font-weight:bold; font-size:12px; color:var(--accent); display:block; margin-bottom:2px;">Gravando sua voz... Fale de forma rápida.</span>
                      <span style="font-size:11px; color:var(--text-soft);" id="voice-wave-timer">00:00 / 00:30 (Clique em Parar para formalizar)</span>
                    </div>
                    <button type="button" id="btn-stop-voice" class="primary" style="background:#ff4c4c; border-color:#ff4c4c; font-size:11px; padding:4px 8px; min-height:auto; font-weight:bold; color:#fff;">🟥 Parar</button>
                  </div>
                  
                  <label>Título<input name="title" placeholder="Manutenção em ar condicionado split" required /></label>
                  
                  <label style="position:relative;">
                    <span>Descrição</span>
                    <textarea name="description" id="txt-description"></textarea>
                    <button type="button" id="btn-mic-description" class="secondary" style="position:absolute; right:6px; top:28px; padding:4px 8px; font-size:15px; min-height:auto; border:none; background:none; cursor:pointer;" title="Gravar por voz">🎙️</button>
                  </label>
                  
                  <div class="inline">
                    <label>Técnico<input name="technicianName" /></label>
                    <label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
                  </div>
                  <div class="inline">
                    <label>SLA / prazo<input name="dueAt" type="datetime-local" /></label>
                    <label>Duração estimada (h)<input name="estimatedDurationHours" type="number" min="0" step="0.5" /></label>
                  </div>
                  
                  <label style="position:relative;">
                    <span>Diagnóstico</span>
                    <textarea name="diagnosis" id="txt-diagnosis"></textarea>
                    <button type="button" id="btn-mic-diagnosis" class="secondary" style="position:absolute; right:6px; top:28px; padding:4px 8px; font-size:15px; min-height:auto; border:none; background:none; cursor:pointer;" title="Gravar por voz">🎙️</button>
                  </label>
                  
                  <!-- Materials dynamic list builder -->
                  <div class="materials-builder" style="border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: rgba(0,0,0,0.01);">
                    <span style="font-weight: 800; font-size: 12px; display: block; margin-bottom: 8px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.05em;">Materiais e Peças</span>
                    <div style="display: grid; grid-template-columns: 2fr 80px 100px auto; gap: 8px; align-items: flex-end;">
                      <label>Especificação / Nome<input id="mat-name" placeholder="Ex: Filtro de ar" /></label>
                      <label>Qtd<input id="mat-qty" type="number" min="0" step="any" placeholder="1" /></label>
                      <label>V. Unitário<input id="mat-price" type="number" min="0" step="0.01" placeholder="0.00" /></label>
                      <button type="button" id="add-material-btn" class="secondary" style="min-height: 40px; padding: 0 16px; font-weight: bold; border-color: var(--line-strong);">➕</button>
                    </div>
                    <div id="materials-table-container" style="margin-top: 12px; overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--panel);">
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                        <thead>
                          <tr style="border-bottom: 1px solid var(--line); background: rgba(0, 0, 0, 0.03); color: var(--text-soft);">
                            <th style="padding: 8px; font-weight: 700;">Item</th>
                            <th style="padding: 8px; text-align: right; font-weight: 700; width: 60px;">Qtd</th>
                            <th style="padding: 8px; text-align: right; font-weight: 700; width: 100px;">P. Unitário</th>
                            <th style="padding: 8px; text-align: right; font-weight: 700; width: 110px;">Subtotal</th>
                            <th style="padding: 8px; text-align: center; width: 50px; font-weight: 700;">Remover</th>
                          </tr>
                        </thead>
                        <tbody id="materials-list-body">
                          <!-- Dynamic list will render here -->
                        </tbody>
                        <tfoot>
                          <tr style="font-weight: bold; border-top: 2px solid var(--line); background: rgba(0, 0, 0, 0.01);">
                            <td colspan="3" style="padding: 8px; text-align: right; color: var(--text-soft);">Total Materiais:</td>
                            <td style="padding: 8px; text-align: right; color: var(--text);" id="materials-total-sum">R$ 0,00</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div class="inline">
                    <label>Mão de obra R$/h<input name="laborRate" type="number" min="0" step="0.01" /></label>
                    <label>Horas de mão de obra<input name="laborHours" type="number" min="0" step="0.5" /></label>
                  </div>
                  <div id="work-order-form-actions" style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="primary" type="submit" style="flex: 1;" id="work-order-submit-btn">Salvar OS</button>
                    <button class="secondary" type="button" id="work-order-cancel-btn" style="display: none; flex: 1;">Cancelar Edição</button>
                  </div>
                </form>

                <form id="budget-form" class="panel" style="margin: 0; padding: 14px; border: 1px solid var(--line);">
                  <div class="panel-title" style="margin-bottom: 10px;">
                    <h4>Composição de Orçamento</h4>
                  </div>
                  
                  <!-- SUGGESTION REGIONAL ALERT PANEL -->
                  <div style="background: rgba(0, 240, 192, 0.06); border: 1px dashed var(--accent); border-radius: 8px; padding: 10px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 12px; color: var(--text-soft);">
                      💡 <strong>Copiloto de Preços</strong><br/>
                      Consulte a média regional recomendada por IA para esta OS.
                    </div>
                    <button type="button" id="btn-suggest-regional" class="secondary" style="font-size: 11px; padding: 4px 8px; border-color: var(--accent); min-height: auto;">💡 Sugerir Preço</button>
                  </div>
                  
                  <div class="inline">
                    <label>Materiais<input name="materialsTotal" type="number" min="0" step="0.01" /></label>
                    <label>Mão de obra<input name="laborTotal" type="number" min="0" step="0.01" /></label>
                  </div>
                  <div class="inline">
                    <label>Margem (%)<input name="marginPercent" type="number" min="0" /></label>
                    <label>Duração (h)<input name="durationHours" type="number" min="0" step="0.5" /></label>
                  </div>
                  
                  <!-- CUSTOS INVISÍVEIS CALCULATOR (FASE 2) -->
                  <div style="border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin-bottom: 12px; background: rgba(0,0,0,0.02);">
                    <span style="font-weight:bold; font-size:11px; text-transform:uppercase; color:var(--text-soft); display:block; margin-bottom:6px; letter-spacing:0.05em;">🚗 Calculadora de Custos Invisíveis</span>
                    <div class="inline" style="gap:8px; margin-bottom:6px;">
                      <label style="margin:0;">Distância (Km)<input id="budget-distance" type="number" min="0" value="10" placeholder="0" /></label>
                      <label style="margin:0;">Trânsito (min)<input id="budget-duration" type="number" min="0" value="20" placeholder="0" /></label>
                    </div>
                    <div style="font-size:11px; display:flex; justify-content:space-between; opacity:0.85; margin-top:4px; padding-top:4px; border-top:1px dashed var(--line);">
                      <span>Combustível (10km/L @ R$5.90): <strong id="val-fuel-cost">R$ 5,90</strong></span>
                      <span>Hora Trânsito (@ R$40/h): <strong id="val-transit-cost">R$ 13,33</strong></span>
                    </div>
                  </div>
                  
                  <!-- COPILOTO DE MARGEM LÍQUIDA REAL (FASE 2) -->
                  <div id="real-margin-panel" style="border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: rgba(20,28,38,0.5); display: flex; flex-direction: column; gap: 4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:bold; color:var(--text-soft);">Margem Líquida Real:</span>
                      <span id="real-margin-badge" style="font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; background: rgba(0,240,192,0.1); color: var(--accent);">35% - Saudável</span>
                    </div>
                    <div style="height: 6px; width: 100%; background: var(--line); border-radius: 3px; overflow: hidden; margin: 4px 0;">
                      <div id="real-margin-bar" style="height: 100%; width: 35%; background: var(--accent); transition: width 0.3s ease, background-color 0.3s ease;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:2px;">
                      <span>Lucro Real: <strong id="real-profit-val" style="color:var(--text);">R$ 0,00</strong></span>
                      <span>Hora Líquida: <strong id="net-hourly-rate" style="color:var(--text);">R$ 0,00/h</strong></span>
                    </div>
                  </div>

                  <div class="inline">
                    <label>Risco<select name="risk"><option value="low">Baixo</option><option value="medium">Medio</option><option value="high">Alto</option></select></label>
                    <label>Preço final<input name="amount" type="number" min="0" step="0.01" required /></label>
                  </div>
                  <label>Notas<textarea name="notes" placeholder="Notas sobre a precificacao..."></textarea></label>
                  <button type="submit" class="primary" style="margin-top: 12px; width: 100%; min-height: 44px; font-weight: bold; background: linear-gradient(135deg, #10b981, #059669) !important; color:#fff !important; border:none; box-shadow: 0 0 15px rgba(5, 150, 105, 0.25);">🚀 Enviar Orçamento Oficial</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div id="agenda" class="view">
          <div class="calendar-layout">
            <section class="panel">
              <div class="panel-title">
                <h2>Agenda inteligente</h2>
                <div class="calendar-tools">
                  <input id="agenda-month" type="month" />
                  <button class="secondary" id="agenda-today">Hoje</button>
                </div>
              </div>
              <div class="calendar-grid" id="agenda-calendar"></div>
            </section>

            <aside class="panel">
              <div class="panel-title">
                <h3 id="agenda-selected-title">Dia selecionado</h3>
                <span class="chip">Timeline</span>
              </div>
              <div class="smart-slots" id="agenda-day-list"></div>
            </aside>
          </div>

          <form id="appointment-form" class="panel">
            <div class="panel-title"><h3 id="appointment-form-title">Novo agendamento</h3><span class="chip">Sino</span></div>
            <label>Título<input name="title" placeholder="Visita técnica, retorno, aprovação..." required /></label>
            <div class="inline">
              <label>Data e hora<input name="scheduledAt" type="datetime-local" required /></label>
              <label>Duração (min)<input name="durationMinutes" type="number" min="15" step="15" value="60" /></label>
            </div>
            <div class="inline">
              <label>Tipo<select name="kind"><option value="visit">Visita</option><option value="call">Ligação</option><option value="follow_up">Retorno</option><option value="administrative">Administrativo</option></select></label>
              <label>OS relacionada<select id="appointment-work-order"><option value="">Sem OS vinculada</option></select></label>
            </div>
            <div class="inline">
              <label>Técnico<input name="technicianName" /></label>
              <label>Cliente/local<input name="customerName" /></label>
            </div>
            <label>Endereço ou local<input name="location" /></label>
            <label>Notas<textarea name="notes"></textarea></label>
            <div class="inline">
              <label><span><input name="reminderEnabled" type="checkbox" checked /> Ativar sino/lembrete</span></label>
              <label>Prévia<select name="reminderMinutesBefore"><option value="15">15 min antes</option><option value="30" selected>30 min antes</option><option value="60">1 hora antes</option><option value="1440">1 dia antes</option></select></label>
            </div>
            <!-- Status container visible only when editing -->
            <label id="appointment-status-container" style="display: none;">Status
              <select name="status">
                <option value="scheduled">Agendado</option>
                <option value="done">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>
            <div class="actions" style="margin-top: 12px">
              <button class="primary" type="submit" id="appointment-submit-btn">Agendar</button>
              <button class="secondary" type="button" id="appointment-cancel-btn" style="display: none;">Cancelar Edição</button>
            </div>
          </form>
        </div>

        <div id="finance" class="view">
          <div class="summary" id="finance-metrics">
            <div class="metric"><strong class="accent" id="expense-month-total">R$ 0,00</strong><span>Despesas do Mês</span></div>
            <div class="metric"><strong id="expense-count-total">0</strong><span>Registros</span></div>
            <div class="metric"><strong id="cashflow-billing-total">R$ 0,00</strong><span>Faturamento Ativo</span></div>
            <div class="metric"><strong class="accent" id="cashflow-balance-total">R$ 0,00</strong><span>Saldo Projetado</span></div>
          </div>
          
          <div class="orders-layout" style="grid-template-columns: minmax(0, 1fr) 360px;">
            <div class="panel">
              <div class="panel-title">
                <h2>Categorias de Gastos</h2>
                <button class="primary" id="btn-open-category-modal" style="min-height:36px; padding:6px 12px; font-size:12px;">+ Nova Categoria</button>
              </div>
              <p style="font-size:12px; margin-top:2px;">Gerencie as categorias dos seus gastos.</p>
              <div class="categories-grid" id="categories-list-container">
                <!-- Preenchido dinamicamente -->
              </div>

              <div class="panel-title" style="margin-top: 26px;">
                <h2>Lançamentos de Gastos</h2>
                <button class="primary" id="btn-open-expense-modal" style="min-height:36px; padding:6px 12px; font-size:12px;">+ Registrar Gasto</button>
              </div>
              <p style="font-size:12px; margin-top:2px;">Acompanhe seus gastos organizados por mês.</p>
              <div class="expense-ledger" id="expenses-list-container">
                <!-- Preenchido dinamicamente -->
              </div>
            </div>

            <aside class="panel">
              <div class="panel-title"><h3>Filtragem Mensal</h3></div>
              <select id="expense-month-filter" style="width: 100%; margin-bottom: 12px;">
                <!-- Preenchido dinamicamente com meses disponíveis -->
              </select>
              <div class="smart-slots">
                <div class="slot">
                  <strong>Saldo Operacional</strong>
                  <small id="aside-revenue-total">Faturamento: R$ 0,00</small>
                  <small id="aside-expenses-total" style="color: var(--danger);">Despesas: R$ 0,00</small>
                  <hr style="border: none; border-top: 1px solid var(--line); margin: 6px 0;" />
                  <strong id="aside-net-total">Líquido: R$ 0,00</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div id="inventory" class="view">
          <div style="display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: flex-start;">
            <section class="panel">
              <div class="panel-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <h2>Estoque de Combate ("Porta-Malas")</h2>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="search-inventory-input" placeholder="Pesquisar peça..." style="padding: 6px 12px; border-radius: 6px; font-size: 13px; max-width: 200px;" />
                  <button class="primary" id="btn-open-inventory-modal" style="min-height: auto; padding: 6px 12px; font-size: 13px;">➕ Novo Insumo</button>
                </div>
              </div>
              <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px;">
                <!-- Dynamically filled -->
              </div>
            </section>
            
            <aside class="panel" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="panel-title"><h3>Carrinho de Compras</h3></div>
              <div style="background: rgba(0, 240, 192, 0.05); border: 1px dashed var(--accent); border-radius: 8px; padding: 12px;">
                <span style="font-weight: bold; font-size: 12px; display: block; margin-bottom: 6px; color: var(--accent);">🛒 Inteligência de Reposição</span>
                <p style="font-size: 11px; margin: 0 0 10px; color: var(--text-soft);">Abaixo estão compiladas as peças cujo nível está igual ou abaixo do estoque mínimo de segurança.</p>
                <div id="shopping-list-container" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 12px;">
                  <!-- Dynamic shopping list items -->
                </div>
                <button class="primary" id="btn-share-shopping-whatsapp" style="width: 100%; font-size: 12px; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  💬 Enviar Lista ao Fornecedor
                </button>
              </div>
            </aside>
          </div>
        </div>

        <div id="tools" class="view">
          <div class="summary" id="tools-metrics">
            <div class="metric"><strong id="metric-registered-materials">0</strong><span>Materiais</span></div>
            <div class="metric"><strong id="metric-registered-services">0</strong><span>Serviços Cadastrados</span></div>
            <div class="metric"><strong id="metric-registered-clients">0</strong><span>Clientes Salvos</span></div>
            <div class="metric"><strong class="accent" id="metric-active-signatures">0</strong><span>Assinaturas</span></div>
          </div>

          <!-- Tools Hub Grid -->
          <div class="finance-grid" id="tools-hub-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 24px;">
            <div class="op-card orange" id="tool-signature-btn" style="cursor: pointer;">
              <div class="op-icon">✍</div>
              <div>
                <strong>Assinatura Digital</strong>
                <span>Assine documentos e OS diretamente na tela</span>
              </div>
            </div>
            <div class="op-card green" id="tool-calc-prices-btn" style="cursor: pointer;">
              <div class="op-icon">🧮</div>
              <div>
                <strong>Calculadora de Preços</strong>
                <span>Orçamento automático com materiais + margem</span>
              </div>
            </div>
            <div class="op-card blue" id="tool-calc-travel-btn" style="cursor: pointer;">
              <div class="op-icon">🚗</div>
              <div>
                <strong>Custo de Deslocamento</strong>
                <span>Calcule combustível e distância</span>
              </div>
            </div>
            <div class="op-card orange" id="tool-price-table-btn" style="cursor: pointer;">
              <div class="op-icon">📋</div>
              <div>
                <strong>Tabela de Preços Médios</strong>
                <span>Valores recomendados de serviços</span>
              </div>
            </div>
            <div class="op-card green" id="tool-materials-btn" style="cursor: pointer;">
              <div class="op-icon">🧱</div>
              <div>
                <strong>Lista de Materiais</strong>
                <span>Gerencie seus insumos e cabos</span>
              </div>
            </div>
            <div class="op-card blue" id="tool-services-btn" style="cursor: pointer;">
              <div class="op-icon">🛠</div>
              <div>
                <strong>Serviços Cadastrados</strong>
                <span>Consulte e gerencie atendimentos</span>
              </div>
            </div>
            <div class="op-card orange" id="tool-clients-btn" style="cursor: pointer;">
              <div class="op-icon">👥</div>
              <div>
                <strong>Lista de Clientes</strong>
                <span>Listagem de contatos e endereços</span>
              </div>
            </div>
            <div class="op-card cyan" id="tool-calc-electric-btn" style="cursor: pointer; background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(14, 165, 233, 0.12)) !important; border-color: rgba(6, 182, 212, 0.25) !important;">
              <div class="op-icon" style="color: #22d3ee !important; text-shadow: 0 0 10px rgba(34, 211, 238, 0.4);">⚡</div>
              <div>
                <strong>Calculadora Elétrica</strong>
                <span>Bitola de cabo e disjuntor ideal para a OS</span>
              </div>
            </div>
          </div>

          <!-- Individual Tool Panels (Beautiful centered overlay modals!) -->
          
          <!-- 1. ASSINATURA DIGITAL MODAL -->
          <div class="modal-overlay" id="panel-tool-signature" aria-hidden="true">
            <div class="modal-card" style="max-width: 480px;">
              <header class="modal-header">
                <h2>✍ Assinatura Digital</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 14px;">
                <canvas id="signature-canvas" width="400" height="200" style="border: 2px dashed var(--line-strong); border-radius: 12px; background: rgba(0,0,0,0.15); width: 100%; max-width: 400px; touch-action: none; cursor: crosshair;"></canvas>
                <div class="actions">
                  <button class="secondary" id="btn-clear-signature">Limpar</button>
                  <button class="primary" id="btn-save-signature">Salvar Assinatura</button>
                </div>
                <div id="signature-preview-container" style="display: none; text-align: center; margin-top: 10px; width:100%;">
                  <p>Assinatura Salva:</p>
                  <img id="signature-preview-img" src="" style="border: 1px solid var(--line); border-radius: 8px; max-width: 100%; background: #fff;" />
                </div>
              </div>
            </div>
          </div>
          
          <!-- 8. CALCULADORA ELÉTRICA MODAL (NBR 5410) -->
          <div class="modal-overlay" id="panel-tool-electric" aria-hidden="true">
            <div class="modal-card" style="max-width: 500px; padding: 24px;">
              <header class="modal-header">
                <h2 style="color: #22d3ee; margin: 0; display: flex; align-items: center; gap: 8px;">⚡ Calculadora Elétrica (NBR 5410)</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <form id="electric-calc-form" style="display: grid; gap: 12px; margin-top: 16px;">
                <div class="inline" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <label style="font-size:12px;">
                    Potência do Equipamento (W)
                    <input type="number" id="calc-elec-power" required value="5000" min="1" style="width: 100%; font-size:13px;" />
                  </label>
                  <label style="font-size:12px;">
                    Tensão da Rede (V)
                    <select id="calc-elec-voltage" style="width: 100%; font-size:13px;">
                      <option value="127">127 V (Monofásico)</option>
                      <option value="220" selected>220 V (Fase-Fase/Monofásico)</option>
                      <option value="380">380 V (Trifásico)</option>
                    </select>
                  </label>
                </div>
                <div class="inline" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <label style="font-size:12px;">
                    Comprimento do Cabo (m)
                    <input type="number" id="calc-elec-length" required value="20" min="1" style="width: 100%; font-size:13px;" />
                  </label>
                  <label style="font-size:12px;">
                    Instalação
                    <select id="calc-elec-embedded" style="width: 100%; font-size:13px;">
                      <option value="embedded" selected>Eletroduto Embutido (Parede/Laje)</option>
                      <option value="exposed">Ao Ar Livre / Canaleta Aberta</option>
                    </select>
                  </label>
                </div>
                <button class="primary" type="button" id="btn-run-electric-calc" style="background: linear-gradient(135deg, #06b6d4, #0891b2) !important; color: #fff !important; border:none !important; font-weight:bold; font-size: 13px; min-height: 38px;">⚡ Calcular Dimensionamento</button>
                
                <!-- Display Results beautifully in premium Glassmorphic Box -->
                <div id="electric-calc-results" style="margin-top: 14px; padding: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; display: none;">
                  <h4 style="margin: 0 0 8px; color: #22d3ee; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:4px;">📋 Resultado do Dimensionamento</h4>
                  <div style="display: grid; gap: 6px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between;"><span>Corrente Nominal:</span><strong id="res-elec-current">0.00 A</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Queda de Tensão:</span><strong id="res-elec-drop">0.00%</strong></div>
                    <div style="display: flex; justify-content: space-between; border-top:1px dashed rgba(255,255,255,0.15); padding-top:6px; margin-top:4px;">
                      <span style="font-weight:bold; color: var(--amber);">Bitola do Cabo Recomendada:</span>
                      <strong id="res-elec-wire" style="font-size:14px; color: var(--amber);">2.5 mm²</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-weight:bold; color: #22c55e;">Disjuntor Recomendado:</span>
                      <strong id="res-elec-breaker" style="font-size:14px; color: #22c55e;">32 A</strong>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <!-- 2. CALCULADORA DE PREÇOS MODAL -->
          <div class="modal-overlay" id="panel-tool-calc-prices" aria-hidden="true">
            <div class="modal-card" style="max-width: 500px;">
              <header class="modal-header">
                <h2>🧮 Calculadora de Preços</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="display: grid; gap: 12px; margin-top: 14px;">
                <label>Valor dos Materiais (R$)<input type="number" id="calc-materials-cost" value="0" step="0.01" /></label>
                <div class="inline">
                  <label>Horas de Trabalho<input type="number" id="calc-labor-hours" value="0" step="0.5" /></label>
                  <label>Valor da Hora (R$)<input type="number" id="calc-labor-rate" value="50" /></label>
                </div>
                <label>Margem de Lucro Desejada (%)<input type="number" id="calc-profit-margin" value="20" /></label>
                
                <div class="slot" style="background: rgba(0,0,0,0.2); border-color: var(--line-strong); margin-top: 10px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span>Custo de Mão de Obra:</span><strong id="res-labor-cost">R$ 0,00</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span>Custo Total de Produção:</span><strong id="res-production-cost">R$ 0,00</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span>Valor do Lucro:</span><strong id="res-profit-value">R$ 0,00</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; color: var(--accent); border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; font-size:18px;">
                    <span>Preço Final Recomendado:</span><span id="res-final-price">R$ 0,00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. CUSTO DE DESLOCAMENTO MODAL -->
          <div class="modal-overlay" id="panel-tool-calc-travel" aria-hidden="true">
            <div class="modal-card" style="max-width: 500px;">
              <header class="modal-header">
                <h2>🚗 Custo de Deslocamento</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="display: grid; gap: 12px; margin-top: 14px;">
                <label>Distância da Viagem (km)<input type="number" id="travel-distance" value="0" step="0.1" /></label>
                <div class="inline">
                  <label>Consumo do Veículo (km/L)<input type="number" id="travel-efficiency" value="10" step="0.1" /></label>
                  <label>Preço do Combustível (R$/L)<input type="number" id="travel-fuel-price" value="5.89" step="0.01" /></label>
                </div>
                <label>Outros Custos (Pedágio, etc. - R$)<input type="number" id="travel-other-costs" value="0" /></label>
                
                <div class="slot" style="background: rgba(0,0,0,0.2); border-color: var(--line-strong); margin-top: 10px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span>Combustível Necessário:</span><strong id="res-fuel-liters">0,00 L</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span>Custo do Combustível:</span><strong id="res-fuel-cost">R$ 0,00</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; color: var(--accent); border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; font-size:18px;">
                    <span>Custo Total do Deslocamento:</span><span id="res-travel-total">R$ 0,00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. TABELA DE PREÇOS MÉDIOS MODAL -->
          <div class="modal-overlay" id="panel-tool-price-table" aria-hidden="true">
            <div class="modal-card" style="max-width: 680px; width: 90%;">
              <header class="modal-header">
                <h2>📋 Tabela de Preços Médios</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="margin-top: 14px;">
                <input type="text" id="search-price-table" placeholder="Filtrar tabela..." style="margin-bottom: 12px;" />
                <div style="overflow-x: auto; border: 1px solid var(--line); border-radius: 8px;">
                  <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                      <tr style="background: var(--panel-strong); border-bottom: 1px solid var(--line);">
                        <th style="padding: 10px;">Serviço / Atendimento</th>
                        <th style="padding: 10px;">Unidade</th>
                        <th style="padding: 10px; text-align: right;">Faixa Média</th>
                      </tr>
                    </thead>
                    <tbody id="price-table-rows">
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Instalação de Tomada Elétrica Simples</td><td style="padding: 10px;">Un</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 45,00 - R$ 75,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Substituição de Disjuntor Monofásico</td><td style="padding: 10px;">Un</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 60,00 - R$ 90,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Instalação de Interruptor Simples/Paralelo</td><td style="padding: 10px;">Un</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 50,00 - R$ 85,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Instalação de Chuveiro Elétrico</td><td style="padding: 10px;">Un</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 90,00 - R$ 150,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Revisão Geral de Quadro de Distribuição (QDC)</td><td style="padding: 10px;">Un</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 250,00 - R$ 450,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Passagem de Cabeamento (Fios e Cabos) (por metro)</td><td style="padding: 10px;">Metro</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 8,00 - R$ 15,00</td>
                      </tr>
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px; font-weight: bold;">Atendimento Técnico Emergencial (Geral)</td><td style="padding: 10px;">Visita</td><td style="padding: 10px; text-align: right; color: var(--accent);">R$ 150,00 - R$ 250,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. CADASTRO DE MATERIAIS MODAL -->
          <div class="modal-overlay" id="panel-tool-materials" aria-hidden="true">
            <div class="modal-card" style="max-width: 600px; width: 90%;">
              <header class="modal-header">
                <h2>🧱 Lista de Materiais</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="margin-top: 14px;">
                <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items:center;">
                  <input type="text" id="search-materials-input" placeholder="Pesquisar..." style="flex: 1;" />
                  <button class="primary" id="btn-add-material-modal" style="min-height: 40px; padding: 0 16px; font-size:12px;">+ Novo Material</button>
                </div>
                <div id="materials-list-container" class="smart-slots" style="max-height: 320px; overflow-y: auto;">
                  <!-- Preenchido dinamicamente -->
                </div>
              </div>
            </div>
          </div>

          <!-- 6. CADASTRO DE SERVIÇOS MODAL -->
          <div class="modal-overlay" id="panel-tool-services" aria-hidden="true">
            <div class="modal-card" style="max-width: 600px; width: 90%;">
              <header class="modal-header">
                <h2>🛠 Lista de Serviços</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="margin-top: 14px;">
                <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items:center;">
                  <input type="text" id="search-services-input" placeholder="Pesquisar..." style="flex: 1;" />
                  <button class="primary" id="btn-add-service-modal" style="min-height: 40px; padding: 0 16px; font-size:12px;">+ Novo Serviço</button>
                </div>
                <div id="services-list-container" class="smart-slots" style="max-height: 320px; overflow-y: auto;">
                  <!-- Preenchido dinamicamente -->
                </div>
              </div>
            </div>
          </div>

          <!-- 7. CADASTRO DE CLIENTES MODAL -->
          <div class="modal-overlay" id="panel-tool-clients" aria-hidden="true">
            <div class="modal-card" style="max-width: 600px; width: 90%;">
              <header class="modal-header">
                <h2>👥 Lista de Clientes</h2>
                <button class="secondary" onclick="closeToolPanels()" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
              </header>
              <div style="margin-top: 14px;">
                <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items:center;">
                  <input type="text" id="search-clients-input" placeholder="Pesquisar..." style="flex: 1;" />
                  <button class="primary" id="btn-add-client-modal" style="min-height: 40px; padding: 0 16px; font-size:12px;">+ Novo Cliente</button>
                </div>
                <div id="clients-list-container" class="smart-slots" style="max-height: 320px; overflow-y: auto;">
                  <!-- Preenchido dinamicamente -->
                </div>
              </div>
            </div>
          </div>

        </div>

        <div id="ai" class="view">
          <div class="ai-grid" id="agent-cards"></div>
          <pre id="agent-output">{}</pre>
        </div>

        <div id="profile" class="view">
          <div class="profile-grid" style="display: grid; grid-template-columns: 1fr; gap: 20px; max-width: 1000px; margin: 0 auto; width: 100%;">
            
            <!-- COLUMN 1: Profile & Status -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div class="panel" style="margin: 0;">
                <div class="panel-title">
                  <h2>Perfil do Usuário</h2>
                  <span class="chip" id="profile-pwa-role-badge">Técnico</span>
                </div>
                <form id="profile-form" style="display: grid; gap: 14px; margin-top: 16px;">
                  <label>
                    Nome do Usuário
                    <input name="userName" id="profile-user-name-input" required style="width: 100%;" />
                  </label>
                  <label>
                    Perfil / Cargo
                    <select name="userRole" id="profile-user-role-select" style="width: 100%;">
                      <option value="Técnico">Técnico</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                  </label>
                  <button class="primary" type="submit" style="margin-top: 8px;">Salvar Perfil</button>
                  <button type="button" onclick="localStorage.removeItem('atlas_login_session'); location.reload();" style="border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); color: #ff5a65; width: 100%; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; min-height: 40px; margin-top: 10px; font-size: 13px;">⎋ Sair do Aplicativo</button>
                </form>
              </div>

              <div class="panel" style="margin: 0;">
                <div class="panel-title"><h2>Status operacional</h2><span class="chip">PWA</span></div>
                <div class="smart-slots">
                  <div class="slot"><strong>Instalável na tela inicial</strong><small>Interface priorizada para uso em campo e toque rápido.</small></div>
                  <div class="slot"><strong>Offline parcial</strong><small>Fluxos críticos podem evoluir para fila local quando a API estiver fora.</small></div>
                  <div class="slot"><strong>Notificações push</strong><small>Pronto para alertas de SLA, aprovação e chamados pendentes.</small></div>
                </div>
              </div>
            </div>

            <!-- COLUMN 2: Receipt Branding -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div class="panel" style="margin: 0;">
                <div class="panel-title">
                  <h2>Identidade do Recibo (Branding)</h2>
                  <span class="chip">Recibo</span>
                </div>
                <form id="branding-form" style="display: grid; gap: 14px; margin-top: 16px;">
                  <label>
                    Nome do Emissor / Empresa
                    <input name="emissorName" id="branding-emissor-name-input" required style="width: 100%;" placeholder="Ex: João Silva Serviços, Razão Social, MEI..." />
                  </label>
                  <label>
                    Tipo de Emissor
                    <select name="brandType" id="branding-brand-type-select" style="width: 100%;">
                      <option value="AUTONOMO">Profissional Autônomo</option>
                      <option value="MEI">Microempreendedor Individual (MEI)</option>
                      <option value="FREELANCE">Freelancer</option>
                      <option value="EMPRESA">Empresa Geral (Razão/Fantasia)</option>
                    </select>
                  </label>
                  <label>
                    Logotipo URL
                    <input name="logoUrl" id="branding-logo-url-input" style="width: 100%;" placeholder="https://exemplo.com/logo.png" />
                  </label>
                  <div class="inline">
                    <label>
                      Telefone
                      <input name="phone" id="branding-phone-input" style="width: 100%;" placeholder="(11) 99999-9999" />
                    </label>
                    <label>
                      E-mail
                      <input name="email" id="branding-email-input" type="email" style="width: 100%;" placeholder="contato@empresa.com" />
                    </label>
                  </div>
                  <label>
                    Endereço
                    <input name="address" id="branding-address-input" style="width: 100%;" placeholder="Rua, número, bairro, cidade - UF" />
                  </label>
                  <label>
                    Chave Pix (para pagamentos do recibo)
                    <input name="pixKey" id="branding-pix-key-input" style="width: 100%;" placeholder="Ex: celular, email, CPF, chave aleatória" />
                  </label>
                  <label>
                    Termos da Garantia Padrão
                    <textarea name="warrantyTerms" id="branding-warranty-terms-textarea" style="width: 100%; height: 80px;" placeholder="Ex: Garantia de mão de obra de 90 dias a partir da entrega..."></textarea>
                  </label>
                  <button class="primary" type="submit" style="margin-top: 8px;">Salvar Identidade do Recibo</button>
                </form>
              </div>
            </div>

          </div>
        </div>

        <div id="admin" class="view">
          <div class="orders-layout">
            <form id="organization-form" class="panel">
              <div class="panel-title"><h3>Cliente / Contrato</h3></div>
              <label>Nome / Razão Social<input name="name" required placeholder="Ex: João da Silva ou Oficina XYZ" /></label>
              <div class="inline">
                <label>Tipo<select name="type"><option value="private">Particular (CPF)</option><option value="corporate">Empresa (CNPJ)</option></select></label>
                <label>CPF / CNPJ<input name="document" placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00" /></label>
              </div>
              <div class="inline">
                <label>Telefone<input name="phone" placeholder="Ex: (11) 99999-9999" /></label>
                <label>Contrato mensal<input name="monthlyContractValue" type="number" min="0" step="0.01" placeholder="0.00" /></label>
              </div>
              <label>Endereço completo<input name="address" placeholder="Rua, número, bairro, cidade - UF" /></label>
              <div class="inline" style="display: none;">
                <label>SLA alvo (%)<input name="targetSla" type="number" min="0" max="100" value="100" /></label>
              </div>
              <button class="primary" type="submit" style="margin-top: 8px;">Criar cliente</button>
            </form>

            <form id="asset-form" class="panel">
              <div class="panel-title"><h3>Ativo / equipamento</h3></div>
              <label>Cliente<select id="organization-select" required></select></label>
              <label>Nome do ativo<input name="name" required /></label>
              <div class="inline">
                <label>Tipo<select name="kind"><option value="equipment">Equipamento</option><option value="facility">Local</option><option value="system">Sistema</option><option value="tool">Ferramenta</option></select></label>
                <label>Criticidade<select name="criticality"><option value="low">Baixa</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Critica</option></select></label>
              </div>
              <label>Localizacao<input name="location" /></label>
              <button class="primary" type="submit">Registrar ativo</button>
            </form>
          </div>
          <div class="panel">
            <div class="panel-title"><h3>Timeline</h3></div>
            <div id="timeline" class="smart-slots"></div>
          </div>
        </div>
      </section>
    </main>

    <button class="fab" id="fab" aria-label="Acoes rapidas">+</button>
    <div class="quick-sheet" id="quick-sheet">
      <div class="panel-title"><h3>Acoes rapidas</h3><span class="chip">Criar</span></div>
      <div class="actions">
        <button class="secondary" data-quick="work-order">Nova OS</button>
        <button class="secondary" data-quick="budget">Novo orcamento</button>
        <button class="secondary" data-quick="agenda">Novo agendamento</button>
        <button class="secondary" data-quick="client">Novo cliente</button>
        <button class="secondary" data-quick="ai">Assistente IA</button>
      </div>
    </div>

    <!-- Overlay modal for viewing appointment details -->
    <div class="modal-overlay" id="appointment-modal" aria-hidden="true">
      <div class="modal-card">
        <header class="modal-header" style="justify-content: space-between; align-items: center; width: 100%;">
          <h3 id="modal-title" style="margin: 0;">Detalhes do Agendamento</h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" id="modal-status-badge" style="margin: 0;">scheduled</span>
            <button class="secondary" id="btn-close-appointment-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
          </div>
        </header>
        <div class="modal-body" id="modal-details-content">
          <!-- Dynamically filled -->
        </div>
        <div class="actions" style="margin-top: 14px; justify-content: flex-end;">
          <button class="secondary" id="modal-close-btn">Fechar</button>
          <button class="primary" id="modal-edit-btn">Editar</button>
          <button class="secondary" id="modal-delete-btn" style="border-color: var(--danger); color: var(--danger);">Excluir</button>
        </div>
      </div>
    </div>

    <!-- Custom Confirm Modal -->
    <div class="modal-overlay" id="confirm-modal" aria-hidden="true">
      <div class="modal-card">
        <header class="modal-header" style="justify-content: space-between; align-items: center; width: 100%;">
          <h3 id="confirm-modal-title" style="margin: 0;">Confirmação</h3>
          <button class="secondary" id="btn-close-confirm-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <div class="modal-body">
          <p id="confirm-modal-message">Deseja realmente realizar esta ação?</p>
        </div>
        <div class="actions" style="margin-top: 14px; justify-content: flex-end;">
          <button class="secondary" id="confirm-modal-cancel-btn">Cancelar</button>
          <button class="primary" id="confirm-modal-ok-btn" style="background: var(--amber); border-color: var(--amber); color: #fff;">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- Custom Evidence Modal -->
    <div class="modal-overlay" id="evidence-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card" style="max-width: 480px;">
        <header class="modal-header" style="justify-content: space-between; align-items: center; width: 100%;">
          <h3 style="margin: 0; color: var(--accent);">📸 Adicionar Evidência</h3>
          <button class="secondary" id="btn-close-evidence-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="evidence-create-form" style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
          <label>Título da Evidência
            <input id="evidence-title-input" placeholder="Ex: Medição de Tensão" required />
          </label>
          <label>Notas / Observações
            <textarea id="evidence-notes-input" style="height: 80px;" placeholder="Ex: Constatado valor de 220V com variação de +-5%..."></textarea>
          </label>
          <div class="actions" style="margin-top: 8px; justify-content: flex-end;">
            <button type="button" class="secondary" id="btn-cancel-evidence-modal">Cancelar</button>
            <button type="submit" class="primary" style="background: var(--amber); border-color: var(--amber); color: #fff;">Salvar Evidência</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Adicionar Novo Insumo ao Estoque (FASE 3) -->
    <div class="modal-overlay" id="inventory-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card" style="max-width: 480px;">
        <header class="modal-header" style="justify-content: space-between; align-items: center; width: 100%;">
          <h3 style="margin: 0; color: var(--accent);">📦 Novo Insumo no Porta-Malas</h3>
          <button class="secondary" id="btn-close-inventory-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="inventory-create-form" style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
          <label>Nome do Insumo / Peça<input id="inv-material-name" placeholder="Ex: Disjuntor DIN 20A" required /></label>
          <div class="inline">
            <label>Quantidade Inicial<input id="inv-quantity" type="number" min="0" value="5" required /></label>
            <label>Unidade<select id="inv-unit"><option value="Unidade">Unidade</option><option value="Metro">Metro</option><option value="Rolo">Rolo</option><option value="Pacote">Pacote</option></select></label>
          </div>
          <div class="inline">
            <label>Estoque Mínimo<input id="inv-min-safety" type="number" min="0" value="2" required /></label>
            <label>Custo Unitário (R$)<input id="inv-unit-cost" type="number" min="0" step="0.01" value="0.00" required /></label>
          </div>
          <div class="actions" style="margin-top: 8px; justify-content: flex-end;">
            <button class="secondary" type="button" id="btn-cancel-inventory-creation">Cancelar</button>
            <button class="primary" type="submit">Cadastrar Insumo</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Adicionar Novo Material -->
    <div class="modal-overlay" id="material-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card">
        <header class="modal-header">
          <h3 style="color: var(--accent);">🧱 Adicionar novo material</h3>
          <button class="secondary" id="btn-close-material-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="material-create-form" style="margin-top: 10px;">
          <label>
            Título do Material
            <input type="text" id="material-title-input" required placeholder="Digite aqui o nome do material" autocomplete="off" />
            <div id="material-autocomplete-list" class="customer-suggestions" hidden style="z-index: 160;"></div>
          </label>
          <div class="inline">
            <label>
              Unidade de Medida <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span>
              <select id="material-unit-select">
                <option value="Unidade">Unidade</option>
                <option value="Metro">Metro</option>
                <option value="Rolo">Rolo</option>
                <option value="Pacote">Pacote</option>
              </select>
            </label>
            <label>
              Valor do Material <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span>
              <input type="number" id="material-value-input" step="0.01" placeholder="Ex: R$ 57,00" />
            </label>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px;">
            <span style="font-size: 13px; font-weight: bold; color: var(--text-soft);">Habilitar margem de lucro</span>
            <input type="checkbox" id="material-margin-toggle" style="width: 20px; height: 20px;" />
          </div>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end;">
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Adicionar Material</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Adicionar Novo Serviço -->
    <div class="modal-overlay" id="service-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card">
        <header class="modal-header">
          <h3 style="color: var(--accent);">🛠 Adicionar novo serviço</h3>
          <button class="secondary" id="btn-close-service-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="service-create-form" style="margin-top: 10px;">
          <label>
            Título do Serviço
            <input type="text" id="service-title-input" required placeholder="Digite aqui o nome do serviço" autocomplete="off" />
            <div id="service-autocomplete-list" class="customer-suggestions" hidden style="z-index: 160;"></div>
          </label>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: bold; color: var(--text-soft);">Habilitar cálculo por hora</span>
            <input type="checkbox" id="service-hourly-toggle" style="width: 20px; height: 20px;" />
          </div>
          <label>
            Valor do Serviço <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span>
            <input type="number" id="service-value-input" step="0.01" placeholder="Ex: R$ 57,00" />
          </label>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end;">
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Adicionar Serviço</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Adicionar Novo Cliente -->
    <div class="modal-overlay" id="client-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card">
        <header class="modal-header">
          <h3 style="color: var(--accent);">👥 Adicionar novo cliente</h3>
          <button class="secondary" id="btn-close-client-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="client-create-form" style="margin-top: 10px; display: grid; gap: 12px;">
          <div class="inline">
            <label>Nome do Cliente<input type="text" id="client-name-input" required placeholder="Digite aqui o nome do cliente" /></label>
            <label>CPF/CNPJ <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span><input type="text" id="client-doc-input" placeholder="000.000.000-00 ou 00.000.000/0001-00" /></label>
          </div>
          <div class="inline">
            <label>Telefone do Cliente<input type="text" id="client-phone-input" required placeholder="(00) 00000-0000" /></label>
            <label>E-mail do Cliente <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span><input type="email" id="client-email-input" placeholder="pedro@gmail.com" /></label>
          </div>
          <label>Endereço <span style="color: var(--text-soft); font-size:10px; font-weight:normal;">Opcional</span><input type="text" id="client-address-input" placeholder="Av. Portugal, 4340, Itapoã - Belo Horizonte/MG" /></label>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end;">
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Adicionar Cliente</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Recusa de Orçamento (Motivo de Declínio) -->
    <div class="modal-overlay" id="decline-reason-modal" aria-hidden="true" style="z-index: 160;">
      <div class="modal-card" style="max-width: 450px;">
        <header class="modal-header">
          <h3 style="color: var(--danger);">🚫 Recusar Orçamento</h3>
          <button class="secondary" id="btn-close-decline-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="decline-reason-form" style="margin-top: 10px; display: grid; gap: 12px;">
          <label>Motivo da Recusa *
            <select id="decline-category-select" required style="width: 100%; height: 38px; font-size: 13px;">
              <option value="price_high">Preço muito alto (price_high)</option>
              <option value="scope_mismatch">Incompatibilidade de escopo (scope_mismatch)</option>
              <option value="deadline_unavailable">Prazo indisponível (deadline_unavailable)</option>
              <option value="competitor_chosen">Concorrente escolhido (competitor_chosen)</option>
              <option value="client_postponed">Adiado pelo cliente (client_postponed)</option>
              <option value="no_response">Sem resposta do cliente (no_response)</option>
              <option value="other">Outro motivo (other)</option>
            </select>
          </label>
          <label>Observações Adicionais
            <textarea id="decline-notes-input" style="width: 100%; height: 70px; font-size: 12px;" placeholder="Detalhes opcionais sobre o motivo da recusa..."></textarea>
          </label>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end; display: flex; gap: 8px;">
            <button class="secondary" type="button" id="btn-cancel-decline">Cancelar</button>
            <button class="primary" type="submit" style="background: var(--danger); border-color: var(--danger); color: #fff;">Confirmar Recusa</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Ativação e Customização de Garantia -->
    <div class="modal-overlay" id="warranty-customization-modal" aria-hidden="true" style="z-index: 160;">
      <div class="modal-card" style="max-width: 450px;">
        <header class="modal-header">
          <h3 style="color: var(--green);">🛡️ Ativar Garantia e Faturar</h3>
          <button class="secondary" id="btn-close-warranty-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="warranty-customization-form" style="margin-top: 10px; display: grid; gap: 12px;">
          <label>Prazo de Garantia (Dias) *
            <input type="number" id="warranty-days-input" required min="0" value="90" style="width: 100%;" />
            <small style="display: block; opacity: 0.7; margin-top: 2px;">
              Herdado: OS específica &gt; Tenant Branding &gt; Padrão Global (90 dias).
            </small>
          </label>
          <label>Termos da Garantia
            <textarea id="warranty-terms-input" style="width: 100%; height: 70px; font-size: 12px;" placeholder="Ex: Garantia total sobre peças e mão de obra contratadas..."></textarea>
          </label>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end; display: flex; gap: 8px;">
            <button class="secondary" type="button" id="btn-cancel-warranty">Cancelar</button>
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Confirmar e Faturar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Nova Categoria de Gastos -->
    <div class="modal-overlay" id="category-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card">
        <header class="modal-header">
          <h3 style="color: var(--accent);">💰 Nova categoria</h3>
          <button class="secondary" id="btn-close-category-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="category-create-form" style="margin-top: 10px; display: grid; gap: 12px;">
          <label>Nome *<input type="text" id="category-name-input" required placeholder="Ex: Alimentação" /></label>
          <label>Ícone *</label>
          <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;" id="category-icons-grid">
            <!-- Preenchido dinamicamente -->
          </div>
          <label>Cor *</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="category-colors-grid">
            <!-- Preenchido dinamicamente -->
          </div>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end;">
            <button class="secondary" type="button" id="btn-cancel-category-creation">Cancelar</button>
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Criar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Registrar Gasto -->
    <div class="modal-overlay" id="expense-create-modal" aria-hidden="true" style="z-index: 150;">
      <div class="modal-card">
        <header class="modal-header">
          <h3 style="color: var(--accent);">💸 Registrar despesa</h3>
          <button class="secondary" id="btn-close-expense-modal" style="padding: 4px; border:none; background:none; font-size:20px; line-height:1; color: var(--text); cursor:pointer;">✕</button>
        </header>
        <form id="expense-create-form" style="margin-top: 10px; display: grid; gap: 12px;">
          <label>Descrição *<input type="text" id="expense-description-input" required placeholder="Ex: Almoço da equipe" /></label>
          <div class="inline">
            <label>Valor (R$) *<input type="number" id="expense-value-input" required step="0.01" placeholder="Ex: 45.00" /></label>
            <label>Data *<input type="date" id="expense-date-input" required /></label>
          </div>
          <label>Categoria *
            <select id="expense-category-select" required>
              <!-- Preenchido dinamicamente -->
            </select>
          </label>
          <div class="actions" style="margin-top: 16px; justify-content: flex-end;">
            <button class="secondary" type="button" id="btn-cancel-expense-creation">Cancelar</button>
            <button class="primary" type="submit" style="background: var(--green); border-color: var(--green); color: #fff;">Registrar</button>
          </div>
        </form>
      </div>
    </div>


    <nav class="bottom" aria-label="Navegacao principal">
      <button class="active" data-tab="home"><b>⌂</b><span>Home</span></button>
      <button data-tab="orders"><b>▣</b><span>OS</span></button>
      <button data-tab="agenda"><b>◇</b><span>Agenda</span></button>
      <button data-tab="finance"><b>$</b><span>Financeiro</span></button>
      <button data-tab="tools"><b>🔧</b><span>Ferramentas</span></button>
      <button data-tab="ai"><b>✦</b><span>IA</span></button>
      <button data-tab="profile"><b>○</b><span>Perfil</span></button>
    </nav>

    <!-- PWA Unified Login View -->
    <div id="login-view" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; background: var(--body-bg);">
      <div class="panel" style="width: 100%; max-width: 380px; padding: 28px; border-radius: 16px; text-align: center; box-shadow: var(--shadow);">
        <div class="brand" style="margin-bottom: 24px;">
          <div class="brand-mark" style="margin: 0 auto 10px; width: 44px; height: 44px;">D</div>
          <strong style="font-size: 24px;">ATLAS OS Field</strong>
          <span style="letter-spacing: 0.15em; font-size: 11px;">Parceiro de Campo</span>
        </div>

        <div id="login-form-pwa" style="display: grid; gap: 14px;">
          <p style="font-size: 13px; margin-bottom: 10px; color: var(--text-soft);">Acesse informando seu número de celular e PIN.</p>
          <label style="text-align: left; display: grid; gap: 6px; font-weight: 500;">
            Celular
            <input type="tel" id="login-phone" placeholder="(11) 99999-9999" required style="width: 100%; min-height: 40px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--input-bg); color: #fff; font-size: 16px;" />
          </label>
          <label style="text-align: left; display: grid; gap: 6px; font-weight: 500;">
            PIN de Acesso
            <input type="password" id="login-pin" maxlength="4" placeholder="4 dígitos" required style="width: 100%; min-height: 40px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--input-bg); color: #fff; text-align: center; letter-spacing: 0.5em; font-size: 16px;" />
          </label>
          <button class="primary" id="btn-login-pwa" style="width: 100%; min-height: 44px; margin-top: 10px; border-radius: 8px; font-weight: bold; font-size: 16px;">Entrar</button>
        </div>
      </div>
    </div>

    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js")
            .then((reg) => console.log("Service Worker registrado com sucesso!", reg.scope))
            .catch((err) => console.warn("Falha ao registrar Service Worker:", err));
        });
      }

      const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
      const todayIso = new Date().toISOString().slice(0, 10);
      const state = { organizations: [], assets: [], workOrders: [], appointments: [], activeOrganizationId: "", activeWorkOrderId: "", filter: "all", agendaMonth: todayIso.slice(0, 7), agendaDate: todayIso, user: { configured: false, tenantCode: "#00", accessLevel: "field_operator" }, formMaterials: [], viewMode: localStorage.getItem("atlas_view_mode") || "list" };
      let editingWorkOrderId = null;
      let pendingWorkOrderCustomerName = "";

      localStorage.removeItem("atlas_user_profile");

      const el = (id) => document.getElementById(id);
      const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const asNumber = (value) => value === "" || value === null || value === undefined ? undefined : Number(value);
      const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
      const dateLabel = (isoDate) => new Date(isoDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const dateTimeLabel = (isoDateTime) => new Date(isoDateTime).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

      const localDateStr = (isoString) => {
        if (!isoString) return "";
        try {
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return "";
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return y + "-" + m + "-" + day;
        } catch (e) {
          return "";
        }
      };

      const formatDueAt = (isoString) => {
        if (!isoString) return "Sem prazo definido";
        try {
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return isoString;
          const datePart = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
          const timePart = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const offsetMin = d.getTimezoneOffset();
          const offsetHours = -Math.round(offsetMin / 60);
          const tzLabel = offsetHours >= 0 ? "+" + offsetHours : String(offsetHours);
          return datePart + " às " + timePart + " (" + tzLabel + " UTC)";
        } catch (e) {
          return isoString;
        }
      };

      // --- INDEXEDDB OFFLINE KERNEL ---
      const DB_NAME = "atlas_offline_db";
      const DB_VERSION = 1;

      function openDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("profile")) db.createObjectStore("profile");
            if (!db.objectStoreNames.contains("organizations")) db.createObjectStore("organizations");
            if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets");
            if (!db.objectStoreNames.contains("workOrders")) db.createObjectStore("workOrders");
            if (!db.objectStoreNames.contains("appointments")) db.createObjectStore("appointments");
            if (!db.objectStoreNames.contains("syncQueue")) db.createObjectStore("syncQueue", { autoIncrement: true });
          };
          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (event) => reject(event.target.error);
        });
      }

      async function dbGet(storeName, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function dbPut(storeName, key, value) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.put(value, key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      async function dbGetQueue() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction("syncQueue", "readonly");
          const store = transaction.objectStore("syncQueue");
          const request = store.openCursor();
          const items = [];
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              items.push({ key: cursor.key, value: cursor.value });
              cursor.continue();
            } else {
              resolve(items);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }

      async function dbAddQueue(item) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction("syncQueue", "readwrite");
          const store = transaction.objectStore("syncQueue");
          const request = store.add(item);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function dbDeleteQueue(key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction("syncQueue", "readwrite");
          const store = transaction.objectStore("syncQueue");
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      async function cacheGetRequest(path, data) {
        try {
          if (path.startsWith("/field/profile")) {
            await dbPut("profile", "current", data);
          } else if (path.startsWith("/organizations")) {
            await dbPut("organizations", "list", data.items || data);
          } else if (path.startsWith("/assets")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            await dbPut("assets", orgId, data.items || data);
          } else if (path.startsWith("/maintenance/work-orders")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            await dbPut("workOrders", orgId, data.items || data);
          } else if (path.startsWith("/field/appointments")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            await dbPut("appointments", orgId, data.items || data);
          }
        } catch (e) {
          console.error("Erro ao salvar cache no IndexedDB:", e);
        }
      }

      async function getCacheFallback(path) {
        try {
          if (path.startsWith("/field/profile")) {
            return await dbGet("profile", "current");
          } else if (path.startsWith("/organizations")) {
            const items = await dbGet("organizations", "list");
            return items ? { items } : null;
          } else if (path.startsWith("/assets")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            const items = await dbGet("assets", orgId);
            return items ? { items } : null;
          } else if (path.startsWith("/maintenance/work-orders")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            const items = await dbGet("workOrders", orgId);
            return items ? { items } : null;
          } else if (path.startsWith("/field/appointments")) {
            const queryIndex = path.indexOf("?");
            const query = queryIndex !== -1 ? path.substring(queryIndex) : "";
            const orgId = new URLSearchParams(query).get("organizationId") || "default";
            const items = await dbGet("appointments", orgId);
            return items ? { items } : null;
          }
        } catch (e) {
          console.error("Erro ao ler cache do IndexedDB:", e);
        }
        return null;
      }

      function simulateMutationResponse(path, body) {
        if (path === "/organizations" || path === "/assets" || path === "/maintenance/work-orders" || path === "/field/appointments" || path === "/expenses" || path === "/inventory") {
          const generatedId = "mock_" + Math.random().toString(36).substring(2, 10);
          const entity = { id: generatedId, ...body, createdAt: new Date().toISOString() };
          
          updateLocalStateMemory(path, entity);
          
          if (path === "/organizations") return { organization: entity };
          if (path === "/assets") return { asset: entity };
          if (path === "/maintenance/work-orders") return { workOrder: entity };
          if (path === "/field/appointments") return { appointment: entity };
          if (path === "/expenses") return { expense: entity };
          return entity;
        }
        return { ok: true };
      }

      function updateLocalStateMemory(path, entity) {
        if (path === "/organizations") {
          state.organizations = [entity, ...state.organizations];
          renderSelectors();
        } else if (path === "/assets") {
          state.assets = [entity, ...state.assets];
          renderSelectors();
        } else if (path === "/maintenance/work-orders") {
          state.workOrders = [entity, ...state.workOrders];
          renderWorkOrders();
        } else if (path === "/field/appointments") {
          state.appointments = [entity, ...state.appointments];
          renderAgenda();
        }
      }

      let isSyncing = false;
      async function syncOfflineQueue() {
        if (isSyncing) return;
        const queue = await dbGetQueue();
        if (queue.length === 0) return;

        isSyncing = true;
        showToast("Sincronização", "Sincronizando " + queue.length + " operações offline...", "info");
        
        for (const item of queue) {
          try {
            const sessionStr = localStorage.getItem("atlas_login_session");
            const headers = { 
              "content-type": "application/json",
              ...(sessionStr ? { "Authorization": "Bearer " + JSON.parse(sessionStr).token } : {})
            };
            const response = await fetch(apiBase + item.value.path, {
              method: item.value.method,
              headers,
              body: item.value.body ? JSON.stringify(item.value.body) : undefined
            });

            if (response.ok) {
              await dbDeleteQueue(item.key);
            } else {
              console.warn("Falha ao sincronizar item offline, mantendo na fila:", item);
            }
          } catch (err) {
            console.error("Erro na requisição de sincronização offline:", err);
            break; 
          }
        }
        
        isSyncing = false;
        
        const remainingQueue = await dbGetQueue();
        if (remainingQueue.length === 0) {
          showToast("Sucesso", "Todas as alterações foram sincronizadas!", "success");
          await load(); 
        }
      }

      window.addEventListener("online", syncOfflineQueue);
      setInterval(() => {
        if (navigator.onLine) {
          syncOfflineQueue();
        }
      }, 30000);

      async function call(path, options = {}) {
        const method = (options.method || "GET").toUpperCase();
        const sessionStr = localStorage.getItem("atlas_login_session");
        const headers = { 
          "content-type": "application/json",
          ...(sessionStr ? { "Authorization": "Bearer " + JSON.parse(sessionStr).token } : {})
        };
        const fetchOptions = { ...options, headers: { ...headers, ...options.headers } };

        if (method === "GET") {
          try {
            const response = await fetch(apiBase + path, fetchOptions);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || data.error || "HTTP " + response.status);
            
            await cacheGetRequest(path, data);
            return data;
          } catch (error) {
            console.warn("API GET failed, returning cache fallback for " + path, error);
            const cachedData = await getCacheFallback(path);
            if (cachedData !== null) {
              showToast("Modo Offline", "Exibindo dados do cache local.", "warning");
              return cachedData;
            }
            throw error;
          }
        } else {
          try {
            const response = await fetch(apiBase + path, fetchOptions);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || data.error || "HTTP " + response.status);
            return data;
          } catch (error) {
            console.warn("API mutation failed, queueing request offline: " + path, error);
            const queueItem = {
              path,
              method,
              body: options.body ? JSON.parse(options.body) : null,
              timestamp: new Date().toISOString()
            };
            await dbAddQueue(queueItem);
            
            showToast("Offline", "Operação salva localmente. Sincronizando ao retomar conexão.", "warning");
            
            return simulateMutationResponse(path, queueItem.body);
          }
        }
      }

      function activeOrganization() {
        return state.organizations.find((item) => item.id === state.activeOrganizationId);
      }

      function normalizeSearch(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      }

      function customerMatches(query) {
        const normalized = normalizeSearch(query);
        if (normalized.length < 2) return [];
        return state.organizations
          .filter((org) => normalizeSearch(org.name).includes(normalized))
          .slice(0, 6);
      }

      function updateWorkOrderCustomerFields() {
        const search = el("work-order-customer-search");
        const card = el("selected-customer-card");
        const org = activeOrganization();
        if (search && org && document.activeElement !== search) search.value = org.name;
        if (card) {
          card.classList.toggle("empty", !org);
          card.innerHTML = org
            ? '<span class="kicker">Cliente selecionado</span><strong>' + htmlEscape(org.name) + '</strong><small>' + htmlEscape(org.address || "Endereco nao informado") + '</small>'
            : '<small>Nenhum cliente selecionado.</small>';
        }
      }

      function hideCustomerSuggestions() {
        const box = el("customer-suggestions");
        if (!box) return;
        box.hidden = true;
        box.innerHTML = "";
      }

      function renderCustomerSuggestions(query) {
        const box = el("customer-suggestions");
        if (!box) return;
        const value = String(query || "").trim();
        if (value.length < 2) {
          hideCustomerSuggestions();
          return;
        }
        const matches = customerMatches(value);
        box.hidden = false;
        box.innerHTML = matches.length
          ? matches.map((org) =>
              '<button type="button" class="customer-suggestion" data-customer-id="' + htmlEscape(org.id) + '">' +
                '<strong>' + htmlEscape(org.name) + '</strong>' +
                '<small>' + htmlEscape(org.address || "Endereco nao informado") + '</small>' +
              '</button>'
            ).join("")
          : '<button type="button" class="customer-suggestion create" data-create-customer="true">' +
              '<strong>Cadastrar novo cliente</strong>' +
              '<small>' + htmlEscape(value) + '</small>' +
            '</button>';
      }

      async function selectWorkOrderCustomer(organizationId) {
        state.activeOrganizationId = organizationId;
        state.activeWorkOrderId = "";
        hideCustomerSuggestions();
        await load();
        updateWorkOrderCustomerFields();
        const titleInput = el("work-order-form").querySelector('[name="title"]');
        if (titleInput) titleInput.focus();
      }

      async function offerCreateCustomerFromWorkOrder(name) {
        const customerName = String(name || "").trim();
        if (!customerName) return;
        hideCustomerSuggestions();
        
        // Directly open the elegant quick drawer/modal inline
        const nameInput = el("client-name-input");
        if (nameInput) {
          nameInput.value = customerName;
        }
        el("client-create-modal").classList.add("open");
        if (nameInput) {
          setTimeout(() => nameInput.focus(), 150);
        }
      }

      function activeWorkOrder() {
        return state.workOrders.find((item) => item.id === state.activeWorkOrderId);
      }

      function totals() {
        const open = state.workOrders.filter((wo) => wo.state !== "closed" && wo.state !== "cancelled").length;
        const progress = state.workOrders.filter((wo) => wo.state === "in_progress").length;
        const approved = state.workOrders.filter((wo) => wo.state === "approved" || wo.state === "in_progress" || wo.state === "closed");
        const revenue = approved.reduce((sum, wo) => sum + Number(wo.budget?.amount || 0), 0);
        const cost = state.workOrders.reduce((sum, wo) => sum + Number(wo.laborCost || 0) + (wo.materials || []).reduce((sub, item) => sub + Number(item.totalPrice || 0), 0), 0);
        return { open, progress, revenue, cost, margin: revenue - cost };
      }

      async function load() {
        try {
          let tenantParam = new URLSearchParams(location.search).get("tenant") || "";
          let emailParam = new URLSearchParams(location.search).get("email") || "";

          if (tenantParam) {
            localStorage.setItem("atlas_field_tenant", tenantParam);
          } else {
            tenantParam = localStorage.getItem("atlas_field_tenant") || "";
          }

          if (emailParam) {
            localStorage.setItem("atlas_field_email", emailParam);
          } else {
            emailParam = localStorage.getItem("atlas_field_email") || "";
          }

          const queryParams = [];
          if (tenantParam) queryParams.push("tenant=" + encodeURIComponent(tenantParam));
          if (emailParam) queryParams.push("email=" + encodeURIComponent(emailParam));
          const queryString = queryParams.length ? "?" + queryParams.join("&") : "";

          const profile = await call("/field/profile" + queryString);
          if (profile && profile.configured && profile.name && profile.role) {
            state.user = profile;
          } else {
            state.user = profile || { configured: false, tenantCode: tenantParam || "#00", accessLevel: "field_operator" };
          }
        } catch (e) {
          state.user = { configured: false, tenantCode: tenantParam || "#00", accessLevel: "field_operator" };
          console.warn("Could not load profile from backend:", e);
        }

        const health = await call("/health");
        el("health-label").textContent = health.ok ? "API online" : "API degradada";

        state.organizations = (await call("/organizations")).items || [];
        if (state.activeOrganizationId && !state.organizations.some((org) => org.id === state.activeOrganizationId)) {
          state.activeOrganizationId = "";
          state.activeWorkOrderId = "";
        }
        if (!state.activeOrganizationId && state.organizations[0]) {
          state.activeOrganizationId = state.organizations[0].id;
        }

        if (state.activeOrganizationId) {
          state.assets = (await call("/assets?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
          state.workOrders = (await call("/maintenance/work-orders?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
          state.appointments = (await call("/field/appointments?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
          if (!state.activeWorkOrderId && state.workOrders[0]) state.activeWorkOrderId = state.workOrders[0].id;
        } else {
          state.assets = [];
          state.workOrders = [];
          state.appointments = [];
        }

        // LOAD REAL DB DATA FOR EXPENSES & REGISTRIES
        try {
          state.materials = (await call("/materials")).items || [];
          state.services = (await call("/services")).items || [];
          state.expenses = (await call("/expenses")).items || [];
          state.expenseCategories = (await call("/expense-categories")).items || [];

          if (state.expenseCategories.length === 0) {
            const defaults = [
              { id: 'cat_1', name: 'Não definida', icon: '❓', color: '#607D8B' },
              { id: 'cat_2', name: 'Material', icon: '🛠', color: '#4CAF50' },
              { id: 'cat_3', name: 'Combustível', icon: '⛽', color: '#FF9800' },
              { id: 'cat_4', name: 'Alimentação', icon: '🍔', color: '#E91E63' },
              { id: 'cat_5', name: 'Transporte', icon: '🚗', color: '#2196F3' },
              { id: 'cat_6', name: 'Ferramenta', icon: '🔧', color: '#FFEB3B' },
              { id: 'cat_7', name: 'Equipamento', icon: '📦', color: '#9C27B0' },
              { id: 'cat_8', name: 'Manutenção', icon: '⚙', color: '#795548' },
              { id: 'cat_9', name: 'Outros', icon: '💬', color: '#9E9E9E' }
            ];
            for (const c of defaults) {
              await call("/expense-categories", { method: "POST", body: JSON.stringify(c) });
            }
            state.expenseCategories = (await call("/expense-categories")).items || [];
          }
        } catch (err) {
          console.warn("Could not sync registries with Postgres:", err);
        }

        render();
        await refreshTimeline();
      }

      function render() {
        renderSelectors();
        renderUserProfile();
        renderMetrics();
        renderOperationCards();
        renderSmartSlots();
        renderContextAi();
        renderWorkOrders();
        renderSelectedWorkOrder();
        renderFinance();
        renderAgentCards();
        renderAgenda();
      }

      function renderSelectors() {
        el("organization-select").innerHTML = state.organizations.map((org) => '<option value="' + org.id + '">' + htmlEscape(org.name) + '</option>').join("");
        el("organization-select").value = state.activeOrganizationId;
        el("active-client-select").innerHTML = state.organizations.map((org) => '<option value="' + org.id + '">' + htmlEscape(org.name) + '</option>').join("") || '<option value="">Sem clientes</option>';
        el("active-client-select").value = state.activeOrganizationId;
        el("work-order-organization-select").innerHTML = state.organizations.length
          ? state.organizations.map((org) => '<option value="' + org.id + '">' + htmlEscape(org.name) + '</option>').join("")
          : '<option value="">Cadastre um cliente primeiro</option>';
        el("work-order-organization-select").value = state.activeOrganizationId;
        updateWorkOrderCustomerFields();
        el("asset-select").innerHTML = '<option value="">Criar automaticamente ao abrir OS</option>' +
          state.assets.map((asset) => '<option value="' + asset.id + '">' + htmlEscape(asset.name) + " - " + htmlEscape(asset.criticality) + '</option>').join("");
        el("appointment-work-order").innerHTML = '<option value="">Sem OS vinculada</option>' + state.workOrders.map((wo) => '<option value="' + wo.id + '">' + htmlEscape(wo.title) + '</option>').join("");

        // Auto-suggest Work Order sequence number if not modified by user
        const seqInput = el("work-order-form").querySelector('input[name="sequenceNumber"]');
        if (seqInput && (!seqInput.value || seqInput.getAttribute("data-auto-suggested") === "true" || seqInput.getAttribute("data-auto-suggested") === null)) {
          const nextIndex = state.workOrders.length + 1;
          seqInput.value = "OS-" + String(nextIndex).padStart(3, '0');
          seqInput.setAttribute("data-auto-suggested", "true");
        }
      }

      function renderMetrics() {
        const data = totals();
        const activeOrg = state.organizations.find((org) => org.id === state.activeOrganizationId);
        const suffix = activeOrg ? " · " + activeOrg.name : "";
        el("metrics").innerHTML = [
          ["OS em aberto" + suffix, data.open, "accent"],
          ["Orcamentos" + suffix, state.workOrders.filter((wo) => wo.budget).length, ""],
          ["Receitas" + suffix, money(data.revenue), ""],
          ["Margem" + suffix, money(data.margin), data.margin >= 0 ? "accent" : ""]
        ].map((item) => '<div class="metric"><strong class="' + item[2] + '">' + htmlEscape(item[1]) + '</strong><span>' + item[0] + '</span></div>').join("");
      }

      function renderUserProfile() {
        const name = state.user.configured ? state.user.name : "Perfil não configurado";
        const role = state.user.configured ? state.user.role : "Configurar";
        const tenantCode = state.user.tenantCode || "#00";
        const tenantName = (state.user.tenant && state.user.tenant.name) ? state.user.tenant.name : "Tenant " + tenantCode;

        el("context-technician-name").textContent = name;
        el("context-tenant-name").textContent = tenantName;

        const initials = name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
        const avatarEl = el("user-avatar");
        if (avatarEl) {
          avatarEl.textContent = initials;
          avatarEl.title = name + " (" + role + " " + tenantCode + ")";
        }
        const chipEl = el("profile-chip");
        if (chipEl) chipEl.textContent = role + " " + tenantCode;
        const pageChipEl = el("profile-pwa-role-badge");
        if (pageChipEl) pageChipEl.textContent = role + " " + tenantCode;
        const nameInput = el("profile-user-name-input");
        if (nameInput) nameInput.value = name;
        const roleSelect = el("profile-user-role-select");
        if (roleSelect) roleSelect.value = role;

        loadBranding();
      }

      async function loadBranding() {
        try {
          const tenantParam = new URLSearchParams(location.search).get("tenant") || localStorage.getItem("atlas_field_tenant") || "";
          const queryParams = [];
          if (tenantParam) queryParams.push("tenant=" + encodeURIComponent(tenantParam));
          const queryString = queryParams.length ? "?" + queryParams.join("&") : "";

          const branding = await call("/field/tenant-branding" + queryString);
          if (branding) {
            const emissorNameInput = el("branding-emissor-name-input");
            if (emissorNameInput) emissorNameInput.value = branding.emissorName || "";
            const brandTypeSelect = el("branding-brand-type-select");
            if (brandTypeSelect) brandTypeSelect.value = branding.brandType || "AUTONOMO";
            const logoUrlInput = el("branding-logo-url-input");
            if (logoUrlInput) logoUrlInput.value = branding.logoUrl || "";
            const phoneInput = el("branding-phone-input");
            if (phoneInput) phoneInput.value = branding.phone || "";
            const emailInput = el("branding-email-input");
            if (emailInput) emailInput.value = branding.email || "";
            const addressInput = el("branding-address-input");
            if (addressInput) addressInput.value = branding.address || "";
            const pixKeyInput = el("branding-pix-key-input");
            if (pixKeyInput) pixKeyInput.value = branding.pixKey || "";
            const warrantyTermsTextarea = el("branding-warranty-terms-textarea");
            if (warrantyTermsTextarea) warrantyTermsTextarea.value = branding.warrantyTerms || "";
          }
        } catch (e) {
          console.error("Could not load branding from backend:", e);
        }
      }

      function renderOperationCards() {
        const hasOrganization = Boolean(state.activeOrganizationId);
        const hasWorkOrder = Boolean(activeWorkOrder());
        const cards = [
          { title: "Nova OS", detail: hasOrganization ? "Abrir ordem" : "Requer cliente", icon: "OS", tone: "blue", action: "work-order", enabled: hasOrganization },
          { title: "Orcamento", detail: hasWorkOrder ? "Preencher proposta" : "Requer OS selecionada", icon: "$", tone: "green", action: "budget", enabled: hasWorkOrder },
          { title: "Clientes", detail: "Cadastrar cliente", icon: "CL", tone: "blue", action: "client", enabled: true },
          { title: "Ativos", detail: hasOrganization ? "Cadastrar equipamento" : "Requer cliente", icon: "AT", tone: "blue", action: "admin", enabled: true },
          { title: "Financeiro", detail: "Calculado por OS aprovada", icon: "$", tone: "blue", action: "finance", enabled: true },
          { title: "Assistente IA", detail: hasWorkOrder ? "Usar OS selecionada" : "Requer OS selecionada", icon: "AI", tone: "orange", action: "ai", enabled: hasWorkOrder },
          { title: "Estoque", detail: "Insumos no porta-malas", icon: "PK", tone: "orange", action: "inventory", enabled: true },
          { title: "Agenda", detail: "Calendario e lembretes", icon: "AG", tone: "orange", action: "agenda", enabled: true },
          { title: "Chamados", detail: totals().open + " OS abertas", icon: "!", tone: "orange", action: "orders", enabled: true }
        ];
        el("operation-cards").innerHTML = cards.map((card) =>
          '<button class="op-card ' + card.tone + '" ' + (card.action ? 'data-quick="' + card.action + '"' : "") + (card.enabled ? "" : " disabled") + '><span class="op-icon">' + card.icon + '</span><span><strong>' + card.title + '</strong><br><span>' + card.detail + '</span></span></button>'
        ).join("");
      }

      function renderSmartSlots() {
        const next = state.workOrders.find((wo) => wo.state !== "closed" && wo.state !== "cancelled");
        
        // Find if there is a pinned appointment
        const pinnedApt = state.appointments.find((apt) => apt.pinned);

        let slotsList = [];
        const role = state.user.role || "Técnico";

        if (role === "Financeiro") {
          const t = totals();
          const pendingBudgets = state.workOrders.filter((wo) => !wo.budget && wo.state !== "closed" && wo.state !== "cancelled").length;
          slotsList = [
            [htmlEscape("Faturamento Estimado"), htmlEscape(money(t.revenue))],
            [htmlEscape("Margem Operacional"), htmlEscape(money(t.margin))],
            [htmlEscape("Orçamentos Pendentes"), htmlEscape(pendingBudgets + " ordens aguardando precificação.")],
            [htmlEscape("Financeiro Logado"), htmlEscape(state.user.name || "Não identificado")]
          ];
        } else if (role === "Supervisor") {
          const noTech = state.workOrders.filter((wo) => !wo.technicianName && wo.state !== "closed" && wo.state !== "cancelled").length;
          const slaRisk = state.workOrders.filter((wo) => {
            if (wo.state === "closed" || wo.state === "cancelled" || !wo.dueAt) return false;
            const diff = new Date(wo.dueAt).getTime() - new Date().getTime();
            return diff > 0 && diff < 86400000 * 2; // less than 48 hours
          }).length;
          slotsList = [
            [htmlEscape("SLA em Risco"), htmlEscape(slaRisk + " OS com prazo estourando.")],
            [htmlEscape("OS Sem Técnico"), htmlEscape(noTech + " ordens aguardando técnico.")],
            [htmlEscape("Chamados Abertos"), htmlEscape(totals().open + " OS em aberto no total.")],
            [htmlEscape("Supervisor Logado"), htmlEscape(state.user.name || "Não identificado")]
          ];
        } else {
          // Default to Técnico
          const techWo = state.workOrders.find((wo) => wo.technicianName === state.user.name && wo.state !== "closed" && wo.state !== "cancelled");
          const selectedWo = techWo || next;
          slotsList = [
            [htmlEscape("Sua Próxima OS"), htmlEscape(selectedWo ? selectedWo.title : "Nenhuma OS aberta para você.")],
            [htmlEscape("Técnico Logado"), htmlEscape(state.user.name || "Não identificado")],
            [htmlEscape("Orçamento"), htmlEscape(selectedWo?.budget ? money(selectedWo.budget.amount) : selectedWo ? "Preencha ou gere rascunho IA." : "Crie uma OS primeiro.")],
            [htmlEscape("Evidências"), htmlEscape(selectedWo ? "Anexe notas/fotos/documentos na OS." : "Disponível depois de criar OS.")]
          ];
        }

        const slots = !state.activeOrganizationId
          ? [
              [htmlEscape("1. Cliente"), htmlEscape("Cadastre um cliente em Configurações.")],
              [htmlEscape("2. Ativo"), htmlEscape("Depois cadastre um equipamento para esse cliente.")],
              [htmlEscape("3. OS"), htmlEscape("A ordem de serviço só abre com ativo selecionado.")],
              [htmlEscape("Rastreio"), htmlEscape("Toda OS criada gera evento na timeline enquanto a API estiver ativa.")]
            ]
          : !state.assets.length
            ? [
                [htmlEscape("Cliente ativo"), htmlEscape(activeOrganization()?.name || "Cliente selecionado")],
                [htmlEscape("Ativo pendente"), htmlEscape("Cadastre um equipamento antes de abrir OS.")],
                [htmlEscape("OS bloqueada"), htmlEscape("Sem ativo não há ordem rastreável.")],
                [htmlEscape("Orçamento"), htmlEscape("Disponível somente depois da OS.")]
              ]
            : slotsList;

        if (pinnedApt) {
          const timeStr = dateTimeLabel(pinnedApt.scheduledAt);
          const pinSvg = '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; color: var(--amber); display: inline-block; vertical-align: middle;"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V7.5c0-.83.67-1.5 1.5-1.5h.5a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h.5c.83 0 1.5.67 1.5 1.5v3.26z"></path></svg>';
          
          slots.unshift([
            pinSvg + '<span style="vertical-align: middle; color: var(--amber); font-weight: 800;">Prioridade da Agenda</span>',
            htmlEscape(pinnedApt.title + " (" + timeStr + ")")
          ]);
        }

        el("smart-slots").innerHTML = slots.map((item) => '<div class="slot"><strong>' + item[0] + '</strong><small>' + item[1] + '</small></div>').join("");
      }

      function renderContextAi() {
        const data = totals();
        const wo = activeWorkOrder();
        el("context-ai").innerHTML = [
          ["Orçamento IA", wo ? "Disponível para a OS selecionada. O resultado vira rascunho editável." : "Bloqueado: selecione ou crie uma OS."],
          ["Risco IA", wo ? "Calcula risco usando prioridade, ativo e timeline da OS." : "Bloqueado: a IA precisa de uma timeline."],
          ["Caixa", data.revenue || data.cost ? "Saldo calculado: " + money(data.margin) : "Sem lançamentos aprovados ainda."]
        ].map((item) => '<div class="ai-card"><strong>' + item[0] + '</strong><p>' + item[1] + '</p></div>').join("");
      }

      function renderAgenda() {
        el("agenda-month").value = state.agendaMonth;
        const [year, month] = state.agendaMonth.split("-").map(Number);
        const first = new Date(year, month - 1, 1);
        const start = new Date(first);
        start.setDate(first.getDate() - first.getDay());
        const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const days = weekdays.map((day) => '<div class="calendar-weekday">' + day + '</div>');

        for (let index = 0; index < 42; index += 1) {
          const current = new Date(start);
          current.setDate(start.getDate() + index);
          const iso = current.toISOString().slice(0, 10);
          const aptsCount = state.appointments.filter((item) => item.scheduledAt.slice(0, 10) === iso).length;
          const wosCount = state.workOrders.filter((wo) => wo.dueAt && localDateStr(wo.dueAt) === iso).length;
          const totalCount = aptsCount + wosCount;
          const classes = [
            "calendar-day",
            current.getMonth() === month - 1 ? "" : "muted",
            iso === state.agendaDate ? "selected" : "",
            totalCount > 0 ? "has-items" : ""
          ].filter(Boolean).join(" ");
          
          let countLabel = "";
          if (aptsCount > 0 && wosCount > 0) {
            countLabel = aptsCount + " agend. + " + wosCount + " OS";
          } else if (aptsCount > 0) {
            countLabel = aptsCount + " agendamento(s)";
          } else if (wosCount > 0) {
            countLabel = wosCount + " venc. OS";
          }

          days.push('<button class="' + classes + '" data-agenda-date="' + iso + '"><span class="day-number">' + current.getDate() + '</span><span class="day-count">' + countLabel + '</span></button>');
        }

        el("agenda-calendar").innerHTML = days.join("");
        
        const selectedApts = state.appointments
          .filter((item) => item.scheduledAt.slice(0, 10) === state.agendaDate)
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
          });
          
        const selectedWos = state.workOrders
          .filter((wo) => wo.dueAt && localDateStr(wo.dueAt) === state.agendaDate);

        el("agenda-selected-title").textContent = dateLabel(state.agendaDate);

        let listHtml = "";
        
        if (selectedApts.length === 0 && selectedWos.length === 0) {
          listHtml = '<div class="slot"><strong>Nenhum agendamento neste dia.</strong><small>Preencha o formulário para criar um compromisso rastreável.</small></div>';
        } else {
          // Render appointments first
          if (selectedApts.length > 0) {
            listHtml += '<div style="margin-top: 10px; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft); font-weight: bold;">📅 Compromissos</div>';
            listHtml += selectedApts.map((item) => {
              const statusText = item.status === "scheduled" ? "Agendado" : item.status === "done" ? "Concluído" : "Cancelado";
              const badgeClass = item.status === "scheduled" ? "badge progress" : item.status === "done" ? "badge done" : "badge danger";
              const timeLabel = dateTimeLabel(item.scheduledAt);
              const subTitle = (item.technicianName ? item.technicianName + " · " : "") + (item.location || item.customerName || item.kind);
              const reminderText = item.reminderEnabled ? "Sino: " + item.reminderMinutesBefore + " min antes" : "Sem lembrete";
              const pinIndicator = item.pinned ? '<span class="pinned-indicator" style="margin-right: 6px; color: var(--amber); display: inline-flex; align-items: center; vertical-align: middle;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V7.5c0-.83.67-1.5 1.5-1.5h.5a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h.5c.83 0 1.5.67 1.5 1.5v3.26z"></path></svg></span>' : '';
              const slotPinnedClass = item.pinned ? ' slot-pinned' : '';

              return '<div class="slot slot-clickable' + slotPinnedClass + '" data-appointment-id="' + item.id + '">' +
                '<span style="display: flex; justify-content: space-between; align-items: start; gap: 8px; width: 100%;">' +
                  '<strong style="display: flex; align-items: center;">' + pinIndicator + htmlEscape(timeLabel) + ' - ' + htmlEscape(item.title) + '</strong>' +
                  '<span class="' + badgeClass + '">' + htmlEscape(statusText) + '</span>' +
                '</span>' +
                '<small>' + htmlEscape(subTitle) + '</small>' +
                '<small>' + htmlEscape(reminderText) + '</small>' +
                '<div class="slot-actions">' +
                  '<button class="slot-action-btn" data-action="view" data-appointment-id="' + item.id + '" title="Visualizar" style="color: var(--blue);">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
                  '</button>' +
                  '<button class="slot-action-btn" data-action="edit" data-appointment-id="' + item.id + '" title="Editar" style="color: var(--amber);">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
                  '</button>' +
                  '<button class="slot-action-btn' + (item.pinned ? ' active-pin' : '') + '" data-action="pin" data-appointment-id="' + item.id + '" title="Pinar como prioridade" style="color: var(--amber);">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V7.5c0-.83.67-1.5 1.5-1.5h.5a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h.5c.83 0 1.5.67 1.5 1.5v3.26z"></path></svg>' +
                  '</button>' +
                  '<button class="slot-action-btn" data-action="delete" data-appointment-id="' + item.id + '" title="Deletar" style="color: var(--danger);">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>' +
                  '</button>' +
                '</div>' +
              '</div>';
            }).join("");
          }
          
          // Render due Work Orders
          if (selectedWos.length > 0) {
            listHtml += '<div style="margin-top: 14px; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--amber); font-weight: bold; display: flex; align-items: center; gap: 4px;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Vencimento de Ordem de Serviço (OS)</div>';
            listHtml += selectedWos.map((wo) => {
              const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);
              const asset = state.assets.find((item) => item.id === wo.assetId);
              
              let timeLabel = "Sem prazo";
              if (wo.dueAt) {
                try {
                  const d = new Date(wo.dueAt);
                  const tz = -Math.round(d.getTimezoneOffset() / 60);
                  const tzLabel = tz >= 0 ? "+" + tz : String(tz);
                  timeLabel = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + " (" + tzLabel + " UTC)";
                } catch (e) {}
              }
              
              const statusText = wo.state === "triage" ? "Triagem" : wo.state === "opened" ? "Aberta" : wo.state === "scheduled" ? "Agendada" : wo.state === "visited" ? "Visita Realizada" : wo.state === "budget_draft" ? "Orç. Rascunho" : wo.state === "budget_sent" ? "Orç. Enviado" : wo.state === "budget_rejected" ? "Orç. Recusado" : wo.state === "approved" ? "Aprovada" : wo.state === "in_progress" ? "Execução" : wo.state === "rework" ? "Retrabalho" : wo.state === "pending_acceptance" ? "Aceite Pendente" : wo.state === "accepted" ? "Aceita" : wo.state === "invoiced" ? "Faturada" : wo.state === "warranty_active" ? "Garantia Ativa" : wo.state === "closed" ? "Concluída" : "Cancelada";
              
              let stateTone = "var(--text-soft)";
              if (["closed", "accepted", "invoiced", "warranty_active"].includes(wo.state)) stateTone = "#00f0c0";
              else if (["in_progress", "rework"].includes(wo.state)) stateTone = "#0ea5e9";
              else if (["triage", "opened", "scheduled"].includes(wo.state)) stateTone = "#e2e8f0";
              else if (["budget_sent"].includes(wo.state)) stateTone = "#ffaf26";
              else if (["budget_rejected"].includes(wo.state)) stateTone = "#ff4d4d";
              
              const badgeStyle = 'background: rgba(255,255,255,0.05); color: ' + stateTone + '; border: 1px solid ' + stateTone + '; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;';

              return '<div class="slot slot-clickable" style="border-left: 3px solid var(--amber);" data-wo-link-id="' + wo.id + '">' +
                '<span style="display: flex; justify-content: space-between; align-items: start; gap: 8px; width: 100%;">' +
                  '<strong style="display: flex; align-items: center; color: var(--text); gap: 6px;">⏰ ' + htmlEscape(timeLabel) + ' - ' + htmlEscape(displayName) + '</strong>' +
                  '<span style="' + badgeStyle + '">' + htmlEscape(statusText) + '</span>' +
                '</span>' +
                '<small style="margin-top: 4px; display: block; font-weight: bold; color: var(--text-soft);">' + htmlEscape(wo.title) + '</small>' +
                '<small style="display: block; opacity: 0.85;">Cliente: ' + htmlEscape(activeOrganization()?.name || "") + ' · Ativo: ' + htmlEscape(asset?.name || wo.assetId) + '</small>' +
                '<div style="margin-top: 8px; display: flex; justify-content: flex-end;">' +
                  '<button class="secondary" style="font-size: 11px; padding: 4px 8px; min-height: auto;" data-wo-link-action="' + wo.id + '">Abrir Ordem de Serviço</button>' +
                '</div>' +
              '</div>';
            }).join("");
          }
        }
        
        el("agenda-day-list").innerHTML = listHtml;

        document.querySelectorAll("div.slot-clickable[data-appointment-id]").forEach((slotDiv) => {
          slotDiv.addEventListener("click", (e) => {
            if (e.target.closest(".slot-actions")) {
              return;
            }
            const id = slotDiv.getAttribute("data-appointment-id");
            showAppointmentModal(id);
          });
        });

        document.querySelectorAll("[data-wo-link-id], [data-wo-link-action]").forEach((element) => {
          element.addEventListener("click", () => {
            const woId = element.getAttribute("data-wo-link-id") || element.getAttribute("data-wo-link-action");
            if (woId) {
              state.activeWorkOrderId = woId;
              navigate("orders");
              render();
            }
          });
        });

        document.querySelectorAll(".slot-action-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-appointment-id");
            const action = btn.getAttribute("data-action");
            const appointment = state.appointments.find((apt) => apt.id === id);
            if (!appointment) return;

            if (action === "view") {
              showAppointmentModal(id);
            } else if (action === "edit") {
              startEditAppointment(appointment);
            } else if (action === "pin") {
              togglePinAppointment(appointment);
            } else if (action === "delete") {
              deleteAppointmentWithConfirm(id);
            }
          });
        });

        document.querySelectorAll("[data-agenda-date]").forEach((button) => {
          button.addEventListener("click", () => {
            state.agendaDate = button.getAttribute("data-agenda-date") || state.agendaDate;
            renderAgenda();
          });
        });

        if (!editingAppointmentId) {
          const form = el("appointment-form");
          if (form) {
            let timePart = "";
            if (form.scheduledAt.value && form.scheduledAt.value.includes("T")) {
              timePart = form.scheduledAt.value.split("T")[1];
            } else {
              const now = new Date();
              timePart = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
            }
            form.scheduledAt.value = state.agendaDate + "T" + timePart;
          }
        }
      }

      function filteredOrders() {
        return state.workOrders.filter((wo) => {
          if (state.filter === "open") return ["triage", "opened", "scheduled", "visited", "budget_draft", "budget_sent", "budget_submitted"].includes(wo.state);
          if (state.filter === "progress") return ["approved", "accepted", "in_progress", "rework", "pending_acceptance"].includes(wo.state);
          if (state.filter === "done") return ["invoiced", "warranty_active", "closed"].includes(wo.state);
          
          if (state.filter === "requested") return ["triage", "opened", "scheduled", "requested"].includes(wo.state);
          if (state.filter === "budget_sent") return ["visited", "budget_draft", "budget_sent", "budget_submitted", "budget_rejected"].includes(wo.state);
          if (state.filter === "approved") return ["approved", "accepted"].includes(wo.state);
          if (state.filter === "in_progress") return ["in_progress", "rework", "pending_acceptance"].includes(wo.state);
          if (state.filter === "closed") return ["invoiced", "warranty_active", "closed"].includes(wo.state);
          if (state.filter === "cancelled") return wo.state === "cancelled";
          return true;
        });
      }

      function stateBadge(wo) {
        if (wo.state === "closed" || wo.state === "invoiced") return '<span class="badge done">Concluída</span>';
        if (wo.state === "warranty_active") return '<span class="badge done" style="background: rgba(16, 185, 129, 0.1) !important; color: #10b981 !important; border: 1px solid rgba(16, 185, 129, 0.25) !important;">Garantia Ativa</span>';
        if (wo.state === "approved" || wo.state === "accepted") return '<span class="badge progress" style="background: rgba(0, 240, 192, 0.1) !important; color: #00f0c0 !important; border: 1px solid rgba(0, 240, 192, 0.25) !important;">Aprovada</span>';
        if (wo.state === "in_progress" || wo.state === "rework" || wo.state === "pending_acceptance") return '<span class="badge progress">Execução</span>';
        if (["budget_sent", "budget_submitted", "budget_draft", "visited", "budget_rejected"].includes(wo.state)) return '<span class="badge" style="background: rgba(234, 179, 8, 0.1) !important; color: #eab308 !important; border: 1px solid rgba(234, 179, 8, 0.25) !important;">Negociação</span>';
        if (wo.state === "cancelled") return '<span class="badge done" style="background: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; border: 1px solid rgba(239, 68, 68, 0.25) !important;">Cancelada</span>';
        return '<span class="badge">Pendente</span>';
      }

      async function handleKanbanDrop(workOrderId, targetColId) {
        state.activeWorkOrderId = workOrderId;
        const wo = state.workOrders.find(w => w.id === workOrderId);
        if (!wo) return;
        
        // Exibir os detalhes da OS na barra lateral
        await refreshTimeline();
        render();

        try {
          if (targetColId === "entrada") {
            if (wo.state === "triage") {
              await triggerStageTransition("opened", { notes: "OS triada e aberta formalmente via Kanban." });
              showToast("Transição Efetuada", "OS movida para Aberta.", "success");
            } else {
              showToast("Aviso", "Esta OS já está aberta ou em estágio mais avançado.", "info");
            }
          } else if (targetColId === "diagnostico") {
            if (["triage", "opened"].includes(wo.state)) {
              await triggerStageTransition("scheduled", { notes: "OS agendada para visita in loco via Kanban." });
              showToast("Transição Efetuada", "OS movida para Agendada.", "success");
            } else {
              showToast("Aviso", "Esta OS já passou da fase de diagnóstico ou agendamento.", "info");
            }
          } else if (targetColId === "orcamento") {
            // Verificar se o orçamento foi composto
            const hasAmount = wo.budget && wo.budget.amount > 0;
            if (!hasAmount) {
              showToast("Orçamento Necessário", "Componha os custos e materiais da OS primeiro.", "warning");
              el("submit-budget")?.click();
            } else if (wo.state === "budget_draft" || wo.state === "visited") {
              await triggerStageTransition("budget_sent", { notes: "Orçamento oficial enviado para aprovação via Kanban." });
              showToast("Transição Efetuada", "Orçamento enviado.", "success");
            }
          } else if (targetColId === "aprovado") {
            if (wo.state === "budget_sent") {
              await triggerStageTransition("approved", { notes: "Orçamento aprovado via Kanban." });
              showToast("Transição Efetuada", "OS aprovada para planejamento.", "success");
            } else {
              showToast("Aviso", "A OS precisa estar com orçamento enviado para ser aprovada.", "warning");
            }
          } else if (targetColId === "execucao") {
            if (["approved", "rework"].includes(wo.state)) {
              await triggerStageTransition("in_progress", { notes: "Execução de serviços iniciada via Kanban." });
              showToast("Transição Efetuada", "OS em execução.", "success");
            } else {
              showToast("Aviso", "A OS precisa ser aprovada ou estar em retrabalho para iniciar execução.", "warning");
            }
          } else if (targetColId === "aceite") {
            if (wo.state === "in_progress") {
              if (!wo.laudoFinal) {
                showToast("Laudo Requerido", "Preencha o laudo técnico final para solicitar o aceite.", "warning");
                el("aside-tab-laudo")?.click();
              } else {
                await triggerStageTransition("pending_acceptance", { notes: "Execução concluída. Aguardando aceite formal." });
                showToast("Transição Efetuada", "OS aguardando aceite.", "success");
              }
            } else if (wo.state === "pending_acceptance") {
              showToast("Assinatura Requerida", "Abra a coleta de aceite para assinar.", "info");
              el("approve-budget")?.click();
            }
          } else if (targetColId === "financeiro") {
            if (wo.state === "accepted") {
              el("close-work")?.click();
            } else {
              showToast("Bloqueado", "A OS precisa ter aceite formal do cliente para ser faturada.", "warning");
            }
          } else if (targetColId === "concluido") {
            if (wo.state === "warranty_active") {
              await triggerStageTransition("closed", { notes: "OS operacionalmente encerrada e arquivada." });
              showToast("Sucesso", "OS concluída e arquivada.", "success");
            } else {
              showToast("Bloqueado", "A OS precisa estar com a garantia ativa para ser arquivada/concluída.", "warning");
            }
          }
        } catch (err) {
          showToast("Erro na transição", err.message, "error");
        }
      }

      function renderKanbanBoard() {
        const boardEl = el("work-order-kanban-board");
        if (!boardEl) return;

        const columns = [
          { id: "entrada", name: "Entrada", states: ["triage", "opened"] },
          { id: "diagnostico", name: "Diagnóstico", states: ["scheduled", "visited"] },
          { id: "orcamento", name: "Orçamento", states: ["budget_draft", "budget_sent", "budget_rejected"] },
          { id: "aprovado", name: "Aprovado", states: ["approved"] },
          { id: "execucao", name: "Execução", states: ["in_progress", "rework"] },
          { id: "aceite", name: "Aceite", states: ["pending_acceptance", "accepted"] },
          { id: "financeiro", name: "Financeiro / Garantia", states: ["invoiced", "warranty_active"] },
          { id: "concluido", name: "Concluído", states: ["closed", "cancelled"] }
        ];

        boardEl.innerHTML = columns.map(col => {
          const colOrders = state.workOrders.filter(wo => col.states.includes(wo.state));
          
          const cardsHtml = colOrders.map(wo => {
            const asset = state.assets.find(item => item.id === wo.assetId);
            const isSelected = wo.id === state.activeWorkOrderId ? " selected" : "";
            const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);
            
            // Build mini badges
            const badges = [];
            if (!wo.laudoInicial) {
              badges.push('<span class="mini-badge" style="background: rgba(239, 68, 68, 0.15); color: #ff5a65; border: 1px solid rgba(239, 68, 68, 0.25);">sem laudo</span>');
            }
            if (wo.state === "rework") {
              badges.push('<span class="mini-badge" style="background: rgba(255, 90, 101, 0.15); color: #ff5a65; border: 1px solid rgba(255, 90, 101, 0.25);">retrabalho</span>');
            }
            if (wo.state === "warranty_active") {
              badges.push('<span class="mini-badge" style="background: rgba(40, 215, 120, 0.15); color: #28d778; border: 1px solid rgba(40, 215, 120, 0.25);">garantia ativa</span>');
            }
            if (wo.state === "budget_sent") {
              badges.push('<span class="mini-badge" style="background: rgba(255, 159, 26, 0.15); color: var(--amber); border: 1px solid rgba(255, 159, 26, 0.25);">aguardando retorno</span>');
            }
            if (wo.state === "pending_acceptance") {
              badges.push('<span class="mini-badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.25);">aceite pendente</span>');
            }
            if (wo.budget?.version) {
              badges.push('<span class="mini-badge" style="background: rgba(255, 255, 255, 0.08); color: #fff;">V' + wo.budget.version + '</span>');
            }

            return '<div class="kanban-card' + isSelected + '" draggable="true" data-wo-id="' + wo.id + '">' +
              '<div class="kanban-card-title">' + htmlEscape(displayName) + '</div>' +
              '<div class="kanban-card-info" style="font-weight: bold; color: var(--text);">' + htmlEscape(wo.title) + '</div>' +
              '<div class="kanban-card-info">Cliente: ' + htmlEscape(activeOrganization()?.name || "") + '</div>' +
              '<div class="kanban-badges">' + badges.join("") + '</div>' +
              '</div>';
          }).join("");

          return '<div class="kanban-col" data-col-id="' + col.id + '">' +
            '<div class="kanban-col-header">' +
              '<span>' + col.name + '</span>' +
              '<span class="kanban-col-count">' + colOrders.length + '</span>' +
            '</div>' +
            '<div class="kanban-col-cards">' + cardsHtml + '</div>' +
            '</div>';
        }).join("");

        // Setup Drag & Drop Event Listeners
        document.querySelectorAll(".kanban-card").forEach(card => {
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", card.getAttribute("data-wo-id"));
            card.style.opacity = "0.5";
          });
          card.addEventListener("dragend", () => {
            card.style.opacity = "1";
          });
          card.addEventListener("click", async () => {
            state.activeWorkOrderId = card.getAttribute("data-wo-id");
            await refreshTimeline();
            render();
          });
        });

        document.querySelectorAll(".kanban-col").forEach(col => {
          col.addEventListener("dragover", (e) => {
            e.preventDefault();
            col.classList.add("drag-hover");
          });
          col.addEventListener("dragleave", () => {
            col.classList.remove("drag-hover");
          });
          col.addEventListener("drop", async (e) => {
            e.preventDefault();
            col.classList.remove("drag-hover");
            const workOrderId = e.dataTransfer.getData("text/plain");
            const targetColId = col.getAttribute("data-col-id");
            if (workOrderId && targetColId) {
              await handleKanbanDrop(workOrderId, targetColId);
            }
          });
        });
      }

      function renderWorkOrders() {
        if (state.viewMode === "kanban") {
          el("view-mode-list").style.display = "none";
          el("view-mode-kanban").style.display = "flex";
          el("btn-toggle-kanban").textContent = "📋 Ver Lista";
          renderKanbanBoard();
        } else {
          el("view-mode-list").style.display = "flex";
          el("view-mode-kanban").style.display = "none";
          el("btn-toggle-kanban").textContent = "📋 Ver Kanban";

          el("work-order-list").innerHTML = filteredOrders().map((wo) => {
            const asset = state.assets.find((item) => item.id === wo.assetId);
            const selected = wo.id === state.activeWorkOrderId ? " selected" : "";
            const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);
            
            const formattedDate = formatDueAt(wo.dueAt);
            const dateBlock = wo.dueAt 
              ? '<p style="margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--amber); font-weight: 500;"><svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ' + htmlEscape(formattedDate) + '</p>'
              : '<p style="margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-soft); font-weight: 500;"><svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; opacity: 0.6;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Sem prazo definido</p>';

            return '<button class="order-card' + selected + '" data-wo="' + wo.id + '"><span class="order-head"><strong>' + htmlEscape(displayName) + '</strong>' + stateBadge(wo) + '</span><p>Cliente: ' + htmlEscape(activeOrganization()?.name || "") + '</p><p>Equipamento: ' + htmlEscape(asset?.name || wo.assetId) + '</p>' + dateBlock + '</button>';
          }).join("") || '<div class="slot"><strong>Nenhuma OS encontrada.</strong><small>Use o botao + para criar a primeira ordem.</small></div>';

          document.querySelectorAll("[data-wo]").forEach((row) => {
            row.addEventListener("click", async () => {
              state.activeWorkOrderId = row.getAttribute("data-wo") || "";
              await refreshTimeline();
              render();
            });
          });
        }
      }

      function renderSelectedWorkOrder() {
        const wo = activeWorkOrder();
        const hasWorkOrder = Boolean(wo);
        ["attach-evidence", "diagnosis-agent", "budget-agent", "submit-budget", "approve-budget", "start-work", "close-work", "rework-work", "edit-work-order", "cancel-work-order", "delete-work-order"].forEach((id) => {
          const button = el(id);
          if (button) button.disabled = !hasWorkOrder;
        });
        if (hasWorkOrder) {
          const isDoneOrCancelled = wo.state === "closed" || wo.state === "cancelled";
          if (el("edit-work-order")) el("edit-work-order").disabled = isDoneOrCancelled;
          if (el("cancel-work-order")) el("cancel-work-order").disabled = isDoneOrCancelled;

          // Controlling action buttons visibility based on state
          const submitBudgetBtn = el("submit-budget");
          const approveBudgetBtn = el("approve-budget");
          const startWorkBtn = el("start-work");
          const closeWorkBtn = el("close-work");
          const reworkWorkBtn = el("rework-work");
          
          const setDisplay = (btn, show) => {
            if (btn) btn.style.display = show ? "block" : "none";
          };
          
          setDisplay(submitBudgetBtn, ["triage", "opened", "scheduled", "visited", "budget_draft", "budget_rejected"].includes(wo.state));
          setDisplay(startWorkBtn, ["approved", "rework"].includes(wo.state));
          setDisplay(approveBudgetBtn, ["pending_acceptance"].includes(wo.state));
          setDisplay(reworkWorkBtn, ["pending_acceptance"].includes(wo.state));
          setDisplay(closeWorkBtn, ["accepted", "invoiced", "warranty_active"].includes(wo.state));
        } else {
          ["submit-budget", "approve-budget", "start-work", "close-work", "rework-work"].forEach(id => {
            const btn = el(id);
            if (btn) btn.style.display = "none";
          });
        }
        el("work-order-form").querySelector('button[type="submit"]').disabled = !state.activeOrganizationId;
        if (!wo) {
          el("selected-work-order").innerHTML = state.activeOrganizationId
            ? "Abra uma OS para liberar evidencia, IA, orcamento e execucao. Se nao houver ativo, eu crio um atendimento geral automaticamente."
            : "Cadastre ou selecione um cliente para abrir a primeira OS.";
          el("selected-state").textContent = "Aguardando";
          if (el('view-laudo-btn')) el('view-laudo-btn').disabled = true;
          if (el('share-whatsapp-btn')) el('share-whatsapp-btn').disabled = true;
          if (el('view-recibo-btn')) el('view-recibo-btn').disabled = true;
          const laudoInicialInput = el("laudo-inicial-input");
          if (laudoInicialInput) laudoInicialInput.value = "";
          const laudoFinalInput = el("laudo-final-input");
          if (laudoFinalInput) laudoFinalInput.value = "";
          const laudoGarantiaInput = el("laudo-garantia-input");
          if (laudoGarantiaInput) laudoGarantiaInput.value = "90";
          return;
        }
        const laudoInicialInput = el("laudo-inicial-input");
        if (laudoInicialInput) laudoInicialInput.value = wo.laudoInicial || "";
        const laudoFinalInput = el("laudo-final-input");
        if (laudoFinalInput) laudoFinalInput.value = wo.laudoFinal || "";
        const laudoGarantiaInput = el("laudo-garantia-input");
        if (laudoGarantiaInput) laudoGarantiaInput.value = String(wo.validadeGarantiaDias || 90);

        const materials = (wo.materials || []).map((item) => item.name + " x" + item.quantity + " = " + money(item.totalPrice)).join("<br>");
        el("selected-state").textContent = wo.state;

        // ENABLE LAUDO & WHATSAPP BUTTONS
        const viewLaudoBtn = el('view-laudo-btn');
        const shareWhatsappBtn = el('share-whatsapp-btn');
        if (viewLaudoBtn) viewLaudoBtn.disabled = false;
        if (shareWhatsappBtn) shareWhatsappBtn.disabled = false;
        if (el('view-recibo-btn')) el('view-recibo-btn').disabled = false;

        // PREVIEW STORED PHOTOS IN FORM
        const storedBefore = (wo.evidence || []).find(e => e.type === 'before');
        const storedAfter = (wo.evidence || []).find(e => e.type === 'after');
        if (storedBefore && el('preview-photo-before')) {
          el('preview-photo-before').style.display = 'block';
          el('preview-photo-before').querySelector('img').src = storedBefore.url;
          photoBeforeBase64 = storedBefore.url;
        }
        if (storedAfter && el('preview-photo-after')) {
          el('preview-photo-after').style.display = 'block';
          el('preview-photo-after').querySelector('img').src = storedAfter.url;
          photoAfterBase64 = storedAfter.url;
        }
        const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);

        const org = activeOrganization();
        const clientHtml = org
          ? "<small style='display: block; margin-top: 4px;'>Cliente: <strong>" + htmlEscape(org.name) + "</strong>" + (org.document ? " (" + htmlEscape(org.document) + ")" : "") + "</small>" +
            (org.phone ? "<small style='display: block;'>Telefone: " + htmlEscape(org.phone) + "</small>" : "") +
            (org.address ? "<small style='display: block;'>Endereço: " + htmlEscape(org.address) + "</small>" : "")
          : "<small style='display: block; margin-top: 4px;'>Cliente: não definido</small>";

        function renderFlowTrail(w) {
          const st = w.state;
          const stages = [
            { key: "triage", name: "Triagem" },
            { key: "opened", name: "Aberta" },
            { key: "scheduled", name: "Agendada" },
            { key: "visited", name: "Visita Realizada" },
            { key: "budget_draft", name: "Orç. Rascunho" },
            { key: "budget_sent", name: "Orç. Enviado" },
            { key: "budget_rejected", name: "Orç. Recusado" },
            { key: "approved", name: "Aprovada" },
            { key: "in_progress", name: "Em Execução" },
            { key: "rework", name: "Retrabalho" },
            { key: "pending_acceptance", name: "Aceite Pendente" },
            { key: "accepted", name: "Aceita" },
            { key: "invoiced", name: "Faturada" },
            { key: "warranty_active", name: "Garantia Ativa" },
            { key: "closed", name: "Encerrada" },
            { key: "cancelled", name: "Cancelada" }
          ];

          const events = (state.activeWorkOrderDetails && state.activeWorkOrderDetails.stageEvents) || [];

          return '<div class="flow-trail" style="display:flex; justify-content:flex-start; align-items:center; margin-bottom:14px; font-size:9px; background:var(--bg); padding:8px; border-radius:8px; border:1px solid var(--line); font-weight:bold; overflow-x:auto; gap:6px; max-width:100%; scrollbar-width: none;">' +
            stages.map((s, idx) => {
              const isCurrent = s.key === st;
              const stageEvent = [...events].reverse().find(e => e.to_stage === s.key);
              const isPast = stageEvent !== undefined;
              const isPastOrCurrent = isCurrent || isPast;
              
              let tooltipHtml = "";
              if (isCurrent) {
                tooltipHtml = '<div class="tooltip-popover"><strong>⚡ Etapa Atual</strong><span>A OS encontra-se neste estágio operacional ativo.</span></div>';
              } else if (isPast) {
                const dateStr = new Date(stageEvent.occurred_at || stageEvent.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                tooltipHtml = '<div class="tooltip-popover"><strong>✅ ' + s.name + '</strong>' +
                  '<span>📅 Data: ' + dateStr + '</span>' +
                  '<span>👤 Por: ' + htmlEscape(stageEvent.actor_name || "Sistema") + '</span>' +
                  (stageEvent.notes ? '<span>💬 Obs: ' + htmlEscape(stageEvent.notes) + '</span>' : '') +
                  '</div>';
              } else {
                tooltipHtml = '<div class="tooltip-popover"><strong>⏳ ' + s.name + '</strong><span>Etapa futura do funil operacional (não iniciada).</span></div>';
              }

              const chipIcon = isCurrent ? "⚡" : isPast ? "✅" : "⏳";
              const color = isCurrent ? "var(--amber)" : isPast ? "var(--accent)" : "var(--text-soft)";
              const opacity = isCurrent ? "1" : isPast ? "0.9" : "0.45";
              const border = isCurrent ? "1px solid var(--amber)" : isPast ? "1px solid var(--accent)" : "1px solid rgba(73, 180, 232, 0.15)";
              const bg = isCurrent ? "rgba(255, 159, 26, 0.08)" : isPast ? "rgba(0, 240, 192, 0.04)" : "transparent";
              const arrow = idx < stages.length - 1 ? '<span style="opacity:0.25; font-size:7px;">➔</span>' : '';
              return '<span class="trail-chip" style="color:' + color + '; opacity:' + opacity + '; border:' + border + '; padding:3px 6px; border-radius:4px; background:' + bg + '; white-space:nowrap; cursor:help; position:relative;">' + 
                chipIcon + ' ' + s.name + tooltipHtml + '</span>' + arrow;
            }).join("") +
          '</div>';
        }

        el("selected-work-order").innerHTML =
          renderFlowTrail(wo) +
          "<h4 style='margin:0; font-size: 15px; color: var(--text);'>" + htmlEscape(displayName) + " - " + htmlEscape(wo.title) + "</h4>" +
          "<small class='audit-key' style='display: block; opacity: 0.65; font-size: 11px; margin: 4px 0 8px;'>Chave de auditoria: " + htmlEscape(wo.id) + "</small>" +
          clientHtml +
          "<small style='display: block; margin-top: 4px;'>Técnico: " + htmlEscape(wo.technicianName || "não definido") + "</small>" +
          "<small style='display: block;'>Diagnóstico: " + htmlEscape(wo.diagnosis || "não registrado") + "</small>" +
          "<small style='display: block; margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--line);'>Materiais:<br>" + (materials || "não composto") + "</small>" +
          "<small style='display: block; margin-top: 4px;'>Mão de obra: " + money(wo.laborCost || 0) + "</small>";

        const materialsTotal = (wo.materials || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        const laborTotal = Number(wo.laborCost || 0);
        const amount = Math.round((materialsTotal + laborTotal) * 1.2);
        const form = document.forms["budget-form"];
        if (!form.amount.value && amount > 0) {
          form.materialsTotal.value = String(materialsTotal);
          form.laborTotal.value = String(laborTotal);
          form.durationHours.value = String(wo.estimatedDurationHours || wo.laborHours || "");
          form.amount.value = String(amount);
        }
      }

      function renderFinance() {
        try {
          populateExpenseMonthFilter();
          renderCategoriesGrid();
          const filter = el('expense-month-filter');
          renderExpensesLedger(filter ? filter.value : todayIso.slice(0, 7));
        } catch (err) {
          console.warn("Error rendering finance tab on load:", err);
        }
      }

      function renderAgentCards() {
        el("agent-cards").innerHTML = [
          ["Agente Orçamentista", "Gera composição técnica preliminar com aprovação humana.", "budget"],
          ["Agente Diagnóstico", "Interpreta descrição, evidências e histórico da OS selecionada.", "diagnosis"],
          ["Agente Supervisor", "Sinaliza riscos de SLA, gargalos e pendências.", "risk"]
        ].map((item) => '<button class="ai-card" data-agent="' + item[2] + '"><strong>' + item[0] + '</strong><p>' + item[1] + '</p></button>').join("");
      }

      async function refreshTimeline() {
        if (!state.activeOrganizationId || !state.activeWorkOrderId) {
          el("timeline").innerHTML = '<div class="slot"><strong>Sem OS selecionada.</strong></div>';
          state.activeWorkOrderDetails = null;
          return;
        }
        try {
          const details = await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId));
          state.activeWorkOrderDetails = details;
        } catch (err) {
          console.warn("Erro ao buscar detalhes da OS:", err);
          state.activeWorkOrderDetails = null;
        }
        const data = await call("/timeline?organizationId=" + encodeURIComponent(state.activeOrganizationId) + "&subjectId=" + encodeURIComponent(state.activeWorkOrderId));
        el("timeline").innerHTML = (data.items || []).map((entry) => '<div class="slot"><strong>' + htmlEscape(entry.title) + '</strong><small>' + htmlEscape(entry.eventName) + " - " + htmlEscape(entry.occurredAt) + '</small><small>' + htmlEscape(entry.body || "") + '</small></div>').join("") || '<div class="slot"><strong>Timeline vazia.</strong></div>';
      }

      function requireWorkOrder() {
        if (!state.activeOrganizationId || !state.activeWorkOrderId) throw new Error("Selecione uma OS real antes desta acao.");
      }

      function requireCustomerForWorkOrder() {
        if (!state.activeOrganizationId) throw new Error("Cadastre ou selecione um cliente antes de abrir OS.");
      }

      async function resolveCustomerForWorkOrder() {
        const search = el("work-order-customer-search");
        const typedName = search ? search.value.trim() : "";
        const active = activeOrganization();
        if (!typedName || (active && normalizeSearch(active.name) === normalizeSearch(typedName))) {
          requireCustomerForWorkOrder();
          return;
        }

        const match = customerMatches(typedName)[0];
        if (!match) {
          throw new Error("Cliente nao encontrado. Clique em cadastrar novo cliente antes de abrir a OS.");
        }

        state.activeOrganizationId = match.id;
        state.activeWorkOrderId = "";
        state.assets = (await call("/assets?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
        state.workOrders = (await call("/maintenance/work-orders?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
        state.appointments = (await call("/field/appointments?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
        renderSelectors();
      }

      async function ensureAssetForWorkOrder(title) {
        await resolveCustomerForWorkOrder();
        const selectedAssetId = el("asset-select").value;
        if (selectedAssetId) return selectedAssetId;

        const org = activeOrganization();
        const assetName = title && String(title).trim()
          ? "Atendimento - " + String(title).trim().slice(0, 48)
          : "Atendimento geral";
        const created = await call("/assets", {
          method: "POST",
          body: JSON.stringify({
            organizationId: state.activeOrganizationId,
            name: assetName,
            kind: "facility",
            criticality: "medium",
            location: org?.address || undefined,
            description: "Criado automaticamente ao abrir OS para reduzir atrito operacional."
          })
        });

        state.assets = [created.asset, ...state.assets];
        renderSelectors();
        el("asset-select").value = created.asset.id;
        showToast("Ativo criado", "Usei um atendimento geral para liberar a OS.", "success");
        return created.asset.id;
      }

      function navigate(tab) {
        document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
        document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
        el(tab).classList.add("active");
        el("quick-sheet").classList.remove("open");
      }

      function setupDraggableFab() {
        const fab = el("fab");
        const sheet = el("quick-sheet");
        const margin = 12;
        let dragging = false;
        let moved = false;
        let pointerId = null;
        let offsetX = 0;
        let offsetY = 0;

        function clamp(value, min, max) {
          return Math.min(Math.max(value, min), max);
        }

        function moveTo(clientX, clientY) {
          const width = fab.offsetWidth;
          const height = fab.offsetHeight;
          const left = clamp(clientX - offsetX, margin, window.innerWidth - width - margin);
          const top = clamp(clientY - offsetY, margin, window.innerHeight - height - margin);
          fab.style.left = left + "px";
          fab.style.top = top + "px";
          fab.style.right = "auto";
          fab.style.bottom = "auto";
        }

        function keepInsideViewport() {
          if (!fab.style.left || !fab.style.top) return;
          moveTo(Number.parseFloat(fab.style.left) + offsetX, Number.parseFloat(fab.style.top) + offsetY);
        }

        fab.addEventListener("pointerdown", (event) => {
          pointerId = event.pointerId;
          dragging = true;
          moved = false;
          const rect = fab.getBoundingClientRect();
          offsetX = event.clientX - rect.left;
          offsetY = event.clientY - rect.top;
          fab.setPointerCapture(event.pointerId);
        });

        fab.addEventListener("pointermove", (event) => {
          if (!dragging || event.pointerId !== pointerId) return;
          moved = true;
          sheet.classList.remove("open");
          moveTo(event.clientX, event.clientY);
        });

        function finish(event) {
          if (!dragging || event.pointerId !== pointerId) return;
          dragging = false;
          pointerId = null;
          if (fab.hasPointerCapture(event.pointerId)) fab.releasePointerCapture(event.pointerId);
          if (!moved) sheet.classList.toggle("open");
        }

        fab.addEventListener("pointerup", finish);
        fab.addEventListener("pointercancel", finish);
        window.addEventListener("resize", keepInsideViewport);
      }

      document.addEventListener("click", async (event) => {
        // Backdrop click to close modals
        if (event.target.classList.contains("modal-overlay")) {
          event.target.classList.remove("open");
          if (event.target.id === "work-order-modal") {
            resetWorkOrderForm();
          }
        }

        // Close button click to close modals
        const closeBtn = event.target.closest('[id^="btn-close-"], #modal-close-btn, #confirm-modal-cancel-btn');
        if (closeBtn) {
          const modal = closeBtn.closest(".modal-overlay");
          if (modal) {
            modal.classList.remove("open");
            if (modal.id === "work-order-modal") {
              resetWorkOrderForm();
            }
          }
        }

        const tab = event.target.closest("[data-tab]");
        if (tab) navigate(tab.dataset.tab);

        const quick = event.target.closest("[data-quick]");
        if (quick) {
          const action = quick.dataset.quick;
          if (action === "work-order") {
            navigate("orders");
            resetWorkOrderForm();
            const modalTitle = el('work-order-modal-title');
            if (modalTitle) modalTitle.textContent = "🛠 Criar Nova Ordem de Serviço";
            const submitBtn = el('work-order-submit-btn');
            if (submitBtn) submitBtn.textContent = "Abrir OS";
            const modal = el('work-order-modal');
            if (modal) modal.classList.add('open');
          }
          if (action === "budget") { navigate("orders"); document.forms["budget-form"].scrollIntoView({ behavior: "smooth", block: "center" }); }
          if (action === "client" || action === "admin") navigate("admin");
          if (action === "finance") navigate("finance");
          if (action === "inventory") navigate("inventory");
          if (action === "ai") navigate("ai");
          if (action === "agenda") navigate("agenda");
        }

        const agent = event.target.closest("[data-agent]");
        if (agent) {
          requireWorkOrder();
          if (agent.dataset.agent === "budget") await runBudgetAgent();
          if (agent.dataset.agent === "diagnosis") await runDiagnosisAgent();
          if (agent.dataset.agent === "risk") {
            const data = await call("/ai/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/risk", { method: "POST", body: JSON.stringify({ organizationId: state.activeOrganizationId }) });
            el("agent-output").textContent = JSON.stringify(data, null, 2);
          }
        }
      });

      el("btn-toggle-kanban")?.addEventListener("click", () => {
        state.viewMode = state.viewMode === "kanban" ? "list" : "kanban";
        localStorage.setItem("atlas_view_mode", state.viewMode);
        renderWorkOrders();
      });

      document.querySelectorAll("[data-filter]").forEach((button) => {
        button.addEventListener("click", () => {
          state.filter = button.dataset.filter;
          document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
          renderWorkOrders();
        });
      });

      el("agenda-month").addEventListener("change", (event) => {
        state.agendaMonth = event.target.value || state.agendaMonth;
        state.agendaDate = state.agendaMonth + "-01";
        renderAgenda();
      });

      el("agenda-today").addEventListener("click", () => {
        state.agendaMonth = todayIso.slice(0, 7);
        state.agendaDate = todayIso;
        renderAgenda();
      });

      setupDraggableFab();

      el("user-avatar").addEventListener("click", () => navigate("profile"));

      el("profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          const tenantParam = new URLSearchParams(location.search).get("tenant") || localStorage.getItem("atlas_field_tenant") || "";
          const emailParam = new URLSearchParams(location.search).get("email") || localStorage.getItem("atlas_field_email") || "";
          const queryParams = [];
          if (tenantParam) queryParams.push("tenant=" + encodeURIComponent(tenantParam));
          if (emailParam) queryParams.push("email=" + encodeURIComponent(emailParam));
          const queryString = queryParams.length ? "?" + queryParams.join("&") : "";

          const profile = await call("/field/profile" + queryString, {
            method: "POST",
            body: JSON.stringify({ name: data.userName, role: data.userRole })
          });
          state.user = profile;
          renderUserProfile();
          renderSmartSlots();
          showToast("Perfil atualizado", "Informações salvas com sucesso.", "success");
        } catch (error) {
          showToast("Erro", "Erro ao salvar perfil no servidor: " + error.message, "error");
        }
      });

      el("branding-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          const tenantParam = new URLSearchParams(location.search).get("tenant") || localStorage.getItem("atlas_field_tenant") || "";
          const queryParams = [];
          if (tenantParam) queryParams.push("tenant=" + encodeURIComponent(tenantParam));
          const queryString = queryParams.length ? "?" + queryParams.join("&") : "";

          await call("/field/tenant-branding" + queryString, {
            method: "POST",
            body: JSON.stringify({
              emissorName: data.emissorName,
              brandType: data.brandType,
              logoUrl: data.logoUrl,
              phone: data.phone,
              email: data.email,
              address: data.address,
              pixKey: data.pixKey,
              warrantyTerms: data.warrantyTerms
            })
          });
          showToast("Branding atualizado", "Identidade do recibo salva com sucesso.", "success");
        } catch (error) {
          showToast("Erro", "Erro ao salvar identidade de recibo: " + error.message, "error");
        }
      });

      el("organization-select").addEventListener("change", async (event) => {
        state.activeOrganizationId = event.target.value;
        state.activeWorkOrderId = "";
        await load();
      });

      el("active-client-select").addEventListener("change", async (event) => {
        state.activeOrganizationId = event.target.value;
        state.activeWorkOrderId = "";
        await load();
      });

      el("work-order-organization-select").addEventListener("change", async (event) => {
        state.activeOrganizationId = event.target.value;
        state.activeWorkOrderId = "";
        resetWorkOrderForm();
        await load();
        updateWorkOrderCustomerFields();
      });

      el("work-order-customer-search").addEventListener("input", (event) => {
        renderCustomerSuggestions(event.target.value);
      });

      el("work-order-customer-search").addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const value = event.currentTarget.value.trim();
        const matches = customerMatches(value);
        if (matches[0]) {
          await selectWorkOrderCustomer(matches[0].id);
          return;
        }
        await offerCreateCustomerFromWorkOrder(value);
      });

      el("work-order-customer-search").addEventListener("blur", (event) => {
        window.setTimeout(() => {
          hideCustomerSuggestions();
        }, 180);
      });

      el("customer-suggestions").addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      el("customer-suggestions").addEventListener("click", async (event) => {
        const customerButton = event.target.closest("[data-customer-id]");
        if (customerButton) {
          await selectWorkOrderCustomer(customerButton.dataset.customerId);
          return;
        }
        const createButton = event.target.closest("[data-create-customer]");
        if (createButton) {
          await offerCreateCustomerFromWorkOrder(el("work-order-customer-search").value);
        }
      });

      el("organization-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        data.monthlyContractValue = asNumber(data.monthlyContractValue) || 0;
        data.targetSla = asNumber(data.targetSla) || 0;
        data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 6);
        const created = await call("/organizations", { method: "POST", body: JSON.stringify(data) });
        state.activeOrganizationId = created.organization.id;
        form.reset();
        await load();
        if (pendingWorkOrderCustomerName) {
          pendingWorkOrderCustomerName = "";
          navigate("orders");
          updateWorkOrderCustomerFields();
          el("work-order-form").scrollIntoView({ behavior: "smooth", block: "center" });
          showToast("Cliente cadastrado", "Cliente selecionado na nova ordem de servico.", "success");
          return;
        }
      });

      el("asset-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        data.organizationId = state.activeOrganizationId;
        await call("/assets", { method: "POST", body: JSON.stringify(data) });
        form.reset();
        await load();
      });

      function renderFormMaterials() {
        const tbody = el("materials-list-body");
        if (!tbody) return;
        tbody.innerHTML = (state.formMaterials || []).map((item, index) => {
          return '<tr>' +
            '<td style="padding: 8px; border-bottom: 1px solid var(--line);">' + htmlEscape(item.name) + '</td>' +
            '<td style="padding: 8px; border-bottom: 1px solid var(--line); text-align: right;">' + Number(item.quantity || 0).toLocaleString('pt-BR') + '</td>' +
            '<td style="padding: 8px; border-bottom: 1px solid var(--line); text-align: right;">' + money(item.unitPrice) + '</td>' +
            '<td style="padding: 8px; border-bottom: 1px solid var(--line); text-align: right;">' + money(item.totalPrice) + '</td>' +
            '<td style="padding: 8px; border-bottom: 1px solid var(--line); text-align: center;">' +
              '<button type="button" class="delete-mat" data-index="' + index + '" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 14px; padding: 4px;">🗑️</button>' +
            '</td>' +
          '</tr>';
        }).join("");

        // Update sum
        const total = (state.formMaterials || []).reduce((sum, item) => sum + item.totalPrice, 0);
        el("materials-total-sum").textContent = money(total);

        // Bind delete buttons
        tbody.querySelectorAll(".delete-mat").forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = Number(btn.getAttribute("data-index"));
            state.formMaterials.splice(index, 1);
            renderFormMaterials();
          });
        });
      }

      // Bind add material button
      el("add-material-btn").addEventListener("click", () => {
        const nameInput = el("mat-name");
        const qtyInput = el("mat-qty");
        const priceInput = el("mat-price");

        const name = nameInput.value.trim();
        const qty = Number(qtyInput.value) || 1;
        const price = Number(priceInput.value) || 0;

        if (!name) {
          showToast("Erro", "Nome do material é obrigatório", "error");
          return;
        }

        state.formMaterials.push({
          name: name,
          quantity: qty,
          unitPrice: price,
          totalPrice: qty * price
        });

        nameInput.value = "";
        qtyInput.value = "";
        priceInput.value = "";

        renderFormMaterials();
      });

      // Clear auto-suggest flag when sequenceNumber is manually edited
      const seqInput = el("work-order-form").querySelector('input[name="sequenceNumber"]');
      if (seqInput) {
        seqInput.addEventListener("input", () => {
          seqInput.setAttribute("data-auto-suggested", "false");
        });
      }


      function setModalMode(mode) {
        const modal = el("work-order-modal");
        if (!modal) return;
        const layout = el("wo-modal-layout") || modal.querySelector(".orders-layout");
        if (layout) {
          layout.id = "wo-modal-layout";
        }
        const woForm = el("work-order-form");
        const budgetForm = el("budget-form");
        
        const photosDiv = woForm.querySelector("div[style*='grid-template-columns']");
        const estimatedDurationLabel = woForm.querySelector("input[name='estimatedDurationHours']")?.closest("label");
        const laborRateLabel = woForm.querySelector("input[name='laborRate']")?.closest(".inline") || woForm.querySelector("input[name='laborRate']")?.closest("label");
        const diagnosisLabel = woForm.querySelector("textarea[name='diagnosis']")?.closest("label");
        const materialsDiv = woForm.querySelector(".materials-builder");
        
        if (photosDiv) photosDiv.classList.add("photos-section");
        if (materialsDiv) materialsDiv.classList.add("materials-section");
        if (estimatedDurationLabel) estimatedDurationLabel.classList.add("duration-section");
        if (laborRateLabel) laborRateLabel.classList.add("labor-section");
        if (diagnosisLabel) diagnosisLabel.classList.add("diagnosis-section");
        
        const materialsBuilder = woForm.querySelector(".materials-section") || budgetForm.querySelector(".materials-section");
        
        if (mode === "create" || mode === "edit") {
          if (layout) layout.style.gridTemplateColumns = "1fr";
          woForm.style.display = "block";
          budgetForm.style.display = "none";
          
          if (materialsBuilder && woForm) {
            const inlineSection = woForm.querySelector(".labor-section") || woForm.querySelector("#work-order-form-actions");
            woForm.insertBefore(materialsBuilder, inlineSection);
          }
          
          if (photosDiv) photosDiv.style.display = "none";
          if (materialsDiv) materialsDiv.style.display = "none";
          if (estimatedDurationLabel) estimatedDurationLabel.style.display = "none";
          if (laborRateLabel) laborRateLabel.style.display = "none";
          if (diagnosisLabel) diagnosisLabel.style.display = "none";
        } else if (mode === "budget") {
          if (layout) layout.style.gridTemplateColumns = "1fr";
          woForm.style.display = "none";
          budgetForm.style.display = "block";
          
          let budgetMaterialsContainer = el("budget-materials-container");
          if (!budgetMaterialsContainer) {
            budgetMaterialsContainer = document.createElement("div");
            budgetMaterialsContainer.id = "budget-materials-container";
            budgetForm.insertBefore(budgetMaterialsContainer, budgetForm.firstChild);
          }
          
          if (materialsBuilder) {
            budgetMaterialsContainer.appendChild(materialsBuilder);
            materialsBuilder.style.display = "block";
          }
        }
      }

      function startEditWorkOrder(wo) {
        if (!wo) return;
        editingWorkOrderId = wo.id;
        const form = el("work-order-form");
        const modalTitle = el('work-order-modal-title');
        if (modalTitle) modalTitle.textContent = "🛠 Editar Ordem de Serviço";
        else {
          const h3 = form.querySelector('.panel-title h3');
          if (h3) h3.textContent = "Editar ordem de serviço";
        }
        el("work-order-submit-btn").textContent = "Salvar Alterações";
        el("work-order-cancel-btn").style.display = "block";
        
        form.querySelector('[name="sequenceNumber"]').value = wo.sequenceNumber || "";
        el("asset-select").value = wo.assetId;
        form.querySelector('[name="title"]').value = wo.title || "";
        form.querySelector('[name="description"]').value = wo.description || "";
        form.querySelector('[name="technicianName"]').value = wo.technicianName || "";
        form.querySelector('[name="priority"]').value = wo.priority || "normal";
        
        if (wo.dueAt) {
          const d = new Date(wo.dueAt);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          form.querySelector('[name="dueAt"]').value = year + "-" + month + "-" + day + "T" + hours + ":" + minutes;
        } else {
          form.querySelector('[name="dueAt"]').value = "";
        }
        
        form.querySelector('[name="estimatedDurationHours"]').value = wo.estimatedDurationHours !== undefined && wo.estimatedDurationHours !== null ? wo.estimatedDurationHours : "";
        form.querySelector('[name="laborRate"]').value = wo.laborRate !== undefined && wo.laborRate !== null ? wo.laborRate : "";
        form.querySelector('[name="laborHours"]').value = wo.laborHours !== undefined && wo.laborHours !== null ? wo.laborHours : "";
        form.querySelector('[name="diagnosis"]').value = wo.diagnosis || "";
        
        state.formMaterials = JSON.parse(JSON.stringify(wo.materials || []));
        renderFormMaterials();
        
        setModalMode("edit");
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function resetWorkOrderForm() {
        editingWorkOrderId = null;
        const form = el("work-order-form");
        form.reset();
        const modalTitle = el('work-order-modal-title');
        if (modalTitle) modalTitle.textContent = "🛠 Criar Nova Ordem de Serviço";
        else {
          const h3 = form.querySelector('.panel-title h3');
          if (h3) h3.textContent = "Nova ordem de serviço";
        }
        el("work-order-submit-btn").textContent = "Abrir OS";
        el("work-order-cancel-btn").style.display = "none";
        state.formMaterials = [];
        renderFormMaterials();
        renderSelectors();
        setModalMode("create");
      }

      // ANTES / DEPOIS LIVE PREVIEWS (IN LAUDO TAB)
      let laudoPhotoBeforeBase64 = "";
      let laudoPhotoAfterBase64 = "";

      el('laudo-photo-before')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          laudoPhotoBeforeBase64 = evt.target.result;
          const container = el('laudo-preview-before');
          if (container) {
            container.style.display = 'block';
            container.querySelector('img').src = laudoPhotoBeforeBase64;
          }
        };
        reader.readAsDataURL(file);
      });

      el('laudo-photo-after')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          laudoPhotoAfterBase64 = evt.target.result;
          const container = el('laudo-preview-after');
          if (container) {
            container.style.display = 'block';
            container.querySelector('img').src = laudoPhotoAfterBase64;
          }
        };
        reader.readAsDataURL(file);
      });

      el("work-order-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        
        try {
          const assetId = await ensureAssetForWorkOrder(data.title);
          
          let payload;
          if (editingWorkOrderId) {
            const wo = activeWorkOrder() || {};
            payload = {
              organizationId: state.activeOrganizationId,
              assetId,
              title: data.title,
              description: data.description,
              technicianName: data.technicianName,
              priority: data.priority,
              dueAt: data.dueAt ? new Date(String(data.dueAt)).toISOString() : undefined,
              sequenceNumber: data.sequenceNumber,
              // Retain technical, budget, and evidence fields without changes
              materials: wo.materials || [],
              evidence: wo.evidence || [],
              diagnosis: wo.diagnosis,
              laborHours: wo.laborHours,
              laborRate: wo.laborRate,
              estimatedDurationHours: wo.estimatedDurationHours
            };
          } else {
            payload = {
              organizationId: state.activeOrganizationId,
              assetId,
              title: data.title,
              description: data.description,
              technicianName: data.technicianName,
              priority: data.priority,
              dueAt: data.dueAt ? new Date(String(data.dueAt)).toISOString() : undefined,
              sequenceNumber: data.sequenceNumber,
              materials: [],
              evidence: [],
              diagnosis: "",
              laborHours: null,
              laborRate: null,
              estimatedDurationHours: null
            };
          }

          if (editingWorkOrderId) {
            await call("/maintenance/work-orders/" + encodeURIComponent(editingWorkOrderId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
              method: "PATCH",
              body: JSON.stringify(payload)
            });
            showToast("Sucesso", "Ordem de serviço atualizada com sucesso.");
          } else {
            const created = await call("/maintenance/work-orders", {
              method: "POST",
              body: JSON.stringify(payload)
            });
            state.activeWorkOrderId = created.workOrder.id;
            showToast("Sucesso", "Ordem de serviço criada com sucesso.");
          }

          // Close work order modal on successful submit
          el('work-order-modal')?.classList.remove('open');
          
          // Reset photos
          photoBeforeBase64 = "";
          photoAfterBase64 = "";
          const p1 = el('preview-photo-before');
          const p2 = el('preview-photo-after');
          if (p1) p1.style.display = 'none';
          if (p2) p2.style.display = 'none';

          resetWorkOrderForm();
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao salvar ordem de serviço: " + error.message, "error");
        }
      });

      // State for appointment editing and modal
      let editingAppointmentId = null;
      let selectedAppointmentIdForModal = null;

      // Toast notification helper
      function showToast(title, message, type = "success") {
        const container = el("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast";
        
        let icon = "🔔";
        if (type === "error") {
          icon = "❌";
        } else if (type === "warning") {
          icon = "⚠️";
        }

        toast.innerHTML = 
          '<span style="font-size: 16px;">' + icon + '</span>' +
          '<div style="display: grid; gap: 2px;">' +
            '<strong style="font-size: 13px;">' + htmlEscape(title) + '</strong>' +
            '<span style="font-size: 12px; color: var(--text-soft);">' + htmlEscape(message) + '</span>' +
          '</div>';
        container.appendChild(toast);

        setTimeout(() => {
          toast.classList.add("fade-out");
          toast.addEventListener("animationend", () => {
            toast.remove();
          });
        }, 5000);
      }

      // Synthesized sound chime using Web Audio API
      function playChime() {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(293.66, audioCtx.currentTime); // D4
          osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15); // A4

          gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 0.8);
          osc2.stop(audioCtx.currentTime + 0.8);
        } catch (e) {
          console.error("Audio Context error:", e);
        }
      }

      // Native notification requests removed to use elegant PWA glassmorphism toasts

      // Check reminders scheduler loop
      const triggeredReminders = new Set();
      try {
        const stored = localStorage.getItem("atlas_triggered_reminders");
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            list.forEach(id => triggeredReminders.add(id));
          }
        }
      } catch (e) {
        console.error("Failed to parse triggered reminders", e);
      }

      function saveTriggeredReminders() {
        try {
          localStorage.setItem("atlas_triggered_reminders", JSON.stringify(Array.from(triggeredReminders)));
        } catch (e) {
          console.error("Failed to save triggered reminders", e);
        }
      }

      function checkReminders() {
        if (!state.appointments || state.appointments.length === 0) return;

        const now = new Date();
        const nowMs = now.getTime();

        state.appointments.forEach((apt) => {
          if (!apt.reminderEnabled || apt.status !== "scheduled") return;
          if (!apt.reminderAt) return;

          const reminderKey = apt.id + "_" + apt.reminderAt;
          if (triggeredReminders.has(reminderKey)) return;

          const reminderTimeMs = new Date(apt.reminderAt).getTime();
          const appointmentTimeMs = new Date(apt.scheduledAt).getTime();

          // Trigger if current time has passed reminder time but appointment is not older than 5 mins
          if (nowMs >= reminderTimeMs && nowMs <= appointmentTimeMs + 300_000) {
            triggeredReminders.add(reminderKey);
            saveTriggeredReminders();

            playChime();
            showToast("Lembrete: " + apt.title, "Agendado para " + dateTimeLabel(apt.scheduledAt));
          }
        });
      }

      setInterval(checkReminders, 10000);
      setTimeout(checkReminders, 2000);

      // Periodically sync appointments in the background (every 30 seconds)
      setInterval(() => {
        if (state.activeOrganizationId) {
          load().catch((err) => console.error("Periodic load failed:", err));
        }
      }, 30000);

      // Modal functions
      function showAppointmentModal(appointmentId) {
        const appointment = state.appointments.find((apt) => apt.id === appointmentId);
        if (!appointment) return;

        selectedAppointmentIdForModal = appointmentId;
        el("modal-title").textContent = appointment.title;

        const badge = el("modal-status-badge");
        badge.textContent = appointment.status === "scheduled" ? "Agendado" : appointment.status === "done" ? "Concluído" : "Cancelado";
        
        badge.className = "badge";
        if (appointment.status === "scheduled") {
          badge.classList.add("progress");
        } else if (appointment.status === "done") {
          badge.classList.add("done");
        } else if (appointment.status === "cancelled") {
          badge.classList.add("danger");
        }

        const dateStr = dateTimeLabel(appointment.scheduledAt);
        const endDt = new Date(new Date(appointment.scheduledAt).getTime() + (appointment.durationMinutes || 60) * 60_000);
        const endTimeStr = endDt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        
        let detailsHtml = 
          '<div class="modal-field">' +
            '<span>Título</span>' +
            '<strong>' + htmlEscape(appointment.title) + '</strong>' +
          '</div>' +
          '<div class="modal-field">' +
            '<span>Horário</span>' +
            '<strong>' + dateStr + ' - ' + endTimeStr + ' (' + (appointment.durationMinutes || 60) + ' min)</strong>' +
          '</div>' +
          '<div class="modal-field">' +
            '<span>Tipo</span>' +
            '<strong>' + htmlEscape(appointment.kind === "visit" ? "Visita" : appointment.kind === "call" ? "Ligação" : appointment.kind === "follow_up" ? "Retorno" : "Administrativo") + '</strong>' +
          '</div>';

        if (appointment.technicianName) {
          detailsHtml += 
            '<div class="modal-field">' +
              '<span>Técnico</span>' +
              '<strong>' + htmlEscape(appointment.technicianName) + '</strong>' +
            '</div>';
        }
        if (appointment.customerName) {
          detailsHtml += 
            '<div class="modal-field">' +
              '<span>Cliente</span>' +
              '<strong>' + htmlEscape(appointment.customerName) + '</strong>' +
            '</div>';
        }
        if (appointment.location) {
          detailsHtml += 
            '<div class="modal-field">' +
              '<span>Localização/Endereço</span>' +
              '<strong>' + htmlEscape(appointment.location) + '</strong>' +
            '</div>';
        }
        if (appointment.notes) {
          detailsHtml += 
            '<div class="modal-field">' +
              '<span>Notas/Observações</span>' +
              '<strong>' + htmlEscape(appointment.notes) + '</strong>' +
            '</div>';
        }
        if (appointment.workOrderId) {
          const wo = state.workOrders.find((w) => w.id === appointment.workOrderId);
          detailsHtml += 
            '<div class="modal-field">' +
              '<span>OS Relacionada</span>' +
              '<strong>' + (wo ? htmlEscape(wo.title) : appointment.workOrderId) + '</strong>' +
            '</div>';
        }
        detailsHtml += 
          '<div class="modal-field">' +
            '<span>Lembrete (Sino)</span>' +
            '<strong>' + (appointment.reminderEnabled ? ("Ativo (" + (appointment.reminderMinutesBefore || 30) + " min antes)") : "Inativo") + '</strong>' +
          '</div>';

        el("modal-details-content").innerHTML = detailsHtml;
        const modal = el("appointment-modal");
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
      }

      function closeAppointmentModal() {
        const modal = el("appointment-modal");
        if (document.activeElement && modal.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        selectedAppointmentIdForModal = null;
      }

      el("modal-close-btn").addEventListener("click", closeAppointmentModal);
      el("appointment-modal").addEventListener("click", (e) => {
        if (e.target === el("appointment-modal")) {
          closeAppointmentModal();
        }
      });

      el("modal-edit-btn").addEventListener("click", () => {
        const appointmentId = selectedAppointmentIdForModal;
        const appointment = state.appointments.find((apt) => apt.id === appointmentId);
        if (!appointment) return;

        closeAppointmentModal();
        startEditAppointment(appointment);
      });

      function showConfirm(title, message) {
        return new Promise((resolve) => {
          const modal = el("confirm-modal");
          el("confirm-modal-title").textContent = title;
          el("confirm-modal-message").textContent = message;

          const handleCancel = () => {
            if (document.activeElement && modal.contains(document.activeElement)) {
              document.activeElement.blur();
            }
            modal.classList.remove("open");
            modal.setAttribute("aria-hidden", "true");
            cleanup();
            resolve(false);
          };

          const handleOk = () => {
            if (document.activeElement && modal.contains(document.activeElement)) {
              document.activeElement.blur();
            }
            modal.classList.remove("open");
            modal.setAttribute("aria-hidden", "true");
            cleanup();
            resolve(true);
          };

          const cleanup = () => {
            el("confirm-modal-cancel-btn").removeEventListener("click", handleCancel);
            el("confirm-modal-ok-btn").removeEventListener("click", handleOk);
          };

          el("confirm-modal-cancel-btn").addEventListener("click", handleCancel);
          el("confirm-modal-ok-btn").addEventListener("click", handleOk);

          modal.classList.add("open");
          modal.setAttribute("aria-hidden", "false");
        });
      }

      async function deleteAppointmentWithConfirm(id) {
        const ok = await showConfirm("Excluir Agendamento", "Deseja realmente excluir este agendamento?");
        if (!ok) return;

        try {
          await call("/field/appointments/" + encodeURIComponent(id) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
            method: "DELETE"
          });
          showToast("Sucesso", "Agendamento excluído com sucesso.");
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao excluir agendamento: " + error.message, "error");
        }
      }

      async function togglePinAppointment(appointment) {
        const newPinned = !appointment.pinned;
        try {
          await call("/field/appointments/" + encodeURIComponent(appointment.id) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
            method: "PATCH",
            body: JSON.stringify({ pinned: newPinned })
          });
          showToast("Sucesso", newPinned ? "Agendamento fixado como prioridade." : "Agendamento desfixado.");
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao alterar prioridade: " + error.message, "error");
        }
      }

      el("modal-delete-btn").addEventListener("click", async () => {
        const appointmentId = selectedAppointmentIdForModal;
        if (!appointmentId) return;

        const ok = await showConfirm("Excluir Agendamento", "Deseja realmente excluir este agendamento?");
        if (!ok) return;

        try {
          await call("/field/appointments/" + encodeURIComponent(appointmentId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
            method: "DELETE"
          });
          showToast("Sucesso", "Agendamento excluído com sucesso.");
          closeAppointmentModal();
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao excluir agendamento: " + error.message, "error");
        }
      });

      function startEditAppointment(appointment) {
        editingAppointmentId = appointment.id;
        
        const form = el("appointment-form");
        form.title.value = appointment.title || "";
        
        const date = new Date(appointment.scheduledAt);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        form.scheduledAt.value = localISOTime;

        form.durationMinutes.value = appointment.durationMinutes || 60;
        form.kind.value = appointment.kind || "visit";
        el("appointment-work-order").value = appointment.workOrderId || "";
        form.technicianName.value = appointment.technicianName || "";
        form.customerName.value = appointment.customerName || "";
        form.location.value = appointment.location || "";
        form.notes.value = appointment.notes || "";
        form.reminderEnabled.checked = Boolean(appointment.reminderEnabled);
        form.reminderMinutesBefore.value = appointment.reminderMinutesBefore || 30;
        form.status.value = appointment.status || "scheduled";

        el("appointment-form-title").textContent = "Editar agendamento";
        el("appointment-submit-btn").textContent = "Salvar Alterações";
        el("appointment-status-container").style.display = "block";
        el("appointment-cancel-btn").style.display = "inline-block";

        form.scrollIntoView({ behavior: "smooth", block: "center" });
        form.title.focus();
      }

      function resetAppointmentForm() {
        editingAppointmentId = null;
        const form = el("appointment-form");
        form.reset();
        
        form.reminderEnabled.checked = true;
        form.reminderMinutesBefore.value = "30";
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        form.scheduledAt.value = state.agendaDate + "T" + hours + ":" + minutes;
        
        el("appointment-form-title").textContent = "Novo agendamento";
        el("appointment-submit-btn").textContent = "Agendar";
        el("appointment-status-container").style.display = "none";
        el("appointment-cancel-btn").style.display = "none";
      }

      el("appointment-cancel-btn").addEventListener("click", resetAppointmentForm);

      el("appointment-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.activeOrganizationId) {
          showToast("Atenção", "Cadastre um cliente antes de criar agendamentos.", "warning");
          navigate("admin");
          return;
        }
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        const payload = {
          organizationId: state.activeOrganizationId,
          title: data.title,
          scheduledAt: new Date(String(data.scheduledAt)).toISOString(),
          durationMinutes: asNumber(data.durationMinutes) || 60,
          kind: data.kind,
          workOrderId: el("appointment-work-order").value || undefined,
          technicianName: data.technicianName || undefined,
          customerName: data.customerName || undefined,
          location: data.location || undefined,
          notes: data.notes || undefined,
          reminderEnabled: data.reminderEnabled === "on",
          reminderMinutesBefore: asNumber(data.reminderMinutesBefore) || 30,
          ...(editingAppointmentId ? { status: data.status } : {})
        };

        try {
          if (editingAppointmentId) {
            const result = await call("/field/appointments/" + encodeURIComponent(editingAppointmentId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
              method: "PATCH",
              body: JSON.stringify(payload)
            });
            showToast("Sucesso", "Agendamento atualizado com sucesso.");
            resetAppointmentForm();
            state.agendaDate = result.appointment.scheduledAt.slice(0, 10);
            state.agendaMonth = result.appointment.scheduledAt.slice(0, 7);
          } else {
            const created = await call("/field/appointments?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
              method: "POST",
              body: JSON.stringify(payload)
            });
            showToast("Sucesso", "Agendamento criado com sucesso.");
            resetAppointmentForm();
            state.agendaDate = created.appointment.scheduledAt.slice(0, 10);
            state.agendaMonth = created.appointment.scheduledAt.slice(0, 7);
          }
          await load();
          navigate("agenda");
        } catch (error) {
          showToast("Erro", "Erro ao salvar agendamento: " + error.message, "error");
        }
      });

      el("attach-evidence").addEventListener("click", () => {
        requireWorkOrder();
        el('evidence-create-form').reset();
        el('evidence-modal').classList.add('open');
        el('evidence-modal').setAttribute('aria-hidden', 'false');
      });

      const closeEvidenceModal = () => {
        const modal = el('evidence-modal');
        if (modal) {
          if (document.activeElement && modal.contains(document.activeElement)) {
            document.activeElement.blur();
          }
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }
      };

      const btnCloseEvidence = el("btn-close-evidence-modal");
      if (btnCloseEvidence) {
        btnCloseEvidence.addEventListener("click", closeEvidenceModal);
      }

      const btnCancelEvidence = el("btn-cancel-evidence-modal");
      if (btnCancelEvidence) {
        btnCancelEvidence.addEventListener("click", closeEvidenceModal);
      }

      const evidenceModalOverlay = el("evidence-modal");
      if (evidenceModalOverlay) {
        evidenceModalOverlay.addEventListener("click", (e) => {
          if (e.target === evidenceModalOverlay) {
            closeEvidenceModal();
          }
        });
      }

      const evidenceCreateForm = el("evidence-create-form");
      if (evidenceCreateForm) {
        evidenceCreateForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          requireWorkOrder();
          
          const titleInput = el("evidence-title-input");
          const notesInput = el("evidence-notes-input");
          
          const title = titleInput ? titleInput.value.trim() : "";
          const notes = notesInput ? notesInput.value.trim() : "";
          
          if (!title) {
            showToast("Aviso", "Por favor, digite um título para a evidência.", "warning");
            return;
          }
          
          try {
            showToast("Salvando", "Adicionando evidência...", "info");
            await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/evidence", {
              method: "POST",
              body: JSON.stringify({ 
                organizationId: state.activeOrganizationId, 
                kind: "note", 
                title, 
                notes 
              })
            });
            
            closeEvidenceModal();
            showToast("Sucesso", "Evidência adicionada com sucesso!", "success");
            await load();
          } catch (error) {
            showToast("Erro", "Erro ao salvar evidência: " + error.message, "error");
          }
        });
      }

      async function runDiagnosisAgent() {
        requireWorkOrder();
        const data = await call("/ai/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/diagnosis", { method: "POST", body: JSON.stringify({ organizationId: state.activeOrganizationId }) });
        el("agent-output").textContent = JSON.stringify(data, null, 2);
        await refreshTimeline();
      }

      async function runBudgetAgent() {
        requireWorkOrder();
        const data = await call("/ai/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/budget-draft", { method: "POST", body: JSON.stringify({ organizationId: state.activeOrganizationId }) });
        const draft = data.budgetDraft;
        const form = document.forms["budget-form"];
        form.materialsTotal.value = String((draft.suggestedMaterials || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
        form.laborTotal.value = String((draft.lineItems || []).find((item) => item.label.includes("Mao"))?.amount || 0);
        form.durationHours.value = String(draft.durationHours || "");
        form.riskLevel.value = draft.riskLevel || "medium";
        form.amount.value = String(draft.suggestedPrice || draft.estimatedMax || 0);
        form.notes.value = (draft.assumptions || []).join(" ");
        el("agent-output").textContent = JSON.stringify(data, null, 2);
        navigate("orders");
        await refreshTimeline();
      }

      el("diagnosis-agent").addEventListener("click", runDiagnosisAgent);
      el("budget-agent").addEventListener("click", runBudgetAgent);

      function showGlassmorphicConfirm(title, message) {
        return new Promise((resolve) => {
          const overlay = document.createElement("div");
          overlay.style.position = "fixed";
          overlay.style.top = "0";
          overlay.style.left = "0";
          overlay.style.width = "100vw";
          overlay.style.height = "100vh";
          overlay.style.backdropFilter = "blur(12px)";
          overlay.style.webkitBackdropFilter = "blur(12px)";
          overlay.style.backgroundColor = "rgba(10, 20, 30, 0.6)";
          overlay.style.display = "flex";
          overlay.style.alignItems = "center";
          overlay.style.justifyContent = "center";
          overlay.style.zIndex = "9999";
          overlay.style.opacity = "0";
          overlay.style.transition = "opacity 0.3s ease";

          const card = document.createElement("div");
          card.style.background = "rgba(255, 255, 255, 0.08)";
          card.style.backdropFilter = "blur(20px)";
          card.style.webkitBackdropFilter = "blur(20px)";
          card.style.border = "1px solid rgba(255, 255, 255, 0.15)";
          card.style.borderRadius = "16px";
          card.style.padding = "24px";
          card.style.maxWidth = "420px";
          card.style.width = "90%";
          card.style.boxShadow = "0 20px 50px rgba(0, 0, 0, 0.5)";
          card.style.color = "#ffffff";
          card.style.fontFamily = "system-ui, -apple-system, sans-serif";
          card.style.textAlign = "center";
          card.style.transform = "scale(0.9)";
          card.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";

          card.innerHTML = 
            '<div style="font-size: 32px; margin-bottom: 12px;">💸</div>' +
            '<h3 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #38bdf8; letter-spacing: -0.3px;">' + htmlEscape(title) + '</h3>' +
            '<p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #e2e8f0; opacity: 0.95;">' + htmlEscape(message) + '</p>' +
            '<div style="display: flex; gap: 10px; justify-content: center;">' +
              '<button id="glass-confirm-no" style="flex:1; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: background 0.2s;">Preencher do Zero</button>' +
              '<button id="glass-confirm-yes" style="flex:1; border: none; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); transition: opacity 0.2s;">Importar Dados</button>' +
            '</div>';

          overlay.appendChild(card);
          document.body.appendChild(overlay);

          // Force reflow
          overlay.offsetHeight;
          overlay.style.opacity = "1";
          card.style.transform = "scale(1)";

          const closeWith = (val) => {
            overlay.style.opacity = "0";
            card.style.transform = "scale(0.9)";
            setTimeout(() => {
              overlay.remove();
              resolve(val);
            }, 300);
          };

          overlay.querySelector("#glass-confirm-no").addEventListener("click", () => closeWith(false));
          overlay.querySelector("#glass-confirm-yes").addEventListener("click", () => closeWith(true));
          
          const btnNo = overlay.querySelector("#glass-confirm-no");
          const btnYes = overlay.querySelector("#glass-confirm-yes");
          btnNo.addEventListener("mouseenter", () => { btnNo.style.background = "rgba(255,255,255,0.12)"; });
          btnNo.addEventListener("mouseleave", () => { btnNo.style.background = "rgba(255,255,255,0.05)"; });
          btnYes.addEventListener("mouseenter", () => { btnYes.style.opacity = "0.9"; });
          btnYes.addEventListener("mouseleave", () => { btnYes.style.opacity = "1"; });
        });
      }

      el("submit-budget").addEventListener("click", async () => {
        requireWorkOrder();
        const wo = activeWorkOrder();
        if (!wo) return;

        const hasMaterials = wo.materials && wo.materials.length > 0;
        const hasLabor = wo.laborCost !== undefined && Number(wo.laborCost) > 0;

        let importData = true;
        if (hasMaterials || hasLabor) {
          importData = await showGlassmorphicConfirm(
            "Importar dados da OS?",
            "Identificamos que esta OS já possui materiais e/ou custos de mão de obra vinculados. Deseja importar essas informações para compor o orçamento automaticamente?"
          );
        }
        
        el('work-order-modal').classList.add('open');
        el('work-order-modal-title').textContent = "💸 Composição de Orçamento — " + (wo.sequenceNumber || "OS");
        
        state.formMaterials = importData ? JSON.parse(JSON.stringify(wo.materials || [])) : [];
        renderFormMaterials();
        
        const form = document.forms["budget-form"];
        const materialsTotal = importData ? (wo.materials || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0) : 0;
        const laborTotal = importData && wo.laborCost !== undefined ? Number(wo.laborCost) : 0;
        const calculatedTotal = materialsTotal + laborTotal;

        form.querySelector('[name="materialsTotal"]').value = materialsTotal;
        form.querySelector('[name="laborTotal"]').value = importData && wo.laborCost !== undefined ? wo.laborCost : "";
        form.querySelector('[name="durationHours"]').value = importData && wo.estimatedDurationHours !== undefined ? wo.estimatedDurationHours : "";
        form.querySelector('[name="notes"]').value = (wo.budget && wo.budget.notes) ? wo.budget.notes : (importData ? (wo.description || wo.title || "") : "");
        form.querySelector('[name="amount"]').value = (wo.budget && wo.budget.amount) ? wo.budget.amount : (calculatedTotal > 0 ? calculatedTotal : "");
        
        if (typeof calculateMarginRealTime === "function") {
          calculateMarginRealTime();
        }
        
        setModalMode("budget");
      });

      // Unified Stage Transition Trigger
      async function triggerStageTransition(toStage, extraData = {}) {
        requireWorkOrder();
        const wo = activeWorkOrder();
        if (!wo) return;
        const actorName = state.user?.name || "Técnico";
        const actorId = state.user?.email || "system";
        
        const payload = {
          toStage,
          actorId,
          actorName,
          notes: extraData.notes || "Transição para a etapa " + toStage + " efetuada via aplicativo.",
          ...extraData
        };

        const res = await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/stage-transition?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
          method: "POST",
          body: JSON.stringify(payload)
        });
        
        await load();
        return res;
      }

      el("budget-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          requireWorkOrder();
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries());
          Object.keys(data).forEach((key) => { if (key !== "risk" && key !== "notes") data[key] = asNumber(data[key]) || 0; });
          data.organizationId = state.activeOrganizationId;
          data.materials = state.formMaterials || [];
          
          // 1. Persist the budget data using standard POST endpoint
          await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/budget", { 
            method: "POST", 
            body: JSON.stringify(data) 
          });
          
          // 2. Perform FSM transition to budget_sent with budget versions support!
          await triggerStageTransition("budget_sent", {
            notes: data.notes || "Orçamento oficial enviado para análise e aprovação do cliente."
          });
          
          showToast("Orçamento Enviado", "Orçamento registrado e OS enviada para Negociação.", "success");
          el('work-order-modal').classList.remove('open');
        } catch (error) {
          showToast("Erro", "Erro ao enviar orçamento: " + error.message, "error");
        }
      });

      // BIND FLOW ACTION BUTTONS SECURELY TO THE RIGID FSM ENDPOINT
      el("start-work")?.addEventListener("click", async () => {
        try {
          const wo = activeWorkOrder();
          if (!wo) return;
          const target = wo.state === "rework" ? "in_progress" : "in_progress";
          
          await triggerStageTransition(target, {
            notes: "Manutenção iniciada em campo pelo técnico."
          });
          showToast("OS Iniciada", "Status da OS alterado para Em Execução.", "success");
        } catch (err) {
          showToast("Erro", err.message, "error");
        }
      });

      el("approve-budget")?.addEventListener("click", () => {
        el('panel-tool-signature')?.classList.add('open');
        if (typeof initSignatureCanvas === "function") {
          initSignatureCanvas();
        }
      });

      el("rework-work")?.addEventListener("click", async () => {
        try {
          if (confirm("Deseja realmente solicitar o retrabalho desta Ordem de Serviço?")) {
            await triggerStageTransition("rework", {
              notes: "Retrabalho solicitado pelo cliente / laudo final recusado."
            });
            showToast("Retrabalho Ativado", "A Ordem de Serviço retornou para a etapa de Retrabalho.", "success");
          }
        } catch (err) {
          showToast("Erro", err.message, "error");
        }
      });

      // Budget Rejected flow
      async function openDeclineModal() {
        requireWorkOrder();
        el("decline-reason-form").reset();
        el("decline-reason-modal").classList.add("open");
      }

      el("btn-close-decline-modal")?.addEventListener("click", () => el("decline-reason-modal").classList.remove("open"));
      el("btn-cancel-decline")?.addEventListener("click", () => el("decline-reason-modal").classList.remove("open"));
      
      el("decline-reason-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const declineReason = el("decline-category-select").value;
          const notes = el("decline-notes-input").value.trim() || "Orçamento declinado pelo cliente.";
          
          await triggerStageTransition("budget_rejected", {
            declineReason,
            notes
          });
          
          el("decline-reason-modal").classList.remove("open");
          showToast("Orçamento Recusado", "Orçamento marcado como recusado no pipeline.", "success");
        } catch (err) {
          showToast("Erro", err.message, "error");
        }
      });

      // Auto-transition from visited to budget_draft on Initial Report Submit
      // Tab switching in OS Details Sidebar (Geral vs Laudo Técnico)
      el("aside-tab-general").addEventListener("click", () => {
        el("aside-tab-general").classList.add("active");
        el("aside-tab-laudo").classList.remove("active");
        el("selected-work-order").style.display = "block";
        el("selected-work-order-laudo").style.display = "none";
      });

      el("aside-tab-laudo").addEventListener("click", () => {
        el("aside-tab-laudo").classList.add("active");
        el("aside-tab-general").classList.remove("active");
        el("selected-work-order").style.display = "none";
        el("selected-work-order-laudo").style.display = "block";
      });

      // Submit handler for Laudo Técnico form
      el("laudo-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          requireWorkOrder();
          const wo = activeWorkOrder();
          const laudoInicial = el("laudo-inicial-input").value.trim();
          const laudoFinal = el("laudo-final-input").value.trim();
          const validadeGarantiaDias = parseInt(el("laudo-garantia-input").value, 10) || 90;

          // Package Before & After photos into evidence array
          const evidenceArr = wo.evidence ? JSON.parse(JSON.stringify(wo.evidence)) : [];
          if (laudoPhotoBeforeBase64) {
            evidenceArr.push({
              id: "evd_" + Math.random().toString(36).substring(2, 9),
              organizationId: state.activeOrganizationId,
              workOrderId: state.activeWorkOrderId,
              kind: "photo",
              title: "Foto Antes - Diagnóstico",
              url: laudoPhotoBeforeBase64,
              attachedAt: new Date().toISOString(),
              type: "before",
              metadata: { type: "before" }
            });
          }
          if (laudoPhotoAfterBase64) {
            evidenceArr.push({
              id: "evd_" + Math.random().toString(36).substring(2, 9),
              organizationId: state.activeOrganizationId,
              workOrderId: state.activeWorkOrderId,
              kind: "photo",
              title: "Foto Depois - Conclusão",
              url: laudoPhotoAfterBase64,
              attachedAt: new Date().toISOString(),
              type: "after",
              metadata: { type: "after" }
            });
          }

          const payload = {
            organizationId: state.activeOrganizationId,
            laudoInicial,
            laudoFinal,
            validadeGarantiaDias,
            evidence: evidenceArr
          };

          await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
            method: "PATCH",
            body: JSON.stringify(payload)
          });

          // Perform state transitions according to flow trail and requisites
          if (laudoInicial && wo.state === "scheduled") {
            await triggerStageTransition("visited", { notes: "Visita técnica concluída com sucesso e laudo inicial anexado." });
            await triggerStageTransition("budget_draft", { notes: "Rascunho de orçamento iniciado automaticamente." });
          } else if (laudoFinal && wo.state === "in_progress") {
            await triggerStageTransition("pending_acceptance", { notes: "Serviço concluído e laudo final anexado. OS aguardando aceite." });
          }

          // Reset photos
          laudoPhotoBeforeBase64 = "";
          laudoPhotoAfterBase64 = "";
          const p1 = el('laudo-preview-before');
          const p2 = el('laudo-preview-after');
          if (p1) p1.style.display = 'none';
          if (p2) p2.style.display = 'none';

          showToast("Laudo Técnico salvo", "Informações e evidências visuais salvas com sucesso.", "success");
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao salvar laudo técnico: " + error.message, "error");
        }
      });

      // Warranty active modal flow on close-work trigger
      el("close-work")?.addEventListener("click", () => {
        try {
          requireWorkOrder();
          const wo = activeWorkOrder();
          if (!wo) return;
          
          el("warranty-days-input").value = String(wo.validadeGarantiaDias || 90);
          el("warranty-terms-input").value = "Garantia padrão cobrindo defeitos de fabricação de peças e mão de obra aplicada.";
          el("warranty-customization-modal").classList.add("open");
        } catch (err) {
          showToast("Erro", err.message, "error");
        }
      });

      el("btn-close-warranty-modal")?.addEventListener("click", () => el("warranty-customization-modal").classList.remove("open"));
      el("btn-cancel-warranty")?.addEventListener("click", () => el("warranty-customization-modal").classList.remove("open"));

      el("warranty-customization-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const days = Number(el("warranty-days-input").value || 90);
          const terms = el("warranty-terms-input").value.trim();

          const wo = activeWorkOrder();
          if (wo.state === "accepted") {
            await triggerStageTransition("invoiced", { notes: "Ordem de serviço faturada e cobrada." });
          }
          
          await triggerStageTransition("warranty_active", {
            warrantyDays: days,
            terms,
            notes: "Garantia iniciada formalmente após aceite do cliente."
          });

          el("warranty-customization-modal").classList.remove("open");
          showToast("Garantia Ativada", "OS faturada e garantia ativada com sucesso.", "success");
        } catch (err) {
          showToast("Erro", err.message, "error");
        }
      });


      // =========================================================================
      // MEU AJUDANTE EXPENSES, CATEGORIES & TOOLS CONTROLLERS
      // =========================================================================
      
      state.materials = [];
      state.services = [];
      state.expenses = [];
      state.expenseCategories = [];
      state.signaturesCount = Number(localStorage.getItem('atlas_signatures_count') || '0');

      const availableIcons = ['❓', '🛠', '⛽', '🍔', '🚗', '🔧', '📦', '⚙', '💬', '🏠', '💻', '💡', '💰', '🩺', '✈', '📅', '📞', '🚿', '🔌', '🔒', '🔑', '🎨', '📝', '🛒'];
      const availableColors = ['#4CAF50', '#FF9800', '#E91E63', '#2196F3', '#FFEB3B', '#9C27B0', '#795548', '#9E9E9E', '#00BCD4', '#009688', '#FF5722', '#673AB7', '#3F51B5', '#8BC34A', '#CDDC39', '#FFC107'];
      
      let selectedCategoryIcon = availableIcons[0];
      let selectedCategoryColor = availableColors[0];

      function closeToolPanels() {
        document.querySelectorAll('#tools ~ .modal-overlay, #tools .modal-overlay').forEach(p => p.classList.remove('open'));
      }

      function renderToolsMetrics() {
        el('metric-registered-materials').textContent = state.materials.length;
        el('metric-registered-services').textContent = state.services.length;
        el('metric-registered-clients').textContent = state.organizations.length;
        el('metric-active-signatures').textContent = state.signaturesCount;
      }

      // --- 1. SIGNATURE CANVAS LOGIC ---
      let canvas, ctx, drawing = false;
      function initSignatureCanvas() {
        canvas = el('signature-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#edf7ff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);

        canvas.addEventListener('touchstart', (e) => {
          const t = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          startDrawing({ clientX: t.clientX, clientY: t.clientY });
          e.preventDefault();
        });
        canvas.addEventListener('touchmove', (e) => {
          const t = e.touches[0];
          draw({ clientX: t.clientX, clientY: t.clientY });
          e.preventDefault();
        });
        canvas.addEventListener('touchend', stopDrawing);
      }

      function startDrawing(e) {
        drawing = true;
        ctx.beginPath();
        const rect = canvas.getBoundingClientRect();
        ctx.moveTo(
          (e.clientX - rect.left) * (canvas.width / rect.width),
          (e.clientY - rect.top) * (canvas.height / rect.height)
        );
      }

      function draw(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(
          (e.clientX - rect.left) * (canvas.width / rect.width),
          (e.clientY - rect.top) * (canvas.height / rect.height)
        );
        ctx.stroke();
      }

      function stopDrawing() {
        drawing = false;
      }

      function clearSignature() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        el('signature-preview-container').style.display = 'none';
      }

      async function saveSignature() {
        const dataUrl = canvas.toDataURL();
        el('signature-preview-img').src = dataUrl;
        el('signature-preview-container').style.display = 'block';
        state.signaturesCount++;
        localStorage.setItem('atlas_signatures_count', state.signaturesCount);
        renderToolsMetrics();
        
        if (state.activeWorkOrderId) {
          try {
            const wo = activeWorkOrder();
            if (wo) {
              const evidenceArr = wo.evidence ? JSON.parse(JSON.stringify(wo.evidence)) : [];
              // Remove old signature if present to avoid piling them up
              const filteredEvidence = evidenceArr.filter(e => e.type !== 'signature' && e.kind !== 'signature');
              filteredEvidence.push({
                id: "evd_" + Math.random().toString(36).substring(2, 9),
                organizationId: state.activeOrganizationId,
                workOrderId: state.activeWorkOrderId,
                kind: "photo",
                title: "Assinatura do Cliente - Aceite",
                url: dataUrl,
                attachedAt: new Date().toISOString(),
                type: "signature",
                metadata: { type: "signature" }
              });
              
              await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
                method: "PATCH",
                body: JSON.stringify({ 
                  organizationId: state.activeOrganizationId, 
                  evidence: filteredEvidence 
                })
              });

              // Trigger formal FSM stage transition to accepted
              await triggerStageTransition("accepted", {
                notes: "Aceite formal assinado digitalmente pelo cliente."
              });
              
              showToast("Aceite Formal Vinculado", "Assinatura anexada e OS aceita com sucesso.", "success");
              el('panel-tool-signature').classList.remove('open');
              await load();
            }
          } catch (err) {
            showToast("Erro", "Erro ao salvar assinatura na OS: " + err.message, "error");
          }
        } else {
          showToast("Assinatura Salva", "Assinatura gravada localmente nas ferramentas.", "success");
        }
      }

      // --- 2. COST CALCULATORS ---
      function calculatePrices() {
        const mat = Number(el('calc-materials-cost').value || 0);
        const hours = Number(el('calc-labor-hours').value || 0);
        const rate = Number(el('calc-labor-rate').value || 0);
        const margin = Number(el('calc-profit-margin').value || 0);

        const labor = hours * rate;
        const production = mat + labor;
        const profit = production * (margin / 100);
        const finalPrice = production + profit;

        el('res-labor-cost').textContent = money(labor);
        el('res-production-cost').textContent = money(production);
        el('res-profit-value').textContent = money(profit);
        el('res-final-price').textContent = money(finalPrice);
      }

      // --- 3. DYNAMIC REGISTRIES ---
      function renderMaterials(filterQuery = '') {
        const container = el('materials-list-container');
        if (!container) return;
        const q = normalizeSearch(filterQuery);
        const items = state.materials.filter(m => normalizeSearch(m.title).includes(q));

        if (items.length === 0) {
          container.innerHTML = '<div class="slot"><strong>Nenhum material encontrado.</strong></div>';
          return;
        }

        container.innerHTML = items.map((m) => {
          return '<div class="slot" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div><strong>' + htmlEscape(m.title) + '</strong>' +
            '<small>Unidade: ' + htmlEscape(m.unit) + ' | Valor: ' + money(m.value) + ' | Margem: ' + (m.marginEnabled ? 'Ativa' : 'Inativa') + '</small></div>' +
            '<div style="display:flex; gap:6px;">' +
            '<button class="secondary" style="border-color: var(--danger); color: var(--danger); padding:4px 8px; font-size:11px; cursor:pointer;" onclick="deleteMaterial(\'' + m.id + '\')">Excluir</button>' +
            '</div></div>';
        }).join("");
      }

      async function deleteMaterial(id) {
        try {
          await call("/materials/" + id, { method: "DELETE" });
          state.materials = state.materials.filter(m => m.id !== id);
          renderMaterials();
          renderToolsMetrics();
          showToast("Material Excluído", "Material removido do banco de dados.", "success");
        } catch (err) {
          showToast("Erro ao Excluir", err.message, "danger");
        }
      }

      function renderServices(filterQuery = '') {
        const container = el('services-list-container');
        if (!container) return;
        const q = normalizeSearch(filterQuery);
        const items = state.services.filter(s => normalizeSearch(s.title).includes(q));

        if (items.length === 0) {
          container.innerHTML = '<div class="slot"><strong>Nenhum serviço cadastrado.</strong></div>';
          return;
        }

        container.innerHTML = items.map((s) => {
          return '<div class="slot" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div><strong>' + htmlEscape(s.title) + '</strong>' +
            '<small>Cálculo por hora: ' + (s.hourlyEnabled ? 'Sim' : 'Não') + ' | Valor base: ' + money(s.value) + '</small></div>' +
            '<div style="display:flex; gap:6px;">' +
            '<button class="secondary" style="border-color: var(--danger); color: var(--danger); padding:4px 8px; font-size:11px; cursor:pointer;" onclick="deleteService(\'' + s.id + '\')">Excluir</button>' +
            '</div></div>';
        }).join("");
      }

      async function deleteService(id) {
        try {
          await call("/services/" + id, { method: "DELETE" });
          state.services = state.services.filter(s => s.id !== id);
          renderServices();
          renderToolsMetrics();
          showToast("Serviço Excluído", "Serviço removido do banco de dados.", "success");
        } catch (err) {
          showToast("Erro ao Excluir", err.message, "danger");
        }
      }

      function renderClientsList(filterQuery = '') {
        const container = el('clients-list-container');
        if (!container) return;
        const q = normalizeSearch(filterQuery);
        const items = state.organizations.filter(o => normalizeSearch(o.name).includes(q));

        if (items.length === 0) {
          container.innerHTML = '<div class="slot"><strong>Nenhum cliente cadastrado.</strong></div>';
          return;
        }

        container.innerHTML = items.map((o) => {
          return '<div class="slot" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div><strong>' + htmlEscape(o.name) + '</strong>' +
            '<small>CPF/CNPJ: ' + htmlEscape(o.document || 'Não informado') + ' | Tel: ' + htmlEscape(o.phone || 'Não informado') + '</small>' +
            '<small>' + htmlEscape(o.address || 'Sem endereço cadastrado') + '</small></div></div>';
        }).join("");
      }

      // Autocomplete list configs
      const mockMaterialSuggestions = [
        "ABRAÇADEIRA NYLON 200 MM", "CABO FLEXÍVEL 1.0 MM²", "CABO FLEXÍVEL 1.5 MM²",
        "CABO FLEXÍVEL 10 MM²", "CABO FLEXÍVEL 120 MM²", "CABO FLEXÍVEL 16 MM²",
        "CABO FLEXÍVEL 185 MM²", "CABO FLEXÍVEL 2.5 MM²", "CABO DE ALUMÍNIO MULTIPLEX",
        "DISJUNTOR DIN MONOFÁSICO 16A", "DISJUNTOR DIN TRIFÁSICO 50A", "FITA ISOLANTE 3M"
      ];
      const mockServiceSuggestions = [
        "Instalação de Tomada Elétrica Simples", "Substituição de Disjuntor Monofásico",
        "Instalação de Interruptor Simples/Paralelo", "Instalação de Chuveiro Elétrico",
        "Revisão Geral de Quadro de Distribuição (QDC)", "Passagem de Cabeamento (Fios e Cabos)",
        "Atendimento Técnico Emergencial (Geral)"
      ];

      function setupAutocomplete(inputElId, listElId, suggestions) {
        const inp = el(inputElId);
        const box = el(listElId);
        if (!inp || !box) return;

        inp.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (val.length < 2) {
            box.hidden = true;
            return;
          }
          const matches = suggestions.filter(s => normalizeSearch(s).includes(normalizeSearch(val))).slice(0, 5);
          if (matches.length === 0) {
            box.hidden = true;
            return;
          }
          box.hidden = false;
          box.innerHTML = matches.map(m => '<button type="button" class="customer-suggestion" style="padding: 8px 12px; font-weight:bold;">' + htmlEscape(m) + '</button>').join("");
          
          box.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              inp.value = btn.textContent;
              box.hidden = true;
            });
          });
        });

        document.addEventListener('click', (e) => {
          if (e.target !== inp && !box.contains(e.target)) {
            box.hidden = true;
          }
        });
      }

      // --- 4. EXPENSE LEDGER AND CATEGORIES ---
      function populateExpenseMonthFilter() {
        const filter = el('expense-month-filter');
        if (!filter) return;
        
        const months = new Set();
        months.add(todayIso.slice(0, 7));
        state.expenses.forEach(e => {
          if (e.expenseDate) months.add(e.expenseDate.slice(0, 7));
        });

        const sortedMonths = Array.from(months).sort().reverse();
        filter.innerHTML = sortedMonths.map(m => {
          const [yr, mn] = m.split('-');
          const label = new Date(yr, mn - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          return '<option value="' + m + '">' + label.charAt(0).toUpperCase() + label.slice(1) + '</option>';
        }).join("");
      }

      function populateCategorySelect() {
        const sel = el('expense-category-select');
        if (!sel) return;
        sel.innerHTML = state.expenseCategories.map(c => '<option value="' + c.id + '">' + c.icon + ' ' + htmlEscape(c.name) + '</option>').join("");
      }

      function renderCategoriesGrid() {
        const grid = el('categories-list-container');
        if (!grid) return;
        
        grid.innerHTML = state.expenseCategories.map(c => {
          const amt = state.expenses
            .filter(e => e.categoryId === c.id)
            .reduce((sum, e) => sum + e.value, 0);
          
          return '<div class="category-card">' +
            '<div class="category-circle-icon" style="background:' + c.color + ';">' + c.icon + '</div>' +
            '<span>' + htmlEscape(c.name) + '</span>' +
            '<small>' + money(amt) + '</small>' +
            '</div>';
        }).join("");
      }

      function renderExpensesLedger(monthFilterValue) {
        const container = el('expenses-list-container');
        if (!container) return;

        const filtered = state.expenses.filter(e => e.expenseDate && e.expenseDate.slice(0, 7) === monthFilterValue);
        
        let billingTotal = state.workOrders
          .filter(wo => ['approved', 'in_progress', 'closed'].includes(wo.state))
          .reduce((sum, wo) => sum + Number(wo.budget?.amount || 0), 0);

        let expenseTotal = filtered.reduce((sum, e) => sum + e.value, 0);
        let monthTotalAllExpenses = state.expenses
          .filter(e => e.expenseDate && e.expenseDate.slice(0, 7) === todayIso.slice(0, 7))
          .reduce((sum, e) => sum + e.value, 0);

        el('expense-month-total').textContent = money(monthTotalAllExpenses);
        el('expense-count-total').textContent = state.expenses.length;
        el('cashflow-billing-total').textContent = money(billingTotal);
        el('cashflow-balance-total').textContent = money(billingTotal - monthTotalAllExpenses);

        el('aside-revenue-total').textContent = 'Faturamento: ' + money(billingTotal);
        el('aside-expenses-total').textContent = 'Despesas: ' + money(expenseTotal);
        const net = billingTotal - expenseTotal;
        el('aside-net-total').textContent = 'Líquido: ' + money(net);
        el('aside-net-total').style.color = net >= 0 ? 'var(--green)' : 'var(--danger)';

        if (filtered.length === 0) {
          container.innerHTML = '<div class="slot"><strong>Nenhum gasto registrado para este mês.</strong></div>';
          return;
        }

        container.innerHTML = filtered.map((e) => {
          const cat = state.expenseCategories.find(c => c.id === e.categoryId) || { icon: '❓', color: '#607D8B', name: 'Não definida' };
          const dt = new Date(e.expenseDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return '<div class="expense-card">' +
            '<div class="expense-info">' +
            '<div class="category-circle-icon" style="background:' + cat.color + '; width:36px; height:36px; font-size:14px;">' + cat.icon + '</div>' +
            '<div class="expense-meta">' +
            '<strong>' + htmlEscape(e.description) + '</strong>' +
            '<small>' + htmlEscape(cat.name) + ' • ' + dt + '</small>' +
            '</div></div>' +
            '<div style="display:flex; align-items:center; gap:12px;">' +
            '<span class="expense-amount">' + money(e.value) + '</span>' +
            '<button class="secondary" style="border-color: var(--danger); color: var(--danger); padding:4px 8px; font-size:11px; cursor:pointer;" onclick="deleteExpense(\'' + e.id + '\')">Excluir</button>' +
            '</div></div>';
        }).join("");
      }

      async function deleteExpense(id) {
        try {
          await call("/expenses/" + id, { method: "DELETE" });
          state.expenses = state.expenses.filter(e => e.id !== id);
          const filter = el('expense-month-filter');
          renderExpensesLedger(filter ? filter.value : todayIso.slice(0, 7));
          renderCategoriesGrid();
          showToast("Gasto Removido", "Despesa excluída com sucesso do banco de dados.", "success");
        } catch (err) {
          showToast("Erro ao Excluir", err.message, "danger");
        }
      }

      function initExpenseModalPickers() {
        const iconsGrid = el('category-icons-grid');
        const colorsGrid = el('category-colors-grid');
        if (!iconsGrid || !colorsGrid) return;

        iconsGrid.innerHTML = availableIcons.map(ic => '<button type="button" class="icon-dot' + (ic === selectedCategoryIcon ? ' active' : '') + '">' + ic + '</button>').join("");
        colorsGrid.innerHTML = availableColors.map(cl => '<button type="button" class="color-dot' + (cl === selectedCategoryColor ? ' active' : '') + '" style="background:' + cl + ';"></button>').join("");

        iconsGrid.querySelectorAll('.icon-dot').forEach(btn => {
          btn.addEventListener('click', () => {
            iconsGrid.querySelectorAll('.icon-dot').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategoryIcon = btn.textContent;
          });
        });

        colorsGrid.querySelectorAll('.color-dot').forEach(btn => {
          btn.addEventListener('click', () => {
            colorsGrid.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategoryColor = btn.style.backgroundColor;
          });
        });
      }

      function setupRealtimeTableFilter() {
        const searchInput = el('search-price-table');
        if (!searchInput) return;

        if (searchInput.dataset.listenerAdded) return;
        searchInput.dataset.listenerAdded = "true";

        searchInput.addEventListener('input', (e) => {
          const q = normalizeSearch(e.target.value);
          const rows = document.querySelectorAll('#price-table-rows tr');
          rows.forEach(row => {
            const match = normalizeSearch(row.textContent || "").includes(q);
            row.style.display = match ? '' : 'none';
          });
        });
      }

      function deduceOrganizationCity(org) {
        if (!org) return "Rio de Janeiro";
        const addr = (org.address || org.data?.address || "").toLowerCase();
        if (addr.includes("rio de janeiro") || addr.includes("rj") || addr === "rio") {
          return "Rio de Janeiro";
        }
        if (addr.includes("sao paulo") || addr.includes("são paulo") || addr.includes("sp")) {
          return "São Paulo";
        }
        if (addr.includes("nova campinas") || addr.includes("duque de caxias") || addr.includes("caxias")) {
          return "Duque de Caxias";
        }
        if (org.city) return org.city;
        if (org.data?.city) return org.data.city;
        if (org.data?.addressCity) return org.data.addressCity;
        return "Rio de Janeiro";
      }

      async function loadPriceTable() {
        const tbody = el('price-table-rows');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-soft);">Carregando tabela de preços...</td></tr>';
        
        try {
          const org = activeOrganization();
          const orgCity = deduceOrganizationCity(org);
          
          const orgId = state.activeOrganizationId || "";
          const tenantParam = state.user?.tenantCode || "";
          const emailParam = state.user?.email || "";
          const query = "/field/regional-prices?organizationId=" + encodeURIComponent(orgId) + 
                        "&city=" + encodeURIComponent(orgCity) +
                        "&tenant=" + encodeURIComponent(tenantParam) +
                        "&email=" + encodeURIComponent(emailParam);
          const data = await call(query);
          const items = data.items || [];
          
          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-soft);">Nenhum preço regional disponível para ' + htmlEscape(orgCity) + '.</td></tr>';
            return;
          }
          
          tbody.innerHTML = items.map((item) => {
            const range = item.minValue && item.maxValue 
              ? money(item.minValue) + " - " + money(item.maxValue)
              : money(item.averageValue * 0.8) + " - " + money(item.averageValue * 1.2);
              
            const isOverride = item.organizationId ? '<span style="font-size: 10px; padding: 2px 4px; border-radius: 4px; background: rgba(0,255,100,0.15); color: #00ff64; margin-left: 6px;">Org</span>' : '';
            
            return '<tr style="border-bottom: 1px solid var(--line);">' +
              '<td style="padding: 10px; font-weight: bold;">' + htmlEscape(item.name) + isOverride + '</td>' +
              '<td style="padding: 10px;">' + htmlEscape(item.unit || 'Un') + '</td>' +
              '<td style="padding: 10px; text-align: right; color: var(--accent);">' + range + '</td>' +
              '</tr>';
          }).join('');
          
          setupRealtimeTableFilter();
        } catch (e) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--red);">Erro ao carregar preços: ' + htmlEscape(e.message) + '</td></tr>';
        }
      }

      function setupToolsHubHandlers() {
        el('tool-signature-btn')?.addEventListener('click', () => {
          el('panel-tool-signature').classList.add('open');
          initSignatureCanvas();
        });
        el('tool-calc-prices-btn')?.addEventListener('click', () => {
          el('panel-tool-calc-prices').classList.add('open');
          calculatePrices();
        });
        el('tool-calc-travel-btn')?.addEventListener('click', () => {
          el('panel-tool-calc-travel').classList.add('open');
        });
        el('tool-price-table-btn')?.addEventListener('click', async () => {
          el('panel-tool-price-table').classList.add('open');
          await loadPriceTable();
        });
        el('tool-materials-btn')?.addEventListener('click', () => {
          el('panel-tool-materials').classList.add('open');
          renderMaterials();
        });
        el('tool-services-btn')?.addEventListener('click', () => {
          el('panel-tool-services').classList.add('open');
          renderServices();
        });
        el('tool-clients-btn')?.addEventListener('click', () => {
          el('panel-tool-clients').classList.add('open');
          renderClientsList();
        });

        ['calc-materials-cost', 'calc-labor-hours', 'calc-labor-rate', 'calc-profit-margin'].forEach(id => {
          el(id)?.addEventListener('input', calculatePrices);
        });

        function calculateFuelCost() {
          const dist = Number(el('travel-distance').value || 0);
          const eff = Number(el('travel-efficiency').value || 1);
          const prc = Number(el('travel-fuel-price').value || 0);
          const oth = Number(el('travel-other-costs').value || 0);

          const liters = dist / eff;
          const cost = liters * prc;
          const total = cost + oth;

          el('res-fuel-liters').textContent = liters.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L';
          el('res-fuel-cost').textContent = money(cost);
          el('res-travel-total').textContent = money(total);
        }

        el('tool-calc-electric-btn')?.addEventListener('click', () => {
          el('panel-tool-electric').classList.add('open');
        });

        function calculateElectricDimensioning() {
          const power = Number(el('calc-elec-power').value || 0);
          const voltage = Number(el('calc-elec-voltage').value || 220);
          const length = Number(el('calc-elec-length').value || 0);
          const installation = el('calc-elec-embedded').value;

          if (power <= 0 || length <= 0) return;

          // 1. Nominal Current
          let current = 0;
          if (voltage === 380) {
            current = power / (voltage * Math.sqrt(3) * 0.92);
          } else {
            current = power / (voltage * 0.95);
          }

          // 2. Wire Gauge NBR 5410 PBC
          const wireSizes = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0];
          const embeddedAmpacity = [17.5, 24, 32, 41, 57, 76, 101];
          const exposedAmpacity = [22, 30, 40, 51, 70, 94, 125];
          const ampacities = installation === 'embedded' ? embeddedAmpacity : exposedAmpacity;
          
          let wireIdx = 0;
          for (let i = 0; i < wireSizes.length; i++) {
            if (ampacities[i] >= current) {
              wireIdx = i;
              break;
            }
            if (i === wireSizes.length - 1) {
              wireIdx = i;
            }
          }

          // 3. Breaker Coordination
          const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100];
          let selectedBreaker = 10;
          for (let i = 0; i < standardBreakers.length; i++) {
            if (standardBreakers[i] >= current) {
              selectedBreaker = standardBreakers[i];
              break;
            }
            if (i === standardBreakers.length - 1) {
              selectedBreaker = standardBreakers[i];
            }
          }

          while (selectedBreaker > ampacities[wireIdx] && wireIdx < wireSizes.length - 1) {
            wireIdx++;
          }

          // 4. Voltage Drop
          let dropPercent = 0;
          let s = wireSizes[wireIdx];
          
          while (wireIdx < wireSizes.length - 1) {
            s = wireSizes[wireIdx];
            if (voltage === 380) {
              dropPercent = (Math.sqrt(3) * length * current * 0.92) / (58 * s * voltage) * 100;
            } else {
              dropPercent = (2 * length * current * 0.95) / (58 * s * voltage) * 100;
            }
            
            if (dropPercent <= 4.0) {
              break;
            }
            wireIdx++;
          }

          // Update UI
          el('res-elec-current').textContent = current.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' A';
          el('res-elec-drop').textContent = dropPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' %';
          el('res-elec-wire').textContent = wireSizes[wireIdx] + ' mm²';
          el('res-elec-breaker').textContent = selectedBreaker + ' A';
          el('electric-calc-results').style.display = 'block';
        }

        el('btn-run-electric-calc')?.addEventListener('click', calculateElectricDimensioning);

        ['travel-distance', 'travel-efficiency', 'travel-fuel-price', 'travel-other-costs'].forEach(id => {
          el(id)?.addEventListener('input', calculateFuelCost);
        });

        el('btn-clear-signature')?.addEventListener('click', clearSignature);
        el('btn-save-signature')?.addEventListener('click', saveSignature);
      }


      // =========================================================================
      // FASE 1: LAUDO TÉCNICO & INTEGRACAO WHATSAPP
      // =========================================================================

      function generateLaudoTechnicalHTML(wo) {
        const org = activeOrganization() || { name: "Cliente Geral", document: "", phone: "", address: "" };
        const storedBefore = (wo.evidence || []).find(e => e.type === 'before');
        const storedAfter = (wo.evidence || []).find(e => e.type === 'after');
        const materialsTotal = (wo.materials || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        const laborTotal = Number(wo.laborCost || 0);
        const finalTotal = materialsTotal + laborTotal;

        const beforePhotoHtml = storedBefore 
          ? '<img src="' + storedBefore.url + '" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; border:1px solid #cbdce6;" />'
          : '<div style="background:#0b0f14; border:1px dashed #cbdce6; border-radius:8px; height:180px; display:grid; place-items:center; color:#9eb7c7;">Nenhuma foto registrada antes.</div>';

        const afterPhotoHtml = storedAfter 
          ? '<img src="' + storedAfter.url + '" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; border:1px solid #cbdce6;" />'
          : '<div style="background:#0b0f14; border:1px dashed #cbdce6; border-radius:8px; height:180px; display:grid; place-items:center; color:#9eb7c7;">Nenhuma foto registrada depois.</div>';

        const materialsListHtml = (wo.materials || []).map(item => {
          return '<tr>' +
            '<td style="padding:10px; border-bottom:1px solid #cbdce6;">' + htmlEscape(item.name) + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #cbdce6; text-align:right;">' + item.quantity + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #cbdce6; text-align:right;">' + money(item.unitPrice) + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #cbdce6; text-align:right; font-weight:bold;">' + money(item.totalPrice) + '</td>' +
            '</tr>';
        }).join("");

        const storedSignature = (wo.evidence || []).find(e => e.type === 'signature' || e.kind === 'signature');
        const signaturePreviewUrl = storedSignature ? storedSignature.url : (el('signature-preview-img')?.src || '');
        const signatureHtml = signaturePreviewUrl
          ? '<img src="' + signaturePreviewUrl + '" style="max-height:80px; border-bottom: 1px solid #10212c; display:block; margin: 0 auto 6px;" /><small style="color:#4a606e;">Assinatura do Cliente</small>'
          : '<div style="border-bottom:1px dashed #4a606e; height:50px; width:200px; margin:0 auto 6px;"></div><small style="color:#4a606e;">Assinatura Digital Ausente</small>';

        return '<!doctype html>' +
          '<html>' +
          '<head>' +
            '<meta charset="utf-8" />' +
            '<title>Laudo Técnico - ' + htmlEscape(wo.sequenceNumber || wo.id) + '</title>' +
            '<style>' +
              'body { font-family: sans-serif; color:#10212c; margin:0; padding:20px; background:#f5f8fb; line-height:1.5; }' +
              '.laudo-card { background:#fff; border:1px solid #cbdce6; border-radius:12px; padding:32px; max-width:800px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.05); }' +
              '.header-grid { display:grid; grid-template-columns:1fr auto; gap:20px; border-bottom:2px solid #00f0c0; padding-bottom:18px; margin-bottom:24px; }' +
              '.header-grid h1 { margin:0; font-size:24px; color:#07131c; letter-spacing: -0.5px; }' +
              '.section-title { font-size:14px; font-weight:bold; text-transform:uppercase; color:#0ea5e9; border-bottom:1px solid #cbdce6; padding-bottom:6px; margin:24px 0 12px; letter-spacing:0.5px; }' +
              '.data-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:13px; }' +
              '.data-item { display:flex; flex-direction:column; gap:2px; }' +
              '.data-item span { font-weight:bold; color:#4a606e; }' +
              '.data-item strong { color:#07131c; font-size:14px; }' +
              '.photo-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px; }' +
              '.photo-box { display:grid; gap:8px; text-align:center; }' +
              '.photo-box span { font-weight:bold; font-size:12px; color:#4a606e; text-transform:uppercase; }' +
              'table { width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }' +
              'th { background:#f8fafc; padding:10px; font-weight:bold; border-bottom:1px solid #cbdce6; text-align:left; }' +
              '.footer-grid { display:grid; grid-template-columns:1fr auto; gap:30px; margin-top:40px; padding-top:20px; border-top:1px solid #cbdce6; align-items:center; }' +
              '@media print { body { background:#fff; padding:0; } .laudo-card { border:none; box-shadow:none; padding:0; } }' +
            '</style>' +
          '</head>' +
          '<body>' +
            '<div class="laudo-card">' +
              '<header class="header-grid">' +
                '<div>' +
                  '<h1>ATLAS OS — LAUDO TÉCNICO</h1>' +
                  '<small style="color:#4a606e; font-weight:bold;">COMPROVAÇÃO OPERACIONAL E AUDITORIA DIGITAL</small>' +
                '</div>' +
                '<div style="text-align:right;">' +
                  '<strong style="color:#0ea5e9; font-size:16px;">' + htmlEscape(wo.sequenceNumber || "OS-" + wo.id.substring(0,6).toUpperCase()) + '</strong><br>' +
                  '<small style="color:#4a606e;">Emitido em: ' + new Date().toLocaleDateString("pt-BR") + '</small>' +
                '</div>' +
              '</header>' +

              '<div class="section-title">Dados do Cliente</div>' +
              '<div class="data-grid">' +
                '<div class="data-item"><span>Nome do Cliente / Razão Social</span><strong>' + htmlEscape(org.name) + '</strong></div>' +
                '<div class="data-item"><span>Documento (CPF/CNPJ)</span><strong>' + htmlEscape(org.document || "Não informado") + '</strong></div>' +
                '<div class="data-item"><span>Endereço de Atendimento</span><strong>' + htmlEscape(org.address || "Não informado") + '</strong></div>' +
                '<div class="data-item"><span>Telefone</span><strong>' + htmlEscape(org.phone || "Não informado") + '</strong></div>' +
              '</div>' +

              '<div class="section-title">Detalhes do Serviço</div>' +
              '<div class="data-grid">' +
                '<div class="data-item"><span>Título da OS</span><strong>' + htmlEscape(wo.title) + '</strong></div>' +
                '<div class="data-item"><span>Técnico Responsável</span><strong>' + htmlEscape(wo.technicianName || "Marcelo Atlas") + '</strong></div>' +
                '<div class="data-item" style="grid-column: span 2;"><span>Descrição Técnica Executada</span><strong style="font-weight:normal;">' + htmlEscape(wo.description || "Nenhuma descrição técnica detalhada informada.") + '</strong></div>' +
              '</div>' +

              '<div class="section-title">Laudo Técnico Detalhado</div>' +
              '<div style="display:grid; grid-template-columns:1fr; gap:12px; margin-bottom:16px;">' +
                '<div style="padding:12px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px;">' +
                  '<strong style="color:#0369a1; display:block; font-size:12px; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.5px;">🔍 Constatações Técnicas (Laudo Inicial)</strong>' +
                  '<p style="margin:0; font-size:13px; color:#1e293b; white-space:pre-wrap;">' + htmlEscape(wo.laudoInicial || "Diagnóstico inicial não preenchido ou não requerido para esta ordem.") + '</p>' +
                '</div>' +
                '<div style="padding:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">' +
                  '<strong style="color:#15803d; display:block; font-size:12px; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.5px;">✅ Conclusão dos Serviços (Laudo Final)</strong>' +
                  '<p style="margin:0; font-size:13px; color:#1e293b; white-space:pre-wrap;">' + htmlEscape(wo.laudoFinal || "Conclusão técnica final não preenchida ou aguardando finalização.") + '</p>' +
                '</div>' +
              '</div>' +

              '<div class="section-title">Comprovação Visual (Antes e Depois)</div>' +
              '<div class="photo-grid">' +
                '<div class="photo-box"><span>Visão Geral: Antes</span>' + beforePhotoHtml + '</div>' +
                '<div class="photo-box"><span>Conclusão: Depois</span>' + afterPhotoHtml + '</div>' +
              '</div>' +

              '<div class="section-title">Materiais Consumidos & Insumos</div>' +
              '<table>' +
                '<thead>' +
                  '<tr>' +
                    '<th style="border-radius:6px 0 0 6px;">Descrição do Material</th>' +
                    '<th style="text-align:right; width:60px;">Qtd</th>' +
                    '<th style="text-align:right; width:100px;">P. Unitário</th>' +
                    '<th style="text-align:right; width:120px; border-radius:0 6px 6px 0;">Subtotal</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  (materialsListHtml || '<tr><td colspan="4" style="padding:10px; text-align:center; color:#4a606e;">Nenhum material consumido registrado nesta ordem.</td></tr>') +
                '</tbody>' +
                '<tfoot>' +
                  '<tr style="font-weight:bold; border-top:1px solid #cbdce6;">' +
                    '<td colspan="3" style="padding:10px; text-align:right; color:#4a606e;">Total Geral da Ordem:</td>' +
                    '<td style="padding:10px; text-align:right; font-size:16px; color:#07131c;">' + money(finalTotal) + '</td>' +
                  '</tr>' +
                '</tfoot>' +
              '</table>' +

              '<div class="footer-grid">' +
                '<div style="text-align:center;">' +
                  signatureHtml +
                '</div>' +
                '<div style="text-align:right; font-size:11px; color:#4a606e; max-width:300px;">' +
                  '<strong style="color:#07131c; display:block; margin-bottom:4px;">🛡️ Validação de Conformidade</strong>' +
                  'Este laudo técnico possui assinatura digital vinculada e registro de auditoria por geolocalização exata GPS.<br>' +
                  '<span style="font-family:monospace; display:block; margin-top:4px;">ID: ' + wo.id + '</span>' +
                '</div>' +
              '</header>' +
            '</div>' +
          '</body>' +
          '</html>';
      }

      function viewLaudoTechnical() {
        const wo = activeWorkOrder();
        if (!wo) return;
        const htmlContent = generateLaudoTechnicalHTML(wo);
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(htmlContent);
          win.document.close();
        }
      }

      function shareLaudoWhatsApp() {
        const wo = activeWorkOrder();
        if (!wo) return;
        
        const org = activeOrganization() || { name: "Cliente" };
        const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS-" + wo.id.substring(0, 6).toUpperCase();
        const totalAmount = (wo.materials || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0) + Number(wo.laborCost || 0);

        const text = "*ATLAS OS — LAUDO TÉCNICO DIGITAL*\n\n" +
          "Olá, *" + org.name + "*. Segue o laudo técnico de comprovação de serviços elétricos prestados:\n\n" +
          "📄 *Ordem de Serviço:* " + displayName + "\n" +
          "🛠️ *Atendimento:* " + wo.title + "\n" +
          "💰 *Valor Total:* " + money(totalAmount) + "\n" +
          "✍️ *Assinatura Digital:* VINCULADA\n\n" +
          "Acesse a via digital completa e auditoria técnica pelo link:\n" +
          "http://localhost:5174/?os=" + wo.id;

        const encodedText = encodeURIComponent(text);
        const mobileUrl = "whatsapp://send?phone=" + encodeURIComponent(org.phone || "") + "&text=" + encodedText;
        const webUrl = "https://web.whatsapp.com/send?text=" + encodedText;

        // Try opening native WhatsApp, fallback to web
        const win = window.open(mobileUrl, "_blank");
        setTimeout(() => {
          if (!win || win.closed || typeof win.closed === 'undefined') {
            window.open(webUrl, "_blank");
          }
        }, 800);
      }

      function generateReceiptTechnicalHTML(wo, branding) {
        const org = activeOrganization() || { name: "Cliente não especificado" };
        const materialsTotal = (wo.materials || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        const laborTotal = Number(wo.laborCost || 0);
        const finalTotal = materialsTotal + laborTotal;

        const materialsListHtml = (wo.materials || []).map((item) =>
          '<tr>' +
            '<td style="padding:10px; border-bottom:1px solid #e2e8f0;">' + htmlEscape(item.name) + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right;">' + item.quantity + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right;">' + money(item.price) + '</td>' +
            '<td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold;">' + money(item.totalPrice) + '</td>' +
          '</tr>'
        ).join("");

        // Calculate dynamic warranty terms
        const warrantyDays = Number(wo.validadeGarantiaDias || (branding && branding.warrantyDays) || 90);
        const dateStart = wo.closedAt ? new Date(wo.closedAt) : new Date();
        const dateEnd = new Date(dateStart.getTime() + warrantyDays * 24 * 60 * 60 * 1000);

        const emissorName = (branding && branding.emissorName) ? branding.emissorName : "ATLAS OS FIELD SERVICES";
        const brandType = (branding && branding.brandType) ? branding.brandType : "AUTONOMO";
        const logoUrl = (branding && branding.logoUrl) ? branding.logoUrl : "";
        const phone = (branding && branding.phone) ? branding.phone : "";
        const email = (branding && branding.email) ? branding.email : "";
        const address = (branding && branding.address) ? branding.address : "";
        const warrantyTerms = (branding && branding.warrantyTerms) ? branding.warrantyTerms : "Garantia de mão de obra de 90 dias a partir da entrega.";
        const pixKey = (branding && branding.pixKey) ? branding.pixKey : "";

        const brandTypeLabel = {
          "AUTONOMO": "Profissional Autônomo",
          "MEI": "Microempreendedor Individual (MEI)",
          "FREELANCE": "Freelancer",
          "EMPRESA": "Razão Social / Marca"
        }[brandType] || "Prestador de Serviços";

        const logoHtml = logoUrl 
          ? '<img src="' + htmlEscape(logoUrl) + '" style="max-height:60px; max-width:180px; object-fit:contain; margin-bottom:8px;" />'
          : '<div style="font-weight:bold; font-size:20px; color:#0d6b7a; letter-spacing:-0.5px;">' + htmlEscape(emissorName) + '</div>';

        const pixSectionHtml = pixKey 
          ? '<div style="margin-top:20px; padding:16px; background:#f0f9ff; border:1px solid #e0f2fe; border-radius:8px; display:grid; grid-template-columns:auto 1fr; gap:16px; align-items:center;">' +
              '<div style="font-size:24px;">📱</div>' +
              '<div>' +
                '<strong style="color:#0d6b7a; display:block; font-size:14px; margin-bottom:2px;">Pagamento Simplificado via PIX</strong>' +
                '<span style="font-size:12px; color:#4b5563;">Chave Pix Copie e Cole:</span><br>' +
                '<code style="font-family:monospace; font-size:13px; font-weight:bold; color:#1f2937; background:#fff; padding:2px 6px; border:1px solid #e5e7eb; border-radius:4px; display:inline-block; margin-top:4px;">' + htmlEscape(pixKey) + '</code>' +
              '</div>' +
            '</div>'
          : '';

        // Extract photos and signatures from evidence
        const storedBefore = (wo.evidence || []).find(e => e.type === 'before' || e.type === 'evidence-photo-before');
        const storedAfter = (wo.evidence || []).find(e => e.type === 'after' || e.type === 'evidence-photo-after');
        const storedSignature = (wo.evidence || []).find(e => e.type === 'signature');

        let evidencesHtml = '';
        if (storedBefore || storedAfter) {
          evidencesHtml = '<div class="section-title">Evidências do Atendimento (Antes / Depois)</div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">' +
              (storedBefore ? '<div style="text-align:center; padding:10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">' +
                '<strong style="display:block; font-size:12px; color:#4b5563; margin-bottom:6px;">📸 Registro ANTES</strong>' +
                '<img src="' + storedBefore.url + '" style="max-width:100%; max-height:180px; object-fit:contain; border-radius:6px; border:1px solid #d1d5db;" />' +
              '</div>' : '<div style="text-align:center; padding:10px; background:#f9fafb; border:1px dashed #e5e7eb; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:12px;">Sem registro prévio</div>') +
              (storedAfter ? '<div style="text-align:center; padding:10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">' +
                '<strong style="display:block; font-size:12px; color:#4b5563; margin-bottom:6px;">📸 Registro DEPOIS</strong>' +
                '<img src="' + storedAfter.url + '" style="max-width:100%; max-height:180px; object-fit:contain; border-radius:6px; border:1px solid #d1d5db;" />' +
              '</div>' : '<div style="text-align:center; padding:10px; background:#f9fafb; border:1px dashed #e5e7eb; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:12px;">Sem registro conclusivo</div>') +
            '</div>';
        }

        const signatureHtml = storedSignature 
          ? '<img src="' + storedSignature.url + '" style="max-height:60px; max-width:200px; object-fit:contain; margin-bottom:2px;" />'
          : '<div style="border-bottom:1px dashed #9ca3af; height:45px; width:200px; margin:0 auto 6px;"></div>';

        return '<!doctype html>' +
          '<html>' +
          '<head>' +
            '<meta charset="utf-8" />' +
            '<title>Recibo e Garantia - ' + htmlEscape(wo.sequenceNumber || wo.id) + '</title>' +
            '<style>' +
              'body { font-family: system-ui, -apple-system, sans-serif; color:#1f2937; margin:0; padding:20px; background:#f9fafb; line-height:1.5; }' +
              '.receipt-card { background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:36px; max-width:800px; margin:0 auto; box-shadow:0 10px 25px rgba(0,0,0,0.03); position:relative; }' +
              '.header-grid { display:grid; grid-template-columns:1fr auto; gap:20px; border-bottom:2px solid #0d6b7a; padding-bottom:20px; margin-bottom:24px; }' +
              '.header-grid h1 { margin:0; font-size:26px; color:#111827; letter-spacing: -0.5px; }' +
              '.section-title { font-size:14px; font-weight:bold; text-transform:uppercase; color:#0d6b7a; border-bottom:1px solid #e5e7eb; padding-bottom:6px; margin:24px 0 12px; letter-spacing:0.5px; }' +
              '.data-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:13px; }' +
              '.data-item { display:flex; flex-direction:column; gap:2px; }' +
              '.data-item span { font-weight:bold; color:#6b7280; }' +
              '.data-item strong { color:#111827; font-size:14px; }' +
              'table { width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }' +
              'th { background:#f9fafb; padding:10px; font-weight:bold; border-bottom:1px solid #e5e7eb; text-align:left; color:#4b5563; }' +
              '.footer-grid { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb; align-items:center; }' +
              '.no-print-bar { background:linear-gradient(135deg, #0d6b7a, #1e3a8a); color:#fff; display:flex; justify-content:space-between; align-items:center; padding:10px 20px; max-width:800px; margin:0 auto 16px; border-radius:8px; font-size:14px; font-weight:bold; box-shadow:0 4px 12px rgba(13,107,122,0.2); }' +
              '.no-print-bar button { background:#fff; color:#0d6b7a; border:none; padding:6px 14px; font-weight:bold; border-radius:6px; cursor:pointer; font-size:12px; transition:opacity 0.2s; }' +
              '.no-print-bar button:hover { opacity:0.9; }' +
              '@media print { body { background:#fff; padding:0; } .receipt-card { border:none; box-shadow:none; padding:0; } .no-print, .no-print-bar { display:none !important; } }' +
            '</style>' +
          '</head>' +
          '<body>' +
            '<div class="no-print-bar">' +
              '<span>🧾 Recibo e Certificado de Garantia</span>' +
              '<div style="display:flex; gap:10px;">' +
                '<button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>' +
                '<button id="share-btn">🔗 Compartilhar Recibo</button>' +
              '</div>' +
            '</div>' +

            '<div class="receipt-card">' +
              '<header class="header-grid">' +
                '<div>' +
                  logoHtml +
                  '<small style="color:#6b7280; font-weight:bold; text-transform:uppercase; font-size:11px;">' + htmlEscape(brandTypeLabel) + '</small>' +
                  '<div style="font-size:12px; color:#4b5563; margin-top:6px;">' +
                    (phone ? '📞 ' + htmlEscape(phone) + ' &nbsp;' : '') +
                    (email ? '✉️ ' + htmlEscape(email) + '<br>' : '') +
                    (address ? '📍 ' + htmlEscape(address) : '') +
                  '</div>' +
                '</div>' +
                '<div style="text-align:right;">' +
                  '<strong style="color:#0d6b7a; font-size:18px;">RECIBO #' + htmlEscape(wo.sequenceNumber || wo.id.substring(0,8).toUpperCase()) + '</strong><br>' +
                  '<small style="color:#6b7280; font-weight:bold;">Valor: ' + money(finalTotal) + '</small><br>' +
                  '<small style="color:#6b7280;">Emissão: ' + dateStart.toLocaleDateString("pt-BR") + '</small>' +
                '</div>' +
              '</header>' +

              '<div class="section-title">Dados do Tomador / Cliente</div>' +
              '<div class="data-grid">' +
                '<div class="data-item"><span>Cliente / Razão Social</span><strong>' + htmlEscape(org.name) + '</strong></div>' +
                '<div class="data-item"><span>Documento (CPF/CNPJ)</span><strong>' + htmlEscape(org.document || "Não informado") + '</strong></div>' +
                '<div class="data-item" style="grid-column: span 2;"><span>Endereço de Atendimento</span><strong>' + htmlEscape(org.address || "Não informado") + '</strong></div>' +
              '</div>' +

              '<div class="section-title">Descrição dos Serviços e Peças</div>' +
              '<div style="font-size:13px; padding:12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:12px;">' +
                '<strong style="color:#111827; display:block; margin-bottom:4px;">' + htmlEscape(wo.title) + '</strong>' +
                '<span style="color:#4b5563;">' + htmlEscape(wo.description || "Atendimento e serviços prestados sem descrição detalhada.") + '</span>' +
              '</div>' +

              '<div style="display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:16px;">' +
                (wo.laudoInicial ? '<div style="padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:12px;">' +
                  '<strong style="color:#475569; display:block; margin-bottom:2px;">🔍 Constatações Iniciais (Laudo)</strong>' +
                  '<span style="color:#334155; white-space:pre-wrap;">' + htmlEscape(wo.laudoInicial) + '</span>' +
                '</div>' : '') +
                (wo.laudoFinal ? '<div style="padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:12px;">' +
                  '<strong style="color:#475569; display:block; margin-bottom:2px;">✅ Solução / Conclusão Técnica</strong>' +
                  '<span style="color:#334155; white-space:pre-wrap;">' + htmlEscape(wo.laudoFinal) + '</span>' +
                '</div>' : '') +
              '</div>' +

              '<table>' +
                '<thead>' +
                  '<tr>' +
                    '<th style="border-radius:6px 0 0 6px;">Descrição do Insumo / Peça</th>' +
                    '<th style="text-align:right; width:60px;">Qtd</th>' +
                    '<th style="text-align:right; width:100px;">Unitário</th>' +
                    '<th style="text-align:right; width:120px; border-radius:0 6px 6px 0;">Subtotal</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  (materialsListHtml || '<tr><td colspan="4" style="padding:12px; text-align:center; color:#6b7280; font-style:italic;">Sem insumos materiais registrados. Apenas custos de mão de obra.</td></tr>') +
                '</tbody>' +
                '<tfoot>' +
                  '<tr style="font-weight:bold; border-top:1px solid #e5e7eb;">' +
                    '<td colspan="3" style="padding:12px; text-align:right; color:#6b7280;">Mão de obra / Serviços:</td>' +
                    '<td style="padding:12px; text-align:right;">' + money(laborTotal) + '</td>' +
                  '</tr>' +
                  '<tr style="font-weight:bold; background:#f9fafb; border-top:2px solid #0d6b7a;">' +
                    '<td colspan="3" style="padding:12px; text-align:right; color:#0d6b7a; font-size:14px;">Valor Total Pago:</td>' +
                    '<td style="padding:12px; text-align:right; font-size:18px; color:#0d6b7a;">' + money(finalTotal) + '</td>' +
                  '</tr>' +
                '</tfoot>' +
              '</table>' +

              pixSectionHtml +

              evidencesHtml +

              '<div class="section-title">🛡️ Certificado de Garantia dos Serviços</div>' +
              '<div style="font-size:13px; display:grid; gap:8px;">' +
                '<div style="display:flex; justify-content:space-between; padding:8px 12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-weight:bold; color:#15803d;">' +
                  '<span>Vigência da Garantia:</span>' +
                  '<span>De ' + dateStart.toLocaleDateString("pt-BR") + ' até ' + dateEnd.toLocaleDateString("pt-BR") + ' (' + warrantyDays + ' dias)</span>' +
                '</div>' +
                '<p style="margin:4px 0 0; color:#4b5563;">' + htmlEscape(warrantyTerms) + '</p>' +
              '</div>' +

              '<div class="footer-grid">' +
                '<div style="text-align:center;">' +
                  '<div style="border-bottom:1px dashed #9ca3af; height:45px; width:200px; margin:0 auto 6px;"></div>' +
                  '<small style="color:#6b7280; font-weight:bold;">Assinatura do Emissor</small>' +
                '</div>' +
                '<div style="text-align:center;">' +
                  signatureHtml + '<br>' +
                  '<small style="color:#6b7280; font-weight:bold;">Aceite Formal do Cliente</small>' +
                '</div>' +
              '</div>' +
              '<div style="text-align:right; font-size:11px; color:#6b7280; margin-top:20px; border-top:1px solid #f3f4f6; padding-top:10px;">' +
                '<strong style="color:#111827; display:block; margin-bottom:2px;">Autenticidade e Transparência</strong>' +
                'Este recibo foi formalizado digitalmente de forma irrefutável por ATLAS OS e registrado no histórico do cliente.<br>' +
                '<span style="font-family:monospace; display:block; margin-top:4px;">Chave OS: ' + wo.id + '</span>' +
              '</div>' +
            '</div>' +
            
            '<script>' +
              'const shareData = {' +
                'title: "Recibo e Garantia ' + htmlEscape(wo.sequenceNumber || "OS") + '",' +
                'text: "Prezado(a) ' + htmlEscape(org.name) + ', segue a via digital do seu recibo e garantia de serviços prestados no valor total de ' + money(finalTotal) + '.",' +
                'url: window.location.href' +
              '};' +
              'document.getElementById("share-btn").addEventListener("click", async () => {' +
                'if (navigator.share) {' +
                  'try { await navigator.share(shareData); } catch(err) { console.log(err); }' +
                '} else {' +
                  'alert("Copiado link do recibo!");' +
                  'navigator.clipboard.writeText(window.location.href);' +
                '}' +
              '});' +
            '<\/script>' +
          '</body>' +
          '</html>';
      }

      async function viewReceiptTechnical() {
        const wo = activeWorkOrder();
        if (!wo) return;
        
        try {
          const tenantParam = new URLSearchParams(location.search).get("tenant") || localStorage.getItem("atlas_field_tenant") || "";
          const queryParams = [];
          if (tenantParam) queryParams.push("tenant=" + encodeURIComponent(tenantParam));
          const queryString = queryParams.length ? "?" + queryParams.join("&") : "";
          
          const branding = await call("/field/tenant-branding" + queryString);
          const htmlContent = generateReceiptTechnicalHTML(wo, branding);
          const win = window.open("", "_blank");
          if (win) {
            win.document.open();
            win.document.write(htmlContent);
            win.document.close();
          }
        } catch (e) {
          showToast("Erro", "Erro ao carregar dados de branding do emissor: " + e.message, "error");
        }
      }

      // ESTOQUE DE COMBATE (FASE 3)
      async function renderInventory(filter = "") {
        if (!state.activeOrganizationId) {
          el("inventory-grid").innerHTML = '<div class="slot"><strong>Selecione um cliente ativo para carregar o estoque de combate.</strong></div>';
          return;
        }

        try {
          const res = await call("/inventory?organizationId=" + encodeURIComponent(state.activeOrganizationId));
          const items = res.items || [];
          const normalizedFilter = filter.trim().toLowerCase();
          const filtered = items.filter(item => item.materialName.toLowerCase().includes(normalizedFilter));

          el("inventory-grid").innerHTML = filtered.map(item => {
            const isLow = item.quantity <= item.minSafetyStock;
            const statusLabel = item.quantity === 0 ? "Esgotado" : isLow ? "Abaixo do Mínimo" : "Estoque Saudável";
            const badgeClass = item.quantity === 0 ? "badge danger" : isLow ? "badge progress" : "badge done";
            
            return '<div class="op-card" style="display:flex; flex-direction:column; padding:12px; gap:8px; border: 1px solid var(--line);">' +
              '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
                '<span class="' + badgeClass + '" style="font-size:10px; margin:0;">' + statusLabel + '</span>' +
                '<span style="font-size:11px; font-weight:bold; color:var(--text-soft);">' + item.unit + '</span>' +
              '</div>' +
              '<strong style="font-size:13px; min-height:36px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; color:var(--text);">' + htmlEscape(item.materialName) + '</strong>' +
              '<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-top:4px;">' +
                '<span>Qtd: <strong style="font-size:14px; color:var(--text);">' + item.quantity + '</strong></span>' +
                '<span style="opacity:0.7;">Custo: ' + money(item.unitCost) + '</span>' +
              '</div>' +
              '<div style="font-size:10px; opacity:0.65; display:flex; justify-content:space-between;">' +
                '<span>Mín. Segurança: ' + item.minSafetyStock + '</span>' +
              '</div>' +
              '<div style="display:flex; gap:6px; margin-top:8px;">' +
                '<button type="button" class="secondary btn-adjust-qty" data-id="' + item.id + '" data-change="1" style="flex:1; padding:4px; font-size:11px; min-height:auto;">➕ Repor</button>' +
                '<button type="button" class="secondary btn-adjust-qty" data-id="' + item.id + '" data-change="-1" style="flex:1; padding:4px; font-size:11px; min-height:auto;">➖ Retirar</button>' +
              '</div>' +
            '</div>';
          }).join("") || '<div class="slot"><strong>Nenhum insumo encontrado no porta-malas.</strong></div>';

          // Attach quick adjustment handlers
          document.querySelectorAll(".btn-adjust-qty").forEach(btn => {
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-id");
              const change = Number(btn.getAttribute("data-change"));
              const item = items.find(i => i.id === id);
              if (!item) return;

              const nextQty = Math.max(0, item.quantity + change);
              await call("/inventory/" + encodeURIComponent(id), {
                method: "PATCH",
                body: JSON.stringify({ quantity: nextQty })
              });
              
              showToast("Estoque Atualizado", item.materialName + " agora possui " + nextQty + " " + item.unit + "(s).", "success");
              await renderInventory(filter);
              await renderShoppingList();
            });
          });
        } catch (e) {
          console.error("Failed to load inventory:", e);
        }
      }

      async function renderShoppingList() {
        if (!state.activeOrganizationId) return;

        try {
          const res = await call("/inventory/shopping-list?organizationId=" + encodeURIComponent(state.activeOrganizationId));
          const items = res.items || [];

          el("shopping-list-container").innerHTML = items.map(item => {
            return '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--line); padding-bottom:4px;">' +
              '<span>❌ ' + htmlEscape(item.materialName) + '</span>' +
              '<span style="font-weight:bold; color:var(--danger);">' + item.quantity + ' / ' + item.minSafetyStock + ' ' + item.unit + '</span>' +
            '</div>';
          }).join("") || '<div style="text-align:center; padding:10px; color:var(--accent);">✅ Todos os insumos estão acima do estoque mínimo!</div>';
          
          el("btn-share-shopping-whatsapp").disabled = items.length === 0;
        } catch (e) {
          console.error("Failed to load shopping list:", e);
        }
      }

      async function shareShoppingListWhatsApp() {
        if (!state.activeOrganizationId) return;
        try {
          const res = await call("/inventory/shopping-list?organizationId=" + encodeURIComponent(state.activeOrganizationId));
          const items = res.items || [];
          if (items.length === 0) return;

          let text = "🛒 *LISTA DE COMPRAS OPERACIONAL - ATLAS OS*\n\n" +
            "Olá! Preciso cotar as seguintes peças para reposição do meu estoque de combate:\n\n";
          
          items.forEach(item => {
            const needQty = Math.max(1, item.minSafetyStock * 2 - item.quantity);
            text += "• *" + item.materialName + "* - Quantidade: " + needQty + " " + item.unit + "\n";
          });

          text += "\nPor favor, envie o orçamento assim que possível. Obrigado!";
          const encoded = encodeURIComponent(text);
          window.open("https://web.whatsapp.com/send?text=" + encoded, "_blank");
        } catch (e) {
          console.error("Failed to share shopping list:", e);
        }
      }

      // COPILOTO FINANCEIRO (FASE 2) SIMULATION & SUGGESTIONS
      async function calculateMarginRealTime() {
        const form = document.forms["budget-form"];
        if (!form) return;
        
        const distance = Number(el("budget-distance")?.value || 0);
        const duration = Number(el("budget-duration")?.value || 0);
        const amount = Number(form.amount?.value || 0);
        const materialsTotal = Number(form.materialsTotal?.value || 0);
        const laborTotal = Number(form.laborTotal?.value || 0);

        // Predefined stats (Gasoline: R$5.90/L, consumption: 10km/L, transit: R$40/h)
        const fuelCost = (distance / 10) * 5.90;
        const transitCost = (duration / 60) * 40;
        const invisibleCosts = fuelCost + transitCost;

        if (el("val-fuel-cost")) el("val-fuel-cost").textContent = money(fuelCost);
        if (el("val-transit-cost")) el("val-transit-cost").textContent = money(transitCost);

        const operationalCost = materialsTotal + laborTotal + invisibleCosts;
        const netProfit = amount - operationalCost;
        const margin = amount > 0 ? Math.round((netProfit / amount) * 100) : 0;

        const marginBadge = el("real-margin-badge");
        const marginBar = el("real-margin-bar");
        const profitVal = el("real-profit-val");
        const hourlyRateVal = el("net-hourly-rate");

        if (profitVal) profitVal.textContent = money(netProfit);
        
        const durationHours = Number(form.durationHours?.value || 1);
        if (hourlyRateVal) {
          const netHourly = durationHours > 0 ? netProfit / durationHours : netProfit;
          hourlyRateVal.textContent = money(netHourly) + "/h";
        }

        if (marginBadge && marginBar) {
          marginBar.style.width = Math.min(Math.max(margin, 0), 100) + "%";
          if (margin < 15) {
            marginBadge.textContent = margin + "% - Crítica";
            marginBadge.style.background = "rgba(255, 76, 76, 0.15)";
            marginBadge.style.color = "#ff4c4c";
            marginBar.style.backgroundColor = "#ff4c4c";
          } else if (margin < 35) {
            marginBadge.textContent = margin + "% - Saudável";
            marginBadge.style.background = "rgba(255, 193, 7, 0.15)";
            marginBadge.style.color = "#ffc107";
            marginBar.style.backgroundColor = "#ffc107";
          } else {
            marginBadge.textContent = margin + "% - Excelente";
            marginBadge.style.background = "rgba(0, 240, 192, 0.15)";
            marginBadge.style.color = "var(--accent)";
            marginBar.style.backgroundColor = "var(--accent)";
          }
        }

        // Post simulation info asynchronously to server to persist stats on the work order object
        if (state.activeWorkOrderId) {
          try {
            await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/margin-simulation", {
              method: "POST",
              body: JSON.stringify({
                organizationId: state.activeOrganizationId,
                travelDistanceKm: distance,
                travelDurationMins: duration,
                vehicleConsumptionKml: 10,
                fuelPriceLiter: 5.90,
                unproductiveHourRate: 40,
                amount
              })
            });
          } catch(e) {
            console.warn("Margin simulation post failed:", e);
          }
        }
      }

      async function suggestRegionalPrice() {
        const wo = activeWorkOrder();
        if (!wo) {
          showToast("Aviso", "Selecione uma ordem de serviço antes.", "warning");
          return;
        }
        
        try {
          const org = activeOrganization();
          const orgCity = deduceOrganizationCity(org);
          const query = "/ai/pricing/regional-suggestions?serviceTitle=" + encodeURIComponent(wo.title) + 
                        "&city=" + encodeURIComponent(orgCity) + 
                        "&organizationId=" + encodeURIComponent(state.activeOrganizationId || "");
          const res = await call(query);
          const form = document.forms["budget-form"];
          if (form && res) {
            form.amount.value = String(res.average);
            showToast("IA: Preço Regional (" + res.dataSource + ")", "Sugerido: " + money(res.average) + " (" + res.category + ")", "success");
            calculateMarginRealTime();
          }
        } catch(e) {
          showToast("Erro", "Erro ao buscar sugestão regional: " + e.message, "error");
        }
      }

      // INTELIGÊNCIA AVANÇADA (FASE 4) - ANÁLISE PREDITIVA & TRANSCRIÇÃO DE VOZ
      async function runPredictiveVision() {
        if (!photoBeforeBase64) {
          showToast("Aviso", "Selecione uma foto de diagnóstico (antes) primeiro.", "warning");
          return;
        }

        const desc = el('txt-description')?.value || "";
        showToast("IA: Visão Computacional", "Analisando foto e buscando pontos de risco elétrico...", "info");

        try {
          const res = await call("/ai/vision/predictive-diagnosis", {
            method: "POST",
            body: JSON.stringify({
              photoBase64: photoBeforeBase64,
              description: desc,
              organizationId: state.activeOrganizationId
            })
          });

          if (res && res.diagnosis) {
            const diagField = el('txt-diagnosis');
            if (diagField) {
              diagField.value = res.diagnosis;
            }
            showToast("IA: Diagnóstico Gerado", "Risco: " + res.riskLevel.toUpperCase() + " (" + Math.round(res.confidence * 100) + "% Confiança)", "success");
          }
        } catch(e) {
          showToast("Erro", "Erro na análise de visão da IA: " + e.message, "error");
        }
      }

      let voiceRecordTimer = null;
      let voiceSeconds = 0;
      let voiceTargetFieldId = "";

      function startVoiceRecording(targetFieldId) {
        voiceTargetFieldId = targetFieldId;
        const overlay = el("voice-wave-overlay");
        if (overlay) overlay.style.display = "flex";

        voiceSeconds = 0;
        const timerLabel = el("voice-wave-timer");
        if (timerLabel) timerLabel.textContent = "00:00 / 00:30 (Fale de forma coloquial e clique em Parar)";

        voiceRecordTimer = setInterval(() => {
          voiceSeconds++;
          const mins = String(Math.floor(voiceSeconds / 60)).padStart(2, '0');
          const secs = String(voiceSeconds % 60).padStart(2, '0');
          if (timerLabel) {
            timerLabel.textContent = mins + ":" + secs + " / 00:30 (Fale de forma coloquial e clique em Parar)";
          }
          if (voiceSeconds >= 30) {
            stopVoiceRecording();
          }
        }, 1000);
      }

      async function stopVoiceRecording() {
        clearInterval(voiceRecordTimer);
        const overlay = el("voice-wave-overlay");
        if (overlay) overlay.style.display = "none";

        // Prompt user dictate text simulation fallback
        const spokenPrompt = window.prompt("🎙️ Transcrição de Áudio\nO que você gostaria de dizer? (IA vai reescrever em linguagem formal de engenharia):", "troquei o disjuntor queimado");
        if (spokenPrompt === null) {
          showToast("Aviso", "Gravação de voz cancelada.", "warning");
          return;
        }

        showToast("IA: Processando Voz", "Reescrevendo em linguagem técnica formal corporativa...", "info");

        try {
          const res = await call("/ai/audio/transcribe", {
            method: "POST",
            body: JSON.stringify({
              spokenPrompt,
              organizationId: state.activeOrganizationId
            })
          });

          if (res && res.transcription) {
            const targetField = el(voiceTargetFieldId);
            if (targetField) {
              targetField.value = res.transcription;
            }
            showToast("IA: Áudio Transcrito", "Sucesso! Linguagem técnica incorporada.", "success");
          }
        } catch(e) {
          showToast("Erro", "Erro ao transcrever voz: " + e.message, "error");
        }
      }

      // SUBMIT EVENT LISTENERS
      function attachDatabaseListeners() {

        // MODAL OPEN / CLOSE EVENT LISTENERS FOR THE WORK ORDER FORM
        el('btn-close-work-order-modal')?.addEventListener('click', () => {
          el('work-order-modal').classList.remove('open');
          resetWorkOrderForm();
        });
        
        el('work-order-cancel-btn')?.addEventListener('click', () => {
          el('work-order-modal').classList.remove('open');
          resetWorkOrderForm();
        });

        // Trigger opening of work-order-modal on Nova OS click
        document.querySelectorAll('[data-quick="work-order"]').forEach(btn => {
          btn.addEventListener('click', () => {
            resetWorkOrderForm();
            el('work-order-modal-title').textContent = "🛠 Criar Nova Ordem de Serviço";
            el('work-order-submit-btn').textContent = "Abrir OS";
            el('work-order-modal').classList.add('open');
          });
        });

        // Trigger opening of work-order-modal on Editar OS click
        el('edit-work-order')?.addEventListener('click', () => {
          const wo = activeWorkOrder();
          if (!wo) return;
          el('work-order-modal-title').textContent = "🛠 Editar Ordem de Serviço";
          el('work-order-submit-btn').textContent = "Salvar Alterações";
          el('work-order-modal').classList.add('open');
        });


        el('view-laudo-btn')?.addEventListener('click', viewLaudoTechnical);
        el('share-whatsapp-btn')?.addEventListener('click', shareLaudoWhatsApp);
        el('view-recibo-btn')?.addEventListener('click', viewReceiptTechnical);

        el('btn-add-material-modal')?.addEventListener('click', () => el('material-create-modal').classList.add('open'));
        el('btn-close-material-modal')?.addEventListener('click', () => el('material-create-modal').classList.remove('open'));
        el('material-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = el('material-title-input').value.trim();
          const unit = el('material-unit-select').value;
          const value = Number(el('material-value-input').value || 0);
          const marginEnabled = el('material-margin-toggle').checked;

          const created = await call("/materials", {
            method: "POST",
            body: JSON.stringify({ title, unit, value, marginEnabled })
          });
          state.materials = [created.material, ...state.materials];
          
          el('material-create-modal').classList.remove('open');
          el('material-create-form').reset();
          renderMaterials();
          renderToolsMetrics();
          showToast("Material Cadastrado", "Material adicionado ao banco de dados com sucesso!", "success");
        });

        el('search-materials-input')?.addEventListener('input', (e) => {
          renderMaterials(e.target.value);
        });

        el('btn-add-service-modal')?.addEventListener('click', () => el('service-create-modal').classList.add('open'));
        el('btn-close-service-modal')?.addEventListener('click', () => el('service-create-modal').classList.remove('open'));
        el('service-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = el('service-title-input').value.trim();
          const hourlyEnabled = el('service-hourly-toggle').checked;
          const value = Number(el('service-value-input').value || 0);

          const created = await call("/services", {
            method: "POST",
            body: JSON.stringify({ title, hourlyEnabled, value })
          });
          state.services = [created.service, ...state.services];

          el('service-create-modal').classList.remove('open');
          el('service-create-form').reset();
          renderServices();
          renderToolsMetrics();
          showToast("Serviço Cadastrado", "Serviço adicionado ao banco de dados com sucesso!", "success");
        });

        el('search-services-input')?.addEventListener('input', (e) => {
          renderServices(e.target.value);
        });

        setupRealtimeTableFilter();

        el('btn-open-category-modal')?.addEventListener('click', () => {
          el('category-create-modal').classList.add('open');
          initExpenseModalPickers();
        });
        el('btn-close-category-modal')?.addEventListener('click', () => el('category-create-modal').classList.remove('open'));
        el('btn-cancel-category-creation')?.addEventListener('click', () => el('category-create-modal').classList.remove('open'));
        el('category-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = el('category-name-input').value.trim();

          const created = await call("/expense-categories", {
            method: "POST",
            body: JSON.stringify({ name, icon: selectedCategoryIcon, color: selectedCategoryColor })
          });
          state.expenseCategories = [...state.expenseCategories, created.category];

          el('category-create-modal').classList.remove('open');
          el('category-create-form').reset();
          renderCategoriesGrid();
          populateCategorySelect();
          showToast("Categoria Criada", "Categoria salva no banco de dados com sucesso!", "success");
        });

        el('btn-open-expense-modal')?.addEventListener('click', () => {
          el('expense-create-modal').classList.add('open');
          populateCategorySelect();
          el('expense-date-input').value = todayIso;
        });
        el('btn-close-expense-modal')?.addEventListener('click', () => el('expense-create-modal').classList.remove('open'));
        el('btn-cancel-expense-creation')?.addEventListener('click', () => el('expense-create-modal').classList.remove('open'));
        el('expense-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const description = el('expense-description-input').value.trim();
          const value = Number(el('expense-value-input').value || 0);
          const expenseDate = el('expense-date-input').value;
          const categoryId = el('expense-category-select').value;

          const created = await call("/expenses", {
            method: "POST",
            body: JSON.stringify({ description, value, expenseDate, categoryId })
          });
          state.expenses = [created.expense, ...state.expenses];

          el('expense-create-modal').classList.remove('open');
          el('expense-create-form').reset();
          const filter = el('expense-month-filter');
          renderExpensesLedger(filter ? filter.value : todayIso.slice(0, 7));
          renderCategoriesGrid();
          showToast("Gasto Registrado", "Despesa salva no banco de dados com sucesso!", "success");
        });

        el('expense-month-filter')?.addEventListener('change', (e) => {
          renderExpensesLedger(e.target.value);
        });

        const originalNavigate = navigate;
        navigate = function(tab) {
          originalNavigate(tab);
          if (tab === 'tools') {
            renderToolsMetrics();
            closeToolPanels();
          } else if (tab === 'finance') {
            populateExpenseMonthFilter();
            renderCategoriesGrid();
            const filter = el('expense-month-filter');
            renderExpensesLedger(filter ? filter.value : todayIso.slice(0, 7));
          } else if (tab === 'inventory') {
            renderInventory();
            renderShoppingList();
          }
        };

        el('btn-add-client-modal')?.addEventListener('click', () => el('client-create-modal').classList.add('open'));
        el('btn-close-client-modal')?.addEventListener('click', () => el('client-create-modal').classList.remove('open'));
        el('client-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = el('client-name-input').value.trim();
          const documentStr = el('client-doc-input').value.trim();
          const phone = el('client-phone-input').value.trim();
          const email = el('client-email-input').value.trim();
          const address = el('client-address-input').value.trim();

          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 6);
          const created = await call("/organizations", {
            method: "POST",
            body: JSON.stringify({ name, slug, type: documentStr.length > 11 ? "corporate" : "private", document: documentStr, phone, email, address })
          });

          state.organizations = [created.organization, ...state.organizations];
          renderSelectors();
          
          el('client-create-modal').classList.remove('open');
          el('client-create-form').reset();
          
          // Auto-select newly created client in OS form context
          await selectWorkOrderCustomer(created.organization.id);
          
          renderClientsList();
          renderToolsMetrics();
          showToast("Cliente Cadastrado", "Novo cliente criado e selecionado na OS com sucesso!", "success");
        });

        el('search-clients-input')?.addEventListener('input', (e) => {
          renderClientsList(e.target.value);
        });

        setupAutocomplete('material-title-input', 'material-autocomplete-list', mockMaterialSuggestions);
        setupAutocomplete('service-title-input', 'service-autocomplete-list', mockServiceSuggestions);
        setupToolsHubHandlers();

        // BIND FASE 3 INVENTORY EVENTS
        el('btn-open-inventory-modal')?.addEventListener('click', () => el('inventory-create-modal').classList.add('open'));
        el('btn-close-inventory-modal')?.addEventListener('click', () => el('inventory-create-modal').classList.remove('open'));
        el('btn-cancel-inventory-creation')?.addEventListener('click', () => el('inventory-create-modal').classList.remove('open'));
        
        el('search-inventory-input')?.addEventListener('input', (e) => {
          renderInventory(e.target.value);
        });

        el('btn-share-shopping-whatsapp')?.addEventListener('click', shareShoppingListWhatsApp);

        el('inventory-create-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const materialName = el('inv-material-name').value.trim();
          const quantity = Number(el('inv-quantity').value || 0);
          const unit = el('inv-unit').value;
          const minSafetyStock = Number(el('inv-min-safety').value || 0);
          const unitCost = Number(el('inv-unit-cost').value || 0);

          await call("/inventory", {
            method: "POST",
            body: JSON.stringify({
              organizationId: state.activeOrganizationId,
              materialName,
              quantity,
              unit,
              minSafetyStock,
              unitCost
            })
          });

          el('inventory-create-modal').classList.remove('open');
          el('inventory-create-form').reset();
          showToast("Insumo Cadastrado", "Peça adicionada ao porta-malas com sucesso!", "success");
          await renderInventory();
          await renderShoppingList();
        });

        // BIND FASE 2 EVENT LISTENERS FOR BUDGET & COPILOTO
        el('btn-suggest-regional')?.addEventListener('click', suggestRegionalPrice);
        
        const bForm = document.forms["budget-form"];
        if (bForm) {
          ['materialsTotal', 'laborTotal', 'durationHours', 'amount'].forEach(fieldName => {
            bForm[fieldName]?.addEventListener('input', calculateMarginRealTime);
            bForm[fieldName]?.addEventListener('change', calculateMarginRealTime);
          });
        }
        el('budget-distance')?.addEventListener('input', calculateMarginRealTime);
        el('budget-duration')?.addEventListener('input', calculateMarginRealTime);

        // BIND FASE 4 AI AUDIO & VISION LISTENERS
        el('btn-predictive-vision')?.addEventListener('click', runPredictiveVision);
        
        el('btn-mic-description')?.addEventListener('click', () => startVoiceRecording('txt-description'));
        el('btn-mic-diagnosis')?.addEventListener('click', () => startVoiceRecording('txt-diagnosis'));
        el('btn-stop-voice')?.addEventListener('click', stopVoiceRecording);
      }

      // --- Lógica de Autenticação PWA e PIN ---
      let typedPin = "";

      function updatePinUI() {
        for (let i = 1; i <= 4; i++) {
          const dot = el("pin-dot-" + i);
          if (dot) {
            if (i <= typedPin.length) {
              dot.style.background = "var(--accent)";
            } else {
              dot.style.background = "transparent";
            }
          }
        }
      }

      async function handleNumKeyPress(val) {
        if (typedPin.length < 4) {
          typedPin += val;
          updatePinUI();
        }

        if (typedPin.length === 4) {
          const deviceProfile = JSON.parse(localStorage.getItem("atlas_device_profile") || "{}");
          if (!deviceProfile.email || !deviceProfile.deviceToken) {
            showToast("Erro", "Dispositivo não pareado. Faça o pareamento primeiro.", "danger");
            resetPinVerification();
            return;
          }

          try {
            const res = await call("/auth/pin/verify", {
              method: "POST",
              body: JSON.stringify({
                email: deviceProfile.email,
                pin: typedPin,
                deviceToken: deviceProfile.deviceToken
              })
            });

            if (res.ok && res.token) {
              const session = {
                username: res.user.name,
                target: res.user.isStandalone ? "field" : "enterprise",
                tenantCode: res.user.tenantCode,
                email: res.user.email,
                token: res.token,
                user: res.user,
                issuedAt: new Date().toISOString()
              };
              localStorage.setItem("atlas_login_session", JSON.stringify(session));
              
              toggleFieldViewMode(res.user.isStandalone);

              showToast("Bem-vindo", "Desbloqueado com sucesso!", "success");
              resetPinVerification();
              await checkAuthAndInitialize();
            }
          } catch (err) {
            showToast("Erro", err.message || "PIN inválido ou falha na autenticação.", "danger");
            resetPinVerification();
          }
        }
      }

      function resetPinVerification() {
        typedPin = "";
        updatePinUI();
      }

      function toggleFieldViewMode(isStandalone) {
        const roleBadge = el("profile-chip");
        if (roleBadge) roleBadge.textContent = isStandalone ? "Autônomo" : "Técnico";
        
        const profileRoleBadge = el("profile-pwa-role-badge");
        if (profileRoleBadge) profileRoleBadge.textContent = isStandalone ? "Autônomo" : "Técnico";

        const adminBtn = document.querySelector('[data-tab="admin"]');
        if (adminBtn) adminBtn.style.display = isStandalone ? "none" : "flex";
      }

      function setupPinFlow() {
        // Ensure deviceToken exists in localStorage
        let deviceToken = localStorage.getItem("atlas_device_token");
        if (!deviceToken) {
          deviceToken = "dev_" + Math.random().toString(36).substring(2, 18);
          localStorage.setItem("atlas_device_token", deviceToken);
        }

        // Apply dynamic phone mask (e.g. (11) 99999-9999)
        const phoneInput = el("login-phone");
        if (phoneInput) {
          phoneInput.addEventListener("input", (e) => {
            let x = e.target.value.replace(/\D/g, "").match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : "(" + x[1] + ") " + x[2] + (x[3] ? "-" + x[3] : "");
          });
        }

        const loginFormSubmit = async () => {
          const phone = el("login-phone").value.trim();
          const pin = el("login-pin").value.trim();

          if (!phone || !pin) {
            showToast("Erro", "Preencha o celular e o PIN.", "danger");
            return;
          }

          if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            showToast("Erro", "O PIN deve ter exatamente 4 dígitos.", "danger");
            return;
          }

          try {
            const res = await call("/auth/pin/verify", {
              method: "POST",
              body: JSON.stringify({
                phone,
                pin,
                deviceToken
              })
            });

            if (res.ok && res.token) {
              const session = {
                username: res.user.name,
                target: res.user.isStandalone ? "field" : "enterprise",
                tenantCode: res.user.tenantCode,
                email: res.user.email,
                token: res.token,
                user: res.user,
                issuedAt: new Date().toISOString()
              };
              localStorage.setItem("atlas_login_session", JSON.stringify(session));
              
              toggleFieldViewMode(res.user.isStandalone);

              showToast("Bem-vindo", "Acesso liberado com sucesso!", "success");
              await checkAuthAndInitialize();
            }
          } catch (err) {
            showToast("Falha de Login", err.message || "Erro na autenticação.", "danger");
          }
        };

        el("btn-login-pwa")?.addEventListener("click", loginFormSubmit);
        el("login-pin")?.addEventListener("keydown", (e) => {
          if (e.key === "Enter") loginFormSubmit();
        });
        el("login-phone")?.addEventListener("keydown", (e) => {
          if (e.key === "Enter") el("login-pin").focus();
        });
      }

      async function checkAuthAndInitialize() {
        const sessionStr = localStorage.getItem("atlas_login_session");
        const appContainer = document.querySelector(".app");
        const loginContainer = el("login-view");

        if (sessionStr) {
          document.body.classList.remove("not-logged-in");
          appContainer.style.display = "grid";
          loginContainer.style.display = "none";
          
          const session = JSON.parse(sessionStr);
          toggleFieldViewMode(session.user?.isStandalone ?? false);
          
          await load(); 
        } else {
          document.body.classList.add("not-logged-in");
          appContainer.style.display = "none";
          loginContainer.style.display = "flex";
        }
      }

      attachDatabaseListeners();
      setupPinFlow();

      checkAuthAndInitialize().catch((error) => {
        el("health-label").textContent = "API offline";
        document.querySelector(".status-dot").style.background = "var(--danger)";
        document.querySelector(".status-dot").style.boxShadow = "0 0 14px var(--danger)";
        console.error(error);
      });
    </script>
  </body>
</html>`;

function listen(port: number): void {
  const server = createServer((request, response) => {
    const url = request.url ?? "/";

    if (url === "/manifest.json") {
      try {
        let manifestPath = join(__dirname, "manifest.json");
        if (!existsSync(manifestPath)) {
          manifestPath = join(__dirname, "..", "src", "manifest.json");
        }
        const content = readFileSync(manifestPath, "utf8");
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(content);
        return;
      } catch (err) {
        response.writeHead(500, { "content-type": "text/plain" });
        response.end("Error loading manifest.json");
        return;
      }
    }

    if (url === "/sw.js") {
      try {
        let swPath = join(__dirname, "sw.js");
        if (!existsSync(swPath)) {
          swPath = join(__dirname, "..", "src", "sw.js");
        }
        const content = readFileSync(swPath, "utf8");
        response.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
        response.end(content);
        return;
      } catch (err) {
        response.writeHead(500, { "content-type": "text/plain" });
        response.end("Error loading sw.js");
        return;
      }
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });

  server.once("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      server.close();
      listen(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Atlas OS Field listening on http://localhost:${port}`);
  });
}

listen(preferredPort);
