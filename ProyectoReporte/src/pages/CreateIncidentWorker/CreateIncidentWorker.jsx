import { useState } from "react";
import { collection, getDoc, addDoc, serverTimestamp, doc, setDoc, increment, updateDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router";
import Swal from "sweetalert2";

import { db } from "../../services/firebase";

import Input from "../../components/ui/Input";
import Botones from "../../components/ui/Botones";
import { useAuth } from "../../hook/useAuth";


export default function CreateIncidentWorker() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [newDescription, setNewDescription] = useState("");
    const [newState, setNewState] = useState("");
    const [newImages, setImages] = useState([]);
    const [imagesToDelete, setImagesToDelete] = useState([]);
    const [newPlace, setPlace] = useState("");
    const [newType, setType] = useState("");
    const [cedula, setCedula] = useState("");
    const [nameWorker, setNameWorker] = useState("");
    const [workerProfession, setWorkerProfession] = useState("");
    const [exist, setExist] = useState(false);
    const [workerPhone, setWorkerPhone] = useState("");
    const [workerEmail, setWorkerEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [reportante, setReportante] = useState('')

    const toggleMarkImageForDeletion = (index) => {
        setImagesToDelete(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await Swal.fire({
            title: "¿Registrar incidente?",
            text: "Se almacenará el incidente en el sistema.",
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
        if (
            !newDescription ||
            !newState ||
            !newType ||
            !newPlace ||
            !reportante
        ) {
            alert("Complete todos los campos obligatorios.");
            return;
        }
        if (!cedula) {
            alert("Ingrese la cédula.");
            return;
        }

        if (!exist && (!nameWorker || !workerProfession || !workerPhone || !workerEmail)) {
            alert("Complete todos los datos del trabajador: nombre, profesión, teléfono y correo.");
            return;
        }
        try {

            const incidentsCollectionRef = collection(db, "incidentes");

            const imagesToUpload = newImages.filter((_, index) => !imagesToDelete.includes(index));

            for (const image of imagesToUpload) {
                if (!image.type.startsWith("image/")) {
                    alert(`${image.name} no es una imagen válida.`);
                    return;
                }
            }

            setLoading(true);

            const images = await Promise.all(
                imagesToUpload.map(async (image) => {
                    const formData = new FormData();

                    formData.append("file", image);
                    formData.append("upload_preset", "ml_default");

                    const response = await fetch(
                        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
                        {
                            method: "POST",
                            body: formData,
                        }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error?.message);
                    }

                    return {
                        url: data.secure_url,
                        publicId: data.public_id,
                    };
                })
            );

            const cedulaClean = cedula.trim();
            const workerRef = doc(db, "funcionarios", cedulaClean);

            const workerSnap = await getDoc(workerRef);

            if (workerSnap.exists()) {

                await updateDoc(workerRef, {
                    infracciones: increment(1),
                    telefono: workerPhone,
                    correo: workerEmail
                });

            } else {

                await setDoc(workerRef, {
                    nombre: nameWorker,
                    cedula: cedulaClean,
                    profesion: workerProfession,
                    telefono: workerPhone,
                    correo: workerEmail,
                    infracciones: 1,
                    estado: "activo",
                    foto: null
                });

            }

            await addDoc(incidentsCollectionRef, {
                descripcion: newDescription,
                estado: newState,
                tipoPersona: "trabajador",
                cedula: cedulaClean,
                nombreTrabajador: nameWorker,
                profesion: workerProfession,
                imagenes: images,
                lugar: newPlace,
                tipo: newType,
                telefono: workerPhone,
                correo: workerEmail,
                fecha: serverTimestamp(),
                reportanteId: user.uid,
                reportante: reportante,
                correoReportante: user.email,
            });

            await Swal.fire({
                icon: "success",
                title: "Incidente registrado",
                text: "El incidente fue guardado correctamente.",
                confirmButtonColor: "#0d6efd"
            });

            setNewDescription("");
            setNewState("");
            setPlace("");
            setType("");
            setWorkerPhone("");
            setWorkerEmail("");
            setCedula("");
            setNameWorker("");
            setImages([]);
            setImagesToDelete([]);
            setWorkerProfession("");
            setExist(false);
            navigate("/");

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo registrar el incidente."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (value) => {

        setCedula(value);

        setSearching(true);
        setSearched(true);

        try {

            const workerRef = doc(db, "funcionarios", value);

            const workerSnap = await getDoc(workerRef);

            if (workerSnap.exists()) {

                const worker = workerSnap.data();

                setExist(true);
                setNameWorker(worker.nombre);
                setWorkerProfession(worker.profesion);
                setWorkerPhone(worker.telefono || "");
                setWorkerEmail(worker.correo || "");

            } else {

                setExist(false);
                setNameWorker("");
                setWorkerProfession("");
                setWorkerPhone("");
                setWorkerEmail("");

            }

        } catch (error) {

            console.error(error);

        } finally {

            setSearching(false);

        }

    };
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
                        onSubmit={handleSubmit}
                        className="card border-0 shadow-lg p-4 p-md-5 rounded-4"
                        style={{ backgroundColor: "#fdfdfd" }}
                    >
                        <div className="text-center mb-4">
                            <h2 className="fw-bold mb-0">Registrar Incidente de Trabajador</h2>
                            <p className="text-muted small">
                                Complete la información del trabajador y del incidente
                            </p>
                        </div>

                        {/* Buscar trabajador */}
                        <div
                            className="card border-0 shadow-sm mb-4 rounded-4"
                            style={{ background: "linear-gradient(135deg, #fff4e6, #ffffff)" }}
                        >
                            <div className="card-body p-4">
                                <h5 className="card-title text-warning-emphasis mb-3 d-flex align-items-center gap-2">
                                    Buscar trabajador
                                </h5>

                                <label className="form-label fw-semibold">
                                    Ingrese la cédula del trabajador
                                </label>

                                <div className="input-group mb-1 shadow-sm rounded">
                                    <Input
                                        type="text"
                                        className="border-start-0"
                                        placeholder="Ingrese la cédula"
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                    />
                                    <Botones
                                        type="button"
                                        texto={searching ? "Buscando..." : "Buscar"}
                                        className="btn btn-primary px-4"
                                        disabled={searching || !cedula.trim()}
                                        onClick={() => handleSearch(cedula.trim())}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Resultado búsqueda */}
                        {searched && (
                            exist ? (
                                <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
                                    <div className="card-header bg-success text-white d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span className="fw-semibold">Trabajador encontrado</span>
                                    </div>

                                    <div className="card-body p-4">
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="text-muted small text-uppercase">
                                                    Nombre
                                                </label>
                                                <h5 className="mb-0">{nameWorker}</h5>
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="text-muted small text-uppercase">
                                                    Profesión
                                                </label>
                                                <h5 className="mb-0">{workerProfession}</h5>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label fw-semibold">
                                                    Teléfono del trabajador <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="tel"
                                                    placeholder="0414-1234567"
                                                    value={workerPhone}
                                                    onChange={(e) => setWorkerPhone(e.target.value)}
                                                />
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="form-label fw-semibold">
                                                    Correo del trabajador <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="email"
                                                    placeholder="trabajador@unet.edu.ve"
                                                    value={workerEmail}
                                                    onChange={(e) => setWorkerEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Botones
                                            type="button"
                                            texto="Cambiar trabajador"
                                            className="btn btn-outline-secondary w-100 rounded-pill"
                                            onClick={() => {
                                                setExist(false);
                                                setSearched(false);
                                                setCedula("");
                                                setNameWorker("");
                                                setWorkerProfession("");
                                                setWorkerPhone("");
                                                setWorkerEmail("");
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
                                    <div className="card-header bg-warning fw-bold d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-exclamation-triangle-fill"></i>
                                        Trabajador no encontrado
                                    </div>

                                    <div className="card-body p-4">
                                        <p className="text-muted">
                                            Complete los siguientes datos para registrar al trabajador.
                                        </p>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Nombre del trabajador <span className="text-danger">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={nameWorker}
                                                onChange={(e) => setNameWorker(e.target.value)}
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Profesión del trabajador <span className="text-danger">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={workerProfession}
                                                onChange={(e) => setWorkerProfession(e.target.value)}
                                            />
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6 mb-1">
                                                <label className="form-label fw-semibold">
                                                    Teléfono del trabajador <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="tel"
                                                    placeholder="0414-1234567"
                                                    value={workerPhone}
                                                    onChange={(e) => setWorkerPhone(e.target.value)}
                                                />
                                            </div>

                                            <div className="col-md-6 mb-1">
                                                <label className="form-label fw-semibold">
                                                    Correo del trabajador <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="email"
                                                    placeholder="trabajador@unet.edu.ve"
                                                    value={workerEmail}
                                                    onChange={(e) => setWorkerEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        <hr className="my-4" />

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Descripción
                            </label>
                            <textarea
                                className="form-control shadow-sm"
                                rows="4"
                                placeholder="Describa el incidente..."
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Estado
                            </label>
                            <select
                                className="form-select text-black shadow-sm"
                                value={newState}
                                onChange={(e) => setNewState(e.target.value)}
                            >
                                <option value="">Seleccione...</option>
                                <option value="Pendiente">🟡 Pendiente</option>
                                <option value="En proceso">🔵 En proceso</option>
                                <option value="Resuelto">🟢 Resuelto</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Tipo de incidente
                            </label>
                            <select
                                className="form-select  text-black shadow-sm"
                                value={newType}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="">Seleccione...</option>
                                <option value="Conducta">Conducta</option>
                                <option value="Violencia">Violencia</option>
                                <option value="Acoso">Acoso</option>
                                <option value="Robo">Robo</option>
                                <option value="Daños">Daños a la propiedad</option>
                                <option value="Consumo de sustancias">Consumo de sustancias</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Lugar
                            </label>
                            <Input
                                type="text"
                                placeholder="Ej. Biblioteca"
                                value={newPlace}
                                onChange={(e) => setPlace(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">
                                Reportado por
                            </label>
                            <Input
                                type="text"
                                placeholder="Nombre de quien reporta"
                                value={reportante}
                                onChange={(e) => setReportante(e.target.value)}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-semibold">
                                Evidencia fotográfica
                            </label>
                            <Input
                                type="file"
                                multiple
                                required={false}
                                accept="image/*"
                                className="shadow-sm"
                                onChange={(e) => {
                                    setImages([...e.target.files]);
                                    setImagesToDelete([]);
                                }}
                            />
                        </div>

                        {newImages.length > 0 && (
                            <div className="mb-4">
                                <label className="form-label fw-semibold">
                                    Imágenes seleccionadas ({newImages.length - imagesToDelete.length} de {newImages.length})
                                </label>
                                <div className="d-flex flex-wrap gap-2">
                                    {newImages.map((img, index) => {
                                        const marcada = imagesToDelete.includes(index);

                                        return (
                                            <div
                                                key={index}
                                                className="position-relative rounded-3 overflow-hidden border shadow-sm"
                                                style={{ width: 110, height: 110 }}
                                            >
                                                <img
                                                    src={URL.createObjectURL(img)}
                                                    alt=""
                                                    width="100%"
                                                    height="100%"
                                                    style={{
                                                        objectFit: "cover",
                                                        opacity: marcada ? 0.35 : 1
                                                    }}
                                                />

                                                {marcada && (
                                                    <span
                                                        className="badge bg-danger position-absolute top-50 start-50 translate-middle"
                                                        style={{ fontSize: "0.6rem" }}
                                                    >
                                                        Se eliminará
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    className={`btn btn-sm position-absolute top-0 end-0 rounded-circle ${marcada ? "btn-secondary" : "btn-danger"}`}
                                                    style={{ width: 28, height: 28, padding: 0, lineHeight: 1 }}
                                                    onClick={() => toggleMarkImageForDeletion(index)}
                                                >
                                                    {marcada ? "↺" : "X"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {imagesToDelete.length > 0 && (
                                    <p className="text-danger small mt-2 mb-0">
                                        {imagesToDelete.length} imagen(es) no se subirán al registrar el incidente.
                                    </p>
                                )}
                            </div>
                        )}

                        <Botones
                            type="submit"
                            disabled={loading}
                            texto={loading ? "Registrando..." : "Registrar Incidente"}
                            className="btn btn-primary w-100 py-2 rounded-pill fw-semibold shadow-sm"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}