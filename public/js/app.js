/**
 * BryanAI - Frontend JavaScript
 * Funções utilitárias e interações
 */

// Utilitários
const BryanAI = {
    // Mostrar notificação toast
    toast(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Confirmar ação
    async confirm(message) {
        return new Promise((resolve) => {
            const confirmed = window.confirm(message);
            resolve(confirmed);
        });
    },

    // Fazer requisição API
    async api(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(`/api${endpoint}`, {
            ...defaultOptions,
            ...options
        });

        return response.json();
    },

    // Formatar data
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // Copiar para clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.toast('Copiado para a área de transferência!', 'success');
        } catch (err) {
            this.toast('Erro ao copiar', 'error');
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Parse query parameters for messages
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('success')) {
        BryanAI.toast(urlParams.get('success'), 'success');
        // Remove from URL
        window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (urlParams.has('error')) {
        BryanAI.toast(urlParams.get('error'), 'error');
        window.history.replaceState({}, '', window.location.pathname);
    }

    // Confirm delete forms
    document.querySelectorAll('form[data-confirm]').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = form.dataset.confirm || 'Tem certeza?';
            if (await BryanAI.confirm(message)) {
                form.submit();
            }
        });
    });

    // Auto-resize textareas
    document.querySelectorAll('textarea[data-autoresize]').forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
});

// Export for use in other scripts
window.BryanAI = BryanAI;
