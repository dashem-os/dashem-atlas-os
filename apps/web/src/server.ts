import { createServer } from "node:http";

const port = Number(process.env.ATLAS_WEB_PORT ?? 5173);

const html = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Atlas OS</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f3ee;
        color: #202426;
      }

      body { margin: 0; }

      main {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 264px 1fr;
      }

      nav {
        background: #202426;
        color: #f8f5ed;
        padding: 28px 22px;
      }

      nav h1 {
        margin: 0 0 26px;
        font-size: 24px;
        letter-spacing: 0;
      }

      nav span {
        display: block;
        color: #a7b8b2;
        font-size: 13px;
        line-height: 1.45;
      }

      section { padding: 32px; }

      header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 20px;
        align-items: start;
        margin-bottom: 24px;
      }

      h2 {
        margin: 0 0 8px;
        font-size: 30px;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #5b6264;
        line-height: 1.5;
      }

      .status, .panel, .timeline {
        background: #ffffff;
        border: 1px solid #d8d5cb;
        border-radius: 8px;
      }

      .status {
        padding: 12px 14px;
        min-width: 190px;
      }

      .status strong, .status span { display: block; }
      .status span { margin-top: 4px; color: #5b6264; font-size: 13px; }

      .layout {
        display: grid;
        grid-template-columns: minmax(280px, 360px) 1fr;
        gap: 16px;
      }

      .panel { padding: 18px; }
      .panel h3 { margin: 0 0 14px; font-size: 16px; }

      label {
        display: block;
        margin-top: 12px;
        font-size: 12px;
        color: #5b6264;
      }

      input {
        box-sizing: border-box;
        width: 100%;
        margin-top: 6px;
        border: 1px solid #c9c5ba;
        border-radius: 6px;
        padding: 10px;
        font: inherit;
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 16px;
      }

      button {
        appearance: none;
        border: 1px solid #202426;
        border-radius: 6px;
        background: #202426;
        color: #ffffff;
        padding: 10px 13px;
        font: inherit;
        cursor: pointer;
      }

      button.secondary {
        background: #ffffff;
        color: #202426;
      }

      .timeline { padding: 8px 0; }

      .entry {
        display: grid;
        grid-template-columns: 74px 1fr;
        gap: 14px;
        padding: 14px 18px;
        border-top: 1px solid #ece8de;
      }

      .entry:first-child { border-top: 0; }
      .time { color: #5b6264; font-variant-numeric: tabular-nums; }
      .title { font-weight: 700; }
      .body { margin-top: 4px; color: #5b6264; }
      .tag { margin-top: 7px; color: #62746d; font-size: 12px; }

      pre {
        max-height: 180px;
        overflow: auto;
        background: #141719;
        color: #f8f1de;
        border-radius: 8px;
        padding: 14px;
      }

      @media (max-width: 860px) {
        main, .layout, header { grid-template-columns: 1fr; }
        section { padding: 24px; }
      }
    </style>
  </head>
  <body>
    <main>
      <nav>
        <h1>Atlas OS</h1>
        <span>Modular monolith foundation with auth, tenancy, event engine, workflow and unified operational timeline.</span>
      </nav>
      <section>
        <header>
          <div>
            <h2>Timeline operacional unificada</h2>
            <p>Manutencao, obra, IA e workflow registrando fatos no mesmo eixo operacional.</p>
          </div>
          <div class="status">
            <strong id="health-label">API unknown</strong>
            <span id="health-detail">Waiting for check</span>
          </div>
        </header>
        <div class="layout">
          <div class="panel">
            <h3>Sprint 0 Demo</h3>
            <label>Organization ID<input id="org" value="org_demo" /></label>
            <label>Subject ID<input id="subject" value="wo_demo" /></label>
            <label>Actor ID<input id="actor" value="usr_demo" /></label>
            <div class="actions">
              <button id="seed">Criar timeline viva</button>
              <button class="secondary" id="refresh">Atualizar</button>
              <button class="secondary" id="metrics">Metrics</button>
            </div>
            <pre id="output">{}</pre>
          </div>
          <div class="timeline" id="timeline"></div>
        </div>
      </section>
    </main>
    <script>
      const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
      const output = document.querySelector("#output");
      const healthLabel = document.querySelector("#health-label");
      const healthDetail = document.querySelector("#health-detail");
      const timelineRoot = document.querySelector("#timeline");

      function values() {
        return {
          organizationId: document.querySelector("#org").value,
          subjectId: document.querySelector("#subject").value,
          actorId: document.querySelector("#actor").value
        };
      }

      async function call(path, options) {
        const response = await fetch(apiBase + path, {
          headers: { "content-type": "application/json" },
          ...options
        });
        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
        return data;
      }

      function render(items) {
        timelineRoot.innerHTML = items.map((entry) => {
          const time = new Date(entry.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return '<article class="entry"><div class="time">' + time + '</div><div><div class="title">' + entry.title + '</div>' +
            (entry.body ? '<div class="body">' + entry.body + '</div>' : '') +
            '<div class="tag">' + entry.sourceModule + ' · ' + entry.kind + '</div></div></article>';
        }).join("") || '<article class="entry"><div class="time">--:--</div><div><div class="title">Sem eventos ainda</div></div></article>';
      }

      async function refresh() {
        const current = values();
        const data = await call("/timeline?organizationId=" + encodeURIComponent(current.organizationId) + "&subjectId=" + encodeURIComponent(current.subjectId));
        render(data.items);
      }

      async function check() {
        try {
          const data = await call("/health");
          healthLabel.textContent = data.ok ? "API online" : "API degraded";
          healthDetail.textContent = data.service + " - " + data.events + " events";
        } catch (error) {
          healthLabel.textContent = "API offline";
          healthDetail.textContent = error.message;
        }
      }

      document.querySelector("#seed").addEventListener("click", async () => {
        await call("/timeline/demo", { method: "POST", body: JSON.stringify(values()) });
        await refresh();
        await check();
      });

      document.querySelector("#refresh").addEventListener("click", refresh);
      document.querySelector("#metrics").addEventListener("click", () => call("/observability"));

      check();
      refresh();
    </script>
  </body>
</html>`;

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(port, () => {
  console.log(`Atlas web listening on http://localhost:${port}`);
});
