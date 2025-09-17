 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a//dev/null b/SecureBrowser/README.md
index 0000000000000000000000000000000000000000..3c5e8052944ff48e0abda37e980194f05669a2dd 100644
--- a//dev/null
+++ b/SecureBrowser/README.md
@@ -0,0 +1,23 @@
+# Secure Browser Deployment & Policy Automation
+
+This project provides a Python-based framework for automating the deployment and configuration of a secure browser across Windows endpoints. It simplifies installation, applies standardized security policies, and documents the full lifecycle of the solution.
+
+## Features
+
+- Automated deployment of a secure browser on 500+ endpoints
+- Enforcement of 20+ security policies such as disabling risky features, managing trusted sites, and blocking extensions
+- Comprehensive documentation covering installation, configuration management, security assessments, and recovery procedures
+
+## Getting Started
+
+1. Review the policy configuration file [`policy.config.json`](policy.config.json).
+2. Run [`Deploy-SecureBrowser.py`](Deploy-SecureBrowser.py) with administrative privileges to install the browser and apply baseline settings.
+3. Optionally run [`Set-SecureBrowserPolicy.py`](Set-SecureBrowserPolicy.py) to update or reapply policies.
+
+See the [`docs`](docs) folder for detailed guides.
+
+## Prerequisites
+
+- Python 3.8 or later
+- Windows endpoints with administrative access
+
)
