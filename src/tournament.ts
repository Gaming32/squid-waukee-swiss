import type {
  AppContext as BaseMapData,
  MapPool,
} from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import type { TournamentFormat } from './format'

export type MapData = BaseMapData & {
  counterpickRoundCount: number
}

export type TournamentSetupData = {
  format: TournamentFormat
  counterpickRoundCount: number
  mapPool: MapPool
  teams: string[]
}
