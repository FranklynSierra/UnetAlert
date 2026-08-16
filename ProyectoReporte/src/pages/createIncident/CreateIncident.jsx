import { useState } from "react";
import { collection, getDoc, addDoc, serverTimestamp, doc, setDoc, increment, updateDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router";
import Swal from "sweetalert2";

import { db } from "../../services/firebase";

import Input from "../../components/ui/Input";
import Botones from "../../components/ui/Botones";
import { useAuth } from "../../hook/useAuth";


export default function CreateIncident() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [newDescription, setNewDescription] = useState("");
    const [newState, setNewState] = useState("");
   
    const [newImages, setImages] = useState([]);
    const [imagesToDelete, setImagesToDelete] = useState([]);
    const [newPlace, setPlace] = useState("");
    const [newType, setType] = useState("");
    const [carnet, setCarnet] = useState("");
    const [nameStudent, setNameStudent] = useState("");
    const [studentCareer, setStudentCareer] = useState("");
    const [exist, setExist] = useState(false);
    const [studentPhone, setStudentPhone] = useState("");
    const [studentEmail, setStudentEmail] = useState("");
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
        if (!carnet) {
            alert("Ingrese el carnet.");
            return;
        }

        if (!exist && (!nameStudent || !studentCareer || !studentPhone || !studentEmail)) {
            alert("Complete todos los datos del estudiante: nombre, carrera, teléfono y correo.");
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


            const carnetClean = carnet.trim();
            const studentRef = doc(db, "estudiantes", carnetClean);

            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {

                await updateDoc(studentRef, {
                    infracciones: increment(1),
                    telefono: studentPhone,
                    correo: studentEmail
                });

            } else {

                await setDoc(studentRef, {
                    nombre: nameStudent,
                    carnet: carnetClean,
                    carrera: studentCareer,
                    telefono: studentPhone,
                    correo: studentEmail,
                    infracciones: 1,
                    estado: "activo",
                    foto: null
                });

            }

            await addDoc(incidentsCollectionRef, {
                descripcion: newDescription,
                estado: newState,
                carnet: carnetClean,
                nombreEstudiante: nameStudent,
                carrera: studentCareer,
              
                imagenes: images,
                lugar: newPlace,
                tipo: newType,
                telefono: studentPhone,
                correo: studentEmail,
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
            setStudentPhone("");
            setStudentEmail("");
            setCarnet("");
            setNameStudent("");
            setImages([]);
            setImagesToDelete([]);
            setStudentCareer("");
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

        setCarnet(value);

        setSearching(true);
        setSearched(true);

        try {

            const studentRef = doc(db, "estudiantes", value);

            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {

                const student = studentSnap.data();

                setExist(true);
                setNameStudent(student.nombre);
                setStudentCareer(student.carrera);
                setStudentPhone(student.telefono || "");
                setStudentEmail(student.correo || "");

            } else {

                setExist(false);
                setNameStudent("");
                setStudentCareer("");
                setStudentPhone("");
                setStudentEmail("");

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
                            <h2 className="fw-bold mb-0">Registrar Incidente</h2>
                            <p className="text-muted small">
                                Complete la información del estudiante y del incidente
                            </p>
                        </div>

                        {/* Buscar estudiante */}
                        <div
                            className="card border-0 shadow-sm mb-4 rounded-4"
                            style={{ background: "linear-gradient(135deg, #eef3ff, #ffffff)" }}
                        >
                            <div className="card-body p-4">
                                <h5 className="card-title text-primary mb-3 d-flex align-items-center gap-2">
                                    Buscar estudiante
                                </h5>

                                <label className="form-label fw-semibold">
                                    Escanee el carnet del estudiante
                                </label>

                                <div className="input-group mb-1 shadow-sm rounded">
                                    <Input
                                        type="text"
                                        className="border-start-0"
                                        placeholder="Ingrese el carnet"
                                        value={carnet}
                                        onChange={(e) => setCarnet(e.target.value)}
                                    />
                                    <Botones
                                        type="button"
                                        texto={searching ? "Buscando..." : "Buscar"}
                                        className="btn btn-primary px-4"
                                        disabled={searching || !carnet.trim()}
                                        onClick={() => handleSearch(carnet.trim())}
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
                                        <span className="fw-semibold">Estudiante encontrado</span>
                                    </div>

                                    <div className="card-body p-4">
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="text-muted small text-uppercase">
                                                    Nombre
                                                </label>
                                                <h5 className="mb-0">{nameStudent}</h5>
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="text-muted small text-uppercase">
                                                    Carrera
                                                </label>
                                                <h5 className="mb-0">{studentCareer}</h5>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label fw-semibold">
                                                    Teléfono del estudiante <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="tel"
                                                    placeholder="0414-1234567"
                                                    value={studentPhone}
                                                    onChange={(e) => setStudentPhone(e.target.value)}
                                                />
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="form-label fw-semibold">
                                                    Correo del estudiante <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="email"
                                                    placeholder="estudiante@unet.edu.ve"
                                                    value={studentEmail}
                                                    onChange={(e) => setStudentEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Botones
                                            type="button"
                                            texto="Cambiar estudiante"
                                            className="btn btn-outline-secondary w-100 rounded-pill"
                                            onClick={() => {
                                                setExist(false);
                                                setSearched(false);
                                                setCarnet("");
                                                setNameStudent("");
                                                setStudentCareer("");
                                                setStudentPhone("");
                                                setStudentEmail("");
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
                                    <div className="card-header bg-warning fw-bold d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-exclamation-triangle-fill"></i>
                                        Estudiante no encontrado
                                    </div>

                                    <div className="card-body p-4">
                                        <p className="text-muted">
                                            Complete los siguientes datos para registrar al estudiante.
                                        </p>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Nombre del estudiante <span className="text-danger">*</span>
                                            </label>
                                            <Input
                                                type="text"
                                                value={nameStudent}
                                                onChange={(e) => setNameStudent(e.target.value)}
                                            />
                                        </div>

                                        <div className="mb-3">
    <label className="form-label fw-semibold">
        Carrera del estudiante <span className="text-danger">*</span>
    </label>
    <select
        className="form-select text-black shadow-sm"
        value={studentCareer}
        onChange={(e) => setStudentCareer(e.target.value)}
    >
        <option value="">Seleccione...</option>
        <option value="ING Informática">ING Informática</option>
        <option value="ING mecánica">ING mecánica</option>
        <option value="ING electronica">ING electronica</option>
        <option value="ING agroindustrial">ING agroindustrial</option>
        <option value="ING ambiental">ING ambiental</option>
        <option value="ING en producción animal">ING en producción animal</option>
        <option value="ING industrial">ING industrial</option>
        <option value="ING civil">ING civil</option>
        <option value="Licenciatura en psicología">Licenciatura en psicología</option>
        <option value="Licenciatura en música">Licenciatura en música</option>
        <option value="Licenciatura en entrenamiento deportivo">Licenciatura en entrenamiento deportivo</option>
        <option value="Agronomía">Agronomía</option>
        <option value="Arquitectura">Arquitectura</option>
    </select>
</div>

                                        <div className="row">
                                            <div className="col-md-6 mb-1">
                                                <label className="form-label fw-semibold">
                                                    Teléfono del estudiante <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="tel"
                                                    placeholder="0414-1234567"
                                                    value={studentPhone}
                                                    onChange={(e) => setStudentPhone(e.target.value)}
                                                />
                                            </div>

                                            <div className="col-md-6 mb-1">
                                                <label className="form-label fw-semibold">
                                                    Correo del estudiante <span className="text-danger">*</span>
                                                </label>
                                                <Input
                                                    type="email"
                                                    placeholder="estudiante@unet.edu.ve"
                                                    value={studentEmail}
                                                    onChange={(e) => setStudentEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        <hr className="my-4" />

                        {/* Descripción */}
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

                        {/* Evidencia fotográfica */}
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