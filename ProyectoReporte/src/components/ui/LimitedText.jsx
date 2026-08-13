// src/components/ui/TextoLimitado.jsx
export default function LimitedText({ texto, limite = 100 }) {
    if (!texto) return null;

    const textoRecortado =
        texto.length > limite ? texto.slice(0, limite) + "..." : texto;

    return <span>{textoRecortado}</span>;
}