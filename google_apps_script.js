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

// Inicializar hojas si no existen
function ensureSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheets = {
    "Personal": ["Fecha", "Dni", "Nombre Completo", "Edad", "Sexo", "Cargo / Puesto", "Entrada Jornada", "Salida Jornada", "Inicio Break", "Fin Break", "PIN", "Horarios Semanales"],
    "Asistencia": ["Fecha", "Hora", "DNI", "Nombre Colaborador", "Acción", "Detalles", "Timestamp Unix", "Dispositivo"],
    "Justificaciones": ["DNI", "Fecha", "Tipo", "Detalles"],
    "Feriados": ["Fecha", "Nombre"]
  };
  
  for (var name in sheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      // Dar formato de cabecera negrita
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight("bold");
    }
  }
}

// Helper para dar formato a los valores de tiempo (evita que se serialicen como fechas ISO corruptas)
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
  return String(val).trim();
}

// Helper para dar formato a horas largas (con segundos)
function formatLongTimeValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm:ss");
  }
  return String(val).trim();
}

// ── GET REQUESTS (Sincronización hacia la App Web) ────────────────────────
function doGet(e) {
  ensureSheetsExist();
  var action = e.parameter.action;
  
  if (!action) {
    return getJsonResponse({ status: "error", message: "Falta el parámetro 'action'." });
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Obtener base de datos unificada (Acción optimizada principal)
    if (action === 'get_initial_data') {
      return getJsonResponse({
        status: "ok",
        data: {
          employees: getEmployeesData(ss),
          justificaciones: getJustificacionesData(ss),
          feriados: getFeriadosData(ss),
          history: getHistoryData(ss)
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
      return getJsonResponse({ status: "ok", data: getHistoryData(ss, dni) });
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
    var action = postData.action;
    
    if (!action) {
      return getJsonResponse({ status: "error", message: "Acción POST no especificada." });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Registrar Nuevo Colaborador
    if (action === "Registrar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      sheet.appendRow([
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"), // 1. Fecha (A)
        postData.employeeId,      // 2. Dni (B)
        postData.employeeName,    // 3. Nombre Completo (C)
        postData.age || "—",      // 4. Edad (D)
        postData.gender || "—",   // 5. Sexo (E)
        postData.role || "Colaborador", // 6. Cargo / Puesto (F)
        postData.workStart || "08:00", // 7. Entrada Jornada (G)
        postData.workEnd || "17:00",   // 8. Salida Jornada (H)
        postData.breakStart || "13:00", // 9. Inicio Break (I)
        postData.breakEnd || "14:00",   // 10. Fin Break (J)
        postData.pin || "1234",   // 11. PIN (K)
        postData.weeklySchedule || ""   // 12. Horarios Semanales (L)
      ]);
      return getJsonResponse({ status: "ok", message: "Colaborador registrado." });
    }
    
    // 2. Editar Colaborador Existente
    if (action === "Editar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(postData.employeeId)) { // Buscar en Columna B (Dni)
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow >= 0) {
        sheet.getRange(foundRow, 2, 1, 11).setValues([[
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
          postData.weeklySchedule || "" // 12. Horarios Semanales (L)
        ]]);
        return getJsonResponse({ status: "ok", message: "Colaborador actualizado." });
      }
      return getJsonResponse({ status: "error", message: "Colaborador no encontrado." });
    }
    
    // 3. Eliminar Colaborador
    if (action === "Eliminar_Personal") {
      var sheet = ss.getSheetByName("Personal");
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(postData.employeeId)) { // Buscar en Columna B (Dni)
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return getJsonResponse({ status: "ok", message: "Colaborador eliminado." });
    }
    
    // 4. Registrar Justificación
    if (action === "Registrar_Justificacion") {
      var sheet = ss.getSheetByName("Justificaciones");
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(postData.employeeId) && data[i][1] === postData.date) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow >= 0) {
        sheet.getRange(foundRow, 3, 1, 2).setValues([[postData.type, postData.details]]);
      } else {
        sheet.appendRow([postData.employeeId, postData.date, postData.type, postData.details]);
      }
      return getJsonResponse({ status: "ok", message: "Justificación guardada." });
    }
    
    // 5. Eliminar Justificación
    if (action === "Eliminar_Justificacion") {
      var sheet = ss.getSheetByName("Justificaciones");
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(postData.employeeId) && data[i][1] === postData.date) {
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
        if (data[i][0] === postData.date) {
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
        if (data[i][0] === postData.date) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return getJsonResponse({ status: "ok", message: "Feriado eliminado." });
    }
    
    // 8. Marcas de Asistencia (Acciones: Ingreso, Inicio Refrigerio, Fin Refrigerio, Salida)
    var attendanceSheet = ss.getSheetByName("Asistencia");
    
    // Determinar la fecha y hora actual si no viene customizado
    var now = new Date();
    var formattedDate = postData.customDate || Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy");
    var formattedTime = postData.customTime || Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
    var timestamp = postData.customTimestamp || now.getTime();
    
    attendanceSheet.appendRow([
      formattedDate,            // 1. Fecha (A)
      formattedTime,            // 2. Hora (B)
      postData.employeeId,      // 3. DNI (C)
      postData.employeeName,    // 4. Nombre Colaborador (D)
      action,                   // 5. Acción (E)
      postData.details || "Registrado vía AsistenciaPro Web", // 6. Detalles (F)
      timestamp,                // 7. Timestamp Unix (G)
      postData.device || "---"  // 8. Dispositivo (H)
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
      dni: String(data[i][1]), // Columna B (Dni)
      name: data[i][2],        // Columna C (Nombre Completo)
      age: data[i][3],        // Columna D (Edad)
      gender: data[i][4],     // Columna E (Sexo)
      role: data[i][5],       // Columna F (Cargo / Puesto)
      workStart: formatTimeValue(data[i][6]),  // Columna G (Entrada Jornada)
      workEnd: formatTimeValue(data[i][7]),    // Columna H (Salida Jornada)
      breakStart: formatTimeValue(data[i][8]), // Columna I (Inicio Break)
      breakEnd: formatTimeValue(data[i][9]),   // Columna J (Fin Break)
      pin: String(data[i][10]), // Columna K (PIN)
      weeklySchedule: data[i][11] || "" // Columna L (Horarios Semanales)
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
    list.push({
      dni: String(data[i][0]),
      dateStr: data[i][1],
      type: data[i][2],
      details: data[i][3]
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
      dateStr: data[i][0],
      name: data[i][1]
    });
  }
  return list;
}

function getHistoryData(ss, filterDni) {
  var sheet = ss.getSheetByName("Asistencia");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var history = [];
  
  for (var i = 1; i < data.length; i++) {
    var dni = String(data[i][2]); // Columna C (DNI)
    if (filterDni && dni !== String(filterDni)) continue;
    
    history.push({
      dni: dni,                          // DNI
      name: data[i][3],                  // Nombre Colaborador
      action: data[i][4],                // Acción
      dateStr: formatDateValue(data[i][0]),     // Fecha (A)
      timeStr: formatLongTimeValue(data[i][1]), // Hora (B)
      timestamp: Number(data[i][6]),     // Timestamp Unix (G)
      details: data[i][5],               // Detalles (F)
      device: data[i][7]                 // Dispositivo (H)
    });
  }
  return history;
}
