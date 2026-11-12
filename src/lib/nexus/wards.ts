// Mumbai's 24 MCGM administrative wards. Boundaries: Datameet Municipal Spatial Data (BMC_Wards).
// Population and area approximate Census 2011 ward figures; other attributes are modelling
// assumptions for this demo and are labelled as such in the UI.
export type Zone = "Island City" | "Western Suburbs" | "Eastern Suburbs";

export interface Ward {
  code: string;
  areas: string;
  zone: Zone;
  population: number;
  areaKm2: number;
  slumShare: number;
  elevationM: number;
  floodProne: number;
  coastal: boolean;
  sewerCoverage: number;
  baseSupplyHours: number;
  baseUnfitPct: number;
  lat: number;
  lng: number;
  neighbors: string[];
}

type Row = [string, string, Zone, number, number, number, number, number, boolean, number, number, number];

const ROWS: Row[] = [
  ["A", "Colaba, Fort, Churchgate", "Island City", 185014, 12.9, 0.18, 6, 0.35, true, 0.92, 5.0, 0.8],
  ["B", "Dongri, Masjid Bunder", "Island City", 127290, 2.5, 0.25, 5, 0.45, true, 0.85, 3.5, 2.2],
  ["C", "Kalbadevi, Bhuleshwar, Marine Lines", "Island City", 166161, 1.8, 0.12, 6, 0.4, true, 0.88, 3.5, 1.8],
  ["D", "Grant Road, Malabar Hill, Tardeo", "Island City", 346866, 6.6, 0.1, 15, 0.25, true, 0.9, 4.5, 1.0],
  ["E", "Byculla, Agripada, Mazgaon", "Island City", 393286, 7.4, 0.38, 5, 0.6, true, 0.78, 3.5, 2.8],
  ["F/S", "Parel, Sewri, Lalbaug", "Island City", 360972, 6.1, 0.42, 6, 0.65, true, 0.75, 3.5, 2.6],
  ["F/N", "Matunga, Sion, Wadala", "Island City", 529034, 12.9, 0.48, 5, 0.75, true, 0.7, 3.0, 3.0],
  ["G/S", "Worli, Prabhadevi, Lower Parel", "Island City", 377749, 9.1, 0.4, 6, 0.55, true, 0.8, 3.5, 2.0],
  ["G/N", "Dadar, Mahim, Dharavi", "Island City", 599039, 9.1, 0.58, 4, 0.8, true, 0.62, 3.0, 3.8],
  ["H/E", "Bandra E, Khar E, Santacruz E", "Western Suburbs", 557239, 13.6, 0.62, 6, 0.7, false, 0.6, 2.5, 3.6],
  ["H/W", "Bandra W, Khar W, Santacruz W", "Western Suburbs", 307581, 10.4, 0.22, 8, 0.4, true, 0.85, 4.0, 1.3],
  ["K/E", "Andheri E, Vile Parle E, Jogeshwari E", "Western Suburbs", 823885, 23.8, 0.48, 12, 0.6, false, 0.62, 3.0, 2.9],
  ["K/W", "Andheri W, Juhu, Versova", "Western Suburbs", 748688, 24.1, 0.3, 7, 0.55, true, 0.72, 3.5, 2.0],
  ["P/S", "Goregaon", "Western Suburbs", 463507, 22.8, 0.38, 14, 0.45, true, 0.68, 3.5, 2.2],
  ["P/N", "Malad, Malvani, Madh", "Western Suburbs", 941366, 46.8, 0.55, 10, 0.55, true, 0.55, 2.5, 3.4],
  ["R/S", "Kandivali", "Western Suburbs", 691229, 20.0, 0.42, 16, 0.4, true, 0.62, 3.0, 2.4],
  ["R/C", "Borivali", "Western Suburbs", 562162, 23.6, 0.3, 18, 0.35, true, 0.7, 3.5, 1.8],
  ["R/N", "Dahisar", "Western Suburbs", 431368, 16.0, 0.35, 12, 0.5, true, 0.62, 3.0, 2.3],
  ["L", "Kurla, Saki Naka, Chandivali", "Eastern Suburbs", 902225, 16.2, 0.82, 8, 0.85, false, 0.45, 2.0, 4.8],
  ["M/E", "Govandi, Mankhurd, Shivaji Nagar", "Eastern Suburbs", 807720, 32.5, 0.78, 5, 0.8, true, 0.38, 2.0, 5.4],
  ["M/W", "Chembur, Tilak Nagar", "Eastern Suburbs", 411893, 19.6, 0.45, 10, 0.55, false, 0.65, 3.0, 2.4],
  ["N", "Ghatkopar, Vikhroli", "Eastern Suburbs", 622853, 27.9, 0.62, 14, 0.55, false, 0.55, 2.5, 3.2],
  ["S", "Bhandup, Powai, Kanjurmarg", "Eastern Suburbs", 743783, 28.4, 0.68, 18, 0.5, false, 0.5, 2.5, 3.4],
  ["T", "Mulund", "Eastern Suburbs", 341463, 45.4, 0.28, 20, 0.35, false, 0.72, 4.0, 1.5],
];

// Computed from the boundary polygons (shared or near-touching edges).
const NEIGHBORS: Record<string, string[]> = {"A":["B","C"],"B":["A","C","E"],"C":["A","B","D","E"],"D":["C","E","G/S"],"E":["B","C","D","F/S","G/S"],"F/S":["E","G/S","F/N","G/N"],"G/S":["D","E","F/S","G/N"],"F/N":["F/S","G/N","M/W","L"],"G/N":["F/S","G/S","F/N","H/E","H/W","L"],"N":["S","M/E","M/W","L"],"R/C":["T","R/N","P/N","R/S"],"S":["N","T","K/E","P/S","L"],"T":["R/C","S","P/S","P/N","R/S"],"K/W":["H/E","K/E","P/S","P/N","H/W"],"R/N":["R/C"],"M/E":["N","M/W"],"M/W":["F/N","N","M/E","L"],"H/E":["G/N","K/W","K/E","H/W","L"],"K/E":["S","K/W","H/E","P/S","H/W","L"],"P/S":["S","T","K/W","K/E","P/N"],"P/N":["R/C","T","K/W","P/S","R/S"],"R/S":["R/C","T","P/N"],"H/W":["G/N","K/W","H/E","K/E"],"L":["F/N","G/N","N","S","M/W","H/E","K/E"]};
const CENTROIDS: Record<string, [number, number]> = {"A":[18.921,72.8275],"B":[18.9569,72.8397],"C":[18.9511,72.8272],"D":[18.9552,72.8083],"E":[18.9734,72.8432],"F/S":[18.999,72.854],"G/S":[19.0042,72.8201],"F/N":[19.0319,72.8707],"G/N":[19.0307,72.844],"N":[19.0867,72.9202],"R/C":[19.2337,72.8297],"S":[19.1336,72.9219],"T":[19.1675,72.9376],"K/W":[19.1261,72.8196],"R/N":[19.2553,72.8663],"M/E":[19.0448,72.9216],"M/W":[19.0378,72.8893],"H/E":[19.0779,72.8595],"K/E":[19.1122,72.8693],"P/S":[19.1575,72.8584],"P/N":[19.1877,72.8339],"R/S":[19.1996,72.8562],"H/W":[19.0622,72.8285],"L":[19.0878,72.8854]};

export const WARDS: Ward[] = ROWS.map((r) => ({
  code: r[0],
  areas: r[1],
  zone: r[2],
  population: r[3],
  areaKm2: r[4],
  slumShare: r[5],
  elevationM: r[6],
  floodProne: r[7],
  coastal: r[8],
  sewerCoverage: r[9],
  baseSupplyHours: r[10],
  baseUnfitPct: r[11],
  lat: CENTROIDS[r[0]][0],
  lng: CENTROIDS[r[0]][1],
  neighbors: NEIGHBORS[r[0]],
}));

export const WARD_CODES = WARDS.map((w) => w.code);
export const wardByCode = (code: string) => WARDS.find((w) => w.code === code)!;
export const density = (w: Ward) => w.population / w.areaKm2;
export const TOTAL_POPULATION = WARDS.reduce((s, w) => s + w.population, 0);
export const wardLabel = (code: string) => {
  const w = WARDS.find((x) => x.code === code);
  return w ? `${w.code} · ${w.areas.split(",")[0]}` : code;
};
