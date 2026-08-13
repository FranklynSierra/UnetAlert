import { useState } from 'react';
import Botones from '../../components/ui/Botones';
import "../login/Login.css";
import LOGO from "../../assets/LOGOUNET.png";
import Input from '../../components/ui/Input';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hook/useAuth';
import Swal from 'sweetalert2';

export default function Register() {
    const { user } = useAuth();
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [nombre, setNombre] = useState("");
    const [rol, setRol] = useState("vigilante");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: "¿Registrar usuario?",
            text: "Se almacenará el usuario en el sistema.",
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

        setLoading(true);

        try {
            const token = await user.getIdToken();

            const response = await fetch(
                 `${import.meta.env.VITE_API_URL}/api/users/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        nombre,
                        correo,
                        contraseña,
                        rol,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error al crear el usuario");
            }

            await Swal.fire({
                icon: "success",
                title: "Usuario registrado",
                text: "El usuario fue guardado correctamente.",
                confirmButtonColor: "#0d6efd"
            });

            setNombre("");
            setCorreo("");
            setContraseña("");
            setRol("vigilante");

            navigate("/");

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message || "No se pudo registrar el usuario."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{ minHeight: "100vh" }}>
            <form
                onSubmit={handleRegister}
                className="login-card shadow-lg"
                style={{ width: "100%", maxWidth: "500px" }}
            >

                {/* Logo */}
                <div className="text-center mb-4">
                    <img
                        src={LOGO}
                        alt="Logo UNET"
                        width="100"
                        className="logo-blanco"
                    />

                    <h2 className="mt-3 text-white fw-bold">
                        Registrar
                        <span className="text-primary"> Usuario</span>
                    </h2>

                    <p className="text-white-50 mb-0">
                        Crear una nueva cuenta del sistema
                    </p>
                </div>

                {/* Nombre */}
                <div className="mb-3">
                    <label className="form-label text-white fw-bold">
                       Nombre completo
                    </label>
                    <Input
                        type="text"
                        placeholder="Nombre..."
                        className="form-control-lg"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </div>

                {/* Correo */}
                <div className="mb-3">
                    <label className="form-label text-white fw-bold">
                        Correo electrónico
                    </label>
                    <Input
                        type="email"
                        placeholder="correo@unet.edu.ve"
                        className="form-control-lg"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                    />
                </div>

                {/* Contraseña */}
                <div className="mb-3">
                    <label className="form-label text-white fw-bold">
                       Contraseña
                    </label>
                    <Input
                        type="password"
                        placeholder="********"
                        className="form-control-lg"
                        value={contraseña}
                        onChange={(e) => setContraseña(e.target.value)}
                    />
                </div>

                {/* Rol */}
                <div className="mb-4">
                    <label className="form-label text-white fw-bold">
                        Rol
                    </label>
                    <select
                        className="form-select form-select-lg"
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                    >
                        <option value="rectorado">Rectorado</option>
                        <option value="directora_seguridad">Directora de Seguridad</option>
                        <option value="vigilante">Vigilante</option>
                        <option value="jefe_departamento">Jefe de Departamento</option>
                    </select>
                </div>

                <Botones
                    type="submit"
                    disabled={loading}
                    texto={loading ? "Registrando..." : "Registrar Usuario"}
                    className="w-100 btn-primary py-2 fw-semibold"
                />

            </form>
        </div>
    );
}