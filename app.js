const writeTerminal = (message) => {
    const terminal = document.getElementById("bootTerminal");
    const now = new Date().toLocaleTimeString();
    terminal.textContent += `[${now}] ${message}\n`;
    terminal.scrollTop = terminal.scrollHeight;
};

const log = (message) => {
    const statusLog = document.getElementById("statusLog");
    statusLog.textContent += `[${new Date().toISOString()}] ${message}\n`;
    statusLog.scrollTop = statusLog.scrollHeight;
    writeTerminal(message);
};

let emulator = null;
let lastIsoUrl = null;
let lastHdaUrl = null;
let lastHdaBlob = null;

const buildConfig = ({ isoUrl, hdaUrl, hdaSizeGB }) => {
    const config = {
        wasm_path: "https://cdn.jsdelivr.net/gh/copy/v86/dist/v86.wasm",
        memory_size: 2048,
        vga_memory_size: 128,
        screen_container: document.getElementById("screen"),
        serial_container: document.getElementById("serial"),
        autostart: true,
        keyboard_handler: "default",
        boot_order: 0x132,
        disable_keyboard_capture: false,
        log_level: "info"
    };

    if (hdaUrl) {
        config.hda = { url: hdaUrl, async: true };
    } else if (hdaSizeGB) {
        config.hda = { size: hdaSizeGB * 1024 * 1024 * 1024 };
    }

    if (isoUrl) {
        config.cdrom = { url: isoUrl };
    }

    return config;
};

const powerOn = () => {
    if (emulator) {
        emulator.stop();
        emulator = null;
    }

    const diskSize = Number(document.getElementById("diskSize").value);
    const cfg = buildConfig({
        isoUrl: lastIsoUrl,
        hdaUrl: lastHdaUrl,
        hdaSizeGB: lastHdaBlob ? null : diskSize
    });

    log("Starting emulator with config: " + JSON.stringify({ memory_size: cfg.memory_size, vga_memory_size: cfg.vga_memory_size, hda: cfg.hda ? (cfg.hda.url ? "url" : `size ${diskSize}GB`) : "none", cdrom: lastIsoUrl ? "loaded" : "none" }));

    emulator = new V86Starter(cfg);
    emulator.add_listener("emulator-ready", () => {
        log("Emulator ready.");
    });
    emulator.add_listener("emulator-error", (err) => {
        log(`Emulator error: ${err}`);
        writeTerminal("Boot terminal ready: ISO failover available. Type 'help' for supported commands.");
    });
    emulator.add_listener("serial0-output-char", (char) => {
        // Keep a simple fallback serial log in boot terminal in case visual console fails
        writeTerminal(char);
    });
};

const powerOff = () => {
    if (emulator) {
        emulator.stop();
        emulator = null;
        log("Emulator powered off");
    }
};

const createDisk = () => {
    const sizeGB = Number(document.getElementById("diskSize").value);
    const byteSize = sizeGB * 1024 * 1024 * 1024;
    log(`Creating virtual disk ${sizeGB}GB (${byteSize} bytes).`);

    const diskBuffer = new ArrayBuffer(0); // lazy-allocated; v86 respects hda.size when replacing URL
    const fakeBuf = new Blob([diskBuffer], { type: "application/octet-stream" });

    lastHdaBlob = fakeBuf;
    lastHdaUrl = URL.createObjectURL(fakeBuf);

    powerOn();
    log("Virtual HDA created and emulator restarted.");
};

const loadIsoFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.iso')) {
        alert("Please select a valid .iso file.");
        return;
    }
    const isoUrl = URL.createObjectURL(file);
    lastIsoUrl = isoUrl;
    log(`Loaded ISO: ${file.name} (${file.size} bytes)`);
    powerOn();
};

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("powerBtn").addEventListener("click", powerOn);
    document.getElementById("powerOffBtn").addEventListener("click", powerOff);
    document.getElementById("createDiskBtn").addEventListener("click", createDisk);
    document.getElementById("loadIsoBtn").addEventListener("click", () => {
        const isoInput = document.getElementById("isoInput");
        if (isoInput.files.length === 0) {
            alert("Please choose an ISO file first.");
            return;
        }
        loadIsoFile(isoInput.files[0]);
    });

    const terminalCmd = document.getElementById("terminalCmd");
    const terminalSend = document.getElementById("terminalSend");

    const processTerminalCommand = (cmdRaw) => {
        const cmd = cmdRaw.trim().toLowerCase();
        if (!cmd) return;

        writeTerminal(`$ ${cmd}`);

        if (cmd === "help") {
            writeTerminal("supported commands: help, reboot, poweroff, status, clear, loadsiso <name>");
        } else if (cmd === "reboot") {
            writeTerminal("rebooting emulator...");
            powerOn();
        } else if (cmd === "poweroff") {
            writeTerminal("powering off...");
            powerOff();
        } else if (cmd === "status") {
            const isoStatus = lastIsoUrl ? "ISO loaded" : "no ISO";
            const diskStatus = lastHdaUrl ? "HDA attached" : `HDA size ${document.getElementById("diskSize").value}GB`;
            writeTerminal(`status: ${isoStatus}, ${diskStatus}`);
        } else if (cmd === "clear") {
            document.getElementById("bootTerminal").textContent = "";
        } else {
            writeTerminal(`unknown command: ${cmd}`);
        }
    };

    terminalSend.addEventListener("click", () => {
        processTerminalCommand(terminalCmd.value);
        terminalCmd.value = "";
        terminalCmd.focus();
    });

    terminalCmd.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            processTerminalCommand(terminalCmd.value);
            terminalCmd.value = "";
        }
    });

    const vmCmd = document.getElementById("vmCmd");
    const vmSend = document.getElementById("vmSend");

    const sendToVM = (text) => {
        if (!emulator) {
            writeTerminal("No emulator instance found. Start emulator first.");
            return;
        }

        if (typeof emulator.keyboard_send === "function") {
            emulator.keyboard_send(text);
            writeTerminal(`sent to VM: ${text}`);
        } else if (typeof emulator.send === "function") {
            emulator.send(text);
            writeTerminal(`sent to VM: ${text}`);
        } else {
            writeTerminal("VM does not support keyboard_send/send API in this build.");
        }
    };

    vmSend.addEventListener("click", () => {
        if (vmCmd.value.trim() === "") return;
        sendToVM(vmCmd.value);
        vmCmd.value = "";
    });

    vmCmd.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendToVM(vmCmd.value);
            vmCmd.value = "";
        }
    });

    powerOn();
});
