 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a//dev/null b/SecureBrowser/Deploy-SecureBrowser.py
index 0000000000000000000000000000000000000000..c741e1e7427e1dbf92650d412e36b70e7b55678b 100755
--- a//dev/null
+++ b/SecureBrowser/Deploy-SecureBrowser.py
@@ -0,0 +1,51 @@
+#!/usr/bin/env python3
+"""
+Deploys the secure browser and applies baseline security policies.
+Downloads the installer, installs the browser silently, and applies
+initial configuration using Set-SecureBrowserPolicy.py.
+"""
+
+import argparse
+import os
+import subprocess
+import urllib.request
+from pathlib import Path
+
+
+def download_installer(url: str, dest: Path) -> None:
+    print(f"Downloading installer from {url}...")
+    urllib.request.urlretrieve(url, dest)
+
+
+def run_installer(path: Path) -> None:
+    print(f"Running installer {path}...")
+    subprocess.run([str(path), "/silent"], check=True)
+
+
+def main(policy_file: str) -> None:
+    installer_url = "https://example.com/securebrowser_installer.exe"
+    installer_path = Path(os.getenv("TEMP", "/tmp")) / "securebrowser_installer.exe"
+
+    print("Deploying Secure Browser...")
+    download_installer(installer_url, installer_path)
+    run_installer(installer_path)
+
+    subprocess.run([
+        "python",
+        str(Path(__file__).with_name("Set-SecureBrowserPolicy.py")),
+        "--policy-file",
+        policy_file,
+    ], check=True)
+
+    print("Deployment complete.")
+
+
+if __name__ == "__main__":
+    parser = argparse.ArgumentParser(description="Deploy the secure browser.")
+    parser.add_argument(
+        "--policy-file",
+        default="policy.config.json",
+        help="Path to policy configuration file.",
+    )
+    args = parser.parse_args()
+    main(args.policy_file)
)
