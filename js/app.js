/* =========================================================================
   mt_printers — assemblage

   Messages NUI, clavier, horloge, ouverture et fermeture. C'est le seul
   fichier qui parle au client Lua.
   ========================================================================= */

/* ---------------------------------------------------------- NUI vers Lua */
function versLua(route, charge) {
  return fetch(`https://mt_printers/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(charge || {})
  }).catch(() => {});
}

/* ---------------------------------------------------------- affichage -- */
const ZONES = ['bandeau', 'railGauche', 'railDroite', 'scene', 'lecteur'];

function montrer(ids) {
  ZONES.forEach((id) => $(id).classList.toggle('cache', !ids.includes(id)));
}

function fermer(prevenir) {
  fermerModale();
  fermerMenu();
  document.body.classList.remove('visible');
  montrer([]);
  etat.mode = null;
  etat.apercu = false;
  if (prevenir !== false) versLua('fermer');
}

/* ----------------------------------------------------------- horloge --- */
function majHorloge() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  $('horlogeHeure').textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
  $('horlogeJour').textContent = d
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

/* ----------------------------------------------------------- editeur --- */
function libellerBoutons() {
  const t = T();
  const garnir = (id, icone, libelle) => {
    vider($(id));
    if (icone) $(id).appendChild(iconeUI(icone));
    if (libelle) $(id).appendChild(creer('span', null, libelle));
  };
  $('uiRole').textContent = t.role || 'Éditeur de journal';
  $('uiElementsL').textContent = t.elements || 'Éléments';
  $('uiElementsP').textContent = t.apercu || '';
  $('uiPagesL').textContent = t.pages || 'Pages';
  $('uiModeleL').textContent = t.modele || 'Modèles de page';
  $('uiQuantiteL').textContent = t.quantite || 'Exemplaires';
  garnir('btnImprimer', 'imprime', t.imprimerJournal || 'Imprimer le journal');
  garnir('btnApercu', 'oeil', t.apercuImp || 'Aperçu avant impression');
  garnir('btnLien', null, t.lien_bouton || 'Obtenir le lien');
  garnir('btnBrouillons', 'copier', 'Brouillons');
  $('btnBrouillons').title = 'Documents enregistrés automatiquement sur ce PC';
  garnir('btnArchives', 'page', 'Archives');
  garnir('btnArchiver', 'disque', 'Archiver');
  $('btnArchiver').title = 'Enregistrer dans les archives sans imprimer';
  garnir('btnAnnuler', 'croix', t.annuler || 'Fermer');
  garnir('btnDupPage', 'copier', t.dupliquer || 'Dupliquer');
  garnir('btnSupprPage', 'poubelle', t.supprimer || 'Supprimer');
  garnir('btnUndo', 'retour', null);
  garnir('btnRedo', 'refaire', null);
  $('btnUndo').title = t.annulerAction || 'Annuler';
  $('btnRedo').title = t.refaireAction || 'Rétablir';
}

/* 23/10 : habillage selon le metier (Config.jobs[...].marque). Sans marque,
   l'editeur reste celui du Weazel News, tel qu'ecrit dans index.html. */
function appliquerMarque(m) {
  const mot = document.querySelector('.marque .mot');
  const devise = document.querySelector('.marque .devise');
  const sig = document.querySelector('.signature-carte span');
  if (!appliquerMarque.origine) {
    appliquerMarque.origine = { mot: mot.innerHTML, devise: devise.innerHTML, sig: sig.textContent, titre: document.title };
  }
  const o = appliquerMarque.origine;
  document.body.classList.toggle('theme-doj', !!(m && m.theme === 'doj'));
  mot.innerHTML = (m && m.mot) || o.mot;
  devise.innerHTML = (m && m.devise) || o.devise;
  sig.textContent = (m && m.signature) || o.sig;
  document.title = m ? 'Department of Justice — Éditeur' : o.titre;
  if (m) {
    if (m.role) etat.textes.role = m.role;
    if (m.imprimer) etat.textes.imprimerJournal = m.imprimer;
    if (m.nomExemple) etat.textes.nomExemple = m.nomExemple;
  }
}

function ouvrirEditeur(data) {
  etat.mode = 'editeur';
  etat.apercu = false;
  etat.imprimante = data.imprimante;
  etat.atelier = data.atelier || {};
  etat.textes = data.textes || {};
  appliquerMarque(etat.atelier.marque);
  $('btnLien').classList.toggle('cache', !etat.atelier.lien);
  etat.papier = data.papier || 0;
  etat.argent = data.argent || 0;
  etat.sel = -1;
  etat.p = 0;
  etat.outil = null;
  etat.histoire.length = 0;
  etat.futur.length = 0;
  etat.archive = null;   // 27/10 : archive d'origine si le document vient des archives
  etat.brouillon = null; // 27/10 : cle du brouillon sur le PC (creee a la premiere modification)

  etat.format =(etat.atelier.formats || [{ id: 'a4' }])[0].id;
  const premier = (etat.atelier.modeles || [])[0];
  etat.nom = '';
  etat.doc = { pages: [premier ? { fond: premier.fond, els: copieEls(premier.els) } : pageVierge()] };

  libellerBoutons();
  vider($('vigGauche'));
  $('vigGauche').appendChild(iconeUI('elements'));
  $('quantite').max = etat.atelier.maxQuantite || 10;
  $('quantite').value = '1';

  construireOutils();
  majHorloge();
  montrer(['bandeau', 'railGauche', 'railDroite', 'scene']);
  $('scene').classList.add('edition');
  document.body.classList.add('visible');
  redessiner();
  etatSauvegarde(T().sauvegarde || 'Sauvegardé');

  // 27/10 : le dernier brouillon non imprime est propose, sans limite de
  // duree ; les autres sont dans « Brouillons ».
  const b = brouillon();
  if (b) {
    demanderConfirmation(
      T().brouillonTitre || 'Reprendre votre brouillon ?',
      `« ${b.nom || 'Sans titre'} », enregistré sur ce PC le ${dateBrouillon(b.quand)}.`,
      T().reprendre || 'Reprendre',
      () => reprendreBrouillon(b)
    );
  }
}

function dateBrouillon(quand) {
  const d = new Date(quand || Date.now());
  return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function reprendreBrouillon(b) {
  etat.nom = b.nom || '';
  etat.format = b.format || etat.format;
  etat.doc = b.doc;
  etat.p = Math.min(b.p || 0, b.doc.pages.length - 1);
  etat.sel = -1;
  etat.brouillon = b.cle;
  etat.archive = b.archive || null;
  etat.histoire.length = 0;
  etat.futur.length = 0;
  redessiner();
}

/* ----------------------------------------------------------- lecture --- */
function afficherPageLecture() {
  const L = etat.lecture;
  dessinerPage($('pageLecture'), L.pages[L.i] || L.pages[0], false, L.format);
  const multi = L.pages.length > 1;
  $('barrePages').classList.toggle('cache', !multi);
  if (multi) {
    $('pageCompte').textContent = `${L.i + 1} / ${L.pages.length}`;
    $('pagePrec').disabled = L.i === 0;
    $('pageSuiv').disabled = L.i === L.pages.length - 1;
  }
}

function tournerPage(sens) {
  if (etat.mode !== 'lecture') return;
  const L = etat.lecture;
  const j = L.i + sens;
  if (j < 0 || j >= L.pages.length) return;
  L.i = j;
  afficherPageLecture();
}

// Oryxis 05/10 : la page de lecture prend la hauteur de l'ecran et reste
// centree (l'ancien calcul se faisait avant que la zone soit mesurable, et
// l'origine « top center » decalait la page).
function ajusterLecture(format) {
  const f = format || { l: 794, h: 1123 };
  const cadre = $('cadreLecture');
  const e = Math.max(0.3, Math.min((window.innerHeight - 140) / f.h, (window.innerWidth - 200) / f.l, 1.3));
  etat.echelle = e;
  cadre.style.transformOrigin = 'top left';
  cadre.style.transform = `scale(${e})`;
  cadre.style.width = (f.l * e) + 'px';
  cadre.style.height = (f.h * e) + 'px';
}

function lancerLecture(pages, format, meta, apercu) {
  etat.mode = 'lecture';
  etat.apercu = !!apercu;
  etat.lecture = { pages, i: 0, format };
  afficherPageLecture();

  $('signatureLecture').textContent =
    [meta.auteur ? `${T().par || 'Par'} ${meta.auteur}` : '', meta.date, meta.heure].filter(Boolean).join(' · ');
  $('uiTourner').textContent = T().tourner || '';

  vider($('btnFermerLecture'));
  $('btnFermerLecture').appendChild(iconeUI('croix'));
  $('btnFermerLecture').appendChild(creer('span', null,
    apercu ? (T().retour || "Retour à l'édition") : (T().fermer || 'Fermer')));
  $('btnImprimerLecture').classList.toggle('cache', !apercu);
  if (apercu) {
    vider($('btnImprimerLecture'));
    $('btnImprimerLecture').appendChild(iconeUI('imprime'));
    $('btnImprimerLecture').appendChild(creer('span', null, T().imprimer || 'Imprimer'));
  }

  montrer(apercu ? ['bandeau', 'lecteur'] : ['lecteur']);
  document.body.classList.add('visible');
  ajusterLecture(format);
  requestAnimationFrame(() => ajusterLecture(format));
}

function ouvrirLecture(data) {
  etat.atelier = data.atelier || {};
  etat.textes = data.textes || {};
  appliquerMarque(null);
  const d = data.document || {};

  // Trois generations : doc.pages (actuel), page (page unique), imageurl (origine).
  let pages, format = { l: 794, h: 1123 };
  if (d.doc && Array.isArray(d.doc.pages) && d.doc.pages.length) {
    pages = d.doc.pages;
    if (d.doc.l && d.doc.h) format = { l: d.doc.l, h: d.doc.h };
  } else if (d.page && Array.isArray(d.page.els)) {
    pages = [d.page];
  } else {
    pages = [{ fond: '#0d1014', els: urlOk(d.imageurl)
      ? [{ t: 'image', x: 0, y: 0, w: format.l, h: format.h, url: d.imageurl, fit: 'cover' }] : [] }];
  }
  lancerLecture(pages, format, d, false);
}

function ouvrirApercu() {
  lancerLecture(copieProfonde(etat.doc.pages), formatCourant(), { auteur: null }, true);
}

function retourEdition() {
  etat.mode = 'editeur';
  etat.apercu = false;
  montrer(['bandeau', 'railGauche', 'railDroite', 'scene']);
  redessiner();
}

/* ------------------------------------- vignette d'inventaire (24/10) ---
   La page 1, reduite, devient l'icone de l'item imprime a la place de la
   feuille generique. html-to-image est charge a la demande ; en cas
   d'echec ou de delai depasse, le serveur garde l'ancienne icone. */
const LIB_VIGNETTE = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
const LARGEUR_VIGNETTE = 180;
const DELAI_VIGNETTE = 5000;

function chargerLibVignette() {
  if (window.htmlToImage) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = LIB_VIGNETTE;
    s.onload = ok;
    s.onerror = ko;
    document.head.appendChild(s);
  });
}

async function fabriquerVignette(page, format, opts) {
  opts = opts || {};
  const largeur = opts.largeur || LARGEUR_VIGNETTE;
  await chargerLibVignette();
  // La page est posee hors ecran dans un conteneur : c'est la page elle-meme
  // qui est clonee, sans le decalage (decaler la page rendait l'image blanche).
  const coulisse = creer('div');
  coulisse.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none';
  const hote = creer('div', 'page');
  coulisse.appendChild(hote);
  document.body.appendChild(coulisse);
  try {
    dessinerPage(hote, page, false, format);
    await Promise.all([...hote.querySelectorAll('img')].map((i) => i.complete ? null
      : new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); })));
    return await window.htmlToImage.toJpeg(hote, {
      quality: opts.qualite || 0.75,
      skipFonts: !opts.polices, // vignette : polices deja proches a cette taille ; les integrer coutait ~7 s
      pixelRatio: 1,
      canvasWidth: largeur,
      canvasHeight: Math.round(largeur * format.h / format.l),
      backgroundColor: page.fond || '#f6f2e8',
      // image refusee (CORS) : case vide plutot qu'un echec complet
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      style: { boxShadow: 'none' }
    });
  } finally {
    coulisse.remove();
  }
}

function vignetteOuRien(page, format) {
  return Promise.race([
    fabriquerVignette(page, format).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), DELAI_VIGNETTE))
  ]);
}

/* 26/10 : image pleine taille de la page 1, pour « Obtenir le lien » (le lien
   donne est celui de cette image, collable dans Weazel). Polices integrees
   (c'est lu en grand) ; si ca echoue, nouvel essai sans elles. */
const LARGEUR_IMAGE = 1240;
const DELAI_IMAGE = 30000;

function imageOuRien(page, format) {
  const essai = (polices) => fabriquerVignette(page, format, { largeur: LARGEUR_IMAGE, qualite: 0.9, polices });
  return Promise.race([
    essai(true).catch(() => essai(false)).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), DELAI_IMAGE))
  ]);
}

/* -------------------------------------------------------- impression --- */
let impressionEnCours = false;

async function lancerImpression() {
  // la miniature prend quelques secondes : un second clic ne relance rien
  if (impressionEnCours) return;
  impressionEnCours = true;
  const charge = {
    imprimante: etat.imprimante,
    nom: etat.nom.trim(),
    doc: { format: etat.format, pages: etat.doc.pages },
    quantite: quantite(),
    archive: etat.archive
  };
  const vignette = await vignetteOuRien(etat.doc.pages[0], formatCourant());
  if (typeof vignette === 'string' && vignette.startsWith('data:image/jpeg;base64,')) charge.vignette = vignette;
  oublierBrouillon();
  document.body.classList.remove('visible');
  montrer([]);
  etat.mode = null;
  impressionEnCours = false;
  versLua('imprimer', charge);
}

/* ------------------------------------------------- lien en ligne (23/10) */
function copierTexte(texte) {
  const zone = creer('textarea');
  zone.value = texte;
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.appendChild(zone);
  zone.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  zone.remove();
  return ok;
}

async function obtenirLien() {
  const b = $('btnLien');
  if (b.disabled) return;
  b.disabled = true;
  const libelle = b.innerHTML;
  b.textContent = 'Création de l’image…';
  const image = await imageOuRien(etat.doc.pages[0], formatCourant());
  const charge = {
    imprimante: etat.imprimante,
    nom: etat.nom.trim(),
    doc: { format: etat.format, pages: etat.doc.pages },
    image: (typeof image === 'string' && image.startsWith('data:image/jpeg;base64,')) ? image : null,
  };
  versLua('lien', charge)
    .finally(() => { b.innerHTML = libelle; })
    .then((r) => (r && r.json ? r.json() : null))
    .then((rep) => {
      b.disabled = false;
      if (!rep || !rep.ok) {
        ouvrirModale(T().lien_titre || 'Lien du document', (rep && rep.message) || 'Le lien n’a pas pu être créé.', null,
          [{ libelle: T().fermer || 'Fermer', principal: true }]);
        return;
      }
      const copie = copierTexte(rep.url);
      const corps = creer('div');
      const champ = creer('input');
      champ.type = 'text';
      champ.readOnly = true;
      champ.value = rep.url;
      champ.style.width = '100%';
      champ.addEventListener('focus', () => champ.select());
      corps.appendChild(champ);
      corps.appendChild(creer('p', null, T().lien_aide
        || 'Collez ce lien où vous voulez. Ajoutez ?affiche=1 à la fin pour la page seule, plein cadre (panneau).'));
      ouvrirModale(T().lien_titre || 'Lien du document',
        copie ? (T().lien_copie || 'Lien copié dans le presse-papiers.') : (T().lien_selection || 'Sélectionnez le lien pour le copier.'),
        corps,
        [
          { libelle: T().lien_recopier || 'Copier à nouveau', action: () => { copierTexte(rep.url); return true; } },
          { libelle: T().fermer || 'Fermer', principal: true },
        ]);
      setTimeout(() => champ.select(), 50);
    })
    .catch(() => { b.disabled = false; });
}

/* -------------------------------------------------------- evenements --- */
window.addEventListener('message', (ev) => {
  const d = ev.data || {};
  // Signale au Lua que la page tourne : sans ce mot, il rend la souris au
  // bout de 3 s pour ne jamais laisser le joueur bloque.
  if (d.action) versLua('pret');
  if (d.action === 'editeur') ouvrirEditeur(d);
  else if (d.action === 'lire') ouvrirLecture(d);
  else if (d.action === 'fermer') fermer(false);
});

window.addEventListener('resize', () => {
  if (etat.mode === 'editeur') ajusterEchelle($('cadre'), $('scene'));
  else if (etat.mode === 'lecture') ajusterLecture(etat.lecture.format);
});

document.addEventListener('keydown', (ev) => {
  const k = ev.key.toLowerCase();

  if (ev.key === 'Escape') {
    if (!$('modale').classList.contains('cache')) { fermerModale(); return; }
    if (etat.apercu) retourEdition();
    else fermer(true);
    return;
  }

  if (etat.mode === 'lecture') {
    if (ev.key === 'ArrowRight' || ev.key === 'PageDown' || k === 'e') { tournerPage(1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp' || k === 'a') { tournerPage(-1); ev.preventDefault(); }
    return;
  }
  if (etat.mode !== 'editeur') return;
  if (!$('modale').classList.contains('cache')) return;

  const actif = document.activeElement;
  if (actif && (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA' || actif.isContentEditable)) return;

  if (ev.ctrlKey && k === 'z') {
    if (ev.shiftKey) { if (refaire()) redessiner(); }
    else if (annuler()) redessiner();
    ev.preventDefault(); return;
  }
  if (ev.ctrlKey && k === 'y') { if (refaire()) redessiner(); ev.preventDefault(); return; }
  if (ev.ctrlKey && k === 'd') { dupliquer(); ev.preventDefault(); return; }
  if (ev.ctrlKey && k === 'c') { copier(); ev.preventDefault(); return; }
  if (ev.ctrlKey && k === 'v') { coller(); ev.preventDefault(); return; }

  if (ev.key === 'Delete' || ev.key === 'Backspace') { supprimer(); ev.preventDefault(); return; }

  if (ev.key.startsWith('Arrow')) {
    const e = elSel();
    if (!e || e.v) return;
    memoriser();
    const pas = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowUp') e.y -= pas;
    if (ev.key === 'ArrowDown') e.y += pas;
    if (ev.key === 'ArrowLeft') e.x -= pas;
    if (ev.key === 'ArrowRight') e.x += pas;
    redessinerSeul();
    ev.preventDefault();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const page = $('page');
  page.addEventListener('mousedown', surMouseDown);
  page.addEventListener('dblclick', surDblClick);
  page.addEventListener('contextmenu', surContexte);
  window.addEventListener('mousemove', surMouseMove);
  window.addEventListener('mouseup', surMouseUp);
  window.addEventListener('mousedown', (ev) => {
    if (!ev.target.closest('#menuContexte')) fermerMenu();
  });

  $('scene').addEventListener('mousedown', (ev) => {
    if (ev.target === $('scene') || ev.target === $('cadre')) selectionner(-1);
  });

  $('btnDupPage').addEventListener('click', dupliquerPage);
  $('btnSupprPage').addEventListener('click', supprimerPage);
  $('btnUndo').addEventListener('click', () => { if (annuler()) redessiner(); });
  $('btnRedo').addEventListener('click', () => { if (refaire()) redessiner(); });

  $('pagePrec').addEventListener('click', () => tournerPage(-1));
  $('pageSuiv').addEventListener('click', () => tournerPage(1));
  $('lecteur').addEventListener('wheel', (ev) => {
    if (etat.mode !== 'lecture') return;
    tournerPage(ev.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  $('moins').addEventListener('click', () => { $('quantite').value = Math.max(1, quantite() - 1); majPied(); });
  $('plus').addEventListener('click', () => {
    $('quantite').value = Math.min(etat.atelier?.maxQuantite || 10, quantite() + 1);
    majPied();
  });
  $('quantite').addEventListener('input', majPied);

  $('btnApercu').addEventListener('click', ouvrirApercu);
  $('btnLien').addEventListener('click', obtenirLien);
  $('btnBrouillons').addEventListener('click', ouvrirBrouillons);
  $('btnArchives').addEventListener('click', ouvrirArchives);
  $('btnArchiver').addEventListener('click', enregistrerArchive);
  $('btnImprimer').addEventListener('click', () => {
    if (!$('btnImprimer').disabled) ouvrirModaleImpression();
  });
  $('btnAnnuler').addEventListener('click', () => fermer(true));
  $('btnFermerLecture').addEventListener('click', () => {
    if (etat.apercu) retourEdition(); else fermer(true);
  });
  $('btnImprimerLecture').addEventListener('click', () => {
    retourEdition();
    ouvrirModaleImpression();
  });
  $('modaleFond').addEventListener('mousedown', fermerModale);

  setInterval(majHorloge, 20000);
});
