import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { doc, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Swal from "sweetalert2";
import { db } from "../../services/firebase";
import { useWorkerIncidents } from "../../hook/useWorkerIncidents";
import { useAuth } from "../../hook/useAuth";

import Botones from "../../components/ui/Botones";
import Input from "../../components/ui/Input";
import ActaIncidentModal from "../../components/ActaIndicentModal/ActaIncidentModal";
import { PERMISOS } from "../../utils/permisions";
 
const gravedadBadge = {
    Leve: "success",
    Moderada: "warning",
    Grave: "orange",
    Crítica: "danger",
};

const estadoBadge = {
    Pendiente: "warning",
    "En proceso": "primary",
    Resuelto: "success",
};

function getInfraccionesColor(count) {
    if (count >= 3) return "danger";
    if (count >= 2) return "warning";
    return "success";
}

export default function WorkerDetail() {
    const { cedula } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { worker, incidents, loading, notFound, incidentsError } = useWorkerIncidents(cedula);

    const puedeEditar = PERMISOS.EDITAR_INCIDENTE.includes(userData?.rol);

    const [workerOverride, setWorkerOverride] = useState(null);
    const effectiveWorker = workerOverride || worker;

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ cedula: "", nombre: "", profesion: "", telefono: "", correo: "" });
    const [actaModalOpen, setActaModalOpen] = useState(false);

   useEffect(() => {
    if (effectiveWorker && !editing) {
        setForm({
            cedula: effectiveWorker.cedula || cedula || "",
            nombre: effectiveWorker.nombre || "",
            profesion: effectiveWorker.profesion || "",
            telefono: effectiveWorker.telefono || "",
            correo: effectiveWorker.correo || "",
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [worker, editing]);

    const handleSave = async () => {
        const cedulaClean = form.cedula.trim();

        if (!cedulaClean || !form.nombre.trim() || !form.profesion.trim() || !form.telefono.trim() || !form.correo.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Campos incompletos",
                text: "Complete cédula, nombre, profesión, teléfono y correo."
            });
            return;
        }

        const cedulaCambio = cedulaClean !== cedula;

        // Si va a cambiar la cédula, validar que no exista ya otro trabajador con ese ID
        if (cedulaCambio) {
            try {
                const conflictSnap = await getDoc(doc(db, "funcionarios", cedulaClean));
                if (conflictSnap.exists()) {
                    Swal.fire({
                        icon: "error",
                        title: "Cédula en uso",
                        text: `Ya existe un trabajador registrado con la cédula ${cedulaClean}.`
                    });
                    return;
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo validar la nueva cédula."
                });
                return;
            }
        }

        const result = await Swal.fire({
            title: "¿Guardar cambios?",
            text: cedulaCambio
                ? `Se cambiará la cédula de ${cedula} a ${cedulaClean} y se actualizarán ${incidents.length} incidente(s) relacionado(s).`
                : `Se actualizará el trabajador y ${incidents.length} incidente(s) relacionado(s).`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#0d6efd",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sí, guardar",
            cancelButtonText: "Cancelar"
        });

        if (!result.isConfirmed) return;

        setSaving(true);
        try {
            const nuevosDatos = {
                nombre: form.nombre,
                cedula: cedulaClean,
                profesion: form.profesion,
                telefono: form.telefono,
                correo: form.correo,
                infracciones: effectiveWorker.infracciones || 0,
                estado: effectiveWorker.estado || "activo",
                foto: effectiveWorker.foto ?? null,
            };

            if (cedulaCambio) {
                // 1. Crear el documento nuevo con el ID de la nueva cédula
                await setDoc(doc(db, "funcionarios", cedulaClean), nuevosDatos);

                // 2. Actualizar todos los incidentes: cedula, nombre, profesion, telefono, correo
                if (incidents.length > 0) {
                    const batch = writeBatch(db);
                    incidents.forEach((incident) => {
                        const incidentRef = doc(db, "incidentes", incident.id);
                        batch.update(incidentRef, {
                            cedula: cedulaClean,
                            nombreTrabajador: form.nombre,
                            profesion: form.profesion,
                            telefono: form.telefono,
                            correo: form.correo,
                        });
                    });
                    await batch.commit();
                }

                // 3. Borrar el documento viejo, solo después de que todo lo demás salió bien
                await deleteDoc(doc(db, "funcionarios", cedula));

                await Swal.fire({
                    icon: "success",
                    title: "Actualizado",
                    text: `Cédula cambiada a ${cedulaClean}. Se actualizaron ${incidents.length} incidente(s).`,
                    confirmButtonColor: "#0d6efd"
                });

                // 4. Redirigir a la nueva URL, ya que el parámetro de ruta cambió
                navigate(`/trabajador/${cedulaClean}`, { replace: true });

            } else {
                // Cédula no cambió: solo actualizar campos normales
                await setDoc(doc(db, "funcionarios", cedula), nuevosDatos, { merge: true });

                if (incidents.length > 0) {
                    const batch = writeBatch(db);
                    incidents.forEach((incident) => {
                        const incidentRef = doc(db, "incidentes", incident.id);
                        batch.update(incidentRef, {
                            nombreTrabajador: form.nombre,
                            profesion: form.profesion,
                            telefono: form.telefono,
                            correo: form.correo,
                        });
                    });
                    await batch.commit();
                }

                setWorkerOverride({ ...effectiveWorker, ...nuevosDatos });
                setEditing(false);

                await Swal.fire({
                    icon: "success",
                    title: "Actualizado",
                    text: `Se actualizó el trabajador y ${incidents.length} incidente(s) relacionado(s).`,
                    confirmButtonColor: "#0d6efd"
                });
            }

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron guardar los cambios."
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({
            cedula: effectiveWorker.cedula || cedula || "",
            nombre: effectiveWorker.nombre || "",
            profesion: effectiveWorker.profesion || "",
            telefono: effectiveWorker.telefono || "",
            correo: effectiveWorker.correo || "",
        });
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="text-muted">Cargando información del trabajador...</p>
            </div>
        );
    }

    if (notFound || !effectiveWorker) {
        return (
            <div className="container py-5 text-center">
                <p className="text-muted mt-2">Trabajador no encontrado.</p>
                <p className="text-muted small">
                    Cédula buscada: <code>{cedula}</code>
                </p>
                <Link to="/" className="btn btn-outline-secondary rounded-pill px-3 mt-2">
                    ← Volver al inicio
                </Link>
            </div>
        );
    }

    const infracciones = effectiveWorker.infracciones || 0;
    const colorInfracciones = getInfraccionesColor(infracciones);

    return (
        <div className="container py-5">
            <Link to="/">
                <Botones
                    className="btn btn-outline-secondary mb-4 rounded-pill px-3"
                    texto="← Volver al inicio"
                />
            </Link>

            <div className="row justify-content-center">
                <div className="col-lg-8">

                    <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
                        <div
                            className="p-4 p-md-5"
                            style={{ background: "linear-gradient(135deg, #fff4e6, #ffffff)" }}
                        >
                            <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="rounded-circle bg-warning d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                        style={{ width: 64, height: 64, fontSize: "1.5rem" }}
                                    >
                                        {effectiveWorker.nombre ? effectiveWorker.nombre.charAt(0).toUpperCase() : "?"}
                                    </div>
                                    <div>
                                        {editing ? (
                                            <Input
                                                type="text"
                                                className="fw-bold mb-1"
                                                placeholder="Nombre completo"
                                                value={form.nombre}
                                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                            />
                                        ) : (
                                            <h2 className="fw-bold mb-1">{effectiveWorker.nombre}</h2>
                                        )}

                                        {editing ? (
                                            <div className="input-group input-group-sm" style={{ maxWidth: 220 }}>
                                                <span className="input-group-text">Cédula</span>
                                                <Input
                                                    type="text"
                                                    value={form.cedula}
                                                    onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-2">
                                                Cédula: {effectiveWorker.cedula}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex align-items-start gap-3">
                                    <div className="text-center">
                                        <span className={`badge bg-${colorInfracciones} rounded-pill px-3 py-2 fs-6`}>
                                            {infracciones} {infracciones === 1 ? "infracción" : "infracciones"}
                                        </span>
                                        <p className="text-muted small mb-0 mt-1">Historial total</p>
                                    </div>

                                    {puedeEditar && !editing && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm rounded-pill"
                                            onClick={() => setEditing(true)}
                                        >
                                            Editar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <hr />

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-semibold">
                                        Profesión
                                    </label>
                                    {editing ? (
                                        <Input
                                            type="text"
                                            value={form.profesion}
                                            onChange={(e) => setForm({ ...form, profesion: e.target.value })}
                                        />
                                    ) : (
                                        <p className="mb-0 fw-medium">{effectiveWorker.profesion || "No especificada"}</p>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-semibold">
                                        Estado
                                    </label>
                                    <p className="mb-0">
                                        <span className={`badge rounded-pill ${effectiveWorker.estado === "activo" ? "bg-success" : "bg-secondary"}`}>
                                            {effectiveWorker.estado === "activo" ? "Activo" : effectiveWorker.estado || "No especificado"}
                                        </span>
                                    </p>
                                </div>

                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-semibold">
                                        Teléfono
                                    </label>
                                    {editing ? (
                                        <Input
                                            type="tel"
                                            value={form.telefono}
                                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                        />
                                    ) : (
                                        <p className="mb-0 fw-medium">{effectiveWorker.telefono || "No especificado"}</p>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-semibold">
                                        Correo
                                    </label>
                                    {editing ? (
                                        <Input
                                            type="email"
                                            value={form.correo}
                                            onChange={(e) => setForm({ ...form, correo: e.target.value })}
                                        />
                                    ) : (
                                        <p className="mb-0 fw-medium text-break">{effectiveWorker.correo || "No especificado"}</p>
                                    )}
                                </div>
                            </div>

                            {editing && (
                                <>
                                    {form.cedula.trim() !== cedula && (
                                        <div className="alert alert-warning small mt-3 mb-0 rounded-3">
                                            ⚠️ Estás cambiando la cédula de <strong>{cedula}</strong> a <strong>{form.cedula.trim() || "…"}</strong>.
                                            Esto actualizará la URL y todos los incidentes relacionados.
                                        </div>
                                    )}
                                    <div className="d-flex gap-2 mt-3">
                                        <button
                                            type="button"
                                            className="btn btn-primary rounded-pill px-4"
                                            disabled={saving}
                                            onClick={handleSave}
                                        >
                                            {saving ? "Guardando..." : "Guardar cambios"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary rounded-pill px-4"
                                            disabled={saving}
                                            onClick={handleCancel}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="fw-bold mb-0">Historial de incidentes</h4>
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-muted small">
                                {incidents.length} {incidents.length === 1 ? "registro" : "registros"}
                            </span>
                            {incidents.length > 0 && (
                                <button
                                    className="btn btn-sm btn-warning fw-bold rounded-pill px-3"
                                    onClick={() => setActaModalOpen(true)}
                                >
                                    Generar Acta
                                </button>
                            )}
                        </div>
                    </div>

                    {incidentsError && (
                        <div className="alert alert-warning d-flex align-items-center gap-2 rounded-4" role="alert">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <div>
                                No se pudo cargar el historial de incidentes. Es posible que falte
                                configurar un índice en Firestore — revisa la consola del navegador
                                (F12) para ver un link de creación automática si ese es el caso.
                            </div>
                        </div>
                    )}

                    {!incidentsError && incidents.length === 0 && (
                        <div className="card border-0 shadow-sm rounded-4 p-4 text-center">
                            <p className="text-muted mb-0 fst-italic">
                                Este trabajador no tiene incidentes registrados.
                            </p>
                        </div>
                    )}

                    {incidents.map((incident) => (
                        <Link
                            key={incident.id}
                            to={`/incidente/${incident.id}`}
                            className="text-decoration-none text-dark"
                        >
                            <div className="card border-0 shadow-sm rounded-4 p-3 mb-3">
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                                    <p className="mb-0 fw-medium">{incident.descripcion}</p>
                                    <div className="d-flex gap-2 flex-shrink-0">
                                        {incident.estado && (
                                            <span className={`badge bg-${estadoBadge[incident.estado] || "secondary"} rounded-pill`}>
                                                {incident.estado}
                                            </span>
                                        )}
                                        {incident.gravedad && (
                                            <span
                                                className={`badge rounded-pill ${
                                                    gravedadBadge[incident.gravedad] === "orange"
                                                        ? "text-white"
                                                        : `bg-${gravedadBadge[incident.gravedad] || "secondary"}`
                                                }`}
                                                style={
                                                    gravedadBadge[incident.gravedad] === "orange"
                                                        ? { backgroundColor: "#fd7e14" }
                                                        : {}
                                                }
                                            >
                                                {incident.gravedad}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex align-items-center gap-3 flex-wrap">
                                    {incident.tipo && (
                                        <small className="text-muted">
                                            <strong>Tipo:</strong> {incident.tipo}
                                        </small>
                                    )}
                                    {incident.lugar && (
                                        <small className="text-muted">
                                            <strong>Lugar:</strong> {incident.lugar}
                                        </small>
                                    )}
                                    <small className="text-muted ms-auto">
                                        {incident.fecha?.toDate
                                            ? incident.fecha.toDate().toLocaleDateString()
                                            : "Sin fecha"}
                                    </small>
                                </div>
                            </div>
                        </Link>
                    ))}

                </div>
            </div>
            <ActaIncidentModal
                isOpen={actaModalOpen}
                onClose={() => setActaModalOpen(false)}
                persona={effectiveWorker.nombre}
                cedulaPersona={effectiveWorker.cedula}
                rolPersona="el trabajador"
                incidents={incidents}
            />
        </div>
    );
}
