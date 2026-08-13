
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";

export function useStudentIncidents(carnet) {
    const [student, setStudent] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!carnet) return;

        const fetchData = async () => {
            setLoading(true);
            setNotFound(false);

            try {
                // 1. Datos del estudiante
                const studentRef = doc(db, "estudiantes", carnet);
                const studentSnap = await getDoc(studentRef);

                if (!studentSnap.exists()) {
                    setNotFound(true);
                    setStudent(null);
                    setIncidents([]);
                    return;
                }

                setStudent(studentSnap.data());

                // 2. Todos los incidentes de ese carnet
                const incidentsRef = collection(db, "incidentes");
                const q = query(
                    incidentsRef,
                    where("carnet", "==", carnet),
                    orderBy("fecha", "desc")
                );

                const incidentsSnap = await getDocs(q);
                const incidentsData = incidentsSnap.docs.map((d) => ({
                    id: d.id,
                    ...d.data()
                }));

                setIncidents(incidentsData);

            } catch (error) {
                console.error(error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [carnet]);

    return { student, incidents, loading, notFound };
}