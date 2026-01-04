class TypewrittenText {
    constructor() {
        this.editor = document.getElementById('editor');
        this.titleInput = document.getElementById('titleInput');
        this.shareBtn = document.getElementById('shareBtn');
        this.linkContainer = document.getElementById('linkContainer');
        this.generatedLink = document.getElementById('generatedLink');
        this.copyBtn = document.getElementById('copyBtn');
        this.toast = document.getElementById('toast');
        
        this.autoSaveInterval = 3000; // 3 secondi
        this.storageKey = 'typewritten_draft';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromStorage();
        this.checkUrlHash();
        this.startAutoSave();
        this.updateShareButton();
    }
    
    setupEventListeners() {
        // Salvataggio in tempo reale
        this.editor.addEventListener('input', () => {
            this.updateShareButton();
            this.saveToStorage();
        });
        
        this.titleInput.addEventListener('input', () => {
            this.updateShareButton();
            this.saveToStorage();
        });
        
        // Toolbar
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = e.target.dataset.command;
                document.execCommand(command, false, null);
                this.editor.focus();
            });
        });
        
        // Condivisione
        this.shareBtn.addEventListener('click', () => this.generateLink());
        this.copyBtn.addEventListener('click', () => this.copyLink());
        
        // Prevenire incollare con formattazione
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }
    
    saveToStorage() {
        const data = {
            title: this.titleInput.value,
            content: this.editor.innerHTML,
            timestamp: Date.now()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.titleInput.value = data.title || '';
                this.editor.innerHTML = data.content || '';
            } catch (e) {
                console.error('Errore nel caricamento:', e);
            }
        }
    }
    
    startAutoSave() {
        setInterval(() => {
            this.saveToStorage();
        }, this.autoSaveInterval);
    }
    
    updateShareButton() {
        const hasContent = this.editor.textContent.trim().length > 0;
        this.shareBtn.disabled = !hasContent;
    }
    
    generateLink() {
        const title = this.titleInput.value.trim();
        const content = this.editor.innerHTML;
        
        // Creare un ID unico basato sul contenuto e timestamp
        const id = btoa(encodeURIComponent(JSON.stringify({
            t: title,
            c: content,
            d: Date.now()
        }))).replace(/[+/=]/g, '').substring(0, 20);
        
        // Costruire l'URL (simulato)
        const baseUrl = window.location.origin + window.location.pathname;
        const url = `${baseUrl}#${id}`;
        
        // Salvare i dati con l'ID come chiave
        const data = {
            title: title,
            content: content,
            timestamp: Date.now()
        };
        localStorage.setItem(`post_${id}`, JSON.stringify(data));
        
        // Mostrare il link
        this.generatedLink.value = url;
        this.linkContainer.classList.remove('hidden');
        
        // Scorrere verso il link
        this.linkContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    checkUrlHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const data = localStorage.getItem(`post_${hash}`);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    this.titleInput.value = parsed.title || '';
                    this.editor.innerHTML = parsed.content || '';
                    this.showToast('Documento caricato dal link');
                } catch (e) {
                    console.error('Errore nel caricamento del link:', e);
                    this.showToast('Link non valido', true);
                }
            }
        }
    }
    
    copyLink() {
        this.generatedLink.select();
        this.generatedLink.setSelectionRange(0, 99999); // Per mobile
        
        try {
            navigator.clipboard.writeText(this.generatedLink.value);
            this.showToast('Link copiato negli appunti!');
        } catch (err) {
            // Fallback per browser più vecchi
            document.execCommand('copy');
            this.showToast('Link copiato!');
        }
    }
    
    showToast(message, isError = false) {
        this.toast.textContent = message;
        this.toast.style.background = isError ? '#d32f2f' : '#000';
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
    
    clearEditor() {
        this.titleInput.value = '';
        this.editor.innerHTML = '';
        localStorage.removeItem(this.storageKey);
        this.updateShareButton();
        this.showToast('Documento cancellato');
    }
}

// Inizializzare l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    new TypewrittenText();
});
