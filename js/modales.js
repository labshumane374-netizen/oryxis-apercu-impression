/* =========================================================================
   mt_printers — fenetres

   Confirmation, choix d'image, bibliotheque d'icones, recapitulatif avant
   impression. Toutes partagent la meme coquille #modale.
   ========================================================================= */

let fermetureModale = null;

function fermerModale() {
  $('modale').classList.add('cache');
  fermetureModale = null;
}

/**
 * @param {string} titre
 * @param {string} sousTitre
 * @param {HTMLElement|null} corps
 * @param {Array} actions  [{ libelle, principal, danger, action }]
 */
function ouvrirModale(titre, sousTitre, corps, actions) {
  const m = $('modale');
  const boite = $('modaleBoite');
  vider(boite);
  boite.classList.remove('large');

  const tete = creer('div', 'modale-tete');
  tete.appendChild(creer('h3', null, titre));
  if (sousTitre) tete.appendChild(creer('p', null, sousTitre));
  boite.appendChild(tete);

  if (corps) {
    const c = creer('div', 'modale-corps');
    c.appendChild(corps);
    boite.appendChild(c);
  }

  const pied = creer('div', 'modale-pied');
  (actions || []).forEach((a) => {
    const b = creer('button', a.principal ? 'principal' : (a.danger ? 'second danger' : 'second'), a.libelle);
    b.type = 'button';
    b.addEventListener('click', () => {
      const garder = a.action ? a.action() : false;
      if (!garder) fermerModale();
    });
    pied.appendChild(b);
  });
  boite.appendChild(pied);

  m.classList.remove('cache');
  fermetureModale = fermerModale;
}

/* ------------------------------------------------------- confirmation -- */
function demanderConfirmation(titre, texte, libelleOui, action, danger) {
  ouvrirModale(titre, texte, null, [
    { libelle: T().annulerAction || 'Annuler' },
    { libelle: libelleOui, principal: !danger, danger: !!danger, action },
  ]);
}

/* ---------------------------------------------------------- image ------ */
function ouvrirModaleImage(cible) {
  const corps = creer('div');
  const champ = document.createElement('input');
  champ.type = 'text';
  champ.placeholder = 'https://i.imgur.com/…';
  champ.value = cible ? (cible.url || '') : '';
  corps.appendChild(bloc(T().lien || "URL de l'image", champ));

  const apercu = creer('div', 'apercu-image');
  const rafraichir = () => {
    vider(apercu);
    if (!urlOk(champ.value.trim())) {
      apercu.appendChild(creer('span', null, T().apercuImage || "L'aperçu s'affichera ici."));
      return;
    }
    const img = document.createElement('img');
    img.src = champ.value.trim();
    img.addEventListener('error', () => {
      vider(apercu);
      apercu.appendChild(creer('span', null, T().imageIntrouvable || 'Image introuvable.'));
    });
    apercu.appendChild(img);
  };
  champ.addEventListener('input', rafraichir);
  rafraichir();
  corps.appendChild(apercu);

  ouvrirModale(
    cible ? (T().remplacer || "Remplacer l'image") : (T().ajouterImage || 'Ajouter une image'),
    T().imageAide || 'Héberge ta photo sur imgur, imgbb ou postimg, puis colle son lien direct.',
    corps,
    [
      { libelle: T().annulerAction || 'Annuler' },
      {
        libelle: cible ? (T().remplacer || 'Remplacer') : (T().ajouter || 'Ajouter'),
        principal: true,
        action: () => {
          const url = champ.value.trim();
          if (cible) { memoriser(); cible.url = url; redessiner(); }
          else ajouter('image', url);
        }
      },
    ]
  );
  setTimeout(() => champ.focus(), 60);
}

/* ---------------------------------------------------------- icones ----- */
function ouvrirModaleIcone() {
  const corps = creer('div', 'bibliotheque grande');
  let choisie = (etat.atelier?.icones || [])[0];
  (etat.atelier?.icones || []).forEach((n) => {
    const b = creer('button', n === choisie ? 'actif' : null);
    b.type = 'button'; b.title = n;
    b.appendChild(iconePlan(n, null));
    b.addEventListener('click', () => {
      choisie = n;
      [...corps.children].forEach((c) => c.classList.toggle('actif', c === b));
    });
    corps.appendChild(b);
  });

  ouvrirModale(
    T().choisirIcone || 'Choisir une icône',
    T().iconeAide || 'Elle se pose au centre de la page, prête à être déplacée.',
    corps,
    [
      { libelle: T().annulerAction || 'Annuler' },
      { libelle: T().ajouter || 'Ajouter', principal: true, action: () => ajouter('icone', choisie) },
    ]
  );
}

/* ------------------------------------------------------- impression ---- */
function ligneRecap(libelle, valeur, fort) {
  const l = creer('div', 'recap' + (fort ? ' fort' : ''));
  l.appendChild(creer('span', null, libelle));
  l.appendChild(creer('b', null, valeur));
  return l;
}

function ouvrirModaleImpression() {
  const q = quantite();
  const pages = etat.doc.pages.length;
  const cout = coutTotal();
  const feuilles = feuillesNecessaires();

  const corps = creer('div');
  corps.appendChild(ligneRecap(T().nom || 'Nom du document',
    etat.nom.trim() || (T().sansNom || 'Sans titre')));
  corps.appendChild(ligneRecap(T().pages || 'Pages', String(pages)));
  corps.appendChild(ligneRecap(T().quantite || 'Exemplaires', String(q)));
  corps.appendChild(ligneRecap(T().papierConsomme || 'Papier consommé',
    `${feuilles} / ${etat.papier}`));
  corps.appendChild(ligneRecap(T().coutTotal || 'Coût total',
    cout > 0 ? '$' + cout : (T().gratuit || 'Gratuit'), true));

  ouvrirModale(
    T().imprimerJournal || 'Imprimer le journal',
    T().impressionAide || 'Vérifie avant de lancer le tirage.',
    corps,
    [
      { libelle: T().annulerAction || 'Annuler' },
      { libelle: T().imprimer || 'Imprimer', principal: true, action: lancerImpression },
    ]
  );
}

/* ------------------------------------------------------- archives (27/10)
   Documents du metier gardes en base : chaque impression y entre, et
   « Archiver » enregistre sans imprimer. Ouvrir une archive la charge dans
   l'editeur ; seul le patron supprime. Les vignettes arrivent par lots. */
const vignettesArchives = {};
const PAR_PAGE_ARCHIVES = 24;

function demander(route, charge) {
  return versLua(route, charge).then((r) => (r && r.json ? r.json() : null)).catch(() => null);
}

function ouvrirArchives() {
  demander('archives').then((rep) => {
    if (etat.mode !== 'editeur') return;
    const liste = (rep && rep.liste) || [];
    const patron = !!(rep && rep.patron);
    let recherche = '';
    let combien = PAR_PAGE_ARCHIVES;

    const corps = creer('div', 'archives');
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.placeholder = 'Rechercher un titre, un auteur, une date…';
    corps.appendChild(champ);
    const grille = creer('div', 'grille-archives');
    corps.appendChild(grille);
    const plus = creer('button', 'second', 'Voir plus');
    plus.type = 'button';
    corps.appendChild(plus);

    const vignette = (a, hote) => {
      vider(hote);
      const v = vignettesArchives[a.id];
      if (v) {
        const img = document.createElement('img');
        img.src = v;
        hote.appendChild(img);
      } else {
        hote.appendChild(creer('span', null, a.nom));
      }
    };

    const remplir = () => {
      vider(grille);
      const q = recherche.trim().toLowerCase();
      const filtres = liste.filter((a) => !q || [a.nom, a.auteur, a.date].join(' ').toLowerCase().includes(q));
      const visibles = filtres.slice(0, combien);
      plus.classList.toggle('cache', filtres.length <= combien);
      if (!visibles.length) {
        grille.appendChild(creer('p', 'vide-archives', q ? 'Aucun document trouvé.' : 'Aucun document archivé pour le moment. Chaque impression y sera ajoutée.'));
        return;
      }
      const hotes = {};
      visibles.forEach((a) => {
        const carte = creer('div', 'carte-archive');
        const v = creer('div', 'vignette-archive');
        hotes[a.id] = v;
        vignette(a, v);
        carte.appendChild(v);
        const txt = creer('div', 'texte-archive');
        txt.appendChild(creer('b', null, a.nom));
        txt.appendChild(creer('span', null, [a.auteur, a.date, a.pages > 1 ? `${a.pages} pages` : ''].filter(Boolean).join(' · ')));
        carte.appendChild(txt);

        const actions = creer('div', 'actions-archive');
        const ouvrir = creer('button', 'plat', 'Ouvrir');
        ouvrir.type = 'button';
        ouvrir.addEventListener('click', () => chargerArchive(a.id));
        actions.appendChild(ouvrir);
        if (patron) {
          const suppr = creer('button', 'plat danger');
          suppr.type = 'button';
          suppr.title = 'Supprimer';
          suppr.appendChild(iconeUI('poubelle'));
          suppr.addEventListener('click', () => {
            suppr.disabled = true;
            demander('supprimerArchive', { id: a.id }).then((r) => {
              if (r && r.ok) {
                liste.splice(liste.indexOf(a), 1);
                if (etat.archive === a.id) etat.archive = null;
                notifier('Archive supprimée.');
                remplir();
              } else {
                suppr.disabled = false;
                notifier((r && r.message) || 'Suppression impossible.');
              }
            });
          });
          actions.appendChild(suppr);
        }
        carte.appendChild(actions);
        grille.appendChild(carte);
      });

      const manquantes = visibles.filter((a) => a.a_vignette && !vignettesArchives[a.id]).map((a) => a.id);
      if (manquantes.length) {
        demander('archiveVignettes', { ids: manquantes }).then((res) => {
          Object.entries(res || {}).forEach(([id, v]) => {
            vignettesArchives[id] = v;
            const a = liste.find((x) => String(x.id) === id);
            if (a && hotes[a.id] && hotes[a.id].isConnected) vignette(a, hotes[a.id]);
          });
        });
      }
    };

    champ.addEventListener('input', () => { recherche = champ.value; combien = PAR_PAGE_ARCHIVES; remplir(); });
    plus.addEventListener('click', () => { combien += PAR_PAGE_ARCHIVES; remplir(); });

    const s = liste.length > 1 ? 's' : '';
    ouvrirModale('Archives', patron
      ? `${liste.length} document${s} de tout le service. Ouvrez-en un pour le relire, le modifier ou le réimprimer.`
      : `${liste.length} document${s} que vous avez faits. Ouvrez-en un pour le relire, le modifier ou le réimprimer.`,
      corps, [{ libelle: T().fermer || 'Fermer', principal: true }]);
    $('modaleBoite').classList.add('large');
    remplir();
    setTimeout(() => champ.focus(), 60);
  });
}

function chargerArchive(id) {
  demander('archive', { id }).then((rep) => {
    if (!rep || rep.erreur || !rep.doc || !Array.isArray(rep.doc.pages) || !rep.doc.pages.length) {
      notifier('Archive introuvable.');
      return;
    }
    fermerModale();
    memoriser();
    etat.nom = rep.nom || '';
    if ((etat.atelier?.formats || []).some((f) => f.id === rep.doc.format)) etat.format = rep.doc.format;
    etat.doc = { pages: rep.doc.pages };
    etat.p = 0;
    etat.sel = -1;
    etat.archive = rep.id;
    etat.brouillon = null;   // nouveau brouillon : ne pas ecraser celui d'avant
    redessiner();
    notifier(`« ${etat.nom || 'Document'} » ouvert depuis les archives.`);
  });
}

/* ------------------------------------------------- brouillons (27/10)
   Enregistres automatiquement sur le PC du joueur a chaque modification.
   Les brouillons imprimes restent, marques « Imprimé ». */
function ouvrirBrouillons() {
  const corps = creer('div', 'archives');
  const liste = creer('div', 'liste-brouillons');
  corps.appendChild(liste);

  const remplir = () => {
    vider(liste);
    const brouillons = lireBrouillons();
    if (!brouillons.length) {
      liste.appendChild(creer('p', 'vide-archives', 'Aucun brouillon. Tout ce que vous rédigez est enregistré ici automatiquement.'));
      return;
    }
    brouillons.forEach((b) => {
      const l = creer('div', 'ligne-brouillon' + (b.cle === etat.brouillon ? ' courant' : ''));
      const txt = creer('div', 'texte-archive');
      txt.appendChild(creer('b', null, b.nom || 'Sans titre'));
      const pages = b.doc.pages.length;
      txt.appendChild(creer('span', null, [dateBrouillon(b.quand), `${pages} page${pages > 1 ? 's' : ''}`,
        b.cle === etat.brouillon ? 'en cours' : ''].filter(Boolean).join(' · ')));
      l.appendChild(txt);
      if (b.imprime) l.appendChild(creer('span', 'pastille-imprime', 'Imprimé'));

      const ouvrir = creer('button', 'plat', 'Ouvrir');
      ouvrir.type = 'button';
      ouvrir.disabled = b.cle === etat.brouillon;
      ouvrir.addEventListener('click', () => {
        fermerModale();
        reprendreBrouillon(b);
        notifier(`« ${b.nom || 'Sans titre'} » repris.`);
      });
      const suppr = creer('button', 'plat danger');
      suppr.type = 'button';
      suppr.title = 'Supprimer ce brouillon';
      suppr.appendChild(iconeUI('poubelle'));
      suppr.addEventListener('click', () => { supprimerBrouillon(b.cle); remplir(); });
      l.append(ouvrir, suppr);
      liste.appendChild(l);
    });
  };
  remplir();

  ouvrirModale('Brouillons', 'Enregistrés automatiquement sur ce PC à chaque modification. Ils ne sont visibles que par vous.',
    corps, [{ libelle: T().fermer || 'Fermer', principal: true }]);
}

let archivageEnCours = false;

async function enregistrerArchive() {
  if (archivageEnCours) return;
  const total = etat.doc.pages.reduce((n, p) => n + (p.els || []).length, 0);
  if (!total) { notifier('Le document est vide.'); return; }
  archivageEnCours = true;
  $('btnArchiver').disabled = true;
  const charge = {
    imprimante: etat.imprimante,
    nom: etat.nom.trim(),
    doc: { format: etat.format, pages: etat.doc.pages },
    archive: etat.archive,
  };
  const v = await vignetteOuRien(etat.doc.pages[0], formatCourant());
  if (typeof v === 'string' && v.startsWith('data:image/jpeg;base64,')) charge.vignette = v;
  const rep = await demander('archiver', charge);
  archivageEnCours = false;
  $('btnArchiver').disabled = false;
  if (rep && rep.ok) {
    etat.archive = rep.id;
    if (charge.vignette) vignettesArchives[rep.id] = charge.vignette;
    notifier('Enregistré dans les archives.');
  } else {
    notifier((rep && rep.message) || 'Enregistrement impossible.');
  }
}
