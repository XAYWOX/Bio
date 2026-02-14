import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Droplets, Hexagon, Wind, Beaker, Zap, Activity, Shield, Info, RefreshCw, Layers, Database, X, Lock, Sparkles, Sprout, HardHat, Cloud, Skull, Sun, LogOut, User } from 'lucide-react';

// Configuration et variables globales injectées par l'environnement Canvas
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'alchemix-default-app-id';

let db, auth;

// Modules Firestore et Auth
let initializeApp, getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, getFirestore, doc, setDoc, onSnapshot, collection;

// Utiliser une fonction pour importer dynamiquement les modules si nous sommes dans un environnement de navigateur/Node compatible
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  import('firebase/app').then(module => { initializeApp = module.initializeApp; });
  import('firebase/auth').then(module => { getAuth = module.getAuth; signInWithCustomToken = module.signInWithCustomToken; signInAnonymously = module.signInAnonymously; onAuthStateChanged = module.onAuthStateChanged; });
  import('firebase/firestore').then(module => { getFirestore = module.getFirestore; doc = module.doc; setDoc = module.setDoc; onSnapshot = module.onSnapshot; collection = module.collection; });
}

// --- DONNÉES ET CONFIGURATION ---

// Couleurs Tailwind sécurisées pour éviter la purge dynamique
const TAILWIND_COLORS = {
    red: 'bg-red-500', gray: 'bg-gray-400', green: 'bg-green-500', blue: 'bg-blue-500',
    slate: 'bg-slate-400', pink: 'bg-pink-400', yellow: 'bg-yellow-400', cyan: 'bg-cyan-400',
    purple: 'bg-purple-500', lime: 'bg-lime-500', orange: 'bg-orange-500'
};

// Types d'éléments Primaires
const ELEMENTS_PRIMARY = {
  FEU: { id: 'feu', name: 'Pyrium', color: 'from-red-500 to-orange-600', hex: '#ef4444', icon: <Flame className="w-6 h-6" />, twColor: 'red' },
  EAU: { id: 'eau', name: 'Hydra', color: 'from-blue-500 to-cyan-400', hex: '#3b82f6', icon: <Droplets className="w-6 h-6" />, twColor: 'blue' },
  CARBONE: { id: 'carbone', name: 'Solidus', color: 'from-gray-700 to-black', hex: '#1f2937', icon: <Hexagon className="w-6 h-6" />, twColor: 'gray' },
  AZOTE: { id: 'azote', name: 'Aero', color: 'from-green-400 to-emerald-600', hex: '#10b981', icon: <Wind className="w-6 h-6" />, twColor: 'green' },
};

// Types d'éléments Secondaires (Déverrouillables)
const ELEMENTS_SECONDARY = {
    METAL: { id: 'metal', name: 'Ferrium', color: 'from-slate-500 to-slate-400', hex: '#94a3b8', icon: <HardHat className="w-6 h-6" />, unlockRecipe: 'Charbonix', stats: { def: 40, atk: 10, vit: -10 }, twColor: 'slate' },
    VIE: { id: 'vie', name: 'Vita', color: 'from-pink-500 to-rose-400', hex: '#ec4899', icon: <Sprout className="w-6 h-6" />, unlockRecipe: 'Slime Abyssal', stats: { int: 40, def: 10, atk: -10 }, twColor: 'pink' },
    ELECTRICITE: { id: 'elec', name: 'Volt', color: 'from-yellow-400 to-amber-600', hex: '#fcd34d', icon: <Zap className="w-6 h-6" />, unlockRecipe: 'Zephyr-Hawk', stats: { vit: 40, int: 10, def: -10 }, twColor: 'yellow' },
    VAPEUR: { id: 'vapeur', name: 'Vapor', color: 'from-purple-300 to-white', hex: '#d8b4fe', icon: <Cloud className="w-6 h-6" />, unlockRecipe: 'Corail-Garde', stats: { int: 20, vit: 20 }, twColor: 'purple' },
    POISON: { id: 'poison', name: 'Toxine', color: 'from-lime-500 to-green-600', hex: '#84cc16', icon: <Skull className="w-6 h-6" />, unlockRecipe: 'Brume-Spectre', stats: { atk: 30, int: 10 }, twColor: 'lime' },
    LUMIERE: { id: 'lumiere', name: 'Lumina', color: 'from-yellow-200 to-white', hex: '#fcd34d', icon: <Sun className="w-6 h-6" />, unlockRecipe: 'Électro-Phénix', stats: { vit: 20, def: 20 }, twColor: 'orange' },
};

const ALL_ELEMENTS = { ...ELEMENTS_PRIMARY, ...ELEMENTS_SECONDARY };

// Raretés
const RARITY = {
  COMMON: { name: 'Commun', color: 'text-gray-400', border: 'border-gray-400', multiplier: 1.0, minScore: 0 },
  RARE: { name: 'Rare', color: 'text-blue-400', border: 'border-blue-400', multiplier: 1.2, minScore: 40 },
  EPIC: { name: 'Épique', color: 'text-purple-400', border: 'border-purple-400', multiplier: 1.5, minScore: 65 },
  LEGENDARY: { name: 'Légendaire', color: 'text-yellow-400', border: 'border-yellow-400', multiplier: 2.0, minScore: 85 },
};

// Base de données des recettes (LISTE ÉTENDUE)
const RECIPES = {
  // --- RECETTES PRIMAIRES (2 ÉLÉMENTS) ---
  'feu,feu': { name: 'Pyro-Drake', type: 'Offensif', desc: 'Un petit dragon fait de magma pur, crachant des flammes incessantes.', shape: 'dragon' },
  'eau,eau': { name: 'Slime Abyssal', type: 'Soutien', desc: 'Une masse gélatineuse avec un œil central. Peut absorber les dégâts.', shape: 'blob', unlocks: 'VIE' },
  'carbone,carbone': { name: 'Géo-Tatou', type: 'Tank', desc: 'Carapace en diamant brut. Lourd et inébranlable.', shape: 'shield' },
  'azote,azote': { name: 'Zephyr-Hawk', type: 'Vitesse', desc: 'Faucon de gaz compressé. Incroyablement rapide et insaisissable.', shape: 'bird', unlocks: 'ELECTRICITE' },
  'carbone,feu': { name: 'Charbonix', type: 'Bruiser', desc: 'Golem de charbon ardent. Son corps brûle lentement.', shape: 'golem', unlocks: 'METAL' },
  'azote,eau': { name: 'Brume-Spectre', type: 'Esquive', desc: 'Raie manta volante faite de nuages et de brouillard.', shape: 'ghost', unlocks: 'POISON' },
  'azote,feu': { name: 'Rocket-Imp', type: 'Glass Cannon', desc: 'Diablotin avec propulseurs d\'azote, inflige des dégâts massifs rapidement.', shape: 'imp' },
  'carbone,eau': { name: 'Corail-Garde', type: 'Tank/Soin', desc: 'Tortue incrustée de coraux vivants. Régénère lentement ses alliés.', shape: 'turtle', unlocks: 'VAPEUR' },
  
  // --- RECETTES AVEC NOUVEAUX ÉLÉMENTS (2 ÉLÉMENTS) ---
  
  // METAL
  'carbone,metal': { name: 'Iron-Clad Golem', type: 'Tank', desc: 'Une forteresse mobile, presque indestructible, mais très lente.', shape: 'golem' },
  'feu,metal': { name: 'Forge-Léviathan', type: 'Puissance', desc: 'Un serpent de métal fondu chauffé à blanc. Brûle et écrase.', shape: 'dragon' },
  'eau,metal': { name: 'Hydrargyrum', type: 'Contrôle', desc: 'Créature faite de mercure liquide, peut changer de forme à volonté.', shape: 'blob' },
  'azote,metal': { name: 'Aero-Lame', type: 'Vitesse/Lame', desc: 'Un assemblage de lames métalliques propulsées par l\'air.', shape: 'bird' },
  
  // VIE
  'eau,vie': { name: 'Océanos Guérisseur', type: 'Soin/Soutien', desc: 'Apporte la vie à travers l\'eau pure. Soin de zone.', shape: 'blob' },
  'feu,vie': { name: 'Cœur Solaire', type: 'Soutien Offensif', desc: 'Un noyau de chaleur qui donne du courage et de la force.', shape: 'sun' },
  'carbone,vie': { name: 'Terre-Mère', type: 'Tank/Soin', desc: 'Une entité végétale ancrée, capable de soigner les blessures par contact.', shape: 'sprout' },
  'azote,vie': { name: 'Sylphe Éthéré', type: 'Soutien/Vitesse', desc: 'Un être de lumière et de brise, insaisissable. Augmente la vitesse.', shape: 'ghost' },
  
  // ELECTRICITE
  'carbone,elec': { name: 'Conductix', type: 'Contrôle', desc: 'Un cristal qui canalise des éclairs puissants. Paralyse les ennemis.', shape: 'crystal' },
  'feu,elec': { name: 'Électro-Phénix', type: 'Légendaire', desc: 'S\'enflamme avec la puissance de la foudre. Mortel et imprévisible.', shape: 'bird', unlocks: 'LUMIERE' },
  'eau,elec': { name: 'Aiguille de Foudre', type: 'Dégâts de zone', desc: 'Une anguille électrique géante, attaque sous la pluie.', shape: 'dragon' },
  'azote,elec': { name: 'Tempête Céleste', type: 'Contrôle de foule', desc: 'Accumule de l\'énergie statique dans l\'air.', shape: 'cloud' },
  
  // VAPEUR
  'eau,vapeur': { name: 'Cyclone Marée', type: 'Soutien', desc: 'Une tempête miniature capable de soigner et de noyer.', shape: 'cloud' },
  'feu,vapeur': { name: 'Geyzer Ardent', type: 'Contrôle', desc: 'Jet de vapeur brûlante qui repousse les cibles.', shape: 'imp' },
  'carbone,vapeur': { name: 'Locomotive Spectre', type: 'Tank/Puissance', desc: 'Un ancien train propulsé par de la vapeur noire.', shape: 'golem' },
  'azote,vapeur': { name: 'Souffle Léger', type: 'Soutien', desc: 'Un vent purificateur qui dissipe les effets négatifs.', shape: 'wind' },
  
  // POISON
  'carbone,poison': { name: 'Fossoyeur Térran', type: 'Tank', desc: 'Creuse et laisse des sillons de poison mortel. Dégâts sur le temps.', shape: 'shield' },
  'vie,poison': { name: 'Épidémie Ambulante', type: 'Dégât sur le temps', desc: 'Se nourrit du mal qu\'il propage. Trèès lent mais mortel.', shape: 'skull' },
  'eau,poison': { name: 'Hydro-Vipère', type: 'Dégâts', desc: 'Un serpent marin dont les morsures sont remplies de toxines aquatiques.', shape: 'dragon' },
  'feu,poison': { name: 'Cendre Toxique', type: 'Contrôle/Dégâts', desc: 'Une brume rougeoyante qui empoisonne en brûlant.', shape: 'cloud' },
  
  // LUMIERE
  'lumiere,vie': { name: 'Hélios Guide', type: 'Soutien Épique', desc: 'Éclaire l\'équipe et dissipe les ténèbres. Le meilleur soigneur.', shape: 'sun' },
  'feu,lumiere': { name: 'Soleil Intérieur', type: 'Offensif', desc: 'Miniature d\'une étoile, pure destruction. Dégâts massifs de zone.', shape: 'dragon' },
  'eau,lumiere': { name: 'Nymphea Éclatante', type: 'Soutien/Contrôle', desc: 'Crée un bouclier de lumière protecteur.', shape: 'sprout' },
  'carbone,lumiere': { name: 'Ombre Sacrée', type: 'Équilibre', desc: 'Une créature de l\'ombre et de la lumière, très polyvalente.', shape: 'ghost' },
  'azote,lumiere': { name: 'Rayon de Javelot', type: 'Vitesse/Dégâts', desc: 'Tire des faisceaux de lumière ultra-rapides.', shape: 'bird' },

  // --- RECETTES AVEC TRIOS (3 ÉLÉMENTS) ---
  
  'carbone,feu,metal': { name: 'Titan Volcanique', type: 'Boss', desc: 'Géant de lave refroidie, nécessitant une armure pour contenir sa fureur.', shape: 'golem' },
  'eau,eau,vie': { name: 'Léviathan Pur', type: 'Épique', desc: 'Baleine cosmique miniature, une source d\'énergie vitale et aquatique.', shape: 'whale' },
  'azote,elec,lumiere': { name: 'Lune Arctique', type: 'Légendaire', desc: 'Un être de lumière froide, ultra-rapide et dévastateur.', shape: 'crystal' },
  'vie,vie,vie': { name: 'Arbre-Monde', type: 'Ultime Tank', desc: 'Une entité presque immortelle, régénère toute l\'équipe.', shape: 'sprout' },
  'feu,eau,carbone': { name: 'Dragon Primordial', type: 'Légendaire', desc: 'La combinaison des éléments fondateurs. Équilibre et puissance.', shape: 'dragon' },
};

// --- CŒUR DU JEU ---
// Reste du code de l'application (inchangé par rapport à la dernière version fournie)

// --- COMPOSANTS UTILITAIRES ---

const StatBar = ({ label, value, max = 100, colorClass }) => {
    // Utiliser la couleur de Tailwind pré-définie
    const barColorClass = TAILWIND_COLORS[colorClass] || 'bg-slate-500';

    return (
        <div className="mb-2">
            <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>{label}</span>
                <span>{Math.round(value)}</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${barColorClass} transition-all duration-1000 ease-out`} 
                    style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                />
            </div>
        </div>
    );
};

// --- CŒUR DU JEU ---

export default function App() {
  const [inventory, setInventory] = useState([]); // Liste des créatures créées
  const [selectedElements, setSelectedElements] = useState([]);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, DOSAGE, RESULT, COLLECTION
  const [createdCreature, setCreatedCreature] = useState(null);
  const [flash, setFlash] = useState(false);
  
  // State pour la persistance
  const [unlockedElements, setUnlockedElements] = useState(['FEU', 'EAU', 'CARBONE', 'AZOTE']);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseInstance, setFirebaseInstance] = useState({ db: null, auth: null });

  // NOUVEAUX STATES SIMPLIFIÉS POUR LE DOSAGE (Stop-in-Zone)
  const [indicatorPosition, setIndicatorPosition] = useState(0); // 0 à 100
  const [isSynthesizing, setIsSynthesizing] = useState(false); // Contrôle l'animation
  const animationSpeed = useRef(0.8); // Vitesse du mouvement (contrôle la difficulté)

  // Animation frame ref pour le dosage
  const requestRef = useRef();
  
  // Référence pour le nettoyage de Firestore
  const unsubscribeRef = useRef(null);

  // --- PERSISTENCE FIREBASE ---

  // 1. Initialisation et Authentification
  useEffect(() => {
    if (!firebaseConfig) return;

    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        setFirebaseInstance({ db, auth });

        onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            // Tentative d'authentification avec le token fourni ou anonymement
            if (initialAuthToken) {
              await signInWithCustomToken(auth, initialAuthToken);
            } else {
              await signInAnonymously(auth);
            }
          }
          setIsAuthReady(true);
        });
      } catch (error) {
        console.error("Firebase initialization failed:", error);
      }
    };
    
    initializeFirebase();
  }, []);

  // 2. Écoute des données (Inventaire + Éléments débloqués)
  useEffect(() => {
    if (!isAuthReady || !userId || !firebaseInstance.db) return;

    const dataDocRef = doc(firebaseInstance.db, 'artifacts', appId, 'users', userId, 'alchemix_data', 'user_state');

    // Nettoyage de l'ancienne souscription si elle existe
    if (unsubscribeRef.current) {
        unsubscribeRef.current();
    }

    // Mise en place de la nouvelle souscription
    unsubscribeRef.current = onSnapshot(dataDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inventory) {
          setInventory(data.inventory);
        }
        if (data.unlockedElements) {
          setUnlockedElements(data.unlockedElements);
        }
      } else {
        // Le document n'existe pas, initialisation de l'état par défaut dans Firestore
        console.log("Creating initial user state...");
        saveState({
            inventory: [],
            unlockedElements: ['FEU', 'EAU', 'CARBONE', 'AZOTE']
        });
      }
    }, (error) => {
        console.error("Firestore listen failed:", error);
    });

    // Fonction de nettoyage
    return () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
  }, [isAuthReady, userId, firebaseInstance.db]);

  // 3. Sauvegarde des données
  const saveState = async (updates) => {
    if (!userId || !firebaseInstance.db) return;

    const dataDocRef = doc(firebaseInstance.db, 'artifacts', appId, 'users', userId, 'alchemix_data', 'user_state');
    try {
        await setDoc(dataDocRef, updates, { merge: true });
        // console.log("State saved successfully.");
    } catch (e) {
        console.error("Error writing document to Firestore:", e);
    }
  };

  // --- LOGIQUE DE JEU ---

  const addElement = (elementKey) => {
    if (gameState !== 'IDLE') return;
    if (selectedElements.length < 4) {
      setSelectedElements([...selectedElements, ALL_ELEMENTS[elementKey]]);
    }
  };

  const removeElement = (index) => {
    if (gameState !== 'IDLE') return;
    const newList = [...selectedElements];
    newList.splice(index, 1);
    setSelectedElements(newList);
  };

  const startSynthesis = () => {
    if (selectedElements.length < 2) return;
    
    // Réinitialisation pour le nouveau jeu
    setIndicatorPosition(0);
    setIsSynthesizing(true);
    setGameState('DOSAGE');
  };

  // NOUVELLE BOUCLE D'ANIMATION POUR LE DOSAGE (Mouvement continu 0 -> 100 -> boucle)
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (gameState === 'DOSAGE' && isSynthesizing) {
        
        const animate = (time) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            const deltaTime = time - lastTimeRef.current; // Temps écoulé depuis la dernière frame
            lastTimeRef.current = time;
            
            // Calcul du déplacement: Vitesse * Temps écoulé (normé)
            const moveAmount = animationSpeed.current * (deltaTime / 16); // 16ms est l'intervalle idéal pour 60fps
            
            setIndicatorPosition(prevPosition => {
                let newPosition = prevPosition + moveAmount;
                
                // Si l'indicateur dépasse 100, on le ramène à 0 pour boucler (JAMAIS de recul)
                if (newPosition > 100) {
                    newPosition -= 100;
                }
                return newPosition;
            });

            requestRef.current = requestAnimationFrame(animate);
        };
        
        requestRef.current = requestAnimationFrame(animate);
        
        return () => {
            cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = 0; // Réinitialiser le temps
        };
    } else {
        cancelAnimationFrame(requestRef.current);
        lastTimeRef.current = 0;
    }
  }, [gameState, isSynthesizing]);


  const stabilizeReaction = useCallback(() => {
    if (gameState !== 'DOSAGE' || !isSynthesizing) return;
    
    // Arrête l'animation et le mouvement
    setIsSynthesizing(false);
    cancelAnimationFrame(requestRef.current);

    const finalPosition = indicatorPosition;
    const targetCenter = 50; // Le centre de la zone idéale (50%)
    const targetTolerance = 30; // La zone acceptable (20% à 80%)
    
    // Calcul du score: 100 si parfaitement au centre, 0 si à la limite de la zone
    let score = 0;
    
    if (finalPosition >= targetCenter - targetTolerance && finalPosition <= targetCenter + targetTolerance) {
        // La position est dans la zone acceptable. On calcule la précision.
        const distanceToCenter = Math.abs(finalPosition - targetCenter);
        // La distance max pour 100% de score est 0. La distance max pour 0% de score est targetTolerance.
        score = 100 - Math.min(100, (distanceToCenter / targetTolerance) * 100);
        
    } else {
        // Hors zone, score très bas (ou zéro)
        score = 5; 
    }
    
    // Trouver la rareté
    let rarity = RARITY.COMMON;
    const rarities = Object.values(RARITY).sort((a, b) => a.minScore - b.minScore);
    for (const r of rarities) {
        if (score >= r.minScore) {
            rarity = r;
        }
    }
    
    generateCreature(rarity, score);
    
  }, [gameState, isSynthesizing, indicatorPosition]);

  const generateCreature = (rarity, score) => {
    const validElements = selectedElements.filter(el => el != null);

    // 1. Trouver la recette
    const sortedIds = validElements.map(e => e.id).sort().join(',');
    let baseData = RECIPES[sortedIds];
    let recipeFound = true;

    // Fallback pour recette inconnue (Chimère)
    if (!baseData) {
      recipeFound = false;
      baseData = {
        name: 'Chimère Instable',
        type: 'Hybride',
        desc: `Un amalgame biologique imprévisible composé de ${validElements.length} éléments.`,
        shape: 'unknown'
      };
    }

    // 2. Calculer les stats
    let stats = { atk: 0, def: 0, vit: 0, int: 0 };
    validElements.forEach(el => {
      // Stats de base des éléments primaires
      if (el.id === 'feu') stats.atk += 25;
      if (el.id === 'carbone') stats.def += 25;
      if (el.id === 'azote') stats.vit += 25;
      if (el.id === 'eau') stats.int += 25;
      // Stats des éléments secondaires (si définis)
      const secondaryKey = el.id.toUpperCase();
      if (ELEMENTS_SECONDARY[secondaryKey]) {
        const secondaryStats = ELEMENTS_SECONDARY[secondaryKey].stats;
        stats.atk += secondaryStats.atk || 0;
        stats.def += secondaryStats.def || 0;
        stats.vit += secondaryStats.vit || 0;
        stats.int += secondaryStats.int || 0;
      }
    });

    // Appliquer multiplicateur de rareté
    stats.atk = Math.max(0, stats.atk * rarity.multiplier);
    stats.def = Math.max(0, stats.def * rarity.multiplier);
    stats.vit = Math.max(0, stats.vit * rarity.multiplier);
    stats.int = Math.max(0, stats.int * rarity.multiplier);

    const newCreature = {
      id: Date.now(),
      ...baseData,
      rarity: rarity,
      score: score, // Ajout du score de dosage
      stats: stats,
      elements: validElements.map(el => ({ id: el.id, name: el.name, hex: el.hex, iconId: el.id })), // Stockage simple
      date: new Date().toLocaleTimeString(),
      recipeName: baseData.name,
    };
    
    // NOUVEAU: Logique de déverrouillage
    let elementsToUnlock = [...unlockedElements];
    if (recipeFound && baseData.hasOwnProperty('unlocks')) {
        const keyToUnlock = baseData.unlocks;
        if (keyToUnlock && !unlockedElements.includes(keyToUnlock)) {
            elementsToUnlock.push(keyToUnlock);
            console.log(`Nouvel élément débloqué: ${ALL_ELEMENTS[keyToUnlock].name}`);
        }
    }

    setCreatedCreature(newCreature);
    
    // Mise à jour de l'inventaire et des éléments débloqués dans le state et dans Firestore
    const newInventory = [newCreature, ...inventory];
    setInventory(newInventory);
    setUnlockedElements(elementsToUnlock);
    
    saveState({
        inventory: newInventory,
        unlockedElements: elementsToUnlock
    });

    // Effet visuel
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    
    setGameState('RESULT');
  };

  const resetLab = () => {
    setSelectedElements([]);
    setCreatedCreature(null);
    setGameState('IDLE');
    setIndicatorPosition(0);
    setIsSynthesizing(false);
  };

  // --- RENDU VISUEL DES CRÉATURES (Simplifié CSS) ---
  const renderCreatureVisual = (creature) => {
    if (!creature || creature.elements.length === 0) return <HelpIcon />;

    // Mélange des couleurs des éléments pour le background
    const gradientColors = creature.elements.map(e => e?.hex).filter(hex => hex).join(', ');
    const firstHex = creature.elements[0]?.hex || '#333';

    // Trouver l'icône de forme
    const getShapeIcon = (shape) => {
        switch(shape) {
            case 'dragon': return <Flame size={48} className="text-red-400" />;
            case 'golem': return <Hexagon size={48} className="text-slate-400" />;
            case 'bird': return <Wind size={48} className="text-green-400" />;
            case 'shield': return <Shield size={48} className="text-gray-400" />;
            case 'turtle': return <Shield size={48} className="text-blue-400" />;
            case 'ghost': return <Wind size={48} className="blur-sm text-cyan-400" />;
            case 'crystal': return <Sparkles size={48} className="text-yellow-400" />;
            case 'blob': return <Droplets size={48} className="text-cyan-400" />;
            case 'whale': return <Droplets size={48} className="text-purple-400" />;
            case 'imp': return <Zap size={48} className="text-orange-400" />;
            case 'cloud': return <Cloud size={48} className="text-purple-300" />;
            case 'skull': return <Skull size={48} className="text-lime-500" />;
            case 'sun': return <Sun size={48} className="text-yellow-200" />;
            case 'sprout': return <Sprout size={48} className="text-pink-400" />; // Nouvelle forme
            case 'wind': return <Wind size={48} className="text-cyan-400" />; // Nouvelle forme
            case 'unknown': return <HelpIcon />;
            default: return <Activity size={48} />;
        }
    }

    return (
      <div className="relative w-48 h-48 flex items-center justify-center animate-float">
          {/* Aura */}
        <div 
            className="absolute inset-0 rounded-full opacity-50 blur-xl"
            style={{ 
                background: `conic-gradient(${gradientColors || firstHex}, ${firstHex})` 
            }}
        ></div>
        {/* Corps */}
        <div className="relative z-10 w-32 h-32 bg-slate-900 rounded-2xl border-2 border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(45deg, ${gradientColors || firstHex})` }}></div>
            <div className="z-20 text-white transform scale-150">
                {getShapeIcon(creature.shape)}
            </div>
        </div>
      </div>
    );
  };

  const HelpIcon = () => <span className="text-4xl font-bold text-slate-700">?</span>;
  
  // Fonction pour obtenir la couleur Tailwind sécurisée par ID d'élément
  const getElementTwColor = (elementId) => {
    const el = ALL_ELEMENTS[elementId.toUpperCase()];
    return el ? el.twColor : 'white';
  };

  // Rendu de l'indicateur de rythme pour le minijeu
  const renderIndicator = () => {
    return (
        <div 
            className="absolute top-0 bottom-0 w-3 bg-red-500 shadow-[0_0_10px_red] z-10 rounded-full"
            style={{ left: `${indicatorPosition}%`, transform: 'translateX(-50%)' }}
        ></div>
    );
  };
  
  // Rendu de la zone cible (fixe)
  const renderTargetZone = () => {
    const targetWidth = 60; // Zone de 60% (de 20% à 80%)
    const targetCenter = 50; // Centre à 50%
    const targetStart = targetCenter - (targetWidth / 2);
    
    return (
        <div 
            className={`absolute top-0 bottom-0 bg-green-500/30 border-x-4 border-green-500/50 z-0 transition-all duration-300 ease-out`}
            style={{ left: `${targetStart}%`, width: `${targetWidth}%` }}
        >
             {/* Zone parfaite de 10% au centre */}
             <div className="absolute inset-0 w-1/6 m-auto bg-yellow-500/50 border-x-2 border-yellow-300"></div>
        </div>
    );
  };
  
  // --- RENDU PRINCIPAL ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pointer-events-none"></div>

      {/* Flash Effect */}
      <div className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-500 ${flash ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* HEADER */}
      <header className="relative z-10 p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Beaker className="text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            ALCHEMIX <span className="text-xs text-slate-500 font-normal">BIO-GENESIS v1.2</span>
          </h1>
        </div>
        <div className="flex gap-4 text-sm items-center">
            <button 
                onClick={() => setGameState(gameState === 'COLLECTION' ? 'IDLE' : 'COLLECTION')}
                className="flex items-center gap-2 hover:text-cyan-400 transition-colors bg-slate-800/50 p-2 rounded-lg"
            >
                <Database size={16} /> Bio-Dex ({inventory.length})
            </button>
        </div>
      </header>
      
      {/* Loading State */}
      {!isAuthReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
            <RefreshCw className="animate-spin text-cyan-400 mb-4" size={32} />
            <p className="text-lg font-bold text-slate-300">Connexion au Laboratoire...</p>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="relative z-10 container mx-auto p-4 lg:p-8 h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6">

        {/* LEFT: INGREDIENTS */}
        <div className={`lg:w-1/4 transition-all duration-500 ${gameState === 'COLLECTION' ? 'opacity-20 blur-sm pointer-events-none' : ''}`}>
          <div className="bg-slate-900/80 border border-white/10 rounded-xl p-6 h-full shadow-lg space-y-8">
            
            {/* Éléments Primaires */}
            <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> Éléments Primaires
                </h2>
                <div className="grid grid-cols-2 gap-4">
                {Object.values(ELEMENTS_PRIMARY).map((el) => (
                    <button
                    key={el.id}
                    onClick={() => addElement(el.id.toUpperCase())}
                    disabled={gameState !== 'IDLE' || selectedElements.length >= 4}
                    className={`
                        relative group p-4 rounded-xl border border-white/5 bg-slate-800/50 
                        hover:bg-slate-800 hover:border-white/20 transition-all duration-300
                        flex flex-col items-center gap-2
                        ${gameState !== 'IDLE' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    >
                    <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center 
                        bg-gradient-to-br ${el.color} shadow-lg group-hover:scale-110 transition-transform
                    `}>
                        {el.icon}
                    </div>
                    <span className="text-xs font-medium text-slate-300">{el.name}</span>
                    </button>
                ))}
                </div>
            </div>

            {/* Éléments Secondaires (Déverrouillables) */}
            <div>
                <h2 className="text-sm font-semibold text-yellow-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} /> Éléments Secondaires
                </h2>
                <div className="grid grid-cols-2 gap-4">
                {Object.entries(ELEMENTS_SECONDARY).map(([key, el]) => {
                    const isUnlocked = unlockedElements.includes(key);
                    const elColor = el.twColor || 'slate';
                    return (
                    <button
                        key={el.id}
                        onClick={() => isUnlocked && addElement(key)}
                        disabled={!isUnlocked || gameState !== 'IDLE' || selectedElements.length >= 4}
                        className={`
                        relative group p-4 rounded-xl border border-white/5 bg-slate-800/50 
                        transition-all duration-300
                        flex flex-col items-center gap-2
                        ${!isUnlocked || gameState !== 'IDLE' ? 'opacity-30 cursor-not-allowed' : `hover:bg-slate-800 hover:border-${elColor}-500/50`}
                        `}
                    >
                        <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center 
                            bg-gradient-to-br ${isUnlocked ? el.color : 'from-slate-700 to-slate-800'} shadow-lg group-hover:scale-110 transition-transform
                        `}>
                            {isUnlocked ? el.icon : <Lock className="w-6 h-6 text-slate-500" />}
                        </div>
                        <span className={`text-xs font-medium ${isUnlocked ? 'text-slate-300' : 'text-slate-500'}`}>{el.name}</span>
                        {!isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                                <span className="text-[10px] text-yellow-300 uppercase font-bold text-center p-1">
                                    {`Débloquer avec : ${el.unlockRecipe}`}
                                </span>
                            </div>
                        )}
                    </button>
                    )})}
                </div>
            </div>

          </div>
        </div>

        {/* CENTER: THE CHAMBER */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 ${gameState === 'COLLECTION' ? 'hidden' : ''}`}>
          
          {/* Cylinder Visual */}
          <div className="relative w-64 h-96 lg:w-80 lg:h-[500px] mb-8">
             {/* Glass Container */}
            <div className="absolute inset-0 rounded-full bg-slate-800/30 border-2 border-white/10 backdrop-blur-sm overflow-hidden z-10 shadow-2xl">
                 {/* Fluid Animation */}
                 <div 
                     className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out mix-blend-screen opacity-80 blur-xl"
                     style={{ 
                         height: `${selectedElements.length * 25}%`,
                         background: selectedElements.length > 0 && selectedElements[0] && selectedElements[selectedElements.length - 1]
                             ? `linear-gradient(to top, ${selectedElements[0].hex}, ${selectedElements[selectedElements.length-1].hex})` 
                             : 'transparent'
                     }}
                 />
                 
                 {/* Floating Particles if mixing */}
                 {selectedElements.map((el, i) => (
                     <div 
                         key={i} 
                         className="absolute w-16 h-16 rounded-full blur-md opacity-60 animate-bounce"
                         style={{
                             background: el?.hex || '#333',
                             left: `${20 + (i*15)}%`,
                             top: `${50 + (i%2 === 0 ? -10 : 10)}%`,
                             animationDuration: `${3 + i}s`
                         }}
                     />
                 ))}
                 
                 {/* Result Creature Display inside Cylinder */}
                 {gameState === 'RESULT' && createdCreature && (
                     <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-700">
                         {renderCreatureVisual(createdCreature)}
                     </div>
                 )}
            </div>

             {/* Tech Rings */}
            <div className="absolute -inset-4 border border-cyan-500/30 rounded-full animate-spin-slow pointer-events-none z-0"></div>
            <div className="absolute -inset-8 border border-dashed border-blue-500/20 rounded-full animate-reverse-spin pointer-events-none z-0"></div>
          </div>

          {/* Controls */}
          <div className="w-full max-w-md space-y-4 relative z-20">
             {/* Element Slots UI */}
            <div className="flex justify-center gap-2 h-16 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div 
                    key={i} 
                    onClick={() => removeElement(i)}
                    className={`
                        w-14 h-14 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all
                        ${selectedElements[i] 
                            ? `border-${getElementTwColor(selectedElements[i].id)}-500 bg-slate-800`
                            : 'border-slate-800 bg-slate-900/50 border-dashed'}
                    `}
                >
                    {selectedElements[i] ? selectedElements[i].icon : <span className="text-slate-700 text-xl">+</span>}
                </div>
              ))}
            </div>

             {/* Action Buttons / Minigame */}
            {gameState === 'IDLE' && (
                <button 
                    onClick={startSynthesis}
                    disabled={selectedElements.length < 2}
                    className={`
                        w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all
                        ${selectedElements.length < 2 
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/50'}
                    `}
                >
                    Initialiser la Synthèse
                </button>
            )}

            {/* NOUVEAU MINI-JEU DE DOSAGE (Stop-in-Zone) */}
            {gameState === 'DOSAGE' && (
                <div className="bg-slate-900 border border-cyan-500/50 p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center text-cyan-400 mb-4 font-mono text-sm uppercase">
                        Stabilisation - Cliquez pour figer la réaction!
                    </div>
                    
                    <div className="relative h-8 bg-slate-950 rounded-full overflow-hidden border border-slate-700 mb-4 cursor-pointer" onClick={stabilizeReaction}>
                        {renderTargetZone()} {/* Zone cible verte fixe */}
                        {renderIndicator()} {/* Indicateur qui avance continuellement */}
                    </div>
                    
                    <button 
                        onClick={stabilizeReaction}
                        disabled={!isSynthesizing}
                        className={`w-full py-3 text-white font-bold rounded-lg uppercase transition-colors
                            ${isSynthesizing ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 cursor-not-allowed'}`}
                    >
                        {isSynthesizing ? 'FIGER LA RÉACTION' : 'RÉACTION FIGÉE'}
                    </button>
                </div>
            )}

            {gameState === 'RESULT' && (
                <button 
                    onClick={resetLab}
                    className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold uppercase flex items-center justify-center gap-2"
                >
                    <RefreshCw size={20} /> Nouvelle Expérience
                </button>
            )}
          </div>
        </div>

        {/* RIGHT: DATA / COLLECTION */}
        <div className="lg:w-1/4">
              {gameState === 'COLLECTION' ? (
                  <div className="bg-slate-900/90 border border-white/10 rounded-xl p-6 h-full shadow-lg overflow-y-auto max-h-[80vh] animate-in fade-in slide-in-from-right">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-cyan-400">Bio-Dex</h2>
                        <button onClick={() => setGameState('IDLE')} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
                      </div>
                      <div className="space-y-4">
                        {inventory.length === 0 && <div className="text-slate-500 text-center py-10">Aucune donnée biologique.</div>}
                        {inventory.map(creature => (
                            <div key={creature.id} className="bg-slate-800 p-3 rounded-lg border border-white/5 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full bg-slate-900 border ${creature.rarity.border} flex items-center justify-center`}>
                                    {/* Icône basée sur le type ou la forme */}
                                    {creature.type === 'Offensif' ? <Flame size={14} className="text-red-400"/>
                                    : creature.type === 'Tank' ? <Shield size={14} className="text-gray-400"/>
                                    : creature.type === 'Vitesse' ? <Wind size={14} className="text-green-400"/>
                                    : creature.type === 'Soutien' ? <Sprout size={14} className="text-pink-400"/>
                                    : <Activity size={14} className="text-cyan-400"/>}
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${creature.rarity.color}`}>{creature.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {creature.rarity.name} • Score: {creature.score ? Math.round(creature.score) : '?'}
                                    </div>
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
              ) : (
                <div className={`bg-slate-900/80 border border-white/10 rounded-xl p-6 h-full shadow-lg transition-all ${!createdCreature ? 'opacity-50' : ''}`}>
                    <h2 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14} /> Analyse Spectrale
                    </h2>

                    {createdCreature ? (
                    <div className="animate-in fade-in slide-in-from-right duration-500">
                        <div className="mb-4">
                            <h3 className={`text-2xl font-bold ${createdCreature.rarity.color}`}>{createdCreature.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                <span className={`px-2 py-0.5 rounded border ${createdCreature.rarity.border} ${createdCreature.rarity.color} text-xs uppercase`}>
                                    {createdCreature.rarity.name}
                                </span>
                                <span>|</span>
                                <span>Score Dosage: {Math.round(createdCreature.score)}/100</span>
                                {createdCreature.recipeName === 'Chimère Instable' && <span className="text-red-500 text-xs">(Instable)</span>}
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 italic mb-6 border-l-2 border-slate-700 pl-3">
                            "{createdCreature.desc}"
                        </p>

                        <div className="space-y-3">
                            <StatBar label="Agressivité (ATK)" value={createdCreature.stats.atk} max={200} colorClass="red" />
                            <StatBar label="Structure (DEF)" value={createdCreature.stats.def} max={200} colorClass="gray" />
                            <StatBar label="Mobilité (VIT)" value={createdCreature.stats.vit} max={200} colorClass="green" />
                            <StatBar label="Adaptation (INT)" value={createdCreature.stats.int} max={200} colorClass="blue" />
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h4 className="text-xs uppercase text-slate-500 mb-2">Composition Moléculaire</h4>
                            <div className="flex gap-2">
                                {createdCreature.elements.map((el, i) => {
                                    const elementData = ALL_ELEMENTS[el.id.toUpperCase()] || {};
                                    return (
                                        <div key={i} title={el.name} className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white/80">
                                            {elementData.icon ? React.cloneElement(elementData.icon, { size: 12 }) : <Activity size={12} />}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Affichage du déverrouillage */}
                            {RECIPES[createdCreature.elements.map(e => e.id).sort().join(',')]?.hasOwnProperty('unlocks') && 
                             !unlockedElements.includes(RECIPES[createdCreature.elements.map(e => e.id).sort().join(',')].unlocks) && (
                                <div className="mt-4 p-2 bg-yellow-900/30 text-yellow-300 text-xs rounded border border-yellow-500/50">
                                    <Sparkles size={14} className="inline mr-1" />
                                    NOUVEAU: Élément "{ALL_ELEMENTS[RECIPES[createdCreature.elements.map(e => e.id).sort().join(',')].unlocks].name}" DÉBLOQUÉ!
                                </div>
                            )}
                        </div>
                    </div>
                    ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-4">
                        <Zap size={48} className="mb-4 opacity-20" />
                        <p>En attente de synthèse...</p>
                        <p className="text-xs mt-2">Sélectionnez des éléments et lancez la réaction.</p>
                    </div>
                    )}
                </div>
              )}
        </div>

      </main>

      {/* FOOTER DECO */}
      <footer className="absolute bottom-0 w-full p-2 text-center text-[10px] text-slate-600 uppercase tracking-widest pointer-events-none">
        OMNI-LAB OS v.9.4.2 // SECURITY CLEARANCE: ALPHA // SYSTEM STABLE
      </footer>

      {/* CSS ANIMATIONS */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-spin { animation: reverse-spin 25s linear infinite; }

        @keyframes ping-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}