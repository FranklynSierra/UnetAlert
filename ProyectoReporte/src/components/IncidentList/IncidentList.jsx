import { Link } from "react-router";

import UpdateIncident from "../updateIncident/UpdateIncident";
import { useAuth } from "../../hook/useAuth";
import { PERMISOS } from "../../utils/permisions";
import LimitedText from "../ui/LimitedText";

export default function IncidentList({ students, workers, incidents,  onIncidentUpdated }) {

    const { userData } = useAuth();

    const puedeEditar =
        PERMISOS.EDITAR_INCIDENTE.includes(userData?.rol);

    return (
        <div className="mt-4">
            <h3>Lista de Incidentes</h3>

            {incidents.length === 0 ? (
                <p>No hay incidentes registrados.</p>
            ) : (
                incidents.map((incident) => {

                    // Determina si es estudiante o trabajador.
                    // Fallback por si algún incidente viejo no tiene tipoPersona guardado.
                    const esTrabajador = incident.tipoPersona
                        ? incident.tipoPersona === "trabajador"
                        : Boolean(incident.cedula && !incident.carnet);

                    const persona = esTrabajador
                        ? workers?.[incident.cedula]
                        : students?.[incident.carnet];

                    const nombrePersona = esTrabajador
                        ? incident.nombreTrabajador
                        : incident.nombreEstudiante;

                    const idPersona = esTrabajador ? incident.cedula : incident.carnet;
                    const idLabel = esTrabajador ? "Cédula" : "Carnet";

                    const rutaPersona = esTrabajador
                        ? `/trabajador/${incident.cedula}`
                        : `/estudiante/${incident.carnet}`;

                    const infracciones = persona?.infracciones || 0;

                    const color = infracciones >= 3 ? "border-danger"
                        : infracciones >= 2 ? "border-warning"
                            : "border-success";

                    return (
                        <div
                            key={incident.id}
                            className={`p-3 mb-3 border border-3 rounded bg-light text-dark d-flex flex-column justify-content-between ${color}`}
                        >
                            <Link
                                to={`/incidente/${incident.id}`}
                                style={{ textDecoration: "none" }}
                                className="text-dark flex-grow-1"
                            >
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                        <span className={`badge ${esTrabajador ? "bg-warning text-dark" : "bg-primary"}`}>
                                            {esTrabajador ? "Trabajador" : "Estudiante"}
                                        </span>
                                        {nombrePersona && (
                                            <strong>{nombrePersona}</strong>
                                        )}
                                        {idPersona && (
                                            <small className="text-muted">
                                                {idLabel}: {idPersona}
                                            </small>
                                        )}
                                    </div>

                                    <p>
                                        <strong>Descripción:</strong>{" "}
                                        <LimitedText texto={incident.descripcion} limite={100} />
                                    </p>

                                    <p>
                                        <strong>Estado:</strong> {incident.estado}
                                    </p>
                                    <p className="text-muted">
                                        <strong>Fecha:</strong>{" "}
                                        {incident.fecha?.toDate
                                            ? incident.fecha.toDate().toLocaleString()
                                            : "Fecha no disponible"}
                                    </p>
                                </div>
                            </Link>

                            <div className="d-flex flex-column flex-sm-row gap-2 mt-2 pt-2 border-top">
                                {puedeEditar && (
                                    <UpdateIncident
                                        incident={incident}
                                        onIncidentUpdated={onIncidentUpdated}
                                    />
                                )}

                            

                                {rutaPersona && idPersona && (
                                    <Link
                                        to={rutaPersona}
                                        className="btn btn-outline-secondary btn-sm ms-sm-auto"
                                    >
                                        Ver historial
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}