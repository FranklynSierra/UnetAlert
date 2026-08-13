// src/components/actas/ActaIncidenteModal.jsx
//
// Modal para generar "Actas de Constancia" a partir de los incidentes de un
// trabajador o estudiante. Reutiliza el mismo patrón de mantenimiento.astro:
//   1) El acta se pinta con estilos inline en un área oculta (#offscreen-acta-print)
//   2) html2canvas-pro captura esa área a un <canvas> por cada acta
//   3) jsPDF ensambla todos los canvases en un único PDF multi-página
//   4) Se muestra un preview antes de confirmar la descarga
//
// Ajusta la ruta de import de `db` a la de tu proyecto.
import { useState, useRef } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function formatFechaLarga(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} del ${d.getFullYear()}`;
}

// Estado inicial por cada incidente seleccionado (testigos, jefe, lugar, hora, narrativa)
function makeEmptyActaData(incident) {
  return {
    lugar: incident.lugar || "",
    hora: "9:00 a.m.",
    testigo1Nombre: "",
    testigo1Cedula: "",
    testigo2Nombre: "",
    testigo2Cedula: "",
    jefeNombre: "",
    jefeCedula: "",
    narrativa: "", // texto de los hechos, escrito a mano en el modal
  };
}

// Arma el HTML del acta (idéntico en estructura al modelo docx) con estilos
// inline — necesario para que html2canvas-pro capture bien el layout.
function buildActaHTML({ persona, cedulaPersona, rolPersona, incident, data }) {
  const fecha = incident.fecha?.toDate ? incident.fecha.toDate() : new Date(incident.fecha || Date.now());
  const fechaLarga = formatFechaLarga(fecha);

  return `
    <div style="max-width:21cm; margin:0 auto; background:#fff; padding:48px; min-height:29cm; font-family: 'Times New Roman', serif;">
      <div style="text-align:center; margin-bottom:32px;">
        <h2 style="font-size:20px; font-weight:700; letter-spacing:0.1em; margin:0;">ACTA</h2>
      </div>
      <p style="font-size:14px; line-height:1.8; text-align:justify; color:#000;">
        Reunidos en <b>${data.lugar || "____________________"}</b>, el día ${fechaLarga},
        siendo las <b>${data.hora}</b>, los trabajadores <b>${data.testigo1Nombre || "____________"}</b>,
        venezolano(a) mayor de edad y con cédula de identidad N° <b>${data.testigo1Cedula || "________"}</b>,
        y <b>${data.testigo2Nombre || "____________"}</b>, venezolano(a) mayor de edad y con cédula de
        identidad N° <b>${data.testigo2Cedula || "________"}</b>, como testigos, a los fines de efectuar
        verificación respecto a ${rolPersona} <b>${persona}</b>, Cédula de Identidad N°
        <b>${cedulaPersona}</b>, de conformidad con los deberes que imponen las Leyes, Normas y Reglamentos
        vigentes, se deja constancia:
      </p>
      <p style="font-size:14px; line-height:1.8; text-align:justify; color:#000;">
        ${data.narrativa || "<i>(Redacción de los hechos pendiente)</i>"}
      </p>
      <p style="font-size:14px; line-height:1.8; text-align:justify; color:#000;">
        Que dicha situación fue notificada a su jefe inmediato
        ${data.jefeNombre ? `<b>${data.jefeNombre}</b>${data.jefeCedula ? `, con cédula de identidad N° <b>${data.jefeCedula}</b>` : ""}` : "____________________"}.
        Se deja constancia que el día de hoy ${fechaLarga}, se observó por los testigos antes identificados
        lo aquí narrado.
      </p>
      <p style="font-size:14px; line-height:1.8; margin-top:24px;">
        Termino, se leyó y firman en señal de conformidad en la presente fecha, en dos (2) ejemplares de
        un mismo tenor a un solo efecto.
      </p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:48px; margin-top:100px; padding-top:8px;">
        <div style="text-align:center;">
          <div style="border-top:2px solid #000; margin-bottom:8px;"></div>
          <p style="font-size:11px; font-weight:700; margin:0;">${data.testigo1Nombre || "Testigo 1"}</p>
          <p style="font-size:9px; margin:2px 0 0 0;">N° ${data.testigo1Cedula || "____________"}</p>
        </div>
        <div style="text-align:center;">
          <div style="border-top:2px solid #000; margin-bottom:8px;"></div>
          <p style="font-size:11px; font-weight:700; margin:0;">${data.testigo2Nombre || "Testigo 2"}</p>
          <p style="font-size:9px; margin:2px 0 0 0;">N° ${data.testigo2Cedula || "____________"}</p>
        </div>
      </div>
    </div>
  `;
}

export default function ActaIncidentModal({ isOpen, onClose, persona, cedulaPersona, rolPersona = "el/la trabajador(a)", incidents }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [actaData, setActaData] = useState({}); // { [incidentId]: {...} }
  const [previewImages, setPreviewImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [canvasesRef, setCanvasesRef] = useState([]);
  const offscreenRef = useRef(null);

  if (!isOpen) return null;

  const toggleSelect = (incident) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(incident.id);
      if (exists) return prev.filter((id) => id !== incident.id);
      setActaData((d) => (d[incident.id] ? d : { ...d, [incident.id]: makeEmptyActaData(incident) }));
      return [...prev, incident.id];
    });
  };

  const updateField = (incidentId, field, value) => {
    setActaData((d) => ({ ...d, [incidentId]: { ...d[incidentId], [field]: value } }));
  };

  const copyFirstToAll = () => {
    if (selectedIds.length < 2) return;
    const base = actaData[selectedIds[0]];
    setActaData((d) => {
      const next = { ...d };
      selectedIds.slice(1).forEach((id) => {
        next[id] = { ...next[id], testigo1Nombre: base.testigo1Nombre, testigo1Cedula: base.testigo1Cedula,
          testigo2Nombre: base.testigo2Nombre, testigo2Cedula: base.testigo2Cedula,
          jefeNombre: base.jefeNombre, jefeCedula: base.jefeCedula, lugar: base.lugar, hora: base.hora };
      });
      return next;
    });
  };

  const validateRow = (id) => {
    const d = actaData[id];
    return d && d.testigo1Nombre && d.testigo1Cedula && d.testigo2Nombre && d.testigo2Cedula && d.lugar && d.narrativa;
  };

  async function captureIncidentToCanvas(incident) {
    const html = buildActaHTML({
      persona, cedulaPersona, rolPersona, incident, data: actaData[incident.id],
    });
    offscreenRef.current.innerHTML = html;
    offscreenRef.current.style.width = "850px";
    offscreenRef.current.style.background = "#fff";
    await new Promise((r) => setTimeout(r, 30));
    const canvas = await html2canvas(offscreenRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: 850,
      windowWidth: 850,
      height: offscreenRef.current.scrollHeight,
      windowHeight: offscreenRef.current.scrollHeight,
    });
    return canvas;
  }

  // Genera el acta de UN solo incidente (botón "Generar solo esta")
  const generarIndividual = async (incident) => {
    if (!validateRow(incident.id)) {
      alert("Completa testigos, lugar y narrativa antes de generar el acta.");
      return;
    }
    setGenerating(true);
    try {
      const canvas = await captureIncidentToCanvas(incident);
      setCanvasesRef([canvas]);
      setPreviewImages([{ label: `Acta — ${formatFechaLarga(incident.fecha?.toDate ? incident.fecha.toDate() : incident.fecha)}`, src: canvas.toDataURL("image/png") }]);
    } finally {
      setGenerating(false);
    }
  };

  // Genera el acta general: una página por cada incidente seleccionado, un
  // único PDF multi-página al final — mismo patrón que "constancia" en mantenimiento.
  const generarGeneral = async () => {
    const invalid = selectedIds.filter((id) => !validateRow(id));
    if (selectedIds.length === 0) {
      alert("Selecciona al menos un incidente.");
      return;
    }
    if (invalid.length > 0) {
      alert("Hay incidentes seleccionados sin testigos/lugar/narrativa completos.");
      return;
    }
    setGenerating(true);
    try {
      const canvases = [];
      const images = [];
      for (const id of selectedIds) {
        const incident = incidents.find((i) => i.id === id);
        const canvas = await captureIncidentToCanvas(incident);
        canvases.push(canvas);
        images.push({
          label: `Acta — ${formatFechaLarga(incident.fecha?.toDate ? incident.fecha.toDate() : incident.fecha)}`,
          src: canvas.toDataURL("image/png"),
        });
      }
      setCanvasesRef(canvases);
      setPreviewImages(images);
    } finally {
      setGenerating(false);
    }
  };

  const confirmarDescarga = async () => {
    if (canvasesRef.length === 0) return;
    setGenerating(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      canvasesRef.forEach((canvas, idx) => {
        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;
        if (idx > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(imgHeightMm, pdfHeight));
      });
      const nombreArchivo = `Acta_${persona.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(nombreArchivo);
      setPreviewImages([]);
      setCanvasesRef([]);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(15,23,42,0.7)" }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">Generar Acta — {persona}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {previewImages.length === 0 ? (
              <>
                <p className="text-muted small">
                  Selecciona los incidentes a incluir. Completa testigos, lugar, hora y la narrativa
                  de los hechos para cada uno antes de generar el PDF.
                </p>
                {selectedIds.length > 1 && (
                  <button className="btn btn-sm btn-outline-secondary mb-3" onClick={copyFirstToAll}>
                    Copiar testigos/lugar del primero a los demás seleccionados
                  </button>
                )}

                {incidents.length === 0 && (
                  <p className="text-muted fst-italic">Este registro no tiene incidentes.</p>
                )}

                {incidents.map((incident) => {
                  const checked = selectedIds.includes(incident.id);
                  const data = actaData[incident.id];
                  return (
                    <div key={incident.id} className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-3">
                          <input
                            type="checkbox"
                            className="form-check-input mt-1"
                            checked={checked}
                            onChange={() => toggleSelect(incident)}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between">
                              <p className="mb-1 fw-medium">{incident.descripcion}</p>
                              <small className="text-muted">
                                {incident.fecha?.toDate ? incident.fecha.toDate().toLocaleDateString() : "Sin fecha"}
                              </small>
                            </div>
                            <small className="text-muted">
                              {incident.tipo && <span className="me-3"><strong>Tipo:</strong> {incident.tipo}</span>}
                              {incident.gravedad && <span><strong>Gravedad:</strong> {incident.gravedad}</span>}
                            </small>

                            {checked && data && (
                              <div className="row g-2 mt-3">
                                <div className="col-md-6">
                                  <input className="form-control form-control-sm" placeholder="Testigo 1 - nombre"
                                    value={data.testigo1Nombre} onChange={(e) => updateField(incident.id, "testigo1Nombre", e.target.value)} />
                                </div>
                                <div className="col-md-6">
                                  <input className="form-control form-control-sm" placeholder="Testigo 1 - cédula"
                                    value={data.testigo1Cedula} onChange={(e) => updateField(incident.id, "testigo1Cedula", e.target.value)} />
                                </div>
                                <div className="col-md-6">
                                  <input className="form-control form-control-sm" placeholder="Testigo 2 - nombre"
                                    value={data.testigo2Nombre} onChange={(e) => updateField(incident.id, "testigo2Nombre", e.target.value)} />
                                </div>
                                <div className="col-md-6">
                                  <input className="form-control form-control-sm" placeholder="Testigo 2 - cédula"
                                    value={data.testigo2Cedula} onChange={(e) => updateField(incident.id, "testigo2Cedula", e.target.value)} />
                                </div>
                                <div className="col-md-4">
                                  <input className="form-control form-control-sm" placeholder="Jefe inmediato - nombre"
                                    value={data.jefeNombre} onChange={(e) => updateField(incident.id, "jefeNombre", e.target.value)} />
                                </div>
                                <div className="col-md-4">
                                  <input className="form-control form-control-sm" placeholder="Jefe inmediato - cédula"
                                    value={data.jefeCedula} onChange={(e) => updateField(incident.id, "jefeCedula", e.target.value)} />
                                </div>
                                <div className="col-md-4">
                                  <input className="form-control form-control-sm" placeholder="Lugar"
                                    value={data.lugar} onChange={(e) => updateField(incident.id, "lugar", e.target.value)} />
                                </div>
                                <div className="col-md-3">
                                  <input className="form-control form-control-sm" placeholder="Hora"
                                    value={data.hora} onChange={(e) => updateField(incident.id, "hora", e.target.value)} />
                                </div>
                                <div className="col-12">
                                  <label className="form-label small mb-1">Narrativa de los hechos</label>
                                  <textarea
                                    className="form-control form-control-sm"
                                    rows={4}
                                    value={data.narrativa}
                                    onChange={(e) => updateField(incident.id, "narrativa", e.target.value)}
                                    placeholder="Ej: 1. Que el trabajador no se presentó en su sitio de trabajo. 2. Que no se tiene ningún justificativo..."
                                  />
                                </div>
                                <div className="col-12 text-end">
                                  <button
                                    className="btn btn-sm btn-dark"
                                    disabled={generating}
                                    onClick={() => generarIndividual(incident)}
                                  >
                                    Generar solo esta acta
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="d-flex flex-column align-items-center gap-4">
                {previewImages.map((img, idx) => (
                  <div key={idx} className="text-center">
                    <p className="small text-muted text-uppercase fw-bold">{img.label}</p>
                    <img src={img.src} alt={img.label} style={{ maxWidth: "100%", boxShadow: "0 20px 40px rgba(0,0,0,.2)" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Área oculta usada solo para renderizar y capturar con html2canvas-pro */}
            <div ref={offscreenRef} style={{ position: "fixed", left: "-9999px", top: 0 }}></div>
          </div>

          <div className="modal-footer">
            {previewImages.length === 0 ? (
              <>
                <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn btn-primary" disabled={generating || selectedIds.length === 0} onClick={generarGeneral}>
                  {generating ? "Generando..." : `Generar Acta General (${selectedIds.length})`}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => { setPreviewImages([]); setCanvasesRef([]); }}>
                  Volver a editar
                </button>
                <button className="btn btn-primary" disabled={generating} onClick={confirmarDescarga}>
                  {generating ? "Descargando..." : "Confirmar y descargar PDF"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
