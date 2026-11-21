/* Comportements mobiles partages entre plusieurs pages — 21/09/2026,
 * generalise le 22/09
 *
 * Trois choses, independantes, et qui se taisent chacune si son bloc n'est
 * pas la : le rouleau des trois etapes, le rouleau des secteurs, et la ligne
 * active du tableau « Le constat ».
 *
 * Remplace `rouleau-etapes.js`, qui ne portait que la premiere.
 *
 * Chaque comportement se tait si son bloc n'est pas sur la page : c'est ce
 * qui permet de charger le meme fichier partout sans condition.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * Fabrique commune aux deux rouleaux
 *
 * Le glissement est natif — c'est `scroll-snap-type` qui l'assure, pas ce
 * script. Celui-ci n'ajoute que les fleches et le compteur, et ne les montre
 * qu'une fois initialise : sans lui, la bande reste glissable et aucune
 * commande ne promet ce qu'elle ne tient pas.
 *
 * L'activation se decide sur le debordement REEL de la bande, jamais sur une
 * largeur d'ecran supposee : c'est la seule mesure qui reste vraie si la mise
 * en page change.
 */
function fabriqueRouleau(opts) {
  var enveloppe = document.querySelector(opts.enveloppe);
  if (!enveloppe) return;

  var bande = enveloppe.querySelector(opts.bande);
  var prec = enveloppe.querySelector(opts.prec);
  var suiv = enveloppe.querySelector(opts.suiv);
  var rang = enveloppe.querySelector(opts.rang);
  var total = opts.total ? enveloppe.querySelector(opts.total) : null;
  if (!bande || !prec || !suiv || !rang) return;

  var pas = opts.pas || 1;                    // nombre de vignettes par page
  var boucle = opts.boucle === true;
  var vignettes = Array.prototype.slice.call(bande.children);
  if (vignettes.length <= pas) return;

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)');
  var nbPages = Math.ceil(vignettes.length / pas);
  if (total) total.textContent = String(nbPages);

  /* Les points, un par page.
   *
   * Ils remplacent les fleches sur telephone (16/11/2026, demande de Nathan) :
   * la fleche est un idiome de souris, le point est celui du pouce, et il dit
   * en plus ou l'on en est et combien il reste a voir.
   *
   * Ils se fabriquent ici et non dans le balisage des cinq pages : le nombre
   * de pages depend du pas et du nombre de vignettes, et une liste ecrite a la
   * main mentirait des qu'une vignette est ajoutee ou retiree.
   *
   * Ce sont des boutons, pas des pastilles decoratives : retirer les fleches
   * sans rien mettre a la place supprimerait la seule commande utilisable au
   * clavier. Ils sont donc aussi un second chemin, comme l'etaient les fleches.
   */
  var points = [];
  var barre = prec.parentNode;
  if (barre) {
    var liste = document.createElement('ul');
    liste.className = 'rouleau-points';
    for (var i = 0; i < nbPages; i++) {
      var item = document.createElement('li');
      var point = document.createElement('button');
      point.type = 'button';
      point.className = 'rouleau-point';
      point.setAttribute('aria-label', opts.libellePoint
        ? opts.libellePoint(i + 1, nbPages)
        : 'Aller a la page ' + (i + 1) + ' sur ' + nbPages);
      point.addEventListener('click', (function (p) {
        return function () { versPage(p); };
      })(i));
      item.appendChild(point);
      liste.appendChild(item);
      points.push(point);
    }
    barre.appendChild(liste);
  }

  function roulant() {
    return bande.scrollWidth - bande.clientWidth > 4;
  }

  function pageCourante() {
    var g = bande.scrollLeft;
    var meilleure = 0;
    var ecartMin = Infinity;
    for (var p = 0; p < nbPages; p++) {
      var v = vignettes[p * pas];
      if (!v) continue;
      var ecart = Math.abs(v.offsetLeft - bande.offsetLeft - g);
      if (ecart < ecartMin) { ecartMin = ecart; meilleure = p; }
    }
    return meilleure;
  }

  function versPage(p) {
    var cible = boucle
      ? ((p % nbPages) + nbPages) % nbPages          // la bande se referme
      : Math.min(nbPages - 1, Math.max(0, p));
    var v = vignettes[cible * pas];
    if (!v) return;
    bande.scrollTo({
      left: Math.max(0, v.offsetLeft - bande.offsetLeft),
      behavior: doux.matches ? 'auto' : 'smooth'
    });
  }

  function rafraichir() {
    if (!roulant()) { enveloppe.removeAttribute('data-actif'); return; }
    enveloppe.setAttribute('data-actif', '');
    var p = pageCourante();
    rang.textContent = String(p + 1);
    /* En boucle les fleches ne s'eteignent jamais : elles ramenent au debut,
       et une fleche grisee dirait le contraire. */
    prec.disabled = boucle ? false : p <= 0;
    suiv.disabled = boucle ? false : p >= nbPages - 1;
    /* `aria-current` plutot qu'une classe : l'etat est annonce par les lecteurs
       d'ecran, et la feuille s'y accroche sans qu'on ait deux sources. */
    for (var i = 0; i < points.length; i++) {
      if (i === p) points[i].setAttribute('aria-current', 'true');
      else points[i].removeAttribute('aria-current');
    }
  }

  prec.addEventListener('click', function () { versPage(pageCourante() - 1); });
  suiv.addEventListener('click', function () { versPage(pageCourante() + 1); });

  /* Le defilement emet beaucoup d'evenements ; on ne recalcule qu'une fois la
     main levee, sinon le compteur clignote pendant le glissement. */
  var attente = null;
  bande.addEventListener('scroll', function () {
    if (attente !== null) window.clearTimeout(attente);
    attente = window.setTimeout(rafraichir, 90);
  }, { passive: true });

  window.addEventListener('resize', rafraichir, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(rafraichir).observe(bande);
  rafraichir();
}

/* Les trois etapes de « Notre solution » : une carte a la fois, pas de boucle
   — c'est une sequence (developper, produire, livrer), revenir au debut apres
   « Livrer » laisserait croire a un cycle. */
fabriqueRouleau({
  enveloppe: '[data-trajet]',
  bande: '.trajet',
  prec: '[data-trajet-prec]',
  suiv: '[data-trajet-suiv]',
  rang: '[data-trajet-rang]',
  libellePoint: function (n, t) { return 'Aller a l\u2019\u00e9tape ' + n + ' sur ' + t; },
  total: '[data-trajet-total]',
  pas: 1,
  /* La boucle se decide dans le balisage, page par page.
     A l'accueil, « developper / produire / livrer » est une sequence :
     revenir au debut apres « livrer » laisserait croire a un cycle.
     Sur Technologie, la methode en cinq etapes se parcourt en rond. */
  boucle: !!document.querySelector('[data-trajet][data-trajet-boucle]')
});

/* Les secteurs : quatre tuiles par page (deux colonnes sur deux rangees), et
   la bande se referme — ce sont huit entrees equivalentes, aucune n'est un
   debut ni une fin. */
fabriqueRouleau({
  enveloppe: '[data-secteurs]',
  bande: '[data-grille-secteurs]',
  prec: '[data-secteurs-prec]',
  suiv: '[data-secteurs-suiv]',
  rang: '[data-secteurs-rang]',
  libellePoint: function (n, t) { return 'Aller au groupe de secteurs ' + n + ' sur ' + t; },
  total: '[data-secteurs-total]',
  pas: 4,
  boucle: true
});

/* Les partenaires d'A propos : un par page, et la bande se referme — quatre
   partenaires equivalents, aucun n'est un debut ni une fin. Le majeur (Eltia
   Groupe / TAES) est le premier <li> de la meme liste, ce qui permet a un
   seul rouleau de les porter tous les quatre ; sur grand ecran il reprend
   toute la rangee et rien ne change. */
fabriqueRouleau({
  enveloppe: '[data-partenaires]',
  bande: '[data-grille-partenaires]',
  prec: '[data-partenaires-prec]',
  suiv: '[data-partenaires-suiv]',
  rang: '[data-partenaires-rang]',
  libellePoint: function (n, t) { return 'Aller au partenaire ' + n + ' sur ' + t; },
  total: '[data-partenaires-total]',
  pas: 1,
  boucle: true
});


/* ───────────────────────────────────────────────────────────────────────────
 * « Le constat » : la ligne sous le regard s'allume
 *
 * Sur grand ecran, survoler une ligne l'eclaire. Un telephone n'a pas de
 * survol : la ligne la plus proche du centre de l'ecran prend le relais, ce
 * qui donne le meme guidage en lisant au pouce.
 *
 * On ne marque rien tant que le tableau n'est pas a l'ecran, et on retire la
 * marque quand il en sort : une ligne allumee dans un tableau hors champ
 * serait allumee au hasard.
 */
(function () {
  /* `.bascule` a l'accueil, `.comparatif` sur la page Technologie : deux
     composants differents, meme besoin — la ligne sous le regard s'allume. */
  var tableau = document.querySelector('.bascule, .comparatif');
  if (!tableau) return;
  var lignes = Array.prototype.slice.call(tableau.querySelectorAll('tbody tr'));
  if (lignes.length < 2) return;

  var etroit = window.matchMedia('(max-width: 760px)');
  var courante = null;

  function eteindre() {
    if (courante) { courante.removeAttribute('data-actif'); courante = null; }
  }

  function placer() {
    if (!etroit.matches) { eteindre(); return; }
    /* La visibilite se lit sur le tableau lui-meme. Un IntersectionObserver
       ferait la meme chose en differe, par le pipeline de rendu — une piece
       mobile de plus pour un rectangle qu'on mesure deja quatre fois juste
       en dessous. */
    var cadre = tableau.getBoundingClientRect();
    if (cadre.bottom < 0 || cadre.top > window.innerHeight) { eteindre(); return; }
    var centre = window.innerHeight / 2;
    var meilleure = null;
    var ecartMin = Infinity;
    for (var i = 0; i < lignes.length; i++) {
      var r = lignes[i].getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var ecart = Math.abs(r.top + r.height / 2 - centre);
      if (ecart < ecartMin) { ecartMin = ecart; meilleure = lignes[i]; }
    }
    if (meilleure === courante) return;
    eteindre();
    if (meilleure) { meilleure.setAttribute('data-actif', ''); courante = meilleure; }
  }

  window.addEventListener('scroll', placer, { passive: true });
  window.addEventListener('resize', placer, { passive: true });
  if (etroit.addEventListener) etroit.addEventListener('change', placer);
  placer();
})();

/* ───────────────────────────────────────────────────────────────────────────
 * « Nos valeurs ajoutees » : la hauteur reelle du bloc epingle
 *
 * La feuille centre le bloc avec `top: (100svh - h-entete - --h-ecran) / 2`.
 * Une valeur en dur serait fausse des que le texte change de longueur ou que
 * la police se charge : on la mesure, au chargement et a chaque changement de
 * taille.
 *
 * La mesure se prend sur la hauteur du contenu, pas sur `getBoundingClientRect`
 * du bloc colle — une fois `position:sticky` en place, celui-ci renvoie la
 * hauteur de la boite collee, et l'on tournerait en rond.
 */
(function () {
  var section = document.querySelector('.split-piliers');
  if (!section) return;
  var ecran = section.querySelector('.ecran');
  if (!ecran) return;

  function mesurer() {
    var h = 0;
    for (var i = 0; i < ecran.children.length; i++) {
      var e = ecran.children[i];
      var r = e.getBoundingClientRect();
      if (r.height > 0) h += r.height;
    }
    var st = window.getComputedStyle(ecran);
    /* Seuls les enfants qui occupent de la place creent une gouttiere :
       le <script> en fin de bloc en est un pour la grille, pas a l'oeil. */
    var visibles = 0;
    for (var j = 0; j < ecran.children.length; j++) {
      if (ecran.children[j].getBoundingClientRect().height > 0) visibles++;
    }
    h += parseFloat(st.rowGap || 0) * Math.max(0, visibles - 1);
    h += parseFloat(st.paddingTop || 0) + parseFloat(st.paddingBottom || 0);
    /* La valeur se pose sur le BLOC, pas sur la section.
       La regle d'origine declare `--h-ecran: calc(510px + 2 * var(--rythme-demi))`
       sur `.ecran` lui-meme — soit 662 px, la hauteur de bureau. Une valeur
       heritee depuis la section serait ecrasee par cette declaration locale ;
       un style en ligne sur l'element, lui, l'emporte. */
    if (h > 0) ecran.style.setProperty('--h-ecran', Math.round(h) + 'px');
  }

  /* Place REELLEMENT libre, et decision d'epingler.
   *
   * Erreur corrigee le 22/09 : la place n'est pas « fenetre moins en-tete ».
   * La barre d'action « Contactez-nous » est fixee en bas et prend 70 px de
   * plus. Sans la retrancher, le bloc tenait sur le papier mais sa moitie
   * basse — les cartes — passait sous la barre.
   *
   * La decision se prend ici et pas dans une requete de media : celle-ci ne
   * peut pas connaitre la hauteur du bloc, qui grandit quand l'ecran retrecit
   * parce que le texte se replie.
   *
   * Le seuil de 60 px a une raison precise : sur telephone, les barres du
   * navigateur se replient au defilement et `innerHeight` bouge de quelques
   * dizaines de pixels. Recalculer a chaque fois ferait DERIVER le bloc en
   * pleine lecture — exactement ce qu'on cherche a supprimer. Seul un vrai
   * changement (rotation, redimensionnement) passe le seuil. */
  var derniereVue = 0;

  function hauteurBarre() {
    var b = document.querySelector('.barre-mobile');
    if (!b) return 0;
    var s = window.getComputedStyle(b);
    if (s.display === 'none' || s.visibility === 'hidden' || s.position !== 'fixed') return 0;
    return b.getBoundingClientRect().height;
  }

  function arbitrer(force) {
    var vue = window.innerHeight;
    if (!force && Math.abs(vue - derniereVue) < 60) return;
    derniereVue = vue;

    var entete = parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue('--h-entete')
    ) || 0;
    var libre = vue - entete - hauteurBarre();
    ecran.style.setProperty('--h-libre', Math.round(libre) + 'px');

    var h = parseFloat(ecran.style.getPropertyValue('--h-ecran')) || 0;
    if (h > 0 && h <= libre) section.setAttribute('data-epingle', '');
    else section.removeAttribute('data-epingle');
  }

  mesurer();
  arbitrer(true);
  window.addEventListener('resize', function () { mesurer(); arbitrer(false); }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { mesurer(); arbitrer(true); });
  }
})();

/* ───────────────────────────────────────────────────────────────────────────
 * Le detail des cartes se replie sur telephone
 *
 * Deux sections ont le meme besoin : les tuiles de « Comment fonctionne le
 * flux continu » (Technologie, L'unite sur votre site) et les cartes de
 * molecules de « Notre Solution ». Mises deux par ligne, elles restent hautes
 * parce que chacune porte un paragraphe sous son titre. Le corps passe donc
 * derriere un « En savoir plus » ; le titre reste toujours visible, c'est lui
 * qui fait l'inventaire de la section.
 *
 * On utilise un <details> natif plutot qu'un pliage maison : l'ouverture, le
 * clavier et les lecteurs d'ecran fonctionnent sans qu'on ait a s'en occuper,
 * et la recherche dans la page y trouve le texte replie.
 *
 * Le pliage ne vaut que sur telephone : au-dela, on defait, car les cartes ont
 * alors la place d'afficher leur contenu.
 */
function fabriquePliage(opts) {
  var conteneur = document.querySelector(opts.conteneur);
  if (!conteneur) return;

  var etroit = window.matchMedia('(max-width: 860px)');
  var plie = false;

  function plier() {
    var cartes = conteneur.querySelectorAll(opts.cartes);
    for (var i = 0; i < cartes.length; i++) {
      var carte = cartes[i];
      if (opts.epargner && opts.epargner(carte)) continue;
      if (carte.querySelector('.tuile-details')) continue;

      var titre = carte.querySelector(opts.titre);
      if (!titre) continue;

      var aPlier = [];
      var n = titre.nextElementSibling;
      while (n) {
        if (!opts.laisserDehors || !n.matches(opts.laisserDehors)) aPlier.push(n);
        n = n.nextElementSibling;
      }
      if (!aPlier.length) continue;

      var det = document.createElement('details');
      det.className = 'tuile-details';
      var sum = document.createElement('summary');
      sum.textContent = 'En savoir plus';
      det.appendChild(sum);
      /* Devant le PREMIER element replie, et non juste apres le titre :
         sinon le repli s'intercale avant ce qu'on a choisi de laisser dehors
         (la ligne d'exemples des cartes de molecules). */
      aPlier[0].parentNode.insertBefore(det, aPlier[0]);
      for (var k = 0; k < aPlier.length; k++) det.appendChild(aPlier[k]);
    }
    plie = true;
  }

  function deplier() {
    var dets = conteneur.querySelectorAll('.tuile-details');
    for (var i = 0; i < dets.length; i++) {
      var det = dets[i];
      var parent = det.parentNode;
      while (det.lastElementChild && det.lastElementChild.tagName !== 'SUMMARY') {
        parent.insertBefore(det.lastElementChild, det.nextSibling);
      }
      parent.removeChild(det);
    }
    plie = false;
  }

  function arbitrer() {
    if (etroit.matches && !plie) plier();
    else if (!etroit.matches && plie) deplier();
  }

  arbitrer();
  if (etroit.addEventListener) etroit.addEventListener('change', arbitrer);
  else window.addEventListener('resize', arbitrer, { passive: true });
}

/* Les tuiles du fonctionnement. Les deux qui s'etalent sur toute la largeur —
   le schema et la derniere — gardent leur contenu a l'air libre : elles ont la
   place, et un repli n'y gagnerait rien. La condition est ecrite comme dans la
   feuille de style, pour que les deux ne puissent pas diverger.
   Le lien de conclusion reste dehors : un appel a l'action cache derriere un
   repli ne sert a rien. */
fabriquePliage({
  conteneur: '.bento',
  cartes: '.tuile',
  titre: 'h3, h4, .libelle',
  laisserDehors: '.conclusion',
  epargner: function (t) {
    return t.classList.contains('tuile-schema')
        || t === t.parentNode.lastElementChild;
  }
});

/* Les cartes de molecules. La ligne d'exemples reste visible — elle tient sur
   une ligne et c'est elle qui dit de quoi parle la carte ; seul le paragraphe
   d'explication se replie. La derniere carte, seule sur sa rangee et donc
   etalee, garde tout a l'air libre. */
fabriquePliage({
  conteneur: '.grille-molecules',
  cartes: '.molecule',
  titre: 'h3',
  laisserDehors: '.molecule-exemples',
  epargner: function (c) {
    return c === c.parentNode.lastElementChild
        && c.parentNode.childElementCount % 2 === 1;
  }
});


/* ───────────────────────────────────────────────────────────────────────────
 * Le survol des cartes, porte au defilement
 *
 * Sur grand ecran, passer la souris sur une carte la souleve, allume son
 * filet et avance sa pastille. Un telephone n'a pas de survol : la carte la
 * plus proche du CENTRE de l'ecran prend le relais et passe la main a la
 * suivante en defilant. C'est le meme principe que la ligne active du tableau
 * « Le constat », etendu aux cartes de tout le site.
 *
 * Rien n'est reecrit : les regles de survol d'origine accueillent
 * [data-survol] a cote de :hover, dans leur propre feuille. Les deux etats
 * partagent donc les MEMES declarations — y compris leur neutralisation en
 * mouvement reduit — et ne peuvent pas diverger.
 */
(function () {
  /* Les cartes du site. `.survol-carte` couvre les molecules, les blocs de
     perimetre et les cartes du blog ; s'y ajoutent les tuiles du bento et les
     jalons de la frise d'A propos. Les cartes de piliers en sont exclues a
     dessein : elles sont deja pilotees par le defilement, et deux commandes
     sur un meme element se contrediraient. */
  var SELECTEURS = '.survol-carte, .bento .tuile, .jalon';

  var etroit = window.matchMedia('(max-width: 900px)');
  var doux = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!document.querySelector(SELECTEURS)) return;

  var cartes = [];
  var marquees = [];

  function recenser() {
    cartes = Array.prototype.slice.call(document.querySelectorAll(SELECTEURS));
  }

  function eteindre() {
    for (var i = 0; i < marquees.length; i++) marquees[i].removeAttribute('data-survol');
    marquees = [];
  }

  function placer() {
    if (!etroit.matches || doux.matches) { eteindre(); return; }

    var vue = window.innerHeight;
    var centre = vue / 2;
    var visibles = [];
    var milieu = null;
    var ecartMin = Infinity;

    for (var i = 0; i < cartes.length; i++) {
      var r = cartes[i].getBoundingClientRect();
      /* Une carte repliee ou dans un dialogue ferme mesure zero : elle n'est
         pas a l'ecran, elle n'a rien a allumer. */
      if (r.height < 24 || r.bottom < 0 || r.top > vue) continue;
      var c = r.top + r.height / 2;
      visibles.push([cartes[i], c]);
      var ecart = Math.abs(c - centre);
      if (ecart < ecartMin) { ecartMin = ecart; milieu = c; }
    }

    /* Au-dela d'un tiers d'ecran du centre, on n'allume rien : une carte
       marquee loin du regard s'allumerait au hasard. */
    if (milieu === null || ecartMin > vue * 0.34) { eteindre(); return; }

    /* Les cartes d'une meme rangee s'allument ensemble : elles sont deux par
       ligne sur telephone, et n'en marquer qu'une ferait clignoter une moitie
       de grille sur deux. */
    var choix = [];
    for (var j = 0; j < visibles.length; j++) {
      if (Math.abs(visibles[j][1] - milieu) <= 16) choix.push(visibles[j][0]);
    }

    if (choix.length === marquees.length) {
      var identique = true;
      for (var k = 0; k < choix.length; k++) {
        if (choix[k] !== marquees[k]) { identique = false; break; }
      }
      if (identique) return;
    }

    eteindre();
    for (var m = 0; m < choix.length; m++) choix[m].setAttribute('data-survol', '');
    marquees = choix;
  }

  function reprendre() { recenser(); placer(); }

  recenser();
  window.addEventListener('scroll', placer, { passive: true });
  window.addEventListener('resize', reprendre, { passive: true });
  /* Le pliage « En savoir plus » se pose et se defait au passage des 860 px :
     la liste des cartes est refaite de ce cote-la aussi. */
  if (etroit.addEventListener) etroit.addEventListener('change', reprendre);
  placer();
})();


/* ───────────────────────────────────────────────────────────────────────────
 * Les photos des cartes de methode
 *
 * Porte ici le 17/11/2026, depuis des attributs `onload` et `onerror` ecrits
 * dans le balisage des quatre pages. Ces attributs sont du script en ligne :
 * ils obligeraient la CSP a autoriser `unsafe-hashes`, c'est-a-dire a rouvrir
 * une partie de ce qu'elle sert a fermer. Le comportement est inchange, il est
 * seulement attache depuis un fichier.
 *
 * Ce que fait ce comportement : la classe `avec-photo` ne se pose que si la
 * photo arrive vraiment, et l'image se retire si elle manque — la carte garde
 * alors sa mise en page, sans cadre vide ni icone d'image cassee.
 *
 * Le cas de l'image DEJA chargee est traite a part, et ce n'est pas un detail :
 * `mobile.js` est charge en `defer`, donc il tourne apres l'analyse du
 * document. Une image en cache est alors deja `complete`, son evenement `load`
 * est passe, et l'attendre ne donnerait jamais rien : la photo resterait sans
 * sa classe a chaque visite apres la premiere. `naturalWidth` departage une
 * image arrivee d'une image en echec, les deux etant `complete`.
 */
(function () {
  var photos = document.querySelectorAll('img[data-photo-methode]');
  for (var i = 0; i < photos.length; i++) {
    (function (img) {
      function poser() {
        var cadre = img.closest('.trajet-image');
        if (cadre) cadre.classList.add('avec-photo');
      }
      function retirer() {
        if (img.parentNode) img.parentNode.removeChild(img);
      }
      if (img.complete) {
        if (img.naturalWidth > 0) poser(); else retirer();
        return;
      }
      img.addEventListener('load', poser, { once: true });
      img.addEventListener('error', retirer, { once: true });
    })(photos[i]);
  }
})();
