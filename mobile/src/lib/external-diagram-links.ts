export type ExternalDiagramLink = {
  site: string;
  url: string;
};

export type SearchVehicleType = 'motorcycle' | 'car';

// These deep-link to each retailer's own search results for the given
// make/model — we never scrape or embed their content, only point at it.
export function buildExternalDiagramLinks(
  make: string,
  model: string,
  type: SearchVehicleType = 'motorcycle',
): ExternalDiagramLink[] {
  const query = encodeURIComponent(model ? `${make} ${model}` : make);

  if (type === 'car') {
    return [
      {
        site: 'RockAuto',
        url: `https://www.rockauto.com/en/partsearch/?partsearch=${query}`,
      },
      {
        site: 'CarParts.com',
        url: `https://www.carparts.com/search?q=${query}`,
      },
      {
        site: '7zap OEM Catalog',
        url: `https://7zap.com/en/search/?q=${query}`,
      },
    ];
  }

  return [
    {
      site: 'RevZilla OEM Parts Finder',
      url: `https://www.revzilla.com/oem-motorcycle-parts?q=${query}`,
    },
    {
      site: 'Partzilla',
      url: `https://www.partzilla.com/search?keywords=${query}`,
    },
    {
      site: '7zap OEM Catalog',
      url: `https://7zap.com/en/search/?q=${query}`,
    },
  ];
}
