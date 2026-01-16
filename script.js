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
        this.previewBtn = document.getElementById('previewBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.htmlBtn = document.getElementById('htmlBtn');
        this.linkContainer = document.getElementById('linkContainer');
        this.generatedLink = document.getElementById('generatedLink');
        this.copyBtn = document.getElementById('copyBtn');
        this.linkViews = document.getElementById('linkViews');
        this.charValue = document.getElementById('charValue');
        this.wordValue = document.getElementById('wordValue');
        this.viewValue = document.getElementById('viewValue');
        this.viewCount = document.getElementById('viewCount');
        this.toast = document.getElementById('toast');
        
        // Modal elements
        this.htmlModal = document.getElementById('htmlModal');
        this.previewModal = document.getElementById('previewModal');
        this.htmlInput = document.getElementById('htmlInput');
        this.insertHtmlBtn = document.getElementById('insertHtml');
        this.cancelHtmlBtn = document.getElementById('cancelHtml');
        this.closeModalBtn = document.getElementById('closeModal');
        this.closePreviewBtn = document.getElementById('closePreview');
        this.previewContent = document.getElementById('previewContent');
        
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
        
        // Toolbar events (regular formatting)
        document.querySelectorAll('.tool-btn[data-command]:not(#htmlBtn)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = e.currentTarget.dataset.command;
                document.execCommand(command, false, null);
                this.editor.focus();
                this.autoSave();
            });
        });
        
        // HTML button
        this.htmlBtn.addEventListener('click', () => this.openHtmlModal());
        
        // Button events
        this.shareBtn.addEventListener('click', () => this.createLink());
        this.previewBtn.addEventListener('click', () => this.showPreview());
        this.clearBtn.addEventListener('click', () => this.handleClear());
        this.copyBtn.addEventListener('click', () => this.copyLink());
        
        // Modal events
        this.insertHtmlBtn.addEventListener('click', () => this.insertHtmlCode());
        this.cancelHtmlBtn.addEventListener('click', () => this.closeHtmlModal());
        this.closeModalBtn.addEventListener('click', () => this.closeHtmlModal());
        this.closePreviewBtn.addEventListener('click', () => this.closePreviewModal());
        
        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const example = e.currentTarget.dataset.example;
                this.insertExample(example);
            });
        });
        
        // Close modals on outside click
        this.htmlModal.addEventListener('click', (e) => {
            if (e.target === this.htmlModal) this.closeHtmlModal();
        });
        
        this.previewModal.addEventListener('click', (e) => {
            if (e.target === this.previewModal) this.closePreviewModal();
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
                this.refreshPage();
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                if (!this.htmlModal.classList.contains('hidden')) {
                    this.closeHtmlModal();
                }
                if (!this.previewModal.classList.contains('hidden')) {
                    this.closePreviewModal();
                }
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
        this.previewBtn.disabled = false;
        this.clearBtn.textContent = 'New document';
    }
    
    enableEditing() {
        this.editor.setAttribute('contenteditable', 'true');
        this.editor.classList.remove('view-mode');
        this.titleInput.disabled = false;
        this.shareBtn.disabled = false;
        this.previewBtn.disabled = false;
        this.clearBtn.textContent = 'Clear';
        this.viewCount.classList.add('hidden');
    }
    
    openHtmlModal() {
        this.htmlModal.classList.remove('hidden');
        this.htmlInput.focus();
        this.htmlInput.select();
    }
    
    closeHtmlModal() {
        this.htmlModal.classList.add('hidden');
        this.htmlInput.value = '<strong>Your HTML content here</strong>';
        this.editor.focus();
    }
    
    closePreviewModal() {
        this.previewModal.classList.add('hidden');
        this.editor.focus();
    }
    
    insertExample(example) {
        let html = '';
        
        switch(example) {
            case 'bold':
                html = '<strong>Bold text</strong>';
                break;
            case 'italic':
                html = '<em>Italic text</em>';
                break;
            case 'link':
                html = '<a href="https://example.com" target="_blank">Example Link</a>';
                break;
            case 'code':
                html = '<code>console.log("Hello World");</code>';
                break;
            case 'image':
                html = '<img src="https://via.placeholder.com/150" alt="Placeholder Image" style="max-width:100%;height:auto;">';
                break;
            case 'line':
                html = '<hr style="border:1px solid #ddd;margin:20px 0;">';
                break;
        }
        
        this.htmlInput.value = html;
        this.htmlInput.focus();
    }
    
    insertHtmlCode() {
        const html = this.htmlInput.value.trim();
        
        if (!html) {
            this.showToast('Please enter some HTML', true);
            return;
        }
        
        // Sanitize HTML
        const sanitizedHtml = this.sanitizeHtml(html);
        
        // Get current selection
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Delete any selected text
            range.deleteContents();
            
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sanitizedHtml;
            
            // Insert the nodes
            while (tempDiv.firstChild) {
                range.insertNode(tempDiv.firstChild);
            }
            
            // Move cursor to end of inserted content
            range.collapse(false);
            
            // Update selection
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no selection, insert at the end
            const range = document.createRange();
            range.selectNodeContents(this.editor);
            range.collapse(false);
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sanitizedHtml;
            
            while (tempDiv.firstChild) {
                range.insertNode(tempDiv.firstChild);
            }
            
            // Move cursor to end
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        
        this.closeHtmlModal();
        this.updateCounters();
        this.autoSave();
        this.showToast('HTML inserted');
    }
    
    sanitizeHtml(html) {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove script tags
        const scripts = tempDiv.getElementsByTagName('script');
        while (scripts.length > 0) {
            scripts[0].parentNode.removeChild(scripts[0]);
        }
        
        // Remove event handlers and dangerous attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(element => {
            // Remove all on* attributes
            for (let attr of element.attributes) {
                if (attr.name.startsWith('on')) {
                    element.removeAttribute(attr.name);
                }
            }
            
            // Remove javascript: from href
            if (element.hasAttribute('href')) {
                const href = element.getAttribute('href');
                if (href && href.toLowerCase().startsWith('javascript:')) {
                    element.removeAttribute('href');
                }
            }
        });
        
        return tempDiv.innerHTML;
    }
    
    showPreview() {
        // Show preview with the HTML content
        this.previewContent.innerHTML = this.editor.innerHTML;
        this.previewModal.classList.remove('hidden');
    }
    
    refreshPage() {
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
