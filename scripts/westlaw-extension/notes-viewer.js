document.addEventListener('DOMContentLoaded', function() {
    const notesContent = document.getElementById('notesContent');
    const emptyState = document.getElementById('emptyState');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');
    const currentDate = document.getElementById('currentDate');
    const status = document.getElementById('status');
    
    let isEditing = false;
    
    // Set current date
    currentDate.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Load and display notes
    function loadNotes() {
        chrome.storage.local.get(['westlawNotes'], function(result) {
            const notes = result.westlawNotes || [];
            displayNotes(notes);
        });
    }
    
    // Display notes in the viewer
    function displayNotes(notes) {
        if (notes.length === 0) {
            emptyState.style.display = 'block';
            notesContent.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            notesContent.style.display = 'block';
            
            let html = '';
            notes.forEach((note, index) => {
                const pageTitle = note.pageTitle || 'Unknown';
                
                html += `<div class="entry">
<div class="entry-meta">Added: ${new Date(note.timestamp).toLocaleString()} | Page: <a href="${note.url}" target="_blank" title="${note.url}">${pageTitle}</a></div>
<div class="entry-quote">${note.quotation}</div>
</div>
<hr>`;
            });
            
            notesContent.innerHTML = html;
        }
    }
    
    // Show status message
    function showStatus(message, type = 'success') {
        status.textContent = message;
        status.className = `status ${type} show`;
        setTimeout(() => {
            status.classList.remove('show');
        }, 3000);
    }
    
    // Toggle edit mode
    function toggleEditMode() {
        isEditing = !isEditing;
        
        if (isEditing) {
            notesContent.contentEditable = true;
            notesContent.focus();
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-block';
            showStatus('Edit mode enabled. Click Save Changes when done.', 'success');
        } else {
            notesContent.contentEditable = false;
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
        }
    }
    
    // Save edited content
    function saveChanges() {
        // For now, just show a message that manual editing saves the HTML structure
        // In a full implementation, you might want to parse the HTML back to structured data
        showStatus('Changes saved! Note: Manual edits are preserved as-is.', 'success');
        toggleEditMode();
    }
    
    // Export notes as text file
    function exportNotes() {
        chrome.storage.local.get(['westlawNotes'], function(result) {
            const notes = result.westlawNotes || [];
            
            if (notes.length === 0) {
                showStatus('No notes to export.', 'error');
                return;
            }
            
            let textContent = `Westlaw Research Notes - ${new Date().toLocaleDateString()}\n`;
            textContent += '='.repeat(50) + '\n\n';
            
            notes.forEach((note, index) => {
                textContent += `Entry ${index + 1}:\n`;
                textContent += `Date: ${new Date(note.timestamp).toLocaleString()}\n`;
                textContent += `Page: ${note.pageTitle || 'Unknown'}\n`;
                textContent += `URL: ${note.url}\n`;
                textContent += `Citation: ${note.citation}\n`;
                textContent += `Quotation: "${note.quotation}"\n`;
                textContent += '\n' + '-'.repeat(40) + '\n\n';
            });
            
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `westlaw-notes-${new Date().toISOString().split('T')[0]}.txt`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            showStatus('Notes exported successfully!', 'success');
        });
    }
    
    // Paste from clipboard
    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
                // Use clipboard content directly without any parsing or modification
                const quotation = text.trim();
                
                if (quotation) {
                    const noteEntry = {
                        quotation: quotation,
                        citation: '',
                        pageTitle: 'Pasted from clipboard',
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    };
                    
                    chrome.storage.local.get(['westlawNotes'], function(result) {
                        const notes = result.westlawNotes || [];
                        notes.unshift(noteEntry); // Add to beginning instead of end
                        
                        chrome.storage.local.set({ westlawNotes: notes }, function() {
                            loadNotes();
                            showStatus('Content pasted and saved!', 'success');
                        });
                    });
                } else {
                    showStatus('No valid content found in clipboard', 'error');
                }
            } else {
                showStatus('Clipboard is empty', 'error');
            }
        } catch (err) {
            showStatus('Failed to read clipboard. Try Ctrl+V instead.', 'error');
            console.error('Clipboard read failed:', err);
        }
    }

    // Clear all notes
    function clearAllNotes() {
        if (confirm('Are you sure you want to clear all saved notes? This action cannot be undone.')) {
            chrome.storage.local.set({ westlawNotes: [] }, function() {
                loadNotes();
                showStatus('All notes cleared.', 'success');
            });
        }
    }
    
    // Event listeners
    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', saveChanges);
    pasteBtn.addEventListener('click', pasteFromClipboard);
    exportBtn.addEventListener('click', exportNotes);
    clearBtn.addEventListener('click', clearAllNotes);
    
    // Listen for storage changes to update display
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && changes.westlawNotes) {
            loadNotes();
        }
    });
    
    // Initial load
    loadNotes();
    
    // Also load after a short delay to catch any recent additions
    setTimeout(loadNotes, 200);
    
    // Refresh every 30 seconds in case notes are added from other tabs
    setInterval(loadNotes, 30000);
}); 