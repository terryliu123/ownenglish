const params = new URLSearchParams(window.location.search);
const body = document.body;

const studentRouteMap = {
  join: "student.html",
  home: "student-home.html",
  live: "student-live.html",
  "live-submitted": "student-live-submitted.html",
  pack: "student-pack.html",
  practice: "student-practice.html",
  speaking: "student-speaking.html",
  report: "student-report.html",
  free: "student-free.html",
};

function showToast(node, message) {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.classList.add("is-visible");
  clearTimeout(node._timer);
  node._timer = setTimeout(() => {
    node.classList.remove("is-visible");
  }, 2200);
}

function withDeviceParam(fileName, device) {
  if (!fileName) {
    return "#";
  }

  return device === "tablet" ? `${fileName}?device=tablet` : fileName;
}

function initStudentPrototype() {
  const currentDevice = params.get("device") === "tablet" ? "tablet" : "phone";
  const currentScreen = body.dataset.studentScreen || "home";
  const currentFile = window.location.pathname.split("/").pop() || studentRouteMap.home;

  body.classList.toggle("student-device-phone", currentDevice === "phone");
  body.classList.toggle("student-device-tablet", currentDevice === "tablet");

  document.querySelectorAll("[data-device-toggle]").forEach((link) => {
    const device = link.dataset.deviceToggle === "tablet" ? "tablet" : "phone";
    link.href = withDeviceParam(currentFile, device);
    link.classList.toggle("is-active", device === currentDevice);
  });

  document.querySelectorAll("[data-screen-link]").forEach((link) => {
    const screen = link.dataset.screenLink;
    const target = studentRouteMap[screen] || studentRouteMap.home;
    link.href = withDeviceParam(target, currentDevice);
    link.classList.toggle("is-active", screen === currentScreen);
  });

  document.querySelectorAll("[data-student-link]").forEach((link) => {
    const target = studentRouteMap[link.dataset.studentLink] || link.getAttribute("href");
    link.href = withDeviceParam(target, currentDevice);
  });

  document.querySelectorAll(".answer-options").forEach((group) => {
    const choices = [...group.querySelectorAll(".answer-choice")];

    choices.forEach((choice) => {
      choice.addEventListener("click", () => {
        choices.forEach((item) => item.classList.remove("is-selected"));
        choice.classList.add("is-selected");
      });
    });
  });
}

function initTeacherLivePrototype() {
  const modal = document.querySelector("[data-live-modal]");
  const modalTitle = document.querySelector("[data-modal-title]");
  const modalBody = document.querySelector("[data-modal-body]");
  const liveQueue = document.querySelector("[data-live-queue]");
  const draftQueue = document.querySelector("[data-draft-queue]");
  const toast = document.getElementById("teacherLiveToast");
  const newDraftRow = document.querySelector("[data-new-draft-row]");

  if (!modal || !liveQueue || !draftQueue) {
    return;
  }

  function updateCounts() {
    const liveCount = liveQueue.querySelectorAll("[data-live-row]").length;
    const draftCount = [...draftQueue.querySelectorAll("[data-draft-row]")].filter((row) => !row.hidden).length;
    const liveCountNode = document.querySelector("[data-live-count]");
    const draftCountNode = document.querySelector("[data-draft-count]");

    if (liveCountNode) {
      liveCountNode.textContent = String(liveCount);
    }

    if (draftCountNode) {
      draftCountNode.textContent = String(draftCount);
    }
  }

  function setSelectedDraft(selectedRow) {
    document.querySelectorAll("[data-draft-row]").forEach((row) => {
      row.classList.toggle("is-selected", row === selectedRow);
    });
  }

  function openModal(templateId, title) {
    const template = document.getElementById(templateId);

    if (!template) {
      return;
    }

    modal.hidden = false;
    modalTitle.textContent = title || "任务详情";
    modalBody.innerHTML = template.innerHTML;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
  }

  function buildLiveRow(taskName, templateId) {
    const row = document.createElement("div");
    row.className = "queue-row is-live";
    row.dataset.liveRow = "";
    row.dataset.taskName = taskName;
    row.dataset.detailTemplate = templateId;
    row.innerHTML = `
      <div class="queue-row-main">
        <strong>${taskName}</strong>
        <span class="queue-state">排队中</span>
      </div>
      <div class="queue-actions">
        <button class="mini-action" type="button" data-modal-open="${templateId}" data-modal-title="${taskName}">详情</button>
        <button class="mini-action" type="button" data-live-action="pause">暂停</button>
        <button class="mini-action danger" type="button" data-live-action="delete">删除</button>
      </div>
    `;
    return row;
  }

  document.addEventListener("click", (event) => {
    const createTask = event.target.closest("[data-create-task]");
    const modalOpen = event.target.closest("[data-modal-open]");
    const modalClose = event.target.closest("[data-modal-close]");
    const saveDraft = event.target.closest("[data-save-draft]");
    const draftEdit = event.target.closest("[data-draft-edit]");
    const draftAction = event.target.closest("[data-draft-action]");
    const liveAction = event.target.closest("[data-live-action]");

    if (createTask) {
      if (newDraftRow) {
        newDraftRow.hidden = false;
        setSelectedDraft(newDraftRow);
        updateCounts();
        openModal(newDraftRow.dataset.editorTemplate, "创建课堂任务");
        showToast(toast, "已创建一个新的课堂任务草稿。");
      }
      return;
    }

    if (modalOpen) {
      openModal(modalOpen.dataset.modalOpen, modalOpen.dataset.modalTitle);
      return;
    }

    if (modalClose) {
      closeModal();
      return;
    }

    if (saveDraft) {
      showToast(toast, "当前任务草稿已保存到待发布队列。");
      return;
    }

    if (draftEdit) {
      const row = draftEdit.closest("[data-draft-row]");
      if (row) {
        setSelectedDraft(row);
        openModal(draftEdit.dataset.draftEdit, row.dataset.taskName);
      }
      return;
    }

    if (draftAction) {
      const row = draftAction.closest("[data-draft-row]");
      if (!row) {
        return;
      }

      if (draftAction.dataset.draftAction === "delete") {
        const wasSelected = row.classList.contains("is-selected");
        row.remove();
        updateCounts();

        if (wasSelected) {
          const fallback = draftQueue.querySelector("[data-draft-row]:not([hidden])");
          if (fallback) {
            setSelectedDraft(fallback);
          }
        }

        showToast(toast, "待发布任务已删除。");
      }

      if (draftAction.dataset.draftAction === "publish") {
        const taskName = row.dataset.taskName;
        const templateId = row.dataset.detailTemplate;
        const publishedRow = buildLiveRow(taskName, templateId);
        liveQueue.appendChild(publishedRow);

        const wasSelected = row.classList.contains("is-selected");
        row.remove();
        updateCounts();

        if (wasSelected) {
          const fallback = draftQueue.querySelector("[data-draft-row]:not([hidden])");
          if (fallback) {
            setSelectedDraft(fallback);
          }
        }

        showToast(toast, `已将“${taskName}”发布到实时队列。`);
      }
      return;
    }

    if (liveAction) {
      const row = liveAction.closest("[data-live-row]");
      if (!row) {
        return;
      }

      if (liveAction.dataset.liveAction === "pause") {
        const state = row.querySelector(".queue-state");
        const isPaused = row.classList.toggle("is-paused");
        liveAction.textContent = isPaused ? "恢复" : "暂停";
        if (state) {
          state.textContent = isPaused ? "已暂停" : "排队中";
        }
        showToast(toast, isPaused ? "任务已暂停。": "任务已恢复。");
      }

      if (liveAction.dataset.liveAction === "delete") {
        row.remove();
        updateCounts();
        showToast(toast, "实时队列中的任务已删除。");
      }
    }
  });

  if (modal.hidden === false) {
    closeModal();
  }

  const defaultSelected = draftQueue.querySelector(".is-selected");
  if (defaultSelected) {
    setSelectedDraft(defaultSelected);
  }

  updateCounts();
}

function initTeacherPacksPrototype() {
  const modal = document.querySelector("[data-pack-modal]");
  const modalTitle = document.querySelector("[data-pack-modal-title]");
  const modalBody = document.querySelector("[data-pack-modal-body]");
  const packList = document.querySelector("[data-pack-list]");
  const searchInput = document.querySelector("[data-pack-search]");
  const toast = document.getElementById("teacherPackToast");
  const newPackRow = document.querySelector("[data-new-pack-row]");

  if (!modal || !packList) {
    return;
  }

  function updatePackCount() {
    const count = [...packList.querySelectorAll("[data-pack-row]")].filter((row) => !row.hidden).length;
    const countNode = document.querySelector("[data-pack-count]");
    if (countNode) {
      countNode.textContent = String(count);
    }
  }

  function openPackModal(templateId, title) {
    const template = document.getElementById(templateId);
    if (!template) {
      return;
    }
    modal.hidden = false;
    modalTitle.textContent = title || "学习包编辑器";
    modalBody.innerHTML = template.innerHTML;
  }

  function closePackModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
  }

  function setActivePack(panelId, row) {
    document.querySelectorAll("[data-pack-row]").forEach((item) => {
      item.classList.toggle("is-selected", item === row);
    });

    document.querySelectorAll("[data-pack-view]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.packView === panelId);
    });
  }

  function applySearch() {
    const keyword = (searchInput?.value || "").trim().toLowerCase();
    document.querySelectorAll("[data-pack-row]").forEach((row) => {
      const name = (row.dataset.packName || "").toLowerCase();
      row.hidden = keyword ? !name.includes(keyword) : row === newPackRow ? row.hidden : false;
    });
    updatePackCount();
  }

  document.addEventListener("click", (event) => {
    const packModalOpen = event.target.closest("[data-pack-modal-open]");
    const packModalClose = event.target.closest("[data-pack-modal-close]");
    const packCreate = event.target.closest("[data-pack-create]");
    const packEdit = event.target.closest("[data-pack-edit]");
    const packCopy = event.target.closest("[data-pack-copy]");
    const packDisable = event.target.closest("[data-pack-disable]");
    const packDelete = event.target.closest("[data-pack-delete]");
    const packSelect = event.target.closest("[data-pack-select]");

    if (packCreate) {
      if (newPackRow) {
        newPackRow.hidden = false;
        setActivePack(newPackRow.dataset.packPanel, newPackRow);
        updatePackCount();
        openPackModal("pack-editor-new", "创建学习包");
        showToast(toast, "已创建一个新的学习包草稿。");
      }
      return;
    }

    if (packModalOpen) {
      openPackModal(packModalOpen.dataset.packModalOpen, packModalOpen.dataset.packModalTitle);
      return;
    }

    if (packModalClose) {
      closePackModal();
      return;
    }

    if (packEdit) {
      const row = packEdit.closest("[data-pack-row]");
      if (row) {
        setActivePack(row.dataset.packPanel, row);
      }
      openPackModal(packEdit.dataset.packEdit, row?.dataset.packName || "编辑学习包");
      return;
    }

    if (packCopy) {
      const row = packCopy.closest("[data-pack-row]");
      if (!row) {
        return;
      }
      const clone = row.cloneNode(true);
      const nameNode = clone.querySelector("[data-pack-select]");
      const baseName = row.dataset.packName || "学习包副本";
      const nextName = `${baseName} · 副本`;
      clone.dataset.packName = nextName;
      if (nameNode) {
        nameNode.textContent = nextName;
      }
      const subline = clone.querySelector(".queue-subline");
      if (subline && !subline.textContent.includes("副本")) {
        subline.textContent = `${subline.textContent} · 副本`;
      }
      clone.classList.remove("is-selected");
      packList.appendChild(clone);
      updatePackCount();
      showToast(toast, "学习包已复制。");
      return;
    }

    if (packDisable) {
      const row = packDisable.closest("[data-pack-row]");
      if (!row) {
        return;
      }
      const disabled = row.classList.toggle("is-disabled");
      packDisable.textContent = disabled ? "启用" : "停用";
      showToast(toast, disabled ? "学习包已停用。" : "学习包已启用。");
      return;
    }

    if (packDelete) {
      const row = packDelete.closest("[data-pack-row]");
      if (!row) {
        return;
      }
      const wasSelected = row.classList.contains("is-selected");
      row.remove();
      updatePackCount();
      if (wasSelected) {
        const fallback = packList.querySelector("[data-pack-row]:not([hidden])");
        if (fallback) {
          setActivePack(fallback.dataset.packPanel, fallback);
        }
      }
      showToast(toast, "学习包已删除。");
      return;
    }

    if (packSelect) {
      const row = packSelect.closest("[data-pack-row]");
      if (row) {
        setActivePack(packSelect.dataset.packSelect, row);
      }
    }
  });

  searchInput?.addEventListener("input", applySearch);

  const defaultRow = packList.querySelector(".is-selected");
  if (defaultRow) {
    setActivePack(defaultRow.dataset.packPanel, defaultRow);
  }

  updatePackCount();
}

if (body.classList.contains("student-page") || body.dataset.studentScreen) {
  initStudentPrototype();
}

if (body.classList.contains("teacher-live-page")) {
  initTeacherLivePrototype();
}

if (body.classList.contains("teacher-packs-page")) {
  initTeacherPacksPrototype();
}
