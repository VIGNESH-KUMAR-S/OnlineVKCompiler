// RapidAPI Configuration (https://rapidapi.com/hermanzdosilovic/api/judge0)

//"var" are the reserved keyword in java script , A variable must have a UNIQUE name...
var apiUrl = "https://judge0.p.rapidapi.com";
var apiAuth = {
    //rapidapi host
    "x-rapidapi-host": "judge0.p.rapidapi.com",
    
    // Your RapidAPI Key
    "x-rapidapi-key": "04091daae0msh4305137888ad73dp1e1fb5jsn83db3b778990" 
};
var wait = localStorageGetItem("wait") || false;
var pbUrl = "https://pb.OnlineVKCompiler.com";
var check_timeout = 1000;

var blinkStatusLine = ((localStorageGetItem("blink") || "true") === "true");
var editorMode = localStorageGetItem("editorMode") || "normal";
var redirectStderrToStdout = ((localStorageGetItem("redirectStderrToStdout") || "false") === "true");
var editorModeObject = null;


var fontSize = 14;

var MonacoVim;
var MonacoEmacs;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;
var stderrEditor;
var compileOutputEditor;
var sandboxMessageEditor;

var isEditorDirty = false;
var currentLanguageId;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $insertTemplateBtn;
var $runBtn;
var $navigationMessage;
var $updates;
var $statusLine;
var timeStart;
var timeEnd;

var messagesData;

/* Full layout of the Body of the html page is determined in layoutConfig ,
 */
var layoutConfig = {
  
  //Give Settings condition and dimensions...
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    dimensions: {
        borderWidth: 3,
        headerHeight: 22
    },
    // content represents the variables present in the site body...
    
    content: [{
      
      //"CODE here" is the place where we code...
      //Component state represents the Editable Source or not...
        
        type: "row",
        content: [{
            type: "component",
            componentName: "source",
            title: "CODE BELOW",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "column",
            
            //"INPUT" is the place where we give the input
            
            content: [{
                type: "stack",
                content: [{
                    type: "component",
                    componentName: "stdin",
                    title: "INPUT",
                    isClosable: false,
                    componentState: {
                        readOnly: false
                    }
                }]
            }, {

              //We create stack for the output,error messages(boxes),..

                type: "stack",
                content: [{
                  
                  //"OUTPUT" is the console or screen to shown our output
                      
                        type: "component",
                        componentName: "stdout",
                        title: "OUTPUT",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {
                      
                      //"ERROR(Warning)" is the message of the compiler warnings and also errors...
                       
                        type: "component",
                        componentName: "stderr",
                        title: "ERROR(Warning)",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {

                      //"COMPILER MESSAGE" is the place where the COMPILE TIME ERROR showned..

                        type: "component",
                        componentName: "compile output",
                        title: "COMPILER MESSAGE",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }, {

                        //"ADDITIONAL INFO" is the message of that language(Additional information) we already given in that language javascript

                        type: "component",
                        componentName: "sandbox message",
                        title: "ADDITIONAL INFO",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    }]
            }]
        }]
    }]
};

function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

//Usually try..catch are used to avoid some warnings and Errors at RUN TIME...

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

//function is like sub - program or task, When ever we call a function by its name it is executed ...

function localStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (ignorable) {
  }
}

function localStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (ignorable) {
    return null;
  }
}

//showMessages() is a function to show the message in the console or VDU or screen

function showMessages() {
    var width = $updates.offset() - parseFloat($updates.css("padding")) -
                $navigationMessage.parent().offset() - parseFloat($navigationMessage.parent().css("padding")) - 5;

    if (width < 200 || messagesData === undefined) {
        return;
    }

    var messages = messagesData["messages"];

    $navigationMessage.css("animation-duration", messagesData["duration"]);
    $navigationMessage.parent().width(width - 5);

    var combinedMessage = "";
    for (var i = 0; i < messages.length; ++i) {
        combinedMessage += `${messages[i]}`;
        if (i != messages.length - 1) {
            combinedMessage += "&nbsp".repeat(Math.min(200, messages[i].length));
        }
    }

    $navigationMessage.html(combinedMessage);
}

//showError() is the function, which returns Some errors during RUN TIME...

function showError(title, content) {
    $("#site-modal #title").html(title);
    $("#site-modal .content").html(content);
    $("#site-modal").modal("show");
}

//handleError() is the function to handle some COMPILE TIME errors(Give some tips about that error)...

function handleError(jqXHR, textStatus, errorThrown) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

//This handleError() is the function to handle some RUN TIME errors(Give some tips about that error)...

function handleRunError(jqXHR, textStatus, errorThrown) {
    handleError(jqXHR, textStatus, errorThrown);
    $runBtn.removeClass("loading");
}

//handleResult() gives the performance time of the program...

function handleResult(data) {
    timeEnd = performance.now();
    console.log("It took " + (timeEnd - timeStart) + " ms to get submission result.");

    var status = data.status;
    var stdout = decode(data.stdout);
    var stderr = decode(data.stderr);
    var compile_output = decode(data.compile_output);
    var sandbox_message = decode(data.message);
    var time = (data.time === null ? "-" : data.time + "s");
    var memory = (data.memory === null ? "-" : data.memory + "KB");

//Status line represents the status of the program and time taken to execute and memory consumed...

    $statusLine.html(`${status.description}, ${time}, ${memory}`);

// "blinkStatusLine" which means that particular line will be continously blinking

    if (blinkStatusLine) {
        $statusLine.addClass("blink");
        setTimeout(function() {
            blinkStatusLine = false;
            localStorageSetItem("blink", "false");
            $statusLine.removeClass("blink");
        }, 3000);
    }

    stdoutEditor.setValue(stdout);
    stderrEditor.setValue(stderr);
    compileOutputEditor.setValue(compile_output);
    sandboxMessageEditor.setValue(sandbox_message);

    if (stdout !== "") {
        var dot = document.getElementById("stdout-dot");
        if (!dot.parentElement.classList.contains("lm_active")) {
            dot.hidden = false;
        }
    }
    if (stderr !== "") {
        var dot = document.getElementById("stderr-dot");
        if (!dot.parentElement.classList.contains("lm_active")) {
            dot.hidden = false;
        }
    }
    if (compile_output !== "") {
        var dot = document.getElementById("compile-output-dot");
        if (!dot.parentElement.classList.contains("lm_active")) {
            dot.hidden = false;
        }
    }
    if (sandbox_message !== "") {
        var dot = document.getElementById("sandbox-message-dot");
        if (!dot.parentElement.classList.contains("lm_active")) {
            dot.hidden = false;
        }
    }

    $runBtn.removeClass("loading");
}

function getIdFromURI() {
  var uri = location.search.substr(1).trim();
  return uri.split("&")[0];
}
 
//The following function is the Function of "Refresh" button in the header...

function loadSavedSource() {
    snippet_id = getIdFromURI();

    if (snippet_id.length == 36) {
        $.ajax({
            url: apiUrl + "/submissions/" + snippet_id + "?fields=source_code,language_id,stdin,stdout,stderr,compile_output,message,time,memory,status,compiler_options,command_line_arguments&base64_encoded=true",
            type: "GET",
            headers: apiAuth,
            success: function(data, textStatus, jqXHR) {
                sourceEditor.setValue(decode(data["source_code"]));
                $selectLanguage.dropdown("set selected", data["language_id"]);
                $compilerOptions.val(data["compiler_options"]);
                $commandLineArguments.val(data["command_line_arguments"]);
                stdinEditor.setValue(decode(data["stdin"]));
                stdoutEditor.setValue(decode(data["stdout"]));
                stderrEditor.setValue(decode(data["stderr"]));
                compileOutputEditor.setValue(decode(data["compile_output"]));
                sandboxMessageEditor.setValue(decode(data["message"]));
                var time = (data.time === null ? "-" : data.time + "s");
                var memory = (data.memory === null ? "-" : data.memory + "KB");
                $statusLine.html(`${data.status.description}, ${time}, ${memory}`);
                changeEditorLanguage();
            },
            error: handleRunError
        });
    } else if (snippet_id.length == 4) {
        $.ajax({
            url: pbUrl + "/" + snippet_id + ".json",
            type: "GET",
            success: function (data, textStatus, jqXHR) {
                sourceEditor.setValue(decode(data["source_code"]));
                $selectLanguage.dropdown("set selected", data["language_id"]);
                $compilerOptions.val(data["compiler_options"]);
                $commandLineArguments.val(data["command_line_arguments"]);
                stdinEditor.setValue(decode(data["stdin"]));
                stdoutEditor.setValue(decode(data["stdout"]));
                stderrEditor.setValue(decode(data["stderr"]));
                compileOutputEditor.setValue(decode(data["compile_output"]));
                sandboxMessageEditor.setValue(decode(data["sandbox_message"]));
                $statusLine.html(decode(data["status_line"]));
                changeEditorLanguage();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                showError("Not Found", "Code not found!");
                window.history.replaceState(null, null, location.origin + location.pathname);
                loadRandomLanguage();
            }
        });
    } else {
        loadRandomLanguage();
    }
}

//The following function is the Function to RUN a program...

function run() {
    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    } else {
        $runBtn.addClass("loading");
    }
    
    document.getElementById("stdout-dot").hidden = true;
    document.getElementById("stderr-dot").hidden = true;
    document.getElementById("compile-output-dot").hidden = true;
    document.getElementById("sandbox-message-dot").hidden = true;

    stdoutEditor.setValue("");
    stderrEditor.setValue("");
    compileOutputEditor.setValue("");
    sandboxMessageEditor.setValue("");

    var sourceValue = encode(sourceEditor.getValue());
    var stdinValue = encode(stdinEditor.getValue());
    var languageId = resolveLanguageId($selectLanguage.val());
    var compilerOptions = $compilerOptions.val();
    var commandLineArguments = $commandLineArguments.val();

    if (parseInt(languageId) === 44) {
        sourceValue = sourceEditor.getValue();
    }

    var data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: redirectStderrToStdout
    };

/* JSON stands for JavaScript Object Notation . JSON is a light weight format for storing and transporting data.
JSON is oftenused when data is sent from a server to a webpage */

    var sendRequest = function(data) {
        timeStart = performance.now();
        $.ajax({
            url: apiUrl + `/submissions?base64_encoded=true&wait=${wait}`,
            type: "POST",
            headers: apiAuth,
            async: true,
            contentType: "application/json",
            data: JSON.stringify(data),
            xhrFields: {
                withCredentials: apiUrl.indexOf("/secure") != -1 ? true : false
            },
            success: function (data, textStatus, jqXHR) {
                console.log(`Your submission token is: ${data.token}`);
                if (wait == true) {
                    handleResult(data);
                } else {
                    setTimeout(fetchSubmission.bind(null, data.token), check_timeout);
                }
            },
            error: handleRunError
        });
    }

//"fetchAdditionalFiles" is a  variable that can hold the additional files of SQ Lite programming languages...

    var fetchAdditionalFiles = false;
    if (parseInt(languageId) === 82) {
        if (sqliteAdditionalFiles === "") {
            fetchAdditionalFiles = true;
            $.ajax({
                url: `https://minio.judge0.com/public/ide/sqliteAdditionalFiles.base64.txt?${Date.now()}`,
                type: "GET",
                async: true,
                contentType: "text/plain",
                success: function (responseData, textStatus, jqXHR) {
                    sqliteAdditionalFiles = responseData;
                    data["additional_files"] = sqliteAdditionalFiles;
                    sendRequest(data);
                },
                error: handleRunError
            });
        }
        else {
            data["additional_files"] = sqliteAdditionalFiles;
        }
    }

    if (!fetchAdditionalFiles) {
        sendRequest(data);
    }
}

//Submit with required api key//

function fetchSubmission(submission_token) {
    $.ajax({
        url: apiUrl + "/submissions/" + submission_token + "?base64_encoded=true",
        type: "GET",
        headers: apiAuth,
        async: true,
        success: function (data, textStatus, jqXHR) {
            if (data.status.id <= 2) 
            { 
              // In Queue or Processing
                setTimeout(fetchSubmission.bind(null, submission_token), check_timeout);
                return;
            }
            handleResult(data);
        },
        error: handleRunError
    });
}

//Change the Editor language by using following function//

function changeEditorLanguage() {
    monaco.editor.setModelLanguage(sourceEditor.getModel(), $selectLanguage.find(":selected").attr("mode"));
    currentLanguageId = parseInt($selectLanguage.val());
    $(".lm_title")[0].innerText = fileNames[currentLanguageId];
    apiUrl = resolveApiUrl($selectLanguage.val());
}

function insertTemplate() {
    currentLanguageId = parseInt($selectLanguage.val());
    sourceEditor.setValue(sources[currentLanguageId]);
    changeEditorLanguage();
}

/* Randomly any one of the programming language will be selected , In the console the Example code for that language is showned */

function loadRandomLanguage() {
    var values = [];
  for (var i = 0; i < $selectLanguage[0].options.length; ++i) {
        values.push($selectLanguage[0].options[i].value);
    }
    $selectLanguage.dropdown("set selected", values[Math.floor(Math.random() * $selectLanguage[0].length)]);
    apiUrl = resolveApiUrl($selectLanguage.val());
    insertTemplate();
}

function resizeEditor(layoutInfo) {
    if (editorMode != "normal") {
        var statusLineHeight = $("#editor-status-line").height();
        layoutInfo.height -= statusLineHeight;
        layoutInfo.contentHeight -= statusLineHeight;
    } 
}

function disposeEditorModeObject() {
    try {
        editorModeObject.dispose();
        editorModeObject = null;
    } catch(ignorable) {
    }
}

//Change the Editor mode in settings (Vim,Emacs,Normal)

function changeEditorMode() {
    disposeEditorModeObject();

    if (editorMode == "vim") {
        editorModeObject = MonacoVim.initVimMode(sourceEditor, $("#editor-status-line")[0]);
    } else if (editorMode == "emacs") {
        var statusNode = $("#editor-status-line")[0];
        editorModeObject = new MonacoEmacs.EmacsExtension(sourceEditor);
        editorModeObject.onDidMarkChange(function(e) {
          statusNode.textContent = e ? "Mark Set!" : "Mark Unset";
        });
        editorModeObject.onDidChangeKey(function(str) {
          statusNode.textContent = str;
        });
        editorModeObject.start();
    }
}

function resolveLanguageId(id) {
    id = parseInt(id);
    return languageIdTable[id] || id;
}

function resolveApiUrl(id) {
    id = parseInt(id);
    return languageApiUrlTable[id] || apiUrl;
}

function editorsUpdateFontSize(fontSize) {
    sourceEditor.updateOptions({fontSize: fontSize});
    stdinEditor.updateOptions({fontSize: fontSize});
    stdoutEditor.updateOptions({fontSize: fontSize});
    stderrEditor.updateOptions({fontSize: fontSize});
    compileOutputEditor.updateOptions({fontSize: fontSize});
    sandboxMessageEditor.updateOptions({fontSize: fontSize});
}

function updateScreenElements() {
    var display = window.innerWidth <= 1200 ? "none" : "";
    $(".wide.screen.only").each(function(index) {
        $(this).css("display", display);
    });
}

$(window).resize(function() {
    layout.updateSize();
    updateScreenElements();
    showMessages();
});

$(document).ready(function () {
    updateScreenElements();

    console.log("Hey, OnlineVK Compiler is open-sourced: https://github.com/OnlineVKCompiler/ide. Have fun!");
    console.log("Reach me @ vigneshkumar.ec17@bitsathy.ac.in (or) +91 8754890649")

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (e) {
        if (!isEditorDirty) {
            insertTemplate();
        } else {
            changeEditorLanguage();
        }
    });

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");
    $commandLineArguments.attr("size", $commandLineArguments.attr("placeholder").length);

    $insertTemplateBtn = $("#insert-template-btn");
    $insertTemplateBtn.click(function (e) {
        if (isEditorDirty && confirm("Are you sure? Your current changes will be lost.")) {
            insertTemplate();
        }
    });

    $runBtn = $("#run-btn");
    $runBtn.click(function (e) {
        run();
    });

    $navigationMessage = $("#navigation-message span");
    $updates = $("#updates");

    $(`input[name="editor-mode"][value="${editorMode}"]`).prop("checked", true);
    $("input[name=\"editor-mode\"]").on("change", function(e) {
        editorMode = e.target.value;
        localStorageSetItem("editorMode", editorMode);

        resizeEditor(sourceEditor.getLayoutInfo());
        changeEditorMode();

        sourceEditor.focus();
    });

    $("input[name=\"redirect-output\"]").prop("checked", redirectStderrToStdout)
    $("input[name=\"redirect-output\"]").on("change", function(e) {
        redirectStderrToStdout = e.target.checked;
        localStorageSetItem("redirectStderrToStdout", redirectStderrToStdout);
    });

    $statusLine = $("#status-line");

    $("body").keydown(function (e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode == 120) { // F9
            e.preventDefault();
            run();
        } else if (keyCode == 119) { // F8
            e.preventDefault();
            var url = prompt("Enter URL of OnlineVK Compiler API:", apiUrl);
            if (url != null) {
                url = url.trim();
            }
            if (url != null && url != "") {
                apiUrl = url;
                localStorageSetItem("api-url", apiUrl);
            }
        } else if (keyCode == 118) { // F7
            e.preventDefault();
            wait = !wait;
            localStorageSetItem("wait", wait);
            alert(`Submission wait is ${wait ? "ON. Enjoy" : "OFF"}.`);
        } else if (event.ctrlKey && keyCode == 83) { // Ctrl+S
            e.preventDefault();
            save();
        } else if (event.ctrlKey && keyCode == 107) { // Ctrl++
            e.preventDefault();
            fontSize += 1;
            editorsUpdateFontSize(fontSize);
        } else if (event.ctrlKey && keyCode == 109) { // Ctrl+-
            e.preventDefault();
            fontSize -= 1;
            editorsUpdateFontSize(fontSize);
        }
    });

    $("select.dropdown").dropdown();
    $(".ui.dropdown").dropdown();
    $(".ui.dropdown.site-links").dropdown({action: "hide", on: "hover"});
    $(".ui.checkbox").checkbox();
    $(".message .close").on("click", function () {
        $(this).closest(".message").transition("fade");
    });

    require(["vs/editor/editor.main", "monaco-vim", "monaco-emacs"], function (ignorable, MVim, MEmacs) {
        layout = new GoldenLayout(layoutConfig, $("#site-content"));

        MonacoVim = MVim;
        MonacoEmacs = MEmacs;

        layout.registerComponent("source", function (container, state) {
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "cpp",
                minimap: {
                    enabled: false
                },
                rulers: [80, 120]
            });

            changeEditorMode();

            sourceEditor.getModel().onDidChangeContent(function (e) {
                currentLanguageId = parseInt($selectLanguage.val());
                isEditorDirty = sourceEditor.getValue() != sources[currentLanguageId];
            });

            sourceEditor.onDidLayoutChange(resizeEditor);
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });

            container.on("tab", function(tab) {
                tab.element.append("<span id=\"stdout-dot\" class=\"dot\" hidden></span>");
                tab.element.on("mousedown", function(e) {
                    e.target.closest(".lm_tab").children[3].hidden = true;
                });
            });
        });

        layout.registerComponent("stderr", function (container, state) {
            stderrEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });

            container.on("tab", function(tab) {
                tab.element.append("<span id=\"stderr-dot\" class=\"dot\" hidden></span>");
                tab.element.on("mousedown", function(e) {
                    e.target.closest(".lm_tab").children[3].hidden = true;
                });
            });
        });

        layout.registerComponent("compile output", function (container, state) {
            compileOutputEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });

            container.on("tab", function(tab) {
                tab.element.append("<span id=\"compile-output-dot\" class=\"dot\" hidden></span>");
                tab.element.on("mousedown", function(e) {
                    e.target.closest(".lm_tab").children[3].hidden = true;
                });
            });
        });

        layout.registerComponent("sandbox message", function (container, state) {
            sandboxMessageEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                theme: "vs-dark",
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });

            container.on("tab", function(tab) {
                tab.element.append("<span id=\"sandbox-message-dot\" class=\"dot\" hidden></span>");
                tab.element.on("mousedown", function(e) {
                    e.target.closest(".lm_tab").children[3].hidden = true;
                });
            });
        });

        layout.on("initialised", function () {
            $(".monaco-editor")[0].appendChild($("#editor-status-line")[0]);
            if (getIdFromURI()) {
                loadSavedSource();
            } else {
                loadRandomLanguage();
            }
            $("#site-navigation").css("border-bottom", "1px solid black");
            sourceEditor.focus();
        });

        layout.init();
    });
});


/* The following set of lines are the codes or lines , that is defaultly inserted or inbuilted in the required programming languages... If we choose one programming language then the default code of "Welcome to my OnlineVKCompiler" program is inserted (Written) inbuilt */

// Template Sources
var assemblySource = "\
section	.text\n\
    global _start\n\
\n\
_start:\n\
\n\
    xor	eax, eax\n\
    lea	edx, [rax+len]\n\
    mov	al, 1\n\
    mov	esi, msg\n\
    mov	edi, eax\n\
    syscall\n\
\n\
    xor	edi, edi\n\
    lea	eax, [rdi+60]\n\
    syscall\n\
\n\
section	.rodata\n\
\n\
msg	db 'Welcome to my Online VK Compiler, Have fun !', 0xa\n\
len	equ	$ - msg\n\
";

var bashSource = "echo \"Welcome to my Online VK Compiler, Have fun !\"";

var basicSource = "PRINT \"Welcome to my Online VK Compiler, Have fun !\"";

var cSource = "\
#include <stdio.h>\n\
\n\
int main(void) {\n\
    printf(\"Welcome to my Online VK Compiler, Have fun !\\n\");\n\
    return 0;\n\
}\n\
";

var csharpSource = "\
public class Hello {\n\
    public static void Main() {\n\
        System.Console.WriteLine(\"Welcome to my Online VK Compiler, Have fun !\");\n\
    }\n\
}\n\
";

var cppSource = "\
#include <iostream>\n\
\n\
int main() {\n\
    std::cout << \"Welcome to my Online VK Compiler, Have fun !\" << std::endl;\n\
    return 0;\n\
}\n\
";

var clojureSource = "(println \"Welcome to my Online VK Compiler, Have fun !\")\n";

var cobolSource = "\
IDENTIFICATION DIVISION.\n\
PROGRAM-ID. MAIN.\n\
PROCEDURE DIVISION.\n\
DISPLAY \"Welcome to my Online VK Compiler, Have fun !\".\n\
STOP RUN.\n\
";

var lispSource = "(write-line \"Welcome to my Online VK Compiler, Have fun !\")";

var dSource = "\
import std.stdio;\n\
\n\
void main()\n\
{\n\
    writeln(\"Welcome to my Online VK Compiler, Have fun !\");\n\
}\n\
";

var elixirSource = "IO.puts \"Welcome to my Online VK Compiler, Have fun !\"";

var erlangSource = "\
main(_) ->\n\
    io:fwrite(\"Welcome to my Online VK Compiler, Have fun !\\n\").\n\
";

var executableSource = "\
OnlineVK Compiler IDE assumes that content of executable is Base64 encoded.\n\
\n\
This means that you should Base64 encode content of your binary,\n\
paste it here and click \"Run\".\n\
\n\
Here is an example of compiled \"Welcome to my Online VK Compiler, Have fun !\" NASM program.\n\
Content of compiled binary is Base64 encoded and used as source code.\n\
\n\
https://ide.judge0.com/?kS_f\n\
";

var fsharpSource = "printfn \"Welcome to my Online VK Compiler, Have fun !\"\n";

var fortranSource = "\
program main\n\
    print *, \"Welcome to my Online VK Compiler, Have fun !\"\n\
end\n\
";

var goSource = "\
package main\n\
\n\
import \"fmt\"\n\
\n\
func main() {\n\
    fmt.Println(\"Welcome to my Online VK Compiler, Have fun !\")\n\
}\n\
";

var groovySource = "println \"Welcome to my Online VK Compiler, Have fun !\"\n";

var haskellSource = "main = putStrLn \"Welcome to my Online VK Compiler, Have fun !\"";

var javaSource = "\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println(\"Welcome to my Online VK Compiler, Have fun !\");\n\
    }\n\
}\n\
";

var javaScriptSource = "console.log(\"Welcome to my Online VK Compiler, Have fun !\");";

var kotlinSource = "\
fun main() {\n\
    println(\"Welcome to my Online VK Compiler, Have fun !\")\n\
}\n\
";

var luaSource = "print(\"Welcome to my Online VK Compiler, Have fun !\")";

var objectiveCSource = "\
#import <Foundation/Foundation.h>\n\
\n\
int main() {\n\
    @autoreleasepool {\n\
        char name[10];\n\
        scanf(\"%s\", name);\n\
        NSString *message = [NSString stringWithFormat:@\"Welcome to my Online VK Compiler, Have fun ! %s\\n\", name];\n\
        printf(\"%s\", message.UTF8String);\n\
    }\n\
    return 0;\n\
}\n\
";

var ocamlSource = "print_endline \"Welcome to my Online VK Compiler, Have fun !\"";

var octaveSource = "printf(\"Welcome to my Online VK Compiler, Have fun !\\n\");";

var pascalSource = "\
program Hello;\n\
begin\n\
    writeln ('Welcome to my Online VK Compiler, Have fun !')\n\
end.\n\
";

var perlSource = "\
my $name = <STDIN>;\n\
print \"Welcome to my Online VK Compiler, Have fun ! $name\";\n\
";

var phpSource = "\
<?php\n\
print(\"Welcome to my Online VK Compiler, Have fun !\\n\");\n\
?>\n\
";

var plainTextSource = "Welcome to my Online VK Compiler, Have fun !\n";

var prologSource = "\
:- initialization(main).\n\
main :- write('Welcome to my Online VK Compiler, Have fun !\\n').\n\
";

var pythonSource = "print(\"Welcome to my Online VK Compiler, Have fun !\")";

var rSource = "cat(\"Welcome to my Online VK Compiler, Have fun !\\n\")";

var rubySource = "puts \"Welcome to my Online VK Compiler, Have fun !\"";

var rustSource = "\
fn main() {\n\
    println!(\"Welcome to my Online VK Compiler, Have fun !\");\n\
}\n\
";

var scalaSource = "\
object Main {\n\
    def main(args: Array[String]) = {\n\
        val name = scala.io.StdIn.readLine()\n\
        println(\"Welcome to my Online VK Compiler, Have fun ! \"+ name)\n\
    }\n\
}\n\
";

var sqliteSource = "\
SELECT\n\
    Name, COUNT(*) AS num_albums\n\
FROM artists JOIN albums\n\
ON albums.ArtistID = artists.ArtistID\n\
GROUP BY Name\n\
ORDER BY num_albums DESC\n\
LIMIT 4;\n\
";
var sqliteAdditionalFiles = "";

var swiftSource = "\
import Foundation\n\
let name = readLine()\n\
print(\"Welcome to my Online VK Compiler, Have fun ! \\(name!)\")\n\
";

var typescriptSource = "console.log(\"Welcome to my Online VK Compiler, Have fun !\");";

var vbSource = "\
Public Module Program\n\
   Public Sub Main()\n\
      Console.WriteLine(\"Welcome to my Online VK Compiler, Have fun !\")\n\
   End Sub\n\
End Module\n\
";

var c3Source = "\
// On the OnlineVK Compiler, C3 is automatically\n\
// updated every hour to the latest commit on master branch.\n\
module main;\n\
\n\
extern func void printf(char *str, ...);\n\
\n\
func int main()\n\
{\n\
    printf(\"Welcome to my Online VK Compiler, Have fun !\\n\");\n\
    return 0;\n\
}\n\
";

var javaTestSource = "\
import static org.junit.jupiter.api.Assertions.assertEquals;\n\
\n\
import org.junit.jupiter.api.Test;\n\
\n\
class MainTest {\n\
    static class Calculator {\n\
        public int add(int x, int y) {\n\
            return x + y;\n\
        }\n\
    }\n\
\n\
    private final Calculator calculator = new Calculator();\n\
\n\
    @Test\n\
    void addition() {\n\
        assertEquals(2, calculator.add(1, 1));\n\
    }\n\
}\n\
";

var mpiccSource = "\
// Try adding \"-n 5\" (without quotes) into command line arguments. \n\
#include <mpi.h>\n\
\n\
#include <stdio.h>\n\
\n\
int main()\n\
{\n\
    MPI_Init(NULL, NULL);\n\
\n\
    int world_size;\n\
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);\n\
\n\
    int world_rank;\n\
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);\n\
\n\
    printf(\"Hello from processor with rank %d out of %d processors.\\n\", world_rank, world_size);\n\
\n\
    MPI_Finalize();\n\
\n\
    return 0;\n\
}\n\
";

var mpicxxSource = "\
// Try adding \"-n 5\" (without quotes) into command line arguments. \n\
#include <mpi.h>\n\
\n\
#include <iostream>\n\
\n\
int main()\n\
{\n\
    MPI_Init(NULL, NULL);\n\
\n\
    int world_size;\n\
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);\n\
\n\
    int world_rank;\n\
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);\n\
\n\
    std::cout << \"Hello from processor with rank \"\n\
              << world_rank << \" out of \" << world_size << \" processors.\\n\";\n\
\n\
    MPI_Finalize();\n\
\n\
    return 0;\n\
}\n\
";

var mpipySource = "\
# Try adding \"-n 5\" (without quotes) into command line arguments. \n\
from mpi4py import MPI\n\
\n\
comm = MPI.COMM_WORLD\n\
world_size = comm.Get_size()\n\
world_rank = comm.Get_rank()\n\
\n\
print(f\"Hello from processor with rank {world_rank} out of {world_size} processors\")\n\
";

var nimSource = "\
# On the OnlineVK Compiler , Nim is automatically\n\
# updated every day to the latest stable version.\n\
echo \"Welcome to my Online VK Compiler, Have fun !\"\n\
";

var pythonForMlSource = "\
import mlxtend\n\
import numpy\n\
import pandas\n\
import scipy\n\
import sklearn\n\
\n\
print(\"Welcome to my Online VK Compiler, Have fun !\")\n\
";

var bosqueSource = "\
// On the OnlineVK Compiler , Bosque (https://github.com/microsoft/BosqueLanguage)\n\
// is automatically updated every hour to the latest commit on master branch.\n\
\n\
namespace NSMain;\n\
\n\
concept WithName {\n\
    invariant $name != \"\";\n\
\n\
    field name: String;\n\
}\n\
\n\
concept Greeting {\n\
    abstract method sayHello(): String;\n\
    \n\
    virtual method sayGoodbye(): String {\n\
        return \"goodbye\";\n\
    }\n\
}\n\
\n\
entity GenericGreeting provides Greeting {\n\
    const instance: GenericGreeting = GenericGreeting@{};\n\
\n\
    override method sayHello(): String {\n\
        return \"Welcome to my Online VK Compiler, Have fun !\";\n\
    }\n\
}\n\
\n\
entity NamedGreeting provides WithName, Greeting {\n\
    override method sayHello(): String {\n\
        return String::concat(\"Welcome to my Online VK Compiler, Have fun !\", \" \", this.name);\n\
    }\n\
}\n\
\n\
entrypoint function main(arg?: String): String {\n\
    var val = arg ?| \"\";\n\
    if (val == \"1\") {\n\
        return GenericGreeting@{}.sayHello();\n\
    }\n\
    elif (val == \"2\") {\n\
        return GenericGreeting::instance.sayHello();\n\
    }\n\
    else {\n\
        return NamedGreeting@{name=\"bob\"}.sayHello();\n\
    }\n\
}\n\
";

//Programming languages with language id...

var sources = {
    45: assemblySource,
    46: bashSource,
    47: basicSource,
    48: cSource,
    49: cSource,
    50: cSource,
    51: csharpSource,
    52: cppSource,
    53: cppSource,
    54: cppSource,
    55: lispSource,
    56: dSource,
    57: elixirSource,
    58: erlangSource,
    44: executableSource,
    59: fortranSource,
    60: goSource,
    61: haskellSource,
    62: javaSource,
    63: javaScriptSource,
    64: luaSource,
    65: ocamlSource,
    66: octaveSource,
    67: pascalSource,
    68: phpSource,
    43: plainTextSource,
    69: prologSource,
    70: pythonSource,
    71: pythonSource,
    72: rubySource,
    73: rustSource,
    74: typescriptSource,
    75: cSource,
    76: cppSource,
    77: cobolSource,
    78: kotlinSource,
    79: objectiveCSource,
    80: rSource,
    81: scalaSource,
    82: sqliteSource,
    83: swiftSource,
    84: vbSource,
    85: perlSource,
    86: clojureSource,
    87: fsharpSource,
    88: groovySource,
    1001: cSource,
    1002: cppSource,
    1003: c3Source,
    1004: javaSource,
    1005: javaTestSource,
    1006: mpiccSource,
    1007: mpicxxSource,
    1008: mpipySource,
    1009: nimSource,
    1010: pythonForMlSource,
    1011: bosqueSource
};

//Programming file names with language id...

var fileNames = {
    45: "main.asm",
    46: "script.sh",
    47: "main.bas",
    48: "main.c",
    49: "main.c",
    50: "main.c",
    51: "Main.cs",
    52: "main.cpp",
    53: "main.cpp",
    54: "main.cpp",
    55: "script.lisp",
    56: "main.d",
    57: "script.exs",
    58: "main.erl",
    44: "a.out",
    59: "main.f90",
    60: "main.go",
    61: "main.hs",
    62: "Main.java",
    63: "script.js",
    64: "script.lua",
    65: "main.ml",
    66: "script.m",
    67: "main.pas",
    68: "script.php",
    43: "text.txt",
    69: "main.pro",
    70: "script.py",
    71: "script.py",
    72: "script.rb",
    73: "main.rs",
    74: "script.ts",
    75: "main.c",
    76: "main.cpp",
    77: "main.cob",
    78: "Main.kt",
    79: "main.m",
    80: "script.r",
    81: "Main.scala",
    82: "script.sql",
    83: "Main.swift",
    84: "Main.vb",
    85: "script.pl",
    86: "main.clj",
    87: "script.fsx",
    88: "script.groovy",
    1001: "main.c",
    1002: "main.cpp",
    1003: "main.c3",
    1004: "Main.java",
    1005: "MainTest.java",
    1006: "main.c",
    1007: "main.cpp",
    1008: "script.py",
    1009: "main.nim",
    1010: "script.py",
    1011: "main.bsq"
};

//Language id table

var languageIdTable = {
    1001: 1,
    1002: 2,
    1003: 3,
    1004: 4,
    1005: 5,
    1006: 6,
    1007: 7,
    1008: 8,
    1009: 9,
    1010: 10,
    1011: 11
}

//Invoking of the extra rapid api features , that contains additional features of some languages

var extraApiUrl = "https://secure.judge0.com/extra";
var languageApiUrlTable = {
    1001: extraApiUrl,
    1002: extraApiUrl,
    1003: extraApiUrl,
    1004: extraApiUrl,
    1005: extraApiUrl,
    1006: extraApiUrl,
    1007: extraApiUrl,
    1008: extraApiUrl,
    1009: extraApiUrl,
    1010: extraApiUrl,
    1011: extraApiUrl
}
