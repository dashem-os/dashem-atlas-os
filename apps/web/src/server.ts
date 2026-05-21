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

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(port, () => {
  console.log(`Atlas OS Enterprise listening on http://localhost:${port}`);
});
