/* =========================================================================
   mt_printers — operations sur les elements, les pages et le document

   Toute fonction qui modifie le document appelle memoriser() avant, pour
   que Ctrl+Z fasse son travail, puis redessiner() apres.
   ========================================================================= */

function redessiner() {
  $('scene').classList.toggle('reperes', etat.reglages.reperes);
  dessinerPage($('page'), P(), true);
  ajusterEchelle($('cadre'), $('scene'));
  construirePanneau();
  construireBandePages();
  construireModeles();
  majPied();
}

/** Redessine sans reconstruire le panneau : sinon on perd le focus du champ
 *  en cours de frappe. */
function redessinerSeul() {
  const i = etat.sel;
  dessinerPage($('page'), P(), true);
  etat.sel = i;
  const noeud = $('page').querySelector(`.el[data-i="${i}"]`);
  if (noeud) {
    noeud.classList.add('actif');
    poserPoignees(noeud, P().els[i] || {});
  }
  planifierSauvegarde();
  majPied();
}

function selectionner(i) {
  etat.sel = i;
  fermerMenu();
  redessiner();
}

/* ---------------------------------------------------------- elements -- */
function nouvelElement(type, extra) {
  const d = dimensions();
  const base = { t: type, x: Math.round(d.l / 2 - 140), y: Math.round(d.h / 3) };
  if (type === 'texte') {
    return Object.assign(base, {
      w: 300, txt: T().texteExemple || 'Votre texte', px: 22, f: 1,
      a: 'l', c: '#101418', lh: 125
    });
  }
  if (type === 'image') return Object.assign(base, { w: 340, h: 220, url: extra || '', fit: 'cover' });
  if (type === 'forme') return Object.assign(base, { w: 300, h: 10, c: '#c81018' });
  return Object.assign(base, { w: 64, n: extra || 'etoile', c: '#101418' });
}

function ajouter(type, extra) {
  if (P().els.length >= limite('elements', 60)) {
    notifier(T().tropElements || 'Cette page est pleine.');
    return;
  }
  memoriser();
  P().els.push(nouvelElement(type, extra));
  etat.outil = type;
  selectionner(P().els.length - 1);
}

function dupliquer() {
  const e = elSel();
  if (!e) return;
  if (P().els.length >= limite('elements', 60)) {
    notifier(T().tropElements || 'Cette page est pleine.');
    return;
  }
  memoriser();
  const c = copieProfonde(e);
  c.x += 20; c.y += 20; c.v = undefined;
  P().els.push(c);
  selectionner(P().els.length - 1);
}

function supprimer() {
  const e = elSel();
  if (!e || e.v) return;
  memoriser();
  P().els.splice(etat.sel, 1);
  selectionner(-1);
}

/** @param {number|'haut'|'bas'} sens */
function calque(sens) {
  const i = etat.sel;
  if (i < 0) return;
  const els = P().els;
  memoriser();
  const [e] = els.splice(i, 1);
  let j;
  if (sens === 'haut') j = els.length;
  else if (sens === 'bas') j = 0;
  else j = Math.max(0, Math.min(els.length, i + sens));
  els.splice(j, 0, e);
  selectionner(j);
}

function copier() {
  const e = elSel();
  if (!e) return;
  etat.presse = copieProfonde(e);
  notifier(T().copie || 'Élément copié.');
}

function coller() {
  if (!etat.presse) return;
  if (P().els.length >= limite('elements', 60)) return;
  memoriser();
  const c = copieProfonde(etat.presse);
  c.x += 20; c.y += 20; c.v = undefined;
  P().els.push(c);
  selectionner(P().els.length - 1);
}

/* -------------------------------------------------------------- pages -- */
function allerPage(i) {
  if (i < 0 || i >= etat.doc.pages.length) return;
  etat.p = i;
  etat.sel = -1;
  redessiner();
}

function ajouterPage() {
  const max = limite('pages', 8);
  if (etat.doc.pages.length >= max) {
    notifier((T().tropPages || 'Maximum atteint : ') + max);
    return;
  }
  memoriser();
  etat.doc.pages.splice(etat.p + 1, 0, pageVierge());
  allerPage(etat.p + 1);
}

function dupliquerPage() {
  const max = limite('pages', 8);
  if (etat.doc.pages.length >= max) {
    notifier((T().tropPages || 'Maximum atteint : ') + max);
    return;
  }
  memoriser();
  etat.doc.pages.splice(etat.p + 1, 0, copieProfonde(P()));
  allerPage(etat.p + 1);
}

function supprimerPage() {
  if (etat.doc.pages.length <= 1) return;
  demanderConfirmation(
    T().supprPageTitre || 'Supprimer cette page ?',
    (T().supprPageTexte || 'La page {n} et tout ce qu\'elle contient seront perdus.')
      .replace('{n}', etat.p + 1),
    T().supprimer || 'Supprimer',
    () => {
      memoriser();
      etat.doc.pages.splice(etat.p, 1);
      allerPage(Math.min(etat.p, etat.doc.pages.length - 1));
    }
  );
}

/* ------------------------------------------------------------ modeles -- */
function appliquerModele(m) {
  const poser = () => {
    memoriser();
    etat.doc.pages[etat.p] = { fond: m.fond || '#f6f2e8', els: copieEls(m.els) };
    etat.sel = -1;
    redessiner();
  };

  // Le modele remplit la page en cours ; les autres pages ne bougent pas.
  if ((P().els || []).length > 0) {
    demanderConfirmation(
      T().remplacerTitre || 'Remplacer cette page ?',
      (T().remplacerTexte || 'La page {n} contient déjà des éléments. Ils seront remplacés par le modèle « {m} ».')
        .replace('{n}', etat.p + 1).replace('{m}', m.nom),
      T().remplacer || 'Remplacer',
      poser
    );
  } else {
    poser();
  }
}

/* ------------------------------------------------------------- format -- */
function changerFormat(id) {
  if (id === etat.format) return;
  memoriser();
  etat.format = id;
  redessiner();
}
