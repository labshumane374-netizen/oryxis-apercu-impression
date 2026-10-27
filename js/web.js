/* =========================================================================
   mt_printers — lecture en ligne (23/10)

   Charge seulement quand le serveur sert un document par son lien
   (SetHttpHandler) : window.MT_WEB contient le document. On reutilise le
   lecteur de l'item, sans rien envoyer au jeu.
     ?affiche=1  page seule, plein cadre, sans interface (panneau en jeu)
     ?p=2        ouvre directement la page 2
   ========================================================================= */
(function () {
  const W = window.MT_WEB;
  if (!W) return;

  // Pas de jeu derriere : on neutralise les appels au Lua et la fermeture.
  versLua = function () { return Promise.resolve(null); };
  fermer = function () {};

  const q = new URLSearchParams(location.search);
  document.body.classList.add('web');
  if (q.has('affiche')) document.body.classList.add('affiche');
  document.title = W.nom || 'Weazel News';

  window.addEventListener('DOMContentLoaded', () => {
    ouvrirLecture({
      document: { doc: W.doc, auteur: W.auteur, date: W.date },
      atelier: { polices: W.polices },
      textes: { par: 'Par', tourner: 'Flèches ou molette pour tourner les pages' },
    });
    const p = parseInt(q.get('p'), 10);
    for (let i = 1; i < (p || 1); i++) tournerPage(1);
  });
})();
