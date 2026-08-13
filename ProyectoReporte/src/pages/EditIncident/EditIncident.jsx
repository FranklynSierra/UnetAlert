import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

import Input from "../../components/ui/Input";
import Botones from "../../components/ui/Botones";
import Swal from "sweetalert2";

export default function EditIncident() {

    const { id } = useParams();
    const navigate = useNavigate();
    const [newImages, setNewImages] = useState([]);
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [imagesToDelete, setImagesToDelete] = useState([]);

    useEffect(() => {

        const loadIncident = async () => {
            try {
                const docRef = doc(db, "incidentes", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setIncident({
                        id: docSnap.id,
                        ...docSnap.data()
                    });
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error(error);
                setNotFound(true);
            } finally {
                setLoadingPage(false);
            }
        };

        loadIncident();

    }, [id]);

    const deleteImageCloudinary = async (publicId) => {

        const response = await fetch(
            "http://localhost:3001/api/cloudinary/delete",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ publicId })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

    };

    // Solo marca/desmarca la imagen para borrar, sin tocar Cloudinary ni Firestore
    const toggleMarkImageForDeletion = (publicId) => {
        setImagesToDelete(prev =>
            prev.includes(publicId)
                ? prev.filter(pid => pid !== publicId)
                : [...prev, publicId]
        );
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
const result = await Swal.fire({
    title: "¿Desea actualizar el incidente?",
    text: "Se actualizará el incidente en el sistema.",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#0d6efd",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sí, actualizar",
    cancelButtonText: "Cancelar"
});

if (!result.isConfirmed) {
    return;
}
        try {

            setLoading(true);

            const incidentRef = doc(db, "incidentes", id);

            let uploadedImages = [];

            // 1. Validar y subir nuevas imágenes
            if (newImages.length > 0) {

                for (const image of newImages) {
                    if (!image.type.startsWith("image/")) {
                        alert(`${image.name} no es válida`);
                        return;
                    }
                }

                uploadedImages = await Promise.all(
                    newImages.map(async (image) => {

                        const formData = new FormData();

                        formData.append("file", image);
                        formData.append("upload_preset", "ml_default");

                        const response = await fetch(
                            `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                        const data = await response.json();

                        if (!response.ok) {
                                  Swal.fire({
    icon: "error",
    title: "Error",
    text: "Error subiendo imagen"
});
                        }

                        return {
                            url: data.secure_url,
                            publicId: data.public_id
                        };

                    })
                );

            }

            // 2. Borrar en Cloudinary las imágenes marcadas para eliminar.
            //    Si alguna falla, se lanza el error y NO se guarda nada
            //    (ni el updateDoc, ni se pierden las marcas del usuario).
            if (imagesToDelete.length > 0) {
                await Promise.all(
                    imagesToDelete.map((publicId) =>
                        deleteImageCloudinary(publicId)
                    )
                );
            }

            // 3. Armar el arreglo final de imágenes:
            //    (actuales - marcadas para borrar) + nuevas subidas
            const imagenesFinales = [
                ...(incident.imagenes || []).filter(
                    (img) => !imagesToDelete.includes(img.publicId)
                ),
                ...uploadedImages
            ];

            // 4. Persistir todo en Firestore de una sola vez
            await updateDoc(incidentRef, {
                descripcion: incident.descripcion,
                estado: incident.estado,
              
                lugar: incident.lugar,
                tipo: incident.tipo,
                imagenes: imagenesFinales
            });

                     await Swal.fire({
    icon: "success",
    title: "Incidente Actualizado",
    text: "El incidente fue actualizado correctamente.",
    confirmButtonColor: "#0d6efd"
});
            navigate("/");

        } catch (error) {

            console.error(error);
                Swal.fire({
    icon: "error",
    title: "Error",
    text: "Ocurrió un error al actualizar el incidente. No se guardaron los cambios."
});
            // No tocamos imagesToDelete ni incident.imagenes:
            // el usuario puede intentar guardar de nuevo.

        } finally {

            setLoading(false);

        }

    };

    if (loadingPage) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="text-muted">Cargando incidente...</p>
            </div>
        );
    }

    if (notFound || !incident) {
        return (
            <div className="container py-5 text-center">
                <p className="text-muted mt-2">Incidente no encontrado.</p>
                <Link to="/" className="btn btn-outline-secondary rounded-pill px-3 mt-2">
                    ← Volver al inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <Link to="/">
                <Botones
                    className="btn btn-outline-secondary mb-4 rounded-pill px-3"
                    disabled={loading}
                    texto="← Volver al inicio"
                />
            </Link>

            <div className="row justify-content-center">
                <div className="col-lg-8">

                    <form
                        onSubmit={handleUpdate}
                        className="card border-0 shadow-lg p-4 p-md-5 rounded-4"
                        style={{ backgroundColor: "#fdfdfd" }}
                    >

                        <div className="text-center mb-4">
                            <h2 className="fw-bold mb-0">Editar Incidente</h2>
                            <p className="text-muted small">
                                Actualice la información del incidente
                            </p>
                        </div>

                        {/* Descripción */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Descripción
                            </label>

                            <textarea
                                className="form-control shadow-sm"
                                rows="4"
                                value={incident.descripcion}
                                onChange={(e) =>
                                    setIncident({
                                        ...incident,
                                        descripcion: e.target.value
                                    })
                                }
                            />
                        </div>

                      

                            {/* Estado */}
                            <div className=" mb-3">
                                <label className="form-label fw-semibold">
                                    Estado
                                </label>

                                <select
                                    className="form-select text-black shadow-sm"
                                    value={incident.estado}
                                    onChange={(e) =>
                                        setIncident({
                                            ...incident,
                                            estado: e.target.value
                                        })
                                    }
                                >
                                    <option value="Pendiente">🟡 Pendiente</option>
                                    <option value="En proceso">🔵 En proceso</option>
                                    <option value="Resuelto">🟢 Resuelto</option>
                                </select>
                            </div>

                         

                        

                        {/* Tipo */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Tipo de incidente
                            </label>

                            <select
                                className="form-select text-black shadow-sm"
                                value={incident.tipo}
                                onChange={(e) =>
                                    setIncident({
                                        ...incident,
                                        tipo: e.target.value
                                    })
                                }
                            >
                                <option value="Conducta">Conducta</option>
                                <option value="Violencia">Violencia</option>
                                <option value="Acoso">Acoso</option>
                                <option value="Robo">Robo</option>
                                <option value="Daños">Daños a la propiedad</option>
                                <option value="Consumo de sustancias">Consumo de sustancias</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>

                        {/* Lugar */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Lugar
                            </label>

                            <Input
                                type="text"
                                value={incident.lugar}
                                onChange={(e) =>
                                    setIncident({
                                        ...incident,
                                        lugar: e.target.value
                                    })
                                }
                            />
                        </div>

                        {/* Imágenes actuales y nuevas */}
                        {(incident.imagenes?.length > 0 || newImages.length > 0) && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold">
                                    Evidencia fotográfica
                                </label>

                                <div className="d-flex flex-wrap gap-3">

                                    {incident.imagenes?.map((img) => {
                                        const marcada = imagesToDelete.includes(img.publicId);

                                        return (
                                            <div key={img.publicId} className="position-relative">
                                                <img
                                                    src={img.url}
                                                    alt="Evidencia"
                                                    className="img-thumbnail shadow-sm rounded-3"
                                                    style={{
                                                        width: "150px",
                                                        height: "150px",
                                                        objectFit: "cover",
                                                        opacity: marcada ? 0.35 : 1
                                                    }}
                                                />

                                                {marcada && (
                                                    <span
                                                        className="badge bg-danger position-absolute top-50 start-50 translate-middle"
                                                    >
                                                        Se eliminará
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    className={`btn btn-sm position-absolute top-0 end-0 rounded-circle ${marcada ? "btn-secondary" : "btn-danger"}`}
                                                    style={{ width: 28, height: 28, padding: 0, lineHeight: 1 }}
                                                    onClick={() => toggleMarkImageForDeletion(img.publicId)}
                                                >
                                                    {marcada ? "↺" : "X"}
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {newImages.map((img, index) => (
                                        <div key={index} className="position-relative">
                                            <img
                                                src={URL.createObjectURL(img)}
                                                alt="Nueva evidencia"
                                                className="img-thumbnail shadow-sm rounded-3 border-primary"
                                                style={{
                                                    width: "150px",
                                                    height: "150px",
                                                    objectFit: "cover"
                                                }}
                                            />
                                            <span className="badge bg-primary position-absolute top-0 start-0 m-1">
                                                Nueva
                                            </span>
                                        </div>
                                    ))}

                                </div>

                                {imagesToDelete.length > 0 && (
                                    <p className="text-danger small mt-2 mb-0">
                                        {imagesToDelete.length} imagen(es) se eliminarán al guardar cambios.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Cambiar imagen */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Agregar evidencia (opcional)
                            </label>

                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                required={false}
                                className="shadow-sm"
                                onChange={(e) => setNewImages(Array.from(e.target.files))}
                            />
                        </div>

                        <div className="d-flex gap-2">

                            <Botones
                                type="submit"
                                disabled={loading}
                                texto={loading ? "Guardando..." : "Guardar Cambios"}
                                className="btn btn-primary w-100 py-2 rounded-pill fw-semibold shadow-sm"
                            />

                            <Botones
                                type="button"
                                texto="Cancelar"
                                disabled={loading}
                                className="btn btn-outline-secondary w-100 py-2 rounded-pill fw-semibold"
                                onClick={() => navigate("/")}
                            />

                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}