/**
 * Renders an experiment via third-party URL in a sandboxed iframe.
 */
export function ExperimentIframe({
  src,
  className,
  style,
  title = 'Experiment',
}: {
  src: string
  className?: string
  style?: React.CSSProperties
  title?: string
}) {
  if (!src) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No URL provided
      </div>
    )
  }

  return (
    <iframe
      src={src}
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
      className={className}
      style={style}
      title={title}
    />
  )
}
