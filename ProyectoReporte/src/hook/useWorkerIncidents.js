import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";

export function useWorkerIncidents(cedula) {
    const [worker, setWorker] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [incidentsError, setIncidentsError] = useState(false);

    useEffect(() => {
        if (!cedula) return;

        const fetchData = async () => {
            setLoading(true);
            setNotFound(false);
            setIncidentsError(false);

            // 1. Buscar al trabajador — si esto falla, SÍ es "no encontrado"
            try {
                const workerRef = doc(db, "funcionarios", cedula);
                const workerSnap = await getDoc(workerRef);

                if (!workerSnap.exists()) {
                    setNotFound(true);
                    setWorker(null);
                    setIncidents([]);
                    setLoading(false);
                    return;
                }

                setWorker(workerSnap.data());

            } catch (error) {
                console.error("Error al buscar el trabajador:", error);
                setNotFound(true);
                setLoading(false);
                return;
            }

            // 2. Buscar sus incidentes — si esto falla, NO significa que el
            //    trabajador no exista, solo que no se pudo traer su historial.
            try {
                const incidentsRef = collection(db, "incidentes");
                const q = query(
                    incidentsRef,
                    where("cedula", "==", cedula),
                    orderBy("fecha", "desc")
                );

                const incidentsSnap = await getDocs(q);
                const incidentsData = incidentsSnap.docs.map((d) => ({
                    id: d.id,
                    ...d.data()
                }));

                setIncidents(incidentsData);

            } catch (error) {
                console.error("Error al buscar los incidentes del trabajador:", error);
                setIncidentsError(true);
                setIncidents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cedula]);

    return { worker, incidents, loading, notFound, incidentsError };
}