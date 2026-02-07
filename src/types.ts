export interface QSLCard {
  id: string
  callsign: string
  displayCallsign: string
  frontImage: string
  backImage?: string
  type: 'normal' | '6m' | 'SAT'
  dxcc?: string
  createdAt: number
  width?: number
  height?: number
  aspectRatio?: number
  cardIndex: number
  totalCards?: number
  portablePrefix?: string
}

export interface GitHubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'error'
  result?: QSLCard
  error?: string
}

export type FilterType = 'all' | '6m' | 'SAT'
export type ViewMode = 'grid' | 'masonry'
export type AppMode = 'display' | 'admin'

export interface GalleryState {
  cards: QSLCard[]
  filter: FilterType
  letterFilter: string
  searchQuery: string
  viewMode: ViewMode
  currentPage: number
  itemsPerPage: number
}

export interface GitHubConfig {
  owner: string
  repo: string
  path: string
  branch: string
  token?: string
}
