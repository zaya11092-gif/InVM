# WebVM (GitHub Pages x86 in browser)

A minimal static site that runs an x86 VM fully inside the browser using the `v86` emulator engine. Includes:

- 2048 MB RAM
- 128 MB VGA RAM
- Upload CD-ROM ISO (`.iso`)
- Create virtual hard disk (HDA)
- Start/stop/reboot controls

## 🚀 Deploy to GitHub Pages

1. Commit these files to your repository `main` branch.
2. In GitHub repository settings, go to `Pages` and set source to `main` branch `/ (root)`.
3. Visit `https://<your-user>.github.io/<your-repo>/`.

## 🛠️ Usage

- Choose an ISO file via `ISO file` input and click `Load ISO and Reboot`.
- Configure `Hard disk size` and click `Create Virtual HDA`.
- `Power On/Restart` and `Power Off` control the VM lifecycle.

## 🧩 Notes

- Browser limitations: writing 2 GiB disk may be heavy; this demo creates a lazy blob placeholder.
- Use a modern browser (Chrome/Edge/Firefox) with good WebAssembly support.
- Make sure `v86` resources load from the CDN.

## 📄 License
MIT
