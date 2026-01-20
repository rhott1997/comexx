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
const seedDataButton = document.getElementById("seedData");
const workflowLanes = document.getElementById("workflowLanes");
const workflowUpdated = document.getElementById("workflowUpdated");
const productChart = document.getElementById("productChart");
const pimChart = document.getElementById("pimChart");

const metricTotalTons = document.getElementById("metricTotalTons");
const metricTotalValue = document.getElementById("metricTotalValue");
const metricPims = document.getElementById("metricPims");
const metricSlaRisk = document.getElementById("metricSlaRisk");

const STORAGE_KEY = "comexx-data";

const WORKFLOW_STEPS = [
  "Requerimiento aprobado",
  "PIM creado",
  "Contrato en validación",
  "Contrato validado",
  "Pago en proceso",
  "Despacho / logística",
];

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

const seedDemoData = () => {
  state.products = [
    { code: "MP-001", name: "Polímero base", price: 1200, lastImport: "2024-08-14" },
    { code: "MP-045", name: "Resina PET", price: 980, lastImport: "2024-08-09" },
    { code: "PT-210", name: "Envase premium", price: 1850, lastImport: "2024-08-01" },
  ];
  state.requirements = [
    {
      id: crypto.randomUUID(),
      productCode: "MP-001",
      productName: "Polímero base",
      quantity: 120,
      unitPrice: 1200,
      totalValue: 144000,
    },
    {
      id: crypto.randomUUID(),
      productCode: "MP-045",
      productName: "Resina PET",
      quantity: 80,
      unitPrice: 980,
      totalValue: 78400,
    },
    {
      id: crypto.randomUUID(),
      productCode: "PT-210",
      productName: "Envase premium",
      quantity: 40,
      unitPrice: 1850,
      totalValue: 74000,
    },
  ];
  state.pims = [
    {
      id: "PIM-2024-09 / PIM-2024-09-A",
      subId: "PIM-2024-09-A",
      factory: "Planta Norte",
      supplier: "Trader Andes",
      productCode: "MP-001",
      quantity: 60,
      payment: "Carta de crédito",
      status: "Contrato en validación",
      totalValue: 72000,
      workflowStep: WORKFLOW_STEPS[2],
    },
    {
      id: "PIM-2024-09 / PIM-2024-09-B",
      subId: "PIM-2024-09-B",
      factory: "Planta Caribe",
      supplier: "Trader Andes",
      productCode: "MP-045",
      quantity: 50,
      payment: "Anticipo",
      status: "Pago en proceso",
      totalValue: 49000,
      workflowStep: WORKFLOW_STEPS[4],
    },
  ];
  state.contracts = [
    {
      pimId: "PIM-2024-09 / PIM-2024-09-A",
      status: "Pendiente de revisión",
      sla: 12,
      notification: "Enviar correo a compras",
      dueDate: "2024-09-20",
      slaStatus: "En tiempo",
      updatedAt: new Date().toLocaleString("es-CO"),
    },
  ];
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

const updateWorkflowStep = (pim, status) => {
  const mapping = {
    "Pendiente de revisión": WORKFLOW_STEPS[2],
    "Contrato validado": WORKFLOW_STEPS[3],
    Observaciones: WORKFLOW_STEPS[2],
  };
  pim.workflowStep = mapping[status] || pim.workflowStep || WORKFLOW_STEPS[1];
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

const renderWorkflow = () => {
  workflowUpdated.textContent = new Date().toLocaleString("es-CO");
  workflowLanes.innerHTML = WORKFLOW_STEPS.map((step) => {
    const items = state.pims.filter((pim) => pim.workflowStep === step);
    const cards = items
      .map(
        (pim) => `
        <div class="workflow-card">
          <div>
            <h4>${pim.id}</h4>
            <span>${pim.factory} · ${pim.supplier}</span>
          </div>
          <p>${pim.productCode} · ${formatNumber(pim.quantity)} TM</p>
          <span class="status-pill">${pim.payment}</span>
        </div>`
      )
      .join("");
    return `
      <div class="workflow-lane">
        <div class="workflow-lane-header">
          <h3>${step}</h3>
          <span>${items.length}</span>
        </div>
        <div class="workflow-cards">${cards || "<p class=\"muted\">Sin PIMs</p>"}</div>
      </div>`;
  }).join("");
};

const renderCharts = () => {
  const totalTonsValue = state.requirements.reduce((sum, req) => sum + req.quantity, 0) || 1;
  productChart.innerHTML = state.requirements
    .map((req) => {
      const width = Math.round((req.quantity / totalTonsValue) * 100);
      return `
        <div class="chart-row">
          <div>
            <strong>${req.productCode}</strong>
            <span>${formatNumber(req.quantity)} TM</span>
          </div>
          <div class="chart-bar"><span style="width:${width}%"></span></div>
        </div>`;
    })
    .join("");

  const statusCounts = state.pims.reduce(
    (acc, pim) => {
      acc[pim.status] = (acc[pim.status] || 0) + 1;
      return acc;
    },
    { "Sin PIMs": 0 }
  );
  const statusKeys = Object.keys(statusCounts);
  const maxCount = Math.max(...Object.values(statusCounts), 1);
  pimChart.innerHTML = statusKeys
    .map((status) => {
      const width = Math.round((statusCounts[status] / maxCount) * 100);
      return `
        <div class="chart-row">
          <div>
            <strong>${status}</strong>
            <span>${statusCounts[status]} PIMs</span>
          </div>
          <div class="chart-bar"><span style="width:${width}%"></span></div>
        </div>`;
    })
    .join("");
};

const renderMetrics = () => {
  const totalTonsValue = state.requirements.reduce((sum, req) => sum + req.quantity, 0);
  const totalValueValue = state.requirements.reduce((sum, req) => sum + req.totalValue, 0);
  const slaRisk = state.contracts.filter((contract) => contract.slaStatus === "Atrasado").length;

  metricTotalTons.textContent = formatNumber(totalTonsValue);
  metricTotalValue.textContent = formatCurrency(totalValueValue);
  metricPims.textContent = state.pims.length;
  metricSlaRisk.textContent = slaRisk;
};

const renderAll = () => {
  renderProducts();
  renderRequirements();
  renderPims();
  renderContracts();
  renderWorkflow();
  renderCharts();
  renderMetrics();
  updateRequirementSelectors();
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
  renderAll();
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
  renderAll();
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

  const pimId = subId ? `${id} / ${subId}` : id;

  state.pims.push({
    id: pimId,
    subId: subId || null,
    factory,
    supplier,
    productCode,
    quantity,
    payment,
    status: "Contrato en validación",
    totalValue: product.price * quantity,
    workflowStep: WORKFLOW_STEPS[1],
  });

  pimForm.reset();
  saveState();
  renderAll();
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
  updateWorkflowStep(pim, status);

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
  renderAll();
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
  renderAll();
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
  renderAll();
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
  renderAll();
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
    renderAll();
  }
});

seedDataButton.addEventListener("click", () => {
  seedDemoData();
  saveState();
  renderAll();
});

const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((btn) => btn.classList.remove("active"));
    views.forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.view).classList.add("active");
  });
});

loadState();
renderAll();
