document.addEventListener('DOMContentLoaded', () => {
  const chipGroups = document.querySelectorAll('[data-chip-group]');
  chipGroups.forEach((group) => {
    const chips = group.querySelectorAll('[data-chip]');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((item) => item.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  const outlineItems = document.querySelectorAll('[data-question-card]');
  const editorPanels = document.querySelectorAll('[data-editor-panel]');
  const previewTitle = document.querySelector('[data-preview-title]');
  const previewType = document.querySelector('[data-preview-type]');

  const activateQuestion = (questionId) => {
    outlineItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.questionCard === questionId);
    });
    editorPanels.forEach((panel) => {
      panel.hidden = panel.dataset.editorPanel !== questionId;
    });

    const current = document.querySelector(`[data-question-card="${questionId}"]`);
    if (current && previewTitle && previewType) {
      previewTitle.textContent = current.dataset.previewTitle || '当前题预览';
      previewType.textContent = current.dataset.previewType || '课堂互动题';
    }
  };

  outlineItems.forEach((item) => {
    item.addEventListener('click', () => activateQuestion(item.dataset.questionCard));
  });

  const defaultQuestion = document.querySelector('[data-question-card].active');
  if (defaultQuestion) {
    activateQuestion(defaultQuestion.dataset.questionCard);
  }

  const typeSwitchers = document.querySelectorAll('[data-type-switch]');
  typeSwitchers.forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-chip-group]');
      if (!group) return;
      group.querySelectorAll('[data-chip]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
});
