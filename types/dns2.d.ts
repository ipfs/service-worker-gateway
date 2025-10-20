declare module 'dns2' {
  export class Packet {
    static TYPE: {
      A: number
      AAAA: number
      CNAME: number
      MX: number
      NS: number
      PTR: number
      SOA: number
      SRV: number
      TXT: number
    }

    static CLASS: {
      IN: number
      CS: number
      CH: number
      HS: number
    }

    static RCODE: {
      NO_ERROR: number
      FORMAT_ERROR: number
      SERVER_FAILURE: number
      NAME_ERROR: number
      NOT_IMPLEMENTED: number
      REFUSED: number
    }

    static createResponseFromRequest(request: any): any
    
    header: {
      id: number
      qr: number
      opcode: number
      aa: number
      tc: number
      rd: number
      ra: number
      rcode: number
      qdcount: number
      ancount: number
      nscount: number
      arcount: number
    }

    questions: Array<{
      name: string
      type: number
      class: number
    }>

    answers: Array<{
      name: string
      type: number
      class: number
      ttl: number
      data: string
    }>
  }

  export interface ServerOptions {
    udp?: boolean
    tcp?: boolean
    handle: (request: any, send: (response: any) => void) => void
  }

  export interface ListenOptions {
    udp?: {
      port: number
      address: string
    }
    tcp?: {
      port: number
      address: string
    }
  }

  export function createServer(options: ServerOptions): {
    on: (event: string, callback: (...args: any[]) => void) => void
    listen: (options: ListenOptions) => void
    close: (callback?: () => void) => void
  }
}