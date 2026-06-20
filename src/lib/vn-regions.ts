export interface Province { code: number; name: string; }
export interface District { code: number; name: string; }
export interface Ward { code: number; name: string; }

const BASE = "https://provinces.open-api.vn/api";
const cache = new Map<string, unknown>();

async function get<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const r = await fetch(url);
  const data = await r.json();
  cache.set(url, data);
  return data;
}

export const vnRegions = {
  provinces: () =>
    get<Province[]>(`${BASE}/?depth=1`),

  districts: (provinceCode: number) =>
    get<{ districts: District[] }>(`${BASE}/p/${provinceCode}?depth=2`)
      .then((r) => r.districts),

  wards: (districtCode: number) =>
    get<{ wards: Ward[] }>(`${BASE}/d/${districtCode}?depth=2`)
      .then((r) => r.wards),
};
