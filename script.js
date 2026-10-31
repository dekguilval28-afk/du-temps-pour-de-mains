const ALLOWED_TOWNS = ["Blévy", "Maillebois", "Dampierre-sur-Blévy"];

const examples = [
  {id:"ex1",type:"offer",category:"Jardin",title:"Je peux arroser vos plantes",description:"Disponible pendant vos absences pour donner un peu d'eau à vos plantes.",town:"Blévy",author:"Exemple"},
  {id:"ex2",type:"need",category:"Informatique",title:"Besoin d'un conseil sur mon ordinateur",description:"Un petit coup de main pour comprendre quelques réglages.",town:"Maillebois",author:"Exemple"},
  {id:"ex3",type:"offer",category:"Courses",title:"Je peux aider pour quelques courses",description:"Je peux dépanner une personne qui a du mal à se déplacer.",town:"Dampierre-sur-Blévy",author:"Exemple"},
  {id:"ex4",type:"need",category:"Animaux",title:"Cherche une visite pour mon chat",description:"Une courte visite et un peu de compagnie lors d'une absence.",town:"Blévy",author:"Exemple"},
  {id:"ex5",type:"offer",category:"Bricolage léger",title:"Un coup de main pour monter un petit meuble",description:"J'aime bricoler et peux aider pour un montage simple.",town:"Maillebois",author:"Exemple"},
  {id:"ex6",type:"offer",category:"Autre",title:"Je peux aider à remplir un formulaire en ligne",description:"Patient et à l'aise avec les démarches numériques courantes.",town:"Dampierre-sur-Blévy",author:"Exemple"}
];

const storageKey = "dtpdm-annonces-demo-v1";
const statusKey = "dtpdm-statuts-demo-v1";
const grid = document.getElementById("listingGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const form = document.getElementById("listingForm");
const feedback = document.getElementById("formFeedback");
let userListings = [];
let statuses = {};

try { userListings = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { userListings = []; }
try { statuses = JSON.parse(localStorage.getItem(statusKey) || "{}"); } catch { statuses = {}; }

function saveStatuses() {
  try { localStorage.setItem(statusKey, JSON.stringify(statuses)); } catch {}
}

function renderListings() {
  const query = searchInput.value.trim().toLocaleLowerCase("fr");
  const category = categoryFilter.value;
  const type = typeFilter.value;
  const all = [...userListings, ...examples];
  const filtered = all.filter(item => {
    const text = `${item.title} ${item.description} ${item.town} ${item.category}`.toLocaleLowerCase("fr");
    return (!query || text.includes(query)) && (!category || item.category === category) && (!type || item.type === type);
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
    title.textContent = item.title;
    const description = document.createElement("p");
    description.textContent = item.description;
    const meta = document.createElement("div");
    meta.className = "listing-meta";
    meta.textContent = `${item.category} · ${item.town}`;

    const state = statuses[item.id] || {};
    const action = document.createElement("div");
    action.className = "listing-action";

    if (!state.requested) {
      const btn = document.createElement("button");
      btn.className = "button button-light small";
      btn.type = "button";
      btn.textContent = "Demander à participer";
      btn.addEventListener("click", () => {
        statuses[item.id] = { requested: true, accepted: false };
        saveStatuses();
        renderListings();
      });
      action.append(btn);
    } else {
      const pill = document.createElement("span");
      pill.className = `status ${state.accepted ? "green" : "red"}`;
      pill.textContent = state.accepted ? "● Acceptée" : "● En attente";
      action.append(pill);

      if (!state.accepted) {
        const demo = document.createElement("button");
        demo.className = "link-btn";
        demo.type = "button";
        demo.textContent = "Simuler l'acceptation (démo)";
        demo.addEventListener("click", () => {
          if (item.code && prompt("Entrez le code de cette annonce (5 chiffres) :") !== item.code) { alert("Code incorrect."); return; }
          statuses[item.id] = { requested: true, accepted: true };
          saveStatuses();
          renderListings();
        });
        action.append(demo);
      }
    }

    card.append(tag, title, description, meta, action);
    grid.append(card);
  });
}

[searchInput, categoryFilter, typeFilter].forEach(el => el.addEventListener("input", renderListings));

form.addEventListener("submit", event => {
  event.preventDefault();
  const code = document.getElementById("listingCode").value.trim();
  const town = document.getElementById("listingTown").value;
  const title = document.getElementById("listingTitle").value.trim();
  const description = document.getElementById("listingDescription").value.trim();

  if (!/^\d{5}$/.test(code)) {
    feedback.textContent = "Le code doit contenir exactement 5 chiffres.";
    return;
  }
  if (!ALLOWED_TOWNS.includes(town) || !title || !description) {
    feedback.textContent = "Merci de compléter tous les champs avec une commune de la liste.";
    return;
  }

  const item = {
    id: "u" + Date.now(),
    code,
    type: document.getElementById("listingType").value,
    title,
    category: document.getElementById("listingCategory").value,
    town,
    description,
    author: "Visiteur"
  };
  userListings.unshift(item);
  try { localStorage.setItem(storageKey, JSON.stringify(userListings)); } catch {}
  form.reset();
  feedback.textContent = "Votre annonce a été ajoutée. Gardez bien votre code à 5 chiffres.";
  renderListings();
  document.getElementById("annonces").scrollIntoView({behavior:"smooth"});
});

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
renderListings();
