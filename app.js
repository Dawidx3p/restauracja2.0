const state = {
  menu: null,
  category: "all",
  mood: null,
  query: "",
  currentDish: null,
  quantity: 1,
  setConfiguration: { pizza1: null, pizza2: null, drinks: null },
  cart: JSON.parse(localStorage.getItem("amo-cart") || "[]")
};

const reservationState = {
  guests: 2,
  date: null,
  time: "19:00"
};

const orderState = {
  fulfillment: "delivery",
  deliveryFee: 8,
  details: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(value);
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function formatPolishPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("48") && digits.length > 9) digits = digits.slice(2);
  return digits.slice(0, 9).replace(/(\d{3})(?=\d)/g, "$1 ");
}

function formatPolishPostalCode(value) {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

const moodIcons = { "konkretnie": "●", "lekko": "◇", "szybko": "↗", "slodko": "✦", "do-40": "○", "dla-dwojga": "♡", "zaskocz": "?" };
const moodCopy = {
  "konkretnie": ["Konkretnie i sycąco", "Pełne smaku dania na większy głód."],
  "lekko": ["Lekko, ale nie nudno", "Świeże składniki i porcje, po których nadal masz energię."],
  "szybko": ["Gotowe bez czekania", "Dania, które przygotujemy w około 15 minut."],
  "slodko": ["Zostaw miejsce na deser", "Kremowe, czekoladowe albo owocowe zakończenie."],
  "do-40": ["Dobry wybór do 40 zł", "Pełny smak w przyjaznej cenie."],
  "dla-dwojga": ["Najlepiej smakuje razem", "Pozycje stworzone do dzielenia przy jednym stole."],
  "zaskocz": ["Zaufaj nam", "Bestsellery i nowości, które warto poznać."]
};
const setDrinkOptions = [
  { id: "wino", name: "2 kieliszki wina domu" },
  { id: "cytrus", name: "2 lemoniady cytrusowe" },
  { id: "malina", name: "2 lemoniady malina–hibiskus" },
  { id: "mix", name: "Po jednej lemoniadzie" }
];

async function init() {
  try {
    const response = await fetch("data/menu.json?v=2");
    if (!response.ok) throw new Error("Nie udało się pobrać menu");
    state.menu = await response.json();
    normalizeSetCartEntries();
    renderMoods();
    renderBestsellers();
    renderCategories();
    renderTabs();
    renderDishes();
    updateCart();
    bindGlobalEvents();
  } catch (error) {
    document.body.innerHTML = `<main class="section"><h1>Menu chwilowo niedostępne</h1><p>${escapeHtml(error.message)}. Uruchom stronę przez lokalny serwer.</p></main>`;
  }
}

function renderMoods() {
  $("[data-mood-list]").innerHTML = state.menu.filters.map(filter => `
    <button class="mood-chip" type="button" data-mood="${filter.id}">
      <span>${moodIcons[filter.id]}</span>${escapeHtml(filter.label)}
    </button>`).join("");
}

function renderBestsellers() {
  const featuredIds = ["pasta-carbonara", "mieso-burger", "pizza-burrata", "mieso-stek", "deser-sernik"];
  const featured = featuredIds.map(id => state.menu.items.find(item => item.id === id)).filter(Boolean);
  $("[data-bestsellers]").innerHTML = featured.map(item => `
    <article class="bestseller-card" data-open-dish="${item.id}" tabindex="0" role="button" aria-label="Zobacz ${escapeHtml(item.name)}">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" width="1122" height="1402">
      <div class="bestseller-info">
        <span class="badge">Bestseller</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p><span>${item.prepMinutes} min</span><strong>${money(item.price)}</strong></p>
      </div>
    </article>`).join("");
}

function renderCategories() {
  $("[data-categories]").innerHTML = state.menu.categories.map(category => {
    const count = state.menu.items.filter(item => item.category === category.id).length;
    return `<button class="category-card" type="button" data-category="${category.id}">
      <strong>${escapeHtml(category.name)}</strong>
      <small>${count} ${count === 5 ? "propozycji" : "pozycji"}</small>
      <span class="category-emoji" aria-hidden="true">${category.emoji}</span>
      <span aria-hidden="true">→</span>
    </button>`;
  }).join("");
}

function renderTabs() {
  const tabs = [{ id: "all", name: "Wszystko" }, ...state.menu.categories];
  $("[data-category-tabs]").innerHTML = tabs.map(tab => `<button class="tab ${tab.id === state.category ? "active" : ""}" type="button" data-tab="${tab.id}">${escapeHtml(tab.name)}</button>`).join("");
}

function orderableItems() {
  return [...state.menu.items, ...(state.menu.sets || [])];
}

function isSet(item) {
  return state.menu.sets.some(set => set.id === item.id);
}

function cartEntryKey(entry) {
  return entry.key || entry.id;
}

function normalizeSetCartEntries() {
  const setIds = new Set((state.menu.sets || []).map(set => set.id));
  const normalEntries = [];
  const setEntries = new Map();
  state.cart.forEach(entry => {
    if (setIds.has(entry.id)) setEntries.set(entry.id, { ...entry, key: entry.id, quantity: 1 });
    else normalEntries.push(entry);
  });
  state.cart = [...normalEntries, ...setEntries.values()];
  localStorage.setItem("amo-cart", JSON.stringify(state.cart));
}

function configurationSummary(configuration) {
  return configuration
    ? `${configuration.pizza1}, ${configuration.pizza2} · ${configuration.drinks}`
    : "";
}

function setConfigurationComplete() {
  return Object.values(state.setConfiguration).every(Boolean);
}

function selectedSetConfiguration() {
  const pizzaName = id => state.menu.items.find(item => item.id === id)?.name || "";
  return {
    pizza1: pizzaName(state.setConfiguration.pizza1),
    pizza2: pizzaName(state.setConfiguration.pizza2),
    drinks: setDrinkOptions.find(option => option.id === state.setConfiguration.drinks)?.name || "",
    pizza1Id: state.setConfiguration.pizza1,
    pizza2Id: state.setConfiguration.pizza2,
    drinksId: state.setConfiguration.drinks
  };
}

function renderSetConfigurator() {
  const pizzas = state.menu.items.filter(item => item.category === "pizza");
  const renderPizzaOptions = (group, target) => {
    $(target).innerHTML = pizzas.map(pizza => {
      const selected = state.setConfiguration[group] === pizza.id;
      return `<button class="set-option ${selected ? "selected" : ""}" type="button" data-set-choice="${group}" data-set-value="${pizza.id}" aria-pressed="${selected}">${escapeHtml(pizza.name)}</button>`;
    }).join("");
  };
  renderPizzaOptions("pizza1", "[data-set-pizza-one]");
  renderPizzaOptions("pizza2", "[data-set-pizza-two]");
  $("[data-set-drinks]").innerHTML = setDrinkOptions.map(drink => {
    const selected = state.setConfiguration.drinks === drink.id;
    return `<button class="set-option ${selected ? "selected" : ""}" type="button" data-set-choice="drinks" data-set-value="${drink.id}" aria-pressed="${selected}">${escapeHtml(drink.name)}</button>`;
  }).join("");
}

function filteredItems() {
  const source = state.mood === "dla-dwojga"
    ? [...state.menu.sets, ...state.menu.items]
    : state.mood ? orderableItems() : state.menu.items;
  return source.filter(item => {
    const categoryMatch = state.category === "all" || item.category === state.category;
    const moodMatch = !state.mood || item.moods.includes(state.mood);
    const haystack = normalize([item.name, item.description, ...(item.diet || []), ...(item.badges || [])].join(" "));
    return categoryMatch && moodMatch && (!state.query || haystack.includes(normalize(state.query)));
  });
}

function renderDishes() {
  const items = filteredItems();
  const heading = state.category === "all" ? "Wszystkie dania" : state.menu.categories.find(category => category.id === state.category)?.name;
  $("[data-menu-heading]").textContent = state.mood ? moodCopy[state.mood][0] : heading;
  $("[data-dish-list]").innerHTML = items.map(item => {
    const configurableSet = isSet(item);
    const quantity = state.cart.find(entry => entry.id === item.id)?.quantity || 0;
    const orderControl = configurableSet
      ? `<button class="dish-add-button set-select-button" type="button" data-open-dish="${item.id}" aria-label="Zobacz szczegóły zestawu ${escapeHtml(item.name)}"><span>Zobacz</span><b aria-hidden="true">→</b></button>`
      : quantity > 0
      ? `<div class="dish-inline-qty" aria-label="Liczba porcji ${escapeHtml(item.name)}">
          <button type="button" data-quick-decrease="${item.id}" aria-label="Odejmij ${escapeHtml(item.name)}">−</button>
          <strong aria-live="polite">${quantity}</strong>
          <button type="button" data-quick-add="${item.id}" aria-label="Dodaj kolejną porcję ${escapeHtml(item.name)}">+</button>
        </div>`
      : `<button class="dish-add-button" type="button" data-quick-add="${item.id}" aria-label="Dodaj ${escapeHtml(item.name)} do koszyka"><span>Dodaj</span><b aria-hidden="true">+</b></button>`;
    return `
    <article class="dish-row">
      <div class="dish-row-title">
        <h4>${escapeHtml(item.name)}</h4>
        <strong>${money(item.price)}</strong>
      </div>
      <div class="dish-row-buttons">
        <button class="dish-info-button" type="button" data-open-dish="${item.id}" aria-label="Dowiedz się więcej o ${escapeHtml(item.name)}">?</button>
        ${orderControl}
      </div>
    </article>`;
  }).join("");
  $("[data-empty]").hidden = items.length > 0;
}

function chooseMood(id) {
  state.mood = state.mood === id ? null : id;
  state.category = "all";
  state.query = "";
  $("[data-search]").value = "";
  renderTabs();
  $$("[data-mood]").forEach(button => button.classList.toggle("active", button.dataset.mood === state.mood));
  const panel = $("[data-recommendation]");
  if (!state.mood) {
    panel.hidden = true;
    renderDishes();
    return;
  }
  const matchingItems = orderableItems().filter(item => item.moods.includes(state.mood));
  const items = state.mood === "dla-dwojga"
    ? [...state.menu.sets, ...state.menu.items].filter(item => item.moods.includes(state.mood)).slice(0, 3)
    : matchingItems.slice(0, 3);
  const [title, description] = moodCopy[state.mood];
  $("[data-recommendation-title]").textContent = title;
  $("[data-recommendation-description]").textContent = description;
  $("[data-recommendation-cards]").innerHTML = items.map(item => {
    const isSet = state.menu.sets.some(set => set.id === item.id);
    return `<button class="mini-card ${isSet ? "set-card" : ""}" type="button" data-open-dish="${item.id}">
      ${isSet ? "<small>Zestaw specjalny</small>" : ""}
      <strong>${escapeHtml(item.name)}</strong>
      <span>${money(item.price)} →</span>
    </button>`;
  }).join("");
  panel.hidden = false;
  renderDishes();
  if (matchMedia("(max-width: 820px)").matches) {
    requestAnimationFrame(() => panel.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    }));
  }
}

function showMoodResults() {
  state.category = "all";
  state.query = "";
  $("[data-search]").value = "";
  renderTabs();
  renderDishes();
  openMobileMenu();
}

function setCategory(id, scroll = true) {
  state.category = id;
  state.mood = null;
  $$("[data-mood]").forEach(button => button.classList.remove("active"));
  $("[data-recommendation]").hidden = true;
  renderTabs();
  renderDishes();
  if (scroll) {
    if (matchMedia("(max-width: 820px)").matches) openMobileMenu();
    else $("[data-menu-browser]").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openMobileMenu(focusSearch = false) {
  if (!matchMedia("(max-width: 820px)").matches) {
    $("[data-menu-browser]").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  document.body.classList.add("mobile-menu-open");
  $("[data-open-mobile-menu]")?.setAttribute("aria-pressed", "true");
  if (focusSearch) setTimeout(() => $("[data-search]").focus(), 180);
}

function closeMobileMenu() {
  document.body.classList.remove("mobile-menu-open");
  $("[data-open-mobile-menu]")?.setAttribute("aria-pressed", "false");
}

function openDish(id) {
  const item = orderableItems().find(dish => dish.id === id);
  if (!item) return;
  const configurableSet = isSet(item);
  state.currentDish = item;
  state.quantity = 1;
  $("[data-modal-title]").textContent = item.name;
  $("[data-modal-price]").textContent = money(item.price);
  $("[data-modal-description]").textContent = item.description;
  $("[data-modal-weight]").textContent = item.weight || "zestaw dla 2 osób";
  $("[data-modal-time]").textContent = item.prepMinutes ? `${item.prepMinutes} min` : "około 25 min";
  const allergens = item.allergens || [];
  $("[data-modal-allergens]").textContent = allergens.length ? allergens.join(", ") : "brak deklarowanych alergenów";
  $("[data-modal-badges]").innerHTML = [...(item.badges || []), ...(item.diet || [])].map(label => `<span class="badge">${escapeHtml(label)}</span>`).join("");
  const recommendationRow = $("[data-recommendation-row]");
  recommendationRow.hidden = !item.recommendation;
  $("[data-modal-recommendation]").textContent = item.recommendation ? `${item.recommendation}%` : "";
  const media = $("[data-modal-media]");
  media.classList.toggle("no-image", !item.image);
  media.innerHTML = item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : "";
  $("[data-dish-details]").hidden = configurableSet;
  $("[data-allergens]").hidden = configurableSet;
  $("[data-quantity-control]").hidden = configurableSet;
  updateDishPrice();
  const dialog = $("[data-dish-modal]");
  dialog.classList.toggle("no-image-dialog", !item.image);
  dialog.classList.toggle("set-dialog", configurableSet);
  dialog.showModal();
  document.body.classList.add("modal-open");
}

function updateDishPrice() {
  $("[data-qty]").textContent = state.quantity;
  $("[data-add-price]").textContent = money(state.currentDish.price * state.quantity);
  const addButton = $("[data-add-to-cart]");
  addButton.disabled = false;
  $("[data-add-to-cart] span").textContent = isSet(state.currentDish) ? "Zamów zestaw" : "Dodaj do zamówienia";
}

function addToCart() {
  if (isSet(state.currentDish)) {
    openSetConfigurator();
    return;
  }
  const key = state.currentDish.id;
  const existing = state.cart.find(entry => cartEntryKey(entry) === key);
  if (existing) existing.quantity += state.quantity;
  else state.cart.push({ id: state.currentDish.id, key, quantity: state.quantity });
  persistCart();
  closeDialog($("[data-dish-modal]"));
  showToast(`${state.currentDish.name} dodano do koszyka`);
}

function updateSetConfiguratorButton() {
  const button = $("[data-add-set-to-cart]");
  const complete = setConfigurationComplete();
  button.disabled = !complete;
  $("span", button).textContent = complete ? "Dodaj zestaw do koszyka" : "Wybierz skład zestawu";
}

function openSetConfigurator(configuration = null) {
  const pizzaIdByName = name => state.menu.items.find(item => item.category === "pizza" && item.name === name)?.id || null;
  const drinkIdByName = name => setDrinkOptions.find(option => option.name === name)?.id || null;
  state.currentDish = state.menu.sets.find(set => set.id === "wieczor-we-dwoje") || state.currentDish;
  state.setConfiguration = {
    pizza1: configuration?.pizza1Id || pizzaIdByName(configuration?.pizza1) || null,
    pizza2: configuration?.pizza2Id || pizzaIdByName(configuration?.pizza2) || null,
    drinks: configuration?.drinksId || drinkIdByName(configuration?.drinks) || null
  };
  renderSetConfigurator();
  updateSetConfiguratorButton();
  closeDialog($("[data-dish-modal]"));
  closeDialog($("[data-cart-modal]"));
  $("[data-set-config-modal]").showModal();
  document.body.classList.add("modal-open");
}

function addConfiguredSetToCart() {
  if (!state.currentDish || !isSet(state.currentDish) || !setConfigurationComplete()) return;
  const configuration = selectedSetConfiguration();
  state.cart = state.cart.filter(entry => entry.id !== state.currentDish.id);
  state.cart.push({ id: state.currentDish.id, key: state.currentDish.id, quantity: 1, configuration });
  persistCart();
  closeDialog($("[data-set-config-modal]"));
  showToast("Skonfigurowany zestaw dodano do koszyka");
}

function quickAdd(key) {
  const existing = state.cart.find(entry => cartEntryKey(entry) === key);
  const item = existing
    ? orderableItems().find(dish => dish.id === existing.id)
    : orderableItems().find(dish => dish.id === key);
  if (!item) return;
  if (existing) existing.quantity += 1;
  else state.cart.push({ id: key, quantity: 1 });
  persistCart();
  showToast(`${item.name} dodano do koszyka`);
}

function quickDecrease(key) {
  const existing = state.cart.find(entry => cartEntryKey(entry) === key);
  if (!existing) return;
  existing.quantity -= 1;
  if (existing.quantity <= 0) state.cart = state.cart.filter(entry => cartEntryKey(entry) !== key);
  persistCart();
}

function persistCart() {
  localStorage.setItem("amo-cart", JSON.stringify(state.cart));
  updateCart();
  renderDishes();
}

function cartRows() {
  return state.cart.map(entry => {
    const item = orderableItems().find(dish => dish.id === entry.id);
    return item ? { ...entry, key: cartEntryKey(entry), item } : null;
  }).filter(Boolean);
}

function cartSubtotal() {
  return cartRows().reduce((sum, row) => sum + row.item.price * row.quantity, 0);
}

function updateCart() {
  const totalCount = state.cart.reduce((sum, entry) => sum + entry.quantity, 0);
  $$('[data-cart-count]').forEach(element => element.textContent = totalCount);
  const rows = cartRows();
  $("[data-cart-items]").innerHTML = rows.map(({ item, quantity, key, configuration }) => {
    const setItem = isSet(item);
    const actions = setItem
      ? `<div class="cart-set-actions"><span>1 zestaw</span><button type="button" data-edit-set="${item.id}">Zmień skład</button><button class="cart-remove" type="button" data-remove-cart="${escapeHtml(key)}">Usuń</button></div>`
      : `<div class="cart-item-actions">
          <div class="cart-item-qty" aria-label="Liczba porcji ${escapeHtml(item.name)}">
            <button type="button" data-quick-decrease="${escapeHtml(key)}" aria-label="Odejmij ${escapeHtml(item.name)}">−</button>
            <strong>${quantity}</strong>
            <button type="button" data-quick-add="${escapeHtml(key)}" aria-label="Dodaj ${escapeHtml(item.name)}">+</button>
          </div>
          <button class="cart-remove" type="button" data-remove-cart="${escapeHtml(key)}">Usuń</button>
        </div>`;
    return `<div class="cart-item">
      <div class="cart-item-copy">
        <strong>${escapeHtml(item.name)}</strong>
        ${configuration ? `<small class="cart-configuration">${escapeHtml(configurationSummary(configuration))}</small>` : ""}
        <small>${setItem ? "Skonfigurowany zestaw" : `${money(item.price)} za porcję`}</small>
      </div>
      <strong class="cart-item-price">${money(item.price * quantity)}</strong>
      ${actions}
    </div>`;
  }).join("");
  $("[data-cart-empty]").hidden = rows.length > 0;
  $("[data-cart-total]").textContent = money(cartSubtotal());
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reservationGuestLabel(guests) {
  if (guests === 1) return "1 osoba";
  if (guests < 5) return `${guests} osoby`;
  return `${guests} osób`;
}

function reservationDateLabel(dateKey, long = false) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", long
    ? { weekday: "long", day: "numeric", month: "long" }
    : { weekday: "short", day: "numeric", month: "short" }
  ).format(date);
}

function renderReservationGuests() {
  $("[data-reservation-guests]").innerHTML = [1, 2, 3, 4, 5, 6, 7].map(guests => `
    <button class="reservation-choice ${guests === reservationState.guests ? "selected" : ""}" type="button" data-reservation-guests-value="${guests}" aria-pressed="${guests === reservationState.guests}">
      ${guests === 7 ? "7+" : guests}
    </button>`).join("");
}

function renderReservationDates() {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index + 1);
    return date;
  });
  const availableKeys = dates.map(localDateKey);
  if (!reservationState.date || !availableKeys.includes(reservationState.date)) reservationState.date = availableKeys[0];
  $("[data-reservation-dates]").innerHTML = dates.map(date => {
    const key = localDateKey(date);
    const selected = key === reservationState.date;
    return `<button class="reservation-date ${selected ? "selected" : ""}" type="button" data-reservation-date="${key}" aria-pressed="${selected}">
      <span>${new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(date)}</span>
      <strong>${date.getDate()}</strong>
      <small>${new Intl.DateTimeFormat("pl-PL", { month: "short" }).format(date)}</small>
    </button>`;
  }).join("");
}

function renderReservationTimes() {
  const slots = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  $("[data-reservation-times]").innerHTML = slots.map(time => `
    <button class="reservation-choice ${time === reservationState.time ? "selected" : ""}" type="button" data-reservation-time="${time}" aria-pressed="${time === reservationState.time}">${time}</button>`).join("");
}

function updateReservationSummary() {
  $("[data-reservation-summary]").textContent = `${reservationGuestLabel(reservationState.guests)} · ${reservationDateLabel(reservationState.date)} · ${reservationState.time}`;
}

function renderReservation() {
  renderReservationGuests();
  renderReservationDates();
  renderReservationTimes();
  updateReservationSummary();
}

function openReservation() {
  closeMobileMenu();
  renderReservation();
  const form = $("[data-reservation-form]");
  form.reset();
  $("[data-reservation-form-view]").hidden = false;
  $("[data-reservation-success]").hidden = true;
  const dialog = $("[data-reservation-modal]");
  dialog.showModal();
  document.body.classList.add("modal-open");
}

function submitReservation(form) {
  const name = new FormData(form).get("name").trim();
  $("[data-reservation-name]").textContent = name;
  $("[data-reservation-confirmation]").textContent = `Stolik dla ${reservationGuestLabel(reservationState.guests)} — ${reservationDateLabel(reservationState.date, true)} o ${reservationState.time}.`;
  $("[data-reservation-form-view]").hidden = true;
  $("[data-reservation-success]").hidden = false;
}

function orderTotal() {
  return cartSubtotal() + (orderState.fulfillment === "delivery" ? orderState.deliveryFee : 0);
}

function updateFulfillment() {
  $$('[data-fulfillment]').forEach(button => {
    const selected = button.dataset.fulfillment === orderState.fulfillment;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected);
  });
  const deliveryFields = $("[data-delivery-fields]");
  const isDelivery = orderState.fulfillment === "delivery";
  deliveryFields.hidden = !isDelivery;
  $$('[name="street"], [name="postalCode"], [name="city"]', deliveryFields).forEach(input => { input.required = isDelivery; });
  $("[data-checkout-total]").textContent = money(orderTotal());
}

function setCheckoutStep(step) {
  $("[data-checkout-details]").hidden = step !== 1;
  $("[data-checkout-review]").hidden = step !== 2;
  $("[data-order-success]").hidden = true;
  const progressSteps = $$("span", $("[data-checkout-progress]"));
  progressSteps[0].classList.toggle("active", step >= 1);
  progressSteps[0].classList.toggle("complete", step > 1);
  progressSteps[1].classList.toggle("active", step >= 2);
}

function openCheckout() {
  if (!state.cart.length) {
    showToast("Najpierw dodaj coś do koszyka");
    return;
  }
  closeDialog($("[data-cart-modal]"));
  orderState.fulfillment = "delivery";
  orderState.details = null;
  const form = $("[data-order-form]");
  form.reset();
  updateFulfillment();
  setCheckoutStep(1);
  $("[data-checkout-progress]").hidden = false;
  const dialog = $("[data-checkout-modal]");
  dialog.showModal();
  document.body.classList.add("modal-open");
}

function renderCheckoutReview(form) {
  const data = Object.fromEntries(new FormData(form));
  orderState.details = data;
  $("[data-review-items]").innerHTML = cartRows().map(({ item, quantity, configuration }) => `
    <p><span>${quantity} × ${escapeHtml(item.name)}${configuration ? `<small>${escapeHtml(configurationSummary(configuration))}</small>` : ""}</span><strong>${money(item.price * quantity)}</strong></p>`).join("");
  $("[data-review-customer]").textContent = `${data.customerName} · +48 ${data.customerPhone}`;
  $("[data-review-fulfillment]").textContent = orderState.fulfillment === "delivery"
    ? `Dostawa: ${data.street}${data.apartment ? `/${data.apartment}` : ""}, ${data.postalCode} ${data.city}`
    : "Odbiór osobisty: ul. Dobra 24, Warszawa";
  $("[data-review-payment]").textContent = `Płatność: ${data.payment}`;
  $("[data-review-subtotal]").textContent = money(cartSubtotal());
  $("[data-review-fee-label]").textContent = orderState.fulfillment === "delivery" ? "Dostawa" : "Odbiór";
  $("[data-review-fee]").textContent = orderState.fulfillment === "delivery" ? money(orderState.deliveryFee) : "0 zł";
  $("[data-review-total]").textContent = money(orderTotal());
  $("[data-place-order-total]").textContent = money(orderTotal());
  setCheckoutStep(2);
}

function placeOrder() {
  const eta = orderState.fulfillment === "delivery" ? "35–45 minut" : "około 20 minut";
  $("[data-order-number]").textContent = `AMO-${String(Date.now()).slice(-4)}`;
  $("[data-order-success-copy]").textContent = orderState.fulfillment === "delivery"
    ? `Dostawa powinna dotrzeć za ${eta}.`
    : `Zamówienie będzie gotowe do odbioru za ${eta}.`;
  $("[data-checkout-review]").hidden = true;
  $("[data-checkout-progress]").hidden = true;
  $("[data-order-success]").hidden = false;
  state.cart = [];
  persistCart();
}

function openCart() {
  $("[data-cart-modal]").showModal();
  document.body.classList.add("modal-open");
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
  if (!$("dialog[open]")) document.body.classList.remove("modal-open");
}

let toastTimer;
function showToast(message) {
  const toast = $("[data-toast]");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function bindGlobalEvents() {
  document.addEventListener("click", event => {
    const mood = event.target.closest("[data-mood]");
    const category = event.target.closest("[data-category]");
    const tab = event.target.closest("[data-tab]");
    const dish = event.target.closest("[data-open-dish]");
    const quickAddButton = event.target.closest("[data-quick-add]");
    const quickDecreaseButton = event.target.closest("[data-quick-decrease]");
    if (mood) chooseMood(mood.dataset.mood);
    if (category) setCategory(category.dataset.category);
    if (tab) setCategory(tab.dataset.tab, false);
    if (dish) openDish(dish.dataset.openDish);
    if (quickAddButton) quickAdd(quickAddButton.dataset.quickAdd);
    if (quickDecreaseButton) quickDecrease(quickDecreaseButton.dataset.quickDecrease);
    if (event.target.closest("[data-open-mobile-menu]")) openMobileMenu();
    if (event.target.closest("[data-close-mobile-menu]")) closeMobileMenu();
    if (event.target.closest("[data-open-cart]")) openCart();
    if (event.target.closest("[data-close-cart]")) closeDialog($("[data-cart-modal]"));
    if (event.target.closest("[data-close-dish]")) closeDialog($("[data-dish-modal]"));
    if (event.target.closest("[data-close-set-config]")) closeDialog($("[data-set-config-modal]"));
    if (event.target.closest("[data-close-reservation], [data-reservation-done]")) closeDialog($("[data-reservation-modal]"));
    if (event.target.closest("[data-close-checkout], [data-order-done]")) closeDialog($("[data-checkout-modal]"));
    if (event.target.closest("[data-qty-minus]")) { state.quantity = Math.max(1, state.quantity - 1); updateDishPrice(); }
    if (event.target.closest("[data-qty-plus]")) { state.quantity = Math.min(9, state.quantity + 1); updateDishPrice(); }
    const setChoice = event.target.closest("[data-set-choice]");
    if (setChoice) { state.setConfiguration[setChoice.dataset.setChoice] = setChoice.dataset.setValue; renderSetConfigurator(); updateSetConfiguratorButton(); }
    if (event.target.closest("[data-add-to-cart]")) addToCart();
    if (event.target.closest("[data-add-set-to-cart]")) addConfiguredSetToCart();
    const editSet = event.target.closest("[data-edit-set]");
    if (editSet) {
      const entry = state.cart.find(cartItem => cartItem.id === editSet.dataset.editSet);
      if (entry) openSetConfigurator(entry.configuration);
    }
    const remove = event.target.closest("[data-remove-cart]");
    if (remove) { state.cart = state.cart.filter(entry => cartEntryKey(entry) !== remove.dataset.removeCart); persistCart(); }
    if (event.target.closest("[data-show-results]")) showMoodResults();
    if (event.target.closest("[data-focus-search]")) openMobileMenu(true);
    if (event.target.closest("[data-reserve]")) openReservation();
    const guestChoice = event.target.closest("[data-reservation-guests-value]");
    if (guestChoice) { reservationState.guests = Number(guestChoice.dataset.reservationGuestsValue); renderReservationGuests(); updateReservationSummary(); }
    const dateChoice = event.target.closest("[data-reservation-date]");
    if (dateChoice) { reservationState.date = dateChoice.dataset.reservationDate; renderReservationDates(); updateReservationSummary(); }
    const timeChoice = event.target.closest("[data-reservation-time]");
    if (timeChoice) { reservationState.time = timeChoice.dataset.reservationTime; renderReservationTimes(); updateReservationSummary(); }
    const fulfillment = event.target.closest("[data-fulfillment]");
    if (fulfillment) { orderState.fulfillment = fulfillment.dataset.fulfillment; updateFulfillment(); }
    if (event.target.closest("[data-checkout]")) openCheckout();
    if (event.target.closest("[data-order-edit]")) setCheckoutStep(1);
    if (event.target.closest("[data-edit-cart]")) { closeDialog($("[data-checkout-modal]")); openCart(); }
    if (event.target.closest("[data-place-order]")) placeOrder();
  });

  document.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-dish][role='button']")) { event.preventDefault(); openDish(event.target.dataset.openDish); }
    if (event.key === "Escape" && document.body.classList.contains("mobile-menu-open") && !$("dialog[open]")) closeMobileMenu();
  });

  $("[data-search]").addEventListener("input", event => { state.query = event.target.value; renderDishes(); });
  $$('[data-polish-phone]').forEach(input => input.addEventListener("input", event => { event.target.value = formatPolishPhone(event.target.value); }));
  $$('[data-polish-postal]').forEach(input => input.addEventListener("input", event => { event.target.value = formatPolishPostalCode(event.target.value); }));
  $("[data-reservation-form]").addEventListener("submit", event => { event.preventDefault(); submitReservation(event.currentTarget); });
  $("[data-order-form]").addEventListener("submit", event => { event.preventDefault(); renderCheckoutReview(event.currentTarget); });
  $$('dialog').forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(dialog); }));
  window.addEventListener("scroll", () => $("[data-topbar]").classList.toggle("scrolled", scrollY > 40), { passive: true });

  const sections = ["start", "menu", "lokal"].map(id => document.getElementById(id));
  const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    $$(".mobile-nav a").forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
  }), { rootMargin: "-35% 0px -60%" });
  sections.forEach(section => navObserver.observe(section));
}

init();
