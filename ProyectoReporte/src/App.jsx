import "./App.css";
import { Routes, Route, Navigate } from "react-router";
import CreateIncidentWorker from "./pages/createIncidentWorker/CreateIncidentWorker";
import Dashboard from "./pages/dashboard/Dashboard";
import CreateIncident from "./pages/createIncident/CreateIncident";
import WorkerDetail from "./pages/workerDetail/WorkerDetail";
import Login from "./pages/login/Login";
import NavBar from "./components/navbar/navBar";
import { useAuth } from "./hook/useAuth";

import IncidentDetail from "./pages/IncidentDetail/IncidentDetail";
import EditIncident from "./pages/EditIncident/EditIncident";
import Register from "./pages/register/Register";
import { PERMISOS } from "./utils/permisions";
import StudentDetail from "./pages/studentDetail/StudentDetail";

function App() {

    const { user, userData } = useAuth();
    const puedeEditar =
        PERMISOS.EDITAR_INCIDENTE.includes(userData?.rol);
    const puedeRegistrar =
        PERMISOS.REGISTRAR_USUARIOS.includes(userData?.rol);

    if (user === undefined || userData === undefined) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ minHeight: "100vh" }}
            >
                <h3>Cargando...</h3>
            </div>
        );
    }

    return (
        <>
            {user ? <NavBar /> : null}
            <Routes>

                <Route
                    path="/"
                    element={
                        user ? (
                            <Dashboard user={user} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/incidente/:id"
                    element={
                        user ? (
                            <IncidentDetail />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/crearIncidenteTrabajador"
                    element={
                        user ? (
                            <CreateIncidentWorker />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/crearIncidente"
                    element={
                        user ? (
                            <CreateIncident />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/incidentes/editar/:id"
                    element={
                        puedeEditar
                            ? <EditIncident />
                            : <Navigate to="/" replace />
                    }
                />

                <Route
                    path="/login"
                    element={
                        user ? (
                            <Navigate to="/" replace />
                        ) : (
                            <Login />
                        )
                    }
                />

                <Route
                    path="/trabajador/:cedula"
                    element={
                        user ? (
                            <WorkerDetail />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/estudiante/:carnet"
                    element={
                        user ? (
                            <StudentDetail />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/registro"
                    element={
                        user && puedeRegistrar
                            ? <Register />
                            : <Navigate to="/" replace />
                    }
                />

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />

            </Routes>
        </>
    );
}

export default App;