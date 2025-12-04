// generate_usarmy_chart.js
// Liest US-Army-Hierarchie aus Postgres und erzeugt ein SVG-Organigramm + PNG

const fs = require('fs');
const { Client } = require('pg');
const sharp = require('sharp');

// HIER CREDENTIALS ANPASSEN
const dbConfig = {
  user: 'postgres',      // dein DB-User
  host: 'localhost',     // bei WSL: meist 'localhost'
  database: 'usarmy',    // DB-Name
  password: process.env.DB_PASS,  // dein Passwort
  port: 5432             // Standard-Port von Postgres
};

if (!dbConfig.password) {
  console.error('Fehler: Umgebungsvariable DB_PASS ist nicht gesetzt.');
  process.exit(1);
}

async function fetchUnits() {
  const client = new Client(dbConfig);
  await client.connect();
  const res = await client.query(
    'SELECT id, name, abbrev, unit_type, parent_id FROM units ORDER BY id'
  );
  await client.end();
  return res.rows;
}

function buildHierarchy(rows) {
  const nodesById = new Map();

  rows.forEach(r => {
    nodesById.set(r.id, {
      id: r.id,
      name: r.name,
      abbrev: r.abbrev,
      unit_type: r.unit_type,
      parent_id: r.parent_id,
      children: []
    });
  });

  const roots = [];

  nodesById.forEach(node => {
    if (node.parent_id == null) {
      roots.push(node);
    } else {
      const parent = nodesById.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Fallback, falls Parent fehlt
        roots.push(node);
      }
    }
  });

  return { roots, nodesById };
}

// Simple Layer-Layout: alle Nodes mit gleicher Tiefe in einer horizontalen Reihe
function layoutTree(roots) {
  const levels = new Map();

  function traverse(node, depth) {
    node.depth = depth;
    if (!levels.has(depth)) {
      levels.set(depth, []);
    }
    levels.get(depth).push(node);
    node.children.forEach(child => traverse(child, depth + 1));
  }

  roots.forEach(root => traverse(root, 0));

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 60;
  const H_GAP = 40;
  const V_GAP = 80;
  const MARGIN_X = 40;
  const MARGIN_Y = 40;

  let maxCols = 0;
  levels.forEach(nodes => {
    if (nodes.length > maxCols) maxCols = nodes.length;
  });

  const svgWidth =
    MARGIN_X * 2 + maxCols * NODE_WIDTH + (maxCols - 1) * H_GAP;
  const maxDepth = Math.max(...levels.keys());
  const svgHeight =
    MARGIN_Y * 2 + (maxDepth + 1) * NODE_HEIGHT + maxDepth * V_GAP;

  // Zentriere jede Ebene horizontal
  levels.forEach((nodes, depth) => {
    const nodesCount = nodes.length;
    const totalWidth =
      nodesCount * NODE_WIDTH + (nodesCount - 1) * H_GAP;
    const startX = (svgWidth - totalWidth) / 2;

    nodes.forEach((node, index) => {
      node.x = startX + index * (NODE_WIDTH + H_GAP);
      node.y = MARGIN_Y + depth * (NODE_HEIGHT + V_GAP);
      node.width = NODE_WIDTH;
      node.height = NODE_HEIGHT;
    });
  });

  return { svgWidth, svgHeight };
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSvg(nodesById, svgWidth, svgHeight) {
  const nodes = Array.from(nodesById.values());

  const parts = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`
  );

  parts.push(`
    <style>
      .link {
        stroke: #999;
        stroke-width: 2;
        fill: none;
      }
      .node rect {
        fill: #f5f5f5;
        stroke: #333;
        stroke-width: 1.5;
        rx: 6;
        ry: 6;
      }
      .node text {
        font-family: Arial, sans-serif;
        font-size: 11px;
        fill: #111;
      }
      .node .abbrev {
        font-weight: bold;
        font-size: 11px;
      }
      .node .unit-type {
        font-size: 10px;
        fill: #555;
      }
    </style>
  `);

  // Edges (Parent -> Child)
  nodes.forEach(node => {
    if (node.parent_id != null) {
      const parent = nodesById.get(node.parent_id);
      if (!parent) return;

      const x1 = parent.x + parent.width / 2;
      const y1 = parent.y + parent.height;
      const x2 = node.x + node.width / 2;
      const y2 = node.y;

      parts.push(
        `<line class="link" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`
      );
    }
  });

  // Nodes
  nodes.forEach(node => {
    const x = node.x;
    const y = node.y;
    const centerX = x + node.width / 2;

    const name = escapeXml(node.name);
    const abbrev = escapeXml(node.abbrev || '');
    const unitType = escapeXml(node.unit_type);

    parts.push(`<g class="node">`);
    parts.push(
      `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" />`
    );

    let textY = y + 18;

    if (abbrev) {
      parts.push(
        `<text class="abbrev" x="${centerX}" y="${textY}" text-anchor="middle">${abbrev}</text>`
      );
      textY += 14;
    }

    parts.push(
      `<text x="${centerX}" y="${textY}" text-anchor="middle">${name}</text>`
    );
    textY += 14;

    parts.push(
      `<text class="unit-type" x="${centerX}" y="${textY}" text-anchor="middle">${unitType}</text>`
    );

    parts.push(`</g>`);
  });

  parts.push(`</svg>`);

  return parts.join('\n');
}

async function main() {
  try {
    console.log('Hole Daten aus PostgreSQL...');
    const rows = await fetchUnits();

    if (!rows.length) {
      console.error('Keine Daten in Tabelle "units".');
      process.exit(1);
    }

    const { roots, nodesById } = buildHierarchy(rows);

    if (!roots.length) {
      console.error('Keine Wurzelknoten (parent_id IS NULL) gefunden.');
      process.exit(1);
    }

    console.log('Berechne Layout...');
    const { svgWidth, svgHeight } = layoutTree(roots);

    console.log('Erzeuge SVG...');
    const svgContent = buildSvg(nodesById, svgWidth, svgHeight);
    fs.writeFileSync('org_chart.svg', svgContent, 'utf8');
    console.log('SVG geschrieben: org_chart.svg');

    console.log('Konvertiere SVG nach PNG...');
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile('org_chart.png');
    console.log('PNG geschrieben: org_chart.png');

    console.log('Fertig.');
  } catch (err) {
    console.error('Fehler:', err);
    process.exit(1);
  }
}

main();
