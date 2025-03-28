// server.js - Backend Node.js para GA4 com layout atualizado e filtros corrigidos

const express = require('express');
const bodyParser = require('body-parser');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
const propertyId = '477368274';

function getDateRange(period) {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  const startDate = new Date();
  if (period === 'hoje') {
    startDate.setDate(today.getDate());
  } else if (period === '7d') {
    startDate.setDate(today.getDate() - 6);
  } else if (period === '14d') {
    startDate.setDate(today.getDate() - 13);
  } else if (period === '30d') {
    startDate.setDate(today.getDate() - 29);
  } else if (period === '60d') {
    startDate.setDate(today.getDate() - 59);
  } else if (period === '90d') {
    startDate.setDate(today.getDate() - 89);
  } else {
    startDate.setDate(today.getDate() - 6);
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate
  };
}

app.get('/api/eventos', async (req, res) => {
  const { period = '7d' } = req.query;
  const { start, end } = getDateRange(period);

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
    });

    const nomesCustomizados = {
      'page_view': 'Visualização do Site',
      'session_start': 'Sessão de Início',
      'first_visit': 'Primeira Visita'
    };

    const data = response.rows.map(row => {
      const nomeOriginal = row.dimensionValues[0].value;
      return {
        evento: nomesCustomizados[nomeOriginal] || nomeOriginal,
        total: parseInt(row.metricValues[0].value)
      };
    });

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

app.get('/api/pageviews-por-dia', async (req, res) => {
  const { period = '7d', startDate, endDate } = req.query;
  let start, end;

  if (startDate && endDate) {
    start = startDate;
    end = endDate;
  } else {
    const range = getDateRange(period);
    start = range.start;
    end = range.end;
  }

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: 'date' },
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    const data = response.rows.map(row => {
      const rawDate = row.dimensionValues[0].value;
      const dia = rawDate.slice(6, 8);
      const mes = rawDate.slice(4, 6);
      return {
        data: `${dia}/${mes}`,
        evento: row.dimensionValues[1].value,
        total: parseInt(row.metricValues[0].value)
      };
    });

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar visitas por dia:', error);
    res.status(500).json({ error: 'Erro ao buscar visitas por dia' });
  }
});

app.get('/api/localizacao', async (req, res) => {
  const { period = '7d' } = req.query;
  const { start, end } = getDateRange(period);

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }]
    });

    const paisCoordenadas = {
      'Brazil': { lat: -14.2, lng: -51.9 },
      'United States': { lat: 37.1, lng: -95.7 },
      'Portugal': { lat: 39.4, lng: -8.2 },
      'India': { lat: 20.6, lng: 78.9 },
      'United Kingdom': { lat: 55.3, lng: -3.4 }
    };

    const data = response.rows.map(row => {
      const pais = row.dimensionValues[0].value;
      return {
        pais,
        usuarios: parseInt(row.metricValues[0].value),
        coords: paisCoordenadas[pais] || null
      };
    });

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar localização:', error);
    res.status(500).json({ error: 'Erro ao buscar localização' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
