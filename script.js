class TypewrittenText {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeApp();
    }
    
    initializeElements() {
        this.editor = document.getElementById('editor');
        this.titleInput = document.getElementById('titleInput');
        this.shareBtn = document.getElementById('shareBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveDraftBtn = document.getElementById('saveDraftBtn');
        this.linkContainer = document.getElementById('linkContainer');
        this.generatedLink = document.getElementById('generatedLink');
        this.copyBtn = document.getElementById('copyBtn');
        this.linkViews = document.getElementById('linkViews');
        this.charCount = document.getElementById('charCount');
        this.wordCount = document.getElementById('wordCount');
        this.viewCount = document.getElementById('viewCount');
        this.toast = document.getElementById('toast');
        
        this.currentDocumentId = null;
        this.isViewingShared = false;
        this.storageKey = 'typewritten_current_draft';
        this.draftsKey = 'typewritten_drafts';
        this.viewsKey = 'typewritten_views';
        
        // Prevent F5 from clearing by saving before unload
        window.addEventListener('beforeunload', () => {
            if (!this.isViewingShared) {
                this.saveCurrentDraft();
            }
        });
    }
    
    setupEventListeners() {
        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateCounters();
            this.updateShareButton();
            this.autoSaveDraft();
        });
        
        this.titleInput.addEventListener('input', () => {
            this.updateShareButton();
            this.autoSaveDraft();
        });
        
        // Toolbar events
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = e.target.closest('.tool-btn').dataset.command;
                const value = e.target.closest('.tool-btn').dataset.value;
                
                if (value) {
                    document.execCommand(command, false, value);
                } else {
                    document.execCommand(command, false, null);
                }
                this.editor.focus();
                this.updateCounters();
            });
        });
        
        // Button events
        this.shareBtn.addEventListener('click', () => this.createShareableLink());
        this.clearBtn.addEventListener('click', () => this.clearDocument());
        this.saveDraftBtn.addEventListener('click', () => this.saveCurrentDraft());
        this.copyBtn.addEventListener('click', () => this.copyLinkToClipboard());
        
        // Prevent paste with formatting
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            this.updateCounters();
        });
        
        // Handle URL hash changes
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        // Listen for F5/Ctrl+R to show warning
        window.addEventListener('keydown', (e) => {
            if ((e.key === 'F5') || (e.ctrlKey && e.key === 'r')) {
                if (!this.isViewingShared) {
                    this.saveCurrentDraft();
                    this.showToast('Draft saved before refresh', false, 2000);
                }
            }
        });
    }
    
    initializeApp() {
        this.handleHashChange();
        if (!this.isViewingShared) {
            this.loadCurrentDraft();
        }
        this.updateCounters();
    }
    
    handleHashChange() {
        const hash = window.location.hash.substring(1);
        
        if (hash && hash.length > 10) {
            this.currentDocumentId = hash;
            this.loadSharedDocument(hash);
            this.isViewingShared = true;
        } else {
            this.isViewingShared = false;
            this.enableEditing();
            this.viewCount.classList.add('hidden');
        }
    }
    
    updateCounters() {
        const text = this.editor.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        this.charCount.querySelector('.stat-value').textContent = `${chars} characters`;
        this.wordCount.querySelector('.stat-value').textContent = `${words} words`;
    }
    
    updateShareButton() {
        const hasContent = this.editor.textContent.trim().length > 0;
        this.shareBtn.disabled = !hasContent;
    }
    
    autoSaveDraft() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (!this.isViewingShared) {
                this.saveCurrentDraft();
            }
        }, 1000);
    }
    
    saveCurrentDraft() {
        const draft = {
            title: this.titleInput.value,
            content: this.editor.innerHTML,
            timestamp: Date.now(),
            id: this.currentDocumentId || 'draft_' + Date.now()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(draft));
        
        // Save to drafts history
        const drafts = JSON.parse(localStorage.getItem(this.draftsKey) || '[]');
        drafts.unshift({
            id: draft.id,
            title: draft.title || 'Untitled',
            timestamp: draft.timestamp,
            preview: draft.content.substring(0, 100)
        });
        
        // Keep only last 10 drafts
        localStorage.setItem(this.draftsKey, JSON.stringify(drafts.slice(0, 10)));
        
        return draft.id;
    }
    
    loadCurrentDraft() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                this.titleInput.value = draft.title || '';
                this.editor.innerHTML = draft.content || '';
                this.updateCounters();
                this.showToast('Draft loaded', false, 2000);
            } catch (e) {
                console.error('Error loading draft:', e);
            }
        }
    }
    
    loadSharedDocument(id) {
        const data = localStorage.getItem(`post_${id}`);
        if (!data) {
            this.showToast('Document not found', true);
            this.clearDocument();
            return;
        }
        
        try {
            const document = JSON.parse(data);
            
            // Load content
            this.titleInput.value = document.title || '';
            this.editor.innerHTML = document.content || '';
            
            // Update view count
            document.views = (document.views || 0) + 1;
            localStorage.setItem(`post_${id}`, JSON.stringify(document));
            
            // Update counters
            this.updateCounters();
            this.updateViewCounter(document.views);
            
            // Disable editing for shared documents
            this.disableEditing();
            
            this.showToast('Shared document loaded', false, 2000);
            
        } catch (e) {
            console.error('Error loading document:', e);
            this.showToast('Error loading document', true);
        }
    }
    
    updateViewCounter(views) {
        this.viewCount.querySelector('.stat-value').textContent = `${views} views`;
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
        this.clearBtn.textContent = 'Back to Editor';
        this.clearBtn.querySelector('.btn-icon').textContent = '✏️';
    }
    
    enableEditing() {
        this.editor.setAttribute('contenteditable', 'true');
        this.editor.classList.remove('view-mode');
        this.titleInput.disabled = false;
        this.shareBtn.disabled = false;
        this.clearBtn.textContent = 'Clear Document';
        this.clearBtn.querySelector('.btn-icon').textContent = '🗑️';
    }
    
    createShareableLink() {
        const title = this.titleInput.value.trim();
        const content = this.editor.innerHTML;
        
        // Generate unique ID
        const id = this.generateDocumentId();
        
        // Prepare document data
        const document = {
            title: title,
            content: content,
            timestamp: Date.now(),
            views: 0
        };
        
        // Store document
        localStorage.setItem(`post_${id}`, JSON.stringify(document));
        
        // Build URL
        const baseUrl = window.location.origin + window.location.pathname;
        const url = `${baseUrl}#${id}`;
        
        // Display link
        this.generatedLink.value = url;
        this.linkViews.textContent = '0';
        this.linkContainer.classList.remove('hidden');
        
        // Animate the link container
        this.linkContainer.style.animation = 'none';
        setTimeout(() => {
            this.linkContainer.style.animation = 'fadeIn 0.3s ease';
        }, 10);
        
        // Scroll to link container
        this.linkContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Update view counter for current session
        this.currentDocumentId = id;
        this.updateViewCounter(0);
        
        this.showToast('✅ Shareable link created!', false, 3000);
    }
    
    generateDocumentId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 12; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id + Date.now().toString(36);
    }
    
    copyLinkToClipboard() {
        this.generatedLink.select();
        this.generatedLink.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(this.generatedLink.value)
                .then(() => {
                    this.copyBtn.innerHTML = '<span class="btn-icon">✅</span> Copied!';
                    setTimeout(() => {
                        this.copyBtn.innerHTML = '<span class="btn-icon">📋</span> Copy Link';
                    }, 2000);
                    this.showToast('📋 Link copied to clipboard!', false, 2000);
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
        this.showToast('📋 Link copied!', false, 2000);
    }
    
    clearDocument() {
        if (this.isViewingShared) {
            // If viewing shared document, clear hash and return to editor
            window.location.hash = '';
            this.isViewingShared = false;
            this.enableEditing();
            this.viewCount.classList.add('hidden');
            this.loadCurrentDraft();
            this.showToast('Returned to editor', false, 2000);
            return;
        }
        
        if (confirm('Clear current document? Your draft will be saved.')) {
            this.titleInput.value = '';
            this.editor.innerHTML = '';
            this.linkContainer.classList.add('hidden');
            this.updateCounters();
            this.updateShareButton();
            
            // Save empty draft
            this.saveCurrentDraft();
            
            this.showToast('Document cleared', false, 2000);
        }
    }
    
    showToast(message, isError = false, duration = 3000) {
        this.toast.textContent = message;
        this.toast.style.background = isError ? '#d32f2f' : '#000';
        this.toast.classList.add('show');
        
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TypewrittenText();
    
    // Handle initial load
    setTimeout(() => {
        app.updateCounters();
    }, 100);
    
    // Prevent accidental refresh loss
    window.addEventListener('beforeunload', (e) => {
        if (!app.isViewingShared && app.editor.textContent.trim().length > 0) {
            app.saveCurrentDraft();
        }
    });
});
