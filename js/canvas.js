/* =========================================================================
   mt_printers — la page et sa manipulation

   Rendu, mise a l'echelle, deplacement, redimensionnement, aimantation,
   guides d'alignement et menu contextuel. Le meme `dessinerPage` sert a
   l'editeur, aux vignettes de modeles et a la lecture.
   ========================================================================= */

/* ------------------------------------------------------------- outils -- */
function vider(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function creer(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte != null && texte !== '') el.textContent = texte;
  return el;
}

function urlOk(u) {
  return typeof u === 'string' && /^https?:\/\/\S+$/i.test(u) && !/["'<>\\]/.test(u);
}

const MARGE_PAGE = 40;
const PAS_GRILLE = 10;
const AIMANT = 6;

/* -------------------------------------------------------------- rendu -- */
function styleElement(el, e) {
  el.style.left = e.x + 'px';
  el.style.top = e.y + 'px';
  el.style.opacity = (e.o == null ? 100 : e.o) / 100;
  el.style.transform = e.rot ? `rotate(${e.rot}deg)` : '';

  if (e.t === 'texte') {
    el.style.width = e.w + 'px';
    el.style.fontSize = e.px + 'px';
    el.style.fontFamily = cssPolice(e.f);
    el.style.fontWeight = e.g ? '700' : '400';
    el.style.fontStyle = e.i ? 'italic' : 'normal';
    el.style.textAlign = e.a === 'c' ? 'center' : (e.a === 'r' ? 'right' : 'left');
    el.style.color = e.c;
    el.style.lineHeight = ((e.lh || 125) / 100).toFixed(2);
    el.style.letterSpacing = ((e.ls || 0) / 1000) + 'em';
  } else {
    el.style.width = e.w + 'px';
    el.style.height = (e.t === 'icone' ? e.w : e.h) + 'px';
    if (e.t === 'forme') el.style.background = e.c;
    el.style.borderRadius = e.r ? e.r + 'px' : '';
    el.style.border = e.bw ? `${e.bw}px solid ${e.bc || '#101418'}` : '';
    if (e.t === 'image') el.style.overflow = 'hidden';
  }
}

function vignetteManquante() {
  const d = creer('div', 'manque');
  d.appendChild(iconeUI('photo'));
  d.appendChild(creer('b', null, T().lien || "Lien de l'image"));
  d.appendChild(creer('i', null, T().cliquerImage || 'Sélectionne-la pour coller son lien'));
  return d;
}

function contenuElement(el, e, editable) {
  vider(el);
  if (e.t === 'texte') {
    el.textContent = e.txt;
  } else if (e.t === 'image') {
    if (urlOk(e.url)) {
      const img = document.createElement('img');
      img.src = e.url; img.alt = '';
      img.style.objectFit = e.fit === 'contain' ? 'contain' : 'cover';
      img.addEventListener('error', () => { vider(el); if (editable) el.appendChild(vignetteManquante()); });
      el.appendChild(img);
    } else if (editable) {
      el.appendChild(vignetteManquante());
    }
  } else if (e.t === 'icone') {
    el.appendChild(iconePlan(e.n, e.c));
  }
}

const COINS = [['no', 'nwse'], ['ne', 'nesw'], ['so', 'nesw'], ['se', 'nwse']];

function poserPoignees(el, e) {
  COINS.forEach(([coin]) => {
    const p = creer('div', 'poignee ' + coin);
    p.dataset.role = 'taille';
    p.dataset.coin = coin;
    el.appendChild(p);
  });
  if (e.v) el.appendChild(creer('div', 'verrou-marque', '🔒'));
}

/**
 * @param {HTMLElement} hote
 * @param {object} page      { fond, els }
 * @param {boolean} editable
 * @param {object} [dims]    { l, h } — sinon les dimensions courantes
 */
function dessinerPage(hote, page, editable, dims) {
  const d = dims || dimensions();
  hote.style.width = d.l + 'px';
  hote.style.height = d.h + 'px';
  hote.style.background = page.fond || '#f6f2e8';
  vider(hote);

  if (editable && etat.reglages.reperes) hote.appendChild(creer('div', 'quadrillage'));

  (page.els || []).forEach((e, i) => {
    const el = creer('div', 'el ' + e.t);
    el.dataset.i = i;
    if (e.v) el.classList.add('verrouille');
    styleElement(el, e);
    contenuElement(el, e, editable);
    if (editable && i === etat.sel) {
      el.classList.add('actif');
      poserPoignees(el, e);
    }
    hote.appendChild(el);
  });

  if (editable && etat.reglages.marges) {
    const m = creer('div', 'marges');
    m.style.inset = MARGE_PAGE + 'px';
    hote.appendChild(m);
  }
  if (editable) hote.appendChild(creer('div', 'guides'));
}

function ajusterEchelle(cadre, scene, marge, dims) {
  const d = dims || dimensions();
  const m = marge || 40;
  const dispoH = scene.clientHeight - m;
  const dispoL = scene.clientWidth - m;
  // Conteneur pas encore mesurable : on ne calcule rien plutot que de
  // retomber sur une echelle minimale (la page paraissait minuscule).
  if (dispoH < 60 || dispoL < 60) return;
  const e = Math.min(dispoH / d.h, dispoL / d.l, 1);
  etat.echelle = Math.max(0.15, e);
  cadre.style.transform = `scale(${etat.echelle})`;
  cadre.style.width = (d.l * etat.echelle) + 'px';
  cadre.style.height = (d.h * etat.echelle) + 'px';
}

/* ------------------------------------------------------------- guides -- */
function cibles(indexIgnore) {
  const d = dimensions();
  const v = [0, MARGE_PAGE, d.l / 2, d.l - MARGE_PAGE, d.l];
  const h = [0, MARGE_PAGE, d.h / 2, d.h - MARGE_PAGE, d.h];
  (P().els || []).forEach((e, i) => {
    if (i === indexIgnore) return;
    const hh = hauteurElement(i, e);
    v.push(e.x, e.x + e.w / 2, e.x + e.w);
    h.push(e.y, e.y + hh / 2, e.y + hh);
  });
  return { v, h };
}

function hauteurElement(i, e) {
  if (e.t === 'icone') return e.w;
  if (e.t !== 'texte') return e.h;
  const noeud = $('page').querySelector(`.el[data-i="${i}"]`);
  return noeud ? noeud.offsetHeight : (e.px || 14) * 1.3;
}

function tracerGuides(lignes) {
  const hote = $('page').querySelector('.guides');
  if (!hote) return;
  vider(hote);
  const d = dimensions();
  lignes.forEach((g) => {
    const l = creer('div', 'guide ' + g.axe);
    if (g.axe === 'v') { l.style.left = g.p + 'px'; l.style.height = d.h + 'px'; }
    else { l.style.top = g.p + 'px'; l.style.width = d.l + 'px'; }
    hote.appendChild(l);
  });
}

/** Cherche l'aimantation la plus proche pour trois bords donnes. */
function aimanter(bords, liste) {
  let best = null;
  bords.forEach((b) => {
    liste.forEach((c) => {
      const ecart = Math.abs(b.v - c);
      if (ecart <= AIMANT && (!best || ecart < best.ecart)) {
        best = { ecart, delta: c - b.v, ligne: c };
      }
    });
  });
  return best;
}

/* ------------------------------------------------------- manipulation -- */
let glisse = null;

function surMouseDown(ev) {
  if (ev.button !== 0) return;
  const cible = ev.target.closest('.el');
  if (!cible) { selectionner(-1); return; }
  if (cible.classList.contains('ecriture')) return;

  const i = parseInt(cible.dataset.i, 10);
  if (i !== etat.sel) selectionner(i);

  const e = P().els[i];
  if (!e || e.v) return;                    // element verrouille : on ne bouge pas

  memoriser();
  glisse = {
    i,
    role: ev.target.dataset.role === 'taille' ? 'taille' : 'deplace',
    coin: ev.target.dataset.coin || 'se',
    x0: ev.clientX, y0: ev.clientY,
    ex: e.x, ey: e.y, ew: e.w, eh: e.h || 0
  };
  ev.preventDefault();
}

function surMouseMove(ev) {
  if (!glisse) return;
  const e = P().els[glisse.i];
  if (!e) return;
  const d = dimensions();
  let dx = (ev.clientX - glisse.x0) / etat.echelle;
  let dy = (ev.clientY - glisse.y0) / etat.echelle;
  const lignes = [];

  if (glisse.role === 'deplace') {
    let x = glisse.ex + dx;
    let y = glisse.ey + dy;

    if (etat.reglages.grille) {
      x = Math.round(x / PAS_GRILLE) * PAS_GRILLE;
      y = Math.round(y / PAS_GRILLE) * PAS_GRILLE;
    }

    const h = hauteurElement(glisse.i, e);
    const cbl = cibles(glisse.i);
    const av = aimanter([{ v: x }, { v: x + e.w / 2 }, { v: x + e.w }], cbl.v);
    const ah = aimanter([{ v: y }, { v: y + h / 2 }, { v: y + h }], cbl.h);
    if (av) { x += av.delta; lignes.push({ axe: 'v', p: av.ligne }); }
    if (ah) { y += ah.delta; lignes.push({ axe: 'h', p: ah.ligne }); }

    // On garde toujours un bout de l'element sur la page.
    e.x = Math.round(Math.max(-e.w + 24, Math.min(x, d.l - 24)));
    e.y = Math.round(Math.max(-h + 24, Math.min(y, d.h - 24)));

  } else {
    const ouest = glisse.coin === 'no' || glisse.coin === 'so';
    const nord  = glisse.coin === 'no' || glisse.coin === 'ne';
    const mini = e.t === 'icone' ? 10 : 20;

    let w = glisse.ew + (ouest ? -dx : dx);
    if (etat.reglages.grille) w = Math.round(w / PAS_GRILLE) * PAS_GRILLE;
    w = Math.max(mini, w);
    if (ouest) e.x = Math.round(glisse.ex + (glisse.ew - w));
    e.w = Math.round(w);

    if (e.t === 'image' || e.t === 'forme') {
      let h = glisse.eh + (nord ? -dy : dy);
      if (etat.reglages.grille) h = Math.round(h / PAS_GRILLE) * PAS_GRILLE;
      h = Math.max(6, h);
      if (nord) e.y = Math.round(glisse.ey + (glisse.eh - h));
      e.h = Math.round(h);
    }
  }

  const noeud = $('page').querySelector(`.el[data-i="${glisse.i}"]`);
  if (noeud) styleElement(noeud, e);
  tracerGuides(lignes);
}

function surMouseUp() {
  if (!glisse) return;
  glisse = null;
  tracerGuides([]);
  planifierSauvegarde();
  construirePanneau();
}

function surDblClick(ev) {
  const cible = ev.target.closest('.el');
  if (!cible) return;
  const i = parseInt(cible.dataset.i, 10);
  const e = P().els[i];
  if (!e || e.t !== 'texte' || e.v) return;

  memoriser();
  cible.classList.add('ecriture');
  cible.contentEditable = 'true';
  cible.focus();
  document.execCommand?.('selectAll', false, null);

  const fin = () => {
    e.txt = cible.textContent.slice(0, limite('texteParBloc', 1200));
    cible.contentEditable = 'false';
    cible.classList.remove('ecriture');
    cible.removeEventListener('blur', fin);
    redessiner();
  };
  cible.addEventListener('blur', fin);
}

/* ------------------------------------------------------ menu contextuel */
function fermerMenu() {
  const m = $('menuContexte');
  if (m) m.classList.add('cache');
}

function ouvrirMenu(x, y, i) {
  const e = P().els[i];
  if (!e) return;
  const m = $('menuContexte');
  vider(m);

  const entree = (libelle, icone, action, danger) => {
    const b = creer('button', danger ? 'danger' : null);
    b.type = 'button';
    b.appendChild(iconeUI(icone));
    b.appendChild(creer('span', null, libelle));
    b.addEventListener('click', () => { fermerMenu(); action(); });
    m.appendChild(b);
  };

  entree(T().dupliquer || 'Dupliquer', 'copier', dupliquer);
  entree(T().premierPlan || 'Mettre au premier plan', 'devant', () => calque('haut'));
  entree(T().avancer || 'Avancer', 'devant', () => calque(1));
  entree(T().reculer || 'Reculer', 'derriere', () => calque(-1));
  entree(T().arrierePlan || "Mettre à l'arrière-plan", 'derriere', () => calque('bas'));
  entree(e.v ? (T().deverrouiller || 'Déverrouiller') : (T().verrouiller || 'Verrouiller'), 'cadenas', () => {
    memoriser();
    e.v = e.v ? 0 : 1;
    redessiner();
  });
  entree(T().supprimer || 'Supprimer', 'poubelle', supprimer, true);

  m.classList.remove('cache');
  const l = Math.min(x, window.innerWidth - m.offsetWidth - 12);
  const t = Math.min(y, window.innerHeight - m.offsetHeight - 12);
  m.style.left = l + 'px';
  m.style.top = t + 'px';
}

function surContexte(ev) {
  const cible = ev.target.closest('.el');
  if (!cible) return;
  ev.preventDefault();
  const i = parseInt(cible.dataset.i, 10);
  if (i !== etat.sel) selectionner(i);
  ouvrirMenu(ev.clientX, ev.clientY, i);
}
