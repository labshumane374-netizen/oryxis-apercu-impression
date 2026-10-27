/* =========================================================================
   mt_printers — bibliotheque d'icones

   Deux jeux distincts :
     UI     : les pictogrammes de l'editeur (barres d'outils, boutons)
     PLAN   : les icones que le reporter pose sur la page

   La liste autorisee pour PLAN vit dans config.lua : le serveur refuse tout
   nom absent de sa liste, ce fichier ne fait que les dessiner.
   ========================================================================= */

const SVGNS = 'http://www.w3.org/2000/svg';

const UI = {
  elements:  ['M4 6h16', 'M4 12h10', 'M4 18h13'],
  page:      ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  texte:     ['M5 6V4h14v2', 'M12 4v16', 'M9 20h6'],
  image:     ['M3 5h18v14H3z', 'M3 15l5-5 4 4 3-3 6 6'],
  bloc:      ['M3 6h18v12H3z'],
  etoile:    ['M12 2.6l2.9 6.2 6.6.9-4.8 4.7 1.1 6.8L12 18l-5.8 3.2 1.1-6.8L2.5 9.7l6.6-.9z'],
  copier:    ['M9 9h11v11H9z', 'M4 15V4h11'],
  poubelle:  ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  imprime:   ['M7 9V3h10v6', 'M5 9h14v8H5z', 'M7 14h10v7H7z'],
  oeil:      ['M2 12s3.8-6.6 10-6.6S22 12 22 12s-3.8 6.6-10 6.6S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  croix:     ['M6 6l12 12', 'M18 6L6 18'],
  photo:     ['M4 8h3l1.6-2.2h6.8L17 8h3v11H4z', 'M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'],
  plus:      ['M12 5v14', 'M5 12h14'],
  cadenas:   ['M6 11h12v9H6z', 'M8.5 11V7.5a3.5 3.5 0 1 1 7 0V11'],
  devant:    ['M12 3l8 5-8 5-8-5z', 'M4 14l8 5 8-5'],
  derriere:  ['M4 10l8-5 8 5-8 5z', 'M4 16l8 5 8-5'],
  disque:    ['M5 3h11l3 3v15H5z', 'M8 3v6h8V3', 'M8 21v-7h8v7'],
  retour:    ['M9 14l-5-5 5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  refaire:   ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h3'],
};

const PLAN = {
  etoile:    { m: 'f', d: ['M12 1.8l3.1 6.6 7 1-5.1 5.1 1.2 7.2L12 18.3 5.8 21.7 7 14.5 1.9 9.4l7-1z'] },
  camera:    { m: 's', d: ['M4 8h3l1.6-2.2h6.8L17 8h3v11H4z', 'M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'] },
  citation:  { m: 'f', d: ['M4.4 17.6c-.9-1-1.4-2.2-1.4-3.8 0-2.9 1.9-5.6 4.9-7l.9 1.4c-2.2 1.2-2.9 2.7-3 3.9.3-.2.7-.2 1.1-.2 1.6 0 2.9 1.3 2.9 3s-1.4 3.1-3.1 3.1c-.9 0-1.7-.4-2.3-1.1zm9.6 0c-.9-1-1.4-2.2-1.4-3.8 0-2.9 1.9-5.6 4.9-7l.9 1.4c-2.2 1.2-2.9 2.7-3 3.9.3-.2.7-.2 1.1-.2 1.6 0 2.9 1.3 2.9 3s-1.4 3.1-3.1 3.1c-.9 0-1.7-.4-2.3-1.1z'] },
  telephone: { m: 'f', d: ['M6.6 3h3.1l1.5 3.8-2 1.3a12 12 0 0 0 5.7 5.7l1.3-2L20 13.3v3.1c0 1-.8 1.7-1.8 1.6C10.6 17.4 5.6 12.4 5 5.8 4.9 4.8 5.6 3 6.6 3z'] },
  lieu:      { m: 's', d: ['M12 2.6a6.6 6.6 0 0 0-6.6 6.6c0 4.8 6.6 12.2 6.6 12.2s6.6-7.4 6.6-12.2A6.6 6.6 0 0 0 12 2.6z', 'M12 11.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z'] },
  police:    { m: 's', d: ['M12 2.5 4 5.4v6c0 5 3.4 8.7 8 10.1 4.6-1.4 8-5.1 8-10.1v-6z', 'M12 7.4l1.4 2.9 3.2.4-2.3 2.2.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.3-2.2 3.2-.4z'] },
  alerte:    { m: 's', d: ['M12 3 2 20h20z', 'M12 9.5v4.5', 'M12 17.2h.01'] },
  business:  { m: 's', d: ['M3 8h18v12H3z', 'M9 8V5.5h6V8', 'M3 13h18'] },
  meteo:     { m: 's', d: ['M7.5 18.5a4.5 4.5 0 0 1 .6-9 6 6 0 0 1 11.2 2.2 3.9 3.9 0 0 1-.8 6.8z'] },
  voiture:   { m: 's', d: ['M3.4 15.4h17.2v-3l-1.9-.6-2-3.9H8.3l-2 3.9-1.9.6z', 'M7.4 18.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z', 'M16.6 18.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z'] },
  skyline:   { m: 'f', d: ['M0 24V13h3V9h3v4h2V6h4v7h2V2h4v11h2V8h4v16z'] },
  micro:     { m: 's', d: ['M12 2.8a2.9 2.9 0 0 0-2.9 2.9v5.6a2.9 2.9 0 1 0 5.8 0V5.7A2.9 2.9 0 0 0 12 2.8z', 'M5.6 11.2a6.4 6.4 0 0 0 12.8 0', 'M12 17.6v3.6'] },
  feu:       { m: 'f', d: ['M12 2.4s1.2 3.1-1 5.4c-2.2 2.3-4.2 3.5-4.2 6.6a5.2 5.2 0 0 0 10.4 0c0-1.7-.7-3-.7-3s1.4.5 2 2c.6-3.6-1.7-7-3.4-8.4.3 1.6-.4 2.7-1.1 2.9.6-1.9.1-4-2-5.5z'] },
  argent:    { m: 's', d: ['M2.6 6.4h18.8v11.2H2.6z', 'M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z'] },
  horloge:   { m: 's', d: ['M12 21.2a9.2 9.2 0 1 0 0-18.4 9.2 9.2 0 0 0 0 18.4z', 'M12 7.2V12l3.2 2'] },
  crane:     { m: 's', d: ['M12 2.6c-4.3 0-7.4 3-7.4 7 0 2.4 1 4 2.4 5.1v2.9h10v-2.9c1.4-1.1 2.4-2.7 2.4-5.1 0-4-3.1-7-7.4-7z', 'M9.3 11.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z', 'M14.7 11.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z', 'M8.6 17.6v3.2', 'M15.4 17.6v3.2', 'M12 17.6v3.2'] },
  coeur:     { m: 'f', d: ['M12 20.7 4.3 13a4.7 4.7 0 0 1 6.6-6.6l1.1 1.1 1.1-1.1A4.7 4.7 0 0 1 19.7 13z'] },
  cle:       { m: 's', d: ['M15.3 3.4a5.3 5.3 0 1 0-4.2 8.5l-8 8v3.1h3.6l1.2-1.5v-2.1h2.1l1.5-1.5v-2.1h2.1l1.1-1.1a5.3 5.3 0 0 0 .6-11.3z', 'M16.6 7.4h.01'] },
};

/**
 * @param {string[]} chemins  traces SVG
 * @param {'f'|'s'} mode      f = rempli, s = trace
 */
function svgDe(chemins, mode) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  chemins.forEach((d) => {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    if (mode === 'f') {
      p.setAttribute('fill', 'currentColor');
    } else {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '1.7');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    }
    svg.appendChild(p);
  });
  return svg;
}

function iconeUI(nom) {
  return svgDe(UI[nom] || UI.etoile, nom === 'etoile' || nom === 'skyline' ? 'f' : 's');
}

function iconePlan(nom, couleur) {
  const def = PLAN[nom] || PLAN.etoile;
  const svg = svgDe(def.d, def.m);
  if (couleur) svg.style.color = couleur;
  return svg;
}
