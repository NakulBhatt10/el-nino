# Mumbai Climate Watch

Build the NEXUS – Mumbai AI Early Warning System website following the attached specification document and visual design in the screenshot.

Include all 22 feature pages organized in logical sidebar navigation:
1. Main Dashboard – disease-risk overview, climate stats, active alerts, and the El Niño video iframe (https://www.youtube.com/embed/57S0Rw9L_hw).
2. El Niño Explainer – dedicated deep-dive page on El Niño impact on Mumbai with the video embed.
3. Water-Borne Disease Education – cholera, typhoid, symptoms, transmission, prevention, and the water-borne disease video iframe (https://www.youtube.com/embed/jG1VNSCsP5Q).
4. Mumbai Interactive Heatmap – Leaflet ward-level map with Low, Moderate, High, and Critical risk zones.
5. Climate Monitoring – rainfall, temperature, ONI and historical trends.
6. Water Quality Monitoring – contamination, water availability, and scarcity.
7. Disease Surveillance – historical cholera and typhoid cases across Mumbai wards.
8. STGNN Model – spatial relationships and connectivity between Mumbai wards.
9. Spatio-Temporal Transformer – temporal pattern analysis and forecasting.
10. AI Risk Prediction – ward-level cholera and typhoid risk predictions.
11. Early Warning Notifications – automatic alerts based on risk thresholds.
12. Alert Management – alert history, severity levels, and recommended actions.
13. What-If Simulator – interactive simulation of rainfall reduction, water scarcity, and contamination scenarios.
14. Explainable AI – feature attribution and factors contributing to predicted risk.
15. Historical Playback – timeline scrub to explore historical climate and disease risk changes.
16. Ward Comparison – side-by-side ward comparison for risk, rainfall, and water quality indicators.
17. Data Explorer – searchable, filterable, and downloadable Mumbai health/climate datasets.
18. Data Source Registry – metadata on sources (MCGM, IMD, CPCB), update frequency, and availability.
19. Model Performance – metrics comparing STGNN, Transformer, and hybrid models.
20. Public Health Recommendations – action plans and preventive measures for high-risk wards.
21. Reports & Analytics – visual summaries and exportable/printable reports.
22. 3D Mumbai Visualization – interactive 3D view of Mumbai topography and risk zones.

Preserve the clean, editorial field-desk aesthetic from the attached screenshot (subtle natural tones, dark forest green accents, refined typography, and clean cards). Ensure all navigation, filters, Leaflet maps, simulations, and charts are fully functional with realistic Mumbai ward data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7875cbc-6788-421c-9f9b-e821f31affd3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
