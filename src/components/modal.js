// Modal utility
function openModal(title, bodyHTML, onClose) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" id="modalCloseBtn">&times;</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
  `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);

    const closeModal = () => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        if (onClose) onClose();
    };

    modal.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    return { modal, closeModal };
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
}

export { openModal, closeModal };
