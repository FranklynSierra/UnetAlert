import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { doc, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Swal from "sweetalert2";
import { db } from "../../services/firebase";
import { useStudentIncidents } from "../../hook/useStudentIncident";
import { useAuth } from "../../hook/useAuth";
import { PERMISOS } from "../../utils/permisions";
import Botones from "../../components/ui/Botones";
import Input from "../../components/ui/Input";
import ActaIncidentModal from "../../components/ActaIndicentModal/ActaIncidentModal";

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

export default function StudentDetail() {
    const { carnet } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { student, incidents, loading, notFound, incidentsError } = useStudentIncidents(carnet);

    const puedeEditar = PERMISOS.EDITAR_INCIDENTE.includes(userData?.rol);

    // Override local para reflejar los cambios sin tener que recargar la página
    const [studentOverride, setStudentOverride] = useState(null);
    const effectiveStudent = studentOverride || student;

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ carnet: "", nombre: "", carrera: "", telefono: "", correo: "" });
    const [actaModalOpen, setActaModalOpen] = useState(false);

    useEffect(() => {
        if (effectiveStudent) {
            setForm({
                carnet: effectiveStudent.carnet || carnet || "",
                nombre: effectiveStudent.nombre || "",
                carrera: effectiveStudent.carrera || "",
                telefono: effectiveStudent.telefono || "",
                correo: effectiveStudent.correo || "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student]);

    const handleSave = async () => {
        const carnetClean = form.carnet.trim();

        if (!carnetClean || !form.nombre.trim() || !form.carrera.trim() || !form.telefono.trim() || !form.correo.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Campos incompletos",
                text: "Complete carnet, nombre, carrera, teléfono y correo."
            });
            return;
        }

        const carnetCambio = carnetClean !== carnet;

        // Si va a cambiar el carnet, validar que no exista ya otro estudiante con ese ID
        if (carnetCambio) {
            try {
                const conflictSnap = await getDoc(doc(db, "estudiantes", carnetClean));
                if (conflictSnap.exists()) {
                    Swal.fire({
                        icon: "error",
                        title: "Carnet en uso",
                        text: `Ya existe un estudiante registrado con el carnet ${carnetClean}.`
                    });
                    return;
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo validar el nuevo carnet."
                });
                return;
            }
        }

        const result = await Swal.fire({
            title: "¿Guardar cambios?",
            text: carnetCambio
                ? `Se cambiará el carnet de ${carnet} a ${carnetClean} y se actualizarán ${incidents.length} incidente(s) relacionado(s).`
                : `Se actualizará el estudiante y ${incidents.length} incidente(s) relacionado(s).`,
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
                carnet: carnetClean,
                carrera: form.carrera,
                telefono: form.telefono,
                correo: form.correo,
                infracciones: effectiveStudent.infracciones || 0,
                estado: effectiveStudent.estado || "activo",
                foto: effectiveStudent.foto ?? null,
            };

            if (carnetCambio) {
                // 1. Crear el documento nuevo con el ID del nuevo carnet
                await setDoc(doc(db, "estudiantes", carnetClean), nuevosDatos);

                // 2. Actualizar todos los incidentes: carnet, nombre, carrera, telefono, correo
                if (incidents.length > 0) {
                    const batch = writeBatch(db);
                    incidents.forEach((incident) => {
                        const incidentRef = doc(db, "incidentes", incident.id);
                        batch.update(incidentRef, {
                            carnet: carnetClean,
                            nombreEstudiante: form.nombre,
                            carrera: form.carrera,
                            telefono: form.telefono,
                            correo: form.correo,
                        });
                    });
                    await batch.commit();
                }

                // 3. Borrar el documento viejo, solo después de que todo lo demás salió bien
                await deleteDoc(doc(db, "estudiantes", carnet));

                await Swal.fire({
                    icon: "success",
                    title: "Actualizado",
                    text: `Carnet cambiado a ${carnetClean}. Se actualizaron ${incidents.length} incidente(s).`,
                    confirmButtonColor: "#0d6efd"
                });

                // 4. Redirigir a la nueva URL, ya que el parámetro de ruta cambió
                navigate(`/estudiante/${carnetClean}`, { replace: true });

            } else {
                // Carnet no cambió: solo actualizar campos normales
                await setDoc(doc(db, "estudiantes", carnet), nuevosDatos, { merge: true });

                if (incidents.length > 0) {
                    const batch = writeBatch(db);
                    incidents.forEach((incident) => {
                        const incidentRef = doc(db, "incidentes", incident.id);
                        batch.update(incidentRef, {
                            nombreEstudiante: form.nombre,
                            carrera: form.carrera,
                            telefono: form.telefono,
                            correo: form.correo,
                        });
                    });
                    await batch.commit();
                }

                setStudentOverride({ ...effectiveStudent, ...nuevosDatos });
                setEditing(false);

                await Swal.fire({
                    icon: "success",
                    title: "Actualizado",
                    text: `Se actualizó el estudiante y ${incidents.length} incidente(s) relacionado(s).`,
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
            carnet: effectiveStudent.carnet || carnet || "",
            nombre: effectiveStudent.nombre || "",
            carrera: effectiveStudent.carrera || "",
            telefono: effectiveStudent.telefono || "",
            correo: effectiveStudent.correo || "",
        });
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="text-muted">Cargando información del estudiante...</p>
            </div>
        );
    }

    if (notFound || !effectiveStudent) {
        return (
            <div className="container py-5 text-center">
                <p className="text-muted mt-2">Estudiante no encontrado.</p>
                <p className="text-muted small">
                    Carnet buscado: <code>{carnet}</code>
                </p>
                <Link to="/" className="btn btn-outline-secondary rounded-pill px-3 mt-2">
                    ← Volver al inicio
                </Link>
            </div>
        );
    }

    const infracciones = effectiveStudent.infracciones || 0;
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

                    {/* Ficha del estudiante */}
                    <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
                        <div
                            className="p-4 p-md-5"
                            style={{ background: "linear-gradient(135deg, #eef3ff, #ffffff)" }}
                        >
                            <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                        style={{ width: 64, height: 64, fontSize: "1.5rem" }}
                                    >
                                        {effectiveStudent.nombre ? effectiveStudent.nombre.charAt(0).toUpperCase() : "?"}
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
                                            <h2 className="fw-bold mb-1">{effectiveStudent.nombre}</h2>
                                        )}

                                        {editing ? (
                                            <div className="input-group input-group-sm" style={{ maxWidth: 220 }}>
                                                <span className="input-group-text">Carnet</span>
                                                <Input
                                                    type="text"
                                                    value={form.carnet}
                                                    onChange={(e) => setForm({ ...form, carnet: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-2">
                                                Carnet: {effectiveStudent.carnet}
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
                                        Carrera
                                    </label>
                                    {editing ? (
                                        <Input
                                            type="text"
                                            value={form.carrera}
                                            onChange={(e) => setForm({ ...form, carrera: e.target.value })}
                                        />
                                    ) : (
                                        <p className="mb-0 fw-medium">{effectiveStudent.carrera || "No especificada"}</p>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-semibold">
                                        Estado
                                    </label>
                                    <p className="mb-0">
                                        <span className={`badge rounded-pill ${effectiveStudent.estado === "activo" ? "bg-success" : "bg-secondary"}`}>
                                            {effectiveStudent.estado === "activo" ? "Activo" : effectiveStudent.estado || "No especificado"}
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
                                        <p className="mb-0 fw-medium">{effectiveStudent.telefono || "No especificado"}</p>
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
                                        <p className="mb-0 fw-medium text-break">{effectiveStudent.correo || "No especificado"}</p>
                                    )}
                                </div>
                            </div>

                            {editing && (
                                <>
                                    {form.carnet.trim() !== carnet && (
                                        <div className="alert alert-warning small mt-3 mb-0 rounded-3">
                                            ⚠️ Estás cambiando el carnet de <strong>{carnet}</strong> a <strong>{form.carnet.trim() || "…"}</strong>.
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

                    {/* Historial de incidentes */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="fw-bold mb-0">Historial de incidentes</h4>
                        <div className="d-flex align-items-center gap-3">
                            <span className="text-muted small">
                                {incidents.length} {incidents.length === 1 ? "registro" : "registros"}
                            </span>
                            {incidents.length > 0 && (
                                <button
                                    className="btn btn-sm btn-primary fw-bold rounded-pill px-3"
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
                                Este estudiante no tiene incidentes registrados.
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
                persona={effectiveStudent.nombre}
                cedulaPersona={effectiveStudent.carnet}
                rolPersona="el estudiante"
                incidents={incidents}
            />
        </div>
    );
}
