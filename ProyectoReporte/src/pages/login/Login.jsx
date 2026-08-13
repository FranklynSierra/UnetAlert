import { useState } from "react";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";

import { auth, googleProvider } from "../../services/firebase";

import Input from "../../components/ui/Input";
import Botones from "../../components/ui/Botones";

import LOGO from "../../assets/LOGOUNET.png";
import "./Login.css";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
export default function Login() {
const navigate = useNavigate();
    // ===========================
    // Estados
    // ===========================
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");

    // ===========================
    // Login con correo
    // ===========================
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            await signInWithEmailAndPassword(auth, correo, contraseña);

           Swal.fire({
              icon: "success",
              title: "¡Sesión iniciada con éxito!",
              confirmButtonColor: "#0d6efd"
          });
            navigate("/")
          

        } catch (error) {
            console.error(error);
                  Swal.fire({
    icon: "error",
    title: "Error",
    text: "No se pudo Iniciar Sesión."
});
        }
    };

    // ===========================
    // Login con Google
    // ===========================
    const handleGoogleLogin = async () => {
        try {

            await signInWithPopup(auth, googleProvider);

            alert("¡Sesión iniciada con Google!");

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // ===========================
    // Vista
    // ===========================
    return (
        <div
            className="login-container"
            style={{ minHeight: "100vh" }}
        >
            <form
                onSubmit={handleLogin}
                className="login-card"
                style={{ width: "100%", maxWidth: "400px" }}
            >

                {/* Logo */}

                <div className="text-center mb-4">
                    <img
                        src={LOGO}
                        alt="Logo UNET"
                        width="100 "
                        className="logo-blanco"
                    />

                    <h2 className="mt-3  text-white fw-bold">
                        UNET
                        <span className="text-primary  fw-bold">ALERT</span>
                    </h2>

                    <p className=" text-white fw-bold">
                        Inicia sesión para continuar
                    </p>
                </div>

                {/* Correo */}

                <div className="mb-3">

                    <label className="form-label  text-white fw-bold">
                        Correo electrónico
                    </label>

                    <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={correo}
                        className="form-control-lg"
                        onChange={(e) => setCorreo(e.target.value)}
                    />

                </div>

                {/* Contraseña */}

                <div className="mb-4">

                    <label className="form-label  text-white fw-bold">
                        Contraseña
                    </label>

                    <Input
                        type="password"
                        placeholder="********"
                        value={contraseña}
                        className="form-control-lg"
                        onChange={(e) => setContraseña(e.target.value)}
                    />

                </div>

                {/* Botón Login */}

                <div className="mb-3">

                    <Botones 
                        type="submit"
                         className="w-100  btn-primary"
                        texto="Iniciar sesión"
                    />

                </div>

                {/* Separador */}

                <div className="text-center text-white mb-3">
                    ───── o ─────
                </div>

                {/* Google */}

                <Botones
                    type="button"

                    className="w-100 btn-primary"
                    texto="Continuar con Google"
                    onClick={handleGoogleLogin}
                />

            </form>
        </div>
    );
}