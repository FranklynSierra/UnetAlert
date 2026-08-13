import { useEffect, useRef } from "react";
import {
    Html5Qrcode,
    Html5QrcodeSupportedFormats,
    Html5QrcodeScannerState
} from "html5-qrcode";

export default function Scanner({ onScan }) {
    const scannerRef = useRef(null);

    useEffect(() => {
        const elementId = "reader";

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 10,
            qrbox: {
                width: 300,
                height: 100
            },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.PDF_417,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };

        html5QrCode
            .start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    html5QrCode
                        .stop()
                        .then(() => {
                            html5QrCode.clear();
                            onScan(decodedText);
                        })
                        .catch((err) => {
                            console.error(
                                "Error al detener el escáner:",
                                err
                            );
                        });
                },
                () => {
                    // Ignorar errores de cada frame
                }
            )
            .catch((err) => {
                console.error("No se pudo iniciar la cámara:", err);
            });

        return () => {
            if (!scannerRef.current) return;

            const state = scannerRef.current.getState();

            if (
                state === Html5QrcodeScannerState.SCANNING ||
                state === Html5QrcodeScannerState.PAUSED
            ) {
                scannerRef.current
                    .stop()
                    .then(() => {
                        scannerRef.current.clear();
                    })
                    .catch(() => {});
            } else {
                try {
                    scannerRef.current.clear();
                } catch (_) {}
            }
        };
    }, []);

    return (
        <div
            id="reader"
            style={{
                width: "100%",
                maxWidth: "450px",
                minWidth: "280px",
                margin: "0 auto"
            }}
        />
    );
}