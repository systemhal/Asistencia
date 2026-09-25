/**
 * AsistenciaPro - Google Apps Script Integration Backend
 * 
 * Copia y pega este código completo en tu editor de Google Apps Script 
 * (Extensiones -> Apps Script) y luego despliégalo como una Aplicación Web.
 */

// Configuración de CORS y cabeceras
function getJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Inicializar hojas si no existen o tienen menos columnas (Autoreparable)
function ensureSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheets = {
    "Personal": ["Fecha", "Dni", "Nombre Completo", "Edad", "Sexo", "Cargo / Puesto", "Entrada Jornada", "Salida Jornada", "Inicio Break", "Fin Break", "PIN", "Horarios Semanales", "Estado", "Fecha_Baja"],
    "Asistencia": ["Fecha", "Hora", "DNI", "Nombre Colaborador", "Acción", "Detalles", "Timestamp Unix", "Dispositivo"],
    "Justificaciones": ["DNI", "Fecha", "Tipo", "Detalles", "Hora Inicio", "Hora Fin", "¿Con Goce?"],
    "Feriados": ["Fecha", "Nombre"],
    "Horarios": ["Día", "DNI", "Nombre Completo", "Entrada - Salida", "Hrs"]
  };
  
  for (var name in sheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      // Dar formato de cabecera negrita
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight("bold");
    } else {
      // Verificar si la hoja tiene suficientes columnas para las expectativas
      var expectedHeaders = sheets[name];
      var maxCols = sheet.getMaxColumns();
      if (maxCols < expectedHeaders.length) {
        sheet.insertColumnsAfter(maxCols, expectedHeaders.length - maxCols);
      }
      
      // Leer cabeceras actuales y asegurar que todas estén escritas
      var currentHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getDisplayValues()[0];
      for (var colIdx = 0; colIdx < expectedHeaders.length; colIdx++) {
        if (!currentHeaders[colIdx] || currentHeaders[colIdx].trim() === "") {
          sheet.getRange(1, colIdx + 1).setValue(expectedHeaders[colIdx]).setFontWeight("bold");
        }
      }
    }
  }
}

// Helper para dar formato a los valores de tiempo (evita que se serialicen como fechas ISO corruptas)

// Helper para convertir cualquier DNI a texto plano (incluso si Sheets lo interpretó como fecha y retornó un objeto Date)
function getSafeDni(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var epoch = new Date(1899, 11, 30);
    return String(Math.round((val.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000)));
  }
  return String(val).trim();
}

function formatTimeValue(val) {
  if (!val) return "—";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
  }
  var s = String(val).trim();
  if (s === "" || s === "—") return "—";
  return s;
}

// Helper para dar formato a fechas de Excel/Sheets
function formatDateValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  var s = String(val).trim();
  // Si es una fecha ISO, parsear e imponer formato dd/MM/yyyy
  if (s.indexOf('T') > 0 && !isNaN(Date.parse(s))) {
    try {
      return Utilities.formatDate(new Date(s), Session.getScriptTimeZone(), "dd/MM/yyyy");
    } catch(e) {}
  }
  // Normalizar cualquier fecha con barras a DD/MM/YYYY (ej: 25/9/2026 -> 25/09/2026)
  var parts = s.split('/');
  if (parts.length === 3) {
    var dd = parts[0].length === 1 ? '0' + parts[0] : parts[0];
    var mm = parts[1].length === 1 ? '0' + parts[1] : parts[1];
    var yyyy = parts[2];
    return dd + '/' + mm + '/' + yyyy;
  }
  return s;
}

// Helper para dar formato a horas largas (con segundos)
function formatLongTimeValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm:ss");
  }
  return String(val).trim();
}

var DEFAULT_API_KEY = "AsistenciaPro_SecuredKey_2026";

function getStoredApiKey() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty("API_KEY");
  return (key && key.trim() !== "") ? key.trim() : DEFAULT_API_KEY;
}

function checkAuth(e, postData) {
  var providedKey = "";
  if (e && e.parameter && e.parameter.apiKey) {
    providedKey = String(e.parameter.apiKey).trim();
  } else if (postData && postData.apiKey) {
    providedKey = String(postData.apiKey).trim();
  }
  return providedKey === getStoredApiKey();
}

// ── GET REQUESTS (Sincronización hacia la App Web) ────────────────────────
function doGet(e) {
  ensureSheetsExist();
  
  if (!checkAuth(e, null)) {
    return getJsonResponse({ status: "error", message: "Acceso denegado: API Key no válida o no proporcionada." });
  }

  var action = e.parameter.action;
  
  if (!action) {
    return getJsonResponse({ status: "error", message: "Falta el parámetro 'action'." });
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtener base de datos unificada (Acción optimizada principal)
    if (action === 'get_initial_data') {
      var props = PropertiesService.getScriptProperties();
      var maxRows = e.parameter.maxRows ? parseInt(e.parameter.maxRows, 10) : 3000;
      return getJsonResponse({
        status: "ok",
        data: {
          employees: getEmployeesData(ss),
          justificaciones: getJustificacionesData(ss),
          feriados: getFeriadosData(ss),
          history: getHistoryData(ss, null, maxRows),
          config: {
            security_block_mobile: props.getProperty('security_block_mobile') === 'true',
            security_restrict_pcs: props.getProperty('security_restrict_pcs') === 'true',
            security_restrict_mobiles: props.getProperty('security_restrict_mobiles') === 'true',
            tardiness_tolerance: props.getProperty('tardiness_tolerance') ? parseInt(props.getProperty('tardiness_tolerance'), 10) : 5,
            api_key: getStoredApiKey()
          }
        }
      });
    }
    
    // 2. Obtener lista de colaboradores
    if (action === 'get_employees') {
      return getJsonResponse({ status: "ok", data: getEmployeesData(ss) });
    }
    
    // 3. Obtener justificaciones
    if (action === 'get_justificaciones') {
      return getJsonResponse({ status: "ok", data: getJustificacionesData(ss) });
    }
    
    // 4. Obtener feriados
    if (action === 'get_feriados') {
      return getJsonResponse({ status: "ok", data: getFeriadosData(ss) });
    }
    
    // 5. Obtener historial general o por empleado
    if (action === 'get_history') {
      var dni = e.parameter.dni;
      var maxRows = e.parameter.maxRows ? parseInt(e.parameter.maxRows, 10) : 3000;
      return getJsonResponse({ status: "ok", data: getHistoryData(ss, dni, maxRows) });
    }

    // 6. Limpiar duplicados de asistencia
    if (action === 'limpiar_duplicados') {
      var resLimpieza = limpiarDuplicadosAsistencia();
      return getJsonResponse({ status: "ok", message: resLimpieza });
    }
    
    return getJsonResponse({ status: "error", message: "Acción GET no reconocida." });
    
  } catch (err) {
    return getJsonResponse({ status: "error", message: err.toString() });
  }
}

// ── POST REQUESTS (Inserciones y ediciones desde la App Web) ───────────────
function doPost(e) {
  ensureSheetsExist();
  
  try {
    var postData = JSON.parse(e.postData.contents);
    
    if (!checkAuth(e, postData)) {
      return getJsonResponse({ status: "error", message: "Acceso denegado: API Key no válida o no proporcionada." });
    }

    var action = postData.action;
    
    if (!action) {
      return getJsonResponse({ status: "error", message: "Acción POST no especificada." });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 0. Guardar Configuración Global de Seguridad
    if (action === "Guardar_Configuracion") {
      var props = PropertiesService.getScriptProperties();
      if (postData.security_block_mobile !== undefined) {
        props.setProperty('security_block_mobile', String(postData.security_block_mobile === true || postData.security_block_mobile === 'true'));
      }
      if (postData.security_restrict_pcs !== undefined) {
        props.setProperty('security_restrict_pcs', String(postData.security_restrict_pcs === true || postData.security_restrict_pcs === 'true'));
      }
      if (postData.security_restrict_mobiles !== undefined) {
        props.setProperty('security_restrict_mobiles', String(postData.security_restrict_mobiles === true || postData.security_restrict_mobiles === 'true'));
      }
      if (postData.tardiness_tolerance !== undefined) {
        props.setProperty('tardiness_tolerance', String(postData.tardiness_tolerance));
      }
      if (postData.api_key !== undefined && String(postData.api_key).trim() !== "") {
        props.setProperty('API_KEY', String(postData.api_key).trim());
      }
      return getJsonResponse({ status: "ok", message: "Configuración global de seguridad guardada." });
    }
    
    // 1. Registrar Nuevo Colaborador
    if (action === "Registrar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      var regDate = postData.fechaIngreso ? formatDateValue(postData.fechaIngreso) : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
      sheet.appendRow([
        regDate, // 1. Fecha (A)
        "'" + postData.employeeId,      // 2. Dni (B)
        postData.employeeName,    // 3. Nombre Completo (C)
        postData.age || "—",      // 4. Edad (D)
        postData.gender || "—",   // 5. Sexo (E)
        postData.role || "Colaborador", // 6. Cargo / Puesto (F)
        postData.workStart || "08:00", // 7. Entrada Jornada (G)
        postData.workEnd || "17:00",   // 8. Salida Jornada (H)
        postData.breakStart || "13:00", // 9. Inicio Break (I)
        postData.breakEnd || "14:00",   // 10. Fin Break (J)
        postData.pin || "1234",   // 11. PIN (K)
        postData.weeklySchedule || "",   // 12. Horarios Semanales (L)
        postData.estado || "Activo", // 13. Estado (M)
        postData.fechaBaja || "" // 14. Fecha Baja (N)
      ]);
      updateHorariosSheet(ss, postData.employeeId, postData.employeeName, postData.weeklySchedule || "");
      return getJsonResponse({ status: "ok", message: "Colaborador registrado." });
    }
    
    // 2. Editar Colaborador Existente
    if (action === "Editar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      var empIdStr = getSafeDni(postData.employeeId);
      for (var i = 1; i < data.length; i++) {
        if (getSafeDni(data[i][1]) === empIdStr) { // Buscar en Columna B (Dni)
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow >= 0) {
        sheet.getRange(foundRow, 2, 1, 13).setValues([[
          postData.employeeId,      // 2. Dni (B)
          postData.employeeName,    // 3. Nombre Completo (C)
          postData.age || "—",      // 4. Edad (D)
          postData.gender || "—",   // 5. Sexo (E)
          postData.role,            // 6. Cargo / Puesto (F)
          postData.workStart,       // 7. Entrada Jornada (G)
          postData.workEnd,         // 8. Salida Jornada (H)
          postData.breakStart,      // 9. Inicio Break (I)
          postData.breakEnd,        // 10. Fin Break (J)
          postData.pin,             // 11. PIN (K)
          postData.weeklySchedule || "", // 12. Horarios Semanales (L)
          postData.estado || "Activo", // 13. Estado (M)
          postData.fechaBaja || "" // 14. Fecha Baja (N)
        ]]);
        updateHorariosSheet(ss, postData.employeeId, postData.employeeName, postData.weeklySchedule || "");
        return getJsonResponse({ status: "ok", message: "Colaborador actualizado." });
      }
      return getJsonResponse({ status: "error", message: "Colaborador no encontrado." });
    }
    
    // 3. Eliminar Colaborador
    if (action === "Eliminar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      var data = sheet.getDataRange().getValues();
      var empIdStr = getSafeDni(postData.employeeId);
      for (var i = 1; i < data.length; i++) {
        if (getSafeDni(data[i][1]) === empIdStr) { // Buscar en Columna B (Dni)
          sheet.deleteRow(i + 1);
          break;
        }
      }
      deleteFromHorariosSheet(ss, postData.employeeId);
      return getJsonResponse({ status: "ok", message: "Colaborador eliminado." });
    }
    
    // 4. Registrar Justificación
    if (action === "Registrar_Justificacion") {
      var sheet = ss.getSheetByName("Justificaciones");
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (getSafeDni(data[i][0]) === getSafeDni(postData.employeeId) && data[i][1] === postData.date) {
          foundRow = i + 1;
          break;
        }
      }
      var sheetJust = ss.getSheetByName("Justificaciones");
      var payload = postData;
      var employeeId = payload.employeeId;
      
      const { date, type, startTime, endTime, compensation } = payload; // date en formato DD/MM/YYYY, type es "Vacaciones", etc.
      const desc = payload.details || "";
      if (!employeeId || !date || !type) {
        return getJsonResponse({ status: "error", message: "Faltan campos obligatorios para registrar la justificación." });
      }
      
      // Evitar duplicados en la misma fecha y DNI: borrar la anterior
      let displayData = sheetJust.getDataRange().getDisplayValues();
      for (let i = displayData.length - 1; i > 0; i--) {
        if (getSafeDni(displayData[i][0]) === getSafeDni(employeeId) && formatDateValue(displayData[i][1]) === formatDateValue(date)) {
          sheetJust.deleteRow(i + 1);
        }
      }
      
      sheetJust.appendRow([
        String(employeeId), 
        String(date), 
        String(type), 
        String(desc),
        String(startTime || ""),
        String(endTime || ""),
        String(compensation || "")
      ]);
      return getJsonResponse({ status: "ok", message: "Justificación registrada exitosamente." });
    }
    
    // 5. Eliminar Justificación
    if (action === "Eliminar_Justificacion") {
      var sheet = ss.getSheetByName("Justificaciones");
      var data = sheet.getDataRange().getValues();
      var targetDni = getSafeDni(postData.employeeId);
      for (var i = 1; i < data.length; i++) {
        if (getSafeDni(data[i][0]) === targetDni && formatDateValue(data[i][1]) === formatDateValue(postData.date)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return getJsonResponse({ status: "ok", message: "Justificación eliminada." });
    }
    
    // 6. Registrar Feriado Personalizado
    if (action === "Registrar_Feriado") {
      var sheet = ss.getSheetByName("Feriados");
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (formatDateValue(data[i][0]) === formatDateValue(postData.date)) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow >= 0) {
        sheet.getRange(foundRow, 2).setValue(postData.name);
      } else {
        sheet.appendRow([postData.date, postData.name]);
      }
      return getJsonResponse({ status: "ok", message: "Feriado registrado." });
    }
    
    // 7. Eliminar Feriado
    if (action === "Eliminar_Feriado") {
      var sheet = ss.getSheetByName("Feriados");
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (formatDateValue(data[i][0]) === formatDateValue(postData.date)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return getJsonResponse({ status: "ok", message: "Feriado eliminado." });
    }
    
    // 8. Limpiar Duplicados de Asistencia
    if (action === "Limpiar_Duplicados") {
      var resLimpiar = limpiarDuplicadosAsistencia();
      return getJsonResponse({ status: "ok", message: resLimpiar });
    }

    // 9. Marcas de Asistencia (Acciones válidas: Ingreso, Inicio Refrigerio, Fin Refrigerio, Salida)
    var VALID_ATTENDANCE_ACTIONS = ["Ingreso", "Inicio Refrigerio", "Fin Refrigerio", "Salida"];
    if (VALID_ATTENDANCE_ACTIONS.indexOf(action) === -1) {
      return getJsonResponse({ status: "error", message: "Acción no reconocida o no permitida: " + action });
    }

    var cleanEmpId = getSafeDni(postData.employeeId);
    if (!cleanEmpId) {
      return getJsonResponse({ status: "error", message: "DNI de colaborador no proporcionado o inválido." });
    }

    var attendanceSheet = ss.getSheetByName("Asistencia");
    if (!attendanceSheet) {
      return getJsonResponse({ status: "error", message: "Hoja 'Asistencia' no encontrada." });
    }
    
    // Determinar la fecha y hora exacta
    var now = new Date();
    var serverDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy");
    var serverTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");

    // Fecha: Asegurar que nunca esté vacía ni inválida y siempre normalizada a DD/MM/YYYY
    var formattedDate = postData.customDate ? formatDateValue(postData.customDate) : serverDate;
    if (!formattedDate || formattedDate === "Invalid Date" || formattedDate === "---") {
      formattedDate = serverDate;
    }

    // Hora: Asegurar que NUNCA esté vacía ni sea "Invalid Date"
    var formattedTime = String(postData.customTime || "").trim();
    if (!formattedTime || formattedTime === "Invalid Date" || formattedTime === "---" || formattedTime.length < 4) {
      formattedTime = serverTime;
    }

    var timestamp = Number(postData.customTimestamp);
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      timestamp = now.getTime();
    }

    var device = String(postData.device || "---").trim();
    var details = String(postData.details || "Registrado vía AsistenciaPro Web").trim();

    // ── CONTROL ESTRICTO CONTRA DUPLICADOS (ANTIDUPLICADOS) ──
    var lastRow = attendanceSheet.getLastRow();
    if (lastRow > 1) {
      var rowsToCheck = Math.min(250, lastRow - 1);
      var startRow = lastRow - rowsToCheck + 1;
      // Col 1=Fecha (A), Col 2=Hora (B), Col 3=DNI (C), Col 5=Acción (E), Col 7=Timestamp (G)
      var recentData = attendanceSheet.getRange(startRow, 1, rowsToCheck, 7).getValues();

      for (var r = recentData.length - 1; r >= 0; r--) {
        var rowDate = formatDateValue(recentData[r][0]);
        var rowDni = getSafeDni(recentData[r][2]);
        var rowAction = String(recentData[r][4]).trim();
        var rowTimestamp = Number(recentData[r][6]) || 0;

        if (rowDni === cleanEmpId && rowDate === formattedDate && rowAction === action) {
          // Si es marca de "Sistema" (cierre automático) y ya existe la acción para hoy, ignorar siempre
          if (device === "Sistema" || device.indexOf("Sistema") >= 0) {
            return getJsonResponse({ 
              status: "ok", 
              message: "Cierre automático ya registrado previamente para este colaborador en esta fecha.",
              duplicateIgnored: true 
            });
          }

          // Si el timestamp difiere por menos de 180 segundos (3 minutos), es un clic repetido / reenvío
          var timeDiff = Math.abs(timestamp - rowTimestamp);
          if (rowTimestamp > 0 && timeDiff < 180000) {
            return getJsonResponse({ 
              status: "ok", 
              message: "Marca ya registrada recientemente (duplicado ignorado).",
              duplicateIgnored: true 
            });
          }
        }
      }
    }
    
    // Inserción segura con hora garantizada
    attendanceSheet.appendRow([
      formattedDate,            // 1. Fecha (A)
      formattedTime,            // 2. Hora (B)
      "'" + cleanEmpId,         // 3. DNI (C)
      postData.employeeName || cleanEmpId, // 4. Nombre Colaborador (D)
      action,                   // 5. Acción (E)
      details,                  // 6. Detalles (F)
      timestamp,                // 7. Timestamp Unix (G)
      device                    // 8. Dispositivo (H)
    ]);
    
    return getJsonResponse({ status: "ok", message: "Marca registrada con éxito." });
    
  } catch (err) {
    return getJsonResponse({ status: "error", message: err.toString() });
  }
}

// ── GETTERS DE BASES DE DATOS (MÉTODOS INTERNOS) ──────────────────────────

function getEmployeesData(ss) {
  var sheet = ss.getSheetByName("Personal");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var employees = [];
  
  for (var i = 1; i < data.length; i++) {
    employees.push({
      fechaIngreso: formatDateValue(data[i][0]), // Columna A (Fecha de Ingreso/Registro)
      dni: getSafeDni(data[i][1]), // Columna B (Dni)
      name: data[i][2],        // Columna C (Nombre Completo)
      age: data[i][3],        // Columna D (Edad)
      gender: data[i][4],     // Columna E (Sexo)
      role: data[i][5],       // Columna F (Cargo / Puesto)
      workStart: formatTimeValue(data[i][6]),  // Columna G (Entrada Jornada)
      workEnd: formatTimeValue(data[i][7]),    // Columna H (Salida Jornada)
      breakStart: formatTimeValue(data[i][8]), // Columna I (Inicio Break)
      breakEnd: formatTimeValue(data[i][9]),   // Columna J (Fin Break)
      pin: String(data[i][10]), // Columna K (PIN)
      weeklySchedule: data[i][11] || "", // Columna L (Horarios Semanales)
      estado: data[i][12] || "Activo", // Columna M (Estado)
      fechaBaja: data[i][13] || "" // Columna N (Fecha Baja)
    });
  }
  return employees;
}

function getJustificacionesData(ss) {
  var sheet = ss.getSheetByName("Justificaciones");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var sTime = data[i][4] ? formatTimeValue(data[i][4]) : "";
    if (sTime === "—") sTime = "";
    var eTime = data[i][5] ? formatTimeValue(data[i][5]) : "";
    if (eTime === "—") eTime = "";

    list.push({
      dni: getSafeDni(data[i][0]),
      dateStr: formatDateValue(data[i][1]),
      type: data[i][2],
      details: data[i][3],
      startTime: sTime,
      endTime: eTime,
      compensation: data[i][6] || ""
    });
  }
  return list;
}

function getFeriadosData(ss) {
  var sheet = ss.getSheetByName("Feriados");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      dateStr: formatDateValue(data[i][0]),
      name: data[i][1]
    });
  }
  return list;
}

function getHistoryData(ss, filterDni, maxRows) {
  var sheet = ss.getSheetByName("Asistencia");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Optimización de lectura: Leer hasta maxRows (por defecto 3500) para evitar timeouts y saturación
  var limit = maxRows ? parseInt(maxRows, 10) : 3500;
  var rowsToRead = Math.min(lastRow - 1, limit);
  var startRow = lastRow - rowsToRead + 1;

  var data = sheet.getRange(startRow, 1, rowsToRead, 8).getValues();
  var history = [];
  
  for (var i = 0; i < data.length; i++) {
    var dni = getSafeDni(data[i][2]); // Columna C (DNI)
    if (filterDni && dni !== String(filterDni)) continue;
    
    var rawHora = data[i][1];
    var formattedHora = formatLongTimeValue(rawHora);
    var ts = Number(data[i][6]) || 0;

    // Blindaje: Si la hora en la hoja está vacía pero existe Timestamp Unix, reconstruir la hora exacta
    if ((!formattedHora || formattedHora === "") && ts > 0) {
      try {
        formattedHora = Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), "HH:mm:ss");
      } catch(e) {}
    }
    
    history.push({
      dni: dni,                                  // DNI
      name: data[i][3],                          // Nombre Colaborador
      action: data[i][4],                        // Acción
      dateStr: formatDateValue(data[i][0]),     // Fecha (A)
      timeStr: formattedHora,                    // Hora (B)
      timestamp: ts,                             // Timestamp Unix (G)
      details: data[i][5],                       // Detalles (F)
      device: data[i][7]                         // Dispositivo (H)
    });
  }
  return history;
}

// ── FUNCIÓN DE MANTENIMIENTO: LIMPIAR DUPLICADOS EN LA HOJA ASISTENCIA ──
function limpiarDuplicadosAsistencia() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Asistencia");
  if (!sheet) return "Hoja 'Asistencia' no encontrada.";

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "No hay datos que depurar.";

  var data = sheet.getRange(1, 1, lastRow, 8).getValues();
  var cleanRows = [data[0]]; // Cabecera intacta
  var seenKeys = {};
  var duplicatesCount = 0;
  var fixedHoursCount = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateStr = formatDateValue(row[0]);
    var horaStr = formatLongTimeValue(row[1]);
    var dni = getSafeDni(row[2]);
    var action = String(row[4]).trim();
    var ts = Number(row[6]) || 0;

    if (!dni || !action || action === "login") {
      duplicatesCount++;
      continue; // Omitir filas sin DNI o marcas basura
    }

    // Reparar hora vacía si existe timestamp
    if ((!horaStr || horaStr === "") && ts > 0) {
      try {
        horaStr = Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), "HH:mm:ss");
        row[1] = horaStr;
        fixedHoursCount++;
      } catch(e) {}
    }

    // Clave de unicidad: DNI + Fecha + Acción + Bloque de 3 minutos
    var timeSlot = ts > 0 ? Math.floor(ts / 180000) : horaStr.substring(0, 5);
    var key = dni + "|" + dateStr + "|" + action + "|" + timeSlot;

    if (seenKeys[key]) {
      duplicatesCount++;
    } else {
      seenKeys[key] = true;
      cleanRows.push(row);
    }
  }

  if (duplicatesCount > 0 || fixedHoursCount > 0) {
    sheet.getRange(1, 1, lastRow, 8).clearContent();
    sheet.getRange(1, 1, cleanRows.length, 8).setValues(cleanRows);
    return "Limpieza completada: Se eliminaron " + duplicatesCount + " filas duplicadas/inválidas y se repararon " + fixedHoursCount + " horas vacías. Quedaron " + (cleanRows.length - 1) + " registros válidos.";
  } else {
    return "La hoja Asistencia ya se encuentra limpia. No se encontraron duplicados.";
  }
}

// ── SISTEMA DE SINCRONIZACIÓN EN LA PESTAÑA "HORARIOS" (OPTIMIZADO BATCH) ──

function updateHorariosSheet(ss, employeeId, name, weeklySchedule) {
  var sheet = ss.getSheetByName("Horarios");
  if (!sheet) return;
  
  // 1. Filtrar filas en memoria sin hacer deleteRow individual
  var data = sheet.getDataRange().getValues();
  var newData = [data[0]]; // Conservar cabeceras
  var empIdStr = String(employeeId).trim();

  for (var i = 1; i < data.length; i++) {
    if (getSafeDni(data[i][0]) !== empIdStr && getSafeDni(data[i][1]) !== empIdStr) {
      newData.push(data[i]);
    }
  }
  
  // 2. Parsear el weeklySchedule
  var sched = {};
  var isFlexible = (weeklySchedule === "flexible");
  if (!isFlexible && weeklySchedule) {
    try { sched = JSON.parse(weeklySchedule); } catch(e) { sched = {}; }
  }
  
  var daysOrder = [
    { key: "1", label: "Lunes" },
    { key: "2", label: "Martes" },
    { key: "3", label: "Miércoles" },
    { key: "4", label: "Jueves" },
    { key: "5", label: "Viernes" },
    { key: "6", label: "Sábado" },
    { key: "0", label: "Domingo" }
  ];
  
  // 3. Preparar las 7 nuevas filas en memoria
  for (var j = 0; j < daysOrder.length; j++) {
    var dayObj = daysOrder[j];
    var timeStr = "";
    var hours = 0;
    
    if (isFlexible) {
      timeStr = "Flexible";
      hours = 0;
    } else {
      var daySched = sched[dayObj.key];
      if (daySched) {
        if (daySched.isRestDay) {
          timeStr = "";
          hours = 0;
        } else {
          timeStr = (daySched.workStart || "09:00") + " - " + (daySched.workEnd || "18:00");
          if (daySched.nobreak) timeStr += " (S/B)";
          hours = daySched.expectedHours !== undefined ? Number(daySched.expectedHours) : 8;
        }
      } else {
        timeStr = "—";
        hours = 0;
      }
    }
    
    newData.push([
      dayObj.label,        // A: Día
      String(employeeId),  // B: DNI
      String(name),        // C: Nombre Completo
      timeStr,             // D: Entrada - Salida
      hours                // E: Hrs
    ]);
  }

  // 4. Reescribir la hoja en 1 sola llamada en bloque en vez de 7 llamadas
  sheet.clearContents();
  sheet.getRange(1, 1, newData.length, 5).setValues(newData);
}

function deleteFromHorariosSheet(ss, employeeId) {
  var sheet = ss.getSheetByName("Horarios");
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var newData = [data[0]];
  var empIdStr = String(employeeId).trim();

  for (var i = 1; i < data.length; i++) {
    if (getSafeDni(data[i][0]) !== empIdStr && getSafeDni(data[i][1]) !== empIdStr) {
      newData.push(data[i]);
    }
  }

  sheet.clearContents();
  if (newData.length > 0) {
    sheet.getRange(1, 1, newData.length, 5).setValues(newData);
  }
}

// ── ACTIVADOR PARA MANTENER EL SERVIDOR DESPIERTO (KEEP ALIVE - EVITA COLD STARTS) ──
function keepAliveTrigger() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty("API_KEY");
  Logger.log("[KeepAlive] Servidor Apps Script despierto y listo. API Key activa: " + (key ? "SI" : "DEFAULT"));
}


