console.log("FSD Templates content script loaded");

// Ensure the script only runs once per page load
if (!window.fsdTemplatesInjected) {
    window.fsdTemplatesInjected = true;

    // Function to insert text into the active element
    function insertTextIntoActiveElement(template, defaultInsertionOption) {
        console.log("Inserting text:", template, "with default option:", defaultInsertionOption);
        let targetElement = document.getElementById('00N60000002WJIm') || document.activeElement;
    
        if (!template || typeof template.text !== 'string') {
            console.error("Invalid template:", template);
            return false;
        }
    
        if (targetElement && (targetElement.tagName === 'TEXTAREA' || (targetElement.tagName === 'INPUT' && targetElement.type === 'text'))) {
            const currentValue = targetElement.value;
            let newText = template.text;
    
            // Determine insertion option
            const effectiveOption = template.insertionOption !== 'default' ? template.insertionOption : defaultInsertionOption;
    
            console.log("Effective insertion option:", effectiveOption);
    
            const cursorPos = targetElement.selectionStart;
    
            // Apply insertion logic
            switch (effectiveOption) {
                case 'above':
                    newText = currentValue ? newText + '\n' + currentValue : newText;
                    break;
                case 'below':
                    newText = currentValue ? currentValue + '\n' + newText : newText;
                    break;
                case 'inline':
                default:
                    newText = currentValue.slice(0, cursorPos) + newText + currentValue.slice(cursorPos);
                    break;
            }
    
            targetElement.value = newText;
            
            // Set cursor position to end of inserted text
            const newCursorPos = effectiveOption === 'below' ? 
                (currentValue ? currentValue.length + 1 : 0) + template.text.length :
                cursorPos + template.text.length;
            targetElement.setSelectionRange(newCursorPos, newCursorPos);
    
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.focus();
            return true;
        } else {
            console.error("No valid target element found");
            alert('Please click into a text field before inserting text');
            return false;
        }
    }

    function formatDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Message received in content script:", request);
        if (request.action === "insertText") {
            console.log("Attempting to insert text with option:", request.insertionOption, "default:", request.defaultInsertionOption);
            const template = { 
                text: request.text,
                insertionOption: request.insertionOption
            };
            const success = insertTextIntoActiveElement(template, request.defaultInsertionOption);
            console.log("Text insertion result:", success ? "success" : "failure");
            sendResponse({status: success ? "success" : "failure"});
        } else if (request.action === "tabActivated") {
            sendResponse({status: "ready"});
        }
        return true;
    });
    
    // Announce that the content script is ready
    chrome.runtime.sendMessage({action: "contentScriptReady"});
}