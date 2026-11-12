import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import geo from "@/lib/nexus/ward-geo.json";
import { wardByCode, WARDS } from "@/lib/nexus/wards";
import { FOREST } from "@/lib/nexus/palette";
import { cn } from "@/lib/utils";

export interface WardStyle { fill: string; opacity?: number; tooltip?: string }
export interface MapEdge { a: string; b: string; weight: number; color?: string }

interface Props {
  styles: Record<string, WardStyle>;
  selected?: string | null;
  onSelect?: (code: string) => void;
  edges?: MapEdge[];
  height?: number | string;
  showLabels?: boolean;
  className?: string;
}

export function WardMap({ styles, selected, onSelect, edges, height = 460, showLabels = true, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layers = useRef<Record<string, Leaflet.Path>>({});
  const edgeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const labelLayer = useRef<Leaflet.LayerGroup | null>(null);
  const props = useRef({ styles, selected, onSelect });
  props.current = { styles, selected, onSelect };

  const restyle = () => {
    const { styles: st, selected: sel } = props.current;
    for (const [code, layer] of Object.entries(layers.current)) {
      const s = st[code];
      layer.setStyle({
        fillColor: s?.fill ?? "#cccccc",
        fillOpacity: s?.opacity ?? 0.72,
        color: sel === code ? FOREST : "#ffffff",
        weight: sel === code ? 3 : 1.2,
      });
      if (sel === code) layer.bringToFront();
      const tip = s?.tooltip ?? `Ward ${code}`;
      layer.setTooltipContent(tip);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      if (cancelled || !el.current) return;
      const Lf = (mod.default ?? mod) as typeof Leaflet;
      L.current = Lf;
      const m = Lf.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([19.08, 72.88], 11);
      Lf.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a> · Wards: MCGM/Datameet',
        maxZoom: 18,
      }).addTo(m);
      const gj = Lf.geoJSON(geo as GeoJSON.FeatureCollection, {
        onEachFeature: (f, layer) => {
          const code = (f.properties as { ward: string }).ward;
          layers.current[code] = layer as Leaflet.Path;
          layer.bindTooltip(`Ward ${code}`, { sticky: true, className: "ward-tip" });
          layer.on("click", () => props.current.onSelect?.(code));
          layer.on("mouseover", () => (layer as Leaflet.Path).setStyle({ weight: 2.5 }));
          layer.on("mouseout", () => restyle());
        },
      }).addTo(m);
      m.fitBounds(gj.getBounds(), { padding: [8, 8] });
      edgeLayer.current = Lf.layerGroup().addTo(m);
      labelLayer.current = Lf.layerGroup().addTo(m);
      map.current = m;
      restyle();
      drawEdges();
      drawLabels();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawEdges = () => {
    const Lf = L.current;
    if (!Lf || !edgeLayer.current) return;
    edgeLayer.current.clearLayers();
    for (const e of edges ?? []) {
      const a = wardByCode(e.a), b = wardByCode(e.b);
      Lf.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: e.color ?? FOREST, weight: 1 + e.weight * 5, opacity: 0.35 + e.weight * 0.5, interactive: false }).addTo(edgeLayer.current);
    }
  };

  const drawLabels = () => {
    const Lf = L.current;
    if (!Lf || !labelLayer.current) return;
    labelLayer.current.clearLayers();
    if (!showLabels) return;
    for (const w of WARDS) {
      Lf.marker([w.lat, w.lng], {
        interactive: false,
        icon: Lf.divIcon({ className: "", html: `<span style="font:600 10px 'Public Sans',sans-serif;color:#17332a;text-shadow:0 0 3px #fff,0 0 3px #fff;white-space:nowrap;transform:translate(-50%,-50%);display:inline-block">${w.code}</span>`, iconSize: [0, 0] }),
      }).addTo(labelLayer.current);
    }
  };

  useEffect(() => { restyle(); });
  useEffect(() => { drawEdges(); }, [edges]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { drawLabels(); }, [showLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className={cn("relative z-0 w-full overflow-hidden rounded-md border border-border", className)} style={{ height }} role="application" aria-label="Map of Mumbai wards" />;
}
