export interface Standup {
  isActive: boolean,
  timeFinish: number | null,
  messageStr: string,
  user: number | null,
}

export interface StandupStart {
  timeFinish: number,
}
