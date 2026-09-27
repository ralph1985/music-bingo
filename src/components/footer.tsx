import Image from "next/image";
import packageJson from "../../package.json";

const changelogUrl = "https://github.com/ralph1985/music-bingo/blob/develop/CHANGELOG.md";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <span className="footer-credit">Hecho por</span>
        <a href="https://www.conquense.dev" target="_blank" rel="noreferrer">
          <Image
            src="/brand/conquense-dev-logo-dark.webp"
            alt="conquense.dev"
            width={1200}
            height={407}
          />
        </a>
        <span aria-hidden="true">·</span>
        <a className="footer-repository" href="https://github.com/ralph1985/music-bingo" target="_blank" rel="noreferrer">
          Contribuir en GitHub
        </a>
        <span aria-hidden="true">·</span>
        <a className="site-footer-version" href={changelogUrl} target="_blank" rel="noopener noreferrer">
          v{packageJson.version}
        </a>
      </div>
    </footer>
  );
}
