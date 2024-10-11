document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('categorySelect');
    const datePicker = document.getElementById('datePicker');
    const insertButton = document.getElementById('insertButton');
    const manageTemplatesLink = document.getElementById('manageTemplates');
    const previewArea = document.getElementById('previewArea');

    // Set default date to today
    datePicker.value = new Date().toISOString().split('T')[0];

    // Load templates and populate dropdown
    loadTemplates();

    categorySelect.addEventListener('change', updatePreview);
    datePicker.addEventListener('change', updatePreview);
    insertButton.addEventListener('click', handleInsertClick);
    manageTemplatesLink.addEventListener('click', () => chrome.tabs.create({url: 'manageTemplates.html'}));

    function loadTemplates() {
        chrome.storage.sync.get(['templates'], function(result) {
            const templates = result.templates || {};
            categorySelect.innerHTML = '<option value="">Select a category</option>';
            Object.keys(templates).forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        });
    }

    function updatePreview() {
        const selectedCategory = categorySelect.value;
        const selectedDate = datePicker.value;
    
        if (selectedCategory && selectedDate) {
            chrome.storage.sync.get(['templates'], function(result) {
                const templates = result.templates || {};
                if (templates[selectedCategory]) {
                    const formattedDate = formatDate(selectedDate);
                    const templateText = typeof templates[selectedCategory] === 'string' 
                        ? templates[selectedCategory] 
                        : templates[selectedCategory].text;
                    const previewText = templateText.replace('{date}', formattedDate);
                    previewArea.textContent = previewText;
                    previewArea.style.display = 'block';
                } else {
                    previewArea.textContent = 'Template not found';
                    previewArea.style.display = 'block';
                }
            });
        } else {
            previewArea.style.display = 'none';
        }
    }
    
    function handleInsertClick() {
        const selectedCategory = categorySelect.value;
        const selectedDate = datePicker.value;
    
        if (selectedCategory && selectedDate) {
            chrome.storage.sync.get(['templates', 'defaultInsertionOption'], function(result) {
                const templates = result.templates || {};
                const defaultInsertionOption = result.defaultInsertionOption || 'above';
                if (templates[selectedCategory]) {
                    const template = templates[selectedCategory];
                    const formattedDate = formatDate(selectedDate);
                    const textToInsert = typeof template === 'string' ? template : template.text;
                    const insertionOption = typeof template === 'string' ? 'default' : (template.insertionOption || 'default');
                    const processedText = textToInsert.replace('{date}', formattedDate);
                    insertTextWithRetry(processedText, insertionOption, defaultInsertionOption, 3);
                } else {
                    alert('Error: Template not found for the selected category.');
                }
            });
        } else {
            alert('Please select both a category and a date.');
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    function insertTextWithRetry(text, insertionOption, defaultInsertionOption, maxRetries, currentRetry = 0) {
        console.log("Attempting to insert text, retry:", currentRetry);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "insertText", 
                text: text, 
                insertionOption: insertionOption,
                defaultInsertionOption: defaultInsertionOption
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error("Chrome runtime error:", chrome.runtime.lastError);
                }
                if (chrome.runtime.lastError || (response && response.status !== "success")) {
                    console.log("Insertion failed, response:", response);
                    if (currentRetry < maxRetries) {
                        console.log("Retrying...");
                        setTimeout(() => insertTextWithRetry(text, maxRetries, currentRetry + 1), 1000);
                    } else {
                        console.error("Max retries reached. Insertion failed.");
                        alert('Error inserting text. Please refresh the page and try again.');
                    }
                } else {
                    console.log("Text inserted successfully");
                    window.close();
                }
            });
        });
    }
});