import type { AppContext as BaseMapData } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'

export type MapData = BaseMapData & {
  counterpickRoundCount: number
}
