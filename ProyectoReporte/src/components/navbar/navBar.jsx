
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import Botones from '../ui/Botones';
import LOGO from '../../assets/LOGOUNET.png'
import { useAuth } from '../../hook/useAuth';
import { Link } from 'react-router';
import { PERMISOS } from '../../utils/permisions';
import Swal from 'sweetalert2';

export default function NavBar() {
const { userData } = useAuth();

    const puedeRegistrar =
        PERMISOS.REGISTRAR_USUARIOS.includes(userData?.rol);
    
    const logout = async () => {
        const result = await Swal.fire({
            title: "¿Salir sesión?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#0d6efd",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sí, registrar",
            cancelButtonText: "Cancelar"
        });
        
        if (!result.isConfirmed) {
            return;
        }
        try {
            await signOut(auth);
                       await Swal.fire({
    icon: "success",
    title: "¡Usuario cerró sesión con éxito!",
    confirmButtonColor: "#0d6efd"
});
        } catch (error) {
            console.error(error);
                  Swal.fire({
    icon: "error",
    title: "Error",
    text: "No se pudo salir de la sesión."
});
        }
    };

return (
<nav className="d-flex justify-content-between align-items-center p-3 shadow-sm">
    {/* Contenedor del logo con un ancho máximo controlado */}
           <style>{`
                .navbar-logo {
                    transition: transform 0.25s ease;
                }
                .navbar-logo:hover {
                    transform: scale(1.15);
                }
            `}</style>

{/* Agregamos d-flex y align-items-center para alinearlos en línea y centrados verticalmente */}
<Link to="/" className="text-decoration-none text-dark d-flex align-items-center gap-2">
    <div style={{ maxWidth: '60px' }} className="w-25 w-md-auto">
        <img
            src={LOGO}
            alt="Logo UNET"
            style={{ filter: 'brightness(0)' }}
            className="img-fluid navbar-logo"
        />
    </div>

    <h2 className="m-0 fw-bold fs-4 fs-md-2">
        UNET
        <span className="text-primary">ALERT</span>
    </h2>
</Link>
<div>
{
(puedeRegistrar) && (

<Link to="/registro">
   <Botones type='button'
   texto='Registrar usuario
   '  className='btn-outline-primary'/>
</Link>


)
}
    <Botones
        type="button"
        texto="Cerrar Sesión"
        className='btn-outline-primary'
        onClick={logout}
    />
    </div>
</nav>
);
}
