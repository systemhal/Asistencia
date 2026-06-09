/* ==========================================================================
   INTERACTIVE APP LOGIC - ASISTENCIAPRO (BETA VERSION)
   ========================================================================== */

// 1. Base de Datos Inicial (Datos por defecto si el LocalStorage está vacío)
const DEFAULT_EMPLOYEES = {
  "73507283": { name: "ESPINOZA DE LA CRUZ NORIA LOZANIA", role: "Operaciones", age: 30, gender: "Femenino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "73570425": { name: "BELTRAN ANAYA GUIERAL GERARDO", role: "Soporte Técnico", age: 25, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "70643869": { name: "RIOJAS OCHANTE JESUS LEONARDO", role: "Logística", age: 28, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "70920196": { name: "JADE ELISA VEGA VEGA", role: "Administración", age: 24, gender: "Femenino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "73828099": { name: "CESAR AUGUSTO DE LA CRUZ SOLANO", role: "Operaciones", age: 33, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "76209425": { name: "SUNI MONROY AMPARO SOLEDAD", role: "Atención al Cliente", age: 29, gender: "Femenino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "74835571": { name: "GONZALEZ RIVERA JUAN CARLOS", role: "Operaciones", age: 31, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "70625678": { name: "RAMIREZ DIAZ CARMEN JULIA", role: "Logística", age: 35, gender: "Femenino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "76241100": { name: "HUAMAN PALOMINO JOSE LUIS", role: "Soporte Técnico", age: 27, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" },
  "76458278": { name: "HURTADO TORRES GHILBERT ROBERTO", role: "Soporte Técnico", age: 32, gender: "Masculino", pin: "1234", workStart: "08:00", workEnd: "17:00", breakStart: "13:00", breakEnd: "14:00" }
};

// Variable global dinámica que reemplaza a MOCK_EMPLOYEES
let employeesDatabase = {};

// Admin Password for the beta
const ADMIN_PASSWORD = "admin123";

// State variables
let currentSession = null; 
let attendanceState = {}; 
let globalLogs = []; 
let googleScriptUrl = ""; 
let tardinessTolerance = 5; 
let cachedAgentHistory = [];
let cachedConsolidatedHistory = []; 

// ... (Las variables de DOM Elements se quedan exactamente igual) ...

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
  setupAdminTabs();
  setupEditModalListeners();
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
  // Cargar base de datos de empleados
  const savedEmployees = localStorage.getItem('employees_db');
  if (savedEmployees) {
    employeesDatabase = JSON.parse(savedEmployees);
    // Migración: Asegurarse de que todos los empleados tengan horarios
    let needsSave = false;
    Object.keys(employeesDatabase).forEach(dni => {
      if (!employeesDatabase[dni].workStart) {
        employeesDatabase[dni].workStart = "08:00";
        employeesDatabase[dni].workEnd = "17:00";
        employeesDatabase[dni].breakStart = "13:00";
        employeesDatabase[dni].breakEnd = "14:00";
        needsSave = true;
      }
    });
    if (needsSave) {
      localStorage.setItem('employees_db', JSON.stringify(employeesDatabase));
    }
  } else {
    employeesDatabase = { ...DEFAULT_EMPLOYEES };
    localStorage.setItem('employees_db', JSON.stringify(employeesDatabase));
  }

  // Cargar estados de asistencia
  const savedState = localStorage.getItem('attendance_state');
  if (savedState) {
    attendanceState = JSON.parse(savedState);
  } else {
    Object.keys(employeesDatabase).forEach(dni => {
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
    const urlInput = document.getElementById('input-sheet-url');
    if (urlInput) urlInput.value = googleScriptUrl;
    const testBtn = document.getElementById('btn-test-connection');
    if (testBtn) testBtn.disabled = false;
  }

  // Cargar tolerancia de tardanza
  const savedTolerance = localStorage.getItem('tardiness_tolerance');
  if (savedTolerance !== null) {
    tardinessTolerance = parseInt(savedTolerance, 10);
  } else {
    tardinessTolerance = 5;
  }
  const toleranceInput = document.getElementById('input-tardiness-tolerance');
  if (toleranceInput) {
    toleranceInput.value = tardinessTolerance;
  }
}

function saveState() {
  localStorage.setItem('attendance_state', JSON.stringify(attendanceState));
  localStorage.setItem('employees_db', JSON.stringify(employeesDatabase));
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
  if (!employeesDatabase[dni]) {
    dniError.classList.remove('hidden');
    showToast('error', 'Error de acceso', 'El DNI ingresado no está registrado.');
    return;
  }
  
  dniError.classList.add('hidden');
  const employee = employeesDatabase[dni];
  
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
      // Nuevo día: conservar el historial histórico pero resetear estado actual
      attendanceState[dni].action = 'Desconectado';
      attendanceState[dni].timestamp = null;
      // NO vaciamos history para conservar reportes históricos locales!
      saveState();
      showToast('info', 'Nuevo día', 'Estado de marcas reiniciado para hoy.');
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

// Render recent marks for the current employee (only for today)
function renderPersonalLogs() {
  personalLogList.innerHTML = '';
  const allHistory = attendanceState[currentSession.dni].history || [];
  const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const history = allHistory.filter(item => item.dateStr === todayStr);
  
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
    showToast('success', 'Marca registrada localmente', `${action} registrado a las ${timeStr}`);
  }
  
  // 3. Update UI
  updateDashboardStatusUI(action);
  renderPersonalLogs();
  updateAdminView();
}
// Enviar nuevo empleado a Google Sheets
function sendRegistrationToGoogleSheets(dni, name, age, gender, role, workStart, workEnd, breakStart, breakEnd) {
  // Si no hay URL de Sheet configurada, no hace nada
  if (!googleScriptUrl) return; 

  showToast('warning', 'Sincronizando...', 'Guardando nuevo personal en Google Sheets.');
  
  const payload = {
    action: "Registrar_Personal", // Acción específica para que tu Sheet sepa qué hacer
    employeeId: dni,
    employeeName: name,
    age: age,
    gender: gender,
    role: role,
    workStart: workStart,
    workEnd: workEnd,
    breakStart: breakStart,
    breakEnd: breakEnd
  };
  
  fetch(googleScriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    showToast('success', 'Guardado en la Nube ☁️', `${name} se guardó en tu Google Sheet.`);
  })
  .catch(err => {
    console.error('Error guardando personal:', err);
    showToast('error', 'Error de Nube', 'No se pudo guardar en el Sheet. Se guardó localmente.');
  });
}

// Sincronizar edición de empleado en Google Sheets
function sendUpdateToGoogleSheets(dni, name, role, workStart, workEnd, breakStart, breakEnd) {
  if (!googleScriptUrl) return;

  const employee = employeesDatabase[dni] || {};
  const age = employee.age || "—";
  const gender = employee.gender || "—";

  showToast('warning', 'Sincronizando...', 'Actualizando horarios en Google Sheets.');
  
  const payload = {
    action: "Editar_Personal",
    employeeId: dni,
    employeeName: name,
    age: age,
    gender: gender,
    role: role,
    workStart: workStart,
    workEnd: workEnd,
    breakStart: breakStart,
    breakEnd: breakEnd
  };
  
  fetch(googleScriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    showToast('success', 'Nube Actualizada ☁️', `${name} se actualizó en tu Google Sheet.`);
  })
  .catch(err => {
    console.error('Error actualizando personal:', err);
    showToast('error', 'Error de Nube', 'No se pudo actualizar en el Sheet.');
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
    const toleranceInput = document.getElementById('input-tardiness-tolerance');
    
    if (toleranceInput) {
      const tolVal = parseInt(toleranceInput.value, 10);
      if (!isNaN(tolVal) && tolVal >= 0) {
        tardinessTolerance = tolVal;
        localStorage.setItem('tardiness_tolerance', tardinessTolerance);
      }
    }

    let urlMessage = "";
    if (url === '') {
      googleScriptUrl = '';
      localStorage.removeItem('google_script_url');
      btnTestConnection.disabled = true;
      urlMessage = 'Se removió el enlace de Google Apps Script.';
    } else if (url.startsWith('https://')) {
      googleScriptUrl = url;
      localStorage.setItem('google_script_url', googleScriptUrl);
      btnTestConnection.disabled = false;
      urlMessage = 'La URL fue almacenada correctamente.';
    } else {
      showToast('error', 'URL inválida', 'La URL debe comenzar con https://');
      return;
    }

    showToast('success', 'Configuración guardada ✅', `${urlMessage} Tolerancia de tardanza establecida en ${tardinessTolerance} minutos.`);
    
    // Actualizar reportes visibles de inmediato
    const select = document.getElementById('select-report-employee');
    if (select && select.value) {
      renderAgentReport(select.value);
    }
    loadConsolidatedReport();
  });

  // Dynamic change listener for tardiness tolerance input
  const toleranceInput = document.getElementById('input-tardiness-tolerance');
  if (toleranceInput) {
    toleranceInput.addEventListener('change', () => {
      const tolVal = parseInt(toleranceInput.value, 10);
      if (!isNaN(tolVal) && tolVal >= 0) {
        tardinessTolerance = tolVal;
        localStorage.setItem('tardiness_tolerance', tardinessTolerance);
        
        const select = document.getElementById('select-report-employee');
        if (select && select.value) {
          renderAgentReport(select.value);
        }
        loadConsolidatedReport();
      }
    });
  }

  // Button hooks for Exports and PDF
  const btnExportAgentCsv = document.getElementById('btn-export-agent-csv');
  if (btnExportAgentCsv) {
    btnExportAgentCsv.addEventListener('click', exportAgentReportCSV);
  }

  const btnExportAgentPdf = document.getElementById('btn-export-agent-pdf');
  if (btnExportAgentPdf) {
    btnExportAgentPdf.addEventListener('click', () => {
      const select = document.getElementById('select-report-employee');
      if (!select || !select.value) {
        showToast('warning', 'Selecciona colaborador', 'Primero debes elegir un colaborador para imprimir su reporte.');
        return;
      }
      window.print();
    });
  }

  const btnExportConsolidatedCsv = document.getElementById('btn-export-consolidated-csv');
  if (btnExportConsolidatedCsv) {
    btnExportConsolidatedCsv.addEventListener('click', exportConsolidatedCSV);
  }

  // Refresh URL input every time admin view is shown
  btnAdminToggle.addEventListener('change', () => {
    const savedUrl = localStorage.getItem('google_script_url');
    if (savedUrl && inputSheetUrl) inputSheetUrl.value = savedUrl;
  });
  
  // Test connection button
  btnTestConnection.addEventListener('click', testGoogleScriptConnection);

  // Lógica para registrar nuevo colaborador (Admin) - AHORA EN EL LUGAR CORRECTO
  const formRegisterEmployee = document.getElementById('form-register-employee');
  if (formRegisterEmployee) {
    formRegisterEmployee.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const dni = document.getElementById('reg-dni').value.trim();
      const name = document.getElementById('reg-name').value.trim().toUpperCase();
      const age = parseInt(document.getElementById('reg-age').value);
      const gender = document.getElementById('reg-gender').value;
      const role = document.getElementById('reg-role').value.trim();
      
      // Nuevos campos de horario
      const workStart = document.getElementById('reg-work-start').value;
      const workEnd = document.getElementById('reg-work-end').value;
      const breakStart = document.getElementById('reg-break-start').value;
      const breakEnd = document.getElementById('reg-break-end').value;

      // Validar si el DNI ya existe
      if (employeesDatabase[dni]) {
        showToast('error', 'DNI Duplicado', 'Este número de DNI ya está registrado en el sistema.');
        return;
      }

      // 1. Guardar en la base de datos dinámica
      employeesDatabase[dni] = {
        name: name,
        role: role,
        age: age,
        gender: gender,
        pin: "1234", // PIN por defecto para la beta
        workStart: workStart,
        workEnd: workEnd,
        breakStart: breakStart,
        breakEnd: breakEnd
      };

      // 2. Inicializar su estado de asistencia básico
      attendanceState[dni] = {
        action: 'Desconectado',
        timestamp: null,
        history: []
      };

      // 3. Persistir datos y actualizar vista del Admin
      saveState();
      updateAdminView();
      if (googleScriptUrl) {
         sendRegistrationToGoogleSheets(dni, name, age, gender, role, workStart, workEnd, breakStart, breakEnd);
      }
      
      // Limpiar formulario y lanzar éxito
      formRegisterEmployee.reset();
      
      // Reestablecer valores por defecto de tiempo
      document.getElementById('reg-work-start').value = "08:00";
      document.getElementById('reg-work-end').value = "17:00";
      document.getElementById('reg-break-start').value = "13:00";
      document.getElementById('reg-break-end').value = "14:00";
      
      showToast('success', 'Registro Exitoso ✅', `${name} ha sido agregado con éxito.`);
    });
  }
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

/* ==========================================================================
   ADMIN PANEL UPDATE & METRICS
   ========================================================================== */

function updateAdminView() {
  const staffIds = Object.keys(employeesDatabase);
  statTotalStaff.textContent = staffIds.length;
  
  let activeToday = 0;
  let inBreak = 0;
  
  adminLiveTableBody.innerHTML = '';
  
  staffIds.forEach(dni => {
    // CORREGIDO: MOCK_EMPLOYEES cambiado a employeesDatabase
    const employee = employeesDatabase[dni]; 
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
        <div style="display: flex; gap: 8px; align-items: center; white-space: nowrap;">
          <button class="btn-table-action" onclick="forceLogoutEmployee('${dni}')" ${state.action === 'Desconectado' ? 'disabled' : ''} style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span class="material-symbols-rounded" style="font-size: 16px;">logout</span>
            <span>Forzar Salida</span>
          </button>
          <button class="btn-table-action" onclick="openEditEmployeeModal('${dni}')" style="display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span class="material-symbols-rounded" style="font-size: 16px;">edit</span>
            <span>Editar</span>
          </button>
          <button class="btn-table-action" onclick="deleteEmployee('${dni}')" style="display: inline-flex; align-items: center; gap: 4px; color: #ff4d4d; border-color: #ff4d4d; white-space: nowrap;">
            <span class="material-symbols-rounded" style="font-size: 16px;">delete</span>
            <span>Eliminar</span>
          </button>
        </div>
      </td>
    `;
    adminLiveTableBody.appendChild(tr);
  });
  
  statActiveToday.textContent = activeToday;
  statInBreak.textContent = inBreak;
  
  // Actualizar la lista del selector de reportes
  updateReportEmployeeSelect();
}

// Global scope helper for admin panel action (so it can be clicked inside table row)
window.forceLogoutEmployee = function(dni) {
  if (confirm(`¿Estás seguro de que deseas forzar la salida de ${employeesDatabase[dni].name}?`)) {
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
      sendAttendanceToGoogleSheets(dni, employeesDatabase[dni].name, 'Salida');
    }
    
    // CORREGIDO: MOCK_EMPLOYEES cambiado a employeesDatabase
    showToast('warning', 'Salida Forzada', `Se forzó la salida de ${employeesDatabase[dni].name}`);
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

// Lógica para ELIMINAR a un empleado del sistema (Movida fuera de showToast)
window.deleteEmployee = function(dni) {
  const empName = employeesDatabase[dni].name;
  
  if (confirm(`⚠️ ¿Estás seguro de que deseas ELIMINAR a ${empName} del sistema?\nYa no podrá iniciar sesión.`)) {
    // 1. Borrar de la base de datos local
    delete employeesDatabase[dni];
    delete attendanceState[dni];
    saveState();
    
    // 2. Actualizar la vista del administrador
    updateAdminView();
    showToast('success', 'Personal Eliminado', `${empName} fue retirado del sistema.`);
    
    // 3. Enviar orden a Google Sheets para borrarlo de la pestaña "Personal"
    if (googleScriptUrl) {
      const payload = {
        action: "Eliminar_Personal",
        employeeId: dni
      };
      
      fetch(googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  }
};

/* ==========================================================================
   REPORTES POR AGENTE - LÓGICA DE TIEMPOS Y REPORTES
   ========================================================================== */

// Funciones de normalización de fecha y hora para datos de Google Sheets
function parseDayMonthYear(s) {
  const parts = s.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return { day, month, year };
    }
  }
  return null;
}

function normalizeDateStr(dateStr) {
  if (!dateStr) return '---';
  const s = String(dateStr).trim();
  
  // Si ya tiene formato DD/MM/YYYY o D/M/YYYY
  if (s.includes('/')) {
    const parsed = parseDayMonthYear(s);
    if (parsed) {
      const day = String(parsed.day).padStart(2, '0');
      const month = String(parsed.month).padStart(2, '0');
      return `${day}/${month}/${parsed.year}`;
    }
  }
  
  // Si es un formato ISO o similar, intentar parsear
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    console.error("Error al normalizar fecha:", dateStr, e);
  }
  
  return s;
}

function normalizeTimeStr(timeStr) {
  if (!timeStr) return '---';
  const s = String(timeStr).trim().toLowerCase();
  
  // Si contiene am/pm o es un formato de texto de hora, y no es un ISO timestamp (que contiene 't')
  if (!s.includes('t') && (s.includes('m') || s.includes(':'))) {
    const match = s.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : 0;
      
      const isPm = s.includes('p.m.') || s.includes('pm') || s.includes('p. m.');
      const isAm = s.includes('a.m.') || s.includes('am') || s.includes('a. m.');
      
      if (isPm) {
        if (hours < 12) {
          hours += 12;
        }
      } else if (isAm) {
        if (hours === 12) {
          hours = 0;
        }
      }
      
      const hrStr = String(hours).padStart(2, '0');
      const minStr = String(minutes).padStart(2, '0');
      const secStr = String(seconds).padStart(2, '0');
      
      return `${hrStr}:${minStr}:${secStr}`;
    }
  }
  
  // Si es un formato ISO de Apps Script (1899-12-30...), intentar parsear
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  } catch (e) {
    console.error("Error al normalizar hora:", timeStr, e);
  }
  
  return timeStr;
}

function getTimestampFromDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return 0;
  const dateParts = dateStr.split('/');
  const timeParts = timeStr.split(':');
  if (dateParts.length === 3 && timeParts.length >= 2) {
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 0-indexado
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
    
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  return 0;
}

// Validar si una fecha DD/MM/YYYY está dentro de un rango de inputs date (YYYY-MM-DD)
function isDateInRange(dateStr, startVal, endVal) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return true;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  
  if (startVal) {
    const sParts = startVal.split('-');
    const sDate = new Date(sParts[0], sParts[1] - 1, sParts[2]);
    if (dateObj.getTime() < sDate.getTime()) return false;
  }
  
  if (endVal) {
    const eParts = endVal.split('-');
    const eDate = new Date(eParts[0], eParts[1] - 1, eParts[2]);
    if (dateObj.getTime() > eDate.getTime()) return false;
  }
  
  return true;
}

// Convertir hora "HH:MM" a minutos transcurridos
function timeStrToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Formatear minutos transcurridos a "Xh Ym"
function formatMinutesToDuration(minutes) {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Lógica para calcular tiempos reales trabajados y breaks por día
function calculateWorkedTimesForDate(historyForDate, config, dateStr) {
  const ingresoMark = historyForDate.find(h => h.action === 'Ingreso');
  const breakInMark = historyForDate.find(h => h.action === 'Inicio Refrigerio');
  const breakOutMark = historyForDate.find(h => h.action === 'Fin Refrigerio');
  const salidaMark = historyForDate.find(h => h.action === 'Salida');

  if (!ingresoMark) {
    return {
      entradaReal: '---',
      breakReal: '---',
      salidaReal: '---',
      breakMinutes: 0,
      workedMinutes: 0,
      status: 'No ingresó',
      diffMinutes: 0,
      diffClass: 'diff-neutral',
      tardiness: false
    };
  }

  const entradaReal = ingresoMark.timeStr;
  const salidaReal = salidaMark ? salidaMark.timeStr : (dateStr === new Date().toLocaleDateString('es-ES') ? 'En curso' : 'Sin salida');
  
  let breakReal = '---';
  let breakMinutes = 0;
  if (breakInMark) {
    if (breakOutMark) {
      breakReal = `${breakInMark.timeStr} → ${breakOutMark.timeStr}`;
      breakMinutes = Math.max(0, Math.floor((breakOutMark.timestamp - breakInMark.timestamp) / (1000 * 60)));
    } else {
      if (dateStr === new Date().toLocaleDateString('es-ES')) {
        breakReal = `${breakInMark.timeStr} → En curso`;
        breakMinutes = Math.max(0, Math.floor((Date.now() - breakInMark.timestamp) / (1000 * 60)));
      } else {
        breakReal = `${breakInMark.timeStr} → Sin fin`;
        breakMinutes = 0;
      }
    }
  }

  let totalElapsedMinutes = 0;
  if (salidaMark) {
    totalElapsedMinutes = Math.floor((salidaMark.timestamp - ingresoMark.timestamp) / (1000 * 60));
  } else if (dateStr === new Date().toLocaleDateString('es-ES')) {
    totalElapsedMinutes = Math.floor((Date.now() - ingresoMark.timestamp) / (1000 * 60));
  } else {
    const lastMark = historyForDate[historyForDate.length - 1];
    totalElapsedMinutes = Math.floor((lastMark.timestamp - ingresoMark.timestamp) / (1000 * 60));
  }

  const workedMinutes = Math.max(0, totalElapsedMinutes - breakMinutes);

  // Expectativas teóricas
  const expectedStart = timeStrToMinutes(config.workStart || "08:00");
  const expectedEnd = timeStrToMinutes(config.workEnd || "17:00");
  const expectedBreakStart = timeStrToMinutes(config.breakStart || "13:00");
  const expectedBreakEnd = timeStrToMinutes(config.breakEnd || "14:00");
  const expectedBreak = Math.max(0, expectedBreakEnd - expectedBreakStart);
  const expectedWork = Math.max(0, (expectedEnd - expectedStart) - expectedBreak);

  let diffMinutes = 0;
  let diffClass = 'diff-neutral';
  let status = '---';

  if (salidaMark) {
    diffMinutes = workedMinutes - expectedWork;
    if (diffMinutes > 0) {
      status = `+${formatMinutesToDuration(diffMinutes)}`;
      diffClass = 'diff-positive';
    } else if (diffMinutes < 0) {
      status = `-${formatMinutesToDuration(Math.abs(diffMinutes))}`;
      diffClass = 'diff-negative';
    } else {
      status = 'Completo';
      diffClass = 'diff-neutral';
    }
  } else {
    status = 'En curso';
    diffClass = 'diff-neutral';
  }

  // Evaluar tardanza
  const actualEntryMinutes = timeStrToMinutes(entradaReal);
  const scheduledEntryMinutes = timeStrToMinutes(config.workStart || "08:00");
  const tardiness = actualEntryMinutes > (scheduledEntryMinutes + tardinessTolerance);

  // Evaluar exceso de break
  let excessBreakMinutes = 0;
  let hasExcessBreak = false;
  if (breakMinutes > expectedBreak) {
    excessBreakMinutes = breakMinutes - expectedBreak;
    hasExcessBreak = true;
  }

  return {
    entradaReal,
    breakReal,
    salidaReal,
    breakMinutes,
    workedMinutes,
    status,
    diffMinutes,
    diffClass,
    tardiness,
    excessBreakMinutes,
    hasExcessBreak
  };
}

// Poblar dropdown de selección para el reporte
function updateReportEmployeeSelect() {
  const select = document.getElementById('select-report-employee');
  if (!select) return;
  
  const currentVal = select.value;
  select.innerHTML = '<option value="" disabled selected hidden>Seleccionar colaborador...</option>';
  
  Object.keys(employeesDatabase).forEach(dni => {
    const employee = employeesDatabase[dni];
    const opt = document.createElement('option');
    opt.value = dni;
    opt.textContent = `${employee.name} (DNI: ${dni})`;
    select.appendChild(opt);
  });
  
  if (currentVal && employeesDatabase[currentVal]) {
    select.value = currentVal;
  }
}

// Renderizar tabla de reportes históricos del colaborador seleccionado
function renderAgentReport(dni) {
  const tbody = document.getElementById('admin-report-table-body');
  const summaryDiv = document.getElementById('report-schedule-summary');
  if (!tbody || !summaryDiv) return;

  const employee = employeesDatabase[dni];
  if (!employee) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 25px;">Colaborador no encontrado.</td></tr>';
    return;
  }

  // Mostrar título del colaborador en el reporte para visualización y PDF
  const titleDiv = document.getElementById('report-employee-title');
  const nameDisplay = document.getElementById('report-employee-name-display');
  if (titleDiv && nameDisplay) {
    nameDisplay.textContent = `${employee.name} (DNI: ${dni}) - ${employee.role}`;
    titleDiv.classList.remove('hidden');
  }

  // Rellenar cabecera de impresión formal
  const printName = document.getElementById('print-emp-name');
  const printDni = document.getElementById('print-emp-dni');
  const printRole = document.getElementById('print-emp-role');
  if (printName && printDni && printRole) {
    printName.textContent = employee.name;
    printDni.textContent = dni;
    printRole.textContent = employee.role;
  }

  // Detalles planificados
  const expectedStart = timeStrToMinutes(employee.workStart || "08:00");
  const expectedEnd = timeStrToMinutes(employee.workEnd || "17:00");
  const expectedBreakStart = timeStrToMinutes(employee.breakStart || "13:00");
  const expectedBreakEnd = timeStrToMinutes(employee.breakEnd || "14:00");
  const expectedBreak = Math.max(0, expectedBreakEnd - expectedBreakStart);
  const expectedWork = Math.max(0, (expectedEnd - expectedStart) - expectedBreak);

  summaryDiv.innerHTML = `
    <div class="report-schedule-item">
      <h4>Entrada Planificada</h4>
      <p>${employee.workStart || "08:00"}</p>
    </div>
    <div class="report-schedule-item">
      <h4>Salida Planificada</h4>
      <p>${employee.workEnd || "17:00"}</p>
    </div>
    <div class="report-schedule-item">
      <h4>Refrigerio Planificado</h4>
      <p>${employee.breakStart || "13:00"} a ${employee.breakEnd || "14:00"} (${formatMinutesToDuration(expectedBreak)})</p>
    </div>
    <div class="report-schedule-item">
      <h4>Jornada Completa</h4>
      <p>${formatMinutesToDuration(expectedWork)} netos</p>
    </div>
  `;

  const state = attendanceState[dni] || { history: [] };
  const localHistory = state.history || [];

  if (googleScriptUrl) {
    // Mostrar mensaje de carga con animación
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 30px;"><span class="animate-pulse" style="display: inline-flex; align-items: center; gap: 8px;"><span class="material-symbols-rounded animate-spin">sync</span> Cargando historial desde Google Sheets...</span></td></tr>';
    
    // Consultar el historial real al script de Google
    fetch(`${googleScriptUrl}?action=get_history&dni=${dni}`)
      .then(res => res.json())
      .then(res => {
        if (res.status === "ok" && Array.isArray(res.data)) {
          cachedAgentHistory = res.data;
        } else {
          cachedAgentHistory = localHistory;
        }
        renderReportTable(cachedAgentHistory, employee);
      })
      .catch(err => {
        console.error("Error cargando historial de nube:", err);
        cachedAgentHistory = localHistory;
        renderReportTable(cachedAgentHistory, employee);
      });
  } else {
    cachedAgentHistory = localHistory;
    renderReportTable(cachedAgentHistory, employee);
  }
}

// Función auxiliar para construir la tabla del reporte
function renderReportTable(history, employee) {
  const tbody = document.getElementById('admin-report-table-body');
  if (!tbody) return;

  if (!history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 25px;">No se registran marcas de asistencia históricas para este colaborador.</td></tr>';
    return;
  }

  // Normalizar marcas del historial y calcular timestamps a partir de la fecha y hora
  const normalizedHistory = history.map(item => {
    const normDate = normalizeDateStr(item.dateStr);
    const normTime = normalizeTimeStr(item.timeStr);
    const ts = getTimestampFromDateAndTime(normDate, normTime);
    return {
      ...item,
      dateStr: normDate,
      timeStr: normTime,
      timestamp: ts
    };
  });

  // Filtrar por rango de fechas
  const startDate = document.getElementById('report-start-date')?.value || '';
  const endDate = document.getElementById('report-end-date')?.value || '';
  
  const filteredHistory = normalizedHistory.filter(item => {
    return isDateInRange(item.dateStr, startDate, endDate);
  });

  if (filteredHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 25px;">No hay marcas registradas para el rango de fechas seleccionado.</td></tr>';
    return;
  }

  // Agrupar por fecha
  const groupedByDate = {};
  filteredHistory.forEach(item => {
    if (!groupedByDate[item.dateStr]) {
      groupedByDate[item.dateStr] = [];
    }
    groupedByDate[item.dateStr].push(item);
  });

  // Ordenar fechas descendente
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
    const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
    return dateB - dateA;
  });

  tbody.innerHTML = '';
  sortedDates.forEach(dateStr => {
    const dayMarks = groupedByDate[dateStr].sort((a, b) => a.timestamp - b.timestamp);
    const report = calculateWorkedTimesForDate(dayMarks, employee, dateStr);
    
    const tardinessBadge = report.tardiness 
      ? `<span class="badge-tardiness"><span class="material-symbols-rounded">warning</span>Tardanza</span>` 
      : '';

    const excessBreakBadge = report.hasExcessBreak 
      ? `<span class="badge-excess-break"><span class="material-symbols-rounded">warning</span>Exceso: ${report.excessBreakMinutes}m</span>` 
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${dateStr}</td>
      <td class="table-timestamp text-center">${report.entradaReal}${tardinessBadge}</td>
      <td class="text-center" style="white-space: nowrap;">${report.breakReal}</td>
      <td class="table-timestamp text-center">${report.salidaReal}</td>
      <td class="text-center" style="white-space: nowrap;">${report.breakMinutes > 0 ? formatMinutesToDuration(report.breakMinutes) : '0m'}${excessBreakBadge}</td>
      <td class="text-center" style="font-weight: 600; color: var(--text-primary); white-space: nowrap;">${report.workedMinutes > 0 ? formatMinutesToDuration(report.workedMinutes) : '0m'}</td>
      <td class="text-center" style="white-space: nowrap;">
        <span class="${report.diffClass}">${report.status}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Lógica del Reporte Consolidado (Resumen General) ---

function fetchAllHistoryFromGoogleSheets() {
  return fetch(`${googleScriptUrl}?action=get_history`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "ok" && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error("Respuesta inválida o script antiguo");
    })
    .catch(err => {
      console.warn("Fallo en get_history global. Intentando carga paralela...", err);
      const dniList = Object.keys(employeesDatabase);
      const promises = dniList.map(dni => 
        fetch(`${googleScriptUrl}?action=get_history&dni=${dni}`)
          .then(res => res.json())
          .then(res => {
            if (res.status === "ok" && Array.isArray(res.data)) {
              return res.data.map(item => ({ ...item, dni: dni }));
            }
            return [];
          })
          .catch(() => [])
      );
      return Promise.all(promises).then(results => results.flat());
    });
}

function fetchAllHistoryLocal() {
  const history = [];
  Object.keys(employeesDatabase).forEach(dni => {
    const state = attendanceState[dni] || { history: [] };
    (state.history || []).forEach(item => {
      history.push({
        ...item,
        dni: dni
      });
    });
  });
  return Promise.resolve(history);
}

function renderConsolidatedTable(history) {
  const thead = document.getElementById('admin-consolidated-thead');
  const tbody = document.getElementById('admin-consolidated-table-body');
  if (!thead || !tbody) return;

  if (!history || history.length === 0) {
    thead.innerHTML = `<tr><th>Colaborador</th><th>DNI</th><th class="text-center">Sin Datos</th></tr>`;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 25px;">No se registran marcas de asistencia en el historial.</td></tr>';
    return;
  }

  // 1. Normalizar marcas del historial y calcular timestamps a partir de la fecha y hora
  const normalizedHistory = history.map(item => {
    const normDate = normalizeDateStr(item.dateStr);
    const normTime = normalizeTimeStr(item.timeStr);
    const ts = getTimestampFromDateAndTime(normDate, normTime);
    return {
      ...item,
      dateStr: normDate,
      timeStr: normTime,
      timestamp: ts
    };
  }).filter(item => item.dni && employeesDatabase[item.dni]);

  // 2. Filtrar por rango de fechas
  const startDate = document.getElementById('consolidated-start-date')?.value || '';
  const endDate = document.getElementById('consolidated-end-date')?.value || '';
  
  const filteredHistory = normalizedHistory.filter(item => {
    return isDateInRange(item.dateStr, startDate, endDate);
  });

  if (filteredHistory.length === 0) {
    thead.innerHTML = `<tr><th>Colaborador</th><th>DNI</th><th class="text-center">Sin Datos</th></tr>`;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 25px;">No hay marcas registradas para el rango de fechas seleccionado.</td></tr>';
    return;
  }

  // 3. Extraer fechas únicas y ordenarlas cronológicamente
  const uniqueDates = new Set();
  filteredHistory.forEach(item => uniqueDates.add(item.dateStr));
  
  const sortedDates = Array.from(uniqueDates).sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
    const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
    return dateA - dateB;
  });

  // 4. Agrupar marcas por colaborador DNI y fecha
  const dataMap = {};
  filteredHistory.forEach(item => {
    if (!dataMap[item.dni]) {
      dataMap[item.dni] = {};
    }
    if (!dataMap[item.dni][item.dateStr]) {
      dataMap[item.dni][item.dateStr] = [];
    }
    dataMap[item.dni][item.dateStr].push(item);
  });

  // 5. Dibujar cabecera dinámica
  let headerHtml = `
    <tr>
      <th style="min-width: 200px;">Colaborador</th>
      <th style="min-width: 100px;">DNI</th>
  `;
  sortedDates.forEach(dateStr => {
    headerHtml += `<th class="text-center" style="min-width: 110px;">${dateStr}</th>`;
  });
  headerHtml += `</tr>`;
  thead.innerHTML = headerHtml;

  // 6. Dibujar cuerpo
  tbody.innerHTML = '';
  const dnis = Object.keys(employeesDatabase);
  
  if (dnis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${2 + sortedDates.length}" class="text-center text-muted" style="padding: 25px;">No hay colaboradores en la base de datos.</td></tr>`;
    return;
  }

  dnis.forEach(dni => {
    const employee = employeesDatabase[dni];
    const tr = document.createElement('tr');
    
    let rowHtml = `
      <td class="table-employee-name" style="font-weight: 500;">${employee.name}</td>
      <td>${dni}</td>
    `;
    
    sortedDates.forEach(dateStr => {
      const dayMarks = dataMap[dni] && dataMap[dni][dateStr] ? dataMap[dni][dateStr] : null;
      if (dayMarks && dayMarks.length > 0) {
        dayMarks.sort((a, b) => a.timestamp - b.timestamp);
        const report = calculateWorkedTimesForDate(dayMarks, employee, dateStr);
        const tardinessIndicator = report.tardiness 
          ? `<span class="consolidated-tardiness-indicator" title="Tardanza en el ingreso">⚠️</span>` 
          : '';
        if (report.workedMinutes > 0) {
          rowHtml += `<td class="text-center" style="font-weight: 600; color: var(--text-primary);">${formatMinutesToDuration(report.workedMinutes)}${tardinessIndicator}</td>`;
        } else {
          rowHtml += `<td class="text-center text-muted">0m${tardinessIndicator}</td>`;
        }
      } else {
        rowHtml += `<td class="text-center text-muted" style="opacity: 0.4;">---</td>`;
      }
    });
    
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
}

function loadConsolidatedReport() {
  const tbody = document.getElementById('admin-consolidated-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 30px;"><span class="animate-pulse" style="display: inline-flex; align-items: center; gap: 8px;"><span class="material-symbols-rounded animate-spin">sync</span> Cargando historial consolidado...</span></td></tr>';
  
  let fetchPromise;
  if (googleScriptUrl) {
    fetchPromise = fetchAllHistoryFromGoogleSheets();
  } else {
    fetchPromise = fetchAllHistoryLocal();
  }
  
  fetchPromise
    .then(history => {
      cachedConsolidatedHistory = history;
      renderConsolidatedTable(cachedConsolidatedHistory);
    })
    .catch(err => {
      console.error("Error cargando reporte consolidado:", err);
      tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 25px; color: var(--text-error);">Error al cargar los datos del reporte consolidado.</td></tr>';
      showToast('error', 'Error de Reporte', 'No se pudo cargar el historial consolidado.');
    });
}

// Lógica de pestañas del panel administrativo
function setupAdminTabs() {
  const tabButtons = document.querySelectorAll('.btn-admin-tab');
  const tabContents = document.querySelectorAll('.admin-tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}-content`) {
          content.classList.add('active');
          content.classList.remove('hidden');
        } else {
          content.classList.remove('active');
          content.classList.add('hidden');
        }
      });
      
      if (targetTab === 'reports') {
        updateReportEmployeeSelect();
        const select = document.getElementById('select-report-employee');
        if (select && select.value) {
          renderAgentReport(select.value);
        }
      }
      
      if (targetTab === 'consolidated') {
        loadConsolidatedReport();
      }
    });
  });

  const select = document.getElementById('select-report-employee');
  if (select) {
    select.addEventListener('change', () => {
      if (select.value) {
        renderAgentReport(select.value);
      }
    });
  }

  const btnRefreshConsolidated = document.getElementById('btn-refresh-consolidated');
  if (btnRefreshConsolidated) {
    btnRefreshConsolidated.addEventListener('click', () => {
      loadConsolidatedReport();
      showToast('info', 'Actualizando...', 'Sincronizando reporte consolidado.');
    });
  }

  // --- Lógica e interactividad de filtros de fecha ---

  // Pestaña 2: Reporte por Agente
  const btnFilterReport = document.getElementById('btn-filter-report');
  if (btnFilterReport) {
    btnFilterReport.addEventListener('click', () => {
      if (select && select.value) {
        const employee = employeesDatabase[select.value];
        if (employee) {
          renderReportTable(cachedAgentHistory, employee);
          showToast('success', 'Filtro aplicado', 'Historial del agente filtrado.');
        }
      } else {
        showToast('warning', 'Selecciona colaborador', 'Primero debes elegir un colaborador.');
      }
    });
  }

  const reportStartDate = document.getElementById('report-start-date');
  const reportEndDate = document.getElementById('report-end-date');
  const onReportDateChange = () => {
    if (select && select.value) {
      const employee = employeesDatabase[select.value];
      if (employee) renderReportTable(cachedAgentHistory, employee);
    }
  };
  if (reportStartDate) reportStartDate.addEventListener('change', onReportDateChange);
  if (reportEndDate) reportEndDate.addEventListener('change', onReportDateChange);

  // Pestaña 3: Resumen Consolidado
  const btnFilterConsolidated = document.getElementById('btn-filter-consolidated');
  if (btnFilterConsolidated) {
    btnFilterConsolidated.addEventListener('click', () => {
      renderConsolidatedTable(cachedConsolidatedHistory);
      showToast('success', 'Filtro aplicado', 'Resumen consolidado filtrado.');
    });
  }

  const consolidatedStartDate = document.getElementById('consolidated-start-date');
  const consolidatedEndDate = document.getElementById('consolidated-end-date');
  const onConsolidatedDateChange = () => {
    renderConsolidatedTable(cachedConsolidatedHistory);
  };
  if (consolidatedStartDate) consolidatedStartDate.addEventListener('change', onConsolidatedDateChange);
  if (consolidatedEndDate) consolidatedEndDate.addEventListener('change', onConsolidatedDateChange);
}

/* ==========================================================================
   EDITAR COLABORADORES - LÓGICA DEL MODAL
   ========================================================================== */

window.openEditEmployeeModal = function(dni) {
  const modal = document.getElementById('modal-edit-employee');
  const employee = employeesDatabase[dni];
  if (!modal || !employee) return;

  document.getElementById('edit-dni-hidden').value = dni;
  document.getElementById('edit-dni-display-input').value = dni;
  document.getElementById('edit-name').value = employee.name;
  document.getElementById('edit-role').value = employee.role;
  document.getElementById('edit-pin').value = employee.pin || "1234";
  document.getElementById('edit-work-start').value = employee.workStart || "08:00";
  document.getElementById('edit-work-end').value = employee.workEnd || "17:00";
  document.getElementById('edit-break-start').value = employee.breakStart || "13:00";
  document.getElementById('edit-break-end').value = employee.breakEnd || "14:00";

  modal.classList.remove('hidden');
};

function setupEditModalListeners() {
  const modal = document.getElementById('modal-edit-employee');
  const cancelBtn = document.getElementById('btn-edit-cancel');
  const form = document.getElementById('form-edit-employee');

  if (!modal) return;

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dni = document.getElementById('edit-dni-hidden').value;
    const name = document.getElementById('edit-name').value.trim().toUpperCase();
    const role = document.getElementById('edit-role').value.trim();
    const pin = document.getElementById('edit-pin').value.trim();
    const workStart = document.getElementById('edit-work-start').value;
    const workEnd = document.getElementById('edit-work-end').value;
    const breakStart = document.getElementById('edit-break-start').value;
    const breakEnd = document.getElementById('edit-break-end').value;

    if (!employeesDatabase[dni]) {
      showToast('error', 'Error', 'El colaborador no existe.');
      return;
    }

    employeesDatabase[dni].name = name;
    employeesDatabase[dni].role = role;
    employeesDatabase[dni].pin = pin;
    employeesDatabase[dni].workStart = workStart;
    employeesDatabase[dni].workEnd = workEnd;
    employeesDatabase[dni].breakStart = breakStart;
    employeesDatabase[dni].breakEnd = breakEnd;

    saveState();
    if (googleScriptUrl) {
      sendUpdateToGoogleSheets(dni, name, role, workStart, workEnd, breakStart, breakEnd);
    }
    modal.classList.add('hidden');
    showToast('success', 'Colaborador Actualizado', `Los datos y horarios de ${name} fueron guardados.`);
    
    updateAdminView();
    
    const select = document.getElementById('select-report-employee');
    if (select && select.value === dni) {
      renderAgentReport(dni);
    }
  });
}

// --- LÓGICA DE EXPORTACIÓN DE REPORTES A CSV (EXCEL COMPATIBLE) ---

function exportAgentReportCSV() {
  const select = document.getElementById('select-report-employee');
  if (!select || !select.value) {
    showToast('warning', 'Selecciona colaborador', 'Primero debes elegir un colaborador para exportar.');
    return;
  }
  const dni = select.value;
  const employee = employeesDatabase[dni];
  if (!employee) return;
  
  if (!cachedAgentHistory || cachedAgentHistory.length === 0) {
    showToast('warning', 'Sin datos', 'No hay datos históricos para exportar.');
    return;
  }
  
  // Normalizar y filtrar
  const normalizedHistory = cachedAgentHistory.map(item => {
    const normDate = normalizeDateStr(item.dateStr);
    const normTime = normalizeTimeStr(item.timeStr);
    return {
      ...item,
      dateStr: normDate,
      timeStr: normTime,
      timestamp: getTimestampFromDateAndTime(normDate, normTime)
    };
  });
  
  const startDate = document.getElementById('report-start-date')?.value || '';
  const endDate = document.getElementById('report-end-date')?.value || '';
  const filteredHistory = normalizedHistory.filter(item => isDateInRange(item.dateStr, startDate, endDate));
  
  if (filteredHistory.length === 0) {
    showToast('warning', 'Sin datos', 'No hay marcas en el rango de fechas seleccionado.');
    return;
  }
  
  // Agrupar por fecha
  const grouped = {};
  filteredHistory.forEach(item => {
    if (!grouped[item.dateStr]) grouped[item.dateStr] = [];
    grouped[item.dateStr].push(item);
  });
  
  // Ordenar fechas descendente
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
    const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
    return dateB - dateA;
  });
  
  // Generar contenido CSV
  let csvContent = "";
  // Cabecera informativa para contexto en Excel
  csvContent += `Reporte de Asistencia - ${employee.name}\n`;
  csvContent += `DNI;${dni}\n`;
  csvContent += `Cargo;${employee.role}\n`;
  csvContent += `Jornada Planificada;${employee.workStart} a ${employee.workEnd}\n`;
  csvContent += `Rango de Fechas;${startDate || 'Inicio'} al ${endDate || 'Fin'}\n\n`;
  
  // Columnas
  csvContent += "Fecha;Entrada Real;Refrigerio Real (Inicio -> Fin);Salida Real;Break Real (minutos);Exceso de Break (minutos);Trabajo Real;Diferencia;Tardanza\n";
  
  sortedDates.forEach(dateStr => {
    const dayMarks = grouped[dateStr].sort((a, b) => a.timestamp - b.timestamp);
    const report = calculateWorkedTimesForDate(dayMarks, employee, dateStr);
    
    const breakMin = report.breakMinutes > 0 ? report.breakMinutes : 0;
    const excessBreakMin = report.excessBreakMinutes > 0 ? report.excessBreakMinutes : 0;
    const workedStr = report.workedMinutes > 0 ? formatMinutesToDuration(report.workedMinutes) : '0m';
    const diffStr = report.status;
    const tardyStr = report.tardiness ? "SI" : "NO";
    
    csvContent += `"${dateStr}";"${report.entradaReal}";"${report.breakReal}";"${report.salidaReal}";${breakMin};${excessBreakMin};"${workedStr}";"${diffStr}";"${tardyStr}"\n`;
  });
  
  // Descargar archivo con BOM UTF-8 (para caracteres en español)
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const cleanName = employee.name.replace(/[^a-zA-Z0-9]/g, "_");
  const dateRangeStr = `${startDate || 'inicio'}_a_${endDate || 'fin'}`;
  link.setAttribute("href", url);
  link.setAttribute("download", `Reporte_Asistencia_${cleanName}_${dateRangeStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('success', 'Exportación Completa', 'Se descargó el reporte del colaborador en formato CSV.');
}

function exportConsolidatedCSV() {
  if (!cachedConsolidatedHistory || cachedConsolidatedHistory.length === 0) {
    showToast('warning', 'Sin datos', 'No hay datos consolidados para exportar.');
    return;
  }
  
  // Normalizar y filtrar
  const normalizedHistory = cachedConsolidatedHistory.map(item => {
    const normDate = normalizeDateStr(item.dateStr);
    const normTime = normalizeTimeStr(item.timeStr);
    return {
      ...item,
      dateStr: normDate,
      timeStr: normTime,
      timestamp: getTimestampFromDateAndTime(normDate, normTime)
    };
  }).filter(item => item.dni && employeesDatabase[item.dni]);
  
  const startDate = document.getElementById('consolidated-start-date')?.value || '';
  const endDate = document.getElementById('consolidated-end-date')?.value || '';
  const filteredHistory = normalizedHistory.filter(item => isDateInRange(item.dateStr, startDate, endDate));
  
  if (filteredHistory.length === 0) {
    showToast('warning', 'Sin datos', 'No hay marcas en el rango de fechas seleccionado.');
    return;
  }
  
  // Extraer fechas únicas y ordenarlas cronológicamente
  const uniqueDates = new Set();
  filteredHistory.forEach(item => uniqueDates.add(item.dateStr));
  const sortedDates = Array.from(uniqueDates).sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
    const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
    return dateA - dateB;
  });
  
  // Agrupar
  const dataMap = {};
  filteredHistory.forEach(item => {
    if (!dataMap[item.dni]) dataMap[item.dni] = {};
    if (!dataMap[item.dni][item.dateStr]) dataMap[item.dni][item.dateStr] = [];
    dataMap[item.dni][item.dateStr].push(item);
  });
  
  let csvContent = "";
  csvContent += `Resumen Consolidado de Asistencia - Horas Trabajadas\n`;
  csvContent += `Rango de Fechas;${startDate || 'Inicio'} al ${endDate || 'Fin'}\n\n`;
  
  // Cabecera: Colaborador;DNI;Fecha1;Fecha2;...
  csvContent += "Colaborador;DNI";
  sortedDates.forEach(dateStr => {
    csvContent += `;"${dateStr}"`;
  });
  csvContent += "\n";
  
  // Filas por cada colaborador
  Object.keys(employeesDatabase).forEach(dni => {
    const employee = employeesDatabase[dni];
    csvContent += `"${employee.name}";"${dni}"`;
    
    sortedDates.forEach(dateStr => {
      const dayMarks = dataMap[dni] && dataMap[dni][dateStr] ? dataMap[dni][dateStr] : null;
      if (dayMarks && dayMarks.length > 0) {
        dayMarks.sort((a, b) => a.timestamp - b.timestamp);
        const report = calculateWorkedTimesForDate(dayMarks, employee, dateStr);
        const tardyMarker = report.tardiness ? " (T)" : "";
        if (report.workedMinutes > 0) {
          csvContent += `;"${formatMinutesToDuration(report.workedMinutes)}${tardyMarker}"`;
        } else {
          csvContent += `;"0m${tardyMarker}"`;
        }
      } else {
        csvContent += `;"---"`;
      }
    });
    csvContent += "\n";
  });
  
  // Descargar archivo con BOM UTF-8
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const dateRangeStr = `${startDate || 'inicio'}_a_${endDate || 'fin'}`;
  link.setAttribute("href", url);
  link.setAttribute("download", `Resumen_Consolidado_Asistencia_${dateRangeStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('success', 'Exportación Completa', 'Se descargó el resumen consolidado en formato CSV.');
}
