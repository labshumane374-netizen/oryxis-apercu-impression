/* =========================================================================
   mt_printers — etat du document

   Une seule source de verite : `etat`. Tout le reste (canvas, panneaux,
   modales) lit ici et passe par les fonctions de ce fichier pour ecrire,
   ce qui garantit qu'une modification est toujours enregistree dans
   l'historique et declenche la sauvegarde.
   ========================================================================= */

const $ = (id) => document.getElementById(id);

const FONDS = [
  { nom: 'Papier journal', c: '#f6f2e8' },
  { nom: 'Blanc',          c: '#ffffff' },
  { nom: 'Blanc cassé',    c: '#f2efe9' },
  { nom: 'Gris clair',     c: '#dfdfdc' },
  { nom: 'Noir',           c: '#0d1014' },
];

const CLE_SAUVEGARDE = 'mt_printers_brouillon';

const etat = {
  imprimante: null,
  atelier: null,          // modeles, polices, icones, formats, limites, prix
  textes: {},
  papier: 0,
  argent: 0,

  nom: '',
  format: 'a4',
  doc: { pages: [{ fond: '#f6f2e8', els: [] }] },
  p: 0,
  sel: -1,

  outil: null,
  reglages: { reperes: false, grille: true, marges: false },

  presse: null,           // element copie (Ctrl+C)
  histoire: [],
  futur: [],

  lecture: { pages: [], i: 0, format: null },
  apercu: false,
  echelle: 1,
  mode: null,             // 'editeur' | 'lecture'
  minuteurSauvegarde: null,
};

/* ------------------------------------------------------------ raccourcis */
const T = () => etat.textes;
const P = () => etat.doc.pages[etat.p] || etat.doc.pages[0];
const elSel = () => (P().els || [])[etat.sel] || null;

function formatCourant() {
  const liste = etat.atelier?.formats || [];
  return liste.find((f) => f.id === etat.format) || liste[0] || { id: 'a4', l: 794, h: 1123 };
}

/** Dimensions de la page a dessiner : celle du document en lecture, sinon
 *  celle de l'editeur. */
function dimensions() {
  if (etat.mode === 'lecture' && etat.lecture.format) return etat.lecture.format;
  return formatCourant();
}

function polices() {
  return etat.atelier?.polices || [{ nom: 'Journal', css: 'Georgia, serif' }];
}

function cssPolice(i) {
  const liste = polices();
  return (liste[(i || 1) - 1] || liste[0]).css;
}

function limite(nom, defaut) {
  const v = etat.atelier?.limites?.[nom];
  return typeof v === 'number' ? v : defaut;
}

/* ------------------------------------------------------------- fabriques */
function copieProfonde(v) { return JSON.parse(JSON.stringify(v)); }
function copieEls(els) { return Array.isArray(els) ? copieProfonde(els) : []; }

function pageVierge(fond) { return { fond: fond || '#f6f2e8', els: [] }; }

/* ----------------------------------------------------------- historique */
const MAX_HISTOIRE = 50;

/** A appeler AVANT toute modification du document. */
function memoriser() {
  etat.histoire.push({ doc: copieProfonde(etat.doc), p: etat.p, format: etat.format });
  if (etat.histoire.length > MAX_HISTOIRE) etat.histoire.shift();
  etat.futur.length = 0;
  planifierSauvegarde();
}

function annuler() {
  if (!etat.histoire.length) return false;
  etat.futur.push({ doc: copieProfonde(etat.doc), p: etat.p, format: etat.format });
  const e = etat.histoire.pop();
  etat.doc = e.doc; etat.p = Math.min(e.p, e.doc.pages.length - 1); etat.format = e.format;
  etat.sel = -1;
  planifierSauvegarde();
  return true;
}

function refaire() {
  if (!etat.futur.length) return false;
  etat.histoire.push({ doc: copieProfonde(etat.doc), p: etat.p, format: etat.format });
  const e = etat.futur.pop();
  etat.doc = e.doc; etat.p = Math.min(e.p, e.doc.pages.length - 1); etat.format = e.format;
  etat.sel = -1;
  planifierSauvegarde();
  return true;
}

/* ----------------------------------------------------------- sauvegarde */
function etatSauvegarde(texte) {
  const el = $('sauvegarde');
  if (!el) return;
  el.textContent = texte;
  el.classList.toggle('encours', texte === (T().sauvegardeEnCours || 'Sauvegarde…'));
}

function planifierSauvegarde() {
  etatSauvegarde(T().sauvegardeEnCours || 'Sauvegarde…');
  clearTimeout(etat.minuteurSauvegarde);
  etat.minuteurSauvegarde = setTimeout(sauvegarder, 700);
}

/* 27/10 : plusieurs brouillons gardes sur le PC du joueur (stockage de la
   page NUI), sans limite de duree. Chaque document en cours a sa cle
   (etat.brouillon) ; il est reecrit a chaque modification. L'ancien
   brouillon unique (CLE_SAUVEGARDE) est repris dans la liste. */
const CLE_BROUILLONS = 'mt_printers_brouillons';
const MAX_BROUILLONS = 40;

function brouillonValide(b) {
  return b && b.cle && b.doc && Array.isArray(b.doc.pages) && b.doc.pages.length;
}

function lireBrouillons() {
  let liste = [];
  try {
    const l = JSON.parse(localStorage.getItem(CLE_BROUILLONS) || '[]');
    if (Array.isArray(l)) liste = l.filter(brouillonValide);
  } catch (e) { liste = []; }
  try {
    const ancien = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null');
    if (ancien && ancien.doc) {
      ancien.cle = 'ancien-' + (ancien.quand || Date.now());
      if (brouillonValide(ancien)) liste.push(ancien);
      localStorage.removeItem(CLE_SAUVEGARDE);
      ecrireBrouillons(liste);
    }
  } catch (e) { /* rien */ }
  return liste.sort((a, b) => (b.quand || 0) - (a.quand || 0));
}

// Stockage plein : on retire les plus anciens jusqu'a ce que ca passe.
function ecrireBrouillons(liste) {
  liste = liste.sort((a, b) => (b.quand || 0) - (a.quand || 0)).slice(0, MAX_BROUILLONS);
  while (true) {
    try {
      localStorage.setItem(CLE_BROUILLONS, JSON.stringify(liste));
      return true;
    } catch (e) {
      if (liste.length <= 1) return false;
      liste.pop();
    }
  }
}

function sauvegarder() {
  if (etat.mode !== 'editeur') return;
  if (!etat.brouillon) etat.brouillon = 'b' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  const liste = lireBrouillons().filter((b) => b.cle !== etat.brouillon);
  liste.unshift({
    cle: etat.brouillon, nom: etat.nom, format: etat.format, doc: etat.doc, p: etat.p,
    archive: etat.archive || null, quand: Date.now(), imprime: false,
  });
  etatSauvegarde(ecrireBrouillons(liste)
    ? (T().sauvegarde || 'Sauvegardé sur ce PC')
    : (T().sauvegardeEchec || 'Non sauvegardé'));
}

// Dernier brouillon pas encore imprime : propose a l'ouverture.
function brouillon() {
  return lireBrouillons().find((b) => !b.imprime) || null;
}

function supprimerBrouillon(cle) {
  ecrireBrouillons(lireBrouillons().filter((b) => b.cle !== cle));
  if (etat.brouillon === cle) etat.brouillon = null;
}

// A l'impression le brouillon est garde, marque « imprime ».
function oublierBrouillon() {
  if (!etat.brouillon) return;
  const liste = lireBrouillons();
  const b = liste.find((x) => x.cle === etat.brouillon);
  if (b) { b.imprime = true; ecrireBrouillons(liste); }
}
