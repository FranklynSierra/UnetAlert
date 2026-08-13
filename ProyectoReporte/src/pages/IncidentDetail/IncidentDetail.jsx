import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Botones from '../../components/ui/Botones';

const estadoBadge = {
    Pendiente: "warning",
    "En proceso": "primary",
    Resuelto: "success",
};

export default function IncidentDetail() {
    const { id } = useParams();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getIncident = async () => {
            try {
                const docRef = doc(db, "incidentes", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setIncident({ ...docSnap.data(), id: docSnap.id });
                } else {
                    console.log("¡El incidente no existe en la base de datos!");
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        getIncident();
    }, [id]);

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="text-muted">Cargando detalles del incidente...</p>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="container py-5 text-center">
                <p className="text-muted mt-2">Incidente no encontrado.</p>
                <Link to="/" className="btn btn-outline-secondary mt-2">
                    ← Volver al inicio
                </Link>
            </div>
        );
    }

    // Determina si es estudiante o trabajador.
    // Fallback por si algún incidente viejo no tiene tipoPersona guardado.
    const esTrabajador = incident.tipoPersona
        ? incident.tipoPersona === "trabajador"
        : Boolean(incident.cedula && !incident.carnet);

    const nombrePersona = esTrabajador ? incident.nombreTrabajador : incident.nombreEstudiante;
    const idPersona = esTrabajador ? incident.cedula : incident.carnet;
    const idLabel = esTrabajador ? "Cédula" : "Carnet";
    const categoriaLabel = esTrabajador ? "Profesión" : "Carrera";
    const categoriaValor = esTrabajador ? incident.profesion : incident.carrera;
    const rutaPersona = esTrabajador ? `/trabajador/${incident.cedula}` : `/estudiante/${incident.carnet}`;

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-lg-8">

                    <Link to="/" className="btn btn-outline-secondary mb-4 rounded-pill px-3">
                        ← Volver al inicio
                    </Link>

                    <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5">

                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h2 className="fw-bold mb-0">Detalle del Incidente</h2>
                                <p className="text-muted small mb-0">ID: {incident.id}</p>
                            </div>
                            <div className="d-flex gap-2">
                                <span className={`badge ${esTrabajador ? "bg-dark" : "bg-primary"} rounded-pill px-3 py-2`}>
                                    {esTrabajador ? "Trabajador" : "Estudiante"}
                                </span>
                                {incident.estado && (
                                    <span className={`badge bg-${estadoBadge[incident.estado] || "secondary"} px-3 py-2 rounded-pill`}>
                                        {incident.estado}
                                    </span>
                                )}
                            </div>
                        </div>

                        <hr className="mb-4" />

                        {/* Datos de la persona (estudiante o trabajador) */}
                        <div
                            className="card border-0 shadow-sm mb-4 rounded-4"
                            style={{
                                background: esTrabajador
                                    ? "linear-gradient(135deg, #fff4e6, #ffffff)"
                                    : "linear-gradient(135deg, #eef3ff, #ffffff)"
                            }}
                        >
                            <div className="card-body p-4">
                                <h5 className="text-primary d-flex align-items-center gap-2 mb-3">
                                    Datos del {esTrabajador ? "trabajador" : "estudiante"}
                                </h5>
                                <div className="row">
                                    <div className="col-md-6 mb-2">
                                        <label className="text-muted small text-uppercase">{idLabel}</label>
                                        <h6 className="mb-0">{idPersona || "No especificado"}</h6>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="text-muted small text-uppercase">Nombre</label>
                                        <h6 className="mb-0">{nombrePersona || "No especificado"}</h6>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="text-muted small text-uppercase">{categoriaLabel}</label>
                                        <h6 className="mb-0">{categoriaValor || "No especificada"}</h6>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="text-muted small text-uppercase">Correo</label>
                                        <h6 className="mb-0">{incident.correo || "No especificado"}</h6>
                                    </div>
                                    <div className="col-md-6 mb-2">
                                        <label className="text-muted small text-uppercase">Teléfono</label>
                                        <h6 className="mb-0">{incident.telefono || "No especificado"}</h6>
                                    </div>

                                    {idPersona && (
                                        <div className="col-12 mt-2">
                                            <Link to={rutaPersona}>
                                                <Botones
                                                    type="button"
                                                    texto="Ver historial de incidentes"
                                                    className="btn-outline-primary"
                                                />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            Información del incidente
                        </h5>

                        <div className="mb-3">
                            <label className="text-muted small text-uppercase">
                                Descripción
                            </label>
                            <p className="mb-0">{incident.descripcion || "Sin descripción"}</p>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="text-muted small text-uppercase">
                                    Tipo de incidente
                                </label>
                                <p className="mb-0">{incident.tipo || "No especificado"}</p>
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="text-muted small text-uppercase">
                                    Lugar
                                </label>
                                <p className="mb-0">{incident.lugar || "No especificado"}</p>
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="text-muted small text-uppercase">
                                    Reportado por
                                </label>
                                <p className="mb-0">{incident.reportante || "No especificado"}</p>
                            </div>

                            {incident.fecha && (
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small text-uppercase">
                                        Fecha
                                    </label>
                                    <p className="mb-0">
                                        {incident.fecha?.toDate
                                            ? incident.fecha.toDate().toLocaleString()
                                            : incident.fecha}
                                    </p>
                                </div>
                            )}
                        </div>

                        <hr className="my-4" />

                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            Evidencia fotográfica
                        </h5>

                        {incident.imagenes?.length > 0 ? (
                            <div className="d-flex flex-wrap gap-3">
                                {incident.imagenes.map((img) => (
                                    <a
                                        key={img.publicId}
                                        href={img.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img
                                            src={img.url}
                                            alt="Evidencia"
                                            className="img-thumbnail shadow-sm rounded-3"
                                            style={{
                                                width: "150px",
                                                height: "150px",
                                                objectFit: "cover",
                                                transition: "transform 0.2s",
                                            }}
                                        />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted fst-italic">No hay imágenes disponibles.</p>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}