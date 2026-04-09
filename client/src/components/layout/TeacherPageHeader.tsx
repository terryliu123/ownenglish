import type { ReactNode } from 'react'

interface TeacherPageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}

export default function TeacherPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  meta,
}: TeacherPageHeaderProps) {
  return (
    <section className="surface-card teacher-page-header">
      <div className="teacher-page-header__lead">
        <div className="teacher-page-header__identity">
          {icon ? <div className="teacher-page-header__icon">{icon}</div> : null}
          <div className="teacher-page-header__copy">
            {eyebrow ? <p className="teacher-page-header__eyebrow">{eyebrow}</p> : null}
            <h2 className="teacher-page-header__title">{title}</h2>
            {description ? <div className="teacher-page-header__description">{description}</div> : null}
            {meta ? <div className="teacher-page-header__meta">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="teacher-page-header__actions">{actions}</div> : null}
      </div>
    </section>
  )
}
