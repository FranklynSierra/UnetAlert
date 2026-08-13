import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../services/firebase';
import { query, orderBy, limit, startAfter, where, getDocs, doc, getDoc, collection, Timestamp } from 'firebase/firestore';
import IncidentList from '../../components/IncidentList/IncidentList';
import Botones from '../../components/ui/Botones';
import Input from '../../components/ui/Input';
import { Link } from 'react-router';
import { useAuth } from '../../hook/useAuth';

const PAGE_SIZE = 20;
const PERSON_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos
const WEEK_STORAGE_KEY = 'dashboard_selected_week';

// --- Helpers de fecha (semana Lunes-Domingo), tomados de la lógica de Mantenimiento ---

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function formatDateShort(date) {
  return date.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

// 'YYYY-MM' para el value del <input type="month">
function toMonthInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);

  const incidentsCollectionRef = useMemo(() => collection(db, "incidentes"), []);

  // --- Caché de estudiantes ---
  const studentsCacheRef = useRef({});
  const [studentsCache, setStudentsCacheState] = useState({});

  const setStudentsCache = useCallback((updater) => {
    setStudentsCacheState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      studentsCacheRef.current = next;
      return next;
    });
  }, []);

  // --- Caché de trabajadores ---
  const workersCacheRef = useRef({});
  const [workersCache, setWorkersCacheState] = useState({});

  const setWorkersCache = useCallback((updater) => {
    setWorkersCacheState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      workersCacheRef.current = next;
      return next;
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  const [currentMonday, setCurrentMonday] = useState(() => {
    const saved = sessionStorage.getItem(WEEK_STORAGE_KEY);
    if (saved) {
      const d = new Date(saved);
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  const currentSunday = useMemo(() => getSunday(currentMonday), [currentMonday]);

  const esSemanaActual = useMemo(
    () => getMonday(new Date()).getTime() === currentMonday.getTime(),
    [currentMonday]
  );

  const startWeek = useCallback((baseDate) => {
    const monday = getMonday(baseDate);
    setCurrentMonday(monday);
    sessionStorage.setItem(WEEK_STORAGE_KEY, monday.toISOString());
  }, []);

  const prevWeek = useCallback(() => {
    setCurrentMonday((prev) => {
      const p = new Date(prev);
      p.setDate(p.getDate() - 7);
      sessionStorage.setItem(WEEK_STORAGE_KEY, p.toISOString());
      return p;
    });
  }, []);

  const nextWeek = useCallback(() => {
    setCurrentMonday((prev) => {
      const n = new Date(prev);
      n.setDate(n.getDate() + 7);
      sessionStorage.setItem(WEEK_STORAGE_KEY, n.toISOString());
      return n;
    });
  }, []);

  const volverASemanaActual = useCallback(() => {
    sessionStorage.removeItem(WEEK_STORAGE_KEY);
    startWeek(new Date());
  }, [startWeek]);

  const handleMonthPickerChange = useCallback((e) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    startWeek(date);
  }, [startWeek]);

  const { userData } = useAuth();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  const fetchIncidents = useCallback(async ({ reset = false } = {}) => {
    try {
      if (reset) {
        setLoadingInitial(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }

      const constraints = [];

      if (filterEstado) constraints.push(where("estado", "==", filterEstado));
      if (filterTipo) constraints.push(where("tipo", "==", filterTipo));

      constraints.push(where("fecha", ">=", Timestamp.fromDate(currentMonday)));
      constraints.push(where("fecha", "<=", Timestamp.fromDate(currentSunday)));

      constraints.push(orderBy("fecha", "desc"));
      if (!reset && lastDocRef.current) constraints.push(startAfter(lastDocRef.current));
      constraints.push(limit(PAGE_SIZE));

      const q = query(incidentsCollectionRef, ...constraints);
      const snap = await getDocs(q);

      const newDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setIncidents((prev) => (reset ? newDocs : [...prev, ...newDocs]));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error al traer la lista:", error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [incidentsCollectionRef, filterEstado, filterTipo, currentMonday, currentSunday]);

  // Solo trae estudiantes de incidentes que NO son de trabajador
  const fetchStudentsForIncidents = useCallback(async (incidentsList) => {
    const now = Date.now();
    const carnets = [...new Set(
      incidentsList
        .filter((i) => i.tipoPersona !== "trabajador")
        .map((i) => i.carnet)
        .filter(Boolean)
    )];

    const faltantes = carnets.filter((carnet) => {
      const cached = studentsCacheRef.current[carnet];
      if (!cached) return true;
      return (now - cached.fetchedAt) > PERSON_CACHE_TTL_MS;
    });

    if (faltantes.length === 0) return;

    try {
      const results = await Promise.all(
        faltantes.map((carnet) => getDoc(doc(db, "estudiantes", carnet)))
      );

      setStudentsCache((prev) => {
        const nuevo = { ...prev };
        results.forEach((snap, idx) => {
          const carnet = faltantes[idx];
          if (snap.exists()) {
            nuevo[carnet] = { data: snap.data(), fetchedAt: Date.now() };
          }
        });
        return nuevo;
      });
    } catch (error) {
      console.error("Error al traer estudiantes:", error);
    }
  }, [setStudentsCache]);

  // Solo trae trabajadores de incidentes marcados como tipoPersona === "trabajador"
  const fetchWorkersForIncidents = useCallback(async (incidentsList) => {
    const now = Date.now();
    const cedulas = [...new Set(
      incidentsList
        .filter((i) => i.tipoPersona === "trabajador")
        .map((i) => i.cedula)
        .filter(Boolean)
    )];

    const faltantes = cedulas.filter((cedula) => {
      const cached = workersCacheRef.current[cedula];
      if (!cached) return true;
      return (now - cached.fetchedAt) > PERSON_CACHE_TTL_MS;
    });

    if (faltantes.length === 0) return;

    try {
      const results = await Promise.all(
        faltantes.map((cedula) => getDoc(doc(db, "funcionarios", cedula)))
      );

      setWorkersCache((prev) => {
        const nuevo = { ...prev };
        results.forEach((snap, idx) => {
          const cedula = faltantes[idx];
          if (snap.exists()) {
            nuevo[cedula] = { data: snap.data(), fetchedAt: Date.now() };
          }
        });
        return nuevo;
      });
    } catch (error) {
      console.error("Error al traer trabajadores:", error);
    }
  }, [setWorkersCache]);


//////accidentes en seguridad y salud en el tranajo, relacionado a insasel
  const handleLocalUpdate = (incidenteEditado) => {
    setIncidents((prevIncidents) =>
      prevIncidents.map((incident) =>
        incident.id === incidenteEditado.id ? incidenteEditado : incident
      )
    );
  };

  useEffect(() => {
    fetchIncidents({ reset: true });
  }, [fetchIncidents]);

  useEffect(() => {
    if (incidents.length > 0) {
      fetchStudentsForIncidents(incidents);
      fetchWorkersForIncidents(incidents);
    }
  }, [incidents, fetchStudentsForIncidents, fetchWorkersForIncidents]);

  const students = useMemo(() => {
    const obj = {};
    Object.entries(studentsCache).forEach(([carnet, entry]) => {
      obj[carnet] = entry.data;
    });
    return obj;
  }, [studentsCache]);

  const workers = useMemo(() => {
    const obj = {};
    Object.entries(workersCache).forEach(([cedula, entry]) => {
      obj[cedula] = entry.data;
    });
    return obj;
  }, [workersCache]);

  const filteredIncidents = useMemo(() => {
    if (!searchTerm.trim()) return incidents;

    const term = searchTerm.trim().toLowerCase();

    return incidents.filter((incident) => {
      const campos = [
        incident.descripcion,
        incident.lugar,
        incident.estado,
        incident.telefono,
        incident.correo,
        incident.nombreEstudiante,
        incident.carnet,
        incident.nombreTrabajador,
        incident.cedula,
        incident.profesion,
        incident.reportante
      ];
      return campos.some((campo) => campo?.toLowerCase().includes(term));
    });
  }, [incidents, searchTerm]);

  const hayFiltrosActivos = searchTerm.trim() || filterEstado || filterTipo || !esSemanaActual;

  const limpiarFiltros = () => {
    setSearchTerm("");
    setFilterEstado("");
    setFilterTipo("");
    volverASemanaActual();
  };

  return (
    <>
      <div className="container mt-4 px-3">

        <div className="row align-items-center gy-3 mb-4">

          <div className="col-12 col-md-8 text-center text-md-start">
            <h1 className="fw-bold mb-1 fs-2 fs-md-1">
              Panel de Administración
            </h1>
            <h6 className="text-secondary mb-0">
              Bienvenido: <span className="fw-semibold text-dark">{userData?.nombre || 'Usuario'}</span>
            </h6>
          </div>

          <div className="col-12 col-md-4 text-center text-md-end d-flex flex-column flex-sm-row gap-2">
            <Link to="/crearIncidente" className="text-decoration-none flex-fill">
              <Botones
                texto="Incidente Estudiante"
                className="btn btn-primary w-100"
              />
            </Link>
            <Link to="/crearIncidenteTrabajador" className="text-decoration-none flex-fill">
              <Botones
                texto="Incidente Trabajador"
                className="btn btn-dark w-100"
              />
            </Link>
          </div>

        </div>

        <div className="card border-0 shadow-sm mb-4 rounded-4">
          <div className="card-body p-3">

            <div className="input-group shadow-sm mb-3">
              <span className="input-group-text bg-white">🔍</span>
              <Input
                type="text"
                placeholder="Buscar en lo cargado: descripción, lugar, estudiante/trabajador, carnet/cédula, teléfono, correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearchTerm("")}
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap mb-3 bg-light rounded-3 px-3 py-2 border">
              <small className="text-muted fw-bold text-uppercase" style={{ letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                Período Semanal
              </small>

              <div className="vr d-none d-md-block" style={{ height: "1.2rem" }}></div>

              <div className="d-flex align-items-center gap-2 bg-white border rounded-3 px-1 py-1">
                <div className="d-flex align-items-center gap-1 border-end pe-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    title="Semana anterior"
                    onClick={prevWeek}
                  >
                    ‹
                  </button>

                  <span className="small fw-bold text-secondary px-2" style={{ minWidth: 150, textAlign: "center" }}>
                    {formatDateShort(currentMonday)} - {formatDateShort(currentSunday)}
                  </span>

                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    title="Semana siguiente"
                    onClick={nextWeek}
                  >
                    ›
                  </button>
                </div>

                <input
                  type="month"
                  className="form-control form-control-sm border-0 bg-transparent"
                  style={{ width: 150 }}
                  value={toMonthInputValue(currentMonday)}
                  onChange={handleMonthPickerChange}
                  title="Saltar a un mes"
                />
              </div>

              <button
                type="button"
                className={`btn btn-sm ${esSemanaActual ? "btn-primary" : "btn-outline-primary"}`}
                onClick={volverASemanaActual}
              >
                {esSemanaActual ? "✓ Esta semana" : "Volver a esta semana"}
              </button>
            </div>

            <div className="row g-2">

              <div className="col-md-6">
                <select
                  className="form-select text-black border border-secondary"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="Pendiente">🟡 Pendiente</option>
                  <option value="En proceso">🔵 En proceso</option>
                  <option value="Resuelto">🟢 Resuelto</option>
                </select>
              </div>

              <div className="col-md-6">
                <select
                  className="form-select text-black border border-secondary"
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="Conducta">Conducta</option>
                  <option value="Violencia">Violencia</option>
                  <option value="Acoso">Acoso</option>
                  <option value="Robo">Robo</option>
                  <option value="Daños">Daños a la propiedad</option>
                  <option value="Consumo de sustancias">Consumo de sustancias</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

            </div>

            {hayFiltrosActivos && (
              <div className="d-flex align-items-center justify-content-between mt-3">
                <small className="text-muted">
                  {filteredIncidents.length} resultado(s) en lo cargado
                </small>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={limpiarFiltros}
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}

          </div>
        </div>

        <div className="row">
          <div className="col-12">

            {loadingInitial ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <>
                <IncidentList
                  students={students}
                  workers={workers}
                  incidents={filteredIncidents}
                  onIncidentUpdated={handleLocalUpdate}
                 
                />

                {hasMore && !searchTerm.trim() && (
                  <div className="text-center my-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary rounded-pill px-4"
                      disabled={loadingMore}
                      onClick={() => fetchIncidents({ reset: false })}
                    >
                      {loadingMore ? "Cargando..." : "Cargar más"}
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>
    </>
  );
}