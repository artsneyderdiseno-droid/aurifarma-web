/**
 * Aurifarma · Registro de cotizaciones del sitio web en Google Sheets.
 * Implementación: Aplicación web · Ejecutar como: Yo · Acceso: Cualquier usuario.
 */
const SHEET_ID = '1vhG0S-vi0nfI-41uUFlAedfLCIZi11b1ZuSFa5fvadU';
const SHEET_NAME = 'Cotizaciones';
const HEADERS = ['Registrado', 'No. cotización', 'Fecha', 'Hora', 'Nombre', 'Celular', 'Correo', 'Ciudad y país', 'Empresa o consultorio', 'Productos', 'Referencias', 'Unidades', 'Notas', 'Autorización de datos', 'Página'];
const MAX_POR_HORA = 20;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.website) return respuesta_(true); // Campo trampa: lo llenan los bots
    const error = validar_(data);
    if (error) return respuesta_(false, error);

    // Límite de envíos por correo y por hora (protección contra spam)
    const cache = CacheService.getScriptCache();
    const clave = 'n_' + String(data.email).toLowerCase().slice(0, 80);
    const enviados = Number(cache.get(clave) || 0);
    if (enviados >= MAX_POR_HORA) return respuesta_(false, 'Demasiadas solicitudes');
    cache.put(clave, String(enviados + 1), 3600);

    const items = (Array.isArray(data.items) ? data.items : []).slice(0, 60);
    const productos = items.map(function (it) {
      return [it.name, it.ref, it.unit].filter(Boolean).join(' · ') + ' × ' + (parseInt(it.qty, 10) || 1);
    }).join('\n');
    const unidades = items.reduce(function (n, it) { return n + (parseInt(it.qty, 10) || 1); }, 0);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      obtenerHoja_().appendRow([new Date()].concat([
        data.no, data.fecha, data.hora, data.name, data.phone, data.email, data.city, data.company,
        productos, items.length, unidades, data.notes,
        data.consent ? 'Sí · ' + data.consent : 'No', data.page,
      ].map(limpiar_)));
    } finally {
      lock.releaseLock();
    }
    return respuesta_(true);
  } catch (err) {
    console.error(err);
    return respuesta_(false, 'Error interno');
  }
}

// Permite comprobar desde el navegador que la aplicación web está activa
function doGet() {
  return respuesta_(true, 'Servicio de cotizaciones de Aurifarma activo');
}

function validar_(d) {
  if (!d.name || String(d.name).trim().length < 2) return 'Nombre inválido';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email || '').trim())) return 'Correo inválido';
  if (String(d.phone || '').replace(/\D/g, '').length < 7) return 'Celular inválido';
  if (!d.consent) return 'Falta la autorización de datos';
  if (!Array.isArray(d.items) || !d.items.length) return 'Cotización vacía';
  return '';
}

// Recorta textos y evita que un valor se interprete como fórmula en la hoja
function limpiar_(v) {
  if (typeof v === 'number') return v;
  const s = String(v == null ? '' : v).trim().slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function obtenerHoja_() {
  const libro = SpreadsheetApp.openById(SHEET_ID);
  let hoja = libro.getSheetByName(SHEET_NAME);
  if (!hoja) {
    hoja = libro.getSheets()[0];
    if (hoja.getLastRow() > 0) hoja = libro.insertSheet(SHEET_NAME);
    else hoja.setName(SHEET_NAME);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(HEADERS);
    hoja.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0f1e2d').setFontColor('#ffffff');
    hoja.setFrozenRows(1);
    hoja.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
    hoja.setColumnWidth(10, 360);
    hoja.getRange('J:J').setWrap(true);
  }
  return hoja;
}

function respuesta_(ok, mensaje) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, mensaje: mensaje || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ejecútala una vez desde el editor para autorizar el acceso a la hoja y crear los encabezados
function prepararHoja() {
  obtenerHoja_();
}
