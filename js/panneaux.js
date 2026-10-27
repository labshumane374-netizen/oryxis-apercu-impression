/* =========================================================================
   mt_printers — les deux panneaux lateraux

   Gauche  : outils, pages, modeles
   Droite  : proprietes de la PAGE, ou de l'ELEMENT selectionne
   ========================================================================= */

/* ------------------------------------------------------- petits champs -- */
function bloc(libelle, noeud) {
  const d = creer('div', 'bloc');
  if (libelle) d.appendChild(creer('span', 'etiq', libelle));
  d.appendChild(noeud);
  return d;
}

function champTexte(valeur, placeholder, surChangement) {
  const i = document.createElement('input');
  i.type = 'text'; i.value = valeur || ''; i.placeholder = placeholder || '';
  i.addEventListener('input', () => surChangement(i.value));
  return i;
}

function champNombre(valeur, min, max, surChangement, pas) {
  const i = document.createElement('input');
  i.type = 'number'; i.value = Math.round(valeur); i.min = min; i.max = max;
  if (pas) i.step = pas;
  i.addEventListener('input', () => {
    const v = parseFloat(i.value);
    if (!isNaN(v)) surChangement(Math.max(min, Math.min(max, v)));
  });
  return i;
}

function champCouleur(valeur, surChangement) {
  const i = document.createElement('input');
  i.type = 'color'; i.value = valeur || '#101418';
  i.addEventListener('input', () => surChangement(i.value));
  return i;
}

function champCurseur(valeur, min, max, surChangement) {
  const l = creer('div', 'curseur');
  const i = document.createElement('input');
  i.type = 'range'; i.min = min; i.max = max; i.value = valeur;
  const v = creer('span', 'valeur', String(Math.round(valeur)));
  i.addEventListener('input', () => {
    v.textContent = i.value;
    surChangement(parseFloat(i.value));
  });
  l.appendChild(i); l.appendChild(v);
  return l;
}

function boutonPlat(libelle, actif, surClic, options) {
  const o = options || {};
  const b = creer('button', 'plat' + (o.danger ? ' danger' : ''));
  b.type = 'button';
  if (o.icone) b.appendChild(iconeUI(o.icone));
  if (libelle) b.appendChild(creer('span', null, libelle));
  if (actif !== null) b.setAttribute('aria-pressed', String(!!actif));
  b.addEventListener('click', surClic);
  return b;
}

function interrupteur(libelle, actif, surClic) {
  const b = creer('button', 'bascule');
  b.type = 'button';
  b.setAttribute('aria-pressed', String(!!actif));
  b.appendChild(creer('span', 'txt', libelle));
  b.appendChild(creer('span', 'inter'));
  b.addEventListener('click', surClic);
  return b;
}

function grille(colonnes, enfants) {
  const g = creer('div', 'grille');
  g.style.gridTemplateColumns = `repeat(${colonnes}, 1fr)`;
  enfants.forEach((e) => g.appendChild(e));
  return g;
}

/* -------------------------------------------------------- notification -- */
let minuteurNotif = null;
function notifier(texte) {
  const n = $('notif');
  n.textContent = texte;
  n.classList.remove('cache');
  clearTimeout(minuteurNotif);
  minuteurNotif = setTimeout(() => n.classList.add('cache'), 2600);
}

/* ============================ PANNEAU GAUCHE ============================ */
function construireOutils() {
  const hote = $('outils');
  vider(hote);
  [
    ['texte', T().texte || 'Texte', 'texte'],
    ['image', T().image || 'Image', 'image'],
    ['forme', T().forme || 'Bloc', 'bloc'],
    ['icone', T().icone || 'Icône', 'etoile'],
  ].forEach(([type, nom, icone]) => {
    const b = creer('button', 'outil' + (etat.outil === type ? ' actif' : ''));
    b.type = 'button';
    b.appendChild(iconeUI(icone));
    b.appendChild(creer('span', null, nom));
    b.addEventListener('click', () => {
      if (type === 'image') ouvrirModaleImage();
      else if (type === 'icone') ouvrirModaleIcone();
      else ajouter(type);
      construireOutils();
    });
    hote.appendChild(b);
  });
}

function construireBandePages() {
  const hote = $('bandePages');
  vider(hote);
  etat.doc.pages.forEach((_, i) => {
    const b = creer('button', null, String(i + 1));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(i === etat.p));
    b.addEventListener('click', () => allerPage(i));
    hote.appendChild(b);
  });
  if (etat.doc.pages.length < limite('pages', 8)) {
    const p = creer('button', 'plus');
    p.type = 'button';
    p.title = T().pageAjout || 'Ajouter une page';
    p.appendChild(iconeUI('plus'));
    p.addEventListener('click', ajouterPage);
    hote.appendChild(p);
  }
  $('btnSupprPage').disabled = etat.doc.pages.length <= 1;
  $('btnDupPage').disabled = etat.doc.pages.length >= limite('pages', 8);
}

function construireModeles() {
  const hote = $('listeModeles');
  vider(hote);
  const modeles = etat.atelier?.modeles || [];

  modeles.forEach((m) => {
    const b = creer('button', 'modele');
    b.type = 'button';

    // La vignette est la vraie page, dessinee par le meme moteur puis reduite.
    const cadre = creer('div', 'apercu');
    const mini = creer('div', 'page');
    const d = formatCourant();
    dessinerPage(mini, { fond: m.fond, els: Array.isArray(m.els) ? m.els : [] }, false, d);
    mini.style.position = 'absolute';
    mini.style.transformOrigin = 'top left';
    mini.style.transform = `scale(${58 / d.l})`;
    cadre.appendChild(mini);

    const txt = creer('div', 'texte-modele');
    txt.appendChild(creer('b', null, m.nom));
    if (m.resume) txt.appendChild(creer('span', null, m.resume));

    b.appendChild(cadre);
    b.appendChild(txt);
    b.addEventListener('click', () => appliquerModele(m));
    hote.appendChild(b);
  });

  const n = modeles.length;
  $('compteModeles').textContent =
    n + ' ' + (n > 1 ? (T().modelesCharges || 'modèles chargés') : (T().modeleCharge || 'modèle chargé'));
}

/* ============================ PANNEAU DROIT ============================= */
function construirePanneau() {
  const hote = $('inspecteur');
  vider(hote);
  const e = elSel();

  vider($('vigDroite'));
  $('vigDroite').appendChild(iconeUI(e ? 'elements' : 'page'));
  $('uiPanneauL').textContent = e ? (T().element || 'Élément') : (T().page || 'Page');
  $('uiPanneauP').textContent = e ? (T().elemPanneau || '') : (T().pagePanneau || '');

  if (e) panneauElement(hote, e);
  else panneauPage(hote);
}

/* ------------------------------------------------------------- page ---- */
function panneauPage(hote) {
  hote.appendChild(bloc(T().nom || 'Nom du document',
    champTexte(etat.nom, T().nomExemple || 'Weazel News — édition du soir', (v) => {
      etat.nom = v.slice(0, limite('nomDocument', 60));
      planifierSauvegarde();
    })));

  // arriere-plan : pastille + liste
  const ligne = creer('div', 'duo-serre');
  const liste = document.createElement('select');
  const pastille = champCouleur(P().fond, (v) => {
    memoriser();
    P().fond = v;
    $('page').style.background = v;
    liste.value = FONDS.some((f) => f.c === v) ? v : 'perso';
    construireModeles();
  });
  FONDS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.c; o.textContent = f.nom;
    liste.appendChild(o);
  });
  const perso = document.createElement('option');
  perso.value = 'perso'; perso.textContent = T().fondPerso || 'Personnalisé';
  liste.appendChild(perso);
  liste.value = FONDS.some((f) => f.c === P().fond) ? P().fond : 'perso';
  liste.addEventListener('change', () => {
    if (liste.value === 'perso') { pastille.click(); return; }
    memoriser();
    P().fond = liste.value;
    pastille.value = liste.value;
    $('page').style.background = liste.value;
  });
  ligne.appendChild(pastille);
  ligne.appendChild(liste);
  hote.appendChild(bloc(T().arriere || 'Arrière-plan', ligne));

  // parametres
  const reg = creer('div', 'interrupteurs');
  reg.appendChild(interrupteur(T().reperes || 'Afficher les repères', etat.reglages.reperes,
    () => { etat.reglages.reperes = !etat.reglages.reperes; redessiner(); }));
  reg.appendChild(interrupteur(T().grille || "Grille d'alignement", etat.reglages.grille,
    () => { etat.reglages.grille = !etat.reglages.grille; redessiner(); }));
  reg.appendChild(interrupteur(T().marges || 'Marges visibles', etat.reglages.marges,
    () => { etat.reglages.marges = !etat.reglages.marges; redessiner(); }));
  hote.appendChild(bloc(T().reglages || 'Paramètres', reg));

  // format
  const fmt = document.createElement('select');
  (etat.atelier?.formats || []).forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id; o.textContent = f.nom;
    if (f.id === etat.format) o.selected = true;
    fmt.appendChild(o);
  });
  fmt.addEventListener('change', () => changerFormat(fmt.value));
  hote.appendChild(bloc(T().format || 'Format & impression', fmt));
}

/* ---------------------------------------------------------- element ---- */
function panneauElement(hote, e) {
  const maj = () => redessinerSeul();

  if (e.t === 'texte') {
    const ta = document.createElement('textarea');
    ta.rows = 4; ta.value = e.txt;
    ta.maxLength = limite('texteParBloc', 1200);
    ta.addEventListener('input', () => { e.txt = ta.value; maj(); });
    hote.appendChild(bloc(T().contenu || 'Contenu', ta));

    const police = document.createElement('select');
    polices().forEach((p, i) => {
      const o = document.createElement('option');
      o.value = String(i + 1); o.textContent = p.nom;
      if ((e.f || 1) === i + 1) o.selected = true;
      police.appendChild(o);
    });
    police.addEventListener('change', () => { e.f = parseInt(police.value, 10); maj(); });
    hote.appendChild(bloc(T().police || 'Police', police));

    hote.appendChild(grille(2, [
      bloc(T().taille || 'Taille', champNombre(e.px, 6, 160, (v) => { e.px = v; maj(); })),
      bloc(T().couleur || 'Couleur', champCouleur(e.c, (v) => { e.c = v; maj(); })),
    ]));

    hote.appendChild(grille(2, [
      boutonPlat(T().gras || 'Gras', e.g === 1, () => { memoriser(); e.g = e.g ? 0 : 1; redessiner(); }),
      boutonPlat(T().italique || 'Italique', e.i === 1, () => { memoriser(); e.i = e.i ? 0 : 1; redessiner(); }),
    ]));

    hote.appendChild(bloc(T().align || 'Alignement', grille(3,
      [['l', '◀'], ['c', '■'], ['r', '▶']].map(([v, s]) =>
        boutonPlat(s, e.a === v, () => { memoriser(); e.a = v; redessiner(); })))));

    hote.appendChild(bloc(T().interligne || 'Interligne',
      champCurseur(e.lh || 125, 60, 300, (v) => { e.lh = v; maj(); })));
    hote.appendChild(bloc(T().interlettre || 'Espacement des lettres',
      champCurseur(e.ls || 0, -50, 500, (v) => { e.ls = v; maj(); })));

  } else if (e.t === 'image') {
    hote.appendChild(bloc(T().lien || "URL de l'image",
      champTexte(e.url, 'https://…', (v) => { e.url = v.trim(); maj(); })));
    hote.appendChild(bloc(null, boutonPlat(T().remplacer || "Remplacer l'image", null,
      () => ouvrirModaleImage(e), { icone: 'image' })));

    const fit = document.createElement('select');
    [['cover', T().fitCover || 'Remplir le cadre'], ['contain', T().fitContain || 'Image entière']]
      .forEach(([v, n]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = n;
        if ((e.fit || 'cover') === v) o.selected = true;
        fit.appendChild(o);
      });
    fit.addEventListener('change', () => { e.fit = fit.value; maj(); });
    hote.appendChild(bloc(T().remplissage || 'Mode de remplissage', fit));

    hote.appendChild(grille(2, [
      bloc(T().rayon || 'Rayon', champNombre(e.r || 0, 0, 400, (v) => { e.r = v; maj(); })),
      bloc(T().bordure || 'Bordure', champNombre(e.bw || 0, 0, 40, (v) => { e.bw = v; maj(); })),
    ]));
    if (e.bw) hote.appendChild(bloc(T().couleurBordure || 'Couleur de bordure',
      champCouleur(e.bc || '#101418', (v) => { e.bc = v; maj(); })));

  } else if (e.t === 'forme') {
    hote.appendChild(bloc(T().couleur || 'Couleur', champCouleur(e.c, (v) => { e.c = v; maj(); })));
    hote.appendChild(grille(2, [
      bloc(T().rayon || 'Rayon', champNombre(e.r || 0, 0, 400, (v) => { e.r = v; maj(); })),
      bloc(T().bordure || 'Bordure', champNombre(e.bw || 0, 0, 40, (v) => { e.bw = v; maj(); })),
    ]));
    if (e.bw) hote.appendChild(bloc(T().couleurBordure || 'Couleur de bordure',
      champCouleur(e.bc || '#101418', (v) => { e.bc = v; maj(); })));

  } else if (e.t === 'icone') {
    const g = creer('div', 'bibliotheque');
    (etat.atelier?.icones || []).forEach((n) => {
      const b = creer('button', e.n === n ? 'actif' : null);
      b.type = 'button'; b.title = n;
      b.appendChild(iconePlan(n, null));
      b.addEventListener('click', () => { memoriser(); e.n = n; redessiner(); });
      g.appendChild(b);
    });
    hote.appendChild(bloc(T().icone || 'Icône', g));
    hote.appendChild(bloc(T().couleur || 'Couleur', champCouleur(e.c, (v) => { e.c = v; maj(); })));
  }

  /* ---- position, dimensions, rotation, opacite : communs ---- */
  hote.appendChild(bloc(T().position || 'Position', grille(2, [
    champNombre(e.x, -2000, 4000, (v) => { e.x = v; maj(); }),
    champNombre(e.y, -2000, 4000, (v) => { e.y = v; maj(); }),
  ])));

  const dims = [champNombre(e.w, 8, 4000, (v) => { e.w = v; maj(); })];
  if (e.t === 'image' || e.t === 'forme') {
    dims.push(champNombre(e.h, 6, 4000, (v) => { e.h = v; maj(); }));
  }
  hote.appendChild(bloc(T().dimensions || 'Dimensions', grille(dims.length, dims)));

  hote.appendChild(bloc(T().rotation || 'Rotation',
    champCurseur(e.rot || 0, -180, 180, (v) => { e.rot = v; maj(); })));
  hote.appendChild(bloc(T().opacite || 'Opacité',
    champCurseur(e.o == null ? 100 : e.o, 0, 100, (v) => { e.o = v; maj(); })));

  hote.appendChild(bloc(T().ordre || 'Ordre', grille(4, [
    boutonPlat('', null, () => calque('haut'), { icone: 'devant' }),
    boutonPlat('', null, () => calque(1), { icone: 'devant' }),
    boutonPlat('', null, () => calque(-1), { icone: 'derriere' }),
    boutonPlat('', null, () => calque('bas'), { icone: 'derriere' }),
  ])));

  hote.appendChild(grille(2, [
    boutonPlat(e.v ? (T().deverrouiller || 'Déverrouiller') : (T().verrouiller || 'Verrouiller'),
      e.v === 1, () => { memoriser(); e.v = e.v ? 0 : 1; redessiner(); }, { icone: 'cadenas' }),
    boutonPlat(T().dupliquer || 'Dupliquer', null, dupliquer, { icone: 'copier' }),
  ]));
  hote.appendChild(bloc(null,
    boutonPlat(T().supprimer || 'Supprimer', null, supprimer, { icone: 'poubelle', danger: true })));
}

/* ------------------------------------------------------------- pied ---- */
function quantite() {
  const max = etat.atelier?.maxQuantite || 10;
  return Math.max(1, Math.min(parseInt($('quantite').value, 10) || 1, max));
}

function coutTotal() {
  const prix = etat.atelier?.prix || { parPage: 0, parExemplaire: 0 };
  return Math.floor((etat.doc.pages.length * prix.parPage + prix.parExemplaire) * quantite());
}

function feuillesNecessaires() { return etat.doc.pages.length * quantite(); }

function majPied() {
  const feuilles = feuillesNecessaires();
  const assez = etat.papier >= feuilles;
  const total = etat.doc.pages.reduce((n, p) => n + (p.els || []).length, 0);
  $('btnImprimer').disabled = !assez || total === 0;

  const stock = $('stock');
  stock.classList.toggle('manque', !assez);
  vider(stock);
  stock.appendChild(creer('span', null, (T().papier || 'Papier') + ' : '));
  stock.appendChild(creer('b', null, `${etat.papier} / ${feuilles}`));
}
