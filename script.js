let allRecipes = []; // stores both API + local recipes

const recipeContainer = document.getElementById("recipe-container");
const searchBox = document.getElementById("searchBox");
const areaFilter = document.getElementById("areaFilter");

// Modal elements
const modal = document.getElementById("recipeModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalImg = document.getElementById("modalImg");
const modalCategory = document.getElementById("modalCategory");
const modalArea = document.getElementById("modalArea");
const modalIngredients = document.getElementById("modalIngredients");
const modalInstructions = document.getElementById("modalInstructions");

// Fetch list of cuisines (areas)
async function fetchAreas() {
  const res = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?a=list");
  const data = await res.json();
  return data.meals.map(a => a.strArea);
}

// Fetch recipes by area
async function fetchRecipesByArea(area = "") {
  let url = "https://www.themealdb.com/api/json/v1/1/search.php?s="; // default all
  if (area) url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.meals || [];
}

// Get recipe details by id
async function fetchRecipeDetails(id) {
  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
  const data = await res.json();
  return data.meals[0];
}

// Display recipes
function displayRecipes(recipes) {
  recipeContainer.innerHTML = "";

  if (recipes.length === 0) {
    recipeContainer.innerHTML = "<p>No recipes found.</p>";
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <img src="${recipe.strMealThumb || recipe.image}" alt="${recipe.strMeal || recipe.name}">
      <h3>${recipe.strMeal || recipe.name}</h3>
    `;

    card.onclick = async () => {
      // For local recipes, details are already available
      const detail = recipe.idMeal && !recipe.ingredients ? await fetchRecipeDetails(recipe.idMeal) : recipe;
      showRecipeModal(detail);
    };

    recipeContainer.appendChild(card);
  });
}

// Show modal with recipe details
function showRecipeModal(recipe) {
  modalTitle.textContent = recipe.strMeal || recipe.name;
  modalImg.src = recipe.strMealThumb || recipe.image;
  modalCategory.textContent = recipe.strCategory || '';
  modalArea.textContent = recipe.strArea || recipe.region || '';
  modalInstructions.textContent = recipe.strInstructions || recipe.description || '';

  modalIngredients.innerHTML = "";

  if (recipe.ingredients) { // local recipe
    recipe.ingredients.forEach(i => {
      const li = document.createElement("li");
      li.textContent = i;
      modalIngredients.appendChild(li);
    });
  } else { // API recipe
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        const li = document.createElement("li");
        li.textContent = `${ingredient} - ${measure}`;
        modalIngredients.appendChild(li);
      }
    }
  }

  modal.style.display = "block";
}

// Close modal
closeModal.onclick = () => { modal.style.display = "none"; }
window.onclick = e => { if (e.target === modal) modal.style.display = "none"; }

// Initialize
async function init() {
  // 1️⃣ Fetch API recipes
  const apiRecipes = await fetchRecipesByArea();

  // 2️⃣ Fetch local recipes and set area as "Indian"
  const localRecipes = await fetch('south_indian_recipes.json')
    .then(res => res.json())
    .then(data => data.map(r => ({
      idMeal: r.id,
      strMeal: r.name,
      strMealThumb: r.image,
      strArea: "Indian",
      strCategory: "",
      strInstructions: r.description,
      ingredients: r.ingredients
    })))
    .catch(err => {
      console.error("Failed to load local recipes:", err);
      return [];
    });

  // 3️⃣ Merge API + local
  allRecipes = [...localRecipes, ...apiRecipes];

  // 4️⃣ Display all recipes initially
  displayRecipes(allRecipes);

  // 5️⃣ Populate area filter dropdown
  const areas = await fetchAreas();
  if (!areas.includes("Indian")) areas.unshift("Indian");
  areas.forEach(area => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    areaFilter.appendChild(opt);
  });

  // 6️⃣ Area filter change
 areaFilter.addEventListener("change", async () => {
  const selected = areaFilter.value;

  if (!selected) {
    // All cuisines selected → show all
    displayRecipes(allRecipes);
  } else if (selected === "Indian") {
    // Show all local recipes
    displayRecipes(allRecipes.filter(r => r.strArea === "Indian"));
  } else {
    // Show only API recipes of that area
    const apiByArea = await fetchRecipesByArea(selected);
    displayRecipes(apiByArea);
  }
});

searchBox.addEventListener("input", () => {
  const term = searchBox.value.toLowerCase();

  if (!term) {
    // If search is empty, show recipes according to selected area
    const selected = areaFilter.value;
    if (!selected) {
      displayRecipes(allRecipes);
    } else if (selected === "Indian") {
      displayRecipes(allRecipes.filter(r => r.strArea === "Indian"));
    } else {
      displayRecipes(allRecipes.filter(r => r.strArea === selected));
    }
  } else {
    // If user typed something, search in all recipes
    const filtered = allRecipes.filter(r => {
      if ((r.strMeal && r.strMeal.toLowerCase().includes(term))) return true; // API name
      if ((r.name && r.name.toLowerCase().includes(term))) return true;       // Local name
      if (r.ingredients && r.ingredients.some(i => i.toLowerCase().includes(term))) return true; // ingredients
      return false;
    });
    displayRecipes(filtered);
  }
});


}

init();
