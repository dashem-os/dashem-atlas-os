import { createServer } from "node:http";

const preferredPort = Number(process.env.ATLAS_WEB_PORT ?? 5173);

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
        color: #edf7ff;
        background: #07131c;
        --bg: #07131c;
        --panel: rgba(9, 30, 44, 0.82);
        --panel-strong: rgba(11, 40, 58, 0.94);
        --line: rgba(73, 180, 232, 0.22);
        --line-strong: rgba(73, 180, 232, 0.48);
        --text-soft: #9eb7c7;
        --blue: #1a8cff;
        --cyan: #25c7ff;
        --green: #28d778;
        --amber: #ff9f1a;
        --orange: #ff6a00;
        --danger: #ff5a65;
        color-scheme: dark;
      }

      * { box-sizing: border-box; }
      html { min-height: 100%; background: var(--bg); }
      body {
        min-height: 100vh;
        margin: 0;
        background:
          radial-gradient(circle at 8% 0%, rgba(32, 141, 255, 0.2), transparent 34%),
          radial-gradient(circle at 100% 16%, rgba(255, 128, 0, 0.16), transparent 28%),
          linear-gradient(145deg, #07131c 0%, #061018 52%, #081924 100%);
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
        background: rgba(4, 14, 22, 0.72);
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
      .side-label { color: #62879b; font-size: 11px; font-weight: 800; text-transform: uppercase; }
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
        border-color: var(--line);
        background: rgba(28, 123, 188, 0.12);
        color: #fff;
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
        background: rgba(7, 24, 36, 0.78);
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
        background: linear-gradient(145deg, rgba(10, 35, 51, 0.86), rgba(4, 16, 25, 0.72));
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
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
        color: #fff;
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
        padding: 12px;
        border: 1px solid rgba(73, 180, 232, 0.18);
        border-radius: 8px;
        background: rgba(4, 16, 25, 0.5);
        display: grid;
        gap: 4px;
      }
      .slot strong { font-size: 14px; }
      .slot small { color: var(--text-soft); line-height: 1.4; }

      .orders-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
        align-items: start;
      }
      .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
      .tab {
        min-height: 36px;
        padding: 7px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(7, 24, 36, 0.72);
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
        color: #fff;
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

      form { display: grid; gap: 10px; }
      label { display: grid; gap: 5px; color: var(--text-soft); font-size: 12px; font-weight: 800; }
      input, textarea, select {
        width: 100%;
        border: 1px solid rgba(73, 180, 232, 0.26);
        border-radius: 8px;
        padding: 10px;
        color: #f4fbff;
        background: rgba(4, 14, 22, 0.86);
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
        background: rgba(7, 24, 36, 0.82);
        color: #d7eefb;
      }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }

      .finance-grid, .ai-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .ai-card {
        min-height: 130px;
        padding: 16px;
        border-radius: 8px;
        display: grid;
        gap: 8px;
        align-content: start;
      }
      .ai-card strong { color: #fff; }
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
        left: 50%;
        bottom: calc(26px + env(safe-area-inset-bottom));
        z-index: 30;
        width: 62px;
        height: 62px;
        border: 1px solid rgba(255, 185, 76, 0.9);
        border-radius: 50%;
        background: radial-gradient(circle, #ffb64d 0%, #ff7a00 44%, #5a2400 100%);
        color: #fff;
        font-size: 34px;
        transform: translateX(-50%);
        box-shadow: 0 0 28px rgba(255, 159, 26, 0.66);
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
        background: rgba(3, 12, 19, 0.88);
        backdrop-filter: blur(18px);
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
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

      @media (max-width: 980px) {
        .app { display: block; }
        .side { display: none; }
        .content { padding: 18px 14px 104px; }
        .topbar { align-items: start; }
        .status-pill span { display: none; }
        .home-grid, .orders-layout { grid-template-columns: 1fr; }
        .ops-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .finance-grid, .ai-grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 420px) {
        .ops-grid { grid-template-columns: 1fr; }
        .inline { grid-template-columns: 1fr; }
        .hello h1 { font-size: 25px; }
        .op-card { min-height: 112px; }
      }
    </style>
  </head>
  <body>
    <main class="app">
      <aside class="side" aria-label="Menu de apoio">
        <div class="brand">
          <div class="brand-mark">D</div>
          <strong>DASHEM</strong>
          <span>Technologies</span>
        </div>
        <div class="side-group">
          <div class="side-label">Navegacao</div>
          <button class="active" data-tab="home"><span>⌂</span>Home operacional</button>
          <button data-tab="orders"><span>▣</span>Ordens de servico</button>
          <button data-tab="finance"><span>$</span>Financeiro</button>
          <button data-tab="ai"><span>✦</span>Assistente IA</button>
          <button data-tab="profile"><span>○</span>Perfil</button>
        </div>
        <div class="side-group">
          <div class="side-label">Apoio</div>
          <button data-tab="admin"><span>⚙</span>Configuracoes</button>
          <button data-tab="admin"><span>⇄</span>Integracoes</button>
          <button data-tab="admin"><span>□</span>Relatorios avancados</button>
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
            <div class="avatar" title="Perfil">MS</div>
          </div>
        </header>

        <div id="home" class="view active">
          <div class="summary" id="metrics"></div>
          <div class="home-grid">
            <div class="ops-grid" id="operation-cards"></div>
            <aside class="panel">
              <div class="panel-title">
                <h2>Slots inteligentes</h2>
                <span class="chip" id="profile-chip">Tecnico</span>
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
                <h2>Ordens de Servico</h2>
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
                <button id="attach-evidence" class="secondary">Evidencia</button>
                <button id="diagnosis-agent" class="secondary">Diagnostico IA</button>
                <button id="budget-agent" class="secondary">Orcamento IA</button>
                <button id="submit-budget" class="primary">Enviar orcamento</button>
                <button id="approve-budget" class="secondary">Aprovar</button>
                <button id="start-work" class="secondary">Executar</button>
                <button id="close-work" class="secondary">Encerrar</button>
              </div>
            </aside>
          </div>

          <div class="orders-layout">
            <form id="work-order-form" class="panel">
              <div class="panel-title"><h3>Nova ordem de servico</h3></div>
              <label>Ativo<select id="asset-select" required></select></label>
              <label>Titulo<input name="title" placeholder="Manutencao em ar condicionado split" required /></label>
              <label>Descricao<textarea name="description"></textarea></label>
              <div class="inline">
                <label>Tecnico<input name="technicianName" /></label>
                <label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
              </div>
              <div class="inline">
                <label>SLA / prazo<input name="dueAt" type="datetime-local" /></label>
                <label>Duracao estimada (h)<input name="estimatedDurationHours" type="number" min="0" step="0.5" /></label>
              </div>
              <label>Diagnostico<textarea name="diagnosis"></textarea></label>
              <div class="inline">
                <label>Material<input name="materialName" /></label>
                <label>Quantidade<input name="materialQuantity" type="number" min="0" step="0.01" /></label>
              </div>
              <div class="inline">
                <label>Preco unitario<input name="materialUnitPrice" type="number" min="0" step="0.01" /></label>
                <label>Mao de obra R$/h<input name="laborRate" type="number" min="0" step="0.01" /></label>
              </div>
              <label>Horas de mao de obra<input name="laborHours" type="number" min="0" step="0.5" /></label>
              <button class="primary" type="submit">Abrir OS</button>
            </form>

            <form id="budget-form" class="panel">
              <div class="panel-title"><h3>Composicao de orcamento</h3></div>
              <div class="inline">
                <label>Materiais<input name="materialsTotal" type="number" min="0" step="0.01" /></label>
                <label>Mao de obra<input name="laborTotal" type="number" min="0" step="0.01" /></label>
              </div>
              <div class="inline">
                <label>Margem (%)<input name="marginPercent" type="number" min="0" step="0.01" value="20" /></label>
                <label>Duracao (h)<input name="durationHours" type="number" min="0" step="0.5" /></label>
              </div>
              <div class="inline">
                <label>Risco<select name="riskLevel"><option value="low">Baixo</option><option value="medium">Medio</option><option value="high">Alto</option><option value="critical">Critico</option></select></label>
                <label>Preco final<input name="amount" type="number" min="0" step="0.01" required /></label>
              </div>
              <label>Notas<textarea name="notes"></textarea></label>
            </form>
          </div>
        </div>

        <div id="finance" class="view">
          <div class="summary" id="finance-metrics"></div>
          <div class="finance-grid">
            <div class="panel"><div class="panel-title"><h2>Fluxo de caixa</h2></div><div id="cashflow" class="smart-slots"></div></div>
            <div class="panel"><div class="panel-title"><h2>Inadimplencia</h2></div><div class="slot"><strong>Sem bloqueios criticos</strong><small>Use a IA para prever atraso por cliente e OS.</small></div></div>
            <div class="panel"><div class="panel-title"><h2>Faturamento</h2></div><div class="slot"><strong id="billing-total">R$ 0,00</strong><small>Receita aprovada em ordens ativas.</small></div></div>
          </div>
        </div>

        <div id="ai" class="view">
          <div class="ai-grid" id="agent-cards"></div>
          <pre id="agent-output">{}</pre>
        </div>

        <div id="profile" class="view">
          <div class="panel">
            <div class="panel-title"><h2>Perfil operacional</h2><span class="chip">PWA</span></div>
            <div class="smart-slots">
              <div class="slot"><strong>Instalavel na tela inicial</strong><small>Interface priorizada para uso em campo e toque rapido.</small></div>
              <div class="slot"><strong>Offline parcial</strong><small>Fluxos criticos podem evoluir para fila local quando a API estiver fora.</small></div>
              <div class="slot"><strong>Notificacoes push</strong><small>Pronto para alertas de SLA, aprovacao e chamados pendentes.</small></div>
            </div>
          </div>
        </div>

        <div id="admin" class="view">
          <div class="orders-layout">
            <form id="organization-form" class="panel">
              <div class="panel-title"><h3>Cliente / contrato</h3></div>
              <label>Nome do cliente<input name="name" required /></label>
              <label>Slug<input name="slug" required /></label>
              <div class="inline">
                <label>Tipo<select name="type"><option value="corporate">Empresa</option><option value="private">Particular</option></select></label>
                <label>SLA alvo (%)<input name="targetSla" type="number" min="0" max="100" /></label>
              </div>
              <label>Contrato mensal<input name="monthlyContractValue" type="number" min="0" step="0.01" /></label>
              <button class="primary" type="submit">Criar cliente</button>
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
        <button class="secondary" data-quick="client">Novo cliente</button>
        <button class="secondary" data-quick="ai">Assistente IA</button>
      </div>
    </div>

    <nav class="bottom" aria-label="Navegacao principal">
      <button class="active" data-tab="home"><b>⌂</b><span>Home</span></button>
      <button data-tab="orders"><b>▣</b><span>OS</span></button>
      <button data-tab="finance"><b>$</b><span>Financeiro</span></button>
      <button data-tab="ai"><b>✦</b><span>IA</span></button>
      <button data-tab="profile"><b>○</b><span>Perfil</span></button>
    </nav>

    <script>
      const apiBase = new URLSearchParams(location.search).get("api") || "http://localhost:4000";
      const state = { organizations: [], assets: [], workOrders: [], activeOrganizationId: "", activeWorkOrderId: "", filter: "all" };

      const el = (id) => document.getElementById(id);
      const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const asNumber = (value) => value === "" || value === null || value === undefined ? undefined : Number(value);
      const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

      async function call(path, options) {
        const response = await fetch(apiBase + path, { headers: { "content-type": "application/json" }, ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || "HTTP " + response.status);
        return data;
      }

      function activeOrganization() {
        return state.organizations.find((item) => item.id === state.activeOrganizationId);
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
        const health = await call("/health");
        el("health-label").textContent = health.ok ? "API online" : "API degradada";

        state.organizations = (await call("/organizations")).items || [];
        if (!state.activeOrganizationId && state.organizations[0]) state.activeOrganizationId = state.organizations[0].id;

        if (state.activeOrganizationId) {
          state.assets = (await call("/assets?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
          state.workOrders = (await call("/maintenance/work-orders?organizationId=" + encodeURIComponent(state.activeOrganizationId))).items || [];
          if (!state.activeWorkOrderId && state.workOrders[0]) state.activeWorkOrderId = state.workOrders[0].id;
        } else {
          state.assets = [];
          state.workOrders = [];
        }

        render();
        await refreshTimeline();
      }

      function render() {
        renderSelectors();
        renderMetrics();
        renderOperationCards();
        renderSmartSlots();
        renderContextAi();
        renderWorkOrders();
        renderSelectedWorkOrder();
        renderFinance();
        renderAgentCards();
      }

      function renderSelectors() {
        el("organization-select").innerHTML = state.organizations.map((org) => '<option value="' + org.id + '">' + htmlEscape(org.name) + '</option>').join("");
        el("organization-select").value = state.activeOrganizationId;
        el("asset-select").innerHTML = state.assets.map((asset) => '<option value="' + asset.id + '">' + htmlEscape(asset.name) + " - " + htmlEscape(asset.criticality) + '</option>').join("");
      }

      function renderMetrics() {
        const organization = activeOrganization();
        const data = totals();
        el("metrics").innerHTML = [
          ["OS em aberto", data.open, "accent"],
          ["Orcamentos", state.workOrders.filter((wo) => wo.budget).length, ""],
          ["Receitas", money(data.revenue), ""],
          ["Margem", money(data.margin), data.margin >= 0 ? "accent" : ""]
        ].map((item) => '<div class="metric"><strong class="' + item[2] + '">' + htmlEscape(item[1]) + '</strong><span>' + item[0] + (organization ? " · " + htmlEscape(organization.name) : "") + '</span></div>').join("");
      }

      function renderOperationCards() {
        const cards = [
          ["Nova OS", "Abrir ordem", "OS", "blue", "work-order"],
          ["Gerar Orcamento", "Proposta rapida", "$", "green", "budget"],
          ["Clientes", "Contratos e cadastro", "CL", "purple", "client"],
          ["Estoque", "Pecas e insumos", "PK", "orange", "admin"],
          ["Fluxo de Caixa", "Entradas e saidas", "FX", "green", "finance"],
          ["Financeiro", "Contas e relatorios", "$", "blue", "finance"],
          ["Assistente IA", "Sugestoes em contexto", "AI", "orange", "ai"],
          ["Ativos", "Equipamentos", "AT", "blue", "admin"],
          ["Agenda Tecnica", "Compromissos", "AG", "purple", "orders"],
          ["Chamados Pendentes", totals().open + " aguardando", "!", "orange", "orders"]
        ];
        el("operation-cards").innerHTML = cards.map((card) =>
          '<button class="op-card ' + card[3] + '" data-quick="' + card[4] + '"><span class="op-icon">' + card[2] + '</span><span><strong>' + card[0] + '</strong><br><span>' + card[1] + '</span></span></button>'
        ).join("");
      }

      function renderSmartSlots() {
        const next = state.workOrders.find((wo) => wo.state !== "closed" && wo.state !== "cancelled");
        el("smart-slots").innerHTML = [
          ["OS do dia", next ? next.title : "Nenhuma OS pendente"],
          ["Rota e check-in", next?.technicianName ? "Tecnico: " + next.technicianName : "Aguardando tecnico"],
          ["Orcamento rapido", next?.budget ? money(next.budget.amount) : "IA pronta para sugerir"],
          ["Upload de campo", next ? "Anexe evidencia na OS selecionada" : "Crie uma OS para anexar"]
        ].map((item) => '<div class="slot"><strong>' + htmlEscape(item[0]) + '</strong><small>' + htmlEscape(item[1]) + '</small></div>').join("");
      }

      function renderContextAi() {
        const data = totals();
        el("context-ai").innerHTML = [
          ["IA sugere orcamento", "Baseado em servicos similares, tempo e materiais."],
          ["Atencao operacional", data.open + " OS abertas e " + data.progress + " em andamento."],
          ["Previsao de caixa", "Resultado previsto: " + money(data.margin) + " no ciclo atual."]
        ].map((item) => '<div class="ai-card"><strong>' + item[0] + '</strong><p>' + item[1] + '</p></div>').join("");
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
          return '<button class="order-card' + selected + '" data-wo="' + wo.id + '"><span class="order-head"><strong>OS #' + htmlEscape(wo.id) + '</strong>' + stateBadge(wo) + '</span><p>Cliente: ' + htmlEscape(activeOrganization()?.name || "") + '</p><p>Equipamento: ' + htmlEscape(asset?.name || wo.assetId) + '</p><p>' + htmlEscape(wo.dueAt || "Sem prazo definido") + '</p></button>';
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
        if (!wo) {
          el("selected-work-order").innerHTML = "Selecione uma OS para operar.";
          el("selected-state").textContent = "Aguardando";
          return;
        }
        const materials = (wo.materials || []).map((item) => item.name + " x" + item.quantity + " = " + money(item.totalPrice)).join("<br>");
        el("selected-state").textContent = wo.state;
        el("selected-work-order").innerHTML =
          "<strong>" + htmlEscape(wo.title) + "</strong><small>Tecnico: " + htmlEscape(wo.technicianName || "nao definido") + "</small>" +
          "<small>Diagnostico: " + htmlEscape(wo.diagnosis || "nao registrado") + "</small>" +
          "<small>Materiais:<br>" + (materials || "nao composto") + "</small>" +
          "<small>Mao de obra: " + money(wo.laborCost || 0) + "</small>";

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
          ["Saidas", money(data.cost)],
          ["Saldo operacional", money(data.margin)]
        ].map((item) => '<div class="slot"><strong>' + item[0] + '</strong><small>' + item[1] + '</small></div>').join("");
        el("billing-total").textContent = money(data.revenue);
      }

      function renderAgentCards() {
        el("agent-cards").innerHTML = [
          ["Agente Orcamentista", "Gera composicao tecnica preliminar com aprovacao humana.", "budget"],
          ["Agente Diagnostico", "Interpreta descricao, evidencias e historico da OS selecionada.", "diagnosis"],
          ["Agente Supervisor", "Sinaliza riscos de SLA, gargalos e pendencias.", "risk"]
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

      function navigate(tab) {
        document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
        document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
        el(tab).classList.add("active");
        el("quick-sheet").classList.remove("open");
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

      el("fab").addEventListener("click", () => {
        el("quick-sheet").classList.toggle("open");
      });

      el("organization-select").addEventListener("change", async (event) => {
        state.activeOrganizationId = event.target.value;
        state.activeWorkOrderId = "";
        await load();
      });

      el("organization-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        data.monthlyContractValue = asNumber(data.monthlyContractValue) || 0;
        data.targetSla = asNumber(data.targetSla) || 0;
        const created = await call("/organizations", { method: "POST", body: JSON.stringify(data) });
        state.activeOrganizationId = created.organization.id;
        event.currentTarget.reset();
        await load();
      });

      el("asset-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        data.organizationId = state.activeOrganizationId;
        await call("/assets", { method: "POST", body: JSON.stringify(data) });
        event.currentTarget.reset();
        await load();
      });

      el("work-order-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const materialName = String(data.materialName || "").trim();
        const payload = {
          organizationId: state.activeOrganizationId,
          assetId: el("asset-select").value,
          title: data.title,
          description: data.description,
          technicianName: data.technicianName,
          priority: data.priority,
          dueAt: data.dueAt ? new Date(String(data.dueAt)).toISOString() : undefined,
          diagnosis: data.diagnosis,
          estimatedDurationHours: asNumber(data.estimatedDurationHours),
          laborHours: asNumber(data.laborHours),
          laborRate: asNumber(data.laborRate),
          materials: materialName ? [{ name: materialName, quantity: asNumber(data.materialQuantity) || 0, unitPrice: asNumber(data.materialUnitPrice) || 0 }] : []
        };
        const created = await call("/maintenance/work-orders", { method: "POST", body: JSON.stringify(payload) });
        state.activeWorkOrderId = created.workOrder.id;
        event.currentTarget.reset();
        await load();
      });

      el("attach-evidence").addEventListener("click", async () => {
        requireWorkOrder();
        const title = window.prompt("Titulo da evidencia");
        if (!title) return;
        const notes = window.prompt("Notas da evidencia") || "";
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
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/status", { method: "PATCH", body: JSON.stringify({ organizationId: state.activeOrganizationId, state: "in_progress", reason: "Execucao iniciada pelo cockpit." }) });
        await load();
      });

      el("close-work").addEventListener("click", async () => {
        requireWorkOrder();
        await call("/maintenance/work-orders/" + encodeURIComponent(state.activeWorkOrderId) + "/status", { method: "PATCH", body: JSON.stringify({ organizationId: state.activeOrganizationId, state: "closed", reason: "Servico encerrado pelo cockpit." }) });
        await load();
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
