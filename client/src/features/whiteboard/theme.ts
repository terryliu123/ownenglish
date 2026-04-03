export type WhiteboardTheme = 'dark' | 'light' | 'colorful'

export interface ThemeConfig {
  bg: string
  headerBg: string
  text: string
  textMuted: string
  panelBg: string
  buttonBg: string
  selectBg: string
  accent: string
  toolbarBg: string
  toolbarBorder: string
  canvasBg: string
  canvasGrid: string
}

export const themeConfigs: Record<WhiteboardTheme, ThemeConfig> = {
  dark: {
    bg: 'bg-[#0f0f13]',
    headerBg: 'bg-[#1a1a22]/95 border-slate-800',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    panelBg: 'bg-[#1a1a22]/95 border-slate-800',
    buttonBg: 'bg-slate-800 hover:bg-slate-700',
    selectBg: 'bg-slate-800 border-slate-700',
    accent: 'text-indigo-400',
    toolbarBg: 'bg-[#1a1a22]/95',
    toolbarBorder: 'border-slate-800',
    canvasBg: '#141418',
    canvasGrid: 'rgba(99, 102, 241, 0.03)',
  },
  light: {
    bg: 'bg-slate-50',
    headerBg: 'bg-white/95 border-slate-200',
    text: 'text-slate-900',
    textMuted: 'text-slate-600',
    panelBg: 'bg-white/95 border-slate-200',
    buttonBg: 'bg-slate-100 hover:bg-slate-200',
    selectBg: 'bg-white border-slate-300',
    accent: 'text-blue-600',
    toolbarBg: 'bg-white/95',
    toolbarBorder: 'border-slate-200',
    canvasBg: '#ffffff',
    canvasGrid: 'rgba(0, 0, 0, 0.05)',
  },
  colorful: {
    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    headerBg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
    text: 'text-purple-900',
    textMuted: 'text-purple-600',
    panelBg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
    buttonBg: 'bg-purple-100 hover:bg-purple-200',
    selectBg: 'bg-white border-purple-300',
    accent: 'text-purple-600',
    toolbarBg: 'bg-fuchsia-50/95',
    toolbarBorder: 'border-fuchsia-200',
    canvasBg: '#faf5ff',
    canvasGrid: 'rgba(168, 85, 247, 0.08)',
  },
}

export function useWhiteboardTheme(theme: WhiteboardTheme) {
  return themeConfigs[theme]
}
