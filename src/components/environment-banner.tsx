type AppEnvironment = "development" | "staging" | "production";

function getAppEnvironment(): AppEnvironment {
  const configuredEnvironment = process.env.NEXT_PUBLIC_APP_ENV;

  if (configuredEnvironment === "development" || configuredEnvironment === "staging" || configuredEnvironment === "production") {
    return configuredEnvironment;
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "staging";
  }

  if (process.env.VERCEL_ENV === "development" || process.env.NODE_ENV === "development") {
    return "development";
  }

  return "production";
}

export default function EnvironmentBanner() {
  const environment = getAppEnvironment();

  if (environment === "production") {
    return null;
  }

  const branch = environment === "staging" ? process.env.VERCEL_GIT_COMMIT_REF : undefined;
  const label = environment === "staging"
    ? `STAGING${branch ? ` · ${branch}` : ""}`
    : "DESARROLLO LOCAL";

  return (
    <aside className={`environment-banner environment-banner--${environment}`} aria-label="Entorno de la aplicación">
      <strong>{label}</strong>
      <span>No es producción</span>
    </aside>
  );
}
