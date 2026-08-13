import { auth, db } from "../config/firebaseAdmin.js";

export const createUser = async (req, res) => {

    try {

        // Usuario autenticado
        const usuarioActual = req.user;

        // Solo el administrador puede registrar usuarios
        if (usuarioActual.rol !== "admin") {
            return res.status(403).json({
                message: "No tiene permisos para registrar usuarios."
            });
        }

        // Datos enviados desde el frontend
        const {
            nombre,
            correo,
            contraseña,
            rol
        } = req.body;

        // Roles permitidos
        const rolesPermitidos = [
            "rectorado",
            "directora_seguridad",
            "jefe_departamento",
            "vigilante"
        ];

        // Validar el rol
        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({
                message: "Rol no válido."
            });
        }

        // Crear usuario en Firebase Authentication
        const newUser = await auth.createUser({
            email: correo,
            password: contraseña,
            displayName: nombre
        });

        // Guardar información adicional en Firestore
        await db.collection("usuarios").doc(newUser.uid).set({
            nombre,
            correo,
            rol
        });

        res.json({
            success: true,
            uid: newUser.uid
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};