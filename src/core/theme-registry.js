export const THEMES = [
  { id: 'land-rover', name: 'Land Rover', status: 'active', ownerEditable: true, customerEditable: false, path: 'src/themes/land-rover' },
  { id: 'bmw', name: 'BMW', status: 'planned', ownerEditable: true, customerEditable: false, path: 'src/themes/bmw' },
  { id: 'custom', name: 'Personalizado', status: 'available-shell', ownerEditable: true, customerEditable: true, path: 'src/themes/custom' },
];

export function getTheme(themeId) {
  return THEMES.find((theme) => theme.id === themeId) || THEMES[0];
}
