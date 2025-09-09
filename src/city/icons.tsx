export type CityIconId =
  | 'home' | 'kita' | 'school' | 'hospital' | 'police' | 'firestation'
  | 'library' | 'museum' | 'bank' | 'post' | 'pharmacy' | 'cafe'
  | 'restaurant' | 'shop' | 'hotel' | 'cinema'

export type CityIcon = { id: CityIconId; label: string; src?: string; emojiFallback: string }

export const CITY_ICONS: Record<CityIconId, CityIcon> = {
  home:        { id:'home',        label:'Home',        emojiFallback:'🏠' },
  kita:        { id:'kita',        label:'KiTa',        emojiFallback:'🧒' },
  school:      { id:'school',      label:'Schule',      emojiFallback:'🏫' },
  hospital:    { id:'hospital',    label:'Spital',      emojiFallback:'🏥' },
  police:      { id:'police',      label:'Polizei',     emojiFallback:'🚓' },
  firestation: { id:'firestation', label:'Feuerwehr',   emojiFallback:'🚒' },
  library:     { id:'library',     label:'Bibliothek',  emojiFallback:'📚' },
  museum:      { id:'museum',      label:'Museum',      emojiFallback:'🖼️' },
  bank:        { id:'bank',        label:'Bank',        emojiFallback:'🏦' },
  post:        { id:'post',        label:'Post',        emojiFallback:'📫' },
  pharmacy:    { id:'pharmacy',    label:'Apotheke',    emojiFallback:'💊' },
  cafe:        { id:'cafe',        label:'Café',        emojiFallback:'☕' },
  restaurant:  { id:'restaurant',  label:'Restaurant',  emojiFallback:'🍽️' },
  shop:        { id:'shop',        label:'Laden',       emojiFallback:'🏪' },
  hotel:       { id:'hotel',       label:'Hotel',       emojiFallback:'🏨' },
  cinema:      { id:'cinema',      label:'Kino',        emojiFallback:'🎞️' },
}

export function CityIcon({ id, className }: { id: CityIconId; className?: string }){
  const icon = CITY_ICONS[id]
  const sizeClass = className ?? 'text-[14px] md:text-[18px]'
  return (
    <span className={`${sizeClass}`} aria-label={icon.label} role="img">
      {icon.emojiFallback}
    </span>
  )
}
