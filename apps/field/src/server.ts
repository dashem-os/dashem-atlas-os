import { createServer } from "node:http";

const preferredPort = Number(process.env.ATLAS_FIELD_PORT ?? 5174);

const html = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#07131c" />
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
      .op-card.purple .op-icon, .op-card.purple strong { color: #b985ff; }

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
          <button data-tab="ai"><span>✦</span>Assistente IA</button>
          <button data-tab="profile"><span>○</span>Perfil</button>
        </div>
        <div class="side-group">
          <div class="side-label">Apoio</div>
          <button data-tab="admin"><span>⚙</span>Configurações</button>
          <button data-tab="admin"><span>⇄</span>Integrações</button>
          <button data-tab="admin"><span>□</span>Relatórios avançados</button>
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
            <section class="panel">
              <div class="panel-title">
                <h2>Ordens de Serviço</h2>
                <button class="secondary" data-quick="work-order">Nova OS</button>
              </div>
              <div class="tabs">
                <button class="tab active" data-filter="all">Todas</button>
                <button class="tab" data-filter="open">Em aberto</button>
                <button class="tab" data-filter="progress">Em andamento</button>
                <button class="tab" data-filter="done">Concluidas</button>
              </div>
              <div class="order-list" id="work-order-list"></div>
            </section>
            <aside class="panel">
              <div class="panel-title">
                <h3>OS selecionada</h3>
                <span class="chip" id="selected-state">Aguardando</span>
              </div>
              <div id="selected-work-order" class="slot">Selecione uma OS para operar.</div>
              <div class="actions" style="margin-top: 12px">
                <button id="attach-evidence" class="secondary">Evidência</button>
                <button id="diagnosis-agent" class="secondary">Diagnóstico IA</button>
                <button id="budget-agent" class="secondary">Orçamento IA</button>
                <button id="submit-budget" class="primary">Enviar orçamento</button>
                <button id="approve-budget" class="secondary">Aprovar</button>
                <button id="start-work" class="secondary">Executar</button>
                <button id="close-work" class="secondary">Encerrar</button>
                <button id="edit-work-order" class="secondary">Editar</button>
                <button id="cancel-work-order" class="secondary" style="border-color: var(--danger); color: var(--danger);">Cancelar</button>
                <button id="delete-work-order" class="secondary" style="border-color: var(--danger); color: var(--danger);">Excluir</button>
              </div>
            </aside>
          </div>

          <div class="orders-layout">
            <form id="work-order-form" class="panel">
              <div class="panel-title"><h3>Nova ordem de serviço</h3></div>
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
              <label>Título<input name="title" placeholder="Manutenção em ar condicionado split" required /></label>
              <label>Descrição<textarea name="description"></textarea></label>
              <div class="inline">
                <label>Técnico<input name="technicianName" /></label>
                <label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
              </div>
              <div class="inline">
                <label>SLA / prazo<input name="dueAt" type="datetime-local" /></label>
                <label>Duração estimada (h)<input name="estimatedDurationHours" type="number" min="0" step="0.5" /></label>
              </div>
              <label>Diagnóstico<textarea name="diagnosis"></textarea></label>
              
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
              <div id="work-order-form-actions" style="display: flex; gap: 8px; margin-top: 6px;">
                <button class="primary" type="submit" style="flex: 1;" id="work-order-submit-btn">Abrir OS</button>
                <button class="secondary" type="button" id="work-order-cancel-btn" style="display: none; flex: 1;">Cancelar Edição</button>
              </div>
            </form>

            <form id="budget-form" class="panel">
              <div class="panel-title"><h3>Composição de orçamento</h3></div>
              <div class="inline">
                <label>Materiais<input name="materialsTotal" type="number" min="0" step="0.01" /></label>
                <label>Mão de obra<input name="laborTotal" type="number" min="0" step="0.01" /></label>
              </div>
              <div class="inline">
                <label>Margem (%)<input name="marginPercent" type="number" min="0" step="0.01" value="20" /></label>
                <label>Duração (h)<input name="durationHours" type="number" min="0" step="0.5" /></label>
              </div>
              <div class="inline">
                <label>Risco<select name="riskLevel"><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></label>
                <label>Preço final<input name="amount" type="number" min="0" step="0.01" required /></label>
              </div>
              <label>Notas<textarea name="notes"></textarea></label>
            </form>
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
          <div class="summary" id="finance-metrics"></div>
          <div class="finance-grid">
            <div class="panel"><div class="panel-title"><h2>Fluxo de caixa</h2></div><div id="cashflow" class="smart-slots"></div></div>
            <div class="panel"><div class="panel-title"><h2>Inadimplência</h2></div><div class="slot"><strong>Sem bloqueios críticos</strong><small>Use a IA para prever atraso por cliente e OS.</small></div></div>
            <div class="panel"><div class="panel-title"><h2>Faturamento</h2></div><div class="slot"><strong id="billing-total">R$ 0,00</strong><small>Receita aprovada em ordens ativas.</small></div></div>
          </div>
        </div>

        <div id="ai" class="view">
          <div class="ai-grid" id="agent-cards"></div>
          <pre id="agent-output">{}</pre>
        </div>

        <div id="profile" class="view">
          <div class="panel" style="max-width: 480px; margin: 0 auto 16px auto;">
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
            </form>
          </div>

          <div class="panel" style="max-width: 480px; margin: 0 auto;">
            <div class="panel-title"><h2>Status operacional</h2><span class="chip">PWA</span></div>
            <div class="smart-slots">
              <div class="slot"><strong>Instalável na tela inicial</strong><small>Interface priorizada para uso em campo e toque rápido.</small></div>
              <div class="slot"><strong>Offline parcial</strong><small>Fluxos críticos podem evoluir para fila local quando a API estiver fora.</small></div>
              <div class="slot"><strong>Notificações push</strong><small>Pronto para alertas de SLA, aprovação e chamados pendentes.</small></div>
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
        <header class="modal-header">
          <h3 id="modal-title">Detalhes do Agendamento</h3>
          <span class="badge" id="modal-status-badge">scheduled</span>
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
        <header class="modal-header">
          <h3 id="confirm-modal-title">Confirmação</h3>
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

    <nav class="bottom" aria-label="Navegacao principal">
      <button class="active" data-tab="home"><b>⌂</b><span>Home</span></button>
      <button data-tab="orders"><b>▣</b><span>OS</span></button>
      <button data-tab="agenda"><b>◇</b><span>Agenda</span></button>
      <button data-tab="finance"><b>$</b><span>Financeiro</span></button>
      <button data-tab="ai"><b>✦</b><span>IA</span></button>
      <button data-tab="profile"><b>○</b><span>Perfil</span></button>
    </nav>

    <script>
      const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
      const todayIso = new Date().toISOString().slice(0, 10);
      const state = { organizations: [], assets: [], workOrders: [], appointments: [], activeOrganizationId: "", activeWorkOrderId: "", filter: "all", agendaMonth: todayIso.slice(0, 7), agendaDate: todayIso, user: { configured: false, tenantCode: "#00", accessLevel: "field_operator" }, formMaterials: [] };
      let editingWorkOrderId = null;
      let pendingWorkOrderCustomerName = "";

      localStorage.removeItem("atlas_user_profile");

      const el = (id) => document.getElementById(id);
      const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const asNumber = (value) => value === "" || value === null || value === undefined ? undefined : Number(value);
      const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
      const dateLabel = (isoDate) => new Date(isoDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const dateTimeLabel = (isoDateTime) => new Date(isoDateTime).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

      async function call(path, options) {
        const response = await fetch(apiBase + path, { headers: { "content-type": "application/json" }, ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || "HTTP " + response.status);
        return data;
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
        const ok = await showConfirm("Cliente ainda nao cadastrado", 'Nao encontrei "' + customerName + '". Deseja cadastrar esse cliente agora?');
        if (!ok) {
          el("work-order-customer-search").focus();
          return;
        }
        pendingWorkOrderCustomerName = customerName;
        navigate("admin");
        const form = el("organization-form");
        const nameInput = form.querySelector('[name="name"]');
        nameInput.value = customerName;
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInput.focus();
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
          state.user = { configured: false, tenantCode: "#00", accessLevel: "field_operator" };
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
      }

      function renderOperationCards() {
        const hasOrganization = Boolean(state.activeOrganizationId);
        const hasWorkOrder = Boolean(activeWorkOrder());
        const cards = [
          { title: "Nova OS", detail: hasOrganization ? "Abrir ordem" : "Requer cliente", icon: "OS", tone: "blue", action: "work-order", enabled: hasOrganization },
          { title: "Orcamento", detail: hasWorkOrder ? "Preencher proposta" : "Requer OS selecionada", icon: "$", tone: "green", action: "budget", enabled: hasWorkOrder },
          { title: "Clientes", detail: "Cadastrar cliente", icon: "CL", tone: "purple", action: "client", enabled: true },
          { title: "Ativos", detail: hasOrganization ? "Cadastrar equipamento" : "Requer cliente", icon: "AT", tone: "blue", action: "admin", enabled: true },
          { title: "Financeiro", detail: "Calculado por OS aprovada", icon: "$", tone: "blue", action: "finance", enabled: true },
          { title: "Assistente IA", detail: hasWorkOrder ? "Usar OS selecionada" : "Requer OS selecionada", icon: "AI", tone: "orange", action: "ai", enabled: hasWorkOrder },
          { title: "Estoque", detail: "Planejado: cadastro de pecas", icon: "PK", tone: "orange", action: "", enabled: false },
          { title: "Agenda", detail: "Calendario e lembretes", icon: "AG", tone: "purple", action: "agenda", enabled: true },
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
          const count = state.appointments.filter((item) => item.scheduledAt.slice(0, 10) === iso).length;
          const classes = [
            "calendar-day",
            current.getMonth() === month - 1 ? "" : "muted",
            iso === state.agendaDate ? "selected" : "",
            count > 0 ? "has-items" : ""
          ].filter(Boolean).join(" ");
          days.push('<button class="' + classes + '" data-agenda-date="' + iso + '"><span class="day-number">' + current.getDate() + '</span><span class="day-count">' + (count ? count + " agendamento(s)" : "") + '</span></button>');
        }

        el("agenda-calendar").innerHTML = days.join("");
        const selected = state.appointments
          .filter((item) => item.scheduledAt.slice(0, 10) === state.agendaDate)
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
          });
        el("agenda-selected-title").textContent = dateLabel(state.agendaDate);
        el("agenda-day-list").innerHTML = selected.length
          ? selected.map((item) => {
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
            }).join("")
          : '<div class="slot"><strong>Nenhum agendamento neste dia.</strong><small>Preencha o formulário para criar um compromisso rastreável.</small></div>';

        document.querySelectorAll("div.slot-clickable").forEach((slotDiv) => {
          slotDiv.addEventListener("click", (e) => {
            if (e.target.closest(".slot-actions")) {
              return; // let the action button click handler handle it
            }
            const id = slotDiv.getAttribute("data-appointment-id");
            showAppointmentModal(id);
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

        // Auto-sync Novo Agendamento form date with the selected agenda date
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
          if (state.filter === "open") return wo.state === "opened" || wo.state === "budget_submitted";
          if (state.filter === "progress") return wo.state === "approved" || wo.state === "in_progress";
          if (state.filter === "done") return wo.state === "closed";
          return true;
        });
      }

      function stateBadge(wo) {
        if (wo.state === "closed") return '<span class="badge done">Concluida</span>';
        if (wo.state === "approved" || wo.state === "in_progress") return '<span class="badge progress">Em andamento</span>';
        return '<span class="badge">Em aberto</span>';
      }

      function renderWorkOrders() {
        el("work-order-list").innerHTML = filteredOrders().map((wo) => {
          const asset = state.assets.find((item) => item.id === wo.assetId);
          const selected = wo.id === state.activeWorkOrderId ? " selected" : "";
          const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);
          return '<button class="order-card' + selected + '" data-wo="' + wo.id + '"><span class="order-head"><strong>' + htmlEscape(displayName) + '</strong>' + stateBadge(wo) + '</span><p>Cliente: ' + htmlEscape(activeOrganization()?.name || "") + '</p><p>Equipamento: ' + htmlEscape(asset?.name || wo.assetId) + '</p><p>' + htmlEscape(wo.dueAt || "Sem prazo definido") + '</p></button>';
        }).join("") || '<div class="slot"><strong>Nenhuma OS encontrada.</strong><small>Use o botao + para criar a primeira ordem.</small></div>';

        document.querySelectorAll("[data-wo]").forEach((row) => {
          row.addEventListener("click", async () => {
            state.activeWorkOrderId = row.getAttribute("data-wo") || "";
            await refreshTimeline();
            render();
          });
        });
      }

      function renderSelectedWorkOrder() {
        const wo = activeWorkOrder();
        const hasWorkOrder = Boolean(wo);
        ["attach-evidence", "diagnosis-agent", "budget-agent", "submit-budget", "approve-budget", "start-work", "close-work", "edit-work-order", "cancel-work-order", "delete-work-order"].forEach((id) => {
          const button = el(id);
          if (button) button.disabled = !hasWorkOrder;
        });
        if (hasWorkOrder) {
          const isDoneOrCancelled = wo.state === "closed" || wo.state === "cancelled";
          if (el("edit-work-order")) el("edit-work-order").disabled = isDoneOrCancelled;
          if (el("cancel-work-order")) el("cancel-work-order").disabled = isDoneOrCancelled;
        }
        el("work-order-form").querySelector('button[type="submit"]').disabled = !state.activeOrganizationId;
        if (!wo) {
          el("selected-work-order").innerHTML = state.activeOrganizationId
            ? "Abra uma OS para liberar evidencia, IA, orcamento e execucao. Se nao houver ativo, eu crio um atendimento geral automaticamente."
            : "Cadastre ou selecione um cliente para abrir a primeira OS.";
          el("selected-state").textContent = "Aguardando";
          return;
        }
        const materials = (wo.materials || []).map((item) => item.name + " x" + item.quantity + " = " + money(item.totalPrice)).join("<br>");
        el("selected-state").textContent = wo.state;
        const displayName = wo.sequenceNumber ? wo.sequenceNumber : "OS #" + wo.id.substring(0, 8);

        const org = activeOrganization();
        const clientHtml = org
          ? "<small style='display: block; margin-top: 4px;'>Cliente: <strong>" + htmlEscape(org.name) + "</strong>" + (org.document ? " (" + htmlEscape(org.document) + ")" : "") + "</small>" +
            (org.phone ? "<small style='display: block;'>Telefone: " + htmlEscape(org.phone) + "</small>" : "") +
            (org.address ? "<small style='display: block;'>Endereço: " + htmlEscape(org.address) + "</small>" : "")
          : "<small style='display: block; margin-top: 4px;'>Cliente: não definido</small>";

        el("selected-work-order").innerHTML =
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
        const data = totals();
        el("finance-metrics").innerHTML = [
          ["Caixa previsto", money(data.margin), "accent"],
          ["Receita aprovada", money(data.revenue), ""],
          ["Custo aberto", money(data.cost), ""],
          ["OS abertas", data.open, "accent"]
        ].map((item) => '<div class="metric"><strong class="' + item[2] + '">' + htmlEscape(item[1]) + '</strong><span>' + item[0] + '</span></div>').join("");
        el("cashflow").innerHTML = [
          ["Entradas", money(data.revenue)],
          ["Saídas", money(data.cost)],
          ["Saldo operacional", money(data.margin)]
        ].map((item) => '<div class="slot"><strong>' + item[0] + '</strong><small>' + item[1] + '</small></div>').join("");
        el("billing-total").textContent = money(data.revenue);
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
          return;
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
        const tab = event.target.closest("[data-tab]");
        if (tab) navigate(tab.dataset.tab);

        const quick = event.target.closest("[data-quick]");
        if (quick) {
          const action = quick.dataset.quick;
          if (action === "work-order") navigate("orders");
          if (action === "budget") { navigate("orders"); document.forms["budget-form"].scrollIntoView({ behavior: "smooth", block: "center" }); }
          if (action === "client" || action === "admin") navigate("admin");
          if (action === "finance") navigate("finance");
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

      function startEditWorkOrder(wo) {
        if (!wo) return;
        editingWorkOrderId = wo.id;
        const form = el("work-order-form");
        form.querySelector('.panel-title h3').textContent = "Editar ordem de serviço";
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
        
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function resetWorkOrderForm() {
        editingWorkOrderId = null;
        const form = el("work-order-form");
        form.reset();
        form.querySelector('.panel-title h3').textContent = "Nova ordem de serviço";
        el("work-order-submit-btn").textContent = "Abrir OS";
        el("work-order-cancel-btn").style.display = "none";
        state.formMaterials = [];
        renderFormMaterials();
        renderSelectors();
      }

      el("work-order-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        
        try {
          const assetId = await ensureAssetForWorkOrder(data.title);
          const payload = {
            organizationId: state.activeOrganizationId,
            assetId,
            title: data.title,
            description: data.description,
            technicianName: data.technicianName,
            priority: data.priority,
            dueAt: data.dueAt ? new Date(String(data.dueAt)).toISOString() : undefined,
            diagnosis: data.diagnosis,
            estimatedDurationHours: asNumber(data.estimatedDurationHours),
            laborHours: asNumber(data.laborHours),
            laborRate: asNumber(data.laborRate),
            sequenceNumber: data.sequenceNumber,
            materials: state.formMaterials || []
          };

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

      el("attach-evidence").addEventListener("click", async () => {
        requireWorkOrder();
        const title = window.prompt("Título da evidência");
        if (!title) return;
        const notes = window.prompt("Notas da evidência") || "";
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/evidence", {
          method: "POST",
          body: JSON.stringify({ organizationId: state.activeOrganizationId, kind: "note", title, notes })
        });
        await load();
      });

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

      el("submit-budget").addEventListener("click", async () => {
        requireWorkOrder();
        const form = document.forms["budget-form"];
        const data = Object.fromEntries(new FormData(form).entries());
        Object.keys(data).forEach((key) => { if (key !== "riskLevel" && key !== "notes") data[key] = asNumber(data[key]) || 0; });
        data.organizationId = state.activeOrganizationId;
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/budget", { method: "POST", body: JSON.stringify(data) });
        await load();
      });

      el("approve-budget").addEventListener("click", async () => {
        requireWorkOrder();
        await call("/workflow/approvals", { method: "POST", body: JSON.stringify({ organizationId: state.activeOrganizationId, subjectId: state.activeWorkOrderId, requestedBy: "web-operator", decision: "approved" }) });
        await load();
      });

      el("start-work").addEventListener("click", async () => {
        requireWorkOrder();
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/status", { method: "PATCH", body: JSON.stringify({ organizationId: state.activeOrganizationId, state: "in_progress", reason: "Execução iniciada pelo cockpit." }) });
        await load();
      });

      el("close-work").addEventListener("click", async () => {
        requireWorkOrder();
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/status", { method: "PATCH", body: JSON.stringify({ organizationId: state.activeOrganizationId, state: "closed", reason: "Serviço encerrado pelo cockpit." }) });
        await load();
      });

      el("edit-work-order").addEventListener("click", () => {
        requireWorkOrder();
        const wo = activeWorkOrder();
        startEditWorkOrder(wo);
      });

      el("work-order-cancel-btn").addEventListener("click", () => {
        resetWorkOrderForm();
      });

      el("cancel-work-order").addEventListener("click", async () => {
        requireWorkOrder();
        const ok = await showConfirm("Cancelar Ordem de Serviço", "Deseja realmente cancelar esta ordem de serviço?");
        if (!ok) return;
        try {
          await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/status", {
            method: "PATCH",
            body: JSON.stringify({ organizationId: state.activeOrganizationId, state: "cancelled", reason: "Cancelado pelo cockpit." })
          });
          showToast("Sucesso", "Ordem de serviço cancelada com sucesso.");
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao cancelar ordem de serviço: " + error.message, "error");
        }
      });

      el("delete-work-order").addEventListener("click", async () => {
        requireWorkOrder();
        const ok = await showConfirm("Excluir Ordem de Serviço", "Deseja realmente excluir esta ordem de serviço? Esta ação é irreversível e removerá todas as evidências, relatórios e IA associados.");
        if (!ok) return;
        try {
          await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "?organizationId=" + encodeURIComponent(state.activeOrganizationId), {
            method: "DELETE"
          });
          state.activeWorkOrderId = "";
          showToast("Sucesso", "Ordem de serviço excluída com sucesso.");
          await load();
        } catch (error) {
          showToast("Erro", "Erro ao excluir ordem de serviço: " + error.message, "error");
        }
      });

      load().catch((error) => {
        el("health-label").textContent = "API offline";
        document.querySelector(".status-dot").style.background = "var(--danger)";
        document.querySelector(".status-dot").style.boxShadow = "0 0 14px var(--danger)";
        console.error(error);
      });
    </script>
  </body>
</html>`;

function listen(port: number): void {
  const server = createServer((_request, response) => {
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
