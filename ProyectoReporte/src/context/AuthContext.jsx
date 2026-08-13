import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import { AuthContext } from "./createContext";

export default function AuthProvider({ children }) {

    const [user, setUser] = useState(undefined);
    const [userData, setUserData] = useState(undefined);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (usuario) => {

            if (!usuario) {
                setUser(null);
                setUserData(null);
                return;
            }

            setUser(usuario);

            try {

                const docRef = doc(db, "usuarios", usuario.uid);

                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {

                    setUserData(docSnap.data());

                } else {

                    setUserData(null);

                }

            } catch (error) {

                console.error(error);
                setUserData(null);

            }

        });

        return unsubscribe;

    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                userData,
                 isAdmin: userData?.rol === "admin",
        isProfesor: userData?.rol === "profesor",
        isVigilante: userData?.rol === "vigilante",
        isEstudiante: userData?.rol === "estudiante"
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}