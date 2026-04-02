const log = (message) => {
    const statusLog = document.getElementById("statusLog");
    statusLog.textContent += `[${new Date().toISOString()}] ${message}\n`;
    statusLog.scrollTop = statusLog.scrollHeight;
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
    emulator.add_listener("emulator-ready", () => log("Emulator ready"));
    emulator.add_listener("emulator-error", (err) => log(`Emulator error: ${err}`));
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

    powerOn();
});
