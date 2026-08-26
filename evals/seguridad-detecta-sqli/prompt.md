Revisa el siguiente diff con el mismo criterio que aplicaría el agente `seguridad` de
klap-dev-kit (ver `agents/seguridad.md`) en la fase 6 de `/klap:trabajar-hu`: validación de
entrada, inyección SQL, manejo de secretos, logging seguro, autenticación/autorización, según
corresponda al cambio. No hace falta correr `scripts/deps-scan.mjs` — no aplica a este diff, es
código propio, no una dependencia de terceros.

```diff
+ public List<Movimiento> buscarPorComercio(String comercioId, String desde, String hasta) {
+     String sql = "SELECT * FROM mc_tlog.movimiento WHERE comercio_id = '" + comercioId
+         + "' AND fecha BETWEEN '" + desde + "' AND '" + hasta + "'";
+     return jdbcTemplate.query(sql, movimientoRowMapper);
+ }
```

Clasifica cada hallazgo por severidad (CRITICAL/HIGH/MEDIUM/LOW) y cita la ubicación exacta,
tal como indica `agents/seguridad.md` → "Cómo reportar".
