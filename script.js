class Typewritten {
    constructor() {
        this.initElements();
        this.setupEventListeners();
        this.initialize();
    }
    
    initElements() {
        this.editor = document.getElementById('editor');
        this.titleInput = document.getElementById('titleInput');
        this.shareBtn = document.getElementById('shareBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.linkContainer = document.getElementById('linkContainer');
        this.generatedLink = document.getElementById('generatedLink');
        this.copyBtn = document.getElementById('copyBtn');
        this.linkViews = document.getElementById('linkViews');
        this.charValue = document.getElementById('charValue');
        this.wordValue = document.getElementById('wordValue');
        this.viewValue = document.getElementById('viewValue');
        this.viewCount = document.getElementById('viewCount');
        this.toast = document.getElementById('toast');
        
        this.currentDocumentId = null;
        this.isViewing = false;
        this.storageKey = 'typewritten_draft';
        this.autoSaveDelay = 1000;
        this.autoSaveTimer = null;
    }
    
    setupEventListeners() {
        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateCounters();
            this.updateShareButton();
            this.autoSave();
        });
        
        this.titleInput.addEventListener('input', () => {
            this.updateShareButton();
            this.autoSave();
        });
        
        // Toolbar events
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = e.currentTarget.dataset.command;
                document.execCommand(command, false, null);
                this.editor.focus();
                this.autoSave();
            });
        });
        
        // Button events
        this.shareBtn.addEventListener('click', () => this.createLink());
        this.refreshBtn.addEventListener('click', () => this.handleRefresh());
        this.clearBtn.addEventListener('click', () => this.handleClear());
        this.copyBtn.addEventListener('click', () => this.copyLink());
        
        // Paste handler
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            this.updateCounters();
            this.autoSave();
        });
        
        // Handle URL hash changes
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        // Auto-save on page unload
        window.addEventListener('beforeunload', () => {
            if (!this.isViewing) {
                this.saveDraft();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S / Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDraft();
                this.showToast('Draft saved');
            }
            // F5 to refresh
            if (e.key === 'F5') {
                e.preventDefault();
                this.handleRefresh();
            }
        });
    }
    
    initialize() {
        // Handle initial hash
        this.handleHashChange();
        
        // Load draft if not viewing shared document
        if (!this.isViewing) {
            this.loadDraft();
        }
        
        // Update initial counters
        this.updateCounters();
        this.updateShareButton();
    }
    
    handleHashChange() {
        const hash = window.location.hash.substring(1);
        
        if (hash && hash.length > 10) {
            this.currentDocumentId = hash;
            this.loadSharedDocument(hash);
            this.isViewing = true;
        } else {
            this.isViewing = false;
            this.enableEditing();
        }
    }
    
    updateCounters() {
        const text = this.editor.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        this.charValue.textContent = chars;
        this.wordValue.textContent = words;
    }
    
    updateShareButton() {
        const hasContent = this.editor.textContent.trim().length > 0;
        this.shareBtn.disabled = !hasContent;
    }
    
    autoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (!this.isViewing) {
                this.saveDraft();
            }
        }, this.autoSaveDelay);
    }
    
    saveDraft() {
        const draft = {
            title: this.titleInput.value,
            content: this.editor.innerHTML,
            timestamp: Date.now()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(draft));
        return true;
    }
    
    loadDraft() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                this.titleInput.value = draft.title || '';
                this.editor.innerHTML = draft.content || '';
                this.updateCounters();
            } catch (e) {
                console.error('Error loading draft:', e);
            }
        }
    }
    
    createLink() {
        const title = this.titleInput.value.trim();
        const content = this.editor.innerHTML;
        
        // Generate ID
        const id = this.generateId();
        
        // Prepare document
        const document = {
            title: title,
            content: content,
            timestamp: Date.now(),
            views: 0
        };
        
        // Save document
        localStorage.setItem(`doc_${id}`, JSON.stringify(document));
        
        // Build URL
        const baseUrl = window.location.origin + window.location.pathname;
        const url = `${baseUrl}#${id}`;
        
        // Display link
        this.generatedLink.value = url;
        this.linkViews.textContent = '0';
        this.linkContainer.classList.remove('hidden');
        
        // Scroll to link
        setTimeout(() => {
            this.linkContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        // Update current document
        this.currentDocumentId = id;
        this.updateViewCounter(0);
        
        this.showToast('Link created');
    }
    
    generateId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 12; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }
    
    loadSharedDocument(id) {
        const data = localStorage.getItem(`doc_${id}`);
        if (!data) {
            this.showToast('Document not found', true);
            return;
        }
        
        try {
            const document = JSON.parse(data);
            
            // Update view count
            document.views = (document.views || 0) + 1;
            localStorage.setItem(`doc_${id}`, JSON.stringify(document));
            
            // Load content
            this.titleInput.value = document.title || '';
            this.editor.innerHTML = document.content || '';
            
            // Update counters
            this.updateCounters();
            this.updateViewCounter(document.views);
            
            // Switch to view mode
            this.disableEditing();
            
            this.showToast('Loaded shared document');
            
        } catch (e) {
            console.error('Error loading document:', e);
            this.showToast('Error loading document', true);
        }
    }
    
    updateViewCounter(views) {
        this.viewValue.textContent = views;
        this.viewCount.classList.remove('hidden');
        if (this.linkViews) {
            this.linkViews.textContent = views;
        }
    }
    
    disableEditing() {
        this.editor.setAttribute('contenteditable', 'false');
        this.editor.classList.add('view-mode');
        this.titleInput.disabled = true;
        this.shareBtn.disabled = true;
        this.clearBtn.textContent = 'New document';
    }
    
    enableEditing() {
        this.editor.setAttribute('contenteditable', 'true');
        this.editor.classList.remove('view-mode');
        this.titleInput.disabled = false;
        this.shareBtn.disabled = false;
        this.clearBtn.textContent = 'Clear';
        this.viewCount.classList.add('hidden');
    }
    
    handleRefresh() {
        // Save current draft before refresh
        if (!this.isViewing) {
            this.saveDraft();
        }
        
        // Show toast message
        this.showToast('Refreshing...');
        
        // Refresh after short delay to show toast
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }
    
    handleClear() {
        if (this.isViewing) {
            // Return to editor from view mode
            window.location.hash = '';
            this.isViewing = false;
            this.enableEditing();
            this.loadDraft();
            this.showToast('Returned to editor');
        } else {
            // Clear current document
            if (this.editor.textContent.trim() || this.titleInput.value.trim()) {
                if (confirm('Clear current document?')) {
                    this.titleInput.value = '';
                    this.editor.innerHTML = '';
                    this.linkContainer.classList.add('hidden');
                    localStorage.removeItem(this.storageKey);
                    this.updateCounters();
                    this.updateShareButton();
                    this.showToast('Document cleared');
                }
            }
        }
    }
    
    copyLink() {
        this.generatedLink.select();
        this.generatedLink.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(this.generatedLink.value)
                .then(() => {
                    const originalText = this.copyBtn.textContent;
                    this.copyBtn.textContent = 'Copied';
                    setTimeout(() => {
                        this.copyBtn.textContent = originalText;
                    }, 2000);
                    this.showToast('Link copied');
                })
                .catch(() => {
                    this.fallbackCopy();
                });
        } catch (err) {
            this.fallbackCopy();
        }
    }
    
    fallbackCopy() {
        document.execCommand('copy');
        this.showToast('Link copied');
    }
    
    showToast(message, isError = false, duration = 2000) {
        this.toast.textContent = message;
        this.toast.style.background = isError ? '#cc0000' : '#000';
        this.toast.classList.add('show');
        
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new Typewritten();
    
    // Also handle hash on initial load
    if (window.location.hash) {
        setTimeout(() => app.handleHashChange(), 100);
    }
});
