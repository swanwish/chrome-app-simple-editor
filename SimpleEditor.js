window.onload = function () {
    var taElement = document.querySelector("#textarea");
    var dirty = false;
    var wantSync = false;

    document.querySelector("#new").addEventListener("click", newFile);
    document.querySelector("#open").addEventListener("click", openFile);
    document.querySelector("#save").addEventListener("click", saveFile);
    document.querySelector("#saveas").addEventListener("click", saveFileAs);

    var optionsButton = document.querySelector("#options");
    if (optionsButton)
        optionsButton.addEventListener("click", options);

    taElement.addEventListener("keypress", didChange);
    taElement.addEventListener("paste", didChange);
    taElement.addEventListener("cut", didChange);
    taElement.addEventListener("change", didChange);
    taElement.addEventListener("keydown", didChange);

    // I don't know where to call this function, the book didn't say it clearly
    // The method is implemented in Chapter 3
    getParams("BackupFolderID",
        function (items) {
            if (chrome.runtime.lastError)
                showMessage('Unable to get backup folder ID. (' +
                    chrome.runtime.lastError.message + ')');
            else if (items && items.BackupFolderID)
                chrome.fileSystem.restoreEntry(items.BackupFolderID,
                    function (entry) {
                        directoryEntryBackup = entry;
                        show_backup_folder();
                    });
            else
                setBackup();
        });

    getParams(["foreground", "background"],
        function (items) {
            if (chrome.runtime.lastError)
                console.log(chrome.runtime.lastError);
            else {
                setForeground(items.foreground);
                setBackground(items.background);
            }
        },
        wantSync);

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

    function setParams(x, wantSync) {
        var storageArea = wantSync ? chrome.storage.sync : chrome.storage.local;
        storageArea.set(x,
            function () {
                if (chrome.runtime.lastError)
                    console.log(chrome.runtime.lastError);
            }
        );
    }

    function getParams(x, callback, wantSync) {
        var storageArea = wantSync ? chrome.storage.sync : chrome.storage.local;
        storageArea.get(x,
            function (items) {
                if (chrome.runtime.lastError)
                    console.log(chrome.runtime.lastError);
                else
                    callback(items);
            }
        );
    }

    function options() {
        var bg;
        var fg;
        Dialogs.dialog(
            "<p>Background Color: <input type='color' id='bg-color'>" +
            "<p>Foreground Color: <input type='color' id='fg-color'>" +
            "<p><button id='setbackup'>Set Backup...</button>" +
            "<p><button id='dlg-ok'>OK</button>",
            [
                {
                    id: 'dlg-ok',
                    action: function () {
                        setBackground(bg.value, true);
                        setForeground(fg.value, true);
                    }
                }
            ],
            function () {
                bg = document.querySelector('#bg-color');
                fg = document.querySelector('#fg-color');
                var bgcolor = taElement.style["background-color"];
                var fgcolor = taElement.style["color"];
                if (bgcolor && fgcolor) {
                    bg.value = rgb2hex(bgcolor);
                    fg.value = rgb2hex(fgcolor);
                }
                else {
                    bg.value = "#ffffff";
                    fg.value = "#000000";
                }
                document.querySelector("#setbackup").addEventListener("click", setBackup);
            }
        );
    }

    function rgb2hex(rgb) {
        var components = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }

        return "#" + hex(components[1]) + hex(components[2]) + hex(components[3]);
    }

    function setBackground(color, wantSave) {
        if (color) {
            document.querySelector("#textarea").style["background-color"] = color;
            if (wantSave)
                setParams({background: color}, wantSync);
        }
    }

    function setForeground(color, wantSave) {
        if (color) {
            document.querySelector("#textarea").style["color"] = color;
            if (wantSave)
                setParams({foreground: color}, wantSync);
        }
    }

};