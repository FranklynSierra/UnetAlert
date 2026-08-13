import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import Botones from '../ui/Botones';
import Swal from 'sweetalert2';

export default function DeleteIncident({ id, onIncidentDeleted }) {
    
    const handleDelete = async () => {


        try {
            const result = await Swal.fire({
    title: "¿Eliminar imagen?",
    text: "Las imagenes de eliminaran también.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar"
});

if (!result.isConfirmed) return;
            // Apuntamos exactamente al documento por su ID único
            const incidentRef = doc(db, "incidentes", id);
            
            // Ejecutamos la eliminación en Firestore
            await deleteDoc(incidentRef);

                    await Swal.fire({
               icon: "success",
               title: "Incidente Eliminado",
               text: "El incidente fue Eliminado correctamente.",
               confirmButtonColor: "#0d6efd"
           });
            
            // Avisamos al componente padre (App.jsx) que refresque la lista
            if (onIncidentDeleted) {
                onIncidentDeleted(id);
            }
        } catch (error) {
            console.error("Error al eliminar el incidente:", error);
          Swal.fire({
           icon: "error",
           title: "Error",
           text: "No se pudo eliminar el incidente correctamente."
       });
        }
    };

    return (
        <Botones 
            onClick={handleDelete} 
            type="button" 
            texto="Eliminar" 
             className="btn btn-outline-danger w-100 w-sm-auto"
            
        />
    );
}
