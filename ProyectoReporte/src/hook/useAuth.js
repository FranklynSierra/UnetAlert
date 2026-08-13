import { useContext } from "react";
import { AuthContext } from "../context/createContext";
export function useAuth() {
    return useContext(AuthContext);
}
