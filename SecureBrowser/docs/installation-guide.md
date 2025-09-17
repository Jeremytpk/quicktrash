diff --git a//dev/null b/SecureBrowser/docs/installation-guide.md
index 0000000000000000000000000000000000000000..911b75c55b74a3dd03f0ab8a195e7d58f0dee521 100644
--- a//dev/null
+++ b/SecureBrowser/docs/installation-guide.md
@@ -0,0 +1,10 @@
+# Installation Guide
+
+This guide describes how to install the secure browser using the provided automation scripts.
+
+1. Copy the `SecureBrowser` folder to a management workstation.
+2. Open an elevated command prompt with Python available.
+3. Execute `python Deploy-SecureBrowser.py`.
+4. The script downloads the browser installer, performs a silent installation, and applies baseline policies.
+
+After deployment, verify the browser version and settings on a sample endpoint.
