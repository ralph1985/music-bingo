"use client";

import Image from "next/image";
import { toDataURL } from "qrcode";
import { useEffect, useState } from "react";

type QrCodeProps = {
  url: string;
};

export default function QrCode({ url }: QrCodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void toDataURL(url, { margin: 1, width: 320 }).then((nextSource) => {
      if (active) {
        setSource(nextSource);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  if (!source) {
    return <p>Generando código QR del enlace de jugadores…</p>;
  }

  return <section className="qr-code">
    <Image alt="Código QR del enlace de jugadores" height={320} src={source} unoptimized width={320} />
    <button className="button button-secondary" onClick={() => setExpanded(true)} type="button">Ver QR en grande</button>
    {expanded ? <QrCodeFullscreen onClose={() => setExpanded(false)} source={source} /> : null}
  </section>;
}

export function QrCodeFullscreen({ onClose, source }: { onClose: () => void; source: string }) {
  return <div aria-labelledby="qr-fullscreen-title" className="qr-fullscreen" role="dialog">
    <section className="qr-fullscreen-card">
      <p className="field-label" id="qr-fullscreen-title">CÓDIGO PARA JUGADORES</p>
      <Image alt="Código QR ampliado para jugadores" height={520} src={source} unoptimized width={520} />
      <button aria-label="Cerrar QR ampliado" className="button button-secondary" onClick={onClose} type="button">Cerrar</button>
    </section>
  </div>;
}
