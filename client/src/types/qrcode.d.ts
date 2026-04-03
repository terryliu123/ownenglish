declare module 'qrcode' {
  interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }
  export function toDataURL(data: string, options?: QRCodeOptions): Promise<string>
  export function toCanvas(canvas: HTMLCanvasElement, data: string, options?: QRCodeOptions): Promise<void>
}
