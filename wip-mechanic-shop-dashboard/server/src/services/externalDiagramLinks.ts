export interface ExternalDiagramLink {
  site: string;
  url: string;
}

// These just deep-link to each retailer's own search results for the given
// make/model — we never scrape or embed their content, only point at it.
export function buildExternalDiagramLinks(make: string, model: string): ExternalDiagramLink[] {
  const query = encodeURIComponent(`${make} ${model}`);
  return [
    {
      site: "RevZilla OEM Parts Finder",
      url: `https://www.revzilla.com/oem-motorcycle-parts?q=${query}`,
    },
    {
      site: "Partzilla",
      url: `https://www.partzilla.com/search?keywords=${query}`,
    },
    {
      site: "7zap OEM Catalog",
      url: `https://7zap.com/en/search/?q=${query}`,
    },
  ];
}
