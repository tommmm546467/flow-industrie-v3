/* Le panneau de contact.
   Le clic sur un lien vers /contact/ ouvre le panneau au lieu de quitter la page.
   Le lien continue de pointer vers la page : sans JavaScript, ou sur un lien ouvert
   dans un nouvel onglet, le visiteur atterrit sur /contact/ comme avant. */
(function () {
  var panneau = document.getElementById('panneau-contact');
  if (!panneau || typeof panneau.showModal !== 'function') return;
  var declencheur = null;

  function ouvrir(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  /* nouvel onglet */
    e.preventDefault();
    declencheur = e.currentTarget;
    /* La page d'ou vient la demande, enfin exacte : sur la page dediee ce champ
       valait toujours /contact/ et l'information etait perdue. */
    var origine = document.getElementById('pan-page_origine');
    if (origine) origine.value = location.pathname + location.search;
    panneau.showModal();
    var premier = panneau.querySelector('input:not([type=hidden]):not(.piege)');
    if (premier) premier.focus();
  }

  document.querySelectorAll('a[href$="contact/index.html"], a[href="contact/index.html"]')
    .forEach(function (lien) { lien.addEventListener('click', ouvrir); });

  panneau.querySelector('.panneau-croix').addEventListener('click', function () { panneau.close(); });
  panneau.addEventListener('click', function (e) { if (e.target === panneau) panneau.close(); });
  /* Echap : <dialog> le gere en principe seul, mais le comportement natif s'est
     revele absent au test. On ne laisse pas la sortie dependre de ca. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panneau.open) { e.preventDefault(); panneau.close(); }
  });
  panneau.addEventListener('close', function () { if (declencheur) declencheur.focus(); });
})();

/* Tracage de la source du lead, sans cookie, sans traceur tiers. */
(function () {
  var p = new URLSearchParams(location.search);
  var mettre = function (id, v) { var c = document.getElementById(id); if (c) c.value = v || ''; };
  mettre('pan-page_origine', location.pathname + location.search);
  mettre('pan-referent', document.referrer || 'accès direct');
  mettre('pan-utm_source', p.get('utm_source'));
  mettre('pan-utm_medium', p.get('utm_medium'));
  mettre('pan-utm_campaign', p.get('utm_campaign'));
})();

/* Envoi en arriere-plan, pour que le remerciement s'affiche dans le panneau.
   Repris tel quel du formulaire de /contact/ : meme appel, memes garde-fous.
   Le traitement est celui de l'hebergement, dans /envoi/ : aucun prestataire tiers. */
(function () {
  var form = document.getElementById('pan-formulaire-contact');
  var merci = document.getElementById('pan-remerciement');
  var erreur = document.getElementById('pan-erreur-envoi');
  if (!form || !merci || !erreur) return;
  var bouton = form.querySelector('button[type="submit"]');
  var libelle = bouton.textContent;

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    erreur.hidden = true;
    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    /* Le formulaire part tel quel. L'en-tete Accept demande une reponse en JSON :
       sans lui le serveur renverrait sur la page de remerciement : le panneau
       disparaitrait au lieu d'afficher le merci a sa place. */
    try {
      var reponse = await fetch('/envoi/contact.php', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      var resultat = await reponse.json();
      if (!resultat.success) throw new Error(resultat.message || 'envoi refusé');
      form.hidden = true;
      merci.hidden = false;
      merci.focus();
    } catch (_) {
      /* Rien n'est efface : le visiteur retrouve ses champs et peut renvoyer. */
      erreur.hidden = false;
      bouton.disabled = false;
      bouton.textContent = libelle;
    }
  });
})();

/* Barre d'action sur telephone : elle apparait des qu'on a depasse le premier ecran. */
(function () {
  var barre = document.querySelector('.barre-mobile');
  if (!barre) return;
  var seuil = function () { return Math.max(320, innerHeight * 0.6); };
  var maj = function () {
    if (scrollY > seuil()) barre.setAttribute('data-visible', '');
    else barre.removeAttribute('data-visible');
  };
  addEventListener('scroll', maj, { passive: true });
  maj();
})();
