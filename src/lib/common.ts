
export enum COLORS {
  default = '#fff',
  active = '#357edd',
  success = '#0cb892',
  error = '#ea5037'
}

export enum ChannelActions {
  GET_FILE = 'GET_FILE',
  DIAL = 'DIAL',
  UPDATE_OUTPUT = 'UPDATE_OUTPUT',
  PING = 'PING',
  PONG = 'PONG',
  /**
   * Intended only for pushing from SW to the UI output terminal
   */
  SHOW_STATUS = 'SHOW_STATUS',
}
