import Image from "next/image";

export default function Footer() {
  return (
    <footer className="site-footer">
      <span>Hecho por</span>
      <a href="https://www.conquense.dev" target="_blank" rel="noreferrer">
        <Image
          src="/brand/conquense-dev-logo-dark.webp"
          alt="conquense.dev"
          width={1200}
          height={407}
        />
      </a>
    </footer>
  );
}
