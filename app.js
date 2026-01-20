const productForm = document.getElementById("productForm");
const requirementForm = document.getElementById("requirementForm");
const pimForm = document.getElementById("pimForm");
const contractForm = document.getElementById("contractForm");
const productTable = document.getElementById("productTable");
const requirementTable = document.getElementById("requirementTable");
const pimTable = document.getElementById("pimTable");
const contractTimeline = document.getElementById("contractTimeline");
const totalTons = document.getElementById("totalTons");
const totalValue = document.getElementById("totalValue");
const remainingTons = document.getElementById("remainingTons");
const remainingValue = document.getElementById("remainingValue");
const resetDataButton = document.getElementById("resetData");

const STORAGE_KEY = "comexx-data";

const state = {
  products: [],
  requirements: [],
  pims: [],
  contracts: [],
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value);

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    state.products = parsed.products || [];
    state.requirements = parsed.requirements || [];
    state.pims = parsed.pims || [];
    state.contracts = parsed.contracts || [];
  }
};

const getRemainingForProduct = (productCode) => {
  const required = state.requirements
    .filter((req) => req.productCode === productCode)
    .reduce((sum, req) => sum + req.quantity, 0);
  const used = state.pims
    .filter((pim) => pim.productCode === productCode)
    .reduce((sum, pim) => sum + pim.quantity, 0);
  return Math.max(required - used, 0);
};

const updateRequirementSelectors = () => {
  const productSelects = [
    requirementForm.querySelector("select[name='product']"),
    pimForm.querySelector("select[name='product']"),
  ];
  const pimSelect = contractForm.querySelector("select[name='pim']");

  productSelects.forEach((select) => {
    if (state.products.length === 0) {
      select.innerHTML = "<option value=\"\">Sin productos registrados</option>";
      return;
    }
    select.innerHTML = state.products
      .map(
        (product) =>
          `<option value="${product.code}">${product.code} - ${product.name}</option>`
      )
      .join("");
  });

  if (state.pims.length === 0) {
    pimSelect.innerHTML = "<option value=\"\">Sin PIMs registrados</option>";
  } else {
    pimSelect.innerHTML = state.pims
      .map(
        (pim) =>
          `<option value="${pim.id}">${pim.id} - ${pim.productCode}</option>`
      )
      .join("");
  }

  updateRequirementPreview();
  updatePimBalance();
};

const updateRequirementPreview = () => {
  const productCode = requirementForm.querySelector("select[name='product']").value;
  const quantity = Number(requirementForm.querySelector("input[name='quantity']").value || 0);
  const product = state.products.find((item) => item.code === productCode);
  const lastPriceInput = requirementForm.querySelector("input[name='lastPrice']");
  const estimatedInput = requirementForm.querySelector("input[name='estimated']");

  if (product) {
    lastPriceInput.value = formatCurrency(product.price);
    estimatedInput.value = formatCurrency(product.price * quantity);
  } else {
    lastPriceInput.value = "-";
    estimatedInput.value = "-";
  }
};

const updatePimBalance = () => {
  const productCode = pimForm.querySelector("select[name='product']").value;
  const balanceInput = pimForm.querySelector("input[name='balance']");
  if (!productCode) {
    balanceInput.value = "-";
    return;
  }
  balanceInput.value = formatNumber(getRemainingForProduct(productCode));
};

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date;
};

const renderProducts = () => {
  productTable.innerHTML = state.products
    .map(
      (product) => `
      <tr>
        <td>${product.code}</td>
        <td>${product.name}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${product.lastImport}</td>
        <td><button data-remove-product="${product.code}">Eliminar</button></td>
      </tr>`
    )
    .join("");
};

const renderRequirements = () => {
  requirementTable.innerHTML = state.requirements
    .map(
      (req) => `
      <tr>
        <td>${req.productCode} - ${req.productName}</td>
        <td>${formatNumber(req.quantity)}</td>
        <td>${formatCurrency(req.unitPrice)}</td>
        <td>${formatCurrency(req.totalValue)}</td>
        <td><button data-remove-requirement="${req.id}">Eliminar</button></td>
      </tr>`
    )
    .join("");

  const totalTonsValue = state.requirements.reduce((sum, req) => sum + req.quantity, 0);
  const totalValueValue = state.requirements.reduce((sum, req) => sum + req.totalValue, 0);

  totalTons.textContent = formatNumber(totalTonsValue);
  totalValue.textContent = formatCurrency(totalValueValue);

  updateRemaining();
};

const updateRemaining = () => {
  const totalRequirementTons = state.requirements.reduce((sum, req) => sum + req.quantity, 0);
  const totalRequirementValue = state.requirements.reduce((sum, req) => sum + req.totalValue, 0);
  const pimTons = state.pims.reduce((sum, pim) => sum + pim.quantity, 0);
  const pimValue = state.pims.reduce((sum, pim) => sum + pim.totalValue, 0);

  remainingTons.textContent = formatNumber(Math.max(totalRequirementTons - pimTons, 0));
  remainingValue.textContent = formatCurrency(Math.max(totalRequirementValue - pimValue, 0));
};

const renderPims = () => {
  pimTable.innerHTML = state.pims
    .map(
      (pim) => `
      <tr>
        <td>${pim.id}</td>
        <td>${pim.subId || "-"}</td>
        <td>${pim.factory}</td>
        <td>${pim.supplier}</td>
        <td>${pim.productCode}</td>
        <td>${formatNumber(pim.quantity)}</td>
        <td>${pim.payment}</td>
        <td><span class="status-badge">${pim.status}</span></td>
        <td><button data-remove-pim="${pim.id}">Eliminar</button></td>
      </tr>`
    )
    .join("");

  updateRemaining();
  updatePimBalance();
};

const renderContracts = () => {
  contractTimeline.innerHTML = state.contracts
    .map((contract) => {
      const statusClass = contract.slaStatus === "Atrasado" ? "badge-danger" : "badge-success";
      return `
      <div class="timeline-item">
        <div class="timeline-header">
          <h4>${contract.pimId} · ${contract.status}</h4>
          <span class="status-badge ${statusClass}">${contract.slaStatus}</span>
        </div>
        <p><strong>SLA:</strong> ${contract.sla} días · <strong>Vence:</strong> ${contract.dueDate}</p>
        <p><strong>Notificación:</strong> ${contract.notification}</p>
        <p>${contract.updatedAt}</p>
      </div>`;
    })
    .join("");
};

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(productForm);
  const code = data.get("code").trim();
  const name = data.get("name").trim();
  const price = Number(data.get("price"));
  const date = data.get("date");

  if (!code || !name || !date) {
    return;
  }

  state.products = state.products.filter((product) => product.code !== code);
  state.products.push({
    code,
    name,
    price,
    lastImport: date,
  });

  productForm.reset();
  saveState();
  renderProducts();
  updateRequirementSelectors();
});

requirementForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(requirementForm);
  const productCode = data.get("product");
  const quantity = Number(data.get("quantity"));
  const product = state.products.find((item) => item.code === productCode);

  if (!product || quantity <= 0) {
    return;
  }

  const requirement = {
    id: crypto.randomUUID(),
    productCode,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    totalValue: product.price * quantity,
  };

  state.requirements.push(requirement);
  requirementForm.reset();
  saveState();
  renderRequirements();
  updateRequirementPreview();
});

pimForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(pimForm);
  const id = data.get("pim").trim();
  const subId = data.get("subpim").trim();
  const factory = data.get("factory").trim();
  const supplier = data.get("supplier").trim();
  const productCode = data.get("product");
  const quantity = Number(data.get("quantity"));
  const payment = data.get("payment");

  const product = state.products.find((item) => item.code === productCode);

  if (!id || !factory || !supplier || !product || quantity <= 0) {
    return;
  }

  const remaining = getRemainingForProduct(productCode);

  if (quantity > remaining) {
    alert("La cantidad supera el requerimiento pendiente para este producto.");
    return;
  }

  state.pims.push({
    id: subId ? `${id} / ${subId}` : id,
    subId: subId || null,
    factory,
    supplier,
    productCode,
    quantity,
    payment,
    status: "Contrato pendiente",
    totalValue: product.price * quantity,
  });

  pimForm.reset();
  saveState();
  renderPims();
  updateRequirementSelectors();
});

contractForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contractForm);
  const pimId = data.get("pim");
  const status = data.get("status");
  const startDate = data.get("startDate");
  const sla = Number(data.get("sla"));
  const notification = data.get("notification").trim();

  const pim = state.pims.find((item) => item.id === pimId);
  if (!pim) {
    return;
  }

  pim.status = status;

  const dueDate = addDays(startDate, sla);
  const now = new Date();
  const slaStatus = now > dueDate ? "Atrasado" : "En tiempo";

  const contractEntry = {
    pimId,
    status,
    sla,
    notification,
    dueDate: dueDate.toLocaleDateString("es-CO"),
    slaStatus,
    updatedAt: new Date().toLocaleString("es-CO"),
  };

  state.contracts.unshift(contractEntry);
  saveState();
  renderPims();
  renderContracts();
  contractForm.reset();
});

productTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const code = button.dataset.removeProduct;
  if (!code) {
    return;
  }
  state.products = state.products.filter((product) => product.code !== code);
  state.requirements = state.requirements.filter((req) => req.productCode !== code);
  state.pims = state.pims.filter((pim) => pim.productCode !== code);
  saveState();
  renderProducts();
  renderRequirements();
  renderPims();
  updateRequirementSelectors();
});

requirementTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const id = button.dataset.removeRequirement;
  if (!id) {
    return;
  }
  state.requirements = state.requirements.filter((req) => req.id !== id);
  saveState();
  renderRequirements();
});

pimTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const id = button.dataset.removePim;
  if (!id) {
    return;
  }
  state.pims = state.pims.filter((pim) => pim.id !== id);
  state.contracts = state.contracts.filter((contract) => contract.pimId !== id);
  saveState();
  renderPims();
  renderContracts();
  updateRequirementSelectors();
});

requirementForm.addEventListener("input", updateRequirementPreview);
pimForm.addEventListener("input", updatePimBalance);

resetDataButton.addEventListener("click", () => {
  if (confirm("¿Deseas borrar todos los datos guardados?")) {
    state.products = [];
    state.requirements = [];
    state.pims = [];
    state.contracts = [];
    saveState();
    renderProducts();
    renderRequirements();
    renderPims();
    renderContracts();
    updateRequirementSelectors();
  }
});

loadState();
renderProducts();
renderRequirements();
renderPims();
renderContracts();
updateRequirementSelectors();
