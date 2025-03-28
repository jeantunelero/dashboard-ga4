const periodButtons = document.querySelectorAll('.filtros button');
const inicioInput = document.getElementById('inicio');
const fimInput = document.getElementById('fim');

let periodoSelecionado = '7d';

periodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    periodoSelecionado = btn.getAttribute('onclick').split("'")[1];
    atualizarDashboard();
  });
});

document.getElementById('aplicarIntervalo').addEventListener('click', () => {
  atualizarDashboard(true);
});

document.getElementById('atualizarBtn').addEventListener('click', () => {
  atualizarDashboard();
});

document.getElementById('limparBtn').addEventListener('click', () => {
  inicioInput.value = '';
  fimInput.value = '';
  document.getElementById('eventoLinhaSelect').value = 'Todos';
  periodoSelecionado = '7d';
  atualizarDashboard();
});

let chartLinha;

async function atualizarDashboard(usandoDatas = false) {
  const inicio = inicioInput.value;
  const fim = fimInput.value;

  let query = usandoDatas && inicio && fim
    ? `?startDate=${inicio}&endDate=${fim}`
    : `?period=${periodoSelecionado}`;

  const eventos = await fetch(`/api/eventos${query}`).then(res => res.json());
  const visitas = await fetch(`/api/pageviews-por-dia${query}`).then(res => res.json());

  renderizarCartoes(eventos);
  atualizarGraficoLinha(visitas);
  preencherSelectEventos(visitas);
}

function renderizarCartoes(eventos) {
  const container = document.getElementById('eventosCards');
  container.innerHTML = '';

  const eventosPermitidos = [
    'Visualização do Site',
    'Primeira Visita',
    'click',
    'Botão - Consultoria',
    'Botão - You tube',
    'Botão - Tik Tok'
  ];

  eventos
    .filter(evento => eventosPermitidos.includes(evento.evento))
    .forEach((evento) => {
      const card = document.createElement('div');
      card.className = 'card-metrica';
      card.innerHTML = `
        <div class="valor">${evento.total}</div>
        <div class="label">${evento.evento === 'click' ? 'Todos os cliques' : evento.evento}</div>
      `;
      container.appendChild(card);
    });
}

function atualizarGraficoLinha(visitas) {
  const eventoSelecionado = document.getElementById('eventoLinhaSelect').value;
  const visitasFiltradas = eventoSelecionado === 'Todos'
    ? visitas
    : visitas.filter(v => v.evento === eventoSelecionado);

  const dadosAgrupados = visitasFiltradas.reduce((acc, cur) => {
    const dia = cur.data;
    acc[dia] = (acc[dia] || 0) + cur.total;
    return acc;
  }, {});

  const labels = Object.keys(dadosAgrupados);
  const data = Object.values(dadosAgrupados);

  const ctx = document.getElementById('graficoLinha').getContext('2d');

  if (chartLinha) chartLinha.destroy();

  chartLinha = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Visitas por Dia',
        data,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 4,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#fff' } },
        y: { ticks: { color: '#fff' } }
      },
      plugins: {
        legend: { labels: { color: '#fff' } }
      }
    }
  });
}

function preencherSelectEventos(visitas) {
  const select = document.getElementById('eventoLinhaSelect');
  const eventosUnicos = Array.from(new Set(visitas.map(v => v.evento)));

  select.innerHTML = '<option value="Todos">Todos</option>';
  eventosUnicos.forEach(evento => {
    const opt = document.createElement('option');
    opt.value = evento;
    opt.textContent = evento;
    select.appendChild(opt);
  });
}

atualizarDashboard();