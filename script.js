// ===== Configuration Supabase (à remplacer par vos valeurs) =====
// Dans Supabase : Project Settings > API
const SUPABASE_URL = "https://abcdwxyz1234.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1c296dnJ1eWRpcXR5YnJyZnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzYzNzMsImV4cCI6MjEwOTAxMjM3M30.gbc6PsqZGLanmoO6rwomE3oOxpRwwcYj38EPPgE3hek";

const ALLOWED_TOWNS = ["Blévy", "Maillebois", "Dampierre-sur-Blévy"];
const CATEGORIES = ["Jardin", "Informatique", "Courses", "Bricolage léger", "Animaux", "Autre"];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.getElementById("listingGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const form = document.getElementById("listingForm");
const feedback = document.getElementById("formFeedback");

// Données locales à cet appareil : tokens secrets (jamais visibles par les autres visiteurs)
const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
};
const KEY_DEMANDES = "dtpdm-mes-demandes";  // annonceId -> { demandeId, token }
const KEY_ANNONCES = "dtpdm-mes-annonces";  // annonceId -> tokenAuteur
let mesDemandes = store.read(KEY_DEMANDES);
let mesAnnonces = store.read(KEY_ANNONCES);

let annonces = [];
let statuts = {}; // annonceId -> "en_attente" | "acceptee"

async function loadAnnonces() {
  const { data, error } = await sb.from("annonces")
    .select("id,type,categorie,titre,description,commune,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    feedback.textContent = "Impossible de charger les annonces pour le moment.";
    return;
  }
  annonces = data;
  await refreshStatuts();
  renderListings();
}

async function refreshStatuts() {
  await Promise.all(Object.entries(mesDemandes).map(async ([annonceId, d]) => {
    const { data } = await sb.rpc("statut_demande", { p_demande: d.demandeId, p_token: d.token });
    if (data) statuts[annonceId] = data;
  }));
}

function renderListings() {
  const query = searchInput.value.trim().toLocaleLowerCase("fr");
  const category = categoryFilter.value;
  const type = typeFilter.value;

  const filtered = annonces.filter(item => {
    const text = `${item.titre} ${item.description} ${item.commune} ${item.categorie}`.toLocaleLowerCase("fr");
    return (!query || text.includes(query)) && (!category || item.categorie === category) && (!type || item.type === type);
  });

  grid.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune annonce ne correspond à votre recherche.";
    grid.append(empty);
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "listing-card";

    const tag = document.createElement("span");
    tag.className = `tag ${item.type === "need" ? "need" : ""}`;
    tag.textContent = item.type === "need" ? "J'AI BESOIN" : "JE PROPOSE";

    const title = document.createElement("h3");
    title.textContent = item.titre;
    const description = document.createElement("p");
    description.textContent = item.description;
    const meta = document.createElement("div");
    meta.className = "listing-meta";
    meta.textContent = `${item.categorie} · ${item.commune}`;

    const action = document.createElement("div");
    action.className = "listing-action";

    if (mesAnnonces[item.id]) {
      // C'est mon annonce : je peux voir les demandes et accepter
      const btn = document.createElement("button");
      btn.className = "button button-light small";
      btn.type = "button";
      btn.textContent = "Voir les demandes reçues";
      const zone = document.createElement("div");
      zone.className = "demandes-zone";
      btn.addEventListener("click", () => afficherDemandes(item.id, zone));
      action.append(btn);
      card.append(tag, title, description, meta, action, zone);
    } else if (mesDemandes[item.id]) {
      // J'ai demandé à participer : je vois mon statut
      const acceptee = statuts[item.id] === "acceptee";
      const pill = document.createElement("span");
      pill.className = `status ${acceptee ? "green" : "red"}`;
      pill.textContent = acceptee ? "● Acceptée" : "● En attente";
      action.append(pill);
      card.append(tag, title, description, meta, action);
    } else {
      const btn = document.createElement("button");
      btn.className = "button button-light small";
      btn.type = "button";
      btn.textContent = "Demander à participer";
      btn.addEventListener("click", () => demander(item.id));
      action.append(btn);
      card.append(tag, title, description, meta, action);
    }

    grid.append(card);
  });
}

async function demander(annonceId) {
  const { data, error } = await sb.rpc("demander_participation", { p_annonce: annonceId });
  if (error || !data?.length) {
    feedback.textContent = "La demande n'a pas pu être envoyée. Réessayez.";
    return;
  }
  mesDemandes[annonceId] = { demandeId: data[0].demande_id, token: data[0].token };
  store.write(KEY_DEMANDES, mesDemandes);
  statuts[annonceId] = "en_attente";
  renderListings();
}

async function afficherDemandes(annonceId, zone) {
  const tokenAuteur = mesAnnonces[annonceId];
  const { data, error } = await sb.rpc("demandes_pour_auteur", { p_token_auteur: tokenAuteur });
  zone.replaceChildren();
  if (error) {
    zone.textContent = "Impossible de charger les demandes.";
    return;
  }
  const liste = (data || []).filter(d => d.annonce_id === annonceId);
  if (!liste.length) {
    const p = document.createElement("p");
    p.className = "listing-meta";
    p.textContent = "Aucune demande pour le moment.";
    zone.append(p);
    return;
  }
  liste.forEach(d => {
    const row = document.createElement("div");
    row.className = "demande-row";
    const acceptee = d.statut === "acceptee";
    const pill = document.createElement("span");
    pill.className = `status ${acceptee ? "green" : "red"}`;
    pill.textContent = acceptee ? "● Acceptée" : "● En attente";
    row.append(pill);
    if (!acceptee) {
      const btn = document.createElement("button");
      btn.className = "link-btn";
      btn.type = "button";
      btn.textContent = "Accepter";
      btn.addEventListener("click", async () => {
        await sb.rpc("accepter_demande", { p_demande: d.demande_id, p_token_auteur: tokenAuteur });
        afficherDemandes(annonceId, zone);
      });
      row.append(btn);
    }
    zone.append(row);
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const code = document.getElementById("listingCode").value.trim();
  const town = document.getElementById("listingTown").value;
  const title = document.getElementById("listingTitle").value.trim();
  const description = document.getElementById("listingDescription").value.trim();

  if (!/^\d{5}$/.test(code)) {
    feedback.textContent = "Le code d'accès doit contenir 5 chiffres.";
    return;
  }
  if (!ALLOWED_TOWNS.includes(town) || !title || !description) {
    feedback.textContent = "Merci de compléter tous les champs avec une commune de la liste.";
    return;
  }

  const { data, error } = await sb.rpc("publier_annonce", {
    p_code: code,
    p_type: document.getElementById("listingType").value,
    p_categorie: document.getElementById("listingCategory").value,
    p_titre: title,
    p_commune: town,
    p_description: description
  });

  if (error) {
    feedback.textContent = error.message.includes("code_invalide")
      ? "Code d'accès incorrect."
      : "L'annonce n'a pas pu être publiée. Réessayez.";
    return;
  }

  mesAnnonces[data[0].annonce_id] = data[0].token;
  store.write(KEY_ANNONCES, mesAnnonces);
  form.reset();
  feedback.textContent = "Annonce publiée. Elle est gérable depuis cet appareil.";
  await loadAnnonces();
  document.getElementById("annonces").scrollIntoView({ behavior: "smooth" });
});

[searchInput, categoryFilter, typeFilter].forEach(el => el.addEventListener("input", renderListings));

const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const opened = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(opened));
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
document.getElementById("year").textContent = new Date().getFullYear();

loadAnnonces();
