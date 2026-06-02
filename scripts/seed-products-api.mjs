const gatewayUrl = process.env.OKAZ_GATEWAY_URL ?? 'http://localhost:4000';
const email = process.env.OKAZ_EMAIL ?? 'admin@example.com';
const password = process.env.OKAZ_PASSWORD ?? 'Admin1234!';

const products = [
  { name: 'iPhone 13', description: 'Smartphone Apple en bon etat avec 128 Go de stockage.', price: 450, category: 'Telephones' },
  { name: 'Samsung Galaxy S22', description: 'Smartphone Android performant avec bel ecran AMOLED.', price: 390, category: 'Telephones' },
  { name: 'Google Pixel 7', description: 'Telephone avec tres bon appareil photo et Android pur.', price: 360, category: 'Telephones' },
  { name: 'Xiaomi Redmi Note 12', description: 'Telephone accessible avec bonne autonomie.', price: 180, category: 'Telephones' },
  { name: 'OnePlus Nord 2', description: 'Smartphone fluide pour usage quotidien et multimedia.', price: 260, category: 'Telephones' },
  { name: 'iPhone SE 2022', description: 'Format compact, puce rapide et etat soigne.', price: 290, category: 'Telephones' },
  { name: 'Samsung Galaxy A54', description: 'Smartphone milieu de gamme en tres bon etat.', price: 240, category: 'Telephones' },
  { name: 'Huawei P30 Pro', description: 'Telephone avec zoom photo et grande autonomie.', price: 210, category: 'Telephones' },
  { name: 'Motorola Edge 30', description: 'Telephone leger avec ecran fluide.', price: 230, category: 'Telephones' },
  { name: 'Nothing Phone 1', description: 'Smartphone original avec interface lumineuse.', price: 280, category: 'Telephones' },

  { name: 'MacBook Air M1', description: 'Ordinateur portable Apple silencieux et rapide.', price: 720, category: 'Informatique' },
  { name: 'Dell XPS 13', description: 'Ultrabook compact pour travail et etudes.', price: 680, category: 'Informatique' },
  { name: 'Lenovo ThinkPad T480', description: 'PC professionnel robuste avec clavier confortable.', price: 360, category: 'Informatique' },
  { name: 'HP Spectre x360', description: 'PC convertible tactile pour productivite.', price: 590, category: 'Informatique' },
  { name: 'Asus VivoBook 15', description: 'Ordinateur portable polyvalent pour usage familial.', price: 330, category: 'Informatique' },
  { name: 'Acer Aspire 5', description: 'PC portable simple avec bon rapport qualite prix.', price: 310, category: 'Informatique' },
  { name: 'iPad Air 4', description: 'Tablette Apple ideale pour notes, dessin et multimedia.', price: 410, category: 'Informatique' },
  { name: 'Samsung Galaxy Tab S7', description: 'Tablette Android avec stylet inclus.', price: 350, category: 'Informatique' },
  { name: 'Ecran Dell 27 pouces', description: 'Moniteur QHD pour bureau et teletravail.', price: 190, category: 'Informatique' },
  { name: 'Clavier Logitech MX Keys', description: 'Clavier sans fil confortable et discret.', price: 75, category: 'Informatique' },

  { name: 'Casque Sony WH-1000XM4', description: 'Casque Bluetooth avec reduction de bruit.', price: 190, category: 'Audio' },
  { name: 'AirPods Pro', description: 'Ecouteurs sans fil Apple avec boitier de charge.', price: 150, category: 'Audio' },
  { name: 'JBL Flip 6', description: 'Enceinte portable etanche pour sorties.', price: 80, category: 'Audio' },
  { name: 'Bose SoundLink Mini', description: 'Petite enceinte avec son puissant.', price: 95, category: 'Audio' },
  { name: 'Micro Blue Yeti', description: 'Micro USB pour streaming, podcast et visio.', price: 85, category: 'Audio' },
  { name: 'Casque HyperX Cloud II', description: 'Casque gaming confortable avec micro.', price: 65, category: 'Audio' },
  { name: 'Marshall Major IV', description: 'Casque Bluetooth au design vintage.', price: 90, category: 'Audio' },
  { name: 'Barre de son Samsung', description: 'Barre de son compacte pour TV.', price: 120, category: 'Audio' },
  { name: 'Platine vinyle Audio Technica', description: 'Platine vinyle simple pour collection musicale.', price: 130, category: 'Audio' },
  { name: 'Interface Focusrite Scarlett Solo', description: 'Interface audio USB pour guitare et micro.', price: 95, category: 'Audio' },

  { name: 'PlayStation 5', description: 'Console Sony avec manette DualSense.', price: 420, category: 'Gaming' },
  { name: 'Xbox Series X', description: 'Console Microsoft puissante en bon etat.', price: 390, category: 'Gaming' },
  { name: 'Nintendo Switch OLED', description: 'Console hybride avec ecran OLED.', price: 260, category: 'Gaming' },
  { name: 'Manette DualSense', description: 'Manette PS5 blanche fonctionnelle.', price: 45, category: 'Gaming' },
  { name: 'Manette Xbox Wireless', description: 'Manette sans fil compatible PC et Xbox.', price: 40, category: 'Gaming' },
  { name: 'Steam Deck 256 Go', description: 'Console portable PC pour jeux Steam.', price: 380, category: 'Gaming' },
  { name: 'Volant Logitech G29', description: 'Volant avec pedalier pour simulation auto.', price: 180, category: 'Gaming' },
  { name: 'Souris Logitech G Pro', description: 'Souris gaming legere et precise.', price: 70, category: 'Gaming' },
  { name: 'Clavier Razer BlackWidow', description: 'Clavier mecanique RGB pour gaming.', price: 85, category: 'Gaming' },
  { name: 'Chaise gaming Secretlab', description: 'Chaise confortable avec reglages multiples.', price: 240, category: 'Gaming' },

  { name: 'Velo route Decathlon', description: 'Velo de route leger pour sorties sportives.', price: 420, category: 'Sport' },
  { name: 'VTT Rockrider', description: 'Velo tout terrain en bon etat.', price: 300, category: 'Sport' },
  { name: 'Tapis de course', description: 'Tapis pliable pour entrainement a domicile.', price: 280, category: 'Sport' },
  { name: 'Halteres reglables', description: 'Paire d halteres pour musculation.', price: 90, category: 'Sport' },
  { name: 'Raquette Babolat', description: 'Raquette de tennis avec housse.', price: 75, category: 'Sport' },
  { name: 'Sac de golf', description: 'Sac de golf avec plusieurs compartiments.', price: 110, category: 'Sport' },
  { name: 'Planche de surf', description: 'Planche stable pour debutant et intermediaire.', price: 220, category: 'Sport' },
  { name: 'Skateboard Globe', description: 'Skate complet avec roues en bon etat.', price: 65, category: 'Sport' },
  { name: 'Montre Garmin Forerunner', description: 'Montre sport GPS pour course et velo.', price: 160, category: 'Sport' },
  { name: 'Trottinette electrique', description: 'Trottinette urbaine avec chargeur.', price: 250, category: 'Sport' },

  { name: 'Canape 3 places', description: 'Canape confortable en tissu gris.', price: 300, category: 'Maison' },
  { name: 'Table basse bois', description: 'Table basse moderne avec rangement.', price: 80, category: 'Maison' },
  { name: 'Bureau Ikea', description: 'Bureau simple pour teletravail.', price: 70, category: 'Maison' },
  { name: 'Chaise de bureau ergonomique', description: 'Chaise reglable avec soutien lombaire.', price: 130, category: 'Maison' },
  { name: 'Lampe sur pied', description: 'Lampe design pour salon ou chambre.', price: 45, category: 'Maison' },
  { name: 'Aspirateur Dyson V8', description: 'Aspirateur sans fil avec accessoires.', price: 180, category: 'Maison' },
  { name: 'Machine a cafe Delonghi', description: 'Machine espresso avec broyeur integre.', price: 230, category: 'Maison' },
  { name: 'Micro-ondes Samsung', description: 'Micro-ondes compact et propre.', price: 60, category: 'Maison' },
  { name: 'Robot cuisine Moulinex', description: 'Robot multifonction pour preparation repas.', price: 120, category: 'Maison' },
  { name: 'Bibliotheque blanche', description: 'Meuble de rangement pour livres et decoration.', price: 85, category: 'Maison' },

  { name: 'Veste The North Face', description: 'Veste chaude pour hiver et randonnee.', price: 95, category: 'Mode' },
  { name: 'Sneakers Nike Air Max', description: 'Paire de baskets en bon etat.', price: 80, category: 'Mode' },
  { name: 'Sac a dos Eastpak', description: 'Sac pratique pour cours ou ville.', price: 35, category: 'Mode' },
  { name: 'Montre Seiko 5', description: 'Montre automatique classique.', price: 140, category: 'Mode' },
  { name: 'Lunettes Ray-Ban', description: 'Lunettes de soleil avec etui.', price: 75, category: 'Mode' },
  { name: 'Manteau Zara', description: 'Manteau long en tres bon etat.', price: 60, category: 'Mode' },
  { name: 'Sac cuir vintage', description: 'Sac en cuir marron avec bandouliere.', price: 55, category: 'Mode' },
  { name: 'Jean Levi s 501', description: 'Jean coupe droite peu porte.', price: 45, category: 'Mode' },
  { name: 'Pull cachemire', description: 'Pull doux et chaud pour hiver.', price: 65, category: 'Mode' },
  { name: 'Costume homme', description: 'Costume deux pieces pour evenement.', price: 120, category: 'Mode' },

  { name: 'Livre Clean Code', description: 'Livre de programmation pour bonnes pratiques.', price: 25, category: 'Livres' },
  { name: 'Harry Potter Integrale', description: 'Collection complete en bon etat.', price: 55, category: 'Livres' },
  { name: 'Dune Tome 1', description: 'Roman de science-fiction en edition poche.', price: 8, category: 'Livres' },
  { name: 'Le Petit Prince', description: 'Classique de Saint-Exupery.', price: 6, category: 'Livres' },
  { name: 'Manga One Piece Lot', description: 'Lot de mangas One Piece.', price: 45, category: 'Livres' },
  { name: 'Guide Lonely Planet Japon', description: 'Guide voyage avec cartes et conseils.', price: 15, category: 'Livres' },
  { name: 'Bescherelle Grammaire', description: 'Reference pratique pour le francais.', price: 10, category: 'Livres' },
  { name: 'Livre Cuisine Italienne', description: 'Recettes simples et familiales.', price: 12, category: 'Livres' },
  { name: 'Atlas du Monde', description: 'Grand atlas illustre.', price: 20, category: 'Livres' },
  { name: 'BD Asterix Lot', description: 'Lot de bandes dessinees Asterix.', price: 35, category: 'Livres' },

  { name: 'Appareil photo Canon EOS 80D', description: 'Reflex Canon avec objectif standard.', price: 520, category: 'Photo' },
  { name: 'Objectif Canon 50mm', description: 'Objectif lumineux pour portrait.', price: 95, category: 'Photo' },
  { name: 'GoPro Hero 9', description: 'Camera sport avec accessoires.', price: 210, category: 'Photo' },
  { name: 'Drone DJI Mini 2', description: 'Drone compact avec radiocommande.', price: 310, category: 'Photo' },
  { name: 'Trepied Manfrotto', description: 'Trepied stable pour photo et video.', price: 60, category: 'Photo' },
  { name: 'Sac photo Lowepro', description: 'Sac protege pour boitier et objectifs.', price: 45, category: 'Photo' },
  { name: 'Flash Nikon SB-700', description: 'Flash cobra pour photographie.', price: 110, category: 'Photo' },
  { name: 'Fujifilm Instax Mini', description: 'Appareil instantane avec style retro.', price: 70, category: 'Photo' },
  { name: 'Stabilisateur DJI Osmo', description: 'Stabilisateur smartphone pour video.', price: 85, category: 'Photo' },
  { name: 'Carte SD 128 Go', description: 'Carte memoire rapide pour appareil photo.', price: 18, category: 'Photo' },

  { name: 'Peugeot 208 miniature', description: 'Modele reduit de collection.', price: 20, category: 'Auto' },
  { name: 'Siege auto enfant', description: 'Siege auto securise pour enfant.', price: 75, category: 'Auto' },
  { name: 'Coffre de toit', description: 'Coffre de toit spacieux avec fixation.', price: 160, category: 'Auto' },
  { name: 'Porte velo voiture', description: 'Porte velo pour coffre de voiture.', price: 95, category: 'Auto' },
  { name: 'Chargeur batterie voiture', description: 'Chargeur intelligent pour batterie auto.', price: 35, category: 'Auto' },
  { name: 'Dashcam Xiaomi', description: 'Camera embarquee pour voiture.', price: 50, category: 'Auto' },
  { name: 'Jantes alu 17 pouces', description: 'Lot de jantes aluminium en bon etat.', price: 260, category: 'Auto' },
  { name: 'Barres de toit', description: 'Barres de toit universelles.', price: 70, category: 'Auto' },
  { name: 'GPS TomTom', description: 'GPS voiture avec support.', price: 45, category: 'Auto' },
  { name: 'Compresseur portable', description: 'Mini compresseur pour pneus.', price: 30, category: 'Auto' },
];

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${gatewayUrl}${path}`, {
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message ?? body?.error ?? response.statusText;
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${message}`);
  }

  return body;
};

const login = async () => {
  const body = await requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const token = body.accessToken ?? body.token;

  if (!token) {
    throw new Error('Login succeeded, but no access token was returned.');
  }

  return token;
};

const getExistingProductKeys = async () => {
  const body = await requestJson('/products');
  const existingProducts = Array.isArray(body.data) ? body.data : [];

  return new Set(
    existingProducts.map((product) => `${product.name ?? ''}::${product.category ?? ''}`),
  );
};

const main = async () => {
  console.log(`Seeding products through ${gatewayUrl}`);
  console.log(`Authenticating as ${email}`);

  const token = await login();
  const existingProductKeys = await getExistingProductKeys();

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const key = `${product.name}::${product.category}`;

    if (existingProductKeys.has(key)) {
      skipped += 1;
      continue;
    }

    await requestJson('/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });

    created += 1;
    existingProductKeys.add(key);
    console.log(`Created ${created.toString().padStart(3, ' ')}/${products.length}: ${product.name}`);
  }

  console.log(`Done. Created: ${created}. Skipped existing: ${skipped}.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
