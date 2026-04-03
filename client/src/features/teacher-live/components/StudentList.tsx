import React from 'react'

interface Student {
  id: string
  name: string
}

interface StudentListProps {
  onlineStudents: Student[]
  classroomStudents: Student[]
  onEndSession: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const StudentList: React.FC<StudentListProps> = ({
  onlineStudents,
  classroomStudents,
  onEndSession,
  t,
  tWithParams,
}) => {
  const renderStudents = (students: Student[], emptyText: string) => {
    if (!students.length) {
      return <p className="text-sm" style={{ color: 'var(--muted)' }}>{emptyText}</p>
    }

    return (
      <div className="flex flex-wrap gap-2">
        {students.map((student) => (
          <span
            key={student.id}
            className="px-3 py-2 rounded-full text-sm"
            style={{ background: 'rgba(24, 50, 74, 0.08)', color: 'var(--ink)' }}
          >
            {student.name}
          </span>
        ))}
      </div>
    )
  }

  return (
    <section className="teacher-grid split-2 mb-4">
      <article className="surface-card">
        <div className="surface-head">
          <h3>{t('teacherLive.onlineStudents')}</h3>
          <span>{tWithParams('class.people', { count: onlineStudents.length })}</span>
        </div>
        {renderStudents(onlineStudents, t('teacherLive.noStudentOnline'))}
      </article>

      <article className="surface-card">
        <div className="surface-head">
          <h3>{t('teacherLive.inClassroom')}</h3>
          <div className="flex items-center gap-3">
            <span>{tWithParams('class.people', { count: classroomStudents.length })}</span>
            <button className="ghost-button py-2 px-4 text-sm" onClick={onEndSession}>
              {t('teacherLive.endClass')}
            </button>
          </div>
        </div>
        {renderStudents(classroomStudents, t('teacherLive.noStudentInClassroom'))}
      </article>
    </section>
  )
}
