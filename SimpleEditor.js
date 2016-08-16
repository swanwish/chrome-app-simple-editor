window.onload = function () {
    var taElement = document.querySelector("#textarea");
    var dirty = false;
    document.querySelector("#new").addEventListener("click", newFile);
    document.querySelector("#open").addEventListener("click", openFile);
    document.querySelector("#save").addEventListener("click", saveFile);
    document.querySelector("#saveas").addEventListener("click", saveFileAs);

    taElement.addEventListener("keypress", didChange);
    taElement.addEventListener("paste", didChange);
    taElement.addEventListener("cut", didChange);
    taElement.addEventListener("change", didChange);
    taElement.addEventListener("keydown", didChange);

    // I don't know where to call this function, the book didn't say it clearly
    // getParams("BackupFolderID",
    //     function (items) {
    //         if (chrome.runtime.lastError)
    //             showMessage('Unable to get backup folder ID. (' +
    //                 chrome.runtime.lastError.message + ')');
    //         else if (items && items.BackupFolderID)
    //             chrome.fileSystem.restoreEntry(items.BackupFolderID,
    //                 function (entry) {
    //                     directoryEntryBackup = entry;
    //                     show_backup_folder();
    //                 });
    //         else
    //             setBackup();
    //     });

    function didChange(e) {
        if (e.type !== 'keydown' ||
            e.keyCode === 8 || e.keyCode === 46) // backspace or delete
            dirty = true;
    }

    function dirtyCheck(callback) {
        if (dirty)
            Dialogs.confirm('Discard changes?', 'Discard', 'Keep', callback);
        else
            callback();
    }

    function errorHandler(e) {
        console.dir(e);
        var msg;
        if (e.target && e.target.error)
            e = e.target.error;
        if (e.message)
            msg = e.message;
        else if (e.name)
            msg = e.name;
        else if (e.code)
            msg = "Code " + e.code;
        else
            msg = e.toString();
        showMessage('Error: ' + msg);
    }

    var timeoutID;

    function showMessage(msg, good) {
        console.log(msg);
        var messageElement = document.querySelector("#message");
        messageElement.style.color = good ? "green" : "red";
        messageElement.innerHTML = msg;
        if (timeoutID)
            clearTimeout(timeoutID);
        timeoutID = setTimeout(
            function () {
                messageElement.innerHTML = "&nbsp;";
            },
            5000);
    }

    function newFile() {
        dirtyCheck(
            function () {
                fileEntry = null;
                taElement.value = "";
                taElement.focus();
                dirty = false;
                document.title = 'Simple Editor - [new]';
            });
    }

    var fileEntry;

    function openFile() {
        dirtyCheck(
            function () {
                chrome.fileSystem.chooseEntry(
                    {
                        type: 'openFile'
                    },
                    function (fe) {
                        if (fe) {
                            fileEntry = fe;
                            fe.file(
                                function (file) {
                                    var reader = new FileReader();
                                    reader.onloadend = function (e) {
                                        taElement.value = this.result;
                                        taElement.focus();
                                        dirty = false;
                                        showMessage('Opened OK', true);
                                        document.title = 'Simple Editor - ' + fe.name;
                                    };
                                    reader.readAsText(file);
                                },
                                errorHandler
                            );
                        }
                    }
                );
            }
        );
    }

    function saveFile() {
        if (fileEntry) {
            save();
        } else {
            chrome.fileSystem.chooseEntry(
                {
                    type: 'saveFile'
                },
                function (fe) {
                    if (fe) {
                        fileEntry = fe;
                        save();
                        document.title = 'Simple Editor - ' + fe.name;
                    }
                }
            );
        }
    }

    function save() {
        saveToEntry(fileEntry,
            function () {
                dirty = false;
                taElement.focus();
                if (directoryEntryBackup)
                    directoryEntryBackup.getFile(fileEntry.name,
                        {
                            create: true,
                            exclusive: false
                        },
                        function (fe) {
                            saveToEntry(fe,
                                function () {
                                    showMessage('Saved/Backedup OK', true);
                                });
                        },
                        errorHandler
                    );
                else
                    showMessage('Saved/OK (no backup)', true);
            });
    }

    function saveFileAs() {
        fileEntry = null;
        saveFile();
    }

    var directoryEntryBackup;

    function setBackup() {
        chrome.fileSystem.chooseEntry({
                type: 'openDirectory'
            },
            function (entry) {
                if (entry) {
                    directoryEntryBackup = entry;
                    var entryID = chrome.fileSystem.retainEntry(entry);
                    setParams({BackupFolderID: entryID});
                    show_backup_folder();
                } else
                    showMessage("No folder chosen");
            });
    }

    function show_backup_folder() {
        if (directoryEntryBackup) {
            chrome.fileSystem.getDisplayPath(directoryEntryBackup,
                function (path) {
                    showMessage('Backup Folder: ' + path, true);
                });
        } else {
            showMessage('No backup folder');
        }
    }

    function saveToEntry(fe, callback) {
        fe.createWriter(
            function (fileWriter) {
                fileWriter.onerror = errorHandler;
                fileWriter.onwrite = function (e) {
                    fileWriter.onwrite = function (e) {
                        callback();
                    };
                    var blob = new Blob([taElement.value],
                        {type: 'text/plain'});
                    fileWriter.write(blob);
                };
                fileWriter.truncate(0);
            },
            errorHandler
        );
    }
};