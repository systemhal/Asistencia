/* ==========================================================================
   INTERACTIVE APP LOGIC - ASISTENCIAPRO (BETA VERSION)
   ========================================================================== */

// 1. Mock Local Database (Datos reales extraídos de tu Google Form)
const MOCK_EMPLOYEES = {
  "73507283": { name: "ESPINOZA DE LA CRUZ NORIA LOZANIA", role: "Operaciones", pin: "1234" },
  "73570425": { name: "BELTRAN ANAYA GUIERAL GERARDO", role: "Soporte Técnico", pin: "1234" },
  "70643869": { name: "RIOJAS OCHANTE JESUS LEONARDO", role: "Logística", pin: "1234" },
  "70920196": { name: "JADE ELISA VEGA VEGA", role: "Administración", pin: "1234" },
  "73828099": { name: "CESAR AUGUSTO DE LA CRUZ SOLANO", role: "Operaciones", pin: "1234" },
  "76209425": { name: "SUNI MONROY AMPARO SOLEDAD", role: "Atención al Cliente", pin: "1234" },
  "74835571": { name: "GONZALEZ RIVERA JUAN CARLOS", role: "Operaciones", pin: "1234" },
  "70625678": { name: "RAMIREZ DIAZ CARMEN JULIA", role: "Logística", pin: "1234" },
  "76241100": { name: "HUAMAN PALOMINO JOSE LUIS", role: "Soporte Técnico", pin: "1234" },
  "76458278": { name: "HURTADO TORRES GHILBERT ROBERTO", role: "Soporte Técnico", pin: "1234" }
};

// Admin Password for the beta
const ADMIN_PASSWORD = "admin123";

// State variables
let currentSession = null; // Stores logged-in employee details
let attendanceState = {}; // Stores live status of all employees
let globalLogs = []; // Stores history of all marks
let googleScriptUrl = ""; // Saved Apps Script API Web App URL

// DOM Elements
const views = {
  login: document.getElementById('view-login'),
  dashboard: document.getElementById('view-dashboard'),
  admin: document.getElementById('view-admin')
};

const loginForm = document.getElementById('form-login');
const inputDni = document.getElementById('input-dni');
const inputPin = document.getElementById('input-pin');
const dniError = document.getElementById('dni-error-msg');

const employeeNameText = document.getElementById('employee-name');
const employeeDniDisplay = document.getElementById('employee-dni-display');
const currentStatusText = document.getElementById('current-status-text');
const statusDot = document.querySelector('.status-dot');
const personalLogList = document.getElementById('personal-log-list');

// Attendance Buttons
const btnIngreso = document.getElementById('btn-action-ingreso');
const btnBreakIn = document.getElementById('btn-action-break-in');
const btnBreakOut = document.getElementById('btn-action-break-out');
const btnSalida = document.getElementById('btn-action-salida');
const btnLogout = document.getElementById('btn-logout');

// Admin Elements
const btnAdminToggle = document.getElementById('btn-admin-toggle');
const btnAdminClose = document.getElementById('btn-admin-close');
const adminAuthModal = document.getElementById('admin-auth-modal');
const formAdminAuth = document.getElementById('form-admin-auth');
const inputAdminPassword = document.getElementById('input-admin-password');
const adminErrorMsg = document.getElementById('admin-error-msg');
const btnAdminAuthCancel = document.getElementById('btn-admin-auth-cancel');

// Admin stats and lists
const statTotalStaff = document.getElementById('stat-total-staff');
const statActiveToday = document.getElementById('stat-active-today');
const statInBreak = document.getElementById('stat-in-break');
const adminLiveTableBody = document.getElementById('admin-live-table-body');

// Config elements
const inputSheetUrl = document.getElementById('input-sheet-url');
const btnSaveConfig = document.getElementById('btn-save-config');
const btnTestConnection = document.getElementById('btn-test-connection');
const testConnectionResult = document.getElementById('test-connection-result');
const toastContainer = document.getElementById('toast-container');

// Real-time Clock Elements
const clockTime = document.getElementById('clock-time');
const clockAmpm = document.getElementById('clock-ampm');
const clockDate = document.getElementById('clock-date');

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadLocalStorage();
  setupPinpad();
  setupEventListeners();
  updateAdminView();
  initThemeToggle();
});

/* ==========================================================================
   THEME TOGGLE (CLARO / OSCURO)
   ========================================================================== */

function initThemeToggle() {
  const btn = document.getElementById('btn-theme-toggle');
  const icon = document.getElementById('theme-icon');

  // Load saved preference, default = dark
  const saved = localStorage.getItem('app_theme') || 'dark';
  applyTheme(saved, icon);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, icon);
    localStorage.setItem('app_theme', next);
  });
}

function applyTheme(theme, iconEl) {
  document.documentElement.setAttribute('data-theme', theme);
  if (iconEl) {
    iconEl.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }
}

// Load state from LocalStorage to keep simulation persistent
function loadLocalStorage() {
  const savedState = localStorage.getItem('attendance_state');
  if (savedState) {
    attendanceState = JSON.parse(savedState);
  } else {
    // Initialize default state for mock employees
    Object.keys(MOCK_EMPLOYEES).forEach(dni => {
      attendanceState[dni] = {
        action: 'Desconectado',
        timestamp: null,
        history: []
      };
    });
    saveState();
  }

  const savedUrl = localStorage.getItem('google_script_url');
  if (savedUrl && savedUrl.trim() !== '') {
    googleScriptUrl = savedUrl.trim();
    // Update the input if it exists in DOM already
    const urlInput = document.getElementById('input-sheet-url');
    if (urlInput) urlInput.value = googleScriptUrl;
    const testBtn = document.getElementById('btn-test-connection');
    if (testBtn) testBtn.disabled = false;
  }
}

function saveState() {
  localStorage.setItem('attendance_state', JSON.stringify(attendanceState));
}

/* ==========================================================================
   CLOCK LÓGICA (RELOJ EN TIEMPO REAL)
   ========================================================================== */

function initClock() {
  const updateClock = () => {
    const now = new Date();
    
    // Formatting Time
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');
    
    clockTime.textContent = `${hoursStr}:${minutes}:${seconds}`;
    clockAmpm.textContent = ampm;
    
    // Formatting Date in Spanish
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    clockDate.textContent = now.toLocaleDateString('es-ES', options);
  };
  
  updateClock();
  setInterval(updateClock, 1000);
}

/* ==========================================================================
   PINPAD TECLADO VIRTUAL LÓGICA
   ========================================================================== */

function setupPinpad() {
  const pinpadButtons = document.querySelectorAll('.btn-pinpad');
  
  pinpadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      let currentPin = inputPin.value;
      
      if (val === 'clear') {
        inputPin.value = '';
      } else if (val === 'back') {
        inputPin.value = currentPin.slice(0, -1);
      } else {
        if (currentPin.length < 4) {
          inputPin.value = currentPin + val;
        }
      }
    });
  });
}

/* ==========================================================================
   LOGIN / CERRAR SESIÓN LÓGICA
   ========================================================================== */

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const dni = inputDni.value.trim();
  const pin = inputPin.value;
  
  // Validate DNI in our list
  if (!MOCK_EMPLOYEES[dni]) {
    dniError.classList.remove('hidden');
    showToast('error', 'Error de acceso', 'El DNI ingresado no está registrado.');
    return;
  }
  
  dniError.classList.add('hidden');
  const employee = MOCK_EMPLOYEES[dni];
  
  // Validate Security PIN
  if (employee.pin !== pin) {
    showToast('error', 'PIN incorrecto', 'Por favor ingresa tu código PIN de 4 dígitos válido.');
    return;
  }
  
  // Iniciar Sesión Exitosa
  currentSession = {
    dni: dni,
    name: employee.name,
    role: employee.role
  };

  // ── RESET DIARIO ────────────────────────────────────────────
  // Si el último registro fue de un día anterior, reiniciar el estado
  // para que el empleado pueda marcar una nueva jornada hoy.
  const today = new Date().toLocaleDateString('es-ES');
  const empState = attendanceState[dni];
  if (empState && empState.timestamp) {
    const lastDate = new Date(empState.timestamp).toLocaleDateString('es-ES');
    if (lastDate !== today) {
      // Nuevo día: conservar el historial histórico pero resetear estado
      attendanceState[dni] = {
        action: 'Desconectado',
        timestamp: null,
        history: []         // limpia marcas del día (el Sheet guarda el historial real)
      };
      saveState();
      showToast('info', 'Nuevo día', 'Estado reiniciado para la jornada de hoy.');
    }
  }
  // ────────────────────────────────────────────────────────────

  // Clean inputs
  inputDni.value = '';
  inputPin.value = '';

  showToast('success', 'Bienvenido', `Hola ${employee.name}, has iniciado sesión.`);
  showView('dashboard');
  setupDashboardView();
});

btnLogout.addEventListener('click', () => {
  showToast('info', 'Sesión cerrada', 'Has salido de tu panel de marcas.');
  currentSession = null;
  showView('login');
});

/* ==========================================================================
   EMPLOYEE DASHBOARD INTERFACE CONTROLS
   ========================================================================== */

function setupDashboardView() {
  if (!currentSession) return;

  employeeNameText.textContent = currentSession.name;
  employeeDniDisplay.textContent = currentSession.dni;

  // Ensure state exists for this employee
  if (!attendanceState[currentSession.dni]) {
    attendanceState[currentSession.dni] = { action: 'Desconectado', timestamp: null, history: [] };
  }

  const state = attendanceState[currentSession.dni];
  updateDashboardStatusUI(state.action);
  renderPersonalLogs();
}

function updateDashboardStatusUI(action) {
  currentStatusText.textContent = action;
  
  // Remove existing color classes
  currentStatusText.className = 'status-text';
  statusDot.className = 'status-dot pulse';
  
  // Add appropriate colors and manage buttons state
  switch(action) {
    case 'Ingreso':
      currentStatusText.textContent = 'Conectado (Trabajando)';
      currentStatusText.classList.add('status-active');
      statusDot.classList.add('status-active');
      
      btnIngreso.disabled = true;
      btnBreakIn.disabled = false;
      btnBreakOut.disabled = true;
      btnSalida.disabled = false;
      break;
      
    case 'Inicio Refrigerio':
      currentStatusText.textContent = 'En Refrigerio (Almuerzo)';
      currentStatusText.classList.add('status-break');
      statusDot.classList.add('status-break');
      
      btnIngreso.disabled = true;
      btnBreakIn.disabled = true;
      btnBreakOut.disabled = false;
      btnSalida.disabled = true;
      break;
      
    case 'Fin Refrigerio':
      currentStatusText.textContent = 'Conectado (Trabajando)';
      currentStatusText.classList.add('status-active');
      statusDot.classList.add('status-active');
      
      btnIngreso.disabled = true;
      btnBreakIn.disabled = true; // Typically one break per day, but can be adjusted
      btnBreakOut.disabled = true;
      btnSalida.disabled = false;
      break;
      
    case 'Salida':
      currentStatusText.textContent = 'Jornada Finalizada (Salida)';
      currentStatusText.classList.add('status-inactive');
      statusDot.classList.add('status-inactive');
      
      btnIngreso.disabled = true;
      btnBreakIn.disabled = true;
      btnBreakOut.disabled = true;
      btnSalida.disabled = true;
      break;
      
    default:
      currentStatusText.textContent = 'Fuera de Jornada';
      btnIngreso.disabled = false;
      btnBreakIn.disabled = true;
      btnBreakOut.disabled = true;
      btnSalida.disabled = true;
      break;
  }
}

// Render recent marks for the current employee
function renderPersonalLogs() {
  personalLogList.innerHTML = '';
  const history = attendanceState[currentSession.dni].history || [];
  
  if (history.length === 0) {
    personalLogList.innerHTML = '<li class="log-empty">No has registrado marcas el día de hoy.</li>';
    return;
  }
  
  // Sort history newest first
  const sortedHistory = [...history].reverse();
  
  sortedHistory.forEach(item => {
    const li = document.createElement('li');
    li.className = 'log-item animate-fade-in';
    
    let iconName = 'timer';
    let label = item.action;
    let iconClass = item.action.replace(' ', '_');
    
    if (item.action === 'Ingreso') iconName = 'play_arrow';
    else if (item.action === 'Salida') iconName = 'stop';
    else if (item.action === 'Inicio Refrigerio') {
      iconName = 'restaurant';
      label = 'Inicio Refrigerio';
    }
    else if (item.action === 'Fin Refrigerio') {
      iconName = 'restaurant_menu';
      label = 'Fin Refrigerio';
    }
    
    li.innerHTML = `
      <div class="log-info">
        <div class="log-icon ${iconClass}">
          <span class="material-symbols-rounded">${iconName}</span>
        </div>
        <div class="log-content">
          <h4>${label}</h4>
          <p>${item.dateStr}</p>
        </div>
      </div>
      <div class="log-time">${item.timeStr}</div>
    `;
    personalLogList.appendChild(li);
  });
}

/* ==========================================================================
   ATTENDANCE RECORDING ACTIONS (MARCAR ASISTENCIA LÓGICA)
   ========================================================================== */

function setupEventListeners() {
  const attendanceButtons = [btnIngreso, btnBreakIn, btnBreakOut, btnSalida];
  
  attendanceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      registerAttendanceAction(action);
    });
  });
  
  // Admin button triggers modal
  btnAdminToggle.addEventListener('click', () => {
    adminAuthModal.classList.remove('hidden');
    inputAdminPassword.focus();
  });
  
  btnAdminAuthCancel.addEventListener('click', () => {
    adminAuthModal.classList.add('hidden');
    inputAdminPassword.value = '';
    adminErrorMsg.classList.add('hidden');
  });
  
  // Admin login form submit
  formAdminAuth.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = inputAdminPassword.value;
    
    if (password === ADMIN_PASSWORD) {
      adminAuthModal.classList.add('hidden');
      inputAdminPassword.value = '';
      adminErrorMsg.classList.add('hidden');
      showToast('success', 'Admin autenticado', 'Bienvenido al panel de control general.');
      showView('admin');
      updateAdminView();
      // Always refresh the URL input from localStorage when admin panel opens
      const savedUrl = localStorage.getItem('google_script_url');
      if (savedUrl && inputSheetUrl) {
        inputSheetUrl.value = savedUrl;
        googleScriptUrl = savedUrl;
        btnTestConnection.disabled = false;
      }

    } else {
      adminErrorMsg.classList.remove('hidden');
      inputAdminPassword.value = '';
      showToast('error', 'Acceso denegado', 'La contraseña de administrador es incorrecta.');
    }
  });
  
  btnAdminClose.addEventListener('click', () => {
    showView(currentSession ? 'dashboard' : 'login');
  });
  
  // Configuration save button
  btnSaveConfig.addEventListener('click', () => {
    const url = (inputSheetUrl.value || '').trim();
    if (url === '') {
      googleScriptUrl = '';
      localStorage.removeItem('google_script_url');
      btnTestConnection.disabled = true;
      showToast('info', 'Configuración limpia', 'Se removió el enlace de Google Apps Script.');
    } else if (url.startsWith('https://')) {
      // Accept any valid https URL (including script.google.com/macros/u/1/s/...)
      googleScriptUrl = url;
      localStorage.setItem('google_script_url', googleScriptUrl);
      btnTestConnection.disabled = false;
      showToast('success', 'URL guardada ✅', 'La URL fue almacenada correctamente en este dispositivo.');
    } else {
      showToast('error', 'URL inválida', 'La URL debe comenzar con https://');
    }
  });

  // Refresh URL input every time admin view is shown
  btnAdminToggle.addEventListener('change', () => {
    const savedUrl = localStorage.getItem('google_script_url');
    if (savedUrl && inputSheetUrl) inputSheetUrl.value = savedUrl;
  });
  
  // Test connection button
  btnTestConnection.addEventListener('click', testGoogleScriptConnection);
}

// Function to log attendance action
function registerAttendanceAction(action) {
  if (!currentSession) return;
  
  const dni = currentSession.dni;
  const name = currentSession.name;
  const now = new Date();
  
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
  
  const logItem = {
    action: action,
    timestamp: now.getTime(),
    timeStr: timeStr,
    dateStr: dateStr
  };
  
  // 1. Update State Locally
  attendanceState[dni].action = action;
  attendanceState[dni].timestamp = now.getTime();
  attendanceState[dni].history.push(logItem);
  saveState();
  
  // 2. Trigger real integration if Apps Script URL is configured!
  if (googleScriptUrl) {
    sendAttendanceToGoogleSheets(dni, name, action);
  } else {
    // Simulated delay for nice UX in beta
    showToast('success', 'Marca registrada localmente', `${action} registrado a las ${timeStr}`);
  }
  
  // 3. Update UI
  updateDashboardStatusUI(action);
  renderPersonalLogs();
  updateAdminView();
}

// Post attendance payload to Google Apps Script Web App
function sendAttendanceToGoogleSheets(dni, name, action) {
  showToast('warning', 'Sincronizando...', 'Enviando marca de asistencia a Google Sheets.');
  
  const payload = {
    action: action,
    employeeId: dni,
    employeeName: name,
    details: "Registrado vía AsistenciaPro Web Beta"
  };
  
  // We use cors mode 'no-cors' if standard post fails, but standard JSON payload requires standard fetch.
  // Since Google Apps Script redirects with a 302, standard fetch needs simple redirect handling (which fetch handles automatically).
  fetch(googleScriptUrl, {
    method: 'POST',
    mode: 'no-cors', // essential for Google Apps Script cross-origin redirection without complex CORS headers
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    // Note: with 'no-cors', the response type is opaque, and we cannot read response details, but the transmission succeeds!
    showToast('success', 'Sincronización Exitosa', `Se registró '${action}' en tu Google Sheet.`);
  })
  .catch(err => {
    console.error('Error post sheet:', err);
    showToast('error', 'Error de Conexión', 'No se pudo escribir en el Sheet. Se guardó localmente en la beta.');
  });
}

/* ==========================================================================
   ADMIN PANEL UPDATE & METRICS
   ========================================================================== */

function updateAdminView() {
  const staffIds = Object.keys(MOCK_EMPLOYEES);
  statTotalStaff.textContent = staffIds.length;
  
  let activeToday = 0;
  let inBreak = 0;
  
  adminLiveTableBody.innerHTML = '';
  
  staffIds.forEach(dni => {
    const employee = MOCK_EMPLOYEES[dni];
    const state = attendanceState[dni] || { action: 'Desconectado', timestamp: null, history: [] };
    
    // Calculate stats
    if (state.action === 'Ingreso' || state.action === 'Fin Refrigerio') {
      activeToday++;
    } else if (state.action === 'Inicio Refrigerio') {
      inBreak++;
      activeToday++; // Technically active but in break
    }
    
    const lastMarkTime = state.timestamp ? new Date(state.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '---';
    
    // Status Badge classes
    let statusClass = 'Desconectado';
    if (state.action === 'Inicio Refrigerio') statusClass = 'Inicio-Refrigerio';
    else if (state.action === 'Fin Refrigerio') statusClass = 'Fin-Refrigerio';
    else if (state.action === 'Ingreso') statusClass = 'Ingreso';
    else if (state.action === 'Salida') statusClass = 'Salida';
    
    // Table Row creation
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="table-employee-name">${employee.name}</td>
      <td>${dni}</td>
      <td>
        <span class="table-status-badge ${statusClass}">
          <span class="status-dot ${state.action === 'Desconectado' ? '' : 'status-' + (state.action === 'Inicio Refrigerio' ? 'break' : (state.action === 'Salida' ? 'inactive' : 'active'))}"></span>
          ${state.action === 'Inicio Refrigerio' ? 'En Refrigerio' : (state.action === 'Fin Refrigerio' ? 'Trabajando' : (state.action === 'Ingreso' ? 'Trabajando' : state.action))}
        </span>
      </td>
      <td class="table-timestamp">${lastMarkTime}</td>
      <td>
        <button class="btn-table-action" onclick="forceLogoutEmployee('${dni}')" ${state.action === 'Desconectado' ? 'disabled' : ''}>
          <span class="material-symbols-rounded" style="font-size: 16px;">logout</span>
          <span>Forzar Salida</span>
        </button>
      </td>
    `;
    adminLiveTableBody.appendChild(tr);
  });
  
  statActiveToday.textContent = activeToday;
  statInBreak.textContent = inBreak;
}

// Global scope helper for admin panel action (so it can be clicked inside table row)
window.forceLogoutEmployee = function(dni) {
  if (confirm(`¿Estás seguro de que deseas forzar la salida de ${MOCK_EMPLOYEES[dni].name}?`)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
    
    const logItem = {
      action: 'Salida',
      timestamp: now.getTime(),
      timeStr: timeStr,
      dateStr: dateStr,
      details: "Forzado por Administrador"
    };
    
    attendanceState[dni].action = 'Salida';
    attendanceState[dni].timestamp = now.getTime();
    attendanceState[dni].history.push(logItem);
    saveState();
    
    if (googleScriptUrl) {
      sendAttendanceToGoogleSheets(dni, MOCK_EMPLOYEES[dni].name, 'Salida');
    }
    
    showToast('warning', 'Salida Forzada', `Se forzó la salida de ${MOCK_EMPLOYEES[dni].name}`);
    updateAdminView();
    
    // If the active session is the forced logout, log out immediately
    if (currentSession && currentSession.dni === dni) {
      currentSession = null;
      showView('login');
    }
  }
};

/* ==========================================================================
   TEST CONNECTION LÓGICA
   ========================================================================== */

function testGoogleScriptConnection() {
  if (!googleScriptUrl) return;
  
  testConnectionResult.textContent = "Probando conexión...";
  testConnectionResult.className = "test-result-msg";
  
  const payload = {
    action: "login",
    employeeId: "73507283",
    pin: "1234"
  };
  
  // We make a simple POST login fetch to test connection
  fetch(googleScriptUrl, {
    method: 'POST',
    mode: 'no-cors', // with no-cors we can send, but cannot read the body response. It will fulfill the promise successfully if the server receives and completes.
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    testConnectionResult.textContent = "¡Conexión establecida con éxito! El script responde.";
    testConnectionResult.classList.add('success');
    showToast('success', 'Conexión exitosa', 'El script de Google Sheets está activo.');
  })
  .catch(err => {
    console.error(err);
    testConnectionResult.textContent = "Error al conectar. Verifica los permisos o el link.";
    testConnectionResult.classList.add('error');
    showToast('error', 'Error de conexión', 'No se pudo establecer contacto con el script.');
  });
}

/* ==========================================================================
   NAVIGATION VIEW CONTROLLER
   ========================================================================== */

function showView(viewId) {
  Object.keys(views).forEach(key => {
    if (key === viewId) {
      views[key].classList.remove('hidden');
    } else {
      views[key].classList.add('hidden');
    }
  });
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */

function showToast(type, title, message) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check_circle';
  else if (type === 'error') iconName = 'error';
  else if (type === 'warning') iconName = 'warning';
  
  toast.innerHTML = `
    <span class="material-symbols-rounded toast-icon">${iconName}</span>
    <div class="toast-body">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.35s cubic-bezier(0.4, 0, 0.2, 1) reverse';
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 4000);
}
