// Data access. The only module that knows where the dataset comes from.
// Swapping the JSON file for an API call means changing this file and nothing else.

const DATA_URL = "/guide/data/frigates.json";

export async function loadDatabase(url = DATA_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  }
  return response.json();
}
