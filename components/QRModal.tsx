import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRModalProps {
    url: string;
    title: string;
    onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ url, title, onClose }) => {
    const qrRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = 400;
        canvas.height = 400;

        img.onload = () => {
            if (!ctx) return;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement('a');
            link.download = `qr-${title.replace(/\s+/g, '_').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(url);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="w-full flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60 mb-0.5">Compartir Aventura</p>
                        <h3 className="text-base font-black text-white truncate max-w-[220px]" title={title}>{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                {/* QR Code */}
                <div className="px-6 py-8 flex flex-col items-center gap-6 w-full">
                    <div ref={qrRef} className="p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)]">
                        <QRCodeSVG
                            value={url}
                            size={220}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            level="M"
                            imageSettings={{
                                src: "",
                                x: undefined,
                                y: undefined,
                                height: 0,
                                width: 0,
                                excavate: false,
                            }}
                        />
                    </div>

                    {/* URL display */}
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                        <i className="fa-solid fa-link text-cyan-400/50 text-xs shrink-0"></i>
                        <span className="text-[10px] text-white/40 font-mono truncate flex-1">{url}</span>
                        <button
                            onClick={handleCopyUrl}
                            className="shrink-0 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            Copiar
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="w-full flex gap-3">
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            <i className="fa-solid fa-download text-xs"></i>
                            Guardar
                        </button>
                        <button
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({ title: `AventurIA: ${title}`, url });
                                } else {
                                    handleCopyUrl();
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                        >
                            <i className="fa-solid fa-share-nodes text-xs"></i>
                            Compartir
                        </button>
                    </div>

                    <p className="text-[9px] text-white/20 uppercase tracking-widest text-center">
                        Escanea con la cámara del dispositivo
                    </p>
                </div>
            </div>
        </div>
    );
};
