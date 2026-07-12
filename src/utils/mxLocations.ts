// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.9 — Municipios / Alcaldias por estado (para los desplegables dependientes
// de "Ciudad / Alcaldia" y "Municipio" en el expediente). Se usan como
// SUGERENCIAS (datalist): el usuario puede elegir de la lista del estado
// seleccionado o escribir cualquier otro valor. Ciudad de Mexico esta completo
// (16 alcaldias); para el resto se incluyen los municipios mas frecuentes.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MUNICIPIOS_BY_ESTADO: Record<string, string[]> = {
  'Ciudad de Mexico': [
    'Alvaro Obregon', 'Azcapotzalco', 'Benito Juarez', 'Coyoacan', 'Cuajimalpa de Morelos',
    'Cuauhtemoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'La Magdalena Contreras',
    'Miguel Hidalgo', 'Milpa Alta', 'Tlahuac', 'Tlalpan', 'Venustiano Carranza', 'Xochimilco',
  ],
  'Estado de Mexico': [
    'Ecatepec de Morelos', 'Nezahualcoyotl', 'Naucalpan de Juarez', 'Toluca', 'Tlalnepantla de Baz',
    'Chimalhuacan', 'Cuautitlan Izcalli', 'Tultitlan', 'Ixtapaluca', 'Nicolas Romero', 'Tecamac',
    'Valle de Chalco Solidaridad', 'Coacalco de Berriozabal', 'Chalco', 'Atizapan de Zaragoza',
    'La Paz', 'Tultepec', 'Metepec', 'Huixquilucan', 'Texcoco', 'Zumpango', 'Cuautitlan',
    'Chicoloapan', 'Melchor Ocampo', 'Tepotzotlan', 'Lerma', 'Ixtlahuaca', 'Otzolotepec',
    'Almoloya de Juarez', 'Villa Nicolas Romero', 'Acolman', 'Tenango del Valle', 'Jaltenco',
    'Nextlalpan', 'Teoloyucan', 'Tezoyuca', 'Ozumba', 'Amecameca', 'Tepetlaoxtoc',
  ],
  'Jalisco': [
    'Guadalajara', 'Zapopan', 'San Pedro Tlaquepaque', 'Tonala', 'Tlajomulco de Zuniga', 'El Salto',
    'Puerto Vallarta', 'Tlaquepaque', 'Lagos de Moreno', 'Tepatitlan de Morelos', 'Zapotlan el Grande',
    'Ocotlan', 'El Grullo', 'Autlan de Navarro',
  ],
  'Nuevo Leon': [
    'Monterrey', 'Guadalupe', 'San Nicolas de los Garza', 'Apodaca', 'General Escobedo',
    'Santa Catarina', 'San Pedro Garza Garcia', 'Juarez', 'Garcia', 'Cadereyta Jimenez',
  ],
  'Puebla': [
    'Puebla', 'Tehuacan', 'San Martin Texmelucan', 'Atlixco', 'San Pedro Cholula', 'San Andres Cholula',
    'Amozoc', 'Cuautlancingo', 'Huauchinango', 'Izucar de Matamoros',
  ],
  'Queretaro': [
    'Queretaro', 'San Juan del Rio', 'Corregidora', 'El Marques', 'Pedro Escobedo', 'Tequisquiapan',
    'Cadereyta de Montes', 'Ezequiel Montes',
  ],
  'Guanajuato': [
    'Leon', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato', 'San Miguel de Allende', 'Silao',
    'Dolores Hidalgo', 'Valle de Santiago', 'Acambaro', 'Penjamo', 'San Francisco del Rincon',
  ],
  'Hidalgo': [
    'Pachuca de Soto', 'Tulancingo de Bravo', 'Tula de Allende', 'Tizayuca', 'Mineral de la Reforma',
    'Huejutla de Reyes', 'Tepeji del Rio de Ocampo', 'Ixmiquilpan', 'Actopan',
  ],
  'Morelos': [
    'Cuernavaca', 'Jiutepec', 'Cuautla', 'Temixco', 'Yautepec', 'Emiliano Zapata', 'Ayala', 'Xochitepec',
  ],
  'Veracruz': [
    'Veracruz', 'Xalapa', 'Coatzacoalcos', 'Cordoba', 'Poza Rica de Hidalgo', 'Orizaba', 'Minatitlan',
    'Boca del Rio', 'Tuxpan', 'Papantla', 'San Andres Tuxtla',
  ],
};

/** Sugerencias de municipio/alcaldia para el estado dado (vacio si no hay lista). */
export function getMunicipios(estado?: string): string[] {
  if (!estado) return [];
  return MUNICIPIOS_BY_ESTADO[estado] ?? [];
}
