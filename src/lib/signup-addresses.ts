const barangaysByMunicipality: Record<string, string[]> = {
  'Abra de Ilog': [
    'Armado', 'Balao', 'Cabacao', 'Lumangbayan', 'Poblacion',
    'San Vicente', 'Santa Maria', 'Tibag', 'Udalo', 'Wawa',
  ],
  Mamburao: [
    'Balansay', 'Fatima', 'Payompon', 'Poblacion 1', 'Poblacion 2',
    'Poblacion 3', 'Poblacion 4', 'Poblacion 5', 'Poblacion 6',
    'Poblacion 7', 'Poblacion 8', 'San Luis', 'Talabaan', 'Tangkalan', 'Tayamaan',
  ],
  Paluan: [
    'Alipaoy', 'Bagong Silang Poblacion', 'Handang Tumulong Poblacion',
    'Harrison', 'Lumangbayan', 'Mananao', 'Mapalad Poblacion', 'Marikit',
    'Pag-asa ng Bayan Poblacion', 'San Jose Poblacion', 'Silahis ng Pag-asa Poblacion', 'Tubili',
  ],
  'Santa Cruz': [
    'Alacaak', 'Barahan', 'Casague', 'Dayap', 'Kurtinganan', 'Lumangbayan',
    'Mulawin', 'Pinagturilan', 'Poblacion I', 'Poblacion II', 'San Vicente',
  ],
}

export const SIGNUP_ADDRESS_SUGGESTIONS = [
  'Santa Cruz, Occidental Mindoro',
  ...Object.entries(barangaysByMunicipality).flatMap(([municipality, barangays]) =>
    barangays.map((barangay) => `${barangay}, ${municipality}, Occidental Mindoro`),
  ),
]
