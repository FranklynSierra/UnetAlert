import { useState } from 'react';
import Input from '../../components/ui/Input';
import Botones from '../../components/ui/Botones';

function IncidentFormInner({ incidentToEdit = null, onSubmitAction, buttonText = "Guardar" }) {
    const initialData = incidentToEdit || {};

    const [description, setDescription] = useState(initialData.descripcion || "");
    const [state, setState] = useState(initialData.estado || "");
    const [gravity, setGravity] = useState(initialData.gravedad || "");
    const [image, setImage] = useState(initialData.imagen || "");
    const [place, setPlace] = useState(initialData.lugar || "");
    const [type, setType] = useState(initialData.tipo || "");

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!description.trim()) {
            alert("Por favor, añade una descripción.");
            return;
        }

        const formData = {
            descripcion: description,
            estado: state,
            gravedad: gravity,
            imagen: image,
            lugar: place,
            tipo: type,
            fecha: incidentToEdit ? incidentToEdit.fecha : new Date()
        };

        onSubmitAction(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-3 my-3 border rounded shadow-sm bg-white">
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Descripción del incidente..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Gravedad del incidente..."
                    value={gravity}
                    onChange={(e) => setGravity(e.target.value)}
                />
            </div>
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Imagen del incidente..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                />
            </div>
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Tipo del incidente..."
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                />
            </div>
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Estado del incidente..."
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                />
            </div>
            <div className="mb-2">
                <Input
                    type="text"
                    placeholder="Lugar del incidente..."
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                />
            </div>
            <Botones type="submit" texto={buttonText} className="btn-dark w-100" />
        </form>
    );
}

export default function IncidentForm(props) {
    const key = props.incidentToEdit ? JSON.stringify(props.incidentToEdit) : 'new';
    return <IncidentFormInner key={key} {...props} />;
}
