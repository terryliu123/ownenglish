import { useNavigate } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import { useAppStore } from '../../stores/app-store'
import {
  useTeacherLivePage,
  ClassSelector,
  StudentList,
  ShareRequestsPanel,
  TaskGroupPanel,
  TaskPublisher,
  ChallengePanel,
  ActiveTaskGroup,
  DuelModal,
  SingleQuestionDuelModal,
  HistoryList,
} from '../../features/teacher-live'

export default function TeacherLive() {
  useAppStore()
  const navigate = useNavigate()
  const {
    t, tWithParams, loading, error, currentClassId, classes, classPresence, roomInfo, getCurrentClassName,
    taskGroups, selectedGroup, loadGroupDetail, revertToDraft,
    currentTaskGroup, taskGroupSubmissions, taskGroupEnded,
    currentChallenge, setCurrentChallenge, challengeCreating, showDuelModal, selectedDuelParticipants,
    showSingleQuestionDuelModal, selectedSingleQuestionParticipants, selectedSingleQuestionTaskId,
    showChallengeBoard, challengeCandidates, singleQuestionDuelTasks, hasActiveChallenge,
    canStartStandardChallenge, canStartSingleQuestionDuel, unsupportedChallengeLabels,
    setShowDuelModal, setShowSingleQuestionDuelModal,
    setSelectedSingleQuestionTaskId, onConfirmDuel,
    onConfirmSingleQuestionDuel, handleToggleDuelParticipant, handleToggleSingleQuestionParticipant,
    handleOpenChallengeBoard, handleCloseChallengeBoard, handleEndChallenge,
    taskHistory, showHistoryList, historySearchQuery, setShowHistoryList, setHistorySearchQuery,
    selectedHistoryItem, setSelectedHistoryItem, showHistoryAnalysis, showDetailView, showHistoryPreviewExpanded,
    setShowHistoryAnalysis, setShowDetailView, setShowHistoryPreviewExpanded, analyticsData, analyticsLoading, submissionData, submissionLoading,
    viewingStudentDetail, setViewingStudentDetail,
    pendingShareRequests, setPendingShareRequests, isWsReady, ws, handleClassChange, handleEndSession,
    handleEndTaskGroup, onPublish, onStartChallenge, setClassPresence, loadClassPresence,
    formatHistoryItemTime, compareHistoryItems, getHistoryItemKey, onEnterActiveTask, onEndActiveTask,
  } = useTeacherLivePage()

  // Loading / Error states
  if (loading) return (<Layout sidebar={<TeacherSidebar activePage="live" />}><div className="surface-card p-12 text-center"><p style={{ color: 'var(--muted)' }}>{t('common.loading')}</p></div></Layout>)
  if (error) return (<Layout sidebar={<TeacherSidebar activePage="live" />}><div className="surface-card p-12 text-center"><p className="text-lg mb-4" style={{ color: 'var(--danger)' }}>{error}</p><button className="solid-button" onClick={() => window.location.reload()}>{t('live.refreshPage')}</button></div></Layout>)
  if (!currentClassId) return (<Layout sidebar={<TeacherSidebar activePage="live" />}><div className="surface-card p-12 text-center"><p className="text-lg mb-4" style={{ color: 'var(--muted)' }}>{t('live.createClassFirst')}</p><button className="solid-button" onClick={() => navigate('/teacher/classes')}>{t('live.goCreateClass')}</button></div></Layout>)

  return (
    <Layout sidebar={<TeacherSidebar activePage="live" />}>
      <ClassSelector classes={classes} currentClassId={currentClassId} onClassChange={handleClassChange}
        classroomStudentCount={classPresence?.classroom_student_count ?? roomInfo?.student_count ?? 0}
        onlineStudentCount={classPresence?.online_student_count ?? 0} wsStatus={ws.status}
        onRefresh={() => { ws.getRoomInfo(); loadClassPresence(currentClassId).then((p) => p && setClassPresence(p)) }} t={t}
        onSwitchToWhiteboard={() => navigate('/teacher/whiteboard')} />

      <StudentList onlineStudents={classPresence?.online_students ?? []} classroomStudents={classPresence?.classroom_students ?? []}
        onEndSession={() => { if (window.confirm(t('teacherLive.endClassConfirm'))) handleEndSession() }} t={t} tWithParams={tWithParams} />

      <ShareRequestsPanel shareRequests={pendingShareRequests}
        onApprove={(shareId, comment) => { ws.approveShare(shareId, comment); setPendingShareRequests((prev) => prev.filter((r) => r.share_id !== shareId)) }}
        onReject={(shareId) => { ws.rejectShare(shareId); setPendingShareRequests((prev) => prev.filter((r) => r.share_id !== shareId)) }}
        onRejectAll={() => { pendingShareRequests.forEach((r) => ws.rejectShare(r.share_id)); setPendingShareRequests([]) }} t={t} />

      <ChallengePanel currentChallenge={currentChallenge} onOpenBoard={handleOpenChallengeBoard}
        onEndChallenge={() => handleEndChallenge(currentChallenge)} onDismissChallenge={() => setCurrentChallenge(null)} t={t} tWithParams={tWithParams} />

      {currentTaskGroup && (
        <ActiveTaskGroup currentTaskGroup={currentTaskGroup} taskGroupSubmissions={taskGroupSubmissions}
          taskGroupEnded={taskGroupEnded} classroomStudentCount={classPresence?.classroom_student_count ?? roomInfo?.student_count ?? 0}
          onEndTaskGroup={handleEndTaskGroup} t={t} tWithParams={tWithParams} />
      )}

      {!currentTaskGroup && !currentChallenge && !showHistoryList && (
        <section className="teacher-grid split-2">
          <div className="space-y-4">
            <TaskGroupPanel taskGroups={taskGroups} selectedGroup={selectedGroup}
              onSelectGroup={loadGroupDetail} onRevertToDraft={revertToDraft}
              onNavigateToPrepare={() => navigate('/teacher/task-groups')} t={t} tWithParams={tWithParams} />
          </div>
          <TaskPublisher selectedGroup={selectedGroup} wsStatus={ws.status} hasActiveChallenge={hasActiveChallenge}
            challengeCandidates={challengeCandidates} canStartStandardChallenge={canStartStandardChallenge}
            canStartSingleQuestionDuel={canStartSingleQuestionDuel} unsupportedChallengeLabels={unsupportedChallengeLabels}
            classroomStudentCount={classPresence?.classroom_student_count ?? roomInfo?.student_count ?? 0}
            onlineStudentCount={classPresence?.online_student_count ?? 0} currentClassName={getCurrentClassName()}
            onPublish={onPublish} onStartClassChallenge={() => onStartChallenge('class_challenge')}
            onShowDuelModal={() => setShowDuelModal(true)} onShowSingleQuestionDuelModal={() => setShowSingleQuestionDuelModal(true)} t={t} tWithParams={tWithParams} />
        </section>
      )}

      {/* History Preview - moved below task groups, default expanded */}
      {!currentTaskGroup && !currentChallenge && !showHistoryList && taskHistory.filter(item => item.status === 'ended').length > 0 && (
        <section className="mb-6 mt-6">
          <div className="surface-card">
            <div className="surface-head" style={{ cursor: 'pointer' }} onClick={() => setShowHistoryPreviewExpanded(!showHistoryPreviewExpanded)}>
              <h3>{t('teacherLive.publishedTasks')} ({taskHistory.filter(item => item.status === 'ended').length})</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  {tWithParams('teacherLive.showingRecentTasks', { count: Math.min(5, taskHistory.filter(item => item.status === 'ended').length) })}
                </span>
                <span>{showHistoryPreviewExpanded ? '▼' : '▶'}</span>
              </div>
            </div>
            {showHistoryPreviewExpanded && (
              <>
                <div className="space-y-3">
                  {taskHistory
                    .filter(item => item.status === 'ended')
                    .slice(0, 5)
                    .map((item, index) => (
                    <div
                      key={getHistoryItemKey(item)}
                      className="p-4 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(24,36,58,0.08)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                            style={{ background: 'var(--surface)' }}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm" style={{ color: 'var(--muted)' }}>
                              📋 {tWithParams('teacherLive.taskCount', { count: item.task_count })}
                              {item.submissions > 0 && tWithParams('teacherLive.submittedPeople', { count: item.submissions })}
                              {formatHistoryItemTime(item) && (
                                <span>
                                  {tWithParams(item.ended_at ? 'teacherLive.endedAt' : 'teacherLive.publishedAt', {
                                    time: formatHistoryItemTime(item) || '',
                                  })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#15803d',
                            }}
                          >
                            {t('teacherLive.ended')}
                          </span>
                          <button
                            className="ghost-button py-1.5 px-3 text-sm"
                            onClick={() => { setSelectedHistoryItem(item); setShowHistoryAnalysis(true) }}
                          >
                            {t('teacherLive.viewAnalysis')}
                          </button>
                          <button
                            className="solid-button py-1.5 px-3 text-sm"
                            onClick={() => { setSelectedHistoryItem(item); setShowDetailView(true) }}
                          >
                            {t('teacherLive.viewDetails')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {taskHistory.filter(item => item.status === 'ended').length > 5 && (
                  <div className="mt-3 text-center">
                    <button className="ghost-button py-1.5 px-3 text-sm" onClick={() => setShowHistoryList(true)}>
                      {tWithParams('teacherLive.viewMoreHistory', { count: taskHistory.filter(item => item.status === 'ended').length - 5 })}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Full History List */}
      {showHistoryList && (
        <HistoryList
          show={showHistoryList}
          taskHistory={taskHistory}
          searchQuery={historySearchQuery}
          onSearchChange={setHistorySearchQuery}
          onClose={() => { setShowHistoryList(false); setHistorySearchQuery('') }}
          onEnterActiveTask={onEnterActiveTask}
          onEndActiveTask={onEndActiveTask}
          onViewAnalysis={(item) => { setSelectedHistoryItem(item); setShowHistoryAnalysis(true) }}
          onViewDetails={(item) => { setSelectedHistoryItem(item); setShowDetailView(true) }}
          formatHistoryItemTime={formatHistoryItemTime}
          compareHistoryItems={compareHistoryItems}
          getHistoryItemKey={getHistoryItemKey}
          t={t}
          tWithParams={tWithParams}
        />
      )}

      {!isWsReady && ws.status === 'connecting' && (
        <section className="mb-6"><div className="surface-card" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}><div className="flex items-center gap-3 p-4"><span className="animate-spin">⏳</span><p style={{ color: '#92400e' }}>{t('teacherLive.connectingServer')}</p></div></div></section>
      )}

      {isWsReady && taskHistory.length === 0 && !currentTaskGroup && !showHistoryList && (
        <section className="mb-6"><div className="surface-card" style={{ background: 'rgba(243, 244, 246, 0.5)' }}><div className="p-6 text-center"><p style={{ color: 'var(--muted)' }}>{t('teacherLive.noTasksYet')}</p><p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('teacherLive.selectTaskGroup')}</p></div></div></section>
      )}

      <DuelModal show={showDuelModal} selectedParticipants={selectedDuelParticipants} challengeCandidates={challengeCandidates}
        challengeCreating={challengeCreating} onClose={() => setShowDuelModal(false)} onToggleParticipant={handleToggleDuelParticipant}
        onConfirm={onConfirmDuel} t={t} tWithParams={tWithParams} />

      <SingleQuestionDuelModal show={showSingleQuestionDuelModal} tasks={singleQuestionDuelTasks} selectedTaskId={selectedSingleQuestionTaskId}
        selectedParticipants={selectedSingleQuestionParticipants} challengeCandidates={challengeCandidates} challengeCreating={challengeCreating}
        onClose={() => setShowSingleQuestionDuelModal(false)} onSelectTask={setSelectedSingleQuestionTaskId}
        onToggleParticipant={handleToggleSingleQuestionParticipant} onConfirm={onConfirmSingleQuestionDuel} t={t} tWithParams={tWithParams} />

      {showChallengeBoard && currentChallenge && (
        <div className="fixed inset-0" style={{ zIndex: 140, background: 'radial-gradient(circle at top, rgba(14,165,233,0.22), transparent 40%), linear-gradient(160deg, #08111f 0%, #10203a 38%, #08111f 100%)', color: '#f8fafc' }}>
          <div className="h-full overflow-auto px-8 py-8"><div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-6 mb-8">
              <div><p className="text-xs uppercase tracking-[0.32em] mb-3" style={{ color: 'rgba(255,255,255,0.46)' }}>{t('challenge.liveBoardTitle')}</p><h2 className="text-5xl font-black leading-tight" style={{ letterSpacing: '-0.04em' }}>{currentChallenge.title}</h2></div>
              <div className="flex items-center gap-3"><button className="ghost-button py-2 px-4 text-sm" onClick={handleCloseChallengeBoard}>{t('challenge.closeBoard')}</button></div>
            </div>
            <p className="text-center text-white/60">{t('challenge.boardContentPlaceholder')}</p>
          </div></div>
        </div>
      )}

      {/* History Analysis Modal */}
      {showHistoryAnalysis && selectedHistoryItem && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 150, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="surface-card w-full max-w-5xl max-h-[95vh] overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="surface-head sticky top-0 z-10 flex items-center justify-between py-4 px-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '16px 16px 0 0' }}>
              <div>
                <h3 className="text-lg font-semibold">{selectedHistoryItem.title}</h3>
                <p className="text-sm opacity-80">{t('teacherLive.taskAnalysis')}</p>
              </div>
              <button className="ghost-button py-2 px-4 text-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => setShowHistoryAnalysis(false)}>{t('teacherLive.close')}</button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin mr-3">⏳</span>
                  <p>{t('teacherLive.loadingAnalysis')}</p>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', border: '1px solid rgba(102,126,234,0.2)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{t('teacherLive.totalStudents')}</p>
                      <p className="text-3xl font-bold" style={{ color: '#667eea' }}>{analyticsData.total_students}</p>
                    </div>
                    <div className="p-5 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #11998e15 0%, #38ef7d15 100%)', border: '1px solid rgba(17,153,142,0.2)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{t('teacherLive.avgCorrectRate')}</p>
                      <p className="text-3xl font-bold" style={{ color: analyticsData.summary_rate >= 60 ? '#11998e' : '#dc2626' }}>{Math.round(analyticsData.summary_rate)}%</p>
                    </div>
                    <div className="p-5 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #fc4a1a15 0%, #f7b73315 100%)', border: '1px solid rgba(252,74,26,0.2)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{t('teacherLive.summary')}</p>
                      <p className="text-lg font-medium" style={{ color: '#fc4a1a' }}>{typeof analyticsData.summary_label === 'string' ? analyticsData.summary_label : JSON.stringify(analyticsData.summary_label)}</p>
                    </div>
                  </div>

                  {/* Task Statistics */}
                  <div>
                    <h4 className="font-semibold mb-4 text-lg" style={{ color: 'var(--text)' }}>{t('teacherLive.taskStats')}</h4>
                    <div className="space-y-4">
                      {analyticsData.task_analytics.map((task: any, idx: number) => {
                        // Helper to extract plain text from rich text object
                        const extractText = (obj: any): string => {
                          if (typeof obj === 'string') return obj;
                          if (obj && typeof obj === 'object') {
                            if (obj.content && Array.isArray(obj.content)) {
                              return obj.content.map(extractText).join('');
                            }
                            if (obj.text) return obj.text;
                            if (obj.type === 'text' && obj.text) return obj.text;
                          }
                          return '';
                        };

                        let questionText = '';
                        if (typeof task.question_text === 'string') {
                          try {
                            const parsed = JSON.parse(task.question_text);
                            questionText = extractText(parsed) || task.question_text;
                          } catch {
                            questionText = task.question_text;
                          }
                        } else if (task.question_text && typeof task.question_text === 'object') {
                          questionText = extractText(task.question_text) || JSON.stringify(task.question_text);
                        } else {
                          questionText = String(task.question_text ?? '');
                        }

                        // Check if this is a choice type question
                        const taskType = task.type as string;
                        const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice' || taskType === 'true_false';
                        const isTrueFalse = taskType === 'true_false';
                        const isFillBlank = taskType === 'fill_blank';
                        const isMatching = taskType === 'matching';
                        // Extract options for choice questions
                        const taskOptions = (task.options as Array<{key: string, text?: string}> | undefined) || [];
                        const showOptions = isChoiceQuestion && taskOptions.length > 0;
                        // Extract correct answer string, handling object formats like {value: true}
                        const correctAnswerRaw = ((): string => {
                          const ans = task.correct_answer as unknown;
                          if (ans === null || ans === undefined) return '';
                          if (typeof ans === 'string') return ans;
                          if (typeof ans === 'boolean') return ans ? 'TRUE' : 'FALSE';
                          if (typeof ans === 'object') {
                            // Handle {value: ...} format
                            const ansObj = ans as Record<string, unknown>;
                            if (ansObj.value !== undefined) {
                              if (typeof ansObj.value === 'boolean') return ansObj.value ? 'TRUE' : 'FALSE';
                              return String(ansObj.value);
                            }
                            return JSON.stringify(ans);
                          }
                          return String(ans);
                        })();
                        const correctAnswerStr = correctAnswerRaw.toUpperCase();

                        const wrongCount = task.total_submissions - task.correct_count;

                        const questionTextDisplay: string = questionText || '';

                        return (
                        <div key={idx} className="p-5 rounded-xl" style={{ background: '#fffbf5', border: '1px solid rgba(24,36,58,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          {/* Header with Q number and status */}
                          <div className="flex items-start gap-3 mb-3">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(24,36,58,0.08)', color: '#333' }}>{idx + 1}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: task.primary_rate >= 60 ? 'rgba(17,153,142,0.1)' : 'rgba(220,38,38,0.1)', color: task.primary_rate >= 60 ? '#11998e' : '#dc2626' }}>
                              {task.primary_rate >= 60 ? '✓ 正确率高' : '✗ 需关注'}
                            </span>
                          </div>

                          {/* Correct/Wrong count summary */}
                          <div className="flex items-center gap-4 mb-3 text-sm">
                            <span style={{ color: '#11998e' }}>✓ 正确 {task.correct_count}人</span>
                            <span style={{ color: '#dc2626' }}>✗ 错误 {wrongCount}人</span>
                            <span style={{ color: 'var(--muted)' }}>共{task.total_submissions}人答题</span>
                          </div>

                          {/* Question text */}
                          <p className="text-base font-medium mb-4" style={{ color: '#333' }}>{questionTextDisplay}</p>

                          {/* Options for choice questions */}
                          {!!showOptions && (
                            <div className="space-y-2">
                              {taskOptions.map((opt: {key: string, text?: string}, oIdx: number) => {
                                const isCorrectAnswer = correctAnswerStr === opt.key.toUpperCase();
                                return (
                                  <div key={oIdx} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: isCorrectAnswer ? '#11998e' : 'rgba(24,36,58,0.08)', color: isCorrectAnswer ? '#fff' : '#333' }}>
                                      {opt.key}
                                    </span>
                                    <span className="flex-1 text-sm" style={{ color: '#333' }}>{String(opt.text || '')}</span>
                                    {isCorrectAnswer && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(17,153,142,0.15)', color: '#11998e' }}>正确答案</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Pairs for matching questions */}
                          {isMatching && task.pairs && task.pairs.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {task.pairs.map((pair: {left: string, right: string}, pIdx: number) => (
                                <div key={pIdx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                  <span className="font-medium text-sm" style={{ color: '#667eea' }}>{pair.left}</span>
                                  <span style={{ color: '#999' }}>→</span>
                                  <span className="text-sm">{pair.right}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fill in the blanks */}
                          {isFillBlank && task.correct_answer && (
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(17,153,142,0.08)' }}>
                              <p className="text-xs mb-1" style={{ color: '#11998e' }}>参考答案</p>
                              <p className="text-sm font-medium" style={{ color: '#11998e' }}>
                                {(() => {
                                  const ans = task.correct_answer;
                                  if (Array.isArray(ans)) return ans.join(', ');
                                  if (typeof ans === 'object' && ans !== null) {
                                    // Handle {blanks: [...]} or {value: [...]} format
                                    const ansObj = ans as Record<string, unknown>;
                                    if (ansObj.blanks && Array.isArray(ansObj.blanks)) return (ansObj.blanks as string[]).join(', ');
                                    if (ansObj.value && Array.isArray(ansObj.value)) return (ansObj.value as string[]).join(', ');
                                    return JSON.stringify(ans);
                                  }
                                  return String(ans);
                                })() as string}
                              </p>
                            </div>
                          )}

                          {/* True/False question display */}
                          {isTrueFalse && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? 'rgba(17,153,142,0.08)' : 'rgba(255,255,255,0.6)' }}>
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? '#11998e' : 'rgba(24,36,58,0.08)', color: correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? '#fff' : '#333' }}>
                                  T
                                </span>
                                <span className="flex-1 text-sm" style={{ color: '#333' }}>正确 (True)</span>
                                {(correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(17,153,142,0.15)', color: '#11998e' }}>正确答案</span>}
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? 'rgba(17,153,142,0.08)' : 'rgba(255,255,255,0.6)' }}>
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? '#11998e' : 'rgba(24,36,58,0.08)', color: correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? '#fff' : '#333' }}>
                                  F
                                </span>
                                <span className="flex-1 text-sm" style={{ color: '#333' }}>错误 (False)</span>
                                {(correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(17,153,142,0.15)', color: '#11998e' }}>正确答案</span>}
                              </div>
                            </div>
                          )}

                          {/* Answer distribution for all question types */}
                          {task.answer_distribution && task.answer_distribution.length > 0 && (
                            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(24,36,58,0.06)' }}>
                              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>答题分布</p>
                              <div className="space-y-1.5">
                                {task.answer_distribution.map((dist: {key: string, count: number, percentage: number, is_correct: boolean}, dIdx: number) => (
                                  <div key={dIdx} className="flex items-center gap-2">
                                    <span className="text-xs w-6" style={{ color: dist.is_correct ? '#11998e' : 'var(--muted)' }}>{dist.key}</span>
                                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(24,36,58,0.06)' }}>
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${dist.percentage}%`,
                                          background: dist.is_correct ? '#11998e' : '#667eea',
                                          minWidth: dist.count > 0 ? '4px' : '0'
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs w-16 text-right" style={{ color: 'var(--muted)' }}>{dist.count}人 ({Math.round(dist.percentage)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8" style={{ color: 'var(--muted)' }}>{t('teacherLive.noAnalysisData')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {showDetailView && selectedHistoryItem && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 150, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="surface-card w-full max-w-5xl max-h-[95vh] overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="surface-head sticky top-0 z-10 flex items-center justify-between py-4 px-6" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', borderRadius: '16px 16px 0 0' }}>
              <div>
                <h3 className="text-lg font-semibold">{selectedHistoryItem.title}</h3>
                <p className="text-sm opacity-80">{t('teacherLive.studentSubmissions')}</p>
              </div>
              <div className="flex items-center gap-3">
                {viewingStudentDetail && (
                  <button className="ghost-button py-2 px-4 text-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => setViewingStudentDetail(null)}>
                    ← {t('teacherLive.backToList')}
                  </button>
                )}
                <button className="ghost-button py-2 px-4 text-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => { setViewingStudentDetail(null); setShowDetailView(false); }}>
                  {t('teacherLive.close')}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
              {submissionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin mr-3">⏳</span>
                  <p>{t('teacherLive.loadingSubmissions')}</p>
                </div>
              ) : submissionData && submissionData.students && submissionData.students.length > 0 ? (
                viewingStudentDetail ? (
                  /* Individual Student Detail View */
                  <div className="space-y-4">
                    {/* Student Header - no ID */}
                    <div className="p-4 rounded-xl mb-6" style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)', border: '1px solid rgba(102,126,234,0.2)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>
                            {viewingStudentDetail.student_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{viewingStudentDetail.student_name}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold" style={{ color: viewingStudentDetail.correct_count === (selectedHistoryItem.task_count || 0) ? '#11998e' : '#dc2626' }}>
                            {viewingStudentDetail.correct_count}/{selectedHistoryItem.task_count || 0}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('teacherLive.correctCount_short')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Answer List */}
                    <h4 className="font-semibold mb-3">{t('teacherLive.answerDetails')}</h4>
                    <div className="space-y-4">
                      {viewingStudentDetail.submissions?.map((sub, idx) => {
                        // Try to find task by task_id or id (API uses id, WebSocket uses task_id)
                        const task = selectedHistoryItem.tasks?.find(t => (t.task_id || (t as any).id) === sub.task_id);
                        const taskNumber = idx + 1;

                        // Debug logging
                        console.log('[Detail View] Task:', task);
                        console.log('[Detail View] Task question:', task?.question);

                        // Helper to extract plain text from rich text object
                        const extractText = (obj: any): string => {
                          if (typeof obj === 'string') return obj;
                          if (obj && typeof obj === 'object') {
                            if (obj.content && Array.isArray(obj.content)) {
                              return obj.content.map(extractText).join('');
                            }
                            if (obj.text) return obj.text;
                            if (obj.type === 'text' && obj.text) return obj.text;
                          }
                          return '';
                        };

                        // Extract question text - handle API format (LiveTaskData)
                        let questionText = '';
                        let questionObj: any = null;

                        if (task?.question) {
                          if (typeof task.question === 'string') {
                            // Try to parse as JSON (ProseMirror format)
                            try {
                              questionObj = JSON.parse(task.question);
                              questionText = extractText(questionObj);
                            } catch {
                              // Not JSON, use as plain text
                              questionText = task.question;
                            }
                          } else if (typeof task.question === 'object') {
                            questionObj = task.question;
                            // API returns question with text field that might be ProseMirror JSON
                            if (questionObj.text) {
                              if (typeof questionObj.text === 'string') {
                                // Try to parse text as ProseMirror
                                try {
                                  const parsed = JSON.parse(questionObj.text);
                                  questionText = extractText(parsed);
                                } catch {
                                  questionText = questionObj.text;
                                }
                              } else if (typeof questionObj.text === 'object') {
                                questionText = extractText(questionObj.text);
                              }
                            }
                            // Also try content field (ProseMirror format)
                            if (!questionText && questionObj.content) {
                              questionText = extractText(questionObj);
                            }
                          }
                        }

                        // Debug logging
                        console.log('[Detail View] Extracted questionText:', questionText);

                        // Extract options from question object (handle both API and WebSocket formats)
                        let options: any[] = [];
                        if (questionObj?.options && Array.isArray(questionObj.options)) {
                          options = questionObj.options;
                        } else if (questionObj?.choices && Array.isArray(questionObj.choices)) {
                          options = questionObj.choices;
                        }

                        // Debug logging
                        console.log('[Detail View] Extracted options:', options);

                        // Extract pairs for matching questions
                        const pairs = questionObj?.pairs || [];

                        // Get correct answer and student answer as strings
                        const correctAnswer = (() => {
                          if (!task?.correct_answer) return '';
                          if (typeof task.correct_answer === 'string') {
                            // Try to parse as JSON (e.g., {"value": "A"})
                            try {
                              const parsed = JSON.parse(task.correct_answer);
                              if (parsed && typeof parsed === 'object') {
                                if (parsed.value !== undefined) return String(parsed.value);
                                if (parsed.blanks !== undefined) return JSON.stringify(parsed.blanks);
                              }
                              return task.correct_answer;
                            } catch {
                              return task.correct_answer;
                            }
                          }
                          if (typeof task.correct_answer === 'object') {
                            const ansObj = task.correct_answer as Record<string, unknown>;
                            if (ansObj.value !== undefined) return String(ansObj.value);
                            if (ansObj.blanks !== undefined) return JSON.stringify(ansObj.blanks);
                            return JSON.stringify(task.correct_answer);
                          }
                          return String(task.correct_answer);
                        })();
                        const studentAnswer = typeof sub.answer === 'string' ? sub.answer : JSON.stringify(sub.answer);

                        // Debug logging
                        console.log('[Detail View] correctAnswer:', correctAnswer, 'studentAnswer:', studentAnswer);

                        // Check question type
                        const taskType = task?.type || '';
                        const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice';
                        const isTrueFalse = taskType === 'true_false';
                        const isFillBlank = taskType === 'fill_blank';
                        const isMatching = taskType === 'matching';

                        // Normalize correct answer for comparison
                        const correctAnswerUpper = correctAnswer.toUpperCase();
                        const studentAnswerUpper = studentAnswer.toUpperCase();

                        return (
                          <div key={idx} className="p-5 rounded-xl" style={{ background: '#fffcf7', border: '1px solid rgba(0,0,0,0.06)' }}>
                            {/* Header - matching student UI */}
                            <div className="flex items-center gap-2 mb-4">
                              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: 'rgba(0,0,0,0.06)', color: '#666' }}>
                                {taskNumber}
                              </span>
                              <span className="text-xs px-2 py-1 rounded" style={{ background: sub.is_correct ? '#e8f5e9' : '#ffebee', color: sub.is_correct ? '#2e7d32' : '#c62828', border: `1px solid ${sub.is_correct ? '#a5d6a7' : '#ef9a9a'}` }}>
                                {sub.is_correct ? '正确' : '错误'}
                              </span>
                            </div>

                            {/* Question Text */}
                            <p className="text-base font-medium mb-4" style={{ color: '#333' }}>
                              {questionText || (task?.question ? String(typeof task.question === 'object' ? JSON.stringify(task.question) : task.question) : t('teacherLive.question'))}
                            </p>

                            {/* Single/Multiple Choice Options - matching student UI */}
                            {isChoiceQuestion && Array.isArray(options) && options.length > 0 && (
                              <div className="space-y-2">
                                {options.map((opt: any, oIdx: number) => {
                                  const optKey = opt.key || opt.id || String.fromCharCode(65 + oIdx);
                                  const optText = opt.text || opt.content || opt.value || '';
                                  const isSelected = studentAnswer.toUpperCase() === optKey.toUpperCase();
                                  const isCorrect = correctAnswerUpper === optKey.toUpperCase();
                                  return (
                                    <div
                                      key={oIdx}
                                      className="flex items-center gap-3 py-2"
                                      style={{ borderBottom: oIdx < options.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                                    >
                                      <span className="text-sm font-medium" style={{ color: '#333', minWidth: '20px' }}>
                                        {optKey}
                                      </span>
                                      <span className="flex-1 text-sm" style={{ color: '#333' }}>{String(optText || '')}</span>
                                      {isSelected && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#fff3e0', color: '#e65100' }}>你的答案</span>}
                                      {isCorrect && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#e8f5e9', color: '#2e7d32' }}>正确答案</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* True/False Options - matching student UI */}
                            {isTrueFalse && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                  <span className="text-sm font-medium" style={{ color: '#333', minWidth: '20px' }}>T</span>
                                  <span className="flex-1 text-sm" style={{ color: '#333' }}>正确 (True)</span>
                                  {(studentAnswerUpper === 'TRUE' || studentAnswerUpper === 'T') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#fff3e0', color: '#e65100' }}>你的答案</span>}
                                  {(correctAnswerUpper === 'TRUE' || correctAnswerUpper === 'T') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#e8f5e9', color: '#2e7d32' }}>正确答案</span>}
                                </div>
                                <div className="flex items-center gap-3 py-2">
                                  <span className="text-sm font-medium" style={{ color: '#333', minWidth: '20px' }}>F</span>
                                  <span className="flex-1 text-sm" style={{ color: '#333' }}>错误 (False)</span>
                                  {(studentAnswerUpper === 'FALSE' || studentAnswerUpper === 'F') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#fff3e0', color: '#e65100' }}>你的答案</span>}
                                  {(correctAnswerUpper === 'FALSE' || correctAnswerUpper === 'F') && <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#e8f5e9', color: '#2e7d32' }}>正确答案</span>}
                                </div>
                              </div>
                            )}

                            {/* Fill in the blank */}
                            {isFillBlank && (
                              <div className="space-y-2 mb-4">
                                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                  <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>学生答案</p>
                                  <p className="text-sm font-medium" style={{ color: sub.is_correct ? '#11998e' : '#dc2626' }}>
                                    {(() => {
                                      // Handle string that might be JSON array
                                      if (typeof sub.answer === 'string') {
                                        try {
                                          const parsed = JSON.parse(sub.answer);
                                          if (Array.isArray(parsed)) return parsed.join(', ');
                                          if (parsed && typeof parsed === 'object') {
                                            if (parsed.blanks && Array.isArray(parsed.blanks)) return parsed.blanks.join(', ');
                                            return JSON.stringify(parsed);
                                          }
                                          return sub.answer;
                                        } catch {
                                          return sub.answer;
                                        }
                                      }
                                      if (Array.isArray(sub.answer)) return sub.answer.join(', ');
                                      if (sub.answer && typeof sub.answer === 'object') {
                                        const ansObj = sub.answer as Record<string, unknown>;
                                        if (ansObj.blanks && Array.isArray(ansObj.blanks)) return (ansObj.blanks as string[]).join(', ');
                                        return JSON.stringify(sub.answer);
                                      }
                                      return String(sub.answer);
                                    })() as string}
                                  </p>
                                </div>
                                {!sub.is_correct && Boolean(task?.correct_answer) && (
                                  <div className="p-3 rounded-lg" style={{ background: 'rgba(17,153,142,0.08)' }}>
                                    <p className="text-xs mb-1" style={{ color: '#11998e' }}>正确答案</p>
                                    <p className="text-sm font-medium" style={{ color: '#11998e' }}>
                                      {(() => {
                                        const ans = task?.correct_answer;
                                        if (typeof ans === 'string') {
                                          // Try to parse as JSON
                                          try {
                                            const parsed = JSON.parse(ans);
                                            if (Array.isArray(parsed)) return parsed.join(', ');
                                            if (parsed && typeof parsed === 'object') {
                                              if (parsed.value && Array.isArray(parsed.value)) return parsed.value.join(', ');
                                              if (parsed.blanks && Array.isArray(parsed.blanks)) return parsed.blanks.join(', ');
                                              return JSON.stringify(parsed);
                                            }
                                            return ans;
                                          } catch {
                                            return ans;
                                          }
                                        }
                                        if (Array.isArray(ans)) return ans.join(', ');
                                        if (ans && typeof ans === 'object') {
                                          const ansObj = ans as Record<string, unknown>;
                                          if (ansObj.value && Array.isArray(ansObj.value)) return (ansObj.value as string[]).join(', ');
                                          if (ansObj.blanks && Array.isArray(ansObj.blanks)) return (ansObj.blanks as string[]).join(', ');
                                          return JSON.stringify(ans);
                                        }
                                        return String(ans);
                                      })() as string}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Matching pairs - show question pairs and student/correct answers */}
                            {isMatching && pairs.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>题目配对</p>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  {pairs.map((pair: {left: string, right: string}, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center gap-2 p-2 rounded text-sm" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                      <span style={{ color: '#667eea', fontWeight: 500 }}>{pair.left}</span>
                                      <span style={{ color: '#999' }}>→</span>
                                      <span>{pair.right}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                  <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>学生答案</p>
                                  <p className="text-sm font-medium" style={{ color: sub.is_correct ? '#11998e' : '#dc2626' }}>{studentAnswer}</p>
                                </div>
                                {!sub.is_correct && correctAnswer && (
                                  <div className="p-3 rounded-lg mt-2" style={{ background: 'rgba(17,153,142,0.08)' }}>
                                    <p className="text-xs mb-1" style={{ color: '#11998e' }}>正确答案</p>
                                    <p className="text-sm font-medium" style={{ color: '#11998e' }}>{correctAnswer}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Other non-choice questions */}
                            {!isChoiceQuestion && !isTrueFalse && !isFillBlank && !isMatching && (
                              <div className="space-y-2">
                                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                  <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>学生答案</p>
                                  <p className="text-sm font-medium" style={{ color: sub.is_correct ? '#11998e' : '#dc2626' }}>{studentAnswer}</p>
                                </div>
                                {!sub.is_correct && correctAnswer && (
                                  <div className="p-3 rounded-lg" style={{ background: 'rgba(17,153,142,0.08)' }}>
                                    <p className="text-xs mb-1" style={{ color: '#11998e' }}>正确答案</p>
                                    <p className="text-sm font-medium" style={{ color: '#11998e' }}>{correctAnswer}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Student List View */
                  <div className="space-y-3">
                    {submissionData.students.map((student) => (
                      <div
                        key={student.student_id}
                        className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(24,36,58,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        onClick={() => setViewingStudentDetail(student)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                              background: student.correct_count === (selectedHistoryItem.task_count || 0)
                                ? 'linear-gradient(135deg, #11998e, #38ef7d)'
                                : 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: 'white'
                            }}>
                              {student.student_name.charAt(0)}
                            </div>
                            <span className="font-medium">{student.student_name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-2xl font-bold" style={{ color: student.correct_count === (selectedHistoryItem.task_count || 0) ? '#11998e' : '#dc2626' }}>
                                {student.correct_count}
                              </span>
                              <span className="text-sm" style={{ color: 'var(--muted)' }}>/{selectedHistoryItem.task_count || 0}</span>
                            </div>
                            <span className="text-sm" style={{ color: '#667eea' }}>→</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-center py-8" style={{ color: 'var(--muted)' }}>{t('teacherLive.noSubmissionData')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6" />
    </Layout>
  )
}
