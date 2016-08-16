/**
 * Created by Stephen on 16/8/15.
 */
var Dialogs = (function () {
    var dlg;
    return {
        alert: function (msg) {
            dialog("<p>" + msg + "</p><button id='dlg-close'>OK</button>",
                [
                    {
                        id: 'dlg-close'
                    }
                ]);
        },
        confirm: function (msg, btnYes, btnNo, actionYes, actionNo) {
            dialog(
                "<p>" + msg + "</p><button id='dlg-no'>" + btnNo + "</button>" +
                "<button id='dlg-yes'>" + btnYes + "</button>",
                [
                    {
                        id: "dlg-no",
                        action: actionNo
                    },
                    {
                        id: "dlg-yes",
                        action: actionYes
                    }
                ]);
        },
        dialog: function (html, actions, initFuncs) {
            dialog(html, actions);
            if (initFuncs) {
                initFuncs();
            }
        }
    };
    function dialog(html, actions) {
        setup();
        dlg.innerHTML = html;
        dlg.showModal();
        var funcs = [];
        for (var i = 0; i < actions.length; i++) {
            funcs[i] = (function (index) {
                return function () { // index bound here instead to function dialog
                    dlg.close();
                    if (actions[index].action)
                        actions[index].action();
                }
            })(i);
            document.getElementById(actions[i].id).addEventListener("click", funcs[i]);
        }
    }

    function setup() {
        if (!document.querySelector("#dlg-dialog")) {
            dlg = document.createElement("dialog");
            dlg.id = 'dlg-dialog';
            document.body.appendChild(dlg);
            var css = document.createElement("style");
            css.type = "text/css";
            css.innerHTML =
                "#dlg-dialog {" +
                "    border: 1px solid rgba(0, 0, 0, 0.3);" +
                "    border-radius: 6px;" +
                "    box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);" +
                "}";
            document.body.appendChild(css);
        }
    }
})();
