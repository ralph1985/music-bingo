"use client";

import Image from "next/image";
import { toDataURL } from "qrcode";
import { useEffect, useState } from "react";

type QrCodeProps = {
  url: string;
};

export default function QrCode({ url }: QrCodeProps) {
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

  return <Image alt="Código QR del enlace de jugadores" height={320} src={source} unoptimized width={320} />;
}
