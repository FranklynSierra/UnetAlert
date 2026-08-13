import { auth, db } from "../config/firebaseAdmin.js";

export const verifyUser = async (req, res, next) => {

    try {

        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "No autorizado"
            });
        }

        const decodedToken = await auth.verifyIdToken(token);

        const userDoc = await db
            .collection("usuarios")
            .doc(decodedToken.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                message: "Usuario no existe"
            });
        }

        req.user = {
            uid: decodedToken.uid,
            ...userDoc.data()
        };

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Token inválido"
        });

    }

};