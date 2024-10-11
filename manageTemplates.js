document.addEventListener('DOMContentLoaded', function() {
    const categoryName = document.getElementById('categoryName');
    const templateText = document.getElementById('templateText');
    const saveButton = document.getElementById('saveTemplate');
    const templateList = document.getElementById('templateList');
    const placeholderButtons = document.querySelectorAll('.placeholder-button');
    const exportButton = document.getElementById('exportTemplates');
    const importInput = document.getElementById('importTemplates');
    const importButton = document.getElementById('importButton');
    const defaultInsertionOption = document.getElementById('defaultInsertionOption');
    const templateInsertionOption = document.getElementById('templateInsertionOption');

    loadTemplates();
    loadSettings();

    exportButton.addEventListener('click', exportTemplates);
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importTemplates);

    placeholderButtons.forEach(button => {
        button.addEventListener('click', function() {
            const placeholder = this.getAttribute('data-placeholder');
            insertAtCursor(templateText, placeholder);
        });
    });

    saveButton.addEventListener('click', function() {
        if (categoryName.value && templateText.value) {
            chrome.storage.sync.get(['templates'], function(result) {
                const templates = result.templates || {};
                templates[categoryName.value] = {
                    text: templateText.value,
                    insertionOption: templateInsertionOption.value
                };
                chrome.storage.sync.set({templates: templates}, function() {
                    loadTemplates();
                    categoryName.value = '';
                    templateText.value = '';
                    templateInsertionOption.value = 'default';
                });
            });
        } else {
            alert('Please enter both category name and template text.');
        }
    });

    defaultInsertionOption.addEventListener('change', function() {
        chrome.storage.sync.set({defaultInsertionOption: defaultInsertionOption.value});
    });

    function exportTemplates() {
        chrome.storage.sync.get(['templates'], function(result) {
            const templates = result.templates || {};
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "fsd_templates_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    function importTemplates(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const templates = JSON.parse(e.target.result);
                    chrome.storage.sync.set({templates: templates}, function() {
                        alert('Templates imported successfully!');
                        loadTemplates(); // Refresh the template list
                    });
                } catch (error) {
                    alert('Error importing templates. Please make sure the file is a valid JSON.');
                }
            };
            reader.readAsText(file);
        }
    }

    function insertAtCursor(field, text) {
        if (field.selectionStart || field.selectionStart === 0) {
            var startPos = field.selectionStart;
            var endPos = field.selectionEnd;
            field.value = field.value.substring(0, startPos) + text + field.value.substring(endPos, field.value.length);
            field.selectionStart = startPos + text.length;
            field.selectionEnd = startPos + text.length;
        } else {
            field.value += text;
        }
        field.focus();
    }

    function loadSettings() {
        chrome.storage.sync.get(['defaultInsertionOption'], function(result) {
            defaultInsertionOption.value = result.defaultInsertionOption || 'above';
        });
    }

    function loadTemplates() {
        chrome.storage.sync.get(['templates'], function(result) {
            const templates = result.templates || {};
            templateList.innerHTML = '';
            for (let category in templates) {
                const template = templates[category];
                const div = document.createElement('div');
                div.className = 'template-item';
                div.innerHTML = `
                    <div class="template-view">
                        <h3>${category}</h3>
                        <p>${typeof template === 'string' ? template : template.text}</p>
                        <p>Insertion Option: ${typeof template === 'string' ? 'default' : (template.insertionOption || 'default')}</p>
                        <button class="edit-btn">Edit</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                    <div class="template-edit" style="display: none;">
                        <input type="text" class="edit-category-name" value="${category}">
                        <textarea class="edit-template-text">${typeof template === 'string' ? template : template.text}</textarea>
                        <select class="edit-insertion-option">
                            <option value="default" ${typeof template === 'string' || template.insertionOption === 'default' ? 'selected' : ''}>Use Default</option>
                            <option value="above" ${template.insertionOption === 'above' ? 'selected' : ''}>Insert Above</option>
                            <option value="below" ${template.insertionOption === 'below' ? 'selected' : ''}>Insert Below</option>
                            <option value="inline" ${template.insertionOption === 'inline' ? 'selected' : ''}>Insert Inline</option>
                        </select>
                        <button class="update-btn">Update</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                `;
                templateList.appendChild(div);
            }
            addTemplateListeners();
        });
    }

    function addTemplateListeners() {
        templateList.addEventListener('click', function(e) {
            const target = e.target;
            const templateItem = target.closest('.template-item');
            
            if (target.classList.contains('edit-btn')) {
                templateItem.querySelector('.template-view').style.display = 'none';
                templateItem.querySelector('.template-edit').style.display = 'block';
            } else if (target.classList.contains('cancel-btn')) {
                templateItem.querySelector('.template-view').style.display = 'block';
                templateItem.querySelector('.template-edit').style.display = 'none';
            } else if (target.classList.contains('update-btn')) {
                updateTemplate(templateItem);
            } else if (target.classList.contains('delete-btn')) {
                deleteTemplate(templateItem);
            }
        });
    }

    function updateTemplate(templateItem) {
        const newCategory = templateItem.querySelector('.edit-category-name').value;
        const newText = templateItem.querySelector('.edit-template-text').value;
        const newInsertionOption = templateItem.querySelector('.edit-insertion-option').value;
        const oldCategory = templateItem.querySelector('.template-view h3').textContent;

        if (newCategory && newText) {
            chrome.storage.sync.get(['templates'], function(result) {
                const templates = result.templates || {};
                
                if (oldCategory !== newCategory) {
                    delete templates[oldCategory];
                }
                
                templates[newCategory] = {
                    text: newText,
                    insertionOption: newInsertionOption
                };
                
                chrome.storage.sync.set({templates: templates}, function() {
                    loadTemplates();
                });
            });
        } else {
            alert('Please enter both category name and template text.');
        }
    }

    function deleteTemplate(templateItem) {
        const categoryToDelete = templateItem.querySelector('.template-view h3').textContent;
        
        chrome.storage.sync.get(['templates'], function(result) {
            const templates = result.templates || {};
            delete templates[categoryToDelete];
            chrome.storage.sync.set({templates: templates}, function() {
                loadTemplates();
            });
        });
    }
});