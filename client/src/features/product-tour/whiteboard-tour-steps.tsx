import type { StepType } from '@reactour/tour'

interface WhiteboardTourStepOptions {
  ensureInteractiveLayout: () => void
}

function StepContent({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

export function getWhiteboardTourSteps({ ensureInteractiveLayout }: WhiteboardTourStepOptions): StepType[] {
  return [
    {
      selector: '[data-tour="whiteboard-class-select"]',
      content: (
        <StepContent
          title="选择当前班级"
          description="先确认当前课堂归属。后续发布任务、课堂回顾和本节课记录都会绑定到这个班级。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-session-controls"]',
      content: (
        <StepContent
          title="开始本节课"
          description="先开始本节课，再发任务和互动。系统会把本节课的任务、挑战和课堂回顾统一挂到当前课堂会话中。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-student-panel"]',
      action: ensureInteractiveLayout,
      content: (
        <StepContent
          title="查看课堂学生"
          description="这里可以看到当前已进入课堂的学生，也能处理学生分享和课堂内的即时互动。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-task-panel"]',
      position: 'left',
      action: ensureInteractiveLayout,
      content: (
        <StepContent
          title="发布课堂任务"
          description="待发布任务会集中在这里。先预览，再发布给学生，这是互动课堂的主操作路径。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-danmu-settings"]',
      content: (
        <StepContent
          title="控制课堂氛围"
          description="这里可以控制弹幕、预制语句和氛围特效，用来增强课堂反馈和参与感。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-ai-settings"]',
      content: (
        <StepContent
          title="管理 AI 设置"
          description="这里用于控制课堂中的 AI 使用方式，包括教师端和学生端的 AI 权限与提示规则。"
        />
      ),
    },
    {
      selector: '[data-tour="whiteboard-session-controls"]',
      content: (
        <StepContent
          title="结束本节课"
          description="课后在这里结束课堂。结束后可以进入课堂回顾查看本节课的记录、任务和互动结果。"
        />
      ),
    },
  ]
}
