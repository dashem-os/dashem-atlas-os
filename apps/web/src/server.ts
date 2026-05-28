import { createServer } from "node:http";

const port = Number(process.env.ATLAS_WEB_PORT ?? 5173);

const html = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ATLAS OS Enterprise</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f4f6f3;
        color: #202426;
      }

      body { margin: 0; }
      main { min-height: 100vh; display: grid; grid-template-columns: 260px 1fr; }
      nav { background: #202426; color: #f8f5ed; padding: 28px 22px; }
      nav h1 { margin: 0 0 16px; font-size: 24px; letter-spacing: 0; }
      nav p { color: #b9c7c2; font-size: 13px; line-height: 1.45; margin: 0; }
      section { padding: 30px; }
      header { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
      h2 { margin: 0 0 8px; font-size: 30px; letter-spacing: 0; }
      p { margin: 0; color: #5b6264; line-height: 1.5; }
      .status, .panel, .timeline, .metric, .runtime-panel { background: #fff; border: 1px solid #d5dcd2; border-radius: 8px; }
      .status { min-width: 190px; padding: 12px 14px; }
      .status strong, .status span { display: block; }
      .status span { color: #5b6264; margin-top: 4px; font-size: 13px; }
      .layout { display: grid; grid-template-columns: minmax(310px, 390px) 1fr; gap: 16px; }
      .panel { padding: 18px; }
      .panel h3 { margin: 0 0 12px; font-size: 16px; }
      label { display: block; margin-top: 10px; color: #5b6264; font-size: 12px; }
      input, textarea, select {
        box-sizing: border-box;
        width: 100%;
        margin-top: 5px;
        border: 1px solid #c9c5ba;
        border-radius: 6px;
        padding: 9px;
        font: inherit;
      }
      textarea { min-height: 70px; resize: vertical; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
      button {
        appearance: none;
        border: 1px solid #202426;
        border-radius: 6px;
        background: #202426;
        color: #fff;
        padding: 9px 12px;
        font: inherit;
        cursor: pointer;
      }
      button.secondary { background: #fff; color: #202426; }
      .metrics { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
      .metric { padding: 14px; }
      .metric strong { display: block; font-size: 22px; }
      .metric span { color: #5b6264; font-size: 12px; }
      .runtime-grid { display: grid; grid-template-columns: repeat(4, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
      .runtime-panel { padding: 14px; min-height: 110px; }
      .runtime-panel h3 { margin: 0 0 8px; font-size: 14px; }
      .runtime-list { display: grid; gap: 7px; font-size: 13px; color: #485150; }
      .runtime-item { border-top: 1px solid #edf0eb; padding-top: 7px; }
      .runtime-item:first-child { border-top: 0; padding-top: 0; }
      .risk-low { color: #3d6f57; }
      .risk-medium { color: #8a6a21; }
      .risk-high, .risk-critical { color: #9f3328; }
      .timeline { padding: 8px 0; }
      .entry { display: grid; grid-template-columns: 74px 1fr; gap: 14px; padding: 14px 18px; border-top: 1px solid #ece8de; }
      .entry:first-child { border-top: 0; }
      .time { color: #5b6264; font-variant-numeric: tabular-nums; }
      .title { font-weight: 700; }
      .body { margin-top: 4px; color: #5b6264; }
      .tag { margin-top: 7px; color: #62746d; font-size: 12px; }
      pre { max-height: 180px; overflow: auto; background: #141719; color: #f8f1de; border-radius: 8px; padding: 14px; }
      
      /* Visual Drag & Drop feedback for Kanban columns */
      .kanban-column {
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .kanban-column-valid {
        border: 2px dashed #15803d !important;
        background: #f0fdf4 !important;
        box-shadow: 0 0 14px rgba(21, 128, 61, 0.18);
        transform: scale(1.02);
      }
      .kanban-column-invalid {
        opacity: 0.35;
        filter: grayscale(60%);
        pointer-events: none;
      }

      @media (max-width: 900px) {
        main, .layout, header, .metrics, .runtime-grid { grid-template-columns: 1fr; }
        header { display: block; }
        section { padding: 22px; }
      }
    </style>
  </head>
  <body>
    <main>
      <nav>
        <h1>ATLAS OS Enterprise</h1>
        <p>ERP administrativo para governanca, runtime, digital twin, foresight e operacao corporativa.</p>
      </nav>
      <section>
        <header>
          <div>
            <h2>Operational Foresight</h2>
            <p>O Atlas simula futuros; o humano decide o mundo real.</p>
          </div>
          <div class="status">
            <strong id="health-label">API unknown</strong>
            <span id="health-detail">Waiting for check</span>
          </div>
        </header>

        <div class="metrics" id="metrics"></div>
        <div class="runtime-grid" id="runtime-grid"></div>

        <div class="layout">
          <div class="panel">
            <h3>Fluxo operacional</h3>
            <label>Organization ID<input id="org" value="org_demo" /></label>
            <label>Actor ID<input id="actor" value="usr_demo" /></label>
            <label>Asset ID<input id="asset" placeholder="criado automaticamente" /></label>
            <label>Work Order ID<input id="wo" placeholder="criada automaticamente" /></label>
            <label>Comentario<textarea id="comment">Tecnico confirmou vibracao acima do esperado.</textarea></label>
            <div class="actions">
              <button id="asset-create">Criar ativo</button>
              <button id="wo-open">Abrir OS</button>
              <button class="secondary" id="evidence">Anexar evidencia</button>
              <button class="secondary" id="evidence-upload">Upload OCR</button>
              <button class="secondary" id="comment-add">Comentar</button>
              <button class="secondary" id="ai">Sugerir IA</button>
              <button class="secondary" id="ai-diagnosis">Diagnostico</button>
              <button class="secondary" id="ai-checklist">Checklist IA</button>
              <button class="secondary" id="ai-risk">Risco</button>
              <button class="secondary" id="ai-budget">Orcamento IA</button>
              <button class="secondary" id="ai-summary">Resumo</button>
              <button class="secondary" id="ai-report">Relatorio</button>
              <button class="secondary" id="report-version">Versao relatorio</button>
              <button class="secondary" id="report-approve">Aprovar relatorio</button>
              <button class="secondary" id="monitoring-feed">Feed vivo</button>
              <button class="secondary" id="monitoring-alerts">Alertas</button>
              <button class="secondary" id="monitoring-health">Health</button>
              <button class="secondary" id="runtime-coordinate">Coordenar runtime</button>
              <button class="secondary" id="runtime-dashboard">Runtime dashboard</button>
              <button class="secondary" id="runtime-graph">Knowledge graph</button>
              <button class="secondary" id="runtime-twin">Digital twin</button>
              <button class="secondary" id="runtime-history">Historico cognitivo</button>
              <button class="secondary" id="runtime-replay">Replay timeline</button>
              <button class="secondary" id="foresight-generate">Gerar foresight</button>
              <button class="secondary" id="scenario-simulate">Simular cenarios</button>
              <button class="secondary" id="temporal-analytics">Analytics temporal</button>
              <button class="secondary" id="foresight-dashboard">Foresight</button>
              <button class="secondary" id="budget">Aprovar orcamento</button>
              <button class="secondary" id="close">Fechar OS</button>
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
      const timelineRoot = document.querySelector("#timeline");
      const metricsRoot = document.querySelector("#metrics");
      const runtimeRoot = document.querySelector("#runtime-grid");
      const healthLabel = document.querySelector("#health-label");
      const healthDetail = document.querySelector("#health-detail");

      const val = (id) => document.querySelector(id).value;
      const set = (id, value) => { document.querySelector(id).value = value; };

      async function call(path, options) {
        const response = await fetch(apiBase + path, { headers: { "content-type": "application/json" }, ...options });
        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
        return data;
      }

      function renderTimeline(items) {
        timelineRoot.innerHTML = items.map((entry) => {
          const time = new Date(entry.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return '<article class="entry"><div class="time">' + time + '</div><div><div class="title">' + entry.title + '</div>' +
            (entry.body ? '<div class="body">' + entry.body + '</div>' : '') +
            '<div class="tag">' + entry.eventName + ' - ' + entry.sourceModule + ' - ' + entry.kind + '</div></div></article>';
        }).join("") || '<article class="entry"><div class="time">--:--</div><div><div class="title">Sem timeline ainda</div></div></article>';
      }

      function runtimeItem(text, detail, risk) {
        const riskClass = risk ? " risk-" + risk : "";
        return '<div class="runtime-item"><strong class="' + riskClass + '">' + text + '</strong>' + (detail ? '<div>' + detail + '</div>' : '') + '</div>';
      }

      function renderRuntime(data) {
        const diagnostics = data.diagnostics?.metrics || {};
        const twin = data.digitalTwin?.[0];
        const coordination = data.activeCoordinations?.[0];
        const pending = data.pendingHumanDecisions || [];
        const graph = data.knowledgeGraph || [];
        const forecast = data.forecasts?.[0];
        const simulation = data.comparisons?.[0];
        const analytics = data.temporalAnalytics?.[0];
        runtimeRoot.innerHTML = [
          '<div class="runtime-panel"><h3>Kernel</h3><div class="runtime-list">' +
            runtimeItem("Coordenações " + (diagnostics.totalCoordinations || 0), "Risco medio " + (diagnostics.averageRiskScore || 0)) +
            runtimeItem("Escalonamentos " + (diagnostics.escalatedWorkflows || 0), "Decisoes humanas pendentes " + (diagnostics.pendingHumanDecisions || 0)) +
          '</div></div>',
          '<div class="runtime-panel"><h3>Digital Twin</h3><div class="runtime-list">' +
            runtimeItem(twin ? "Risco " + twin.riskLevel : "Sem twin", twin ? "Health " + twin.healthScore + " - SLA " + twin.slaState : "Coordene uma OS para criar estado vivo", twin?.riskLevel) +
            runtimeItem(twin ? "Evidencia " + twin.evidenceState : "Sem evidencia", twin ? "Decisao humana: " + (twin.pendingHumanDecision ? "sim" : "nao") : "") +
          '</div></div>',
          '<div class="runtime-panel"><h3>Workflow</h3><div class="runtime-list">' +
            runtimeItem(coordination ? "Prioridade " + coordination.priorityRecommendation : "Sem coordenacao", coordination ? coordination.explanation.slice(0, 110) : "Aguardando runtime") +
            runtimeItem("Graph " + graph.length + " relações", pending.length + " contexto(s) humanos armazenados") +
          '</div></div>',
          '<div class="runtime-panel"><h3>Foresight</h3><div class="runtime-list">' +
            runtimeItem(forecast ? forecast.signals.length + " previsões" : "Sem forecast", forecast ? "Gate humano: " + (forecast.approvalGate.required ? "sim" : "nao") : "Gere foresight para projetar risco") +
            runtimeItem(simulation ? "Cenarios " + simulation.scenarioResults.length : "Sem simulação", analytics ? analytics.trends[0] : "Analytics temporal aguardando") +
          '</div></div>'
        ].join("");
      }

      async function refresh() {
        const org = val("#org");
        const wo = val("#wo");
        const dashboard = await call("/dashboard?organizationId=" + encodeURIComponent(org));
        metricsRoot.innerHTML = [
          ["Ativos", dashboard.totals.assets],
          ["Ativos ativos", dashboard.totals.activeAssets],
          ["OS", dashboard.totals.workOrders],
          ["OS abertas", dashboard.totals.openWorkOrders]
        ].map(([label, value]) => '<div class="metric"><strong>' + value + '</strong><span>' + label + '</span></div>').join("");
        const runtime = await call("/operations/runtime-dashboard?organizationId=" + encodeURIComponent(org) + (wo ? "&subjectId=" + encodeURIComponent(wo) : ""));
        renderRuntime(runtime);
        renderTimeline(wo ? (await call("/timeline?organizationId=" + encodeURIComponent(org) + "&subjectId=" + encodeURIComponent(wo))).items : dashboard.recentTimeline);
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

      document.querySelector("#asset-create").addEventListener("click", async () => {
        const data = await call("/assets", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), name: "Bomba principal", kind: "equipment", criticality: "critical", location: "Sala tecnica" }) });
        set("#asset", data.asset.id);
        await refresh();
      });

      document.querySelector("#wo-open").addEventListener("click", async () => {
        const data = await call("/maintenance/work-orders", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), assetId: val("#asset") || "ast_demo", title: "Investigar vibracao na bomba", priority: "urgent", checklist: ["Inspecionar acoplamento", "Medir vibracao", "Registrar evidencia"] }) });
        set("#wo", data.workOrder.id);
        await refresh();
      });

      document.querySelector("#evidence").addEventListener("click", async () => {
        await call("/maintenance/work-orders/" + encodeURIComponent(val("#wo")) + "/evidence", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), actorId: val("#actor"), kind: "photo", title: "bomba-vibracao.jpg", url: "https://atlas.local/evidence/bomba-vibracao.jpg", notes: "Foto anexada em campo." }) });
        await refresh();
      });

      document.querySelector("#evidence-upload").addEventListener("click", async () => {
        const content = btoa(unescape(encodeURIComponent("Laudo: vibracao alta detectada. Recomenda-se inspecao tecnica.")));
        await call("/maintenance/work-orders/" + encodeURIComponent(val("#wo")) + "/evidence/upload", {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org"), actorId: val("#actor"), kind: "document", title: "Laudo OCR", fileName: "laudo.txt", mimeType: "text/plain", contentBase64: content, metadata: { source: "web" } })
        });
        await refresh();
      });

      document.querySelector("#comment-add").addEventListener("click", async () => {
        await call("/maintenance/work-orders/" + encodeURIComponent(val("#wo")) + "/comments", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), actorId: val("#actor"), comment: val("#comment") }) });
        await refresh();
      });

      document.querySelector("#ai").addEventListener("click", async () => {
        await call("/ai/suggestions", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), subjectId: val("#wo"), suggestion: "IA sugeriu cavitacao: verificar ruido, vibracao e historico do equipamento." }) });
        await refresh();
      });

      async function aiAction(action) {
        await call("/ai/work-orders/" + encodeURIComponent(val("#wo")) + "/" + action, {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org") })
        });
        await refresh();
      }

      document.querySelector("#ai-diagnosis").addEventListener("click", () => aiAction("diagnosis"));
      document.querySelector("#ai-checklist").addEventListener("click", () => aiAction("checklist"));
      document.querySelector("#ai-risk").addEventListener("click", () => aiAction("risk"));
      document.querySelector("#ai-budget").addEventListener("click", () => aiAction("budget-draft"));
      document.querySelector("#ai-summary").addEventListener("click", () => aiAction("summary"));
      document.querySelector("#ai-report").addEventListener("click", () => aiAction("report"));

      let lastReportId = "";
      document.querySelector("#report-version").addEventListener("click", async () => {
        const data = await call("/reports/work-orders/" + encodeURIComponent(val("#wo")) + "?organizationId=" + encodeURIComponent(val("#org")), {
          method: "POST",
          body: JSON.stringify({ createdBy: val("#actor") })
        });
        lastReportId = data.report.id;
        await refresh();
      });

      document.querySelector("#report-approve").addEventListener("click", async () => {
        if (!lastReportId) {
          const versions = await call("/reports/work-orders/" + encodeURIComponent(val("#wo")) + "?organizationId=" + encodeURIComponent(val("#org")));
          lastReportId = versions.items[0]?.id || "";
        }
        await call("/reports/work-orders/" + encodeURIComponent(val("#wo")) + "/versions/" + encodeURIComponent(lastReportId) + "/decision?organizationId=" + encodeURIComponent(val("#org")), {
          method: "POST",
          body: JSON.stringify({ decidedBy: val("#actor"), decision: "approved", notes: "Relatorio validado." })
        });
        await refresh();
      });

      document.querySelector("#monitoring-feed").addEventListener("click", () => call("/monitoring/feed?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));
      document.querySelector("#monitoring-alerts").addEventListener("click", () => call("/monitoring/alerts?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));
      document.querySelector("#monitoring-health").addEventListener("click", () => call("/monitoring/health?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));

      document.querySelector("#runtime-coordinate").addEventListener("click", async () => {
        await call("/operations/work-orders/" + encodeURIComponent(val("#wo")) + "/coordinate", {
          method: "POST",
          body: JSON.stringify({
            organizationId: val("#org"),
            actorId: val("#actor"),
            domain: "maintenance",
            specialists: [
              { id: "usr_rotating", name: "Ana Tecnica", domains: ["maintenance"], skills: ["equipment", "rotating_equipment", "field_supervision"], activeWorkOrders: 2 },
              { id: "usr_hydraulics", name: "Bruno Campo", domains: ["maintenance", "facilities"], skills: ["hydraulics", "field_supervision"], activeWorkOrders: 4 }
            ]
          })
        });
        await refresh();
      });
      document.querySelector("#runtime-dashboard").addEventListener("click", async () => {
        const data = await call("/operations/runtime-dashboard?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo")));
        renderRuntime(data);
      });
      document.querySelector("#runtime-graph").addEventListener("click", () => call("/operations/knowledge-graph?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));
      document.querySelector("#runtime-twin").addEventListener("click", () => call("/operations/digital-twin?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));
      document.querySelector("#runtime-history").addEventListener("click", () => call("/operations/coordination-history?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo"))));
      document.querySelector("#runtime-replay").addEventListener("click", async () => {
        await call("/operations/timeline/" + encodeURIComponent(val("#wo")) + "/replay", {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org"), limit: 500 })
        });
        await refresh();
      });
      document.querySelector("#foresight-generate").addEventListener("click", async () => {
        await call("/operations/work-orders/" + encodeURIComponent(val("#wo")) + "/forecast", {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org"), domain: "maintenance" })
        });
        await refresh();
      });
      document.querySelector("#scenario-simulate").addEventListener("click", async () => {
        await call("/operations/work-orders/" + encodeURIComponent(val("#wo")) + "/simulate", {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org"), domain: "maintenance", scenarios: ["delay", "continue_operating", "sla_missed", "specialist_changed", "missing_evidence"] })
        });
        await refresh();
      });
      document.querySelector("#temporal-analytics").addEventListener("click", async () => {
        await call("/operations/work-orders/" + encodeURIComponent(val("#wo")) + "/temporal-analytics", {
          method: "POST",
          body: JSON.stringify({ organizationId: val("#org"), domain: "maintenance" })
        });
        await refresh();
      });
      document.querySelector("#foresight-dashboard").addEventListener("click", async () => {
        const data = await call("/operations/foresight?organizationId=" + encodeURIComponent(val("#org")) + "&subjectId=" + encodeURIComponent(val("#wo")));
        output.textContent = JSON.stringify(data, null, 2);
      });

      document.querySelector("#budget").addEventListener("click", async () => {
        await call("/maintenance/work-orders/" + encodeURIComponent(val("#wo")) + "/budget", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), amount: 2480, currency: "BRL", notes: "Troca preventiva aprovada para evitar parada." }) });
        await call("/workflow/approvals", { method: "POST", body: JSON.stringify({ organizationId: val("#org"), subjectId: val("#wo"), requestedBy: val("#actor"), decision: "approved" }) });
        await refresh();
      });

      document.querySelector("#close").addEventListener("click", async () => {
        await call("/maintenance/work-orders/" + encodeURIComponent(val("#wo")) + "/status", { method: "PATCH", body: JSON.stringify({ organizationId: val("#org"), state: "closed", reason: "Servico executado e validado." }) });
        await refresh();
      });

      check();
      refresh();
    </script>
  </body>
</html>`;

const loginHtml = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DASHEM ATLAS OS | Login</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #f4f8fb;
        background: #02080d;
        --cyan: #19c8ff;
        --orange: #ff8a00;
        --line: rgba(62, 197, 255, 0.42);
        --muted: #9aa7b2;
      }

      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        background:
          radial-gradient(circle at 12% 92%, rgba(0, 183, 255, 0.24), transparent 34%),
          radial-gradient(circle at 100% 28%, rgba(255, 112, 0, 0.32), transparent 34%),
          linear-gradient(135deg, #02080d 0%, #06131d 48%, #0a0705 100%);
        overflow-x: hidden;
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(25, 200, 255, 0.08) 1px, transparent 1px),
          linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px);
        background-size: 74px 74px;
        mask-image: radial-gradient(circle at center, black, transparent 72%);
      }
      main {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .login-shell {
        width: min(820px, 100%);
        display: grid;
        gap: 12px;
        justify-items: center;
      }
      .login-card {
        width: min(520px, 100%);
        padding: clamp(16px, 2.5vw, 26px);
        border: 1px solid rgba(255, 138, 0, 0.48);
        border-left-color: rgba(25, 200, 255, 0.78);
        border-radius: 18px;
        background:
          linear-gradient(145deg, rgba(4, 13, 20, 0.94), rgba(8, 10, 12, 0.9)),
          radial-gradient(circle at 0% 50%, rgba(25, 200, 255, 0.12), transparent 46%);
        box-shadow:
          0 0 70px rgba(255, 138, 0, 0.2),
          0 0 46px rgba(25, 200, 255, 0.16),
          inset 0 0 34px rgba(255, 255, 255, 0.035);
      }
      .brand {
        display: grid;
        justify-items: center;
        gap: 4px;
        margin-bottom: 14px;
        text-align: center;
      }
      .mark {
        width: 44px;
        height: 44px;
        border: 1px solid rgba(25, 200, 255, 0.72);
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: var(--cyan);
        font-weight: 900;
        font-size: 22px;
        box-shadow: 0 0 34px rgba(25, 200, 255, 0.24);
      }
      h1 {
        margin: 0;
        font-size: clamp(34px, 5vw, 48px);
        letter-spacing: 0.02em;
        line-height: 0.95;
      }
      h1 span { color: var(--orange); text-shadow: 0 0 22px rgba(255, 138, 0, 0.5); }
      .brand small {
        color: #dce8f0;
        letter-spacing: 0.26em;
        text-transform: uppercase;
      }
      .welcome {
        display: grid;
        gap: 4px;
        text-align: center;
        margin-bottom: 14px;
      }
      .welcome h2 { margin: 0; font-size: clamp(22px, 2.4vw, 28px); }
      .welcome p { margin: 0; color: var(--muted); font-size: 14px; }
      form {
        display: grid;
        gap: 12px;
        width: min(440px, 100%);
        margin: 0 auto;
      }
      label {
        display: grid;
        gap: 7px;
        color: var(--cyan);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .field {
        min-height: 46px;
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr) 32px;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0 10px;
        background: rgba(1, 8, 13, 0.78);
        box-shadow: inset 0 0 18px rgba(25, 200, 255, 0.045);
      }
      .field span {
        color: rgba(255, 255, 255, 0.62);
        font-size: 16px;
        text-align: center;
      }
      input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        color: #f7fbff;
        background: transparent;
        font: inherit;
        font-size: 15px;
      }
      input::placeholder { color: rgba(255, 255, 255, 0.38); }
      .target-picker {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .target-picker input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .target-picker span {
        min-height: 34px;
        padding: 7px 8px;
        border: 1px solid rgba(62, 197, 255, 0.28);
        border-radius: 10px;
        background: rgba(1, 8, 13, 0.68);
        color: var(--muted);
        display: grid;
        place-items: center;
        text-align: center;
        font-size: 11px;
        letter-spacing: 0;
        text-transform: none;
      }
      .target-picker input:checked + span {
        border-color: rgba(255, 138, 0, 0.72);
        color: #fff;
        background: linear-gradient(135deg, rgba(0, 157, 230, 0.24), rgba(255, 120, 0, 0.2));
        box-shadow: 0 0 18px rgba(255, 138, 0, 0.16);
      }
      .ghost-button {
        border: 0;
        background: transparent;
        color: var(--cyan);
        font-size: 22px;
        cursor: pointer;
      }
      .submit {
        min-height: 48px;
        border: 1px solid rgba(255, 199, 80, 0.88);
        border-radius: 10px;
        color: #fff;
        background: linear-gradient(100deg, rgba(0, 157, 230, 0.9), rgba(255, 120, 0, 0.94));
        box-shadow: 0 0 26px rgba(255, 138, 0, 0.36), 0 0 22px rgba(25, 200, 255, 0.18);
        font: inherit;
        font-size: 17px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .secure {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: var(--muted);
        margin-top: 6px;
        font-size: 12px;
      }
      .footer-brand {
        text-align: center;
        color: rgba(255, 255, 255, 0.82);
        letter-spacing: 0.34em;
        font-size: 12px;
        text-transform: uppercase;
      }
      .footer-brand b { color: var(--orange); font-weight: 500; }
      .footer-brand small {
        display: block;
        margin-top: 6px;
        color: var(--cyan);
        letter-spacing: 0.24em;
      }
      .hint {
        min-height: 20px;
        color: #ffbf6b;
        text-align: center;
        font-size: 13px;
      }
      @media (max-width: 560px) {
        .login-card { border-radius: 18px; }
        .brand small, .footer-brand, .footer-brand small { letter-spacing: 0.18em; }
        .target-picker { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .submit { font-size: 19px; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="login-shell" aria-label="Login DASHEM ATLAS OS">
        <div class="login-card">
          <div class="brand">
            <div class="mark">D</div>
            <h1>ATLAS <span>OS</span></h1>
            <small>DASHEM Technologies</small>
          </div>

          <div class="welcome">
            <h2>Bem-vindo de volta</h2>
            <p>Acesse sua conta para continuar</p>
          </div>

          <form id="login-form">
            <label>
              Usuário
              <div class="field">
                <span>◎</span>
                <input name="username" autocomplete="username" placeholder="Digite seu usuário" required />
                <span></span>
              </div>
            </label>

            <label>
              Senha
              <div class="field">
                <span>▣</span>
                <input id="password" name="password" autocomplete="current-password" type="password" placeholder="Digite sua senha" required />
                <button class="ghost-button" id="toggle-password" type="button" aria-label="Mostrar senha">◉</button>
              </div>
            </label>

            <label>
              Ambiente
              <div class="field" style="grid-template-columns: 32px 1fr;">
                <span>⚙</span>
                <select name="target" id="environment-select" style="width: 100%; border: 0; outline: 0; background: transparent; color: #f7fbff; font-size: 15px; appearance: none; -webkit-appearance: none;">
                  <option value="auto" style="background:#02080d; color:#f7fbff;">Auto (Resolver por usuário)</option>
                  <option value="owner" style="background:#02080d; color:#f7fbff;">Owner Dashboard</option>
                </select>
              </div>
            </label>

            <button class="submit" type="submit">Entrar</button>
            <div class="hint" id="login-hint"></div>
            <div class="secure">▧ Conexão segura</div>
          </form>
        </div>

        <div class="footer-brand">
          DASHEM ATLAS <b>OS</b>
          <small>Tecnologia inteligente. Resultados reais.</small>
        </div>
      </section>
    </main>

    <script>
      const fieldUrl = new URLSearchParams(location.search).get("field") || "http://localhost:5174";
      const enterpriseUrl = new URLSearchParams(location.search).get("enterprise") || "/";
      const hint = document.querySelector("#login-hint");
      const password = document.querySelector("#password");

      document.querySelector("#toggle-password").addEventListener("click", () => {
        password.type = password.type === "password" ? "text" : "password";
      });

      async function loadEnvironments() {
        try {
          const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
          const res = await fetch(apiBase + "/owner/summary");
          const data = await res.json();
          const select = document.querySelector("#environment-select");
          const tenants = data.tenants || [];
          tenants.forEach((tenant) => {
            const opt = document.createElement("option");
            opt.value = "tenant:" + tenant.code;
            opt.textContent = tenant.name + " (" + tenant.code + ")";
            opt.style.background = "#02080d";
            opt.style.color = "#f7fbff";
            select.appendChild(opt);
          });
          window.loginAccessGrants = data.accessGrants || [];
          window.loginTenants = tenants;
        } catch (e) {
          console.warn("Could not load dynamic environments from API:", e);
        }
      }
      loadEnvironments();

      function resolveTargetInfo(username, selected) {
        const emailVal = username.trim().toLowerCase();
        if (selected !== "auto") {
          if (selected.startsWith("tenant:")) {
            const code = selected.replace("tenant:", "");
            const tenant = (window.loginTenants || []).find(t => t.code === code);
            return {
              target: tenant?.productLine === "field" ? "field" : "enterprise",
              tenantCode: code,
              tenantName: tenant?.name,
              email: emailVal
            };
          }
          return { target: selected, email: emailVal };
        }

        if (emailVal.includes("owner") || emailVal.includes("dashem")) {
          return { target: "owner", email: emailVal };
        }

        const grant = (window.loginAccessGrants || []).find(g => g.email.toLowerCase() === emailVal);
        if (grant) {
          const tenant = (window.loginTenants || []).find(t => t.id === grant.tenantId);
          return {
            target: tenant?.productLine === "field" ? "field" : "enterprise",
            tenantCode: grant.tenantCode,
            tenantName: tenant?.name,
            email: grant.email
          };
        }

        const matchedTenant = (window.loginTenants || []).find(
          t => t.code.toLowerCase() === emailVal || t.slug.toLowerCase() === emailVal
        );
        if (matchedTenant) {
          return {
            target: matchedTenant.productLine === "field" ? "field" : "enterprise",
            tenantCode: matchedTenant.code,
            tenantName: matchedTenant.name,
            email: emailVal
          };
        }

        if (emailVal.includes("field") || emailVal.includes("tecnico") || emailVal.includes("#00")) {
          return { target: "field", tenantCode: "#00", email: emailVal };
        }

        return { target: "enterprise", email: emailVal };
      }

      document.querySelector("#login-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const selected = String(data.target || "auto");
        const info = resolveTargetInfo(String(data.username || ""), selected);
        const session = {
          username: data.username,
          target: info.target,
          tenantCode: info.tenantCode,
          email: info.email,
          issuedAt: new Date().toISOString(),
          harness: "atlas-login-shell"
        };
        localStorage.setItem("atlas_login_session", JSON.stringify(session));

        const targetLabel = info.target === "owner"
          ? "Owner DASHEM"
          : info.target === "field"
            ? "ATLAS OS Field (" + (info.tenantName || info.tenantCode || "#00") + ")"
            : "ATLAS OS Enterprise";

        hint.textContent = "Entrando no " + targetLabel + "...";

        window.setTimeout(() => {
          if (info.target === "owner") {
            window.location.href = "/owner";
            return;
          }
          const tenantParam = info.tenantCode ? "?tenant=" + encodeURIComponent(info.tenantCode) : "";
          const emailParam = info.email ? (tenantParam ? "&" : "?") + "email=" + encodeURIComponent(info.email) : "";
          if (info.target === "field") {
            window.location.href = fieldUrl + tenantParam + emailParam;
            return;
          }
          window.location.href = enterpriseUrl + tenantParam + emailParam;
        }, 420);
      });
    </script>
  </body>
</html>`;

const ownerHtml = String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DASHEM Owner | ATLAS OS</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #ecf7ff;
        background: #061018;
        --bg: #061018;
        --panel: rgba(8, 28, 41, 0.86);
        --panel-strong: rgba(10, 38, 55, 0.96);
        --line: rgba(70, 185, 238, 0.26);
        --line-strong: rgba(70, 185, 238, 0.52);
        --text-soft: #9fb8c8;
        --cyan: #22c7ff;
        --orange: #ff8a00;
        --green: #08c77e;
        --danger: #ff5b65;
        --shadow: 0 24px 68px rgba(0, 0, 0, 0.28);
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        background:
          radial-gradient(circle at 6% 0%, rgba(34, 199, 255, 0.16), transparent 32%),
          radial-gradient(circle at 100% 10%, rgba(255, 138, 0, 0.18), transparent 30%),
          linear-gradient(145deg, #061018 0%, #081521 58%, #0e0a06 100%);
      }
      button, input, select { font: inherit; }
      button { cursor: pointer; }
      h1, h2, h3, p { margin: 0; }
      p { color: var(--text-soft); line-height: 1.45; }
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
      }
      aside {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 24px 18px;
        border-right: 1px solid var(--line);
        background: rgba(3, 13, 20, 0.78);
        backdrop-filter: blur(20px);
      }
      .brand { display: grid; gap: 8px; margin-bottom: 30px; }
      .mark {
        width: 50px;
        height: 50px;
        border: 1px solid var(--line-strong);
        border-radius: 10px;
        display: grid;
        place-items: center;
        color: var(--cyan);
        font-weight: 900;
        box-shadow: 0 0 24px rgba(34, 199, 255, 0.22);
      }
      .brand strong { font-size: 22px; }
      .brand span { color: var(--orange); font-size: 11px; font-weight: 900; letter-spacing: 0.32em; text-transform: uppercase; }
      nav { display: grid; gap: 8px; }
      nav a {
        min-height: 42px;
        padding: 10px 12px;
        border: 1px solid transparent;
        border-radius: 8px;
        color: var(--text-soft);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      nav a.active, nav a:hover {
        border-color: var(--line-strong);
        background: rgba(34, 199, 255, 0.1);
        color: #fff;
      }
      main {
        min-width: 0;
        padding: 26px 28px 42px;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }
      .hello { display: grid; gap: 5px; }
      .hello h1 { font-size: clamp(30px, 5vw, 48px); }
      .hello b { color: var(--orange); }
      .owner-pill {
        min-height: 42px;
        padding: 9px 13px;
        border: 1px solid rgba(255, 138, 0, 0.55);
        border-radius: 999px;
        color: var(--orange);
        background: rgba(255, 138, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        font-weight: 900;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .dashboard-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
        gap: 18px;
        margin-bottom: 18px;
      }
      .dash-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 18px;
        background: linear-gradient(145deg, rgba(11, 38, 55, 0.88), rgba(4, 16, 25, 0.74));
      }
      .bar-list { display: grid; gap: 12px; margin-top: 14px; }
      .bar-row { display: grid; gap: 6px; }
      .bar-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
      .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--cyan), var(--orange)); }
      .kpi-list { display: grid; gap: 10px; margin-top: 14px; }
      .kpi-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid rgba(70, 185, 238, 0.2);
        border-radius: 8px;
        padding: 10px 12px;
        background: rgba(2, 10, 16, 0.36);
      }
      .view[hidden] { display: none; }
      .metric, .panel, .tenant-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: linear-gradient(145deg, rgba(11, 38, 55, 0.88), rgba(4, 16, 25, 0.74));
        box-shadow: var(--shadow);
      }
      .metric {
        min-height: 96px;
        padding: 14px;
        display: grid;
        align-content: space-between;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      .metric:hover {
        transform: translateY(-2px);
        border-color: var(--line-strong);
      }
      .metric strong { font-size: 28px; }
      .metric span { color: var(--text-soft); font-size: 12px; }
      .metric.accent strong { color: var(--orange); }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 430px);
        gap: 18px;
        align-items: start;
      }
      .layout > aside.panel {
        grid-column: 2;
        grid-row: 1 / span 2;
      }
      .layout > .panel:nth-child(2) {
        grid-column: 1;
      }
      .panel { padding: 18px; min-width: 0; }
      .panel-title {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 14px;
      }
      .chip {
        min-height: 30px;
        padding: 6px 10px;
        border: 1px solid rgba(255, 138, 0, 0.46);
        border-radius: 999px;
        color: var(--orange);
        background: rgba(255, 138, 0, 0.1);
        font-size: 12px;
        font-weight: 900;
      }
      .tenant-list { display: grid; gap: 10px; }
      .tenant-card {
        padding: 14px;
        display: grid;
        gap: 8px;
        box-shadow: none;
        cursor: pointer;
      }
      .tenant-card.selected {
        border-color: rgba(255, 138, 0, 0.72);
        background: linear-gradient(145deg, rgba(18, 48, 64, 0.98), rgba(8, 22, 32, 0.92));
      }
      .tenant-card header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
      }
      .tenant-code { color: var(--orange); font-weight: 900; }
      .tenant-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--text-soft);
        font-size: 13px;
      }
      .tag {
        padding: 4px 8px;
        border: 1px solid rgba(34, 199, 255, 0.22);
        border-radius: 999px;
        background: rgba(34, 199, 255, 0.07);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }
      .detail-box {
        min-height: 74px;
        border: 1px solid rgba(70, 185, 238, 0.22);
        border-radius: 8px;
        padding: 12px;
        background: rgba(2, 10, 16, 0.42);
        display: grid;
        align-content: start;
        gap: 4px;
      }
      .detail-box small {
        color: var(--text-soft);
        font-weight: 900;
      }
      .detail-box strong {
        color: #fff;
        font-size: 14px;
        overflow-wrap: break-word;
      }
      .permission-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .empty-state {
        min-height: 140px;
        display: grid;
        align-content: center;
        gap: 8px;
        border: 1px dashed rgba(70, 185, 238, 0.28);
        border-radius: 8px;
        padding: 16px;
        color: var(--text-soft);
      }
      .access-section {
        margin-top: 16px;
        display: grid;
        gap: 12px;
      }
      .access-list {
        display: grid;
        gap: 8px;
      }
      .access-card {
        border: 1px solid rgba(70, 185, 238, 0.22);
        border-radius: 8px;
        padding: 10px 12px;
        background: rgba(2, 10, 16, 0.42);
        display: grid;
        gap: 5px;
      }
      .access-card header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .access-card small {
        color: var(--text-soft);
      }
      .grant-form {
        border-top: 1px solid rgba(70, 185, 238, 0.2);
        padding-top: 12px;
      }
      form { display: grid; gap: 12px; }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .form-grid-full {
        grid-column: 1 / span 2;
      }
      label { display: grid; gap: 6px; color: var(--text-soft); font-size: 12px; font-weight: 900; }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      input, select, textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(70, 185, 238, 0.28);
        border-radius: 8px;
        padding: 10px;
        color: #fff;
        background: rgba(2, 10, 16, 0.78);
      }
      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 6px;
      }
      .edit-tenant-form {
        display: grid;
        gap: 12px;
        background: rgba(8, 28, 41, 0.45);
        border: 1px solid rgba(70, 185, 238, 0.22);
        padding: 18px;
        border-radius: 8px;
        margin-bottom: 18px;
      }
      option { color: #10212c; }
      .check-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .check-grid label {
        min-height: 38px;
        padding: 8px 10px;
        border: 1px solid rgba(70, 185, 238, 0.24);
        border-radius: 8px;
        background: rgba(2, 10, 16, 0.5);
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d8edf8;
        font-size: 12px;
      }
      .check-grid input {
        width: auto;
      }
      .primary {
        min-height: 44px;
        border: 1px solid rgba(255, 178, 64, 0.82);
        border-radius: 8px;
        color: #fff;
        background: linear-gradient(135deg, rgba(0, 157, 230, 0.78), rgba(255, 122, 0, 0.88));
        font-weight: 900;
      }
      .pillar-grid {
        display: none;
      }
      .pillar {
        min-height: 118px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(5, 20, 31, 0.74);
        display: grid;
        align-content: space-between;
      }
      .pillar strong { color: var(--cyan); }
      .pillar small { color: var(--text-soft); line-height: 1.35; }
      .notice {
        margin-top: 12px;
        color: var(--text-soft);
        min-height: 20px;
      }
      @media (max-width: 980px) {
        .shell { display: block; }
        aside { position: static; height: auto; }
        main { padding: 20px 14px 34px; }
        .layout, .metrics, .dashboard-grid { grid-template-columns: 1fr; }
        .layout > aside.panel, .layout > .panel:nth-child(2) { grid-column: auto; grid-row: auto; }
        .form-row, .check-grid { grid-template-columns: 1fr; }
        .topbar { align-items: start; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside>
        <div class="brand">
          <div class="mark">D</div>
          <strong>DASHEM</strong>
          <span>Owner</span>
        </div>
        <nav aria-label="Owner navigation">
          <a class="active" href="#dashboard" data-view-link="dashboard">◇ Dashboard</a>
          <a href="#saas" data-view-link="saas">▣ Gerenciamento SaaS</a>
          <a href="/login">□ Login</a>
          <a href="/" title="Ambiente Enterprise em teste">▣ Enterprise test</a>
          <div id="sidebar-tenants" style="margin-top:14px; display:grid; gap:8px; border-top:1px solid var(--line); padding-top:14px;"></div>
        </nav>
      </aside>
      <main>
        <header class="topbar">
          <div class="hello">
            <h1>DASHEM <b>Owner</b></h1>
            <p>Gerenciamento global do ATLAS OS: tenants, acessos e linhas SaaS.</p>
          </div>
          <div class="owner-pill">● Acesso global</div>
        </header>

        <section class="metrics" id="owner-metrics"></section>

        <section class="view" id="dashboard-view">
          <div class="dashboard-grid">
            <article class="dash-panel">
              <div class="panel-title"><h2>Visão geral do SaaS</h2><span class="chip">API</span></div>
              <div class="bar-list" id="owner-bars"></div>
            </article>
            <article class="dash-panel">
              <div class="panel-title"><h2>Indicadores conectados</h2><span class="chip">sem simulação</span></div>
              <div class="kpi-list" id="owner-kpis"></div>
            </article>
          </div>
        </section>

        <div class="layout view" id="saas-view" hidden>
          <section class="panel">
            <div class="panel-title">
              <h2>Acessos SaaS</h2>
              <span class="chip" id="tenant-count">Carregando</span>
            </div>
            <div class="tenant-list" id="tenant-list"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <h2>Tenant selecionado</h2>
              <span class="chip" id="tenant-state">Aguardando</span>
            </div>
            <div id="tenant-detail" class="empty-state">
              <h3>Nenhum tenant selecionado</h3>
              <p>Selecione um acesso SaaS para conferir isolamento, slug, apps liberados e permissoes.</p>
            </div>
          </section>

          <aside class="panel">
            <div class="panel-title">
              <h3>Novo Tenant / Conta</h3>
              <span class="chip">SaaS</span>
            </div>
            <form id="tenant-form" class="form-grid">
              <label>Código<input name="code" placeholder="#01" /></label>
              <label>Slug<input name="slug" required placeholder="cliente-slug" /></label>
              <label class="form-grid-full">Conta / Cliente<input name="name" required placeholder="Nome da conta" /></label>
              <label class="form-grid-full">Linha de Produto
                <select name="productLine">
                  <option value="field">Field</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label class="form-grid-full">Nome do Responsável (Primeiro Técnico)<input name="ownerName" placeholder="Nome do responsável" /></label>
              <label class="form-grid-full">Email do Responsável (Acesso Inicial)<input name="ownerEmail" type="email" placeholder="contato@cliente.com" /></label>
              <button class="primary form-grid-full" type="submit">Criar Tenant / Conta</button>
              <div class="notice form-grid-full" id="notice"></div>
            </form>
          </aside>
        </div>
      </main>
    </div>

    <script>
      const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
      const metrics = document.querySelector("#owner-metrics");
      const list = document.querySelector("#tenant-list");
      const count = document.querySelector("#tenant-count");
      const notice = document.querySelector("#notice");
      const detail = document.querySelector("#tenant-detail");
      const tenantState = document.querySelector("#tenant-state");
      const bars = document.querySelector("#owner-bars");
      const kpis = document.querySelector("#owner-kpis");
      let currentTenants = [];
      let currentGrants = [];
      let selectedTenantId = "";
      let isEditingTenant = false;
      let editingAccessGrantId = null;

      async function call(path, options) {
        const response = await fetch(apiBase + path, { headers: { "content-type": "application/json" }, ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || "HTTP " + response.status);
        return data;
      }

      function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
      }

      function render(summary) {
        const totals = summary.totals || {};
        metrics.innerHTML = [
          ["Tenants", totals.tenants || 0, "accent"],
          ["Field", totals.fieldTenants || 0, ""],
          ["Enterprise", totals.enterpriseTenants || 0, ""],
          ["Acessos", totals.accessGrants || 0, "accent"]
        ].map((item) => '<article class="metric ' + item[2] + '"><strong>' + escapeHtml(item[1]) + '</strong><span>' + item[0] + '</span></article>').join("");
        renderDashboard(totals);

        const tenants = summary.tenants || [];
        const sidebarTenants = document.querySelector("#sidebar-tenants");
        if (sidebarTenants) {
          sidebarTenants.innerHTML = tenants.map((tenant) => {
            const url = "http://localhost:5174/?tenant=" + encodeURIComponent(tenant.code);
            return '<a href="' + url + '" target="_blank">▤ ' + escapeHtml(tenant.name) + '</a>';
          }).join("");
        }
        currentGrants = summary.accessGrants || currentGrants;
        currentTenants = tenants;
        if (!selectedTenantId && tenants[0]) selectedTenantId = tenants[0].id;
        count.textContent = tenants.length + " contas";
        list.innerHTML = tenants.map((tenant) =>
          '<article class="tenant-card ' + (tenant.id === selectedTenantId ? "selected" : "") + '" data-tenant-id="' + escapeHtml(tenant.id) + '">' +
            '<header><h3>' + escapeHtml(tenant.name) + '</h3><span class="tenant-code">' + escapeHtml(tenant.code) + '</span></header>' +
            '<div class="tenant-meta">' +
              '<span class="tag">' + escapeHtml(tenant.productLine) + '</span>' +
              '<span class="tag">' + escapeHtml(tenant.plan) + '</span>' +
              '<span class="tag">' + escapeHtml(tenant.status) + '</span>' +
              '<span class="tag">slug: ' + escapeHtml(tenant.slug || "") + '</span>' +
              '<span class="tag">apps: ' + escapeHtml((tenant.allowedApps || []).join(", ")) + '</span>' +
              '<span class="tag">' + escapeHtml((tenant.permissions || []).length) + ' permissoes</span>' +
            '</div>' +
            '<p>Responsável: ' + escapeHtml(tenant.ownerName || "não definido") + '</p>' +
          '</article>'
        ).join("") || '<article class="tenant-card"><h3>Nenhum tenant criado</h3><p>Crie o primeiro acesso SaaS.</p></article>';

        renderTenantDetail(tenants.find((tenant) => tenant.id === selectedTenantId) || tenants[0]);
      }

      function renderDashboard(totals) {
        const tenants = Math.max(Number(totals.tenants || 0), 1);
        const active = Number(totals.activeTenants || 0);
        const field = Number(totals.fieldTenants || 0);
        const enterprise = Number(totals.enterpriseTenants || 0);
        const access = Number(totals.accessGrants || 0);
        const invited = Number(totals.invitedAccess || 0);
        bars.innerHTML = [
          ["Tenants ativos", active, tenants],
          ["Field", field, tenants],
          ["Enterprise test", enterprise, tenants],
          ["Acessos concedidos", access, Math.max(access + invited, 1)]
        ].map((item) => '<div class="bar-row"><div class="kpi-item"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, Math.round((item[1] / item[2]) * 100)) + '%"></div></div></div>').join("");
        kpis.innerHTML = [
          ["Tenants ativos", active],
          ["Acessos concedidos", access],
          ["Convites pendentes", invited],
          ["Field", field],
          ["Enterprise", enterprise]
        ].map((item) => '<div class="kpi-item"><strong>' + escapeHtml(item[0]) + '</strong><span>' + escapeHtml(item[1]) + '</span></div>').join("");
      }

      function renderTenantDetail(tenant) {
        if (!tenant) {
          tenantState.textContent = "Aguardando";
          detail.className = "empty-state";
          detail.innerHTML = '<h3>Nenhum tenant selecionado</h3><p>Crie ou selecione um acesso SaaS.</p>';
          return;
        }
        tenantState.textContent = tenant.status || "active";
        const grants = currentGrants.filter((grant) => grant.tenantId === tenant.id);
        detail.className = "";

        if (isEditingTenant) {
          detail.innerHTML =
            '<form class="edit-tenant-form" id="edit-tenant-form">' +
              '<h3>Editar Tenant</h3>' +
              '<label>Nome<input name="name" required value="' + escapeHtml(tenant.name || "") + '" /></label>' +
              '<label>Slug<input name="slug" required value="' + escapeHtml(tenant.slug || "") + '" /></label>' +
              '<label>Responsável<input name="ownerName" value="' + escapeHtml(tenant.ownerName || "") + '" /></label>' +
              '<label>Email do Responsável<input name="ownerEmail" type="email" value="' + escapeHtml(tenant.ownerEmail || "") + '" /></label>' +
              '<label>Linha de Produto' +
                '<select name="productLine">' +
                  '<option value="field"' + (tenant.productLine === "field" ? " selected" : "") + '>Field</option>' +
                  '<option value="enterprise"' + (tenant.productLine === "enterprise" ? " selected" : "") + '>Enterprise</option>' +
                '</select>' +
              '</label>' +
              '<label>Plano<input name="plan" value="' + escapeHtml(tenant.plan || "") + '" /></label>' +
              '<label>Permissões (separadas por vírgula)<textarea name="permissions" rows="3">' + escapeHtml((tenant.permissions || []).join(", ")) + '</textarea></label>' +
              '<label>Apps Liberados (separados por vírgula)<input name="allowedApps" value="' + escapeHtml((tenant.allowedApps || []).join(", ")) + '" /></label>' +
              '<div class="form-actions">' +
                '<button class="primary" type="submit">Salvar Alterações</button>' +
                '<button class="secondary cancel-tenant-edit" type="button">Cancelar</button>' +
              '</div>' +
            '</form>';
          return;
        }

        detail.innerHTML =
          '<div class="detail-grid">' +
            '<div class="detail-box"><small>Tenant ID</small><strong>' + escapeHtml(tenant.id) + '</strong></div>' +
            '<div class="detail-box"><small>Slug</small><strong>' + escapeHtml(tenant.slug || "") + '</strong></div>' +
            '<div class="detail-box"><small>Linha</small><strong>' + escapeHtml(tenant.productLine) + '</strong></div>' +
            '<div class="detail-box"><small>Escopo</small><strong>' + escapeHtml(tenant.accessScope) + '</strong></div>' +
            '<div class="detail-box"><small>Apps liberados</small><strong>' + escapeHtml((tenant.allowedApps || []).join(", ") || "nenhum") + '</strong></div>' +
            '<div class="detail-box"><small>Responsável</small><strong>' + escapeHtml(tenant.ownerName || "não definido") + '</strong></div>' +
            '<div class="detail-box"><small>Email Responsável</small><strong>' + escapeHtml(tenant.ownerEmail || "não definido") + '</strong></div>' +
          '</div>' +
          '<div class="permission-list">' + (tenant.permissions || []).map((permission) => '<span class="tag">' + escapeHtml(permission) + '</span>').join("") + '</div>' +
          '<div class="permission-list">' +
            '<button class="primary tenant-edit-toggle" type="button">Editar Cadastro</button>' +
            '<button class="primary tenant-action" data-status="active">Ativar</button>' +
            '<button class="primary tenant-action" data-status="suspended">Pausar</button>' +
            '<button class="primary tenant-action" data-status="archived">Arquivar</button>' +
            '<button class="primary tenant-delete" type="button">Excluir teste</button>' +
          '</div>' +
          '<section class="access-section">' +
            '<div class="panel-title"><h3>Pessoas com acesso</h3><span class="chip">' + grants.length + ' acesso(s)</span></div>' +
            '<div class="access-list">' + (grants.map((grant) => {
              if (editingAccessGrantId === grant.id) {
                return '<form class="access-card edit-grant-form" data-grant-id="' + grant.id + '">' +
                  '<label>Nome<input name="name" required value="' + escapeHtml(grant.name) + '" /></label>' +
                  '<label>Email<input name="email" type="email" required value="' + escapeHtml(grant.email) + '" /></label>' +
                  '<label>Perfil' +
                    '<select name="role">' +
                      '<option value="admin"' + (grant.role === "admin" ? " selected" : "") + '>Admin</option>' +
                      '<option value="manager"' + (grant.role === "manager" ? " selected" : "") + '>Gestor</option>' +
                      '<option value="technician"' + (grant.role === "technician" ? " selected" : "") + '>Tecnico</option>' +
                      '<option value="viewer"' + (grant.role === "viewer" ? " selected" : "") + '>Leitura</option>' +
                    '</select>' +
                  '</label>' +
                  '<label>Status' +
                    '<select name="status">' +
                      '<option value="invited"' + (grant.status === "invited" ? " selected" : "") + '>Convidado</option>' +
                      '<option value="active"' + (grant.status === "active" ? " selected" : "") + '>Ativo</option>' +
                      '<option value="revoked"' + (grant.status === "revoked" ? " selected" : "") + '>Revogado</option>' +
                    '</select>' +
                  '</label>' +
                  '<label>Permissões (separadas por vírgula)<textarea name="permissions" rows="2">' + escapeHtml((grant.permissions || []).join(", ")) + '</textarea></label>' +
                  '<div class="form-actions">' +
                    '<button class="primary" type="submit">Salvar</button>' +
                    '<button class="secondary cancel-grant-edit" type="button">Cancelar</button>' +
                  '</div>' +
                '</form>';
              } else {
                return '<article class="access-card">' +
                  '<header>' +
                    '<strong>' + escapeHtml(grant.name) + '</strong>' +
                    '<span class="tag">' + escapeHtml(grant.status) + '</span>' +
                  '</header>' +
                  '<small>' + escapeHtml(grant.email) + ' · ' + escapeHtml(grant.role) + ' · ' + escapeHtml((grant.permissions || []).length) + ' permissões</small>' +
                  '<div class="grant-actions" style="margin-top:8px; display:flex; gap:8px;">' +
                    '<button class="secondary edit-grant-toggle" data-grant-id="' + grant.id + '" type="button" style="padding:4px 8px; font-size:11px; min-height:24px;">Editar</button>' +
                    '<button class="secondary delete-grant" data-grant-id="' + grant.id + '" type="button" style="padding:4px 8px; font-size:11px; min-height:24px; color:var(--danger);">Remover</button>' +
                  '</div>' +
                '</article>';
              }
            }).join("") || '<article class="access-card"><strong>Nenhum usuário concedido</strong><small>Use o formulário abaixo para convidar o primeiro acesso deste tenant.</small></article>') + '</div>' +
            '<form class="grant-form" id="grant-form">' +
              '<label>Nome<input name="name" required placeholder="Nome do usuário" /></label>' +
              '<label>Email<input name="email" type="email" required placeholder="usuario@cliente.com" /></label>' +
              '<label>Perfil<select name="role"><option value="admin">Admin</option><option value="manager">Gestor</option><option value="technician">Tecnico</option><option value="viewer">Leitura</option></select></label>' +
              '<button class="primary" type="submit">Conceder acesso</button>' +
            '</form>' +
          '</section>';
      }

      async function refresh() {
        try {
          render(await call("/owner/summary"));
        } catch (error) {
          metrics.innerHTML = '<article class="metric accent"><strong>Offline</strong><span>API owner indisponível</span></article>';
          list.innerHTML = '<article class="tenant-card"><h3>Não foi possível carregar</h3><p>' + escapeHtml(error.message) + '</p><p>Confirme se a API foi reiniciada em localhost:4000.</p></article>';
          renderTenantDetail(null);
        }
      }

      list.addEventListener("click", (event) => {
        const card = event.target.closest("[data-tenant-id]");
        if (!card) return;
        selectedTenantId = card.dataset.tenantId;
        isEditingTenant = false;
        editingAccessGrantId = null;
        list.querySelectorAll(".tenant-card").forEach((item) => item.classList.toggle("selected", item.dataset.tenantId === selectedTenantId));
        renderTenantDetail(currentTenants.find((tenant) => tenant.id === selectedTenantId));
      });

      document.addEventListener("click", async (event) => {
        const tenant = currentTenants.find((item) => item.id === selectedTenantId);
        if (!tenant) return;
        const statusButton = event.target.closest(".tenant-action");
        if (statusButton) {
          notice.textContent = "Atualizando tenant...";
          try {
            await call("/owner/tenants/" + encodeURIComponent(tenant.id), {
              method: "PATCH",
              body: JSON.stringify({ status: statusButton.dataset.status })
            });
            notice.textContent = "Tenant atualizado.";
            await refresh();
          } catch (error) {
            notice.textContent = "Erro: " + error.message;
          }
        }
        if (event.target.closest(".tenant-delete")) {
          if (!confirm("Excluir este tenant e acessos vinculados do banco em modo teste?")) return;
          notice.textContent = "Excluindo tenant de teste...";
          try {
            await call("/owner/tenants/" + encodeURIComponent(tenant.id), { method: "DELETE" });
            selectedTenantId = "";
            notice.textContent = "Tenant excluido do banco em modo teste.";
            await refresh();
          } catch (error) {
            notice.textContent = "Erro: " + error.message;
          }
        }
        if (event.target.closest(".tenant-edit-toggle")) {
          isEditingTenant = true;
          renderTenantDetail(tenant);
        }
        if (event.target.closest(".cancel-tenant-edit")) {
          isEditingTenant = false;
          renderTenantDetail(tenant);
        }
        const editGrantBtn = event.target.closest(".edit-grant-toggle");
        if (editGrantBtn) {
          editingAccessGrantId = editGrantBtn.dataset.grantId;
          renderTenantDetail(tenant);
        }
        if (event.target.closest(".cancel-grant-edit")) {
          editingAccessGrantId = null;
          renderTenantDetail(tenant);
        }
        const deleteGrantBtn = event.target.closest(".delete-grant");
        if (deleteGrantBtn) {
          const grantId = deleteGrantBtn.dataset.grantId;
          if (confirm("Deseja realmente remover este acesso?")) {
            notice.textContent = "Removendo acesso...";
            try {
              await call("/owner/access-grants/" + encodeURIComponent(grantId), { method: "DELETE" });
              notice.textContent = "Acesso removido com sucesso.";
              await refresh();
            } catch (error) {
              notice.textContent = "Erro: " + error.message;
            }
          }
        }
      });

      function switchView(view) {
        const target = view === "saas" ? "saas" : "dashboard";
        document.querySelector("#dashboard-view").hidden = target !== "dashboard";
        document.querySelector("#saas-view").hidden = target !== "saas";
        document.querySelectorAll("[data-view-link]").forEach((link) => link.classList.toggle("active", link.dataset.viewLink === target));
      }

      window.addEventListener("hashchange", () => switchView(location.hash.replace("#", "")));
      switchView(location.hash.replace("#", ""));

      document.addEventListener("submit", async (event) => {
        const form = event.target;
        if (form.id === "grant-form") {
          event.preventDefault();
          const tenant = currentTenants.find((item) => item.id === selectedTenantId);
          if (!tenant) return;
          const data = Object.fromEntries(new FormData(form).entries());
          notice.textContent = "Concedendo acesso...";
          try {
            await call("/owner/access-grants", {
              method: "POST",
              body: JSON.stringify({
                tenantId: tenant.id,
                name: data.name,
                email: data.email,
                role: data.role,
                permissions: tenant.permissions || []
              })
            });
            notice.textContent = "Acesso concedido e registrado.";
            await refresh();
          } catch (error) {
            notice.textContent = "Erro: " + error.message;
          }
        } else if (form.id === "edit-tenant-form") {
          event.preventDefault();
          const tenant = currentTenants.find((item) => item.id === selectedTenantId);
          if (!tenant) return;
          const data = Object.fromEntries(new FormData(form).entries());
          notice.textContent = "Salvando alterações do tenant...";
          const permissions = (data.permissions || "").split(",").map(p => p.trim()).filter(Boolean);
          const allowedApps = (data.allowedApps || "").split(",").map(a => a.trim()).filter(Boolean);
          try {
            await call("/owner/tenants/" + encodeURIComponent(tenant.id), {
              method: "PATCH",
              body: JSON.stringify({
                name: data.name,
                slug: data.slug,
                ownerName: data.ownerName,
                ownerEmail: data.ownerEmail,
                productLine: data.productLine,
                plan: data.plan,
                permissions,
                allowedApps
              })
            });
            isEditingTenant = false;
            notice.textContent = "Tenant atualizado com sucesso.";
            await refresh();
          } catch (error) {
            notice.textContent = "Erro: " + error.message;
          }
        } else if (form.classList.contains("edit-grant-form")) {
          event.preventDefault();
          const grantId = form.dataset.grantId;
          const data = Object.fromEntries(new FormData(form).entries());
          notice.textContent = "Salvando alterações de acesso...";
          const permissions = (data.permissions || "").split(",").map(p => p.trim()).filter(Boolean);
          try {
            await call("/owner/access-grants/" + encodeURIComponent(grantId), {
              method: "PATCH",
              body: JSON.stringify({
                name: data.name,
                email: data.email,
                role: data.role,
                status: data.status,
                permissions
              })
            });
            editingAccessGrantId = null;
            notice.textContent = "Acesso atualizado com sucesso.";
            await refresh();
          } catch (error) {
            notice.textContent = "Erro: " + error.message;
          }
        }
      });

      function checkedValues(form, name) {
        return Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map((item) => item.value);
      }

      function makeSlug(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 48);
      }

      const tenantForm = document.querySelector("#tenant-form");
      const tenantName = tenantForm.querySelector('input[name="name"]');
      const tenantSlug = tenantForm.querySelector('input[name="slug"]');
      tenantName.addEventListener("input", () => {
        if (!tenantSlug.dataset.touched) tenantSlug.value = makeSlug(tenantName.value);
      });
      tenantSlug.addEventListener("input", () => {
        tenantSlug.dataset.touched = "true";
        tenantSlug.value = makeSlug(tenantSlug.value);
      });

      document.querySelector("#tenant-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        notice.textContent = "Criando tenant...";
        try {
          await call("/owner/tenants", {
            method: "POST",
            body: JSON.stringify({
              code: data.code || undefined,
              slug: data.slug,
              name: data.name,
              productLine: data.productLine,
              ownerName: data.ownerName || undefined,
              ownerEmail: data.ownerEmail || undefined
            })
          });
          form.reset();
          delete tenantSlug.dataset.touched;
          notice.textContent = "Tenant criado com sucesso.";
          await refresh();
        } catch (error) {
          notice.textContent = "Erro: " + error.message;
        }
      });

      metrics.addEventListener("click", (event) => {
        const metricCard = event.target.closest(".metric");
        if (metricCard) {
          location.hash = "#saas";
        }
      });

      refresh();
    </script>
  </body>
</html>`;

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(url.pathname === "/login" ? loginHtml : url.pathname === "/owner" ? ownerHtml : html);
});

server.listen(port, () => {
  console.log(`Atlas OS Enterprise listening on http://localhost:${port}`);
});
