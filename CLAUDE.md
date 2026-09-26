@AGENTS.md

# Indicaciones adicionales para Claude Code

- `AGENTS.md` es la fuente compartida de reglas del proyecto. No dupliques aquí sus instrucciones; mantén esta parte específica de Claude y breve.
- Las skills del proyecto `music-bingo-verify`, `music-bingo-convex` y `music-bingo-mobile-ui` viven en `.claude/skills` como enlaces al contenido canónico de `.agents/skills`, compartido con Codex. Carga una skill para verificación repetible, Convex o UI móvil en vez de ampliar este archivo.
- Mantén las preferencias personales en `CLAUDE.local.md`, que está ignorado; no guardes credenciales, URL de producción con tokens incrustados ni datos de usuarios en archivos de memoria de Claude.
- Tras una compactación, conserva la lista de archivos modificados, los comandos ejecutados y sus resultados, los efectos en producción y las aprobaciones del usuario antes de continuar.
