import { useNavigate } from "react-router";
import Botones from "../ui/Botones";
export default function UpdateIncident({ incident }) {
    const navigate = useNavigate();

    return (
        <Botones
            type="button"
            className="btn-outline-primary w-100 w-md-auto"
            texto="Editar"
            onClick={() => navigate(`/incidentes/editar/${incident.id}`)}
        />
    );

}