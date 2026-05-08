# HA Insights Card

Lovelace card for the [HA Insights](https://github.com/botts7/ha-insights) integration. Surfaces detected insights with apply / dismiss / snooze actions, redaction-aware Explain modal, and trust badges (🟢 LOCAL / 🟡 CLOUD / 🔴 CLOUD-real-names).

## Status

Pre-alpha. v0.1 in development.

## Privacy

The card subscribes to the integration's WebSocket API. It never makes outbound network calls of its own — all LLM enrichment goes through the integration's privacy boundary. See the integration's [privacy section](https://github.com/botts7/ha-insights#privacy).

## License

MIT — see [`LICENSE`](LICENSE).
