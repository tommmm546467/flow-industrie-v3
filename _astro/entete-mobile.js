/* En-tete : hauteur reelle et menu principal sur petit ecran.
   Fichier a part, et non ajoute a panneau-contact.js, parce que la page
   /contact/ ne charge pas ce dernier : elle n'a pas de panneau a ouvrir. */

/* Hauteur reelle de l'en-tete.
   --h-entete commande le decalage des ancres, le collage des sections et
   plusieurs calc(100vh - ...). La valeur ecrite dans la feuille (4,3 rem) ne
   vaut que pour une rangee : quand l'en-tete en prenait deux sur telephone, il
   mesurait 125 px et toutes les ancres tombaient 56 px trop haut, sous lui.
   On la mesure donc pour de bon, au chargement et a chaque changement de taille. */
(function () {
  var entete = document.querySelector('.entete');
  if (!entete) return;
  var mesurer = function () {
    var h = Math.ceil(entete.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--h-entete', h + 'px');
  };
  mesurer();
  addEventListener('resize', mesurer);
  addEventListener('orientationchange', mesurer);
  /* Les polices changent la hauteur du bandeau en arrivant. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurer);
})();

/* Menu principal sur telephone et tablette.
   Sans JavaScript le panneau reste ferme, mais les cinq liens restent dans le
   plan du site et dans le pied de page : aucune page ne devient inatteignable. */
(function () {
  var entete = document.querySelector('.entete');
  var bouton = document.getElementById('bouton-menu');
  var menu = document.getElementById('menu-principal');
  if (!entete || !bouton || !menu) return;

  var racine = document.documentElement;
  var defilement = '';

  function ouvert() { return entete.hasAttribute('data-menu-ouvert'); }

  function ouvrir() {
    entete.setAttribute('data-menu-ouvert', '');
    bouton.setAttribute('aria-expanded', 'true');
    defilement = racine.style.overflow;
    racine.style.overflow = 'hidden';
    /* setTimeout et non requestAnimationFrame : ce dernier ne se declenche pas
       tant que l'onglet n'est pas peint, et le focus n'arrivait jamais. */
    setTimeout(function () {
      var premier = menu.querySelector('a');
      if (premier) premier.focus();
    }, 0);
  }

  function fermer(rendreLeFocus) {
    if (!ouvert()) return;
    entete.removeAttribute('data-menu-ouvert');
    bouton.setAttribute('aria-expanded', 'false');
    racine.style.overflow = defilement;
    if (rendreLeFocus) bouton.focus();
  }

  bouton.addEventListener('click', function () {
    if (ouvert()) fermer(false); else ouvrir();
  });

  /* Un lien choisi referme le panneau. Sur une ancre de la meme page rien ne
     recharge, et le panneau resterait plante devant la section visee. */
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) fermer(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ouvert()) { e.preventDefault(); fermer(true); }
  });

  /* Retour au grand ecran : le panneau n'existe plus, le verrou de defilement
     doit partir avec lui. */
  var grandEcran = matchMedia('(min-width:1081px)');
  var surChangement = function () { if (grandEcran.matches) fermer(false); };
  if (grandEcran.addEventListener) grandEcran.addEventListener('change', surChangement);
  else grandEcran.addListener(surChangement);
})();
