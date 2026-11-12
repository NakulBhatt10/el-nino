// Integration points for the planned AI models. Only the interpretable baseline runs today;
// STGNN, Transformer and the hybrid are declared here so a backend can be wired in without UI changes.
import { forecastRisk, type ProjectionOverrides, type WardRisk } from "./risk";

export interface PredictRequest { horizon: number; overrides?: ProjectionOverrides }
export interface RiskModelAdapter {
  id: "baseline" | "stgnn" | "transformer" | "hybrid";
  name: string;
  status: "running" | "planned";
  endpoint?: string;
  description: string;
  predict: (req: PredictRequest) => Promise<WardRisk[]>;
}

const notConnected = (name: string) => async (): Promise<WardRisk[]> => {
  throw new Error(`${name} is not connected yet. Deploy the model service and set its endpoint.`);
};

export const MODELS: RiskModelAdapter[] = [
  {
    id: "baseline",
    name: "Interpretable baseline (logistic)",
    status: "running",
    description: "Additive log-odds scorer over 10 drivers. Runs in the browser on simulated data.",
    predict: async ({ horizon, overrides }) => forecastRisk(horizon, overrides),
  },
  {
    id: "stgnn",
    name: "STGNN (spatio-temporal graph neural network)",
    status: "planned",
    endpoint: "/api/models/stgnn/predict",
    description: "Graph convolution over the 24-ward adjacency graph to capture spill-over between neighbours.",
    predict: notConnected("STGNN"),
  },
  {
    id: "transformer",
    name: "Spatio-Temporal Transformer",
    status: "planned",
    endpoint: "/api/models/transformer/predict",
    description: "Self-attention over 24 months of ward history for seasonal and lagged effects.",
    predict: notConnected("Spatio-Temporal Transformer"),
  },
  {
    id: "hybrid",
    name: "Hybrid STGNN + Transformer",
    status: "planned",
    endpoint: "/api/models/hybrid/predict",
    description: "Spatial embeddings from the STGNN feed the Transformer's temporal encoder.",
    predict: notConnected("Hybrid model"),
  },
];
